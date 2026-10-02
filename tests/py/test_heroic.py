import json

from gameglance.heroic import HeroicLibrary, heroic_cache_dirs


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def gog_entry(app_name, description="", short=""):
    return {"app_name": app_name, "title": "T", "runner": "gog", "extra": {"about": {"description": description, "shortDescription": short}}}


def test_reads_gog_description_by_app_name(tmp_path):
    write(tmp_path / "gog_library.json", {"games": [gog_entry("1"), gog_entry("2067731250", "Take up your sword.")]})
    assert HeroicLibrary([str(tmp_path)]).description("gog", "2067731250") == "Take up your sword."


def test_prefers_short_description_when_present(tmp_path):
    write(tmp_path / "gog_library.json", {"games": [gog_entry("7", "Long text.", "Short text.")]})
    assert HeroicLibrary([str(tmp_path)]).description("gog", "7") == "Short text."


def test_reads_epic_and_amazon_library_lists(tmp_path):
    write(tmp_path / "legendary_library.json", {"library": [gog_entry("Quail", "Epic text.")]})
    write(tmp_path / "nile_library.json", {"library": [gog_entry("amzn1.x", "Amazon text.")]})
    lib = HeroicLibrary([str(tmp_path)])
    assert lib.description("legendary", "Quail") == "Epic text."
    assert lib.description("nile", "amzn1.x") == "Amazon text."


def test_unknown_game_runner_or_missing_text_gives_none(tmp_path):
    write(tmp_path / "gog_library.json", {"games": [gog_entry("1"), {"app_name": "2", "extra": None}, "junk"]})
    lib = HeroicLibrary([str(tmp_path)])
    assert lib.description("gog", "1") is None
    assert lib.description("gog", "2") is None
    assert lib.description("gog", "404") is None
    assert lib.description("sideload", "1") is None
    assert lib.description("../../etc", "1") is None


def test_missing_or_corrupt_files_give_none(tmp_path):
    (tmp_path / "gog_library.json").write_text("{not json", encoding="utf-8")
    assert HeroicLibrary([str(tmp_path)]).description("gog", "1") is None
    assert HeroicLibrary([str(tmp_path / "nope")]).description("gog", "1") is None


def test_checks_every_install_location(tmp_path):
    flatpak, native = tmp_path / "flatpak", tmp_path / "native"
    write(native / "gog_library.json", {"games": [gog_entry("9", "Native text.")]})
    assert HeroicLibrary([str(flatpak), str(native)]).description("gog", "9") == "Native text."


def test_install_locations_cover_flatpak_and_native():
    dirs = heroic_cache_dirs("/home/u")
    assert "/home/u/.var/app/com.heroicgameslauncher.hgl/config/heroic/store_cache" in dirs
    assert "/home/u/.config/heroic/store_cache" in dirs
