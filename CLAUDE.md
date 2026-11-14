# CLAUDE.md 連休プランナー 開発ガイド

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

有給と祝日と会社の休みを組み合わせて連休を計画する Web アプリ。候補（どこを休むと何連休になるか）が主役で、日程の記録と持ち分の管理がそれにつながる。サーバー・DB・認証を持たず、記録は利用者の端末に置く。**判断に迷ったら[要求定義書](./docs/仕様/11_要求定義書.md)の価値 C-1〜C-5 とスコープ外表に照らす。**

アプリ内の表示文言・コードコメント・docs・コミットメッセージは日本語。コミットメッセージは `type(scope): 要約` の形（`feat(domain): …`・`fix(holidays): …`・`docs: …`・`chore: …`）。

## 最重要ルール: 仕様変更は docs 反映が先

挙動の契約はドキュメント群にある。実装中に挙動レベルの仕様判断が発生した場合、**コードより先に該当ドキュメントを更新する**。判断はオーナーとの対話でのみ決め、AI が単独で決めない。

- 価値・スコープ・要求の一覧（機能 F-XXX・非機能 N-XX）: [要求定義書](./docs/仕様/11_要求定義書.md) §6
- 計算の規則（R-1〜R-19）: [要件定義書](./docs/仕様/12_要件定義書.md) §5
- 画面の構成・配置・寸法・文言: [画面定義書](./docs/仕様/13_画面定義書.md)
- 実装計画は `docs/案件/` に置き、完了したら削除する（経緯は git 履歴）

## docs の書き方の規約（hitosuji・bassdrill と同じ）

- ファイル名は全体で一意な 2 桁番号（1X = 仕様 / 2X = 案件 / 3X = 検討）。`log_` の付属ファイルは親の番号を引き継ぐ
- **詳細は下位文書に 1 か所だけ書く**。上位文書は 1〜2 行の要約と参照リンク
- **判断の経緯（「なぜそうしたか」）は本文に書かず、同階層の `log_<文書名>.md` に日付順で積む**。本文は現在の仕様だけ
- 文書の分離・改番・節の移動をしたら、旧参照を grep で洗い出して追随させてから閉じる
- 表のセル内に `|` を書かない

## 技術スタックとコマンド

Next.js 16.4.5（App Router）/ React 19.3.1 / TypeScript 5 / Tailwind CSS 4（`@tailwindcss/postcss`）/ Vitest 5 / ESLint 10 + eslint-config-next。Node 22 以上。

```sh
npm run dev           # 開発サーバー（http://localhost:3000）
npm test              # vitest run（全件）
npx vitest run src/smoke.test.ts   # 1 ファイルだけ
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run build         # next build（全ページを静的生成）
npm run holidays:fetch  # 内閣府の CSV から src/data/holidays.json を更新
```

パスの別名は `@/*` → `src/*`。

## Next.js の注意

このバージョンは学習時の知識と API・規約・ファイル構成が違うことがある。**コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む**。非推奨の通知にも従う。

## コード構成と設計原則

```
src/domain/   計算の純関数。I/O・引数なしの new Date()・Date.now()・クラスを書かない。型は Readonly。React と Next.js を知らない
  view/       表示用の組み立て（持ち分、四半期の節など）。文言を含まないデータ。画面は計算せず、ここの結果を描く
  storage/    保存するデータの検証
  entries/    入力の検証
src/data/     同梱する祝日データ（holidays.json）
src/app/      Next.js の画面。site.ts にサービス名・題・説明文を持つ
  Planner.tsx 端末で動く主な画面
  store/      記録のストア。localStorage に触るのはここだけ
  components/ 表示だけの部品。計算をしない
  texts.ts    画面の文言は全部ここ
scripts/      祝日の取り込み
```

- 依存方向は domain ← app。今日の日付・祝日・設定・日程は、すべて引数で domain に渡す
- 日付は `IsoDate`（`'YYYY-MM-DD'` の文字列）で持ち、日本の暦日として扱う（N-07）。端末やビルド機のタイムゾーンで結果が変わらない
- 週の休みは土曜と日曜に固定（F-105）
- MVP ではサーバー側の処理（API ルート、Server Actions、`cookies()` などの動的 API）を書かない（N-01）。`output: 'export'` は使わない
- テストはコロケーション（`foo.ts` の隣に `foo.test.ts`）。モックを使わない。テスト名は日本語で、対応する要求 ID か規則 ID を入れる
- 画面の部品に日本語の文字列を直接書かない。文言は `src/app/texts.ts` に置く
- 部品は `src/domain/view/` の組み立てを描くだけにし、計算や判定をしない
- 部品のテストは `renderToStaticMarkup` で HTML を確かめる
- テストは日本以外のタイムゾーン（`vitest.config.mts` の `TZ`）で流れる
- `src/domain/**` の禁止事項は ESLint の `no-restricted-syntax` が守る（`eslint.config.mjs`）

## 開発の進め方

- TDD。テストを先に書いて失敗を見てから実装する
- 挙動レベルの仕様判断は委譲せず、オーナーとの対話で決めて docs を先に更新する
- main へのマージと、デプロイが走る push は、オーナーの合図を待つ
