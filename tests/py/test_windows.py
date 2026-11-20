"""Windows (Playhub, Decky Loader for Windows): no `pwd` module, no os.geteuid. The backend must still load; Frost,
which needs Gamescope, reports itself unavailable instead of crashing the import (2026-11-17)."""
import asyncio
import importlib
import os
import sys
import types

import pytest


def _without_pwd(monkeypatch):
    # A None entry makes `import pwd` raise ImportError, as on Windows.
    monkeypatch.setitem(sys.modules, "pwd", None)
    monkeypatch.delattr(os, "geteuid", raising=False)
    for name in [n for n in sys.modules if n == "main" or n.startswith("gameglance.frost.service")]:
        monkeypatch.delitem(sys.modules, name)


def test_frost_service_imports_without_pwd(monkeypatch):
    _without_pwd(monkeypatch)
    service = importlib.import_module("gameglance.frost.service")
    assert service.pwd is None


def test_frost_reports_linux_only_instead_of_starting(monkeypatch, tmp_path):
    _without_pwd(monkeypatch)
    service = importlib.import_module("gameglance.frost.service")
    frost = service.FrostService(str(tmp_path), str(tmp_path))
    with pytest.raises(OSError, match="Linux-only"):
        asyncio.run(frost._start())


def test_the_backend_loads_without_pwd(monkeypatch, tmp_path):
    _without_pwd(monkeypatch)
    decky = types.ModuleType("decky")
    decky.DECKY_PLUGIN_SETTINGS_DIR = str(tmp_path / "settings")
    decky.DECKY_PLUGIN_LOG_DIR = str(tmp_path / "logs")
    decky.DECKY_USER_HOME = str(tmp_path / "home")
    decky.DECKY_PLUGIN_VERSION = "test"
    decky.logger = types.SimpleNamespace(info=lambda *a, **k: None, warning=lambda *a, **k: None, exception=lambda *a, **k: None, error=lambda *a, **k: None)
    os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR)
    monkeypatch.setitem(sys.modules, "decky", decky)
    monkeypatch.syspath_prepend(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    main = importlib.import_module("main")
    assert hasattr(main, "Plugin")


def test_frost_answers_unavailable_so_the_menu_draws_plain_glass(monkeypatch, tmp_path):
    _without_pwd(monkeypatch)
    service = importlib.import_module("gameglance.frost.service")
    frost = service.FrostService(str(tmp_path), str(tmp_path))
    assert asyncio.run(frost.environment()) is None
    assert asyncio.run(frost.renew("t" * 16)) is False
