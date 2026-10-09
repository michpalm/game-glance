import json
import os
import time

from gameglance.store_lookup import RegistryCache, load_registry, store_for_appid

APPID = 3123456789  # unsigned shortcut id as Steam's frontend reports it
SIGNED = APPID - 2**32  # same id stored as signed 32-bit


def test_matches_unsigned_signed_and_string_forms():
    for stored in (APPID, SIGNED, str(APPID), str(SIGNED)):
        registry = {"epic:abc": {"title": "Game", "appid": stored}}
        assert store_for_appid(registry, APPID) == "Epic"


def test_known_labels_and_unknown_store():
    registry = {
        "gog:1": {"appid": 1},
        "amazon:2": {"appid": 2},
        "ubisoft:3": {"appid": 3},
        "xcloud:4": {"appid": 4},
        "battlenet:5": {"appid": 5},
        "itch:6": {"appid": 6},
    }
    assert store_for_appid(registry, 1) == "GOG"
    assert store_for_appid(registry, 2) == "Amazon"
    assert store_for_appid(registry, 3) == "Ubisoft"
    assert store_for_appid(registry, 4) == "Xbox Cloud"
    assert store_for_appid(registry, 5) == "Battle.net"
    assert store_for_appid(registry, 6) == "Itch"


def test_no_match_and_malformed_entries():
    registry = {"nocolon": {"appid": APPID}, "epic:x": "not a dict", "gog:y": {"appid": "abc"}}
    assert store_for_appid(registry, APPID) is None


def test_matches_appid_unsigned_field():
    registry = {"gog:9": {"appid": None, "appid_unsigned": APPID, "title": "X"}}
    assert store_for_appid(registry, APPID) == "GOG"


def test_load_registry_missing_corrupt_and_non_dict(tmp_path):
    assert load_registry(str(tmp_path / "missing.json")) == {}
    bad = tmp_path / "bad.json"
    bad.write_text("{oops", encoding="utf-8")
    assert load_registry(str(bad)) == {}
    lst = tmp_path / "list.json"
    lst.write_text("[]", encoding="utf-8")
    assert load_registry(str(lst)) == {}


def test_registry_cache_reloads_when_file_changes(tmp_path):
    path = tmp_path / "reg.json"
    cache = RegistryCache(str(path))
    assert cache.get() == {}
    path.write_text(json.dumps({"epic:a": {"appid": 1}}), encoding="utf-8")
    assert store_for_appid(cache.get(), 1) == "Epic"
    path.write_text(json.dumps({"gog:a": {"appid": 1}}), encoding="utf-8")
    later = time.time() + 5
    os.utime(path, (later, later))
    assert store_for_appid(cache.get(), 1) == "GOG"


def test_key_for_appid_returns_store_key_and_game_id():
    from gameglance.store_lookup import key_for_appid

    registry = {
        "epic:abc": {"appid": 1},
        "gog:1450711444": {"appid": SIGNED},
        "bad": {"appid": 5},
        "gog:": {"appid": 6},
    }
    assert key_for_appid(registry, APPID) == {"store": "gog", "id": "1450711444"}
    assert key_for_appid(registry, 1) == {"store": "epic", "id": "abc"}
    assert key_for_appid(registry, 5) is None
    assert key_for_appid(registry, 6) is None
    assert key_for_appid(registry, 99) is None
    assert key_for_appid(registry, "x") is None  # type: ignore[arg-type]


def test_key_for_appid_keeps_colons_in_the_game_id():
    from gameglance.store_lookup import key_for_appid

    assert key_for_appid({"epic:a:b": {"appid": 7}}, 7) == {"store": "epic", "id": "a:b"}
