"""Async Decky transport. Native code runs as the desktop user, never root."""
import asyncio
import json
import os
import pwd
import re
import stat
from pathlib import Path

from gameglance.bluetooth import subprocess_env
from .contracts import identifier, validate_frame


def session_environment(home, candidate, validate=True):
    keys = ("DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "XAUTHORITY")
    env = {key: candidate[key] for key in keys if isinstance(candidate.get(key), str)}
    env.update({"HOME": home, "PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"})
    if not re.fullmatch(r":\d+(?:\.\d+)?", env.get("DISPLAY", "")):
        raise ValueError("unsupported desktop display")
    runtime = Path(env.get("XDG_RUNTIME_DIR", ""))
    if not runtime.is_absolute():
        raise ValueError("invalid runtime directory")
    if validate:
        uid = Path(home).stat().st_uid
        if not env.get("WAYLAND_DISPLAY"):
            sockets = [p for p in runtime.iterdir() if re.fullmatch(r"gamescope-\d+",p.name) and p.stat().st_uid == uid and stat.S_ISSOCK(p.stat().st_mode)]
            if len(sockets) != 1:
                raise ValueError("ambiguous Gamescope session")
            env["WAYLAND_DISPLAY"] = sockets[0].name
        socket = runtime / env["WAYLAND_DISPLAY"]
        if runtime.stat().st_uid != uid or socket.stat().st_uid != uid or not stat.S_ISSOCK(socket.stat().st_mode):
            raise ValueError("unverified desktop session")
    if not re.fullmatch(r"(?:gamescope|wayland)-\d+",env.get("WAYLAND_DISPLAY","")):
        raise ValueError("unsupported Wayland display")
    return subprocess_env(env)


def discover_session(home):
    uid = Path(home).stat().st_uid
    if uid == 0:
        raise ValueError("desktop account unavailable")
    # Use the actual Steam process session, not Decky's service environment.
    for process in Path("/proc").iterdir():
        try:
            if not process.name.isdigit() or process.stat().st_uid != uid:
                continue
            if (process / "comm").read_text().strip() not in ("steam", "steamwebhelper"):
                continue
            raw = (process / "environ").read_bytes()
            candidate = {}
            for pair in raw.split(b"\0"):
                key, _, value = pair.partition(b"=")
                if key in (b"DISPLAY", b"WAYLAND_DISPLAY", b"XDG_RUNTIME_DIR", b"XAUTHORITY"):
                    candidate[key.decode()] = value.decode()
            return session_environment(home, candidate)
        except (OSError, ValueError, UnicodeError):
            continue
    raise ValueError("desktop session unavailable")


class FrostService:
    def __init__(self, user_home: str, plugin_dir: str):
        self.home, self.plugin_dir = user_home, plugin_dir
        self.process = self.reader = None
        self.pending = {}
        self.serial = 0
        self.start_lock = asyncio.Lock()
        self.write_lock = asyncio.Lock()
        self.closed = False
        self.guarding = set()

    async def _start(self):
        async with self.start_lock:
            if self.closed:
                raise OSError("service closed")
            if self.process and self.process.returncode is None:
                if self.reader and self.reader.done():
                    await asyncio.wait_for(self.process.wait(), 1.5)
                else:
                    return
            env = await asyncio.to_thread(discover_session, self.home)
            account = pwd.getpwuid(Path(self.home).stat().st_uid)
            if os.geteuid() not in (0, account.pw_uid):
                raise ValueError("desktop identity mismatch")
            env["PYTHONPATH"] = str(Path(self.plugin_dir) / "py_modules")
            identity = {"user": account.pw_uid, "group": account.pw_gid, "extra_groups": []} if os.geteuid() == 0 else {}
            process = await asyncio.create_subprocess_exec("/usr/bin/python3", "-m", "gameglance.frost.worker", env=env,
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL, limit=16384, **identity)
            self.process, self.pending = process, {}
            self.reader = asyncio.create_task(self._read(process, self.pending))

    async def _read(self, process, pending):
        try:
            while line := await process.stdout.readline():
                message = json.loads(line)
                if message=={"event":"callback-guard"}:
                    self.guarding.add(process)
                    continue
                if set(message) != {"id", "value"} or type(message["id"]) is not int:
                    raise ValueError("invalid worker response")
                future = pending.pop(message["id"], None)
                if future and not future.done():
                    future.set_result(message["value"])
        except (OSError, ValueError):
            pass
        finally:
            for future in list(pending.values()):
                if not future.done():
                    future.set_exception(OSError("worker disconnected"))
            pending.clear()
            # Closing stdin also asks a live worker with a broken output pipe
            # to leave its select loop and perform owned-state cleanup.
            if process.stdin:
                process.stdin.close()

    async def _call(self, operation, args):
        try:
            if "frame" in args:
                args = {**args, "frame": validate_frame(args["frame"])}
            for field in ("request_id", "token", "key"):
                if field in args:
                    identifier(args[field])
            await self._start()
            async with self.write_lock:
                process, pending = self.process, self.pending
                if not process or len(pending) >= 64:
                    raise OSError("worker unavailable")
                self.serial += 1
                rpc = self.serial
                future = asyncio.get_running_loop().create_future()
                line = json.dumps({"id": rpc, "operation": operation, "args": args}, allow_nan=False).encode() + b"\n"
                if len(line) > 16384:
                    raise ValueError("oversized command")
                pending[rpc] = future
                process.stdin.write(line)
                await asyncio.wait_for(process.stdin.drain(), 1)
            try:
                return await asyncio.wait_for(future, 6)
            finally:
                pending.pop(rpc, None)
        except (OSError, ValueError, TypeError, asyncio.TimeoutError):
            return {"status": "unavailable", "reason": "connection"} if operation in ("prepare", "present", "activate") else False

    async def prepare(self, request_id, frame):
        return await self._call("prepare", {"request_id": request_id, "frame": frame})

    async def environment(self):
        result = await self._call("environment", {})
        return result if isinstance(result, dict) and set(result) == {"hdr", "maxScale"} else None

    async def present(self,request_id,frame):
        return await self._call("present",{"request_id":request_id,"frame":frame})

    async def activate(self, request_id, key, sequence, frame):
        return await self._call("activate", {"request_id": request_id, "key": key, "sequence": sequence, "frame": frame})

    async def update(self, token, sequence, frame):
        return await self._call("update", {"token": token, "sequence": sequence, "frame": frame})

    async def renew(self, token):
        return await self._call("renew", {"token": token})

    async def release(self, token):
        await self._call("release", {"token": token})

    async def cancel(self, request_id):
        await self._call("cancel", {"request_id": request_id})

    async def close(self):
        self.closed = True
        async with self.start_lock:
            process = self.process
            if process:
                if process.stdin:
                    process.stdin.close()
                try:
                    await asyncio.wait_for(process.wait(), 1.5)
                except asyncio.TimeoutError:
                    process.terminate()
                    try:
                        await asyncio.wait_for(process.wait(), 1)
                    except asyncio.TimeoutError:
                        # SIGKILL can destroy a native resource whose callback
                        # is still held by Gamescope. A retiring worker owns no
                        # effect and stays read-only until callback/server EOF.
                        self.process=None
                        return
            if self.reader:
                await self.reader
            self.process = None
