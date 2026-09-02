**RSpec runner for ruby.wasm**

# rspec-wasm

> Run native RSpec tests directly on ruby.wasm without embedding Ruby in JavaScript.

[English](README.md) | [日本語](README-ja.md)

[![Node.js](https://img.shields.io/badge/Node.js-18+-417E38?logo=Node.js&logoColor=white)](https://nodejs.org/)
[![Ruby 4.0](https://img.shields.io/badge/Ruby-4.0-CC342D?logo=ruby&logoColor=white)](https://www.ruby-lang.org/)
[![ruby.wasm 2.x](https://img.shields.io/badge/ruby.wasm-2.x-654FF0?logo=webassembly&logoColor=white)](https://github.com/ruby/ruby.wasm)
[![RSpec 3.12](https://img.shields.io/badge/RSpec-3.12-E9573F)](https://rspec.info/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why rspec-wasm?

Traditionally, running Ruby code in WebAssembly or Node.js required wrapping Ruby code inside JavaScript template strings or passing code via `vm.eval("...")`. Using `rspec-wasm` provides key benefits:

- **IDE Support**: Full syntax highlighting, formatting, static analysis, and autocompletion for Ruby files.
- **Native RSpec**: Write pure Ruby test suites (`*_spec.rb`) without any JavaScript boilerplate.

`rspec-wasm` solves this by seamlessly hooking Ruby's `Kernel#require`, `require_relative`, and `load` methods to resolve `.rb` files directly from your Node.js filesystem.

---

## Limitations

- **No Support for C-extension Gems**: Gems requiring native C extensions cannot be executed inside WASM. Only pure Ruby code and pure Ruby gems are supported.
- **Bundler**: Additional pure Ruby gems must be installed into the project-local `vendor/bundle` directory as described below. Gems installed only in the system location are not resolved.
- **Failure Source Snippets**: RSpec may be unable to display the failing source line because Ruby WASM cannot directly read files from the host filesystem. Assertion details and backtraces are still shown.

---

## Installation

> **Prerequisite:** Node.js 18 or later is required.

Install as a development dependency:

```bash
npm install --save-dev rspec-wasm
```

---

## Quick Start

### 1. Add Test Script to `package.json`

```json
{
  "scripts": {
    "test": "rspec-wasm"
  }
}
```

### 2. Run Tests

Run all specs automatically:

```bash
npx rspec-wasm
# or
npm test
```

Run a specific spec file:

```bash
npx rspec-wasm spec/calculator_spec.rb
```

By default, spec files and Ruby modules can only be loaded from the project workspace and the `rspec-wasm` package. To allow trusted specs to load files outside these roots, opt in explicitly:

```bash
npx rspec-wasm --allow-outside-roots spec/calculator_spec.rb
```

This option allows Ruby files anywhere on the host filesystem to be loaded and evaluated. Use it only with trusted specs and dependencies.

### Using Additional Gems with Bundler

Add pure Ruby gems to your `Gemfile`, then install them into the project-local Bundler path:

```bash
bundle config set --local path vendor/bundle
bundle config set --local force_ruby_platform true
bundle install
bundle clean
```

Notes:
* ruby.wasm supports pure Ruby gems only.
* `rspec-wasm` resolves additional gem libraries from `vendor/bundle/ruby/*/gems/*/lib`; the bundled RSpec version takes precedence over gems with the same require path.
* Ruby and Bundler are only required to install or update additional gems. Spec execution uses the bundled Ruby 4.0 WASM runtime.
* Commit `Gemfile` and `Gemfile.lock`. Whether to commit `vendor/bundle` depends on your project's deployment policy.

---

## Project Structure & Example

Standard project layout:

```text
.
├── package.json
├── lib/
│   └── calculator.rb
└── spec/
    └── calculator_spec.rb
```

### `lib/calculator.rb`

```ruby
class Calculator
  def self.add(a, b)
    a + b
  end
end
```

### `spec/calculator_spec.rb`

```ruby
require "calculator"

RSpec.describe Calculator do
  describe ".add" do
    it "adds two numbers correctly" do
      expect(Calculator.add(1, 2)).to eq(3)
    end

    it "adds negative numbers correctly" do
      expect(Calculator.add(-1, 5)).to eq(4)
    end
  end
end
```

Running `npx rspec-wasm` outputs:

```text
Calculator
  .add
    adds two numbers correctly
    adds negative numbers correctly

Finished in 0.02 seconds (files took 0.70 seconds to load)
2 examples, 0 failures
```

---

## Tip for AI-Driven Development

If you use AI coding assistants like **Cursor**, **GitHub Copilot**, or **Google Antigravity**, you can provide the following system prompt to generate pure Ruby specs compatible with `rspec-wasm`:

> **Prompt Example for AI Assistants:**  
> *"Please generate a pure Ruby implementation in `lib/` and corresponding RSpec unit tests in `spec/*_spec.rb`. Do not embed Ruby inside JavaScript string literals or write JS test runners. All specs will be executed directly via `npx rspec-wasm`."*

---

## Local Development

To contribute or run `rspec-wasm` locally:

### 1. Clone & Install

```bash
git clone https://github.com/dogrun-inc/rspec-wasm.git
cd rspec-wasm
npm install
```

### 2. Prepare Bundled RSpec Gems

The repository already includes the RSpec sources under `vendor/gems`, so no Ruby installation is needed for normal development. To recreate or update the bundle, install Ruby and run these commands from the repository root after clearing `vendor/gems`:

```bash
gem unpack rspec --version 3.12.0 --target vendor/gems
gem unpack rspec-core --version 3.12.2 --target vendor/gems
gem unpack rspec-expectations --version 3.12.3 --target vendor/gems
gem unpack rspec-mocks --version 3.12.6 --target vendor/gems
gem unpack rspec-support --version 3.12.1 --target vendor/gems
npm run verify:bundled-gems
```

Commit the updated Gem sources and license files together. Do not use unpinned versions, because the directory names are part of the verified package layout.

### 3. Link CLI Globally

```bash
npm link
```

### 4. Run Tests

```bash
npm test
# or run globally linked binary
rspec-wasm
```

---

## License

This project is licensed under the [MIT License](LICENSE).
