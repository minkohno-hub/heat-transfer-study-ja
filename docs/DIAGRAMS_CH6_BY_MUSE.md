# 図解追加パッケージ（Muse 側）：第6章 §6.2〜§6.9（D3）

作成: フェイリス（Muse）コーディング参加・図解量産パッケージ D3、2026-10-31
ブランチ: `muse/diagrams-ch6`（起点は PR #1 ブランチ `codex/quality-audit-local-pack` の `4195f6a`。PR は作成しない。統合は統合フェーズで実施）

## 担当範囲の確定

起点ブランチの `assets/lesson-diagrams/` は28点で、第6章は §6.1（図解ライン第8チャンク）のみだった。本パッケージは未作成の **§6.2・§6.3・§6.4・§6.5・§6.6・§6.7・§6.8・§6.9 の8節** を担当し、図解ラインの記録 `docs/PARALLEL_CHAT.md` の配置・命名規約・専用テスト形式に完全に倣って作成した。これにより第6章は 9/9 節の図解がそろう。各 SVG は独自作図（原書の図の転載・トレースなし）、自己完結（外部参照なし）、`title`/`desc`、`viewBox`、ライト／ダーク配色、`data-lesson`・`data-origin="original-app-diagram"` と数値条件の `data-*` 属性を持ち、末尾に「アプリ作成の独自模式図」と明記している。

数値はいずれも**現行レッスン（`data/original-deep-lessons.json`）の workedExample と同一条件** を用い、原書テキスト・通読ダイジェスト（第6章）で式番号と形を裏取りし、高精度計算（mpmath）で検算してから使った。特に §6.8・§6.9 は統合 Stage 2 で適用済みの **FC-18（原書 (6.112) 気体 Pr^0.6／(6.113) 非金属液体 Pr^0.43 の使い分け、§6.9 の補正 C′ の Pr 依存化）** に合わせ、旧来の Pr^(1/3) 一律表記を乱流相関に持ち込んでいない（§6.9 の C′ 内の層流項に現れる Pr^(1/3) は層流相関由来の正しい形）。

## 作成物

### §6.2 Blasius 相似解：速度分布・層厚・摩擦

- SVG: `assets/lesson-diagrams/section-6-2-blasius-similarity-friction.svg`（820×1180）
- テスト: `tests/lesson-diagram-6-2.test.mjs`（4件）
- 内容: 相似変数 η（原書 6.17）と Blasius 方程式（6.18）。x=L 断面の速度分布 u/U=f′(η) を、f″(0)=0.332057 を初期値とする ODE の数値解から描画（η=4.92 で u/U≈0.99 を確認）。δ_99(x)=5x/√Re_x（6.2）の √x 成長曲線。レッスン例（U=2.0 m/s、L=0.50 m、W=0.20 m、ν=1.5×10⁻⁵、ρ=1.2）: Re_L=66666.7、δ_99=0.00968246 m、C_f,L=0.00257166（6.33）、τ_w(L)=0.00617199 Pa（6.32）、C̄_f,L=0.00514332（6.34、末端局所値の2倍）、片面抗力 D_f=0.00123440 N。テストは RK4 による独立した Blasius 解と描画点25点を照合する。

### §6.3 エネルギー方程式と積分熱収支

- SVG: `assets/lesson-diagrams/section-6-3-energy-equation-integral-balance.svg`（820×1090）
- テスト: `tests/lesson-diagram-6-3.test.mjs`（3件）
- 内容: 一般形 ρc_p DT/Dt = k∇²T + Φ + q‴（原書 6.37）から境界層形 u∂T/∂x + v∂T/∂y = α_f ∂²T/∂y²（6.40）への省略と、壁面の Fourier 則 q_w″=−k_f(∂T/∂y)_w（6.5 の h 定義）。レッスン例（ρ=1.2、c_p=1000、∫u(T−T∞)dy=0.040 m²·K/s、W=0.20、L=0.50、ΔT=60 K）: 単位幅 48.0 W/m、全入熱 Q̇=9.60 W = 下流顕熱増加（等幅バーで収支の一致を表示）、平均 q̄″=96.0 W/m²、平均 h̄=1.60 W/(m²·K)。局所 h は積分だけでは決まらない旨を明記。

### §6.4 Prandtl 数と二つの境界層

- SVG: `assets/lesson-diagrams/section-6-4-prandtl-thickness-ratio.svg`（820×1160）
- テスト: `tests/lesson-diagram-6-4.test.mjs`（4件）
- 内容: Pr=ν/α_f（原書 6.44）と厚さ比 δ_t/δ ∼ Pr^(−1/3)（6.55）。レッスン例（U=1.0、x=0.40、ν=8.0×10⁻⁶、α_f=1.0×10⁻⁶）: Pr=8、Re_x=50000、δ_99=0.00894427 m、温度層の尺度はその 0.50 倍で約 4.47 mm（比例係数1の概略と明記）。厚さ比バーは Pr=0.7→1.126、Pr=1→1.000、Pr=8→0.500。静止拡散の Pr^(−1/2)≈0.354 との混同防止、h=k_f/δ_t と厳密に置かない注意を含む。

### §6.5 層流平板の局所・平均 Nusselt 数

- SVG: `assets/lesson-diagrams/section-6-5-laminar-local-average-nusselt.svg`（820×1120）
- テスト: `tests/lesson-diagram-6-5.test.mjs`（4件）
- 内容: 局所相関 Nu_x=0.332 Re_x^(1/2) Pr^(1/3)（6.58）による h_x(x) ∝ x^(−1/2) の曲線（29点を式から生成）と、平均が末端局所値の2倍になる関係。レッスン例（U=3.0、L=0.30、W=0.20、ν=1.5×10⁻⁵、Pr=0.70、k_f=0.026、ΔT=40 K）: Re_L=60000、Nū_L=144.414（6.68）、h̄_L=12.5159、片面 Q̇=30.0381 W、h_x(L)=6.25795。等熱流束では係数が変わる（6.71）旨と前縁発散は近似の産物である旨を明記。

### §6.6 Reynolds–Colburn の類推

- SVG: `assets/lesson-diagrams/section-6-6-reynolds-colburn-analogy.svg`（820×1100）
- テスト: `tests/lesson-diagram-6-6.test.mjs`（4件）
- 内容: St の定義（6.75）と類似 St Pr^(2/3)=C_f/2（6.77）の手順図。レッスン例（C_f=0.0040、ρ=1.2、c_p=1000、U=5.0、Pr=0.70、ΔT=50 K）: j_H=0.0020、St=0.00253687、h=15.2212、q_w″=761.061。Pr=1 と無条件に置いた h=12.0 とのバーを比較。崩れる場合（等熱流束壁 6.78、圧力勾配、液体金属）は原書の明示リストに従う。なお原書では §6.6 の類似は等温壁でのみ成立し、§6.8 の (6.111) は両条件に使える点も §6.8 図に記載した。

### §6.7 乱流の壁単位：粘性底層と対数則

- SVG: `assets/lesson-diagrams/section-6-7-turbulent-wall-units-log-law.svg`（820×1180）
- テスト: `tests/lesson-diagram-6-7.test.mjs`（4件）
- 内容: 壁単位 u_τ・y⁺・u⁺（原書 6.93）と、粘性底層 u⁺≈y⁺（6.96、y⁺≲7）、緩衝層、対数則（6.101、y⁺≳30）を対数軸上に描画。レッスン例（τ_w=0.12 Pa、ρ=1.2、ν=1.5×10⁻⁵）: u_τ=0.316228 m/s、y=0.10 mm で y⁺=2.10819・ū≈0.666667 m/s、y=5.0 mm で y⁺=105.409・対数則 ū≈5.17368 m/s。
- 注記: 対数則の定数はレッスンの workedExample に合わせ κ=0.41・B=5 とした。原書 (6.101) の B は ≃5.5 であり、レッスン側の値と異なる。図は現行レッスンとの一致を優先した（レッスン側の定数見直しは本パッケージの範囲外）。

### §6.8 乱流熱伝達：気体と液体で違う Pr 指数

- SVG: `assets/lesson-diagrams/section-6-8-turbulent-gas-liquid-correlations.svg`（820×1200）
- テスト: `tests/lesson-diagram-6-8.test.mjs`（4件）
- 内容: 原書の2式（気体 (6.112) Pr^0.6／非金属液体 (6.113) Pr^0.43）の使い分けと、Pr^(1/3) 一律形が原書の式ではない旨の明示（FC-18）。推奨形 (6.111) と Pr_t の区別も記載。レッスン例（気体、U=10、L=1.0、W=0.20、ν=1.5×10⁻⁵、Pr=0.70、k_f=0.026、ΔT=40 K）: Re_L=666666.7、局所 Nu_x(L)=1090.128、平均 Nū_L=1362.660（局所の 5/4 倍）、h̄_L=35.4292、片面 Q̇=283.433、h_x(L)=28.3433。同じ Re_x での液体（Pr=7）局所値 3370.304 とのバー比較（流体種・Pr が異なる比較である旨を明記）。

### §6.9 遷移を含む全体熱伝達

- SVG: `assets/lesson-diagrams/section-6-9-transition-mixed-average.svg`（820×1160）
- テスト: `tests/lesson-diagram-6-9.test.mjs`（4件）
- 内容: 層流→乱流の急切替近似の区間積分。レッスン例（U=15、L=1.0、W=0.20、ν=1.5×10⁻⁵、Pr=0.70、k_f=0.026、ΔT=40 K、Re_c=5×10⁵）: x_c=0.50 m（板図の区間幅はこの比に比例）、C′=0.037 Re_c^0.8 Pr^0.6 − 0.664 Re_c^(1/2) Pr^(1/3) = 1082.52 − 416.89 = 665.634、混合平均 Nū_L=1219.146、前縁から全乱流の 1884.779 とのバー比較、h̄_L=31.6978、片面 Q̇=253.582。C′ が Re_c と Pr の両方に依存し固定値（871 等）でないこと、Re_L=Re_c で層流平均 416.888 に一致する連続性検算、原書の3域統合 (6.117)〜(6.120) との関係を明記。

## 検証

- 8ファイルとも XML 構文解析に合格（Python ElementTree）。
- 専用テストはローカル（Node）で8ファイルを個別指定により実行し、**31件すべて合格・0失敗**（`node --test tests/lesson-diagram-6-2.test.mjs … tests/lesson-diagram-6-9.test.mjs`、内訳 4+3+4+4+4+4+4+4）。テストは SVG 内の `data-*` 数値条件から物理量を独立に再計算して照合する（§6.2 は Blasius ODE の RK4 独立解、§6.9 は Re_L=Re_c での連続性まで検証）。
- 数値の事前検算は高精度計算（mpmath）でも実施し、レッスンの workedExample の表示値と全点で一致することを確認した。
- **未実施**: レンダラーによる描画目視確認（この環境に SVG レンダラーが無いため。文字量・座標は既存図の密度に合わせて設計）、CI、実機（ブラウザ・モバイル・スクリーンリーダー）、外部専門家校閲。

## 統合時の組み込み手順

1. 本ブランチの17ファイル（SVG 8点・テスト8点・本ドキュメント）を統合先ブランチへ取り込む。配置は図解ラインと同一（`assets/lesson-diagrams/`、`tests/`）で、§6.2〜§6.9 のアセットは他ラインに存在しないため衝突はない。
2. テスト8ファイルを個別指定で実行し、全件合格を確認する。あわせて `tests/lesson-diagrams-integration.test.mjs` の図解総数・対応表へ8節分を追加する（本パッケージの範囲外として未変更）。
3. レッスン画面への組み込みは、既存図解と同一の仕組みで節 ID とアセットを対応づける。
   - 6.2 → `assets/lesson-diagrams/section-6-2-blasius-similarity-friction.svg`
   - 6.3 → `assets/lesson-diagrams/section-6-3-energy-equation-integral-balance.svg`
   - 6.4 → `assets/lesson-diagrams/section-6-4-prandtl-thickness-ratio.svg`
   - 6.5 → `assets/lesson-diagrams/section-6-5-laminar-local-average-nusselt.svg`
   - 6.6 → `assets/lesson-diagrams/section-6-6-reynolds-colburn-analogy.svg`
   - 6.7 → `assets/lesson-diagrams/section-6-7-turbulent-wall-units-log-law.svg`
   - 6.8 → `assets/lesson-diagrams/section-6-8-turbulent-gas-liquid-correlations.svg`
   - 6.9 → `assets/lesson-diagrams/section-6-9-transition-mixed-average.svg`
4. 公開ビルドのアセット許可リストへ8点を追加し、公開サイトで表示されることを確認する。
5. 統合後は実機（ライト／ダーク両モード）で8点の表示を確認する。
