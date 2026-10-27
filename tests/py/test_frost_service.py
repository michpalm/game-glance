import asyncio
import json
from gameglance.frost.service import FrostService, session_environment


def test_missing_session_is_unavailable_without_starting_a_worker(tmp_path):
    async def run():
        service = FrostService(str(tmp_path), str(tmp_path))
        result = await service.prepare("r", {})
        assert result["status"] == "unavailable"
        await service.close()
        await service.close()
    asyncio.run(run())


def test_session_discovery_never_copies_unrelated_environment_secrets(tmp_path):
    runtime = tmp_path / "runtime"
    runtime.mkdir()
    env = session_environment(str(tmp_path), {"DISPLAY": ":0", "WAYLAND_DISPLAY": "gamescope-0", "XDG_RUNTIME_DIR": str(runtime), "PRIVATE_TOKEN": "secret", "LD_LIBRARY_PATH": "decky"}, validate=False)
    assert "PRIVATE_TOKEN" not in env and "LD_LIBRARY_PATH" not in env
    assert env["HOME"] == str(tmp_path)
    assert env["DISPLAY"] == ":0"


def test_missing_wayland_environment_discovers_only_one_owned_gamescope_socket(tmp_path):
    import socket
    import tempfile
    import pytest
    with tempfile.TemporaryDirectory(prefix='gg-frost-',dir='/private/tmp') as runtime:
        first=socket.socket(socket.AF_UNIX)
        second=socket.socket(socket.AF_UNIX)
        try:
            first.bind(runtime+'/gamescope-0')
            env=session_environment(str(tmp_path),{'DISPLAY':':0','WAYLAND_DISPLAY':'','XDG_RUNTIME_DIR':runtime})
            assert env['WAYLAND_DISPLAY']=='gamescope-0'
            second.bind(runtime+'/gamescope-1')
            with pytest.raises(ValueError):
                session_environment(str(tmp_path),{'DISPLAY':':0','XDG_RUNTIME_DIR':runtime})
        finally:
            first.close();second.close()


def test_unload_never_force_kills_a_native_callback_guard(tmp_path,monkeypatch):
    from types import SimpleNamespace
    async def run():
        calls=[]
        async def wait():
            await asyncio.sleep(10)
        async def timeout(awaitable,seconds):
            awaitable.close()
            raise asyncio.TimeoutError
        process=SimpleNamespace(stdin=SimpleNamespace(close=lambda:None),wait=wait,terminate=lambda:calls.append('terminate'),kill=lambda:calls.append('kill'))
        service=FrostService(str(tmp_path),str(tmp_path));service.process=process
        monkeypatch.setattr(asyncio,'wait_for',timeout)
        await service.close()
        assert calls==['terminate']
    asyncio.run(run())
