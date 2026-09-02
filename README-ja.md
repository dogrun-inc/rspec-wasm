**RSpec runner for ruby.wasm**

# rspec-wasm

> ruby.wasm 上でネイティブな RSpec テストを直接実行し、JavaScript 内への Ruby 埋め込みを不要にします。

[English](README.md) | [日本語](README-ja.md)

[![Node.js](https://img.shields.io/badge/Node.js-18+-417E38?logo=Node.js&logoColor=white)](https://nodejs.org/ja)
[![Ruby 4.0](https://img.shields.io/badge/Ruby-4.0-CC342D?logo=ruby&logoColor=white)](https://www.ruby-lang.org/ja/)
[![ruby.wasm 2.x](https://img.shields.io/badge/ruby.wasm-2.x-654FF0?logo=webassembly&logoColor=white)](https://github.com/ruby/ruby.wasm)
[![RSpec 3.12](https://img.shields.io/badge/RSpec-3.12-E9573F)](https://rspec.info/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## なぜ rspec-wasm なのか？

従来、WebAssembly や Node.js 環境で ruby.wasm のコードを実行・テストするためには、Ruby コードを JavaScript のヒアドキュメントやテンプレート文字列として埋め込み、`vm.eval("...")` で渡す必要がありました。 rspec-wasm を使うと、以下のような点が改善されます。

- **IDE 支援**: Ruby ファイルに対するシンタックスハイライト、フォーマット、静的解析、自動補完が効く。
- **いつもの RSpec**: 純粋な Ruby テストスイート (`*_spec.rb`) で完結し、JavaScript の記述不要。

`rspec-wasm` は、Ruby の `Kernel#require`、`require_relative`、`load` メソッドを透過的にフックし、Node.js のファイルシステムから直接 `.rb` ファイルを解決することでこの問題を解決します。

---

## 制約事項

- **C 拡張 Gem の非対応**: C 拡張（Native Extensions）を含む Gem は実行できません。純粋な Ruby コードおよび Gem のみが対象です。
- **Bundler**: 追加する pure Ruby Gem は、後述の手順でプロジェクト内の `vendor/bundle` へインストールしてください。システム領域にのみインストールされた Gem は解決しません。
- **失敗箇所のソース表示**: Ruby WASM からホストファイルシステムを直接読み取れないため、RSpec が失敗したソース行を表示できない場合があります。アサーションの詳細とバックトレースは表示されます。

---

## インストール

> **前提条件:** Node.js 18 以上が必要です。

開発依存関係 (`devDependencies`) としてインストールします：

```bash
npm install --save-dev rspec-wasm
```

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

デフォルトでは、spec ファイルと Ruby モジュールの読み込み元をプロジェクトのワークスペースと `rspec-wasm` パッケージ内に制限します。信頼できる spec から制限外のファイルを読み込む場合のみ、明示的に許可してください：

```bash
npx rspec-wasm --allow-outside-roots spec/calculator_spec.rb
```

このオプションを指定すると、ホストファイルシステム上の任意の Ruby ファイルを読み込んで評価できます。信頼できる spec と依存関係にのみ使用してください。

### Bundler による追加 Gem の導入

アプリケーションで Gem を使用する場合は、`Gemfile` に Gem を追加し、Bundler を使用してプロジェクト内の Bundler パスへインストールします：

```bash
bundle config set --local path vendor/bundle
bundle config set --local force_ruby_platform true
bundle install
bundle clean
```

補足:
* ruby.wasm では、pure Ruby Gem のみが使用可能です。
* `rspec-wasm` は `vendor/bundle/ruby/*/gems/*/lib` から追加 Gem のライブラリを解決し、同じ require パスがある場合は同梱版 RSpec を優先します。
* Ruby と Bundler が必要なのは追加 Gem のインストールまたは更新時だけで、spec の実行には同梱された Ruby 4.0 WASM ランタイムを使用します。
* Gemfile と Gemfile.lock はコミットしてください。vendor/bundle をコミットするかは、プロジェクトの配布方針に合わせてください。

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

### 2. 同梱する RSpec Gem の準備

リポジトリには RSpec のソースを `vendor/gems` 配下に同梱しているため、通常のローカル開発では Ruby のインストールは不要です。同梱内容を再生成または更新する場合は、Ruby をインストールし、`vendor/gems` を空にしてからリポジトリルートで以下を実行します：

```bash
gem unpack rspec --version 3.12.0 --target vendor/gems
gem unpack rspec-core --version 3.12.2 --target vendor/gems
gem unpack rspec-expectations --version 3.12.3 --target vendor/gems
gem unpack rspec-mocks --version 3.12.6 --target vendor/gems
gem unpack rspec-support --version 3.12.1 --target vendor/gems
npm run verify:bundled-gems
```

更新した Gem のソースとライセンスファイルはまとめてコミットしてください。ディレクトリ名もパッケージ構成の検証対象になるため、バージョンを省略しないでください。

### 3. CLI をグローバルリンク

```bash
npm link
```

### 4. テスト実行

```bash
npm test
# またはグローバルリンクされたバイナリを実行
rspec-wasm
```

---

## ライセンス

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。
