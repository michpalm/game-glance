#!/usr/bin/env python3
"""Offline production-shader matrix; no connection to a compositor."""
import argparse
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "py_modules"))
from gameglance.frost.shader import build_shader


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--compiler", required=True)
    compiler = args.parse_args().compiler
    count = 0
    with tempfile.TemporaryDirectory(prefix="gg-frost-check-") as scratch:
        path = Path(scratch) / "production.fx"
        # A syntactically valid shader with no uniforms must fail reflection,
        # even though the parser can successfully produce its SPIR-V.
        path.write_text("void VS(uint id:SV_VertexID,out float4 p:SV_Position){p=float4(0,0,0,1);}\n"
                        "float4 PS(float4 p:SV_Position):SV_Target{return float4(0,0,0,1);}\n"
                        "technique NoUniforms {pass {VertexShader=VS;PixelShader=PS;}}\n")
        negative = subprocess.run([compiler, str(path), "1920", "1080"], capture_output=True, text=True)
        assert negative.returncode == 2 and "uniform_bytes=0" in negative.stdout, negative.stdout + negative.stderr
        for width, height in [(1280, 800), (1920, 1080), (1920, 1200)]:
            for fit in ("fit", "fill", "stretch"):
                frame = {"generation": 1, "context": {"viewportId": "offline", "background": "game", "outputWidth": width, "outputHeight": height, "dpr": 1.25, "fit": fit, "colorMode": "sdr"},
                         "regions": {name: {"x": .35, "y": y, "width": w, "height": h, "radiusX": .01, "radiusY": .01} for name, y, w, h in [("bar", .12, .6, .08), ("panel", .23, .6, .65), ("notifications", .04, .05, .04)]}}
                path.write_text(build_shader(frame)[0])
                for input_width, input_height in [(width, height), (1280, 720), (800, 600)]:
                    result = subprocess.run([compiler, str(path), str(input_width), str(input_height)], capture_output=True, text=True, check=True)
                    assert int(re.search(r"uniform_bytes=(\d+)", result.stdout)[1]) > 0, result.stdout
                    assert re.findall(r"technique (\w+) passes=(\d+)", result.stdout) == [("QAMFrost", "7")], result.stdout
                    crops = [(name, int(w), int(h)) for name, w, h in re.findall(r"texture (\w+) (\d+)x(\d+)", result.stdout) if name != "Scene"]
                    assert len(crops) == 6, result.stdout
                    for name, w, h in crops:
                        region = frame["regions"][name[:-1].lower()]
                        assert w == math.ceil((region["width"] * width + 48) / 4), result.stdout
                        assert h == math.ceil((region["height"] * height + 48) / 4), result.stdout
                    count += 1
    print(f"PASS: {count} SDR shader contexts; positive UBO, 6 bounded targets, 1 technique, 7 passes. HDR unavailable pending native validation.")


if __name__ == "__main__":
    main()
