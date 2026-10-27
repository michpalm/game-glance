import pytest
from gameglance.frost.native import pack_uniform, protocol_description
from gameglance.frost.native import read_max_scale


def test_uniform_payloads_are_exact_float_vectors():
    import struct
    assert pack_uniform("Bar", [.1, .2, .3, .4]) == struct.pack("<4f", .1, .2, .3, .4)
    assert len(pack_uniform("NotificationsRadius", [.1, .2])) == 8
    for name, value in [("foreign", [0]), ("Bar", [0]), ("PanelRadius", [float("nan"), 0])]:
        with pytest.raises(ValueError):
            pack_uniform(name, value)


def test_only_verified_native_protocol_opcodes_are_exposed():
    assert protocol_description() == ("gamescope_reshade", 1, ("destroy", "set_effect", "enable_effect", "set_uniform_variable", "disable_effect"))


def test_max_scale_reads_only_the_single_desktop_compositor(tmp_path):
    import os
    process = tmp_path / '123'
    process.mkdir()
    (process / 'comm').write_text('gamescope-wl\n')
    (process / 'cmdline').write_bytes(b'gamescope\0--max-scale\x002.0\0')
    assert read_max_scale(tmp_path, os.getuid()) == 2
    (process / 'cmdline').write_bytes(b'gamescope\0--max-scale=garbage\0')
    assert read_max_scale(tmp_path, os.getuid()) is None


def test_native_resource_is_not_destroyed_before_armed_callback_is_consumed():
    from types import SimpleNamespace
    from gameglance.frost.native import NativeConnection
    n=object.__new__(NativeConnection)
    calls=[]
    n.display=1;n.xdisplay=n.proxy=n.registry=None;n.armed_path='pending.fx'
    n.on_guard=lambda:calls.append('guard')
    def poll(timeout,retiring=False):
        assert retiring
        calls.append('ready');n.armed_path=None
    n.poll=poll
    n.wl=SimpleNamespace(wl_display_disconnect=lambda display:calls.append('disconnect'))
    n.close()
    assert calls==['guard','ready','disconnect']


def test_uniform_ownership_checks_use_property_events_without_repeated_roundtrips():
    from gameglance.frost.native import NativeConnection,NativeState
    class X:
        events=[]
        def XPending(self,display):return len(self.events)
        def XNextEvent(self,display,event):
            event._obj.type=28;event._obj.xproperty.atom=self.events.pop(0)
    n=object.__new__(NativeConnection)
    n.x=X();n.xdisplay=1;n.effect_atom=10;n.technique_atom=11;n._snapshot_cache=None
    values={10:'owned.fx',11:0};calls=[]
    def read(atom):calls.append(atom);return values[atom]
    n._property=read
    assert n.snapshot()==NativeState('owned.fx',0)
    for _ in range(12):assert n.snapshot()==NativeState('owned.fx',0)
    assert calls==[10,11]
    values[10]='foreign.fx';n.x.events.append(10)
    assert n.snapshot()==NativeState('foreign.fx',0)
    assert calls==[10,11,10,11]
