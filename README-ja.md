**RSpec runner for ruby.wasm**

# rspec-wasm

> ruby.wasm 上でネイティブな RSpec テストを直接実行し、JavaScript 内への Ruby 埋め込みを不要にします。

[English](README.md) | [日本語](README-ja.md)

[![npm](https://img.shields.io/badge/npm-package-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/rspec-wasm)
[![ruby.wasm](https://img.shields.io/badge/ruby.wasm-WebAssembly-CC342D?logo=ruby&logoColor=white)](https://github.com/ruby/ruby.wasm)
[![RSpec](https://img.shields.io/badge/RSpec-test_framework-E9573F)](https://rspec.info/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

`rspec-wasm` は、WebAssembly VM ([`ruby.wasm`](https://github.com/ruby/ruby.wasm)) 内で 100% 純粋な Ruby の RSpec テストを直接実行するための軽量なテストランナーです。

---

## なぜ rspec-wasm なのか？

従来、WebAssembly や Node.js 環境で Ruby.wasm のコードを実行・テストするためには、Ruby コードを JavaScript のヒアドキュメントやテンプレート文字列として埋め込み、`vm.eval("...")` で渡す必要がありました。 rspec-wasm を使うと、以下のような点が改善されます。

- **IDE 支援**: Ruby ファイルに対するシンタックスハイライト、フォーマット、静的解析、自動補完が効く。
- **いつもの Rspec**: 純粋な Ruby テストスイート (`*_spec.rb`) で完結し、 Javascript の記述不要。

`rspec-wasm` は、Ruby の `Kernel#require`、`require_relative`、`load` メソッドを透過的にフックし、Node.js のファイルシステムから直接 `.rb` ファイルを解決することでこの問題を解決します。

---

## 制約事項

- **C 拡張 Gem の非対応**: C 拡張（Native Extensions）を含む Gem は実行できません。純粋な Ruby コードおよび Gem のみが対象です。

---

## インストール

開発依存関係 (`devDependencies`) としてインストールします：

```bash
npm install --save-dev rspec-wasm
```

> **前提条件:** システムに Ruby (`gem` コマンド) がインストールされている必要があります。

`npm install` 実行時に `postinstall` スクリプトが自動実行され、以下のコマンドにより `vendor/gems/` 配下へ RSpec Gem 依存関係群が展開されます：

```bash
gem unpack rspec-core --target=vendor/gems
gem unpack rspec-expectations --target=vendor/gems
gem unpack rspec-support --target=vendor/gems
gem unpack rspec-mocks --target=vendor/gems
gem unpack rspec --target=vendor/gems
```

※ 手動で Gem を準備する場合や `postinstall` がスキップされた場合は、上記のコマンドをプロジェクトルートで実行してください。

---

## クイックスタート

### 1. `package.json` にテストスクリプトを追加

```json
{
  "scripts": {
    "test": "rspec-wasm"
  }
}
```

### 2. テストの実行

すべての spec を自動検出して実行：

```bash
npx rspec-wasm
# または
npm test
```

特定の spec ファイルのみを指定して実行：

```bash
npx rspec-wasm spec/calculator_spec.rb
```

---

## ディレクトリ構成とコード例

標準的なプロジェクト構成例：

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

`npx rspec-wasm` を実行すると以下の出力が得られます：

```text
Calculator
  .add
    adds two numbers correctly
    adds negative numbers correctly

Finished in 0.02 seconds (files took 0.70 seconds to load)
2 examples, 0 failures
```

---

## AI 開発エージェントとの協調利用ガイド

**Cursor**、**GitHub Copilot**、**Google Antigravity** などの AI コーディングアシスタントを使用している場合、以下のプロンプトを与えることで `rspec-wasm` 互換の純粋な Ruby spec を生成させることができます。

> **AI アシスタント向けプロンプト例:**  
> *"JavaScript の文字列リテラルや JS テストランナーを使わず、`lib/` 配下に純粋な Ruby 実装を、`spec/*_spec.rb` 配下に純粋な RSpec ユニットテストを生成してください。作成したすべての spec は `npx rspec-wasm` 経由で直接実行されます。"*

---

## ローカル開発手順

`rspec-wasm` 自体の開発やローカルでのテスト実行手順：

### 1. クローン & インストール

```bash
git clone https://github.com/dogrun-inc/rspec-wasm.git
cd rspec-wasm
npm install
```

### 2. CLI をグローバルリンク

```bash
npm link
```

### 3. テスト実行

```bash
npm test
# またはグローバルリンクされたバイナリを実行
rspec-wasm
```

---

## ライセンス

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。
