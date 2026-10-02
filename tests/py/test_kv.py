import json
import os

from gameglance.kv import KvStore


def test_set_get_roundtrip_persists(tmp_path):
    path = tmp_path / "data.json"
    store = KvStore(str(path))
    store.set("a", {"v": 1})
    assert KvStore(str(path)).get("a") == {"v": 1}


def test_missing_key_returns_none(tmp_path):
    assert KvStore(str(tmp_path / "data.json")).get("nope") is None


def test_corrupt_file_is_treated_as_empty(tmp_path):
    path = tmp_path / "data.json"
    path.write_text("{not json", encoding="utf-8")
    store = KvStore(str(path))
    assert store.get("a") is None
    store.set("a", 1)
    assert json.loads(path.read_text(encoding="utf-8")) == {"a": 1}


def test_non_dict_json_is_treated_as_empty(tmp_path):
    path = tmp_path / "data.json"
    path.write_text("[1, 2]", encoding="utf-8")
    assert KvStore(str(path)).get("0") is None


def test_delete_and_delete_prefix(tmp_path):
    store = KvStore(str(tmp_path / "data.json"))
    for key in ("cache:a", "cache:b", "override:hltb:1", "override:hltb:12"):
        store.set(key, 1)
    store.delete("override:hltb:1")
    assert store.get("override:hltb:1") is None
    assert store.get("override:hltb:12") == 1
    assert store.delete_prefix("cache:") == 2
    assert store.get("cache:a") is None
    store.delete("does-not-exist")


def test_creates_parent_directory(tmp_path):
    path = tmp_path / "nested" / "dir" / "data.json"
    KvStore(str(path)).set("a", 1)
    assert os.path.exists(path)
