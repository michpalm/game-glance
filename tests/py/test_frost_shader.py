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
    regions["keyboard-left"] = dict(CLOSED)
    regions["keyboard-right"] = dict(CLOSED)
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


def test_an_hdr_display_builds_the_same_shader_as_an_sdr_one():
    # Gamescope runs the effect on the game's own image, before converting it for the display (2026-11-18): an SDR game
    # on an HDR display hands it SDR pixels. The shader itself tells SDR and HDR images apart (BUFFER_COLOR_SPACE).
    hdr = frame()
    hdr["context"]["colorMode"] = "hdr"
    assert build_shader(hdr) == build_shader(frame())


import re as _re


def _source():
    return build_shader(frame())[0]


def _function(source, name):
    start = source.index(name + "(")
    depth, i = 0, source.index("{", start)
    for j in range(i, len(source)):
        depth += {"{": 1, "}": -1}.get(source[j], 0)
        if depth == 0:
            return source[start:j + 1]


def _defines(source):
    return {m.group(1): float(m.group(2)) for m in _re.finditer(r"#define (\w+) \(?(-?[\d.]+)\)?\s*$", source, _re.M)}


def test_an_unknown_game_colour_space_passes_through_untouched():
    composite = _function(_source(), "float4 Composite")
    guard = composite.index("#if defined(BUFFER_COLOR_SPACE) && BUFFER_COLOR_SPACE != 1 && BUFFER_COLOR_SPACE != 2 && BUFFER_COLOR_SPACE != 3")
    assert composite.index("return tex2D(SceneSampler, uv);", guard) < composite.index("#else", guard)


def test_scrgb_and_pq_game_images_are_hdr_and_others_are_sdr():
    source = _source()
    assert "#if defined(BUFFER_COLOR_SPACE) && (BUFFER_COLOR_SPACE == 2 || BUFFER_COLOR_SPACE == 3)\n#define HDR_IMAGE 1" in source


def test_every_blur_reads_the_game_through_tosdr():
    source = _source()
    for name in ("float4 Box", "float4 Box4"):
        body = _function(source, name)
        assert body.count("tex2D(SceneSampler") == body.count("ToSdr(tex2D(SceneSampler") > 0


def test_every_frosted_area_and_the_dim_go_back_through_fromsdr():
    composite = _function(_source(), "float4 Composite")
    assert composite.count("Calm(") == composite.count("FromSdr(Calm(") == 7
    assert "FromSdr(tex2D(DimVS, outUV))" in composite or "DIM_BLUR" not in composite
    assert "FromSdr(float4(DimColor, 1.0)).rgb" in composite


def test_sdr_images_convert_nothing():
    source = _source()
    for name in ("float4 ToSdr", "float4 FromSdr"):
        body = _function(source, name)
        assert "#if HDR_IMAGE" in body and "#else\n    return c;\n#endif" in body


def test_the_reference_white_and_scrgb_scale():
    d = _defines(_source())
    assert d["RefWhiteNits"] == 203.0 and d["ScRgbNits"] == 80.0


def test_the_pq_curve_round_trips_and_matches_st2084():
    d = _defines(_source())
    m1, m2, c1, c2, c3 = (d[k] for k in ("PqM1", "PqM2", "PqC1", "PqC2", "PqC3"))
    assert (m1, m2, c1, c2, c3) == (0.1593017578125, 78.84375, 0.8359375, 18.8515625, 18.6875)
    def to_nits(e):
        p = e ** (1 / m2)
        return 10000 * (max(p - c1, 0) / (c2 - c3 * p)) ** (1 / m1)
    def to_pq(nits):
        y = (nits / 10000) ** m1
        return ((c1 + c2 * y) / (1 + c3 * y)) ** m2
    for nits in (0.01, 1, 80, 203, 1000, 4000, 10000):
        assert abs(to_nits(to_pq(nits)) - nits) / nits < 1e-6
    assert abs(to_pq(203) - 0.58) < 0.01  # BT.2408 reference white sits at ~58% PQ


def test_the_bt2020_and_rec709_matrices_are_inverses():
    source = _source()
    def rows(name):
        body = _function(source, "float3 " + name)
        return [[float(x) for x in m.group(1).split(",")] for m in _re.finditer(r"dot\(float3\(([^)]*)\), c\)", body)]
    a, b = rows("Bt2020To709"), rows("Bt709To2020")
    assert len(a) == len(b) == 3
    for i in range(3):
        for j in range(3):
            v = sum(a[i][k] * b[k][j] for k in range(3))
            assert abs(v - (1.0 if i == j else 0.0)) < 2e-3
    # White stays white.
    for r in a:
        assert abs(sum(r) - 1) < 2e-3


def test_a_background_other_than_the_game_is_still_unsupported():
    f = frame()
    f["context"]["background"] = "steam"
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


def test_dim_matches_the_context_menus():
    # One dim for both menus (spec 2026-11-12-menu-dim): the shader mirrors MENU_DIM in src/styles/tokens.ts.
    import re
    from gameglance.frost.shader import DIM_ALPHA, DIM_BLUR_CSS_PX, DIM_RGB
    tokens = (Path(__file__).parents[2] / "src/styles/tokens.ts").read_text()
    m = re.search(r"MENU_DIM = \{ rgb: \[(\d+), (\d+), (\d+)\], alpha: ([.\d]+), blur: (\d+) \}", tokens)
    assert m, "MENU_DIM line format changed"
    assert DIM_RGB == tuple(int(v) for v in m.groups()[:3])
    assert DIM_ALPHA == float(m.group(4))
    assert DIM_BLUR_CSS_PX == int(m.group(5))


def test_dim_weight_needs_the_menu_present_not_only_the_fade():
    # With every area empty the state's start time is 0, so the fade alone reads as fully in: the dim would stay over
    # the game after the menu closed. The "present" flag (state .y) is read with the fade, once per vertex.
    source, _ = build_shader(_with_dpr(2.32))
    vs, composite = _function(source, "FadeVS"), _function(source, "Composite")
    assert vs.count("tex2Dlod") == 1 and "present" in vs and "nointerpolation float present" in source
    assert "StateAS" not in composite
    assert "DimAlpha * fade * present" in composite
    assert "#define DimAlpha 0.38" in source


def test_dim_is_applied_after_the_areas():
    composite = _function(build_shader(_with_dpr(2.32))[0], "Composite")
    assert composite.index("DimAlpha * fade * present") > composite.rindex("KeyboardRightVS")


@pytest.mark.parametrize("dpr", [1, 2.32])
def test_full_screen_dim_blur_matches_6px_at_the_display_scale(dpr):
    from gameglance.frost.shader import blur_taps, frost_geometry
    geometry = frost_geometry(_with_dpr(dpr))
    assert geometry["dimSigma"] == pytest.approx(6 * dpr)
    assert geometry["dimTile"] == (-(-1920 // 4), -(-1080 // 4))
    offsets, weights = blur_taps(geometry["dimSigma"] / 4)
    variance = 2 * sum(w * o * o for o, w in zip(offsets[1:], weights[1:]))
    assert variance == pytest.approx((geometry["dimSigma"] / 4) ** 2, rel=.08)


def test_dim_blur_passes_run_before_output_and_sample_in_output_space():
    source, _ = build_shader(_with_dpr(2.32))
    for name in ("DimDown", "DimX", "DimY"):
        assert source.index("pass " + name) < source.index("pass Output")
    # Output-space tile (letterboxed games blur without seams): the down-pass maps through InputUV.
    assert "InputUV" in _function(source, "DimDown")
    for texture in ("DimD", "DimH", "DimV"):
        assert f"texture2D {texture} {{ Width = 480; Height = 270; Format = RGBA16F; }};" in source
    composite = _function(source, "Composite")
    # The blurred screen goes under the areas, the dim over everything.
    assert composite.index("DimVS") < composite.index("BarVS") < composite.index("DimAlpha * fade * present")


def test_dim_blur_off_builds_the_dim_without_the_passes(monkeypatch):
    import gameglance.frost.shader as shader
    on_source, on_key = build_shader(_with_dpr(2.32))
    monkeypatch.setattr(shader, "DIM_BLUR", False)
    off_source, off_key = build_shader(_with_dpr(2.32))
    assert "pass DimDown" not in off_source and "texture2D DimD" not in off_source and "DimVS" not in off_source
    assert "DimAlpha * fade * present" in _function(off_source, "Composite")
    assert off_key != on_key


def test_shader_draws_the_dim_from_the_pinned_constants(monkeypatch):
    # The values the shader renders, not only the Python constants, follow MENU_DIM: change the constants and the
    # rendered defines change with them.
    import gameglance.frost.shader as shader
    source, _ = build_shader(_with_dpr(1))
    assert "#define DimColor (float3(5.0, 7.0, 10.0) / 255.0)" in source and "#define DimAlpha 0.38" in source
    monkeypatch.setattr(shader, "DIM_RGB", (1, 2, 3))
    monkeypatch.setattr(shader, "DIM_ALPHA", .5)
    source, _ = build_shader(_with_dpr(1))
    assert "#define DimColor (float3(1.0, 2.0, 3.0) / 255.0)" in source and "#define DimAlpha 0.5" in source
