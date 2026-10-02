import json

from gameglance.migrate import carry_over, old_data_path


def test_copies_the_old_plugin_data_when_the_new_plugin_has_none(tmp_path):
    old = tmp_path / "ally-game-page" / "data.json"
    new = tmp_path / "game-glance" / "data.json"
    old.parent.mkdir()
    old.write_text(json.dumps({"override:hltb:292030": 10270}), encoding="utf-8")
    assert carry_over(str(old), str(new)) is True
    assert json.loads(new.read_text(encoding="utf-8")) == {"override:hltb:292030": 10270}
    assert old.exists()  # the old file stays, in case the old plugin is reinstalled


def test_never_overwrites_existing_data(tmp_path):
    old, new = tmp_path / "old.json", tmp_path / "new.json"
    old.write_text("{}", encoding="utf-8")
    new.write_text('{"kept": true}', encoding="utf-8")
    assert carry_over(str(old), str(new)) is False
    assert json.loads(new.read_text(encoding="utf-8")) == {"kept": True}


def test_nothing_to_carry_over(tmp_path):
    assert carry_over(str(tmp_path / "missing.json"), str(tmp_path / "new" / "data.json")) is False
    assert not (tmp_path / "new").exists()


def test_old_path_sits_next_to_the_new_settings_folder():
    assert old_data_path("/home/deck/homebrew/settings/game-glance") == "/home/deck/homebrew/settings/ally-game-page/data.json"
