# PARALLEL_CHAT_COLLATION：照合ライン進捗

- 作業対象: `minkohno-hub/heat-transfer-study-ja`
- 専用ブランチ: `chat/collation`
- 分岐元: `codex/quality-audit-local-pack`、起点コミット `c8d207710374411694898093ca9d6adc16fa0fcf`
- 第1チャンク: `docs/SECTION_COVERAGE_COLLATION.md` に76節の構造・独立ノート・詳細講義・節別基礎確認問原稿・未確認項目の初版を作成
- 変更してよいパス: `docs/SECTION_COVERAGE_COLLATION.md` および本ファイルだけ
- 変更禁止: `main`、`codex/quality-audit-local-pack`、`chat/parallel-dev`、`chat/glossary`、詳細講義・問題・用語データ・独自図解・原書の素材
- PR: **未作成**（指示があるまで作成しない）
- データ由来と注意事項: `docs/SECTION_COVERAGE_COLLATION.md` 冒頭を参照。独自原稿を翻訳と呼ばない。旧PCの履歴は現在の公開物とは別。
- 実施済みの構造照合: 11章76節のID一意、独立ノート76件の節対応、詳細講義54件の一意対応、節別独立問題76件の節対応、旧進捗登録76件、配信マニフェスト空。**図解・用語・シミュレーターの節別連携、原書全ページの照合、専門家・実機校閲は実施していない**。
- 検証: 読み取りデータのJSON解析と上記ID・件数の整合性を確認。GitHub CI・ブラウザ・実機のテストは本チャンクで実行していない。ソースコードには変更なし。
- 次回前提: 各チャンク開始時に起点・照合ブランチの最新HEAD、既存記録・他ラインの更新状況を必ず確認。差分の重複・上書きや無断リベースはしない。
