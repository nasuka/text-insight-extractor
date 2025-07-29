# CSV Insight Extractor

CSV Insight ExtractorはGoogle Gemini AIを使用してCSVデータのトピック分析を行うReactベースのWebアプリケーションです。

## 主な機能

- **トピック分析**: CSVデータから主要なトピックとサブトピックを自動抽出
- **データ分類**: 各データエントリにトピック・サブトピックを自動割り当て
- **高度なフィルタリング**: トピック、サブトピック、KPTタイプ、都道府県でのフィルタリング
- **AIチャット機能**: フィルタされたデータについてGemini AIに質問
- **エクスポート機能**: 
  - CSV形式での分析結果ダウンロード
  - HTMLレポート生成
  - 静的サイトとしてのエクスポート（Next.js風）
- **分析の再開**: 分析済みCSVをアップロードして作業を継続

## セットアップ

### 必要な環境

- Node.js v18以上
- npm または yarn
- Google Gemini API キー

### インストール

1. リポジトリをクローン
```bash
git clone [repository-url]
cd text-insight-extractor
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
`.env.local`ファイルを作成し、Gemini APIキーを設定：
```
GEMINI_API_KEY=your-api-key-here
```

4. 開発サーバーを起動
```bash
npm run dev
```

## 使い方

### 基本的な分析フロー

1. **CSVファイルのアップロード**
   - UTF-8エンコードのCSVファイルをドラッグ&ドロップまたはクリックしてアップロード
   - 分析済みCSVをアップロードすると、分析を再開できます

2. **分析設定**
   - 分析する列を選択
   - トピック抽出に使用するサンプル数を指定（10〜1000件、デフォルト200件）
   - KPTタイプでの事前フィルタリング（オプション）

3. **トピック分析の実行**
   - 「トピックを分析」ボタンをクリック
   - AIが自動的にトピックを抽出し、各データに割り当て

4. **結果の確認とフィルタリング**
   - トピックをクリックして展開・フィルタリング
   - サブトピック、KPTタイプ、都道府県での絞り込み
   - チャット機能でデータについて質問

### エクスポート機能

#### CSVダウンロード
分析結果を含むCSVファイルをダウンロード。再アップロードで分析を再開可能。

#### HTMLレポート
単一のHTMLファイルとして、現在の表示内容をそのままエクスポート。

#### 静的サイトエクスポート
Next.jsのstatic exportのような完全な静的サイトを生成：

1. アプリで分析を実行
2. ターミナルで以下を実行：
```bash
npm run build:static
```
4. プレビュー：
```bash
npm run preview:static
```
5. `dist-static`フォルダの内容をWebサーバーにデプロイ

## スクリプト

```bash
npm run dev          # 開発サーバーの起動
npm run build        # プロダクションビルド
npm run build:static # 静的サイトのビルド
npm run preview      # プロダクションビルドのプレビュー
npm run preview:static # 静的サイトのプレビュー
```

## プロジェクト構成

```
text-insight-extractor/
├── components/          # Reactコンポーネント
│   ├── ChatInterface.tsx   # AIチャット機能
│   ├── IconComponents.tsx  # SVGアイコン
│   └── LoadingSpinner.tsx  # ローディング表示
├── services/           # サービス層
│   └── geminiService.ts    # Gemini AI統合
├── utils/              # ユーティリティ関数
│   ├── csvUtils.ts         # CSV処理
│   ├── htmlExportUtils.ts  # HTMLエクスポート
│   ├── reportExportUtils.ts # レポート生成
│   └── staticExportUtils.ts # 静的エクスポート
├── scripts/            # ビルドスクリプト
│   └── build-static.js     # 静的サイトビルド
├── App.tsx             # メインアプリケーション
├── StaticApp.tsx       # 静的モード用アプリ
└── vite.config.ts      # Vite設定
```

## 技術スタック

- **フロントエンド**: React 19 + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **AI**: Google Gemini 2.5 Flash
- **アイコン**: カスタムSVGコンポーネント

## 制限事項

- トピック抽出は最大20,000文字まで
- トピック割り当ては20件ずつのバッチ処理
- チャット機能は最大100件のデータサンプルを使用

## トラブルシューティング

### 静的エクスポートが更新されない場合
1. 開発サーバーが起動していることを確認
2. コンソールで「✅ Export state saved successfully」を確認
3. 必要に応じて開発サーバーを再起動

### Gemini APIエラー
- APIキーが正しく設定されているか確認
- APIの利用制限に達していないか確認
