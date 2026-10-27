import pytest
from gameglance.frost.native import pack_uniform, protocol_description


def test_uniform_payloads_are_exact_float_vectors():
    import struct
    assert pack_uniform("Bar", [.1, .2, .3, .4]) == struct.pack("<4f", .1, .2, .3, .4)
    assert len(pack_uniform("NotificationsRadius", [.1, .2])) == 8
    for name, value in [("foreign", [0]), ("Bar", [0]), ("PanelRadius", [float("nan"), 0])]:
        with pytest.raises(ValueError):
            pack_uniform(name, value)


def test_only_verified_native_protocol_opcodes_are_exposed():
    assert protocol_description() == ("gamescope_reshade", 1, ("destroy", "set_effect", "enable_effect", "set_uniform_variable", "disable_effect"))
