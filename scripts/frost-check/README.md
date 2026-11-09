# Offline QAM shader check

Build with `bash scripts/frost-check/build.sh /absolute/scratch/path`, then run
`python3 scripts/check-frost.py --compiler /absolute/scratch/path/check`.
Build downloads CPU-only compiler sources at the immutable revisions in the script.
Neither the compiler nor downloaded sources ship in the plugin or run on installation.

The harness compiles with Gamescope's pinned ReShade parser/SPIR-V generator and
reflects uniforms, texture allocations and techniques. Zero uniform bytes is a
hard failure: Gamescope's loader creates its uniform buffer unconditionally.
This does not validate Vulkan execution, visual quality, HDR color mapping,
native caching, compositor compatibility or frame pacing.

The compiler is BSD-licensed ReShade source by crosire and contributors; SPIR-V
headers are Khronos MIT-licensed. Their original sources retain their copyright
notices in the scratch directory. This repository contains only the harness.
