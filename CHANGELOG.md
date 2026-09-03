# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-09-04

### Fixed

- Configured Windows command prompt sessions to use the UTF-8 code page before running RSpec, preventing multibyte test output from being garbled.
- Kept CLI startup resilient when `chcp` is unavailable or fails.

### Added

- Regression tests for Windows code page switching, existing UTF-8 sessions, non-Windows platforms, and `chcp` failures.

## [0.1.0] - 2026-09-02

### Added

- Initial npm release of `rspec-wasm` for running native RSpec suites on ruby.wasm.
- Ruby 4.0 WASM runtime powered by ruby.wasm 2.x, with Node.js 18 or later required.
- `rspec-wasm` and `npx rspec-wasm` CLI commands with automatic discovery of `spec/**/*_spec.rb` files and support for explicitly selected spec files.
- Modular runtime components for Ruby WASM initialization, RSpec execution, Ruby source resolution, and Ruby file-loading hooks.
- Node.js filesystem integration for Ruby's `require`, `require_relative`, and `load` methods.
- Bundled, pinned RSpec 3.12 components: `rspec` 3.12.0, `rspec-core` 3.12.2, `rspec-expectations` 3.12.3, `rspec-mocks` 3.12.6, and `rspec-support` 3.12.1.
- `prepack` verification for bundled RSpec entrypoints, versions, and license files.
- Support for additional pure Ruby gems installed by Bundler under `vendor/bundle`.
- Workspace-relative resolution for leading-slash Ruby paths.
- Workspace and package root restrictions for Ruby source loading, including traversal and symlink escape protection, with an explicit `--allow-outside-roots` opt-in for trusted files.
- RSpec documentation-format output, color support, exit-code propagation, and safe output suppression for programmatic test runs.
- Unit, integration, and CLI end-to-end coverage for successful and failing specs, module resolution, Bundler gems, VM initialization, security restrictions, and stream restoration.
- English and Japanese documentation covering installation, usage, limitations, additional gems, security options, examples, and local development.

[0.1.1]: https://github.com/dogrun-inc/rspec-wasm/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dogrun-inc/rspec-wasm/releases/tag/v0.1.0