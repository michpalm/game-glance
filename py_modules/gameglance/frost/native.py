"""Version-1 Gamescope protocol, isolated to a desktop-user worker process.

Only system client libraries are loaded. No library access occurs on import.
The compositor owns a global effect slot; callers must check ownership before
every mutation. This interface intentionally has no force-composition operation.
"""
import ctypes as C
import ctypes.util
import math
import select
import struct
from pathlib import Path
from dataclasses import dataclass

from .contracts import REGIONS, REGION_UNIFORMS


@dataclass(frozen=True)
class NativeState:
    effect: str
    technique: int | None


def protocol_description():
    return ("gamescope_reshade", 1, ("destroy", "set_effect", "enable_effect", "set_uniform_variable", "disable_effect"))


# One uniform pair per frost area (Bar, BarRadius, ...), named as the shader declares them.
UNIFORM_AREAS = tuple(REGION_UNIFORMS[region] for region in REGIONS)
UNIFORM_NAMES = frozenset(UNIFORM_AREAS + tuple(n + "Radius" for n in UNIFORM_AREAS))


def pack_uniform(name, values):
    allowed = {n: 4 for n in UNIFORM_AREAS}
    allowed.update({n + "Radius": 2 for n in UNIFORM_AREAS})
    if name not in allowed or not isinstance(values, (list, tuple)) or len(values) != allowed[name]:
        raise ValueError("invalid uniform")
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 <= v <= 1 for v in values):
        raise ValueError("invalid uniform values")
    return struct.pack("<" + "f" * len(values), *values)


def read_max_scale(proc_root, uid):
    candidates = []
    for process in proc_root.iterdir():
        candidate = False
        try:
            if not process.name.isdigit() or process.stat().st_uid != uid or (process / "comm").read_text().strip() not in ("gamescope", "gamescope-wl"):
                continue
            candidate = True
            args = (process / "cmdline").read_bytes().split(b"\0")
            scale = 16384.0  # FLT_MAX default is unbounded for our bounded outputs.
            for i, arg in enumerate(args):
                if arg in (b"--max-scale", b"-m"):
                    scale = float(args[i + 1])
                elif arg.startswith(b"--max-scale="):
                    scale = float(arg.split(b"=", 1)[1])
                elif arg.startswith(b"-m"):
                    scale = float(arg[2:])
            candidates.append(scale if math.isfinite(scale) and 0 < scale <= 16384 else None)
        except (OSError, ValueError, IndexError):
            if candidate:
                candidates.append(None)
    return candidates[0] if len(candidates) == 1 else None


class Interface(C.Structure):
    pass


class Message(C.Structure):
    _fields_ = [("name", C.c_char_p), ("signature", C.c_char_p), ("types", C.POINTER(C.POINTER(Interface)))]


Interface._fields_ = [("name", C.c_char_p), ("version", C.c_int), ("method_count", C.c_int), ("methods", C.POINTER(Message)),
                      ("event_count", C.c_int), ("events", C.POINTER(Message))]


class Array(C.Structure):
    _fields_ = [("size", C.c_size_t), ("alloc", C.c_size_t), ("data", C.c_void_p)]


class PropertyEvent(C.Structure):
    _fields_=[("type",C.c_int),("serial",C.c_ulong),("send_event",C.c_int),("display",C.c_void_p),
              ("window",C.c_ulong),("atom",C.c_ulong),("time",C.c_ulong),("state",C.c_int)]


class XEvent(C.Union):
    _fields_=[("type",C.c_int),("xproperty",PropertyEvent),("pad",C.c_long*24)]


class NativeConnection:
    def __init__(self,on_guard=None):
        self.display = self.registry = self.proxy = self.xdisplay = None
        self.callbacks = []
        self.ready = set()
        self.removed = False
        self.armed_path = None
        self.on_guard = on_guard or (lambda:None)
        self._snapshot_cache = None
        try:
            self._connect()
        except Exception:
            self.close()
            raise

    def _connect(self):
        self.wl = C.CDLL(ctypes.util.find_library("wayland-client") or "libwayland-client.so.0")
        self.x = C.CDLL(ctypes.util.find_library("X11") or "libX11.so.6")
        for name, restype, args in [
            ("wl_display_connect", C.c_void_p, [C.c_char_p]), ("wl_display_disconnect", None, [C.c_void_p]),
            ("wl_display_roundtrip", C.c_int, [C.c_void_p]), ("wl_display_flush", C.c_int, [C.c_void_p]),
            ("wl_display_get_fd", C.c_int, [C.c_void_p]), ("wl_display_dispatch_pending", C.c_int, [C.c_void_p]),
            ("wl_display_prepare_read", C.c_int, [C.c_void_p]), ("wl_display_read_events", C.c_int, [C.c_void_p]),
            ("wl_display_cancel_read", None, [C.c_void_p]), ("wl_proxy_destroy", None, [C.c_void_p]),
            ("wl_proxy_add_listener", C.c_int, [C.c_void_p, C.c_void_p, C.c_void_p]),
            ("wl_proxy_marshal_flags", C.c_void_p, [C.c_void_p, C.c_uint, C.POINTER(Interface), C.c_uint, C.c_uint]),
        ]:
            fn = getattr(self.wl, name)
            fn.restype, fn.argtypes = restype, args
        self.display = self.wl.wl_display_connect(None)
        if not self.display:
            raise OSError("Wayland unavailable")
        registry_interface = Interface.in_dll(self.wl, "wl_registry_interface")
        self.registry = self.wl.wl_proxy_marshal_flags(self.display, 1, C.byref(registry_interface), 1, 0, C.c_void_p())
        self.methods = (Message * 5)(Message(b"destroy", b"", None), Message(b"set_effect", b"s", None),
                                     Message(b"enable_effect", b"", None), Message(b"set_uniform_variable", b"sa", None), Message(b"disable_effect", b"", None))
        self.events = (Message * 1)(Message(b"effect_ready", b"s", None))
        self.interface = Interface(b"gamescope_reshade", 1, 5, self.methods, 1, self.events)
        Global = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_uint, C.c_char_p, C.c_uint)
        Removed = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_uint)
        globals_found = []
        self.callbacks.extend([Global(lambda data, proxy, name, interface, version: globals_found.append((name, interface, version))),
                               Removed(lambda data, proxy, name: setattr(self, "removed", True) if name == getattr(self, "global_id", None) else None)])
        self.registry_listener = (C.c_void_p * 2)(*[C.cast(cb, C.c_void_p) for cb in self.callbacks])
        if self.wl.wl_proxy_add_listener(self.registry, self.registry_listener, None) != 0 or self.wl.wl_display_roundtrip(self.display) < 0:
            raise OSError("Wayland registry unavailable")
        found = [g for g in globals_found if g[1] == b"gamescope_reshade" and g[2] >= 1]
        if len(found) != 1:
            raise OSError("Gamescope ReShade interface unavailable")
        self.global_id = found[0][0]
        self.proxy = self.wl.wl_proxy_marshal_flags(self.registry, 0, C.byref(self.interface), 1, 0,
                                                  C.c_uint(self.global_id), self.interface.name, C.c_uint(1), C.c_void_p())
        Ready = C.CFUNCTYPE(None, C.c_void_p, C.c_void_p, C.c_char_p)
        def effect_ready(data,proxy,path):
            if path:
                value=path.decode("utf-8",errors="replace")
                self.ready.add(value)
                if value==self.armed_path:
                    self.armed_path=None
        self.effect_callback = Ready(effect_ready)
        self.effect_listener = (C.c_void_p * 1)(C.cast(self.effect_callback, C.c_void_p))
        if not self.proxy or self.wl.wl_proxy_add_listener(self.proxy, self.effect_listener, None) != 0:
            raise OSError("Gamescope binding failed")
        for name, restype, args in [
            ("XOpenDisplay", C.c_void_p, [C.c_char_p]), ("XCloseDisplay", C.c_int, [C.c_void_p]),
            ("XDefaultRootWindow", C.c_ulong, [C.c_void_p]), ("XInternAtom", C.c_ulong, [C.c_void_p, C.c_char_p, C.c_int]),
            ("XSync", C.c_int, [C.c_void_p, C.c_int]), ("XFree", C.c_int, [C.c_void_p]),
            ("XGetWindowProperty", C.c_int, [C.c_void_p,C.c_ulong,C.c_ulong,C.c_long,C.c_long,C.c_int,C.c_ulong,C.POINTER(C.c_ulong),C.POINTER(C.c_int),C.POINTER(C.c_ulong),C.POINTER(C.c_ulong),C.POINTER(C.c_void_p)]),
            ("XChangeProperty", C.c_int, [C.c_void_p,C.c_ulong,C.c_ulong,C.c_ulong,C.c_int,C.c_int,C.c_void_p,C.c_int]),
            ("XDeleteProperty", C.c_int, [C.c_void_p,C.c_ulong,C.c_ulong]),
            ("XSelectInput",C.c_int,[C.c_void_p,C.c_ulong,C.c_long]),
            ("XPending",C.c_int,[C.c_void_p]),("XNextEvent",C.c_int,[C.c_void_p,C.POINTER(XEvent)]),
        ]:
            fn = getattr(self.x, name)
            fn.restype, fn.argtypes = restype, args
        self.xdisplay = self.x.XOpenDisplay(None)
        if not self.xdisplay:
            raise OSError("Gamescope control display unavailable")
        self.root = self.x.XDefaultRootWindow(self.xdisplay)
        self.effect_atom = self.x.XInternAtom(self.xdisplay, b"GAMESCOPE_RESHADE_EFFECT", 0)
        self.technique_atom = self.x.XInternAtom(self.xdisplay, b"GAMESCOPE_RESHADE_TECHNIQUE_IDX", 0)
        self.cardinal = self.x.XInternAtom(self.xdisplay, b"CARDINAL", 0)
        self.x.XSelectInput(self.xdisplay,self.root,1<<22)  # PropertyChangeMask
        self.x.XSync(self.xdisplay,0)
        self.hdr_output_atom = self.x.XInternAtom(self.xdisplay, b"GAMESCOPE_HDR_OUTPUT_FEEDBACK", 0)
        import os
        self.max_scale = read_max_scale(Path("/proc"), os.getuid())
        self._sync()

    def _property(self, atom):
        actual_type, count, after = C.c_ulong(), C.c_ulong(), C.c_ulong()
        fmt, data = C.c_int(), C.c_void_p()
        status = self.x.XGetWindowProperty(self.xdisplay, self.root, atom, 0, 256, 0, 0, C.byref(actual_type), C.byref(fmt), C.byref(count), C.byref(after), C.byref(data))
        try:
            if status or after.value:
                raise OSError("Invalid Gamescope state")
            if actual_type.value == 0:
                return None
            if fmt.value == 8:
                return C.string_at(data, count.value).decode("utf-8")
            if fmt.value == 32 and count.value == 1:
                return C.cast(data, C.POINTER(C.c_ulong))[0]
            raise OSError("Unsupported Gamescope state")
        finally:
            if data:
                self.x.XFree(data)

    def snapshot(self):
        self._property_events()
        if self._snapshot_cache is None:
            # Fetch once after a relevant notification. Repeated uniform writes
            # still check ownership, but quiet checks don't each block on X11.
            for _ in range(4):
                effect,technique=self._property(self.effect_atom),self._property(self.technique_atom)
                if effect is not None and not isinstance(effect,str) or technique is not None and not isinstance(technique,int):
                    raise OSError("Unsupported Gamescope properties")
                self._snapshot_cache=NativeState(effect or "",technique)
                if not self._property_events():break
            if self._snapshot_cache is None:
                raise OSError("Gamescope ownership is changing")
        return self._snapshot_cache

    def _property_events(self):
        changed=False
        while self.x.XPending(self.xdisplay):
            event=XEvent();self.x.XNextEvent(self.xdisplay,C.byref(event))
            if event.type==28 and event.xproperty.atom in (self.effect_atom,self.technique_atom):
                self._snapshot_cache=None;changed=True
        return changed

    def environment(self):
        # HDR_ENABLED is a saved request, including on an SDR-only connector.
        # Output feedback includes connector capability and compositor force
        # flags. Treat advertised HDR as unsupported even if content-driven
        # output is currently idling in SDR; missing feedback fails closed.
        hdr = self._property(self.hdr_output_atom)
        return {"hdr": bool(hdr), "maxScale": self.max_scale} if type(hdr) is int and hdr in (0, 1) else None

    def select_technique(self, index):
        self._snapshot_cache=None
        if index is None:
            self.x.XDeleteProperty(self.xdisplay, self.root, self.technique_atom)
        else:
            value = C.c_ulong(index)
            self.x.XChangeProperty(self.xdisplay, self.root, self.technique_atom, self.cardinal, 32, 0, C.byref(value), 1)
        self.x.XSync(self.xdisplay, 0)

    def _sync(self):
        if self.removed or self.wl.wl_display_roundtrip(self.display) < 0:
            raise OSError("Gamescope connection lost")

    def set_effect(self, relative_name):
        self._snapshot_cache=None
        self.armed_path=relative_name
        self.wl.wl_proxy_marshal_flags(self.proxy, 1, None, 1, 0, C.c_char_p(relative_name.encode()))
        self._sync()
        self.ready.clear()  # discard delivery attributable to the previous arm

    def set_uniform(self, name, value):
        expected = 8 if name.endswith("Radius") else 16
        if name not in UNIFORM_NAMES or len(value) != expected:
            raise ValueError("invalid native uniform")
        buffer = C.create_string_buffer(value)
        array = Array(len(value), len(value), C.cast(buffer, C.c_void_p))
        self.wl.wl_proxy_marshal_flags(self.proxy, 3, None, 1, 0, C.c_char_p(name.encode()), C.byref(array))
        self.wl.wl_display_flush(self.display)

    def enable(self):
        self._snapshot_cache=None
        self.wl.wl_proxy_marshal_flags(self.proxy, 2, None, 1, 0)
        self._sync()

    def disable(self):
        self._snapshot_cache=None
        self.wl.wl_proxy_marshal_flags(self.proxy, 4, None, 1, 0)
        self._sync()

    def poll(self, timeout_seconds, retiring=False):
        if self.removed and not retiring:
            raise OSError("Gamescope interface removed")
        while self.wl.wl_display_prepare_read(self.display) != 0:
            if self.wl.wl_display_dispatch_pending(self.display) < 0:
                raise OSError("Gamescope connection lost")
        self.wl.wl_display_flush(self.display)
        try:
            readable, _, _ = select.select([self.wl.wl_display_get_fd(self.display)], [], [], timeout_seconds)
        except BaseException:
            self.wl.wl_display_cancel_read(self.display)
            raise
        if readable:
            if self.wl.wl_display_read_events(self.display) < 0:
                raise OSError("Gamescope connection lost")
            self.wl.wl_display_dispatch_pending(self.display)
        else:
            self.wl.wl_display_cancel_read(self.display)
        ready, self.ready = self.ready, set()
        return ready

    def fileno(self):
        return self.wl.wl_display_get_fd(self.display)

    def close(self):
        if self.display and self.armed_path:
            # Never free the server-side resource while its callback still
            # captures `this` (WaylandServer/Reshade.h). Normally the worker
            # drains it before here. If rendering failed, retain only the client
            # connection, with the effect disabled, until delivery or server EOF.
            self.on_guard()
            while self.armed_path:
                try:
                    self.poll(.5,retiring=True)
                except OSError:
                    break
        if self.xdisplay:
            self.x.XCloseDisplay(self.xdisplay)
            self.xdisplay = None
        if self.display:
            if self.proxy:
                self.wl.wl_proxy_destroy(self.proxy)
                self.proxy = None
            if self.registry:
                self.wl.wl_proxy_destroy(self.registry)
                self.registry = None
            self.wl.wl_display_disconnect(self.display)
            self.display = None
