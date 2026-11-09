from copy import deepcopy
import struct
from gameglance.frost.contracts import validate_frame
from gameglance.frost.native import pack_uniform
from gameglance.frost.shader import build_shader, frost_geometry
from test_frost_shader import frame, CLOSED


def radial_frame():
    f = frame()
    f['regions']['keyboard-left'] = dict(CLOSED)
    f['regions']['keyboard-right'] = dict(CLOSED)
    return f


def test_separate_radial_masks_keep_fixed_shader_and_allocation():
    f = radial_frame()
    old = build_shader(f)
    tiles = frost_geometry(f)['tiles']
    f['regions']['keyboard-left'] = dict(x=.01, y=.6, width=.15, height=.3, radiusX=.075, radiusY=.15)
    f['regions']['keyboard-right'] = dict(x=.84, y=.6, width=.15, height=.3, radiusX=.075, radiusY=.15)
    assert build_shader(f) == old
    assert frost_geometry(f)['tiles'] == tiles
    assert validate_frame(f)['regions']['keyboard-left']['radiusX'] == .075
    source = old[0]
    for name in ('KeyboardLeft', 'KeyboardRight'):
        assert 'uniform float4 ' + name in source
        assert 'pass ' + name + 'Y' in source
        assert name + '.z <= 0' in source
        assert pack_uniform(name, [0, 0, 0, 0]) == struct.pack('<4f', 0, 0, 0, 0)
        assert len(pack_uniform(name + 'Radius', [.075, .15])) == 8
