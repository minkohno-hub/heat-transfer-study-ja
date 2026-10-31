# 独立作成の講座・計算式に関する外部資料照合（2026-10-28）

この記録は、**一般的な熱移動・物質移動の代表式が第三者の公開資料と矛盾しないか**を重点的に調べたものです。書籍の本文・原図のコピー、逐文検証、全問の外部専門家校閲、出版社の許諾確認を行ったという意味ではありません。以下は数式の適用範囲に関する参照先で、講座の文章は独立に執筆しています。

| 対象 | 公開資料 | 確認した式・解釈 | 主要な前提／注意 |
|---|---|---|---|
| 円筒壁の定常熱伝導 | [Colorado State University](https://www.engr.colostate.edu/CBE101/topics/heat_transfer.html) | `R=ln(r₂/r₁)/(2πkℓ)` | 半径方向・定常・一定物性。内外面積は異なる |
| 熱交換器の有効度・NTU | [ASHRAE Handbook 2025, Chapter 4](https://handbook.ashrae.org/Handbooks/F25/SI/f25_ch04/f25_ch04_si.aspx) | `NTU=UA/C_min`、`C_r=C_min/C_max`、`ε=Q_actual/Q_max` | 熱容量流量と流れの配置を確定する。相変化などでは条件が変わる |
| 一定断面・先端断熱フィンの効率 | [Georgia Tech ME 6300](https://minds.gatech.edu/Teaching/ME_6300/Class%20lectures.pdf) | `η_f=tanh(mL)/(mL)` | 一次元定常、側面対流、先端断熱、一定k・h |
| 半無限体の一定表面温度応答 | [NC State University資料](https://repository.lib.ncsu.edu/bitstreams/e129cfbe-f452-4a4a-afe7-bd40db4665d4/download) | `(T−T_i)/(T_s−T_i)=erfc[x/(2√(αt))]` | 反対面の影響が小さい時間、表面温度一定 |
| 平板層流の局所Nuと平均Nu | [Volupe技術資料](https://volupe.com/support/empirical-correlations-for-convective-heat-transfer-coefficients/) | `0.332√Re_x Pr^(1/3)`、平均`0.664√Re_L Pr^(1/3)` | 等温壁、非圧縮性、一定物性、全域層流、概ねPr≥0.6 |
| 円管の十分発達した層流 | [ASHRAE Handbook 2025, Chapter 4](https://handbook.ashrae.org/Handbooks/F25/SI/f25_ch04/f25_ch04_si.aspx) | 壁面温度一定で`Nu_D=3.66`、壁面熱流束一定で`4.36` | 円管・十分発達した層流。入口助走・非円形には流用しない |
| 自然対流Ra | [東京都立大学・流体力学解説](https://aeroastro.sd.tmu.ac.jp/hydrodynamics/main/about/NaturalConvection.html) | `Ra=gβΔTL³/(αν)=GrPr` | 流動形状・境界条件・Boussinesq近似の適否を確認 |
| 放射形態係数 | [Space Thermal Design Handbook, Section 4](https://standards.iteh.ai/catalog/standards/sist/f947a59d-0512-4a77-bc74-6158b5953520/sist-tp-cen-clc-tr-17603-31-01-2021) | `A₁F₁₂=A₂F₂₁`、閉じた囲いの`ΣF_ij=1` | 拡散的な面と幾何学的な到達割合 |
| フィックの第1法則 | [Cambridge University Press公開抜粋](https://assets.cambridge.org/97805216/24091/excerpt/9780521624091_excerpt.pdf) | `J_A=−D_AB(dC_A/dx)` | 一次元・二成分の単純化、全モル流束と拡散流束を区別 |

## 数値計算の独立検査

新設の33問について、回答欄の正解位置だけでなく、異なる手順で計算した数値と説明内容を照合する`tests/chapter-lessons.test.mjs`を用意した。円筒壁・フィン・熱交換器・半無限体・強制対流・自然対流・潜熱・放射形態係数・フィック流束の数値例を含む。

**不整合発見例：**自然対流の数値例で、`10×0.003×10×0.1³/(1e-5×2e-5)`の値は **1.5×10⁶**。初稿で表示した **1.5×10⁷** を修正し、数値検査を回帰テストに追加した。自動テストと独立した公開数式資料の両方で検査した。

## なお検証されていないこと

1. 書籍の全節について原本を直接読み込み、各例題・導出・図・境界条件と講座が対応しているかの逐文比較。
2. 新規教材の全ての文章の外部専門家による学術的査読、すべての資料の妥当性評価。
3. iPhone Safari、実機Android、音声読み上げや支援技術による動作確認。
4. 出版社から受領したPDF公開許可が、日本語訳や図表の独立公開に及ぶかの別途確認。

今回の11章補助講座と33問は独立執筆・独立作問で、原本の翻訳や改変ではありません。以上は一部の原理式の照合にすぎず、完成済みの伝熱教科書と表現してはいけません。
