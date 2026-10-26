import sqlite3

from gameglance.lutris import LutrisLibrary, lutris_db_paths


def make_db(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE games (id INTEGER, slug TEXT, playtime REAL, lastplayed INTEGER)")
    con.executemany("INSERT INTO games VALUES (?, ?, ?, ?)", rows)
    con.commit()
    con.close()


def test_reads_hours_and_last_played(tmp_path):
    db = tmp_path / "pga.db"
    make_db(db, [(1, "gg", 12.5, 1792588711)])
    lib = LutrisLibrary(lambda flatpak: [str(db)])
    assert lib.playtime(1, True) == {"hours": 12.5, "lastplayed": 1792588711}


def test_the_shortcuts_install_decides_the_database(tmp_path):
    flat, native = tmp_path / "flat.db", tmp_path / "native.db"
    make_db(flat, [(1, "gg", 1.0, 100)])
    make_db(native, [(1, "gg", 9.0, 200)])
    lib = LutrisLibrary(lambda flatpak: [str(flat)] if flatpak else [str(native)])
    assert lib.playtime(1, True)["hours"] == 1.0
    assert lib.playtime(1, False)["hours"] == 9.0


def test_unknown_game_or_missing_database_is_none(tmp_path):
    db = tmp_path / "pga.db"
    make_db(db, [(1, "gg", 1.0, 100)])
    assert LutrisLibrary(lambda flatpak: [str(db)]).playtime(99, True) is None
    assert LutrisLibrary(lambda flatpak: [str(tmp_path / "missing.db")]).playtime(1, True) is None


def test_an_unreadable_database_is_none(tmp_path):
    junk = tmp_path / "pga.db"
    junk.write_bytes(b"this is not a sqlite database" * 100)
    assert LutrisLibrary(lambda flatpak: [str(junk)]).playtime(1, True) is None


def test_null_or_negative_playtime_reads_as_zero_hours_and_null_last_played(tmp_path):
    db = tmp_path / "pga.db"
    make_db(db, [(2, "x", None, None), (3, "y", -4.0, -1)])
    lib = LutrisLibrary(lambda flatpak: [str(db)])
    assert lib.playtime(2, True) == {"hours": 0.0, "lastplayed": None}
    assert lib.playtime(3, True) == {"hours": 0.0, "lastplayed": None}


def test_paths():
    assert lutris_db_paths("/h", True) == ["/h/.var/app/net.lutris.Lutris/data/lutris/pga.db"]
    assert lutris_db_paths("/h", False) == ["/h/.local/share/lutris/pga.db"]
