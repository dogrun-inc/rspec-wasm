# rspec-wasm

> Run native RSpec tests directly on ruby.wasm without embedding Ruby in JavaScript.

[English](README.md) | [日本語](README-ja.md)

[![npm version](https://img.shields.io/npm/v/rspec-wasm.svg)](https://www.npmjs.com/package/rspec-wasm)
[![license](https://img.shields.io/npm/l/rspec-wasm.svg)](LICENSE)

`rspec-wasm` is a lightweight test runner that executes 100% pure Ruby RSpec tests directly inside the WebAssembly VM ([`ruby.wasm`](https://github.com/ruby/ruby.wasm)).

---

## Why rspec-wasm?

Traditionally, running Ruby code in WebAssembly or Node.js required wrapping Ruby code inside JavaScript template strings or passing code via `vm.eval("...")`. Using `rspec-wasm` provides key benefits:

- **IDE Support**: Full syntax highlighting, formatting, static analysis, and autocompletion for Ruby files.
- **Native RSpec**: Write pure Ruby test suites (`*_spec.rb`) without any JavaScript boilerplate.

`rspec-wasm` solves this by seamlessly hooking Ruby's `Kernel#require`, `require_relative`, and `load` methods to resolve `.rb` files directly from your Node.js filesystem.

---

## Limitations

- **No Support for C-extension Gems**: Gems requiring native C extensions cannot be executed inside WASM. Only pure Ruby code and pure Ruby gems are supported.

---

## Installation

Install as a development dependency:

```bash
npm install --save-dev rspec-wasm
```

> **Prerequisite:** Ruby (`gem` command) must be installed on your system.

During `npm install`, a `postinstall` script automatically unpacks required RSpec gem dependencies into `vendor/gems/` using:

```bash
gem unpack rspec-core --target=vendor/gems
gem unpack rspec-expectations --target=vendor/gems
gem unpack rspec-support --target=vendor/gems
gem unpack rspec-mocks --target=vendor/gems
gem unpack rspec --target=vendor/gems
```

*Note: If `postinstall` is skipped or if preparing gems manually, run the commands above in your project root.*

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

### 2. Link CLI Globally

```bash
npm link
```

### 3. Run Tests

```bash
npm test
# or run globally linked binary
rspec-wasm
```

---

## License

This project is licensed under the [MIT License](LICENSE).
