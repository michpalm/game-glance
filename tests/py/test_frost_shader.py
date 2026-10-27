from copy import deepcopy
from pathlib import Path

import pytest

from gameglance.frost.contracts import validate_frame
from gameglance.frost.shader import build_shader, stage_shader


def frame(width=1920, height=1080, fit="fit"):
    return {"generation": 1, "context": {"viewportId": "v1", "background": "game", "outputWidth": width,
            "outputHeight": height, "dpr": 1, "fit": fit, "colorMode": "sdr"},
            "regions": {name: {"x": .35, "y": y, "width": w, "height": h, "radiusX": .01, "radiusY": .01}
                        for name, y, w, h in [("bar", .12, .60, .08), ("panel", .23, .60, .65), ("notifications", .04, .05, .04)]}}


@pytest.mark.parametrize("mutation", [
    lambda f: f.update(path="evil.fx"),
    lambda f: f["context"].update(source="code"),
    lambda f: f["regions"]["bar"].update(width=float("nan")),
    lambda f: f["regions"]["bar"].update(width=2),
    lambda f: f["regions"].pop("notifications"),
    lambda f: f.update(generation=True),
    lambda f: f["context"].update(outputWidth=20000),
])
def test_rejects_invalid_and_untrusted_input(mutation):
    f = frame()
    mutation(f)
    with pytest.raises(ValueError):
        validate_frame(f)


def test_validated_copy_does_not_share_request_state():
    f = frame()
    result = validate_frame(f)
    f["regions"]["bar"]["width"] = .9
    assert result["regions"]["bar"]["width"] == .6


def test_only_allocation_and_context_changes_rebuild_shader():
    f = frame()
    original = build_shader(f)
    f["generation"] = 2
    f["context"]["viewportId"] = "new"
    f["regions"]["bar"].update(x=.34, radiusX=.02)
    assert build_shader(f) == original
    f["regions"]["bar"]["width"] = .5
    assert build_shader(f)[1] != original[1]
    assert build_shader(frame(fit="fill"))[1] != original[1]


def test_stages_verified_owned_content_without_overwrite(tmp_path):
    source, key = build_shader(frame())
    relative = stage_shader(str(tmp_path), source, key)
    path = tmp_path / ".local/share/gamescope/reshade/Shaders" / relative
    assert path.read_text() == source
    assert stage_shader(str(tmp_path), source, key) == relative
    path.write_text("foreign")
    with pytest.raises(ValueError):
        stage_shader(str(tmp_path), source, key)
    assert path.read_text() == "foreign"


def test_staging_rejects_symlink_and_mismatched_content(tmp_path):
    source, key = build_shader(frame())
    relative = stage_shader(str(tmp_path), source, key)
    path = tmp_path / ".local/share/gamescope/reshade/Shaders" / relative
    path.unlink()
    foreign = tmp_path / "foreign"
    foreign.write_text(source)
    path.symlink_to(foreign)
    with pytest.raises(ValueError):
        stage_shader(str(tmp_path), source, key)
    with pytest.raises(ValueError):
        stage_shader(str(tmp_path), "wrong content", key)


def test_hdr_is_explicitly_unavailable_until_native_color_mapping_is_verified():
    f = frame()
    f["context"]["colorMode"] = "hdr"
    with pytest.raises(ValueError, match="unsupported"):
        build_shader(f)
