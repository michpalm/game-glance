#!/usr/bin/env bash
# Usage: bash scripts/frost-check/build.sh /absolute/scratch/directory
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:?Supply a scratch directory}"
RESHADER="696b14cd6006ae9ca174e6164450619ace043283"
HEADERS="d790ced752b5bfc06b6988baadef6eb2d16bdf96"
mkdir -p "$DEST"
for NAME in effect_codegen.hpp effect_codegen_spirv.cpp effect_expression.cpp effect_expression.hpp effect_lexer.cpp effect_lexer.hpp effect_module.hpp effect_parser.hpp effect_parser_exp.cpp effect_parser_stmt.cpp effect_preprocessor.cpp effect_preprocessor.hpp effect_symbol_table.cpp effect_symbol_table.hpp effect_symbol_table_intrinsics.inl effect_token.hpp; do
    curl --fail --silent --show-error --location "https://raw.githubusercontent.com/Joshua-Ashton/reshade/$RESHADER/source/$NAME" -o "$DEST/$NAME"
done
for NAME in spirv.hpp GLSL.std.450.h; do
    curl --fail --silent --show-error --location "https://raw.githubusercontent.com/KhronosGroup/SPIRV-Headers/$HEADERS/include/spirv/unified1/$NAME" -o "$DEST/$NAME"
done
if [[ "$(uname -s)" == Darwin ]]; then
    cat > "$DEST/malloc.h" <<'EOF'
#include <malloc/malloc.h>
#define _msize malloc_size
EOF
fi
c++ -std=c++20 -O2 -I "$DEST" "$ROOT/check.cpp" "$DEST"/effect_*.cpp -o "$DEST/check"
"$DEST/check" 2>/dev/null || [[ "$?" == 64 ]]
