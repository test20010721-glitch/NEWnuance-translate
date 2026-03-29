# NuanceTranslate

ニュアンス・感情・スラングを保った自然な翻訳アプリ

## セットアップ手順

### 1. Vercelにデプロイ

1. このリポジトリをGitHubにpush
2. [vercel.com](https://vercel.com) でGitHubアカウントでログイン
3. 「New Project」→ このリポジトリを選択 → 「Deploy」
4. デプロイ後、Vercelのダッシュボードで「Settings」→「Environment Variables」を開く
5. 以下の環境変数を追加：

```
OPENAI_API_KEY = sk-proj-xxxxxxxx（あなたのOpenAI APIキー）
```

6. 「Redeploy」して完成！

### ローカルで動かす場合

```bash
# 依存関係をインストール
npm install

# .env.localファイルを作成
echo "OPENAI_API_KEY=sk-proj-xxxxxxxx" > .env.local

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 機能

- 日本語・英語・スペイン語・カタルーニャ語の翻訳
- トーン選択（カジュアル・ビジネス・丁寧・メール用・メニュー）
- 音声入力
- カメラ読み取り
- 翻訳履歴（ローカル保存）
- コピー機能
- お気に入り
- スマホ対応
