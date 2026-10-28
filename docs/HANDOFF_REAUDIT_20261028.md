# 2026-10-28 統合指示に基づく再引き継ぎ・実体検査

## GitHubの実状態
- アプリ `minkohno-hub/heat-transfer-study-ja` は **public**、教材 `minkohno-hub/heat-transfer-materials-private` は **private**。両者の読み書き権限をGitHub接続で確認。
- Codexの `codex/quality-audit-local-pack` は `aaef3d97b07efb5e16c1ab678c15e13ceb2932dd`（2026-10-28 07:54 UTC）で、[PR #1](https://github.com/minkohno-hub/heat-transfer-study-ja/pull/1) はopen/draft。PR #1の同SHAの[CI #40653123045](https://github.com/minkohno-hub/heat-transfer-study-ja/actions/runs/40653123045) は成功。PR #1のGitHubレビューは0件。
- 前回の独立[PR #7](https://github.com/minkohno-hub/heat-transfer-study-ja/pull/7)はこの時点でopen/draft、元のCodex HEADから作った独立作業。マージするまでCodexブランチと`main`には変更しない。CI実行結果で安全性を確認し、可能ならPR #7をCodexブランチへ統合してPR #1に成果を集約する。
- GitHub接続は **リモートのコミット済みツリーのみ確認可能**。旧PC、Codexの別ワークスペース、未pushコミット、未追跡ファイル、未コミット変更を検査したとは主張しない。force push/resetは行わない。

## 指示書と進捗資料
- アプリの `README.md`, `LICENSE-BOOK.md`, `docs/CONTENT_PROGRESS.md`, `docs/SECTION_PROGRESS.md`, `docs/SECTION_PROGRESS.json`, `docs/CONTENT_INVENTORY.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/DECISIONS.md`, `docs/VERIFICATION.md`, `data/book.json`, `package.json`, GitHub Actionsと公開ビルドの設定を実際に読み、既存構造を確認。
- アプリのルート `AGENTS.md` と `LICENSE`、非公開教材リポジトリのルート `AGENTS.md`, `README.md`, `LICENSE`, `LICENSE-BOOK.md` はGitHubで404（**当該パスに存在しない**）。隠れたファイルがあると推測しない。
- 旧PC由来の `data/drafts/`, `data/local/`, `data/source/`, `data/local-content-manifest.json` はアクセス可能なGit管理ツリーに未収録。消失したと断定せず、元のPCからの回収待ち。レガシー原稿・図版・問題の一部のみ非公開リポジトリの `legacy-app-content/` に保全。
- 既存の進捗台帳は「ページ文字抽出」「旧PC下書きの存在記録」「原本の実画像・数式照合」「公開本文」「独立補足教材」を異なる証拠とする。特に `docs/SECTION_PROGRESS.json` の `questions.count` は当時の原本出典問題の進捗であり、現在の独立補足問題数とは別。無断で上書きしない。

## PDFの同一性・権利
- 私有教材側 `AHTTv600.pdf` のGitHubツリーサイズは **32,472,182バイト**、アプリ側 `book/AHTTv600.pdf` も同サイズ。既存の許可リストビルドはSHA-256 `d318176a9cac997d415ec5ee95b30979dcdaed0392705185393735c7d59a447a` を計算して不一致なら停止する。
- [出版社/著者の公式版履歴](https://ahtt.mit.edu/version-history/)に**同じSHA-256**があり、[公式配布ページ](https://ahtt.mit.edu/)は *A Heat Transfer Textbook* 第6版、**Version 6.00, 19 April 2024, 810ページ**と明記。この組合せは既存PDFの同一性確認を強く裏付ける。
- 今回の接続は32MBのPDFバイナリを直接取得・ページ画像をレンダリングできなかったため、**今回新たに全ページの数式・図表画像を目視確認したとは記録しない**。以前のPDF抽出・画像点検は過去記録として残す。以後の節別校閲は実画像が利用できる環境で行う。
- ユーザー申告の原本PDF掲載許可は尊重するが、出版社の許可原本の提示は未確認。日本語全文訳、原図単体、原文抽出、その他の出版物の再配布許諾と同一視しない。非公開教材を丸ごとpublic化しない。

## 実装・品質の最優先課題
1. **既存利用者の更新停止リスク（修正）**：従来の`sw.js` は固定`heat-study-ja-v12`で、新しい教材JSON/JSを公開しても既存インストールに新しいサービスワーカーが配布されない可能性があった。公開ビルドの**実ファイル内容からキャッシュ名を決定**する手順を追加。PDFの明示的な保存キャッシュは独立した名前で保護。差分変更で版が変わる自動テストも追加。
2. **詳細教材が横断検索で欠落（修正）**：`original-deep-lessons.json`の独立発展講義6節が読書画面にはあっても検索インデックスに含まれていなかった。全講義の見出し、導出、式、記号、計算例、限界を検索対象とし、対応節へ直接移動可能にした。日本語訳でないこと、外部専門家未校閲を明示。日本語説明書も検索実態と一致するよう更新。
3. **全体完成は未達（未解消）**：76節の独立概念ノートの存在は全面翻訳・学術照合と異なる。現行問題190問の原本全範囲カバー、最小各節8問、第三者レビューは未達。専門家校閲を成功テストで代用しない。
4. **公開URL・端末（未解消）**：CIで公開許可リスト生成物のChromiumを確認する。ただし実際のGitHub Pages URLへの独立ブランチの配信は行っておらず、iPhone Safari/Androidの実機試験や支援技術の実動作も未検証。

## 追加作業で守る約束
アプリの再構築、ブランチへの無確認上書き、既存データの破壊、未許諾訳文・画像の配信は行わない。既存履歴は学習問題のrevisionで保持し、外部専門家・権利・実機検証などAIが実施できない証跡は「未実施」に保つ。変更ファイル・PR・対象SHA・CI・残課題をこの記録と `docs/VERIFICATION.md` に追記する。
