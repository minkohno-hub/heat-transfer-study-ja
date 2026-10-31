# 図解追加パッケージ（Muse 側）D1：第1〜4章の未作成節 9節

作成: フェイリス（Muse）コーディング参加・図解量産パッケージ D1、2026-10-31
ブランチ: `muse/diagrams-ch1-4`（起点は PR #1 ブランチ `codex/quality-audit-local-pack` の 4195f6a。PR は作成しない。統合は後の統合パッケージで実施）

## 担当範囲の確定

統合済みの既存図解は28点（`assets/lesson-diagrams/` 実ファイル数と `tests/lesson-diagram-*.test.mjs` の数で確認）。第1〜4章で未作成だった **§1.3・§1.4・§1.5・§2.1・§2.2・§2.5・§3.1・§4.1・§4.4** の9節を担当し、図解ラインの記録 `docs/PARALLEL_CHAT.md` と第10章パッケージ（`docs/DIAGRAMS_CH10_BY_MUSE.md`）の配置・命名規約・専用テスト形式に完全に倣って作成した。SVG はすべて独自作図で、原書の図の転載・トレースはしていない。各 SVG は自己完結（外部参照なし）、`title`/`desc`、`viewBox`（幅840）、ライト／ダーク配色、`data-lesson`・`data-origin="original-app-diagram"` と数値条件の `data-*` 属性を持ち、末尾に「アプリ作成の独自模式図」と明記している。数値は各節の講義（`data/original-deep-lessons.json`）の workedExample と一致させ、原書テキスト（`ahtt.txt`）と通読ダイジェストで式番号・位置づけを裏取りし、採用前に全数値を独立検算した。

## 作成物

### §1.3 伝熱の3モード

- SVG: `assets/lesson-diagrams/section-1-3-three-modes-comparison.svg`（840×1162）
- テスト: `tests/lesson-diagram-1-3.test.mjs`（4件）
- 内容: Fourier の法則（1.8・1.9）、Newton の冷却法則（1.17）、Stefan–Boltzmann の法則（1.28・1.33）を、面積 A=0.50 m² 共通の独立モデルで比較。伝導（k=2、L=0.10 m、ΔT=20 K）Q=200 W、対流（h=10、ΔT=20 K）Q=100 W、放射（ε=0.8、320 K、黒体周囲300 K）Q=54.11 W。棒グラフは Q に比例。三つは境界条件の異なる独立モデルで合計できないことを明記。放射の T は絶対温度、h は物性値でないことも注記。

### §1.4 この先の見通し

- SVG: `assets/lesson-diagrams/section-1-4-roadmap-series-resistance.svg`（840×1090）
- テスト: `tests/lesson-diagram-1-4.test.mjs`（4件）
- 内容: 本書 §1.4 の「3つの課題」（伝導方程式と境界条件／h の決定／形態係数 F・伝達係数 ℱ）と第3章を先に扱う構成。道具の原型として講義例の直列2抵抗（内面100 ℃指定、壁 L=0.020 m・k=0.50・A=0.50 m²、外側 h=10・流体20 ℃）: R_cond=0.080、R_conv=0.200 K/W、Q=285.7 W、外面温度77.14 ℃、温度降下 22.86＋57.14=80 K を両方向から検算する形で表示。

### §1.5 章末問題への取り組み方

- SVG: `assets/lesson-diagrams/section-1-5-problem-solving-uncertainty.svg`（840×1054）
- テスト: `tests/lesson-diagram-1-5.test.mjs`（4件）
- 内容: 本書 §1.5 の案内（SI 原則、Appendix A/B、「理論的」問題の位置づけ）に沿った問題解決手順4ステップと、講義例の不確かさ伝播。平板実験（Q=20 W、L=0.010 m、A=0.020 m²、ΔT=20 K）で k=0.50 W/(m·K)、4量各5.0%の独立な標準不確かさは RSS で10%（u(k)=0.050）、上限として線形に足す最悪幅評価では20%となり、両者の意味の違いを棒の 1:2 比で示す。

### §2.1 熱伝導方程式

- SVG: `assets/lesson-diagrams/section-2-1-heat-equation-control-volume.svg`（840×1290）
- テスト: `tests/lesson-diagram-2-1.test.mjs`（4件）
- 内容: 検査体積の収支（2.5）と Gauss の定理（2.8）から一般形（2.10）への導出の流れ、k 一定の形（2.11）と適用範囲（非圧縮性・静止媒体）、座標形（2.12–2.14）。講義例の発熱平板（L=0.040 m、k=20、q‴=8.0×10⁴ W/m³、両面30 ℃）の放物線分布を解析式から41点で描画: T_max=30.8 ℃（中央）、q_x(0)=−1600・q_x(L)=+1600 W/m²、外向き放熱の和1600+1600=全発熱 q‴L=3200 W/m² の検算つき。縦軸は30.0 ℃基準・300 px/K の拡大表示と明記。

### §2.2 平板の定常熱伝導：方法

- SVG: `assets/lesson-diagrams/section-2-2-slab-method-linear-profile.svg`（840×1210）
- テスト: `tests/lesson-diagram-2-2.test.mjs`（4件）
- 内容: §2.2 の解法8ステップ（Step 4 の「知り得ない情報を境界条件に入れない」警告を含む）と、例題2.2・講義例の線形分布。L=0.20 m、k=4.0、A=2.0 m²、両面60/20 ℃で T(x)=60−200x、q″=+800 W/m²、Q=1600 W、R=L/(kA)=0.025 K/W、ΔT/R による検算まで表示。分布直線は21点で描画。

### §2.5 第2章のまとめ

- SVG: `assets/lesson-diagrams/section-2-5-composite-wall-summary.svg`（840×1126）
- テスト: `tests/lesson-diagram-2-5.test.mjs`（4件）
- 内容: §2.5 の到達点4項目と先送り事項。講義例の複合壁（A=1.0 m²、内流体40 ℃・外流体0 ℃）: 内対流0.100・層1（L=0.020、k=0.20）0.100・接触（r_c″=0.010 m²·K/W）0.010・層2（L=0.010、k=0.50）0.020・外対流0.050、合計0.280 K/W、Q=142.86 W。温度降下の内訳を比例幅の5分割バーで示し、界面温度 25.71／11.43／（接触）／10.00／7.14 ℃と、接触部で1.43 K 落ちることを明示。

### §3.1 熱交換器の基本

- SVG: `assets/lesson-diagrams/section-3-1-hx-configurations-balance.svg`（840×1130）
- テスト: `tests/lesson-diagram-3-1.test.mjs`（4件）
- 内容: §3.1 の3基本形式（並流・向流／シェル＆チューブ／直交流）、フィンの役割（気体側の面積補償）、直接接触式。講義例のエネルギー収支: C_h=2400・C_c=3200 W/K、高温水70→50 ℃で Q=48.0 kW、冷側出口35 ℃、Q_max=C_min×50 K=120 kW、ε=0.40。Q と Q_max の棒比が ε と一致する形で表示し、収支だけでは必要面積は決まらない旨を注記。

### §4.1 適正問題

- SVG: `assets/lesson-diagrams/section-4-1-well-posed-boundary-conditions.svg`（840×1180）
- テスト: `tests/lesson-diagram-4-1.test.mjs`（4件）
- 内容: 適正問題の部品（熱伝導方程式＋初期条件1つ＋各座標に境界条件2つ）と境界条件の3種（第1種・第2種・第3種、第3種は −k ∂T/∂x = h(T−T∞)）。講義例: 左面 T(0)=100 ℃（第1種）と右面の外向き流束+200 W/m²（第2種）を受ける平板（L=0.10 m、k=2.0）で T(x)=100−100x、T(L)=90 ℃。分布直線は21点、縦軸は100 ℃基準・12 px/K。

### §4.4 次元解析の応用

- SVG: `assets/lesson-diagrams/section-4-4-shape-factor-scaling.svg`（840×1050）
- テスト: `tests/lesson-diagram-4-4.test.mjs`（4件）
- 内容: 等温境界・定常・発熱なしの伝導では Q = kLΔT×Π（形状比のみ）= kSΔT と書け、尺度は次元解析で決まるが形状係数 S の中身は解・実験が要ること。例題4.7（無次元化を先に行う実演）と、記号 Γ の定義が例題4.6と例題4.7で異なる注意（通読時の既知事項）も収録。講義例: L=0.040 m、k=15、ΔT=80 K、S/L=2.50（与えた値）→ S=0.100 m、Q=120 W。全寸法2倍の相似拡大で Q=240 W、平均流束は半分。棒と形状スケッチはどちらも正確な 1:2 比。

## 検証

- 9ファイルとも XML 構文解析に合格（Python ElementTree）。
- 専用テストはローカルで9ファイルを個別指定により実行し、**36件すべて合格・0失敗**（`node --test tests/lesson-diagram-1-3.test.mjs tests/lesson-diagram-1-4.test.mjs tests/lesson-diagram-1-5.test.mjs tests/lesson-diagram-2-1.test.mjs tests/lesson-diagram-2-2.test.mjs tests/lesson-diagram-2-5.test.mjs tests/lesson-diagram-3-1.test.mjs tests/lesson-diagram-4-1.test.mjs tests/lesson-diagram-4-4.test.mjs`）。テストは SVG 内の `data-*` 数値条件から物理量を独立に再計算して照合し、曲線の描画点（§2.1 は41点の放物線と左右対称性、§2.2・§4.1 は21点の直線）と棒・分割バーの比例関係も検証する。
- 既存の `tests/lesson-diagrams-integration.test.mjs`（登録済み28節の検査）も 3件合格・0失敗で、本パッケージの追加が既存統合状態を壊さないことを確認した。
- テキストのはみ出しは、文字幅の寸法見積もり（全角＝フォントサイズ、半角＝0.55倍）で全行を機械チェックし、境界的な4行を修正して見積もり上の超過0件とした。
- **未実施**: レンダラーによる描画目視確認（この環境に CairoSVG 等の SVG レンダラーが無いため）、CI、実機（ブラウザ・モバイル・スクリーンリーダー）、外部専門家校閲。

## 統合時の組み込み手順

1. 本ブランチの19ファイル（SVG 9点・テスト9点・本ドキュメント）を統合先ブランチへ取り込む。配置は図解ラインと同一（`assets/lesson-diagrams/`、`tests/`）で、既存ファイルとの衝突はない（対象9節のアセットは他ラインに存在しない）。
2. テスト9ファイルを個別指定で実行し、全件合格を確認する。
3. レッスン画面への組み込みは、既存図解と同一の仕組み（`lesson-diagrams.mjs` の対応表）へ次を登録する。**本パッケージでは UI ファイルを変更していない。**
   - 1.3 → `assets/lesson-diagrams/section-1-3-three-modes-comparison.svg`
   - 1.4 → `assets/lesson-diagrams/section-1-4-roadmap-series-resistance.svg`
   - 1.5 → `assets/lesson-diagrams/section-1-5-problem-solving-uncertainty.svg`
   - 2.1 → `assets/lesson-diagrams/section-2-1-heat-equation-control-volume.svg`
   - 2.2 → `assets/lesson-diagrams/section-2-2-slab-method-linear-profile.svg`
   - 2.5 → `assets/lesson-diagrams/section-2-5-composite-wall-summary.svg`
   - 3.1 → `assets/lesson-diagrams/section-3-1-hx-configurations-balance.svg`
   - 4.1 → `assets/lesson-diagrams/section-4-1-well-posed-boundary-conditions.svg`
   - 4.4 → `assets/lesson-diagrams/section-4-4-shape-factor-scaling.svg`
4. 公開ビルドのアセット許可リストへ9点を追加し、公開サイトで表示されることを確認する。
5. 統合後は実機（ライト／ダーク両モード）で9点の表示を確認する。
