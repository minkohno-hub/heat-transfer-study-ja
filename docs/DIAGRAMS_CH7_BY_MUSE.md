# 図解追加パッケージ（Muse 側）：第7章 §7.1・§7.3・§7.4・§7.5・§7.6・§7.7

作成: フェイリス（Muse）コーディング参加・図解量産パッケージ D4、2026-10-31
ブランチ: `muse/diagrams-ch7`（起点は PR #1 ブランチ `codex/quality-audit-local-pack` の `4195f6a`。PR は作成しない。統合は統合フェーズで実施）

## 担当範囲の確定

既存図解は28点あり、第7章は §7.2（`section-7-2-laminar-pipe-entrance-lengths.svg`）のみ作成済みだった。本パッケージは未作成だった **§7.1・§7.3・§7.4・§7.5・§7.6・§7.7** を担当し、図解ライン（`docs/PARALLEL_CHAT.md`）の配置・命名規約・専用テスト形式に完全に倣って作成した。これにより第7章は 7/7 節の図解がそろう（既存分と合わせ、アプリ全体では34点）。

各 SVG はすべて独自作図で、原書の図の転載・トレースはしていない。自己完結（外部参照なし）、`title`/`desc`、`viewBox`、ライト／ダーク配色、`data-lesson`・`data-origin="original-app-diagram"` と数値条件の `data-*` 属性を持ち、末尾に「アプリ作成の独自模式図」と明記している。数値は各節の現行レッスン（`data/original-deep-lessons.json`）の独立仮想例に一致させ、原書テキスト（AHTT 6th ed.）と通読ダイジェストで裏取りした。UI ファイル（`lesson-diagrams.mjs`・`app.js` 等）は変更していない。

## 作成物

### §7.1 内部流・外部流の導入（長方形ダクトの水力直径）

- SVG: `assets/lesson-diagrams/section-7-1-rectangular-duct-hydraulic-diameter.svg`（840×1180）
- テスト: `tests/lesson-diagram-7-1.test.mjs`（4件）
- 内容: レッスンの仮想例（長方形ダクト a=0.020 m × b=0.010 m、U_b=2.0 m/s、ρ=1.2 kg/m³、μ=1.8×10⁻⁵ Pa·s）で、A_c=2.0×10⁻⁴ m²、P_w=0.060 m、D_h=4A_c/P_w=0.01333 m、q_v=4.0×10⁻⁴ m³/s、ṁ=4.8×10⁻⁴ kg/s、Re_Dh=1778 を計算の流れで示す。長さ 0.50 m は L/D_h=37.5 で、層流円管の速度助走長の目安 0.05Re=88.9 より短いことを共通軸の棒で比較し、「円管の目安でも十分発達とは即断できない」「濡れ周長 P_w と加熱周長 P_h は別定義」を明記。根拠: D_h の定義は原書 (7.60)、バルク温度・断面平均の定義は §7.1 (7.3)–(7.5)。

### §7.3 管内乱流（相関の系譜と摩擦）

- SVG: `assets/lesson-diagrams/section-7-3-turbulent-pipe-correlations-friction.svg`（840×1220）
- テスト: `tests/lesson-diagram-7-3.test.mjs`（4件）
- 内容: レッスンの仮想例（D=0.020 m、L=1.0 m、U_b=5.0 m/s、ρ=1000 kg/m³、μ=0.0010 Pa·s、c_p=4200 J/(kg·K)、k_f=0.60 W/(m·K)、Re_D=10⁵、Pr=7.0）で、冪乗形3式と Gnielinski 式の Nu を共通軸の棒で比較。**統合 Stage 2 で適用済みの FC-23（原書の系譜 (7.39a)–(7.39c)）に一致させた**: Colburn 0.023 Pr^(1/3)=440.0、Dittus–Boelter 0.0243 Pr^0.4=529.2、McAdams 0.0225 Pr^0.4=490.0、Gnielinski (7.41)=599.1（h≈1.797×10⁴ W/(m²·K)）。摩擦は平滑管近似 (7.42) 系の f_D=(0.79 ln Re_D −1.64)^(−2)=0.01799（Darcy）から Δp_f=11.25 kPa、流体動力 17.66 W。「係数 0.023 は Colburn のもの」「初期の冪乗式の誤差は最大 +25%/−40% 程度」も原書 §7.3 の記述どおりに明記。

### §7.4 伝熱面を熱交換器として見る（一定壁温・NTU）

- SVG: `assets/lesson-diagrams/section-7-4-constant-wall-temperature-ntu.svg`（840×1180）
- テスト: `tests/lesson-diagram-7-4.test.mjs`（4件）
- 内容: 一定壁温 80 ℃・入口 20 ℃・C=ṁc_p=100 W/K・h=50 W/(m²·K)・A_s=P_hL=2.0 m² で NTU=1.0 とし、T_b(x)=80−60 exp(−x/10) の応答曲線を21点で実プロット。T_out=57.93 ℃、Q̇=3792.72 W、ε=1−exp(−NTU)=0.6321。LMTD（ΔT_in=60 K、ΔT_out=22.07 K → 37.93 K）でも hA_s×LMTD=3792.72 W と一致すること、入口差だけでは 6000 W と過大になることを示す。根拠: 原書 (7.57)（指数応答）・(7.58)（ε=1−exp(−NTU)）。

### §7.5 非円形ダクト（正方形ダクト）

- SVG: `assets/lesson-diagrams/section-7-5-square-duct-nusselt-friction.svg`（840×1210）
- テスト: `tests/lesson-diagram-7-5.test.mjs`（4件）
- 内容: 一辺 a=0.010 m の正方形ダクト（A_c=1.0×10⁻⁴ m²、P_w=0.040 m、D_h=0.010 m、Re=1000、十分発達層流）で、Nu の比較棒（正方形・壁温一定 2.98／正方形・熱流束条件 3.61／円管・壁温一定 3.66）と摩擦定数 f_DRe の比較棒（正方形 56.91／円管 64）を示す。h=178.8 W/(m²·K)、評価断面（ΔT=20 K）で q̄″=3576 W/m²、q′=143.04 W/m、発達区間 L=5.0 m の Δp_f=142.3 Pa（円管定数では 160.0 Pa）。Nu の3値は原書 Table 7.4（正方形 2.976/3.608、円 3.657）の丸めで、レッスン提示値と一致。f_DRe=56.91 はレッスンが提示する代表値（Shah & London 系）で、原書テキスト抽出からは直接の記載を確認できなかったため、その旨をここに明記する（円管の 64 は原書の層流摩擦の基本値）。

### §7.6 円柱横流れ（Churchill–Bernstein）

- SVG: `assets/lesson-diagrams/section-7-6-cylinder-crossflow-churchill-bernstein.svg`（840×1180）
- テスト: `tests/lesson-diagram-7-6.test.mjs`（4件）
- 内容: 単独の長い円柱（D=0.020 m、L_z=0.50 m）への横流れ（U=5.0 m/s、T_s=60 ℃、T_∞=20 ℃、膜温度評価 ν=1.5×10⁻⁵ m²/s、Pr=0.70、k_f=0.026 W/(m·K)）の模式図（よどみ点・後流は模式表示で、剥離角等の数値は主張しない）と、Churchill–Bernstein 式 (7.65) の計算: Re_D=6667、Re_D Pr=4667＞0.2、Nū_D=42.74、h̄=55.56 W/(m²·K)。伝熱面積は側面積 πDL_z=0.03142 m²（投影面積 DL_z=0.010 m²ではない）ことを棒で比較し、Q̇_conv=69.82 W。原書 §7.6 のとおり物性は膜温度評価。

### §7.7 相関式の選定と評価（不確かさと残差）

- SVG: `assets/lesson-diagrams/section-7-7-correlation-uncertainty-residuals.svg`（840×1160）
- テスト: `tests/lesson-diagram-7-7.test.mjs`（4件）
- 内容: レッスンの仮想実験（Q̇_conv=100 W、A=0.20 m²、ΔT=25 K → h_obs=20.0 W/(m²·K)）で、独立な相対標準不確かさ（熱流2%・面積1%・温度差3%）の RSS 合成 3.74%（u_h=0.748）を内訳棒で示し、数直線上に観測値と不確かさ帯、候補 18（残差 −10%）と 24（+20%）を配置。「一点では候補Aが近い」ことと「全範囲の優劣・観測＝真値は証明されない」ことの区別を明記。本節はアプリ独自の補足節であり、数値は標準的な不確かさ伝播（一次・独立近似）によるレッスンの仮想例である。

## 検証

- 6ファイルとも XML 構文解析に合格（Python ElementTree）。
- 専用テストはローカル（Node v24.22.1）で6ファイルを個別指定して実行し、**24件すべて合格・0失敗**（`node --test tests/lesson-diagram-7-1.test.mjs tests/lesson-diagram-7-3.test.mjs tests/lesson-diagram-7-4.test.mjs tests/lesson-diagram-7-5.test.mjs tests/lesson-diagram-7-6.test.mjs tests/lesson-diagram-7-7.test.mjs`）。テストは SVG 内の `data-*` 数値条件から物理量を独立に再計算して照合する（§7.4 は曲線21点の座標照合、§7.3 は FC-23 系譜の指数の帰属確認を含む）。
- 数値の事前検算は高精度計算（mpmath、30桁）でも実施し、上記の全数値がレッスン提示値と一致することを確認した。
- **未実施**: レンダラーによる描画目視確認（座標・文字量は既存図解の密度に合わせて設計し、寸法計算で回避）、CI、実機（ブラウザ・モバイル・スクリーンリーダー）、外部専門家校閲。

## 統合時の組み込み手順

1. 本ブランチの13ファイル（SVG 6点・テスト6点・本ドキュメント）を統合先ブランチへ取り込む。配置は図解ラインと同一（`assets/lesson-diagrams/`、`tests/`）で、既存ファイルとの衝突はない（§7.1・§7.3–§7.7 のアセットは他ラインに存在しない）。
2. テスト6ファイルを個別指定で実行し、全件合格を確認する。
3. レッスン画面への組み込みは、既存図解と同一の仕組みで、節 ID とアセットの対応を登録する。
   - 7.1 → `assets/lesson-diagrams/section-7-1-rectangular-duct-hydraulic-diameter.svg`
   - 7.3 → `assets/lesson-diagrams/section-7-3-turbulent-pipe-correlations-friction.svg`
   - 7.4 → `assets/lesson-diagrams/section-7-4-constant-wall-temperature-ntu.svg`
   - 7.5 → `assets/lesson-diagrams/section-7-5-square-duct-nusselt-friction.svg`
   - 7.6 → `assets/lesson-diagrams/section-7-6-cylinder-crossflow-churchill-bernstein.svg`
   - 7.7 → `assets/lesson-diagrams/section-7-7-correlation-uncertainty-residuals.svg`
4. 公開ビルドのアセット許可リストへ6点を追加し、公開サイトで表示されることを確認する（組み込み・許可リスト追加は全図解共通の統合工程として行うこと）。
5. 統合後は実機（ライト／ダーク両モード）で6点の表示を確認する。
