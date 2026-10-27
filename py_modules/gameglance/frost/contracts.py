"""Strict JSON boundary: only geometry and presentation context are accepted."""
import copy
import math

REGIONS = ("bar", "panel", "notifications")


def _fields(value, fields):
    if not isinstance(value, dict) or set(value) != set(fields):
        raise ValueError("invalid fields")


def _number(value, minimum, maximum, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("invalid number")
    if not minimum <= value <= maximum or integer and int(value) != value:
        raise ValueError("number out of bounds")


def identifier(value):
    if not isinstance(value, str) or not 1 <= len(value) <= 128 or not all(c.isascii() and (c.isalnum() or c in "-_:.") for c in value):
        raise ValueError("invalid identifier")
    return value


def validate_frame(value: object) -> dict:
    _fields(value, ("generation", "context", "regions"))
    _number(value["generation"], 0, 2**53 - 1, True)
    c = value["context"]
    _fields(c, ("viewportId", "background", "outputWidth", "outputHeight", "dpr", "fit", "colorMode"))
    identifier(c["viewportId"])
    if c["background"] not in ("game", "steam") or c["fit"] not in ("fit", "fill", "stretch") or c["colorMode"] not in ("sdr", "hdr"):
        raise ValueError("unsupported context")
    for key in ("outputWidth", "outputHeight"):
        _number(c[key], 1, 16384, True)
    _number(c["dpr"], .25, 8)
    _fields(value["regions"], REGIONS)
    for r in value["regions"].values():
        _fields(r, ("x", "y", "width", "height", "radiusX", "radiusY"))
        for n in r.values():
            _number(n, 0, 1)
        if r["width"] <= 0 or r["height"] <= 0 or r["x"] + r["width"] > 1.000001 or r["y"] + r["height"] > 1.000001:
            raise ValueError("invalid rectangle")
        if r["radiusX"] > r["width"] / 2 or r["radiusY"] > r["height"] / 2:
            raise ValueError("invalid radius")
    return copy.deepcopy(value)
