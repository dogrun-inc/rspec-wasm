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

    ${isSilent ? `
    original_stdout = $stdout
    original_stderr = $stderr

    begin
      $stdout = StringIO.new
      $stderr = StringIO.new
    ` : ''}

    args = ${JSON.stringify(specArgs)}
    status = RSpec::Core::Runner.run(args)
    ${isSilent ? `
    ensure
      $stdout = original_stdout
      $stderr = original_stderr
    end
    ` : ''}
    status
  `;

  const exitCodeResult = vm.eval(rubyRunCode);
  return exitCodeResult.toJS();
}
