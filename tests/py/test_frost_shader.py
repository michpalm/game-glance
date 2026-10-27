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


def test_auto_mapping_requires_verified_cap_and_changes_shader_when_cap_changes():
    f = frame(fit="auto")
    with pytest.raises(ValueError):
        validate_frame(f)
    f["context"]["maxScale"] = 2
    source, key = build_shader(f)
    assert "@" not in source
    f["context"]["maxScale"] = 1
    assert build_shader(f)[1] != key


def _with_dpr(dpr):
    f = frame()
    f["context"]["dpr"] = dpr
    return f


def test_blur_matches_the_vdl_glass_blur_at_the_menu_scale():
    from gameglance.frost.shader import GLASS_BLUR_CSS_PX, blur_taps, frost_geometry
    assert GLASS_BLUR_CSS_PX == 16
    geometry = frost_geometry(_with_dpr(2.32))
    assert geometry["sigma"] == pytest.approx(16 * 2.32)
    # The blur reaches 3 sigma past each region, so edges sample real game pixels.
    assert geometry["pad"] == 112
    assert geometry["tiles"]["panel"] == (-(-(int(.60 * 1920) + 2 * 112) // 8), -(-(int(.65 * 1080) + 2 * 112) // 8))
    offsets, weights = blur_taps(geometry["sigma"] / 8)
    # Centre tap plus one side; the shader mirrors each side tap.
    assert weights[0] + 2 * sum(weights[1:]) == pytest.approx(1)
    assert offsets[0] == 0 and offsets == sorted(offsets)
    variance = 2 * sum(w * o * o for o, w in zip(offsets[1:], weights[1:]))
    assert variance == pytest.approx((geometry["sigma"] / 8) ** 2, rel=.08)


def test_blur_strength_and_padding_follow_the_display_scale():
    from gameglance.frost.shader import frost_geometry
    small, large = frost_geometry(_with_dpr(1)), frost_geometry(_with_dpr(2.32))
    assert small["sigma"] == pytest.approx(16) and small["pad"] == 48
    assert large["tiles"]["bar"][0] > small["tiles"]["bar"][0]
    assert build_shader(_with_dpr(1))[1] != build_shader(_with_dpr(2.32))[1]


def test_shader_downsamples_every_pixel_and_fades_in_from_the_first_visible_frame():
    source, _ = build_shader(_with_dpr(2.32))
    assert 'source = "timer"' in source
    assert "#define FadeMs 150.0" in source
    # Persistent 1x1 state, copied then updated each frame, remembers when masks appeared.
    assert source.count("Format = RGBA32F") == 2
    assert source.index("pass Remember") < source.index("pass Track") < source.index("pass Output")
    # An 8x8 box: 16 bilinear taps per low-resolution pixel.
    assert source.count("Box(") >= 3
    assert "@" not in source


# Gamescope 3.16.30.1 creates ReShade textures through VulkanFormatToDRM()
# (rendervulkan.cpp s_DRMVKFormatTable). A format without a DRM entry becomes
# VK_FORMAT_UNDEFINED and aborts the compositor (CVulkanTexture::BInit assert).
GAMESCOPE_TEXTURE_FORMATS = {"R8", "R16F", "R32F", "RG8", "RG16", "RGBA8", "RGBA16", "RGBA16F", "RGBA32F", "RGB10A2"}


def test_every_texture_format_is_one_gamescope_can_create():
    import re
    source, _ = build_shader(_with_dpr(2.32))
    formats = set(re.findall(r"Format = (\w+);", source))
    assert formats and formats <= GAMESCOPE_TEXTURE_FORMATS, formats - GAMESCOPE_TEXTURE_FORMATS
