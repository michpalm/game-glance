"""Generate only our trusted template, then stage verified immutable contents."""
import hashlib
import math
import os
import re
import tempfile
from pathlib import Path

from .contracts import REGIONS, validate_frame


# The visual design language gives every glass surface one CSS backdrop blur.
# CSS blur(r) is a Gaussian with sigma = r CSS px, so on screen it is r * dpr.
GLASS_BLUR_CSS_PX = 16
# Tiles are blurred at 1/8 resolution after an exact 8x8 box average.
DOWNSAMPLE = 8
# The status bar's width follows its content (battery, controllers, a download, the clock), which fills in as a fresh
# opening starts. Its tile is sized to this share of the screen, wider than the full pill, so content never rebuilds
# the shader. Same value as STATUS_TILE_WIDTH in src/menu/frost/controller.ts.
STATUS_TILE_WIDTH = .4
# The floating menu keyboard's panel, in CSS px (409 x 210, its size in the menu's own units). Its tile is this fixed
# size times the display scale (dpr) only, not times the menu scale, and not from its rectangle, so opening, closing or
# moving the keyboard never rebuilds the shader. Same value as KEYBOARD_TILE_CSS in src/menu/frost/controller.ts.
KEYBOARD_TILE_CSS = {"width": 409, "height": 210}
RADIAL_TILE_CSS = {"width": 280, "height": 280}


def frost_geometry(frame: dict) -> dict:
    c = frame["context"]
    sigma = GLASS_BLUR_CSS_PX * c["dpr"]
    # Three sigma of real game pixels around each region keeps its edges clean.
    pad = math.ceil(3 * sigma)
    def span(name):
        r = frame["regions"][name]
        if name == "keyboard":
            return KEYBOARD_TILE_CSS["width"] * c["dpr"], KEYBOARD_TILE_CSS["height"] * c["dpr"]
        if name in ("keyboard-left", "keyboard-right"):
            return RADIAL_TILE_CSS["width"] * c["dpr"], RADIAL_TILE_CSS["height"] * c["dpr"]
        width = max(r["width"], STATUS_TILE_WIDTH) if name == "status" else r["width"]
        return width * c["outputWidth"], r["height"] * c["outputHeight"]
    tiles = {name: tuple(math.ceil((size + 2 * pad) / DOWNSAMPLE) for size in span(name)) for name in REGIONS}
    return {"sigma": sigma, "pad": pad, "tiles": tiles}


def blur_taps(sigma: float) -> tuple[list[float], list[float]]:
    """Gaussian out to 3 sigma, folded into bilinear taps: the centre plus one side."""
    radius = max(1, math.ceil(3 * sigma))
    discrete = [math.exp(-k * k / (2 * sigma * sigma)) for k in range(radius + 1)]
    total = discrete[0] + 2 * sum(discrete[1:])
    discrete = [w / total for w in discrete]
    offsets, weights = [0.0], [discrete[0]]
    for k in range(1, radius + 1, 2):
        w1, w2 = discrete[k], discrete[k + 1] if k + 1 <= radius else 0.0
        offsets.append((k * w1 + (k + 1) * w2) / (w1 + w2))
        weights.append(w1 + w2)
    return offsets, weights


def _blur_body(sigma: float) -> str:
    offsets, weights = blur_taps(sigma)
    lines = [f"    float4 c = tex2D(image, uv) * {weights[0]:.10f};"]
    for o, w in zip(offsets[1:], weights[1:]):
        lines.append(f"    c += (tex2D(image, uv + texel * {o:.10f}) + tex2D(image, uv - texel * {o:.10f})) * {w:.10f};")
    return "\n".join(lines)


def build_shader(frame: dict) -> tuple[str, str]:
    frame = validate_frame(frame)
    c = frame["context"]
    if c["background"] != "game" or c["colorMode"] != "sdr":
        raise ValueError("unsupported color/background mapping")
    source = (Path(__file__).parent / "assets/qam-frost.fx.in").read_text()
    geometry = frost_geometry(frame)
    values = {"OUT_W": str(c["outputWidth"]), "OUT_H": str(c["outputHeight"]), "FIT": str(("fit", "fill", "stretch", "auto").index(c["fit"])), "MAX_SCALE": str(float(c.get("maxScale", 16384))),
              "PAD": str(geometry["pad"]), "BLUR_TAPS": _blur_body(geometry["sigma"] / DOWNSAMPLE)}
    # Output-space tiles keep sampling density and visual strength stable when
    # the game renders below the display resolution.
    for name in REGIONS:
        width, height = geometry["tiles"][name]
        values[name.upper().replace("-", "_") + "_W"] = str(width)
        values[name.upper().replace("-", "_") + "_H"] = str(height)
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
