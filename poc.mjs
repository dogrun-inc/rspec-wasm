import fs from "node:fs";
import path from "node:path";
import { DefaultRubyVM } from "@ruby/wasm-wasi/dist/node";

const WORKSPACE_ROOT = process.cwd();

// JS helper to resolve Ruby modules from Node.js filesystem
globalThis.resolveRubyModule = (moduleName) => {
  let cleanName = moduleName.replace(/\\/g, "/");
  
  if (/^\/[a-zA-Z]:/.test(cleanName)) {
    cleanName = cleanName.slice(1);
  }

  const relativeFile = cleanName.endsWith(".rb") ? cleanName : `${cleanName}.rb`;
  const possiblePaths = [];

  // 0. Absolute / Drive-letter path
  if (path.isAbsolute(cleanName) || /^[a-zA-Z]:/.test(cleanName)) {
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
  } else if (cleanName.startsWith("/")) {
    possiblePaths.push(cleanName);
    possiblePaths.push(relativeFile);
    possiblePaths.push(path.join(WORKSPACE_ROOT, cleanName.slice(1)));
    possiblePaths.push(path.join(WORKSPACE_ROOT, relativeFile.slice(1)));
  }

  // 1. Workspace root direct
  possiblePaths.push(path.join(WORKSPACE_ROOT, relativeFile));
  possiblePaths.push(path.join(WORKSPACE_ROOT, cleanName));

  // 2. lib/ directory (e.g., lib/calculator.rb -> require "calculator")
  possiblePaths.push(path.join(WORKSPACE_ROOT, "lib", relativeFile));

  // 3. spec/ directory (e.g., spec/calculator_spec.rb -> require "calculator_spec")
  possiblePaths.push(path.join(WORKSPACE_ROOT, "spec", relativeFile));

  // 4. vendor/gems/*/lib/ directory for RSpec gems
  const gemsDir = path.join(WORKSPACE_ROOT, "vendor", "gems");
  if (fs.existsSync(gemsDir)) {
    const gemFolders = fs.readdirSync(gemsDir);
    for (const folder of gemFolders) {
      possiblePaths.push(path.join(gemsDir, folder, "lib", relativeFile));
    }
  }

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return JSON.stringify({
        file_path: filePath.replace(/\\/g, "/"),
        code: fs.readFileSync(filePath, "utf-8"),
      });
    }
  }

  return null;
};

async function main() {
  const binaryPath = path.join(
    WORKSPACE_ROOT,
    "node_modules/@ruby/3.3-wasm-wasi/dist/ruby+stdlib.wasm"
  );
  const binary = fs.readFileSync(binaryPath);
  const module = await WebAssembly.compile(binary);

  const { vm } = await DefaultRubyVM(module);

  vm.eval(`
    require "js"
    require "json"

    $LOADED_FEATURES_SET ||= {}

    module CustomRequireHook
      def clear_autoload_for(feature_name)
        target = feature_name.sub(/\\.rb$/, "")
        ObjectSpace.each_object(Module) do |mod|
          mod.constants(false).each do |const_name|
            auto_path = mod.autoload?(const_name)
            if auto_path
              auto_clean = auto_path.to_s.sub(/\\.rb$/, "")
              if target.end_with?(auto_clean) || auto_clean.end_with?(target)
                begin
                  mod.send(:remove_const, const_name)
                rescue NameError
                end
              end
            end
          end
        end
      rescue => e
      end

      def load(name, wrap = false)
        feature_name = name.to_s
        res = JS.global.call(:resolveRubyModule, feature_name).to_s
        if !res.empty? && res != "null" && res != "undefined"
          data = JSON.parse(res)
          ruby_code = data["code"]
          file_path = data["file_path"]

          clear_autoload_for(feature_name)
          clear_autoload_for(file_path)

          eval(ruby_code, TOPLEVEL_BINDING, file_path)
          return true
        end

        super(name, wrap)
      rescue LoadError => e
        if !feature_name.end_with?(".rb")
          rb_feature = "#{feature_name}.rb"
          res_rb = JS.global.call(:resolveRubyModule, rb_feature).to_s
          if !res_rb.empty? && res_rb != "null" && res_rb != "undefined"
            data = JSON.parse(res_rb)
            ruby_code = data["code"]
            file_path = data["file_path"]

            clear_autoload_for(feature_name)
            clear_autoload_for(rb_feature)
            clear_autoload_for(file_path)

            eval(ruby_code, TOPLEVEL_BINDING, file_path)
            return true
          end
        end
        raise e
      end

      def require_relative(relative_feature)
        loc = caller_locations(1, 1).first
        base_file = loc.absolute_path || loc.path
        if base_file.nil? || base_file.empty?
          raise LoadError, "cannot infer basepath for require_relative"
        end
        caller_dir = File.dirname(base_file)
        abs_feature = File.expand_path(relative_feature.to_s, caller_dir)
        require(abs_feature)
      end

      def require(name)
        feature_name = name.to_s
        return false if $LOADED_FEATURES_SET[feature_name]

        res = JS.global.call(:resolveRubyModule, feature_name).to_s
        if !res.empty? && res != "null" && res != "undefined"
          data = JSON.parse(res)
          ruby_code = data["code"]
          file_path = data["file_path"]

          $LOADED_FEATURES_SET[feature_name] = true
          $LOADED_FEATURES_SET[file_path] = true
          $LOADED_FEATURES << file_path unless $LOADED_FEATURES.include?(file_path)

          clear_autoload_for(feature_name)
          clear_autoload_for(file_path)

          eval(ruby_code, TOPLEVEL_BINDING, file_path)
          return true
        end

        super(name)
      rescue LoadError => e
        if !feature_name.end_with?(".rb")
          rb_feature = "#{feature_name}.rb"
          if !$LOADED_FEATURES_SET[rb_feature]
            res_rb = JS.global.call(:resolveRubyModule, rb_feature).to_s
            if !res_rb.empty? && res_rb != "null" && res_rb != "undefined"
              data = JSON.parse(res_rb)
              ruby_code = data["code"]
              file_path = data["file_path"]

              $LOADED_FEATURES_SET[feature_name] = true
              $LOADED_FEATURES_SET[rb_feature] = true
              $LOADED_FEATURES_SET[file_path] = true
              $LOADED_FEATURES << file_path unless $LOADED_FEATURES.include?(file_path)

              clear_autoload_for(feature_name)
              clear_autoload_for(rb_feature)
              clear_autoload_for(file_path)

              eval(ruby_code, TOPLEVEL_BINDING, file_path)
              return true
            end
          end
        end
        raise e
      end
    end

    Kernel.prepend(CustomRequireHook)
  `);

  const specFiles = ["spec/calculator_spec.rb", "spec/sample_spec.rb"].filter((f) =>
    fs.existsSync(path.join(WORKSPACE_ROOT, f))
  );

  const specArgs = ["--color", "--format", "documentation", ...specFiles];

  const rubyRunCode = `
    ENV["HOME"] ||= "/tmp"
    ENV["TERM"] = "xterm-256color"

    require "rspec/core"

    args = ${JSON.stringify(specArgs)}
    status = RSpec::Core::Runner.run(args)
    status
  `;

  const exitCode = vm.eval(rubyRunCode).toJS();
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
