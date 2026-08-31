/**
 * Executes target RSpec spec files in the given Ruby VM instance
 * @param {import("@ruby/wasm-wasi").RubyVM} vm Initialized Ruby VM instance
 * @param {string[]} specFiles List of spec file paths to run
 * @param {Object} [options] Execution options
 * @param {boolean} [options.silent=false] Whether to suppress output during execution
 * @returns {number} RSpec exit code (0 for success, non-zero for failure)
 */
export function runSpecs(vm, specFiles, options = {}) {
  if (!specFiles || specFiles.length === 0) {
    if (!options.silent) {
      console.log("No spec files found to run.");
    }
    return 0;
  }

  const specArgs = ["--color", "--format", "documentation", ...specFiles];
  const isSilent = Boolean(options.silent);

  const rubyRunCode = `
    require "stringio"
    require "rspec/core"

    ENV["HOME"] ||= "/tmp"
    ENV["TERM"] = "xterm-256color"

    ${isSilent ? '$stdout = StringIO.new; $stderr = StringIO.new' : ''}

    # Override ExceptionPresenter#read_failed_line to suppress "Unable to find ... to read failed line"
    # when reading source files from Node.js filesystem inside WASM VM
    module RSpec
      module Core
        module Formatters
          class ExceptionPresenter
            def read_failed_line
              ""
            end
          end
        end
      end
    end

    args = ${JSON.stringify(specArgs)}
    status = RSpec::Core::Runner.run(args)
    status
  `;

  const exitCodeResult = vm.eval(rubyRunCode);
  return exitCodeResult.toJS();
}
