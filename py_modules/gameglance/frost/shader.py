"""Generate only our trusted template, then stage verified immutable contents."""
import hashlib
import math
import os
import re
import tempfile
from pathlib import Path

from .contracts import REGIONS, validate_frame


def build_shader(frame: dict) -> tuple[str, str]:
    frame = validate_frame(frame)
    c = frame["context"]
    if c["background"] != "game" or c["colorMode"] != "sdr":
        raise ValueError("unsupported color/background mapping")
    source = (Path(__file__).parent / "assets/qam-frost.fx.in").read_text()
    values = {"OUT_W": str(c["outputWidth"]), "OUT_H": str(c["outputHeight"]), "FIT": str(("fit", "fill", "stretch").index(c["fit"]))}
    # Output-space quarter-resolution tiles keep sampling density and visual
    # strength stable when the game renders below the display resolution.
    for name in REGIONS:
        r = frame["regions"][name]
        values[name.upper() + "_W"] = str(math.ceil((r["width"] * c["outputWidth"] + 48) / 4))
        values[name.upper() + "_H"] = str(math.ceil((r["height"] * c["outputHeight"] + 48) / 4))
    for name, value in values.items():
        source = source.replace("@" + name + "@", value)
    if "@" in source:
        raise ValueError("unexpanded shader template")
    return source, hashlib.sha256(source.encode()).hexdigest()


def stage_shader(home: str, source: str, key: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{64}", key) or hashlib.sha256(source.encode()).hexdigest() != key:
        raise ValueError("shader content mismatch")
    directory = Path(home) / ".local/share/gamescope/reshade/Shaders"
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / ("game-glance-qam-v1-" + key + ".fx")
    if target.is_symlink():
        raise ValueError("unowned shader symlink")
    if target.exists():
        if not target.is_file() or target.read_text() != source:
            raise ValueError("unowned shader collision")
        return target.name
    fd, temporary = tempfile.mkstemp(prefix=".gg-qam-", dir=directory)
    try:
        with os.fdopen(fd, "w") as out:
            out.write(source)
            out.flush()
            os.fsync(out.fileno())
        # link() atomically installs a complete file and refuses replacement.
        # rename/replace would silently overwrite a racing foreign writer.
        try:
            os.link(temporary, target)
        except FileExistsError:
            if target.is_symlink() or target.read_text() != source:
                raise ValueError("unowned shader collision") from None
    finally:
        os.unlink(temporary)
    if target.is_symlink() or target.read_text() != source:
        raise ValueError("shader verification failed")
    return target.name
