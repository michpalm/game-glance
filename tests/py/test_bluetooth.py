import json
import subprocess
from types import SimpleNamespace

from gameglance.bluetooth import parse_controllers, read_controllers


def device(name, connected, icon, battery=None):
    # One object in busctl's --json=short GetManagedObjects output (properties as {"type", "data"}).
    interfaces = {"org.bluez.Device1": {"Connected": {"type": "b", "data": connected}, "Icon": {"type": "s", "data": icon}}}
    if name is not None:
        interfaces["org.bluez.Device1"]["Name"] = {"type": "s", "data": name}
    if battery is not None:
        interfaces["org.bluez.Battery1"] = {"Percentage": {"type": "y", "data": battery}}
    return interfaces


FIXTURE = {
    "/org/bluez/hci0": {"org.bluez.Adapter1": {}},
    "/org/bluez/hci0/dev_A": device("8BitDo Ultimate 2C Wireless", True, "input-gaming", 17),
    "/org/bluez/hci0/dev_B": device("Old Pad", False, "input-gaming", 80),
    "/org/bluez/hci0/dev_C": device("MX Master 3 Mac", True, "input-mouse", 60),
    "/org/bluez/hci0/dev_D": device("No Battery Pad", True, "input-gaming"),
}


def test_keeps_connected_gamepads_with_a_battery():
    assert parse_controllers(FIXTURE) == [{"name": "8BitDo Ultimate 2C Wireless", "percent": 17}]


def test_drops_disconnected_mice_and_controllers_without_battery():
    names = [c["name"] for c in parse_controllers(FIXTURE)]
    assert names == ["8BitDo Ultimate 2C Wireless"]


def test_missing_name_is_controller():
    assert parse_controllers({"/d": device(None, True, "input-gaming", 50)})[0]["name"] == "Controller"
    assert parse_controllers({"/d": device("", True, "input-gaming", 50)})[0]["name"] == "Controller"


def test_percent_out_of_range_is_clamped_and_non_numbers_dropped():
    odd = {
        "/a": device("Low", True, "input-gaming", -5),
        "/b": device("High", True, "input-gaming", 140),
        "/c": device("Text", True, "input-gaming", "x"),
    }
    assert [c["percent"] for c in parse_controllers(odd)] == [0, 100]


def test_result_has_no_addresses():
    assert all(set(c) == {"name", "percent"} for c in parse_controllers(FIXTURE))


def raising(error):
    def run(*args, **kwargs):
        raise error
    return run


def returning(stdout, returncode):
    return lambda *args, **kwargs: SimpleNamespace(stdout=stdout, returncode=returncode)


def test_reads_busctl_output():
    output = json.dumps({"type": "a{oa{sa{sv}}}", "data": [FIXTURE]})
    assert read_controllers(run=returning(output, 0)) == [{"name": "8BitDo Ultimate 2C Wireless", "percent": 17}]


def test_command_failure_timeout_or_bad_json_is_empty():
    assert read_controllers(run=raising(FileNotFoundError())) == []
    assert read_controllers(run=raising(subprocess.TimeoutExpired("busctl", 2))) == []
    assert read_controllers(run=returning("not json", 0)) == []
    assert read_controllers(run=returning("", 1)) == []


def capturing():
    calls = []

    def run(*args, **kwargs):
        calls.append(kwargs)
        return SimpleNamespace(stdout=json.dumps({"data": [FIXTURE]}), returncode=0)
    return run, calls


def test_busctl_runs_with_the_system_library_path():
    run, calls = capturing()
    read_controllers(run=run, environ={"LD_LIBRARY_PATH": "/decky/bundle", "LD_LIBRARY_PATH_ORIG": "/usr/lib", "PATH": "/usr/bin"})
    assert calls[0]["env"]["LD_LIBRARY_PATH"] == "/usr/lib"
    assert calls[0]["env"]["PATH"] == "/usr/bin"
    run, calls = capturing()
    read_controllers(run=run, environ={"LD_LIBRARY_PATH": "/decky/bundle"})
    assert "LD_LIBRARY_PATH" not in calls[0]["env"]


def test_a_failure_is_logged_without_the_output():
    logged = []
    read_controllers(run=returning("dev_AA_BB_CC not json", 3), log=logged.append)
    read_controllers(run=returning("dev_AA_BB_CC not json", 0), log=logged.append)
    read_controllers(run=raising(subprocess.TimeoutExpired("busctl", 2)), log=logged.append)
    assert len(logged) == 3
    assert all("AA_BB" not in line for line in logged)
    assert "3" in logged[0]


def test_success_logs_nothing():
    logged = []
    read_controllers(run=returning(json.dumps({"data": [FIXTURE]}), 0), log=logged.append)
    assert logged == []


def test_the_name_you_set_wins_over_the_device_name():
    renamed = device("8BitDo Ultimate 2C Wireless", True, "input-gaming", 40)
    renamed["org.bluez.Device1"]["Alias"] = {"type": "s", "data": "Living room pad"}
    assert parse_controllers({"/d": renamed})[0]["name"] == "Living room pad"
    assert parse_controllers({"/d": device("8BitDo Ultimate 2C Wireless", True, "input-gaming", 40)})[0]["name"] == "8BitDo Ultimate 2C Wireless"
