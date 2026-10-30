# A-25｜第11章前半・既存53問の独立監査（章共通、§11.1〜11.6）

- **監査日**：2026-10-30 JST、`chat/audit`、固定起点`c8d207710374411694898093ca9d6adc16fa0fcf`。
- **対象**：`data/questions.json`全543問のうち`source.chapterId="ch11"`で**章共通4問**と、`source.focusSectionId`または`sectionNoteId`が**§11.1〜11.6**の各8、8、8、8、8、9問、合計**53問**。§11.7〜11.11の40問はA-25の対象外。
- **監査内容**：各問題IDの正答キー（0始まり）・4択数と一意性、符号・単位、モル/質量基準、Fick拡散とStefan流、成分保存の平面/円筒・球の違い、完全混合槽、半無限拡散のerfc、Schmidt/Sherwoodの濃度基準、熱・物質類推の成立条件を点検した。
- **判定**：計算値・採点キーの明白な誤り**0件**、4択構造違反**0件**。一方で**前提不足による科学的な問題文の一般化1件（中）**と、同型出題の重複**1件（低）**を確認。
- **重要な制約**：原著第6版PDF810頁の逐頁・図表・式番号・脚注照合と外部専門家査読は**未実施**。標準的な輸送方程式と既存JSONを独立に確認したもので、専門・ブラウザ実装全件合格ではない。参考：[原著公式](https://ahtt.mit.edu/)。

## A-25-001｜中：定常・無反応の「一次元系」でモル流束が一定という正答の条件不足

- **ID**：`supp-section-11-4`。
- **現行設問**：「定常・反応なしの一次元系で一定となるのは何か。」正答「成分Aのモル流束N_A」。
- **問題**：断面積が一様の**一次元平面系**であれば`dN_A/dx=0`なので妥当。しかし**球対称や円筒対称も一次元問題**として記述でき、定常・無反応・半径方向の成分保存は`(1/r²)d(r²N_{A,r})/dr=0`（球）または`(1/r)d(rN_{A,r})/dr=0`（円筒）。この場合、一定となるのは**全移動率`4πr²N_{A,r}`または`2πrL N_{A,r}`**で、局所流束`N_{A,r}`は半径で変わり得る。現在の設問は「一次元」のみに依存した過剰一般化。
- **正しい条件と提案**：問題に「**断面積が一定の平面一次元流路**」を明示し、正答を維持する。解説にも`dN_A/dx=0`を平面断面一定の条件として説明する。関連する§11.5詳細講義`blocks[1]`は「円筒や球では通過面積が位置で変わる」と正しく注意しており、問題文をこれに整合させる。
- **Codex統合**：問題ID・revision・採点キーと保存履歴への影響を確認して修正。監査ラインからJSON本体は変更しない。

## A-25-002｜低：基本的なScとFick流束を問う同技能演習の近接

- **問題ID例**：`supp-chapter-ch11-sc`（`ν/D=500`）と`supp-section-11-6`（Scの定義`ν/D`）、および`supp-chapter-ch11-fick`と`supp-applied-11-3-v1`（`J_A=−D∂C_A/∂x`の一段階計算）。
- **事実**：キー・数値は正しく、再確認のため意図的な反復なら有用だが、95点以上を狙う高度な知識の診断としては解法がほぼ同じ。ランダム出題では単純問題だけに偏る可能性。
- **提案**：片方を「全流束と拡散流束の混同」、「モル平均・質量平均の基準変更」、「円筒形の面積変化」など、別の計算・条件判断へ発展させるか技能タグで重複出題を抑える。

## 全53問のID・既存正答追跡表

正答番号は元JSONの0始まりindexを1始まりへ換算。本文と選択肢が違うため計算根拠は次節のグループ別検算を参照。

| 問題ID | 節 | キー・正答選択肢 | 監査 |
| --- | --- | --- | --- |
| `supp-chapter-ch11-fick` | 章共通 | 3：+2.0×10⁻⁷ mol/(m²·s) | 指摘参照 |
| `supp-chapter-ch11-sc` | 章共通 | 4：500 | 指摘参照 |
| `supp-chapter-ch11-sh` | 章共通 | 1：1,000 | キー・単位整合 |
| `supp-section-11-1` | 11.1 | 3：mol/(m²·s) | キー・単位整合 |
| `supp-section-11-2` | 11.2 | 2：0.4 | キー・単位整合 |
| `supp-section-11-3` | 11.3 | 1：正 | キー・単位整合 |
| `supp-section-11-4` | 11.4 | 4：成分Aのモル流束N_A | 指摘参照 |
| `supp-section-11-5` | 11.5 | 3：できない。N_Aが残る場合がある | キー・単位整合 |
| `supp-section-11-6` | 11.6 | 2：ν/D_AB | 指摘参照 |
| `supp-advanced-ch11-calc` | 章共通 | 4：+6.0×10⁻⁷ mol/(m²·s) | キー・単位整合 |
| `supp-applied-11-3-v1` | 11.3 | 2：+1.2×10⁻⁶ mol/(m²·s) | 指摘参照 |
| `supp-applied-11-6-v1` | 11.6 | 1：Sc=2000、Sh=1000 | キー・単位整合 |
| `supp-deep-fick-molar-concentration-v1` | 11.3 | 3：40.6 mol/m³ | キー・単位整合 |
| `supp-deep-fick-equimolar-flux-v1` | 11.3 | 1：+0.01219 mol/(m²·s) | キー・単位整合 |
| `supp-deep-fick-stefan-ratio-v1` | 11.3 | 4：1.15 倍 | キー・単位整合 |
| `supp-deep-fick-mass-flux-v1` | 11.3 | 2：+3.41×10⁻⁴ kg/(m²·s) | キー・単位整合 |
| `supp-fick-frame-total-flux-v1` | 11.3 | 3：+0.0050 mol/(m²·s) | キー・単位整合 |
| `supp-fick-stagnant-versus-equimolar-v1` | 11.3 | 4：N_B=0と置き、全モル流れの寄与を含める | キー・単位整合 |
| `supp-mass-intro-area-rate-v1` | 11.1 | 1：1.0×10⁻² mol/s | キー・単位整合 |
| `supp-mass-intro-molar-mass-rate-v1` | 11.1 | 2：3.0×10⁻⁴ kg/s | キー・単位整合 |
| `supp-mass-intro-diffusion-time-v1` | 11.1 | 3：4.0×10³ s | キー・単位整合 |
| `supp-mass-intro-uniform-advection-v1` | 11.1 | 4：全体流に運ばれ、N_A=+0.10 mol/(m²·s) | キー・単位整合 |
| `supp-mass-intro-stirring-versus-diffusivity-v1` | 11.1 | 1：流れや組成分布の効果と分子D_ABの変化を分けて判断する | キー・単位整合 |
| `supp-mass-intro-phase-conservation-v1` | 11.1 | 2：液相から気相へ移るが、両相のAの合計は保存される | キー・単位整合 |
| `supp-mass-intro-isothermal-composition-gradient-v1` | 11.1 | 3：組成の勾配が駆動し、温度差がなくても拡散は起こりうる | キー・単位整合 |
| `supp-mixture-mass-fraction-conversion-v1` | 11.2 | 4：0.25 | キー・単位整合 |
| `supp-mixture-density-from-moles-v1` | 11.2 | 1：M̄=0.032 kg/mol、ρ=1.60 kg/m³ | キー・単位整合 |
| `supp-mixture-molar-diffusion-reference-v1` | 11.2 | 2：J_A=+12、J_B=−12 mol/(m²·s) | キー・単位整合 |
| `supp-mixture-mass-diffusion-reference-v1` | 11.2 | 3：+0.30 kg/(m²·s) | キー・単位整合 |
| `supp-mixture-moving-observer-v1` | 11.2 | 4：N_A=30、J_A=12 mol/(m²·s) | キー・単位整合 |
| `supp-mixture-equal-fraction-condition-v1` | 11.2 | 1：二つの成分のモル質量が等しい | キー・単位整合 |
| `supp-mixture-negative-relative-flux-v1` | 11.2 | 2：固定系では正方向へ運ばれ、モル平均の移動に対しては負となる | キー・単位整合 |
| `supp-species-tank-storage-v1` | 11.4 | 1：+1.10×10⁻³ kg/s | キー・単位整合 |
| `supp-species-tank-fraction-rate-v1` | 11.4 | 2：+5.50×10⁻⁵ s⁻¹ | キー・単位整合 |
| `supp-species-source-volume-v1` | 11.4 | 3：1.0×10⁻⁴ kg/s | キー・単位整合 |
| `supp-species-reaction-mass-moles-v1` | 11.4 | 4：Σr_i=0であり、ΣR_iは非ゼロでもよい | キー・単位整合 |
| `supp-species-variable-coefficients-v1` | 11.4 | 1：∇·(ρD_AB∇w_A)の形を保って扱う | キー・単位整合 |
| `supp-species-boundary-outward-sign-v1` | 11.4 | 2：外へ出るので、−0.60 kg/sとなる | キー・単位整合 |
| `supp-species-initial-boundary-needed-v1` | 11.4 | 3：初期・境界条件や速度・反応モデルも確認する | キー・単位整合 |
| `supp-stationary-planar-flux-v1` | 11.5 | 4：+5.0×10⁻⁶ kg/(m²·s) | キー・単位整合 |
| `supp-stationary-erfc-profile-v1` | 11.5 | 1：0.0095900 | キー・単位整合 |
| `supp-stationary-cumulative-v1` | 11.5 | 2：約0.022568 kg/m² | キー・単位整合 |
| `supp-stationary-penetration-scale-v1` | 11.5 | 3：√tに比例するので、深さは2倍になる | キー・単位整合 |
| `supp-stationary-zero-reference-v1` | 11.5 | 4：質量平均速度0と、固定系での成分B流束0 | キー・単位整合 |
| `supp-stationary-stefan-log-v1` | 11.5 | 1：+0.0251314 mol/(m²·s) | キー・単位整合 |
| `supp-stationary-finite-thickness-v1` | 11.5 | 2：裏面の境界条件を含む有限厚さモデルを検討する | キー・単位整合 |
| `supp-lowrate-coefficient-basis-v1` | 11.6 | 3：9.0×10⁻³ mol/(m²·s) | キー・単位整合 |
| `supp-lowrate-sherwood-to-k-v1` | 11.6 | 4：6.23×10⁻³ m/s | キー・単位整合 |
| `supp-lowrate-re-sc-v1` | 11.6 | 1：Re_L≈6.67×10⁴、Sc=0.75 | キー・単位整合 |
| `supp-lowrate-average-local-v1` | 11.6 | 2：k̄_c=2k_c(L)となる | キー・単位整合 |
| `supp-lowrate-meaning-v1` | 11.6 | 3：界面移動が流れ等を強く変えない低い移動率 | キー・単位整合 |
| `supp-lowrate-correlation-scope-v1` | 11.6 | 4：幾何・流れ・境界条件・物性範囲を確認する | キー・単位整合 |
| `supp-lowrate-diffusivity-coefficient-v1` | 11.6 | 1：k_cは流れや形状にも依存し、D_ABと単位も異なる | キー・単位整合 |

## 独立数値・次元チェックの要点

- **§11.1〜11.3**：`D=2×10⁻⁹m²/s、dC/dx=−100mol/m⁴`で`J=+2×10⁻⁷mol/(m²s)`。`N_t=8×10⁻⁷,y_A=.25,dC/dx=−200`で`N_A=4×10⁻⁷+2×10⁻⁷=6×10⁻⁷`。`Sc=10⁻⁶/(2×10⁻⁹)=500`、`Sh=10⁻⁴×.020/(2×10⁻⁹)=1000`。`L=.002m,D=10⁻⁹`で拡散時間尺度4000秒。混合物の質量平均とモル平均、`J_i`と`j_i`を同一視しない。
- **§11.3 Stefan拡散**：`c=P/(RT)=40.622mol/m³`、等モル逆拡散`N_A≈.0121866`とB停滞`N_A≈.0139618mol/(m²s)`の比`≈1.14567`、設問の1.15倍と整合。B停滞は`N_B=0`であり`N_t=0`ではない。
- **§11.4 保存と槽**：`0.002−0.001+0.0001=+0.0011kg/s`、槽20kgなら`dw_A/dt=5.5×10⁻⁵s⁻¹`、`r_A V=.0050×.020=.0001kg/s`。外向き流束`.30kg/(m²s)`と面積2m²→蓄積寄与**−.60kg/s**。通常の化学反応で`Σr_i=0`と`ΣR_i`が一般に0でないことを区別。
- **§11.5〜11.6**：静止平板`ρD(w_0−w_L)/L=5×10⁻⁶kg/(m²s)`。半無限`w=.02erfc(.5)=.009590`、累積`2t j(t)=.022568kg/m²`。`Sc=1.2×10⁻⁶/(6×10⁻¹⁰)=2000`、`Sh=3×10⁻⁵×.020/(6×10⁻¹⁰)=1000`。`Re_L=66666.7,Sc=.75`、同じ理想層流平板の局所/平均`k̄_c=2k_c(L)`。
- **構造**：53問すべてが4択・正答index 0〜3・同文重複なし。原著逐頁照合やブラウザ採点実行はしていない。
