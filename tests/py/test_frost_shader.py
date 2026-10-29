from copy import deepcopy
from pathlib import Path

import pytest

from gameglance.frost.contracts import validate_frame
from gameglance.frost.shader import KEYBOARD_TILE_CSS, STATUS_TILE_WIDTH, build_shader, frost_geometry, stage_shader


# The menu keyboard is usually closed: its area is then an all-zero rectangle.
CLOSED = {"x": 0, "y": 0, "width": 0, "height": 0, "radiusX": 0, "radiusY": 0}


def frame(width=1920, height=1080, fit="fit", keyboard=None):
    regions = {name: {"x": .35, "y": y, "width": w, "height": h, "radiusX": .01, "radiusY": .01}
               for name, y, w, h in [("bar", .12, .60, .08), ("panel", .23, .60, .65), ("notifications", .04, .05, .04), ("status", .01, .20, .03)]}
    regions["keyboard"] = dict(keyboard or CLOSED)
    return {"generation": 1, "context": {"viewportId": "v1", "background": "game", "outputWidth": width,
            "outputHeight": height, "dpr": 1, "fit": fit, "colorMode": "sdr"}, "regions": regions}


@pytest.mark.parametrize("mutation", [
    lambda f: f.update(path="evil.fx"),
    lambda f: f["context"].update(source="code"),
    lambda f: f["regions"]["bar"].update(width=float("nan")),
    lambda f: f["regions"]["bar"].update(width=2),
    lambda f: f["regions"].pop("notifications"),
    lambda f: f["regions"].pop("status"),
    lambda f: f["regions"].pop("keyboard"),
    lambda f: f["regions"]["keyboard"].update(height=.2),
    lambda f: f["regions"]["keyboard"].update(x=.3),
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


def _function(source, name):
    import re
    start = re.search(r"\b" + name + r"\(", source).start()
    depth, index = 0, source.index("{", start)
    for end in range(index, len(source)):
        depth += {"{": 1, "}": -1}.get(source[end], 0)
        if depth == 0:
            return source[start:end + 1]


def test_full_screen_output_reads_the_fade_once_per_vertex_not_per_pixel():
    # On the Ally (2026-10-28) a per-pixel read of the 1x1 fade state in the
    # full-screen pass cost ~20 ms a frame in game; square tiles alone did not.
    source, _ = build_shader(_with_dpr(2.32))
    assert "VertexShader = FadeVS; PixelShader = Composite" in source
    assert "StateAS" in _function(source, "FadeVS") and "tex2Dlod" in _function(source, "FadeVS")
    assert "StateAS" not in _function(source, "Composite")


def test_frost_calms_bright_game_areas_so_menu_text_stays_readable():
    # Over a bright sky, 40% glass left small labels near 2.4:1 (Ally, 2026-10-28).
    # Above the knee, brightness rises at a third of the rate; hue is kept.
    source, _ = build_shader(_with_dpr(2.32))
    calm = _function(source, "Calm")
    assert "#define CalmKnee 0.45" in source and "#define CalmSlope 0.35" in source
    assert "dot(c.rgb" in calm and "c.rgb *=" in calm
    composite = _function(source, "Composite")
    for tile in ("BarVS", "PanelVS", "NotificationsVS"):
        assert f"Calm(tex2D({tile}" in composite


def test_rounded_masks_skip_pixels_outside_their_region():
    source, _ = build_shader(_with_dpr(2.32))
    mask = _function(source, "Mask")
    # The cheap bounds test comes before the rounded-corner distance.
    assert "any(position > halfSize" in mask and mask.index("any(position > halfSize") < mask.index("length(")


# Gamescope 3.16.30.1 creates ReShade textures through VulkanFormatToDRM()
# (rendervulkan.cpp s_DRMVKFormatTable). A format without a DRM entry becomes
# VK_FORMAT_UNDEFINED and aborts the compositor (CVulkanTexture::BInit assert).
GAMESCOPE_TEXTURE_FORMATS = {"R8", "R16F", "R32F", "RG8", "RG16", "RGBA8", "RGBA16", "RGBA16F", "RGBA32F", "RGB10A2"}


def test_every_texture_format_is_one_gamescope_can_create():
    import re
    source, _ = build_shader(_with_dpr(2.32))
    formats = set(re.findall(r"Format = (\w+);", source))
    assert formats and formats <= GAMESCOPE_TEXTURE_FORMATS, formats - GAMESCOPE_TEXTURE_FORMATS


def test_status_bar_gets_its_own_frost_area_like_the_others():
    source, _ = build_shader(frame())
    for part in ("uniform float4 Status", "uniform float2 StatusRadius", "texture2D StatusV", "pass StatusY",
                 "Mask(outUV, Status, StatusRadius)", "Calm(tex2D(StatusVS, TileUV(outUV, Status)))"):
        assert part in source
    # The fade starts when any area, the status bar included, becomes visible.
    assert "Status.z <= 0" in source


def test_status_bar_content_changing_its_width_does_not_rebuild_the_shader():
    # Its width follows its content, which fills in as a fresh opening starts (Ally, 2026-10-29: .13 then .26).
    narrow, wide = frame(), frame()
    narrow["regions"]["status"]["width"] = .1316
    wide["regions"]["status"]["width"] = .2618
    assert build_shader(narrow)[1] == build_shader(wide)[1]
    wider = frame()
    wider["regions"]["status"].update(x=.5, width=STATUS_TILE_WIDTH + .05)
    assert build_shader(wider)[1] != build_shader(wide)[1]


def test_status_blur_keeps_its_strength_in_a_tile_wider_than_the_pill():
    # The capped tile is wider than the pill: blur steps follow the pill's own span on screen, not the tile's texels.
    source, _ = build_shader(frame())
    assert "8.0 / ((Status.z + 2.0 * Pad.x) * OutputSize.x)" in _function(source, "StatusHorizontal")
    assert "8.0 / ((Status.w + 2.0 * Pad.y) * OutputSize.y)" in _function(source, "StatusVertical")


# The floating menu keyboard (Social chat) is a fifth frost area. It is usually closed, and it opens and moves while
# the menu is open: that must stay an update of the live effect, never a new shader.
OPEN = {"x": .55, "y": .55, "width": .32, "height": .3, "radiusX": .01, "radiusY": .02}


def test_a_closed_keyboard_is_an_all_zero_area_and_only_the_keyboard_may_be_all_zero():
    assert validate_frame(frame())["regions"]["keyboard"] == CLOSED
    assert validate_frame(frame(keyboard=OPEN))["regions"]["keyboard"] == OPEN


@pytest.mark.parametrize("region", ["bar", "panel", "notifications", "status"])
def test_every_other_area_must_be_present(region):
    f = frame()
    f["regions"][region] = dict(CLOSED)
    with pytest.raises(ValueError):
        validate_frame(f)


def test_opening_or_moving_the_keyboard_keeps_its_tile_and_the_shader():
    small = dict(OPEN, width=.05, height=.04)
    moved = dict(OPEN, x=.1, y=.2)
    tiles = [frost_geometry(validate_frame(frame(keyboard=k)))["tiles"]["keyboard"] for k in (None, small, OPEN, moved)]
    assert len(set(tiles)) == 1
    keys = {build_shader(frame(keyboard=k))[1] for k in (None, small, OPEN, moved)}
    assert len(keys) == 1


def test_keyboard_tile_is_sized_from_the_fixed_panel_at_the_display_scale():
    f = _with_dpr(2)
    geometry = frost_geometry(validate_frame(f))
    pad = geometry["pad"]
    assert geometry["tiles"]["keyboard"] == (-(-(KEYBOARD_TILE_CSS["width"] * 2 + 2 * pad) // 8), -(-(KEYBOARD_TILE_CSS["height"] * 2 + 2 * pad) // 8))
    assert KEYBOARD_TILE_CSS == {"width": 409, "height": 210}


def test_keyboard_gets_its_own_frost_area_like_the_others():
    source, _ = build_shader(frame(keyboard=OPEN))
    for part in ("uniform float4 Keyboard", "uniform float2 KeyboardRadius", "texture2D KeyboardD", "texture2D KeyboardH",
                 "texture2D KeyboardV", "sampler2D KeyboardVS", "pass KeyboardDown", "pass KeyboardX", "pass KeyboardY",
                 "Mask(outUV, Keyboard, KeyboardRadius)", "Calm(tex2D(KeyboardVS, TileUV(outUV, Keyboard)))"):
        assert part in source
    assert "Keyboard.z <= 0" in _function(source, "Track")
    # Its passes run after the status passes and before the output.
    assert source.index("pass StatusY") < source.index("pass KeyboardDown") < source.index("pass Output")


def test_keyboard_blur_keeps_its_strength_in_a_tile_sized_from_the_panel():
    source, _ = build_shader(frame())
    assert "8.0 / ((Keyboard.z + 2.0 * Pad.x) * OutputSize.x)" in _function(source, "KeyboardHorizontal")
    assert "8.0 / ((Keyboard.w + 2.0 * Pad.y) * OutputSize.y)" in _function(source, "KeyboardVertical")
