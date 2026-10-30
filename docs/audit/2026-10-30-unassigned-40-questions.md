# A-27｜章ID未割付40問の独立監査と原本参照追跡

- **監査日**：2026-10-30 JST、専用ブランチ`chat/audit`、固定起点`c8d207710374411694898093ca9d6adc16fa0fcf`。
- **対象**：`data/questions.json`543問のうち**`source.chapterId`がない40問**（うち`source.type="supplement"`の学習ガイド/シミュレーター32問、`source.type="book"`の原著節/ページを指す8問）。他の章別503問とはIDで非重複。
- **検証範囲**：40問全件の4択・正答index・同文重複・単位・符号を点検。定常平板・対流・灰色面放射・直列熱抵抗・Bi/Fo/α・集中熱容量・Re/Pr/Nu・LMTD・熱交換器・閉系第一法則・沸騰曲線と球形泡の**明示数値を独立再計算**した。
- **結果**：**4択構造違反0件、数値/正答キーの明白な誤り0件**。データの追跡性に関する指摘**1件**、原著の節/ページ/式/図の**直接照合未了に関する検証課題1件**。
- **原著公式**：[A Heat Transfer Textbook, 6th ed.](https://ahtt.mit.edu/)。書籍型問題に記載された`bookPages`、`pdfPages`、`equation`、`figure`は**ソースデータの値を読んだだけ**。この監査で実際にPDFページ画像へアクセスして一次資料との一致を確認したわけではない。

## A-27-001｜中：学習ガイド問題40問にchapterIdがなく、章別監査・出題集計から欠落し得る

- **場所**：`data/questions.json`中の`source.chapterId`欠落40件。原著参照8件には`source.section`（§1.2、9.1、9.2）、ガイド32件には`source.guideId`（例`sim-conduction`、`learn-heat-exchanger`）が付く。
- **事実とリスク**：既存の内容を`source.chapterId`だけで章集計する処理では、40問が**章不明として脱落する**。意図的に横断ガイド問題を章から独立させた設計である可能性もあるため、無条件に章IDを追加するのではなくUI・出題・フィルター・学習履歴の仕様を調べる必要がある。書籍8問は節の情報から章を特定できるが、ガイド32問の割付は学習シミュレーター側の扱いを確認する。
- **提案**：`source.type`・`guideId`・`section`・`chapterId`を含め、明示的な**「章別／ガイド別／原著対応」複数分類**と全件集計を設計。全問題が少なくとも一つの適切な出題/閲覧動線に含まれるか確認し、固定起点の543問と同数になることをテストする。問題ID・キー・端末保存履歴は壊さない。

## A-27-002｜要照合（中）：book由来8問のページ・式・図への一次資料対応は未確認

- **対象ID**：`book-9-1-transition-flux`、`book-9-1-before-inception`、`book-9-1-film-flux`、`book-9-1-peak-flux-risk`、`book-9-1-wire-flux`、`book-9-1-wire-temperature`、`book-9-2-bubble-radius`、`book-1-2-closed-energy-rate`。
- **判明していること**：モデルの一般的な物理的意味・設問計算は確認し、例えば電圧10V×電流2A/面積0.00020m²→**1.0×10⁵W/m²**、抵抗`R=4.10/2.00=2.05Ω`の補間→**150℃**、`R_b=2σ/Δp=40μm`、閉系エネルギー`dU/dt=120−30=90W`が一致。
- **未確定**：JSONの`bookPages=472〜478`、`pdfPages=486〜492`、図`9.1`、式`9.1`、§1.2の式`1.1`等が**正式な第6版PDFの該当内容・ページ番号と一致するか**はこの監査では確認していない。引用文面が「本書の式」「本書図」と称しているため、単なる算術以上の**一次資料一致検証**が必要。
- **Codexへ**：公開許諾済み原著PDFを実際に開いて**指定物理ページ・印刷ページ双方、図、式、条件を直接確認**し、ページジャンプと問題解説を照合する。確認前は「出典照合済み」と表示しない。この項目は**誤記が実証されたという指摘ではなく未実施の検証課題**。

## 全40問の一意性・正答追跡

正答は元JSONの0始まりindexに+1した位置。原著からの翻訳・転載の認証ではなく、問題ファイルの現在の正答キーを記録したもの。

| 問題ID | 区分 | 正答選択肢 | 評価 |
| --- | --- | --- | --- |
| `supp-flat-thickness` | ガイド sim-conduction | 1：元の値の半分になる | 算術/物理整合 |
| `supp-flat-numeric` | ガイド sim-conduction | 1：4,000 W | 算術/物理整合 |
| `supp-convection-numeric` | ガイド sim-convection | 1：800 W | 算術/物理整合 |
| `supp-convection-h` | ガイド sim-convection | 1：元の値の2倍になる | 算術/物理整合 |
| `supp-radiation-temperature` | ガイド sim-radiation | 1：273.15 K | 算術/物理整合 |
| `supp-radiation-numeric` | ガイド sim-radiation | 1：184.3 W | 算術/物理整合 |
| `supp-resistance-total` | ガイド sim-resistance | 1：0.85 K/W | 算術/物理整合 |
| `supp-resistance-flow` | ガイド sim-resistance | 1：70.6 W | 算術/物理整合 |
| `book-9-1-transition-flux` | 原著節 9.1 | 1：熱流束は減少する | 算術整合、原著本文未照合 |
| `book-9-1-before-inception` | 原著節 9.1 | 1：自然対流が主となる | 算術整合、原著本文未照合 |
| `book-9-1-film-flux` | 原著節 9.1 | 2：熱流束は増加する | 算術整合、原著本文未照合 |
| `book-9-1-peak-flux-risk` | 原著節 9.1 | 3：壁面温度が急激に上昇する | 算術整合、原著本文未照合 |
| `book-9-1-wire-flux` | 原著節 9.1 | 2：1.0×10⁵ W/m² | 算術整合、原著本文未照合 |
| `book-9-1-wire-temperature` | 原著節 9.1 | 2：150 ℃ | 算術整合、原著本文未照合 |
| `book-9-2-bubble-radius` | 原著節 9.2 | 2：4.0×10¹ μm | 算術整合、原著本文未照合 |
| `supp-audit-conduction-compensation` | ガイド sim-conduction | 3：変わらない | 算術/物理整合 |
| `supp-audit-conduction-reversed-sign` | ガイド sim-conduction | 2：−300 W | 算術/物理整合 |
| `supp-audit-conduction-inverse-k` | ガイド sim-conduction | 4：0.80 W/(m·K) | 算術/物理整合 |
| `supp-audit-convection-negative-direction` | ガイド sim-convection | 3：−1,000 W | 算術/物理整合 |
| `supp-audit-convection-inverse-h` | ガイド sim-convection | 1：25 W/(m²·K) | 算術/物理整合 |
| `supp-audit-convection-compensating-inputs` | ガイド sim-convection | 2：変わらない | 算術/物理整合 |
| `supp-audit-radiation-equal-temperatures` | ガイド sim-radiation | 2：正味の熱移動率は0 Wになる | 算術/物理整合 |
| `supp-audit-radiation-emissivity-scale` | ガイド sim-radiation | 4：3倍 | 算術/物理整合 |
| `supp-audit-radiation-same-delta-different-level` | ガイド sim-radiation | 3：Aのほうが大きい | 算術/物理整合 |
| `supp-audit-resistance-layer-temp-drop` | ガイド sim-resistance | 4：40 K | 算術/物理整合 |
| `supp-audit-resistance-overall-u` | ガイド sim-resistance | 1：2.0 W/(m²·K) | 算術/物理整合 |
| `supp-audit-resistance-one-layer-doubled` | ガイド sim-resistance | 2：9/11倍 | 算術/物理整合 |
| `supp-expanded-bi-calc` | ガイド learn-dimensionless-transient | 1：0.040 | 算術/物理整合 |
| `supp-expanded-fo-calc` | ガイド learn-dimensionless-transient | 3：1.0 | 算術/物理整合 |
| `supp-expanded-alpha-calc` | ガイド learn-dimensionless-transient | 2：5.0×10⁻⁶ m²/s | 算術/物理整合 |
| `supp-expanded-tau-calc` | ガイド learn-lumped-cooling | 4：2,000 s | 算術/物理整合 |
| `supp-expanded-lumped-temp` | ガイド learn-lumped-cooling | 1：34.7 ℃ | 算術/物理整合 |
| `supp-expanded-lumped-double-time` | ガイド learn-lumped-cooling | 3：6.8 K | 算術/物理整合 |
| `supp-expanded-re-calc` | ガイド learn-convection-dimensionless | 4：10,000 | 算術/物理整合 |
| `supp-expanded-pr-calc` | ガイド learn-convection-dimensionless | 1：8.0 | 算術/物理整合 |
| `supp-expanded-nu-calc` | ガイド learn-convection-dimensionless | 2：10.0 | 算術/物理整合 |
| `supp-expanded-hx-energy` | ガイド learn-heat-exchanger | 3：8,000 W | 算術/物理整合 |
| `supp-expanded-hx-lmtd-equal` | ガイド learn-heat-exchanger | 4：40 K | 算術/物理整合 |
| `supp-expanded-hx-area` | ガイド learn-heat-exchanger | 1：2.0 m² | 算術/物理整合 |
| `book-1-2-closed-energy-rate` | 原著節 1.2 | 3：+90 W | 算術整合、原著本文未照合 |

## 代表的な独立数値検算

| モデル | 正しい式と例題の値 |
| --- | --- |
| 定常平板・厚さ | `Q=kAΔT/L`、`10×2×20/.1=4000W`、kとLを同倍率2倍なら変化なし、`k=Q L/(AΔT)=.80W/(mK)`、符号付き逆向き例は`−300W` |
| 対流 | `Q=hA(T_s−T∞)`、`20×2×20=800W`、冷たい面なら`25×2×(0−20)=−1000W`、逆算`h=400/(1.6×10)=25W/(m²K)` |
| 黒体囲いへの放射 | `Q=εσA(T_s⁴−T_sur⁴)`、`ε=.5,A=1,T_s=300K,T_sur=200K`で`184.287W≈184.3W`。400K対300Kの四乗差と300K対200Kの差の比`17.5/6.5≈2.6923`、0℃は273.15K |
| 直列抵抗 | `R=.10+.20+.50+.05=.85K/W`、60K/.85→**70.588W**。`R=.90→1.10K/W`の変更は熱量比`9/11`。`U=1/(RA)=1/(.25×2)=2W/(m²K)` |
| Bi/Fo/集中熱容量 | `Bi=40(.002/.1)/20=.040`、`Fo=10⁻⁵×40/.020²=1`、`α_s=10/(1000×2000)=5×10⁻⁶m²/s`、`τ=(1000×.001×4000)/(20×.10)=2000s`。時定数後は`20+40e^{-1}≈34.7℃`、2τ後は`50e^{-2}≈6.8K` |
| Re/Pr/Nu・熱交換 | `Re=1000×.20×.050/.001=10000`、`Pr=.001×4000/.50=8`、`Nu=100×.050/.50=10`、`Q_hot=.20×2000×20=8000W`、等端末差のLMTD=40K、`A=8000/(100×40)=2m²` |
| 原著8問のうち数値例 | 沸騰加熱線`EI/A=20/.00020=10⁵W/m²`、抵抗補間150℃、球形泡`2×.060/3000=40μm`、閉じた系第一法則`dU/dt=+90W`。**原著の図・式・ページとの出典一致未確認** |

## Codexへの統合引き継ぎ

- 章別503問と本40問が重複なく`503+40=543`、全543問題IDに重複なし、4択とキーの構造違反なし。**固定起点の既存543問に対する一回目の静的数式・概念監査を全件完了**。
- 既存詳細レッスン54件もA-01〜A-24までに全件監査。ただし原著全76節の詳細講義**22節は固定起点で未収録**、全76節の本文/図/脚注を照合済みではない。
- 科学的に要修正の候補には、等方性未指定の熱流方向（A-09-001）、流動乾き度と平衡乾き度（A-19-001）、射度Jを「放射発散度」と誤称（A-23-001）、定常一次元の**断面積一定**前提不足（A-25-001）、低界面移動率を「低速」と誤読させる文面（A-26-001）がある。
- データ本体・PR #1へは直接変更しない。Codex本線が他ラインと差分照合し、必要な編集・E2E・原著逐頁照合・統合後再監査を実施する。
