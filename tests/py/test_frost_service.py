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
