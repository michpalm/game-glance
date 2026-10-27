#include "effect_preprocessor.hpp"
#include "effect_parser.hpp"
#include "effect_codegen.hpp"
#include <iostream>
#include <memory>
#include <string>

int main(int argc, char **argv) {
    if (argc != 4) return 64;
    const int width = std::stoi(argv[2]), height = std::stoi(argv[3]);
    if (width <= 0 || height <= 0 || width > 16384 || height > 16384) return 64;
    reshadefx::preprocessor pp;
    pp.add_macro_definition("BUFFER_WIDTH", std::to_string(width));
    pp.add_macro_definition("BUFFER_HEIGHT", std::to_string(height));
    pp.add_macro_definition("BUFFER_RCP_WIDTH", "(1.0/" + std::to_string(width) + ")");
    pp.add_macro_definition("BUFFER_RCP_HEIGHT", "(1.0/" + std::to_string(height) + ")");
    pp.add_macro_definition("__RENDERER__", "131072");
    pp.add_macro_definition("GAMESCOPE", "1");
    if (!pp.append_file(argv[1]) || !pp.errors().empty()) { std::cerr << pp.errors(); return 1; }
    std::unique_ptr<reshadefx::codegen> codegen(reshadefx::create_codegen_spirv(true, true, false, false));
    reshadefx::parser parser;
    parser.parse(pp.output(), codegen.get());
    if (!parser.errors().empty()) { std::cerr << parser.errors(); return 1; }
    reshadefx::module module;
    codegen->write_result(module);
    std::cout << "uniform_bytes=" << module.total_uniform_size << " uniforms=" << module.uniforms.size() << "\n";
    for (const auto &texture : module.textures)
        std::cout << "texture " << texture.name << " " << texture.width << "x" << texture.height << "\n";
    for (const auto &technique : module.techniques)
        std::cout << "technique " << technique.name << " passes=" << technique.passes.size() << "\n";
    if (module.total_uniform_size == 0) { std::cerr << "Rejected zero-sized Gamescope UBO\n"; return 2; }
    return 0;
}
