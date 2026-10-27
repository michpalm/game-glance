from copy import deepcopy
import struct

import pytest

from gameglance.frost.worker import FrostWorker
from gameglance.frost.native import NativeState
from test_frost_shader import frame


class FakeNative:
    def __init__(self):
        self.state = NativeState("", 7)
        self.path = ""
        self.calls = []
        self.ready = set()

    def snapshot(self):
        return self.state

    def set_effect(self, path):
        self.path = path
        self.ready.clear()
        self.calls.append(("set", path))

    def select_technique(self, index):
        self.state = NativeState(self.state.effect, index)
        self.calls.append(("technique", index))

    def set_uniform(self, name, value):
        self.calls.append(("uniform", name, value))

    def enable(self):
        self.state = NativeState(self.path, self.state.technique)
        self.calls.append(("enable",))

    def disable(self):
        self.state = NativeState("", self.state.technique)
        self.calls.append(("disable",))

    def poll(self, timeout):
        result, self.ready = self.ready, set()
        return result

    def close(self):
        self.calls.append(("close",))


def fixture(tmp_path):
    native = FakeNative()
    now = [0.0]
    replies = {}
    worker = FrostWorker(native, str(tmp_path), lambda: now[0], lambda rpc, value: replies.update({rpc: value}))
    return worker, native, now, replies


def prepare(worker, native, replies, request="req1", f=None):
    worker.command(1, "prepare", {"request_id": request, "frame": f or frame()})
    native.ready.add(native.path)
    worker.tick()
    return replies[1]


def activate(worker, native, replies, request="req1"):
    key = prepare(worker, native, replies, request)["key"]
    worker.command(2, "activate", {"request_id": request, "key": key, "sequence": 1, "frame": frame()})
    return replies[2]["token"]


def test_foreign_effect_is_never_replaced(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    n.state = NativeState("someone-else.fx", 4)
    w.command(1, "prepare", {"request_id": "r", "frame": frame()})
    assert replies[1] == {"status": "unavailable", "reason": "owned-elsewhere"}
    assert n.calls == []


def test_every_prepare_rearms_readiness_even_for_a_cached_native_pipeline(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    w.command(1, "prepare", {"request_id": "r", "frame": frame()})
    w.tick()
    assert 1 not in replies
    n.ready.add(n.path)
    w.tick()
    assert replies[1]["status"] == "ready" and n.state.effect and n.state.technique == 0
    w.command(10,"cancel",{"request_id":"r"})
    w.command(2, "prepare", {"request_id": "r2", "frame": frame()})
    assert 2 not in replies
    n.ready.add(n.path)
    w.tick()
    assert replies[2]["status"] == "ready"
    w.command(11,"cancel",{"request_id":"r2"})
    other = frame(width=1280)
    w.command(3, "prepare", {"request_id": "r3", "frame": other})
    assert 3 not in replies


def test_evicted_pipeline_and_viewport_identity_cannot_bypass_a_fresh_ready_event(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    prepare(w, n, replies)
    w.command(20,"cancel",{"request_id":"req1"})
    prepare(w, n, replies, "other", frame(width=1280))
    w.command(21,"cancel",{"request_id":"other"})
    w.command(8, "prepare", {"request_id": "again", "frame": frame()})
    assert 8 not in replies
    n.ready.add(n.path)
    w.tick()
    assert replies[8]["status"] == "ready"
    w.command(22,"cancel",{"request_id":"again"})
    f = frame()
    f["context"]["viewportId"] = "replacement"
    w.command(9, "prepare", {"request_id": "replacement", "frame": f})
    assert 9 not in replies
    n.ready.add(n.path)
    w.tick()
    assert replies[9]["status"] == "ready"


def test_foreign_use_while_idle_invalidates_prepared_readiness(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    key = prepare(w, n, replies)["key"]
    n.state = NativeState("foreign.fx", 5)
    w.tick()
    n.state = NativeState("", 5)
    w.command(9, "activate", {"request_id": "req1", "key": key, "sequence": 1, "frame": frame()})
    assert replies[9] == {"status": "unavailable", "reason": "not-ready"}


def test_prepare_and_activate_share_pipeline_without_disable_or_reenable(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    key = prepare(w, n, replies)["key"]
    assert ("disable",) not in n.calls
    n.calls.clear()
    w.command(2,"activate",{"request_id":"req1","key":key,"sequence":1,"frame":frame()})
    assert replies[2]["status"] == "active"
    assert not any(call[0] in ("set","enable","disable") for call in n.calls)


def test_ready_zero_mask_lease_expires_when_frontend_never_activates(tmp_path):
    w, n, now, replies = fixture(tmp_path)
    prepare(w,n,replies)
    now[0] = 1
    w.tick()
    assert n.state == NativeState("",7)


def test_cancelled_cold_prepare_drains_callback_before_disabling_the_owned_effect(tmp_path):
    w,n,_,replies=fixture(tmp_path)
    w.command(1,'prepare',{'request_id':'cold','frame':frame()})
    w.command(2,'cancel',{'request_id':'cold'})
    assert n.state.effect  # zero masks while the native callback is still armed
    assert replies[1]['reason']=='cancelled'
    n.ready.add(n.path)
    w.tick()
    assert n.state==NativeState('',7)


def test_unresponsive_callback_stops_zero_mask_composition_after_one_second(tmp_path):
    w,n,now,replies=fixture(tmp_path)
    w.command(1,'prepare',{'request_id':'cold','frame':frame()})
    w.command(2,'cancel',{'request_id':'cold'})
    now[0]=1
    w.tick()
    assert n.state==NativeState('',7)


def test_cancelled_late_ready_does_not_block_a_later_rearmed_warmup(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    w.command(1, "prepare", {"request_id": "old", "frame": frame()})
    w.command(2, "cancel", {"request_id": "old"})
    n.ready.add(n.path)
    w.tick()
    w.command(3, "prepare", {"request_id": "new", "frame": frame()})
    assert 3 not in replies
    n.ready.add(n.path)
    w.tick()
    assert replies[3]["status"] == "ready"


def test_cancel_before_token_and_late_ready_cannot_activate(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    w.command(1, "prepare", {"request_id": "r", "frame": frame()})
    w.command(2, "cancel", {"request_id": "r"})
    n.ready.add(n.path)
    w.tick()
    w.command(3, "activate", {"request_id": "r", "key": "anything", "sequence": 1, "frame": frame()})
    assert replies[1]["status"] == "unavailable"
    assert replies[3] == {"status": "unavailable", "reason": "cancelled"}
    assert n.state.effect == ""


def test_expiry_and_renewal_are_independent_of_frontend(tmp_path):
    w, n, now, replies = fixture(tmp_path)
    token = activate(w, n, replies)
    for t in [.25, .5, .75]:
        now[0] = t
        w.command(4, "renew", {"token": token})
        assert replies[4] is True
    now[0] = 1.74
    w.tick()
    assert n.state.effect
    now[0] = 1.75
    w.tick()
    assert n.state == NativeState("", 7)
    w.command(5, "update", {"token": token, "sequence": 9, "frame": frame()})
    assert replies[5] is False


def test_stale_sequence_and_changed_allocation_clear_without_reactivation(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    token = activate(w, n, replies)
    n.calls.clear()
    w.command(3, "update", {"token": token, "sequence": 1, "frame": frame()})
    assert replies[3] is False and n.calls == []
    f = frame()
    f["regions"]["bar"]["width"] = .5
    w.command(4, "update", {"token": token, "sequence": 2, "frame": f})
    assert replies[4] is False and n.state.effect == ""


@pytest.mark.parametrize("phase", ["preparing", "active"])
def test_external_ownership_change_prevents_all_cleanup_writes(tmp_path, phase):
    w, n, _, replies = fixture(tmp_path)
    if phase == "active":
        activate(w, n, replies)
    else:
        w.command(1, "prepare", {"request_id": "r", "frame": frame()})
    n.state = NativeState("foreign.fx", 5)
    n.calls.clear()
    w.tick()
    w.close()
    assert n.state == NativeState("foreign.fx", 5)
    assert n.calls == [("close",)]


def test_release_is_idempotent_and_clears_masks_before_disabling(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    token = activate(w, n, replies)
    n.calls.clear()
    w.command(5, "release", {"token": token})
    first = list(n.calls)
    w.command(6, "release", {"token": token})
    assert n.calls == first
    assert first[0] == ("uniform", "Bar", bytes(16))
    assert first[-2:] == [("technique", 7), ("disable",)]


def test_malformed_commands_make_no_native_mutations(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    f = frame()
    f["regions"]["bar"]["width"] = float("nan")
    w.command(1, "prepare", {"request_id": "r", "frame": f})
    assert replies[1]["status"] == "unavailable" and n.calls == []
    w.command(2, "prepare", {"request_id": "r", "frame": frame(), "path": "evil"})
    assert n.calls == []


def test_unload_cleans_owned_state_and_preserves_replaced_file(tmp_path):
    from pathlib import Path
    w, n, _, replies = fixture(tmp_path)
    activate(w, n, replies)
    path = Path(tmp_path) / ".local/share/gamescope/reshade/Shaders" / n.path
    path.write_text("foreign replacement")
    w.close()
    assert path.read_text() == "foreign replacement"
    assert n.state == NativeState("", 7)


def test_ownership_loss_during_clear_stops_the_remaining_writes(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    token = activate(w, n, replies)
    original = n.set_uniform
    def take_over(name, value):
        original(name, value)
        n.state = NativeState("foreign.fx", 3)
    n.set_uniform = take_over
    n.calls.clear()
    w.command(3, "release", {"token": token})
    assert n.state == NativeState("foreign.fx", 3)
    assert len(n.calls) == 1


def test_invalid_geometry_on_owned_update_clears_the_active_mask(tmp_path):
    w, n, _, replies = fixture(tmp_path)
    token = activate(w, n, replies)
    f = frame()
    f["regions"]["panel"]["width"] = float("nan")
    w.command(3, "update", {"token": token, "sequence": 2, "frame": f})
    assert replies[3] is False
    assert n.state.effect == ""


def test_stdin_eof_releases_an_active_worker_without_frontend_cleanup(tmp_path):
    import json
    import os
    import queue
    import threading
    from gameglance.frost.worker import serve
    native = FakeNative()
    original_enable = native.enable
    def enable_ready():
        original_enable()
        native.ready.add(native.path)
    native.enable = enable_ready
    read_fd, write_fd = os.pipe()
    replies = queue.Queue()
    thread = threading.Thread(target=serve, args=(native, str(tmp_path), read_fd, lambda rpc, value: replies.put((rpc, value))))
    thread.start()
    def send(rpc, operation, args):
        os.write(write_fd, (json.dumps({"id": rpc, "operation": operation, "args": args}) + "\n").encode())
        return replies.get(timeout=2)[1]
    try:
        prepared = send(1, "prepare", {"request_id": "r", "frame": frame()})
        active = send(2, "activate", {"request_id": "r", "key": prepared["key"], "sequence": 1, "frame": frame()})
        assert active["status"] == "active"
    finally:
        os.close(write_fd)
        thread.join(timeout=2)
        os.close(read_fd)
    assert not thread.is_alive()
    assert native.state == NativeState("", 7)
