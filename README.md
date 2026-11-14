# 連休プランナー

有給と祝日と会社の休みを組み合わせて、連休を計画できる Web アプリです。登録なしで使えます。

## 起動方法

```sh
npm install
npm run dev
```

http://localhost:3000 を開きます。

## 祝日の更新

祝日は内閣府の CSV から取り込み、`src/data/holidays.json` に同梱しています。更新するときは次を実行します。

```sh
npm run holidays:fetch
```

## ドキュメント

- [要求定義書](./docs/仕様/11_要求定義書.md)
- [要件定義書](./docs/仕様/12_要件定義書.md)
- [開発ガイド](./CLAUDE.md)
