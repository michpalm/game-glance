"""Connected Bluetooth controllers' battery levels, from BlueZ (org.bluez.Battery1).

Steam's own controller list reports a placeholder level for some controllers; BlueZ's Battery1 matches Steam's
Bluetooth settings. Read with busctl (part of systemd), so no D-Bus library is needed. Only names and percentages
leave this module: no addresses or object paths.
"""

import json
import os
import subprocess

COMMAND = ["busctl", "--system", "--json=short", "call", "org.bluez", "/", "org.freedesktop.DBus.ObjectManager", "GetManagedObjects"]
TIMEOUT_S = 2


def _value(interface, name):
    entry = interface.get(name) if isinstance(interface, dict) else None
    return entry.get("data") if isinstance(entry, dict) else None


def parse_controllers(managed):
    """[{"name", "percent"}] for connected gamepads that report a battery, from GetManagedObjects' data. Pure."""
    controllers = []
    for interfaces in (managed or {}).values():
        if not isinstance(interfaces, dict):
            continue
        device = interfaces.get("org.bluez.Device1")
        battery = interfaces.get("org.bluez.Battery1")
        if not device or battery is None or _value(device, "Connected") is not True:
            continue
        icon = _value(device, "Icon")
        if not isinstance(icon, str) or not icon.startswith("input-gaming"):
            continue
        percent = _value(battery, "Percentage")
        if isinstance(percent, bool) or not isinstance(percent, (int, float)):
            continue
        # Alias is the name set in Steam's Bluetooth settings (BlueZ falls back to Name itself); Name when there is none.
        name = next((n for n in (_value(device, "Alias"), _value(device, "Name")) if isinstance(n, str) and n), "Controller")
        controllers.append({"name": name, "percent": max(0, min(100, int(round(percent))))})
    return controllers


def subprocess_env(environ):
    """Environment for system binaries: Decky's bundled interpreter points LD_LIBRARY_PATH at its own libs."""
    env = dict(environ)
    if "LD_LIBRARY_PATH_ORIG" in env:
        env["LD_LIBRARY_PATH"] = env["LD_LIBRARY_PATH_ORIG"]
    else:
        env.pop("LD_LIBRARY_PATH", None)
    return env


def read_controllers(run=subprocess.run, environ=None, log=None):
    """
    The connected controllers' batteries; [] when BlueZ or busctl is missing, slow or answers something unexpected.
    `log` hears why in one line (an exit code or an error type, never busctl's output: it holds device addresses).
    """
    try:
        result = run(COMMAND, capture_output=True, text=True, timeout=TIMEOUT_S, env=subprocess_env(os.environ if environ is None else environ))
        if result.returncode != 0:
            if log:
                log(f"busctl exited with {result.returncode}")
            return []
        return parse_controllers(json.loads(result.stdout)["data"][0])
    except Exception as error:
        if log:
            log(f"reading BlueZ failed: {type(error).__name__}")
        return []
