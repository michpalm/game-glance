"""Single-threaded native owner. stdin EOF and a monotonic watchdog clean up
independently of the Decky event loop and frontend timers.
"""
import hashlib
import json
import os
import secrets
import select
import signal
import sys
import time
from pathlib import Path

from .contracts import REGIONS, identifier, validate_frame
from .native import NativeConnection, pack_uniform
from .shader import build_shader, stage_shader


def unavailable(reason):
    return {"status": "unavailable", "reason": reason}


class FrostWorker:
    def __init__(self, native, home, clock, reply):
        self.native, self.home, self.clock, self.reply = native, home, clock, reply
        self.prepared, self.cancelled, self.files = {}, set(), {}
        self.active = self.warm = self.owned = None
        self.prepared_owner = None
        self.retiring = None
        self.previous_technique = None
        self.closed = False

    def _still_owned(self):
        state = self.native.snapshot()
        return self.owned is not None and state.effect == self.owned and state.technique == 0

    def _uniforms(self, frame=None):
        for region in REGIONS:
            name = region.capitalize()
            r = frame["regions"][region] if frame else None
            if not self._still_owned():
                return False
            self.native.set_uniform(name, pack_uniform(name, [r[k] for k in ("x", "y", "width", "height")] if r else [0, 0, 0, 0]))
            if not self._still_owned():
                return False
            self.native.set_uniform(name + "Radius", pack_uniform(name + "Radius", [r["radiusX"], r["radiusY"]] if r else [0, 0]))
        return self._still_owned()

    def _reject_warm(self, warm, reason):
        self.reply(warm['rpc'], unavailable(reason))
        if 'activation_rpc' in warm:
            self.reply(warm['activation_rpc'], unavailable(reason))

    def _clear(self, reason="cancelled"):
        if self.warm and self.owned and self._still_owned():
            # The upstream server captures its resource in the ready callback.
            # Keep it alive until a zero-mask execution consumes that callback.
            warm,self.warm=self.warm,None
            self._uniforms()
            self.retiring={"path":self.owned,"deadline":self.clock()+1}
            self._reject_warm(warm, reason)
            return
        self._finish_clear(reason)

    def _finish_clear(self, reason="cancelled"):
        if self.owned and self._still_owned() and self._uniforms():
            # Restore the borrowed technique while our effect is still present;
            # do not write a global property after releasing the slot.
            self.native.select_technique(self.previous_technique)
            state = self.native.snapshot()
            if state.effect == self.owned and state.technique == self.previous_technique:
                self.native.disable()
        self.owned = self.active = None
        self.prepared_owner = None
        self.retiring = None
        for record in self.prepared.values():
            record["ready"] = False
        if self.warm:
            self._reject_warm(self.warm, reason)
            self.warm = None

    def _take(self, path):
        state = self.native.snapshot()
        if state.effect:
            return False
        self.previous_technique = state.technique
        self.native.set_effect(path)
        # No uniforms are sent until the effect path is ours, to avoid touching
        # another client's runtime-uniform namespace while it owns the slot.
        if self.native.snapshot().effect:
            return False
        self.native.select_technique(0)
        self.native.enable()
        self.owned = path
        if not self._still_owned():
            self.owned = None
            return False
        return True

    @staticmethod
    def _sequence(value):
        if type(value) is not int or not 0 <= value < 2**53:
            raise ValueError("invalid sequence")
        return value

    def command(self, rpc, operation, args):
        expected = {"prepare": {"request_id", "frame"}, "present": {"request_id", "frame"}, "activate": {"request_id", "key", "sequence", "frame"},
                    "update": {"token", "sequence", "frame"}, "renew": {"token"}, "release": {"token"}, "cancel": {"request_id"}, "environment": set()}
        try:
            if self.closed or operation not in expected or not isinstance(args, dict) or set(args) != expected[operation]:
                raise ValueError("invalid operation")
            if "request_id" in args:
                identifier(args["request_id"])
            if "token" in args:
                identifier(args["token"])
            if "sequence" in args:
                self._sequence(args["sequence"])
            if "frame" in args:
                args = {**args, "frame": validate_frame(args["frame"])}
            if "key" in args:
                identifier(args["key"])
            result = getattr(self, "_" + operation)(rpc, **args)
        except (ValueError, TypeError, KeyError):
            if operation == "update" and isinstance(args, dict) and self.active and args.get("token") == self.active["token"]:
                self._clear("invalid-geometry")
            result = unavailable("invalid-geometry") if operation in ("prepare", "present", "activate") else False
        if result is not _PENDING:
            self.reply(rpc, result)

    def _prepare(self, rpc, request_id, frame):
        if request_id in self.cancelled:
            return unavailable("cancelled")
        if self.active or self.warm or self.prepared_owner or self.retiring:
            return unavailable("not-ready")
        if self.native.snapshot().effect:
            return unavailable("owned-elsewhere")
        if not self._context_supported(frame["context"]):
            return unavailable("unsupported")
        source, key = build_shader(frame)
        path = stage_shader(self.home, source, key)
        self.files[path] = key
        cached = (key, frame["context"]["viewportId"])
        record = {"key": key, "path": path, "cache": cached, "ready": False, "expires": self.clock() + 30, "generation": frame["generation"]}
        for previous in self.prepared.values():
            previous["ready"] = False
        self.prepared[request_id] = record
        while len(self.prepared) > 8:
            self.prepared.pop(next(iter(self.prepared)))
        if not self._take(path):
            return unavailable("owned-elsewhere")
        self.warm = {"rpc": rpc, "request": request_id, "record": record, "deadline": self.clock() + 5}
        return _PENDING

    def _environment(self, rpc):
        return self.native.environment()

    def _context_supported(self,context):
        if context['background'] != 'game' or context['colorMode'] != 'sdr':
            return False
        environment=self.native.environment()
        if not isinstance(environment,dict) or type(environment.get("hdr")) is not bool:
            return False
        if context["colorMode"] != ("hdr" if environment["hdr"] else "sdr"):
            return False
        return context["fit"]!="auto" or environment.get("maxScale")==context.get("maxScale")

    def _present(self,rpc,request_id,frame):
        if request_id in self.cancelled:
            return unavailable('cancelled')
        if self.warm and self.warm['request'] == request_id:
            warm = self.warm
            if 'activate_frame' in warm:
                return unavailable('not-ready')
            if not self._context_supported(frame['context']):
                return unavailable('unsupported')
            key = build_shader(frame)[1]
            if frame['generation'] != warm['record']['generation'] or (key, frame['context']['viewportId']) != warm['record']['cache']:
                return unavailable('invalid-geometry')
            # Live bounds arrived while zero-mask preparation was executing.
            # Commit them at readiness without waiting for a frontend round trip.
            warm['activate_frame'], warm['activation_rpc'] = frame, rpc
            return _PENDING
        if self.prepared_owner and self.prepared_owner['request'] == request_id:
            record = self.prepared.get(request_id)
            if record:
                return self._activate(rpc, request_id, record['key'], 1, frame)
        result=self._prepare(rpc,request_id,frame)
        if result is _PENDING:
            self.warm["activate_frame"]=frame
        return result

    def _activate(self, rpc, request_id, key, sequence, frame):
        if request_id in self.cancelled:
            return unavailable("cancelled")
        record = self.prepared.get(request_id)
        if not record or record["key"] != key or record["expires"] <= self.clock() or not record["ready"] or record["generation"] != frame["generation"]:
            return unavailable("not-ready")
        if build_shader(frame)[1] != key or (key, frame["context"]["viewportId"]) != record["cache"]:
            return unavailable("invalid-geometry")
        if self.active or self.warm:
            return unavailable("not-ready")
        if not self.prepared_owner or self.prepared_owner["request"] != request_id or self.prepared_owner["deadline"] <= self.clock() or not self._still_owned():
            self._clear()
            return unavailable("not-ready")
        if not self._context_supported(frame["context"]):
            self._clear()
            return unavailable("unsupported")
        if not self._uniforms(frame):
            self._clear("owned-elsewhere")
            return unavailable("owned-elsewhere")
        token = secrets.token_hex(24)
        self.active = {"token": token, "request": request_id, "sequence": sequence, "key": key, "cache": record["cache"], "generation": frame["generation"], "context": frame["context"], "deadline": self.clock() + 1}
        self.prepared_owner = None
        return {"status": "active", "token": token}

    def _valid_token(self, token):
        if not self.active or self.active["token"] != token:
            return False
        if self.active["deadline"] <= self.clock() or not self._still_owned() or not self._context_supported(self.active["context"]):
            self._clear()
            return False
        return True

    def _update(self, rpc, token, sequence, frame):
        if not self._valid_token(token) or sequence <= self.active["sequence"]:
            return False
        key = build_shader(frame)[1]
        if key != self.active["key"] or (key, frame["context"]["viewportId"]) != self.active["cache"] or frame["generation"] != self.active["generation"]:
            self._clear()
            return False
        if not self._uniforms(frame):
            self._clear("owned-elsewhere")
            return False
        self.active["sequence"] = sequence
        return True

    def _renew(self, rpc, token):
        if not self._valid_token(token):
            return False
        self.active["deadline"] = self.clock() + 1
        return True

    def _release(self, rpc, token):
        if self.active and self.active["token"] == token:
            self._clear()
        return None

    def _cancel(self, rpc, request_id):
        self.cancelled.add(request_id)
        self.prepared.pop(request_id, None)
        if self.warm and self.warm["request"] == request_id or self.active and self.active["request"] == request_id or self.prepared_owner and self.prepared_owner["request"] == request_id:
            self._clear()
        return None

    def tick(self, ready=None):
        ready = self.native.poll(0) if ready is None else ready
        now = self.clock()
        self.prepared = {k: v for k, v in self.prepared.items() if v["expires"] > now}
        if not self.owned and self.native.snapshot().effect:
            for record in self.prepared.values():
                record["ready"] = False
        if self.owned and not self._still_owned():
            for record in self.prepared.values():
                record["ready"] = False
            self._clear("owned-elsewhere")
        elif self.retiring:
            if self.retiring["path"] in ready or self.retiring["deadline"]<=now:
                self._finish_clear()
        elif self.active and self.active["deadline"] <= now:
            self._clear()
        elif self.prepared_owner and self.prepared_owner["deadline"] <= now:
            self._clear()
        elif self.warm:
            if self.warm["record"]["path"] in ready:
                warm, self.warm = self.warm, None
                # set_effect re-arms the native ready callback. Pipeline execute
                # invokes it even on a cache hit; verify each warmup rather than
                # guessing residency from a frontend viewport identity.
                for record in self.prepared.values():
                    record["ready"] = record is warm["record"]
                # Do not disable here: vulkan_composite clears the last pipeline
                # when no effect is active. Hold only this current preparation,
                # with zero masks and a one-second activation deadline.
                self.prepared_owner = {"request": warm["request"], "deadline": now + 1}
                if 'activation_rpc' in warm:
                    self.reply(warm['rpc'], {'status': 'ready', 'key': warm['record']['key']})
                if "activate_frame" in warm:
                    result=self._activate(warm.get('activation_rpc', warm['rpc']),warm["request"],warm["record"]["key"],1,warm["activate_frame"])
                else:
                    result={"status":"ready","key":warm["record"]["key"]}
                self.reply(warm.get('activation_rpc', warm['rpc']),result)
            elif self.warm["deadline"] <= now:
                self._clear("not-ready")

    def close(self):
        if self.closed:
            return
        self.closed = True
        try:
            self._clear("connection")
            deadline=time.monotonic()+1
            while self.retiring and time.monotonic()<deadline:
                self.tick(self.native.poll(.025))
            if self.retiring:
                self._finish_clear()
        finally:
            self.native.close()
            directory = Path(self.home) / ".local/share/gamescope/reshade/Shaders"
            for path, key in self.files.items():
                target = directory / path
                try:
                    if not target.is_symlink() and hashlib.sha256(target.read_bytes()).hexdigest() == key:
                        target.unlink()
                except OSError:
                    pass


_PENDING = object()


def serve(native, home, input_fd, reply, running=lambda: True):
    worker = None
    buffer = b""
    commands = 0
    try:
        worker = FrostWorker(native, home, time.monotonic, reply)
        while running() and commands < 4096:
            worker.tick()
            descriptors=[input_fd]
            if hasattr(native,"fileno"):
                descriptors.append(native.fileno())
            readable, _, _ = select.select(descriptors, [], [], .025)
            if input_fd not in readable:
                continue
            data = os.read(input_fd, 16385)
            if not data:
                break
            buffer += data
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                if len(line) > 16384:
                    raise ValueError("oversized command")
                command = json.loads(line)
                if set(command) != {"id", "operation", "args"} or type(command["id"]) is not int:
                    raise ValueError("invalid envelope")
                worker.command(command["id"], command["operation"], command["args"])
                commands += 1
            if len(buffer) > 16384:
                raise ValueError("oversized command")
    except (OSError, ValueError, EOFError):
        pass
    finally:
        if worker:
            worker.close()


def main():
    running = True
    def stop(*_):
        nonlocal running
        running = False
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    def reply(rpc, value):
        print(json.dumps({"id": rpc, "value": value}, allow_nan=False), flush=True)
    try:
        def guarding():
            try:
                print(json.dumps({"event":"callback-guard"}),flush=True)
            except (BrokenPipeError,OSError):
                pass
        native = NativeConnection(on_guard=guarding)
    except (OSError, ValueError):
        return
    serve(native, os.environ["HOME"], sys.stdin.fileno(), reply, lambda: running)


if __name__ == "__main__":
    main()
