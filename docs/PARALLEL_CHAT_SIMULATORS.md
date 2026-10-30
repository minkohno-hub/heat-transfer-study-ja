# 並行開発ラインB：追加シミュレータ

- 専用ブランチ：`chat/simulators`
- 起点：PR #1 `codex/quality-audit-local-pack` の `c8d207710374411694898093ca9d6adc16fa0fcf`（2026-10-29確認）
- 作業範囲：既存の5シミュレータ・レッスン・問題・用語集・共有レジストリを一切変更せず、新規シミュレータと専用テストだけ追加
- PRは作成しない。共有ファイルへの統合は本ラインでは実施しない。

## 既存5シミュレータの棚卸し

| モード（`app.js`） | 既存の内容 | 関係する主題・節 | 新規実装との重複 |
| --- | --- | --- | --- |
| `conduction` | 一次元・定常平板伝導 `kAΔT/L` | §2.2 | フィンの軸方向温度分布は計算しない |
| `convection` | 表面対流 `hAΔT` | 第6〜8章の対流基礎 | 面内伝導と側面対流の連成は計算しない |
| `radiation` | 単純化した灰色面の正味放射 | 第10章 | フィン放射は新規モデルにも含めない |
| `resistance` | 2層平板＋両側対流の直列抵抗 | §2.3・§2.4 | フィン効率は計算しない |
| `transient` | 集中熱容量法による非定常冷却・加熱 | §5.1ほか | 内部温度を一様と近似し、フィン分布は扱わない |

棚卸し根拠：`app.js` の `SIM_META`・`simValues`・`renderSimulator`、`study-core.mjs` の `calculateHeatTransfer`・`calculateLumpedCooling`、`transient-ui.mjs`、`sim-diagrams.mjs`。節対応は関連主題に対する対応付けであり、書籍の節全体の再現を意味しない。

## 最初の新規モデル：§4.5 フィン設計

**追加ファイル**：`fin-efficiency.mjs`、`tests/fin-efficiency.test.mjs`、本記録。

対象は一定断面の**直線円柱フィン、断熱先端**。入力 `k` [W/(m·K)]、`h` [W/(m²·K)]、`length` [m]、`radius` [m]、`base` [℃]、`ambient` [℃]。

- 断面積 `Ac=πr²`、周長 `P=2πr`、側面積 `As=PL`。先端面積は側面積にも効率基準にも含まない。
- `m=sqrt(hP/(kAc))`、`z=mL`、`ηf=tanh(z)/z`、`Qideal=hAs(Tb−T∞)`、`Qf=ηf Qideal`。正の符号はフィンから流体への放熱。
- 温度分布 `T(x)=T∞+(Tb−T∞) cosh[m(L−x)]/cosh(mL)`。数値実装では指数関数による安定な比を使用し、大きな `mL` での双曲線余弦オーバーフローを回避。
- 原理・単位・代入手順・断熱先端の模式図・位置 `x/L` に対する温度グラフを純関数として実装。描画は既存アプリの `.sim-field`、`.simulation-steps`、`.simulation-figure`、`.sim-chart` などを再利用。
- 主な制約：定常・軸方向一次元、均質・温度非依存の `k`、一定 `h`、根元温度固定、先端断熱。放射、接触抵抗、先端対流、内部発熱、二次元効果、相変化、`h` の流動相関による予測は含まない。
- UIの数値入力は教育用の上下限で検証。絶対零度以下、空欄、非数、無限値、16進表記、単位範囲外を拒否。学術的な適用可能性は別途判断が必要。

### 自動検査

`node --test tests/fin-efficiency.test.mjs`

確認項目：①断面・周長・効率・根元伝導流の独立一致、②両端温度・先端断熱・単調性、③側面対流量の数値積分による収支検算、④温度差の符号反転と0 K、⑤短いフィン・長いフィン極限と大きなmLの数値安定性、⑥異常入力拒否、⑦描画とHTMLエスケープ。

実装前にローカルNode.js環境で **7テスト成功・0失敗**。リポジトリ全体の自動テスト、公開ビルド、実ブラウザ、スマートフォン、専門家による外部校閲は未実施。

## 共有ファイルへの統合メモ（このブランチでは実行しない）

1. `app.js` に `fin-efficiency.mjs` の計算・入力・手順・図・グラフ関数を import。`ui.simValues.fin` の初期値を `FIN_DEFAULTS` とし、`SIM_META.fin` とモードタブを追加する。
2. `calculateSimulation` で `mode==='fin'` を `calculateFinEfficiency` に振り分ける。`renderSimulator` ではフィン用の結果表示に `efficiency`、`watts`、`tipTemperature` と図・手順・温度グラフを使う。既存の横軸ΔTグラフではなく、`x/L` に対する `T(x)` を表示。
3. `onInput`・`onChange` の対象に `finFieldNames` を追加し、既存 `renderSimulatorOutputsOnly` の更新経路を確認。既存の5モードに影響させない。
4. 比較条件の保存を有効化する場合、`study-core.mjs` の `validateLearningData` にある `simComparisons` の検証で `fin` を追加する。現状のまま追加モードを保存すると復元時に不正扱いとなるため、登録と同時に見直すこと。
5. `scripts/build-public-site.mjs` の**明示的な配信許可リスト**に `fin-efficiency.mjs` を追加。Service Worker `sw.js` のプリキャッシュ対象・関連配信テストを確認。現時点では本新規モジュールは**GitHub Pagesの実アプリに組み込まれていない**。
6. 既存の学習ガイドへのリンクや§4.5への学習導線は共有ファイルの改変が必要なため、統合担当が扱う。原本PDFの翻訳・図・表の転用は行わない。

## 今後の候補

次候補：§3.2〜3.3のLMTDとε–NTUを使った熱交換器、§5.3の非定常平板（集中熱容量近似を超える問題）、§10.3の放射形態係数、§9.1の沸騰曲線。既存領域との衝突・モデルの前提・検証可能性を確認したうえで順に追加する。

## 第2モデル：§3.2・§3.3 熱交換器の向流・並流 ε–NTU と LMTD

- 実装：heat-exchanger.mjs、専用検証：tests/heat-exchanger.test.mjs。レッスン・問題・用語・既存シミュレータ・共有ファイルは変更していない。
- 基本モデル：定常・単相・2流路・外部熱損失なし・各流路内の比熱一定・総括熱通過率U一定。並流と向流のみ。流量と比熱から各熱容量流量 C_h=ṁ_h c_p,h、C_c=ṁ_c c_p,c [W/K] を計算する。面積基準を一致させた UA [W/K] は入力から計算する。
- 無次元数：C_min=min(C_h,C_c)、C_r=C_min/C_max、NTU=UA/C_min。向流の有効度は C_r=1 のとき ε=NTU/(1+NTU)、それ以外 ε=(1−exp(−NTU(1−C_r)))/(1−C_r exp(−NTU(1−C_r)))。並流は ε=(1−exp(−NTU(1+C_r)))/(1+C_r)。計算にはexpm1を用い、微小引数でも桁落ちしにくくした。
- 温度と収支：Q̇=ε C_min(T_h,in−T_c,in)、T_h,out=T_h,in−Q̇/C_h、T_c,out=T_c,in+Q̇/C_c。入力名のH/Cと実際の温度の大小は分け、逆向きの熱流は負符号で表す。Q̇=C_h(T_h,in−T_h,out)=C_c(T_c,out−T_c,in) で検算する。
- LMTD：向流では端点差 T_h,in−T_c,out と T_h,out−T_c,in、並流では入口差と出口差を使用。両端の差が等しい場合は極限の同じ値を返す。近接する端点差にはlog1pと小差近似を用いる。NTUが非常に大きく、浮動小数点数の出口温度の丸めで端点の温度差がゼロに潰れる場合は、理論的に等価なQ̇/(UA)にフォールバックし、その旨を計算解説に明示する。
- 表示：入力フォーム・流路方向SVG・向流/並流の有効度曲線と現在条件マーカー・数式と単位の解説。sim-field、simulation-steps、simulation-figure、sim-chart等の既存CSSクラスを再利用する。曲線表示のNTU横軸は12以下に制限し、モデルの計算値そのものは制限しない。
- 教育用制限：多パス、交差流、潜熱を伴う相変化、混合、流路の熱損失、圧力損失、Uの流動条件からの推算は含まない。専門家による査読前の独立作成教材であり、書籍原図や原文の翻訳・数値抽出ではない。

### 第2モデルの確認

tests/heat-exchanger.test.mjs に9つのテストケースを用意し、GitHubに保存されたheat-exchanger.mjsとテストファイルそのものを取得してJavaScript実行環境で実行し、**9成功・0失敗**を確認した。評価内容：①等熱容量流量の手計算とLMTD極限、②非等熱容量の理論式と両流路収支、③向流と並流の比較、④ほぼ等しい熱容量比、⑤小NTU・非常に大きなNTU、⑥逆向き温度勾配と温度差ゼロ、⑦流動形式とNTUに対する有効度の範囲・単調性、⑧異常入力の拒否、⑨HTMLエスケープと図のアクセシビリティ。Node.js標準ランナーによる実行、公開ビルド、実ブラウザ、実機は未実施。

標準例：ṁ_h=0.2 kg/s、c_p,h=2000 J/(kg K)、ṁ_c=0.4 kg/s、c_p,c=1000 J/(kg K)、U=100 W/(m² K)、A=2 m²、T_h,in=80 ℃、T_c,in=20 ℃を向流に設定すると、C_h=C_c=400 W/K、NTU=0.5、ε=1/3、Q̇=8000 W、T_h,out=60 ℃、T_c,out=40 ℃、ΔT_lm=40 K。熱収支とUAΔT_lmは8000 Wで一致。

### 第2モデルの共有ファイル統合メモ（このブランチでは編集しない）

1. app.js のimportとSIM_META、ui.simValues、モードタブにheat-exchanger.mjsとモード名exchangerを追加。既存の5モードとフィンの計算を変更しないこと。
2. calculateSimulationにcalculateExchanger(values)の分岐を加え、新規専用の出力レンダリングにrenderExchangerFields、renderExchangerSteps、renderExchangerDiagramとexchangerEffectivenessGraphを用いる。既存の定常モデル用ΔT–熱移動率グラフを誤って流用しない。
3. 入力イベントではexchangerFieldNamesとflowの両方を扱う。flowのselect変更はmodeの選択ではなくモデル内部の流動形式選択として取り扱う。
4. 比較条件の端末保存を有効にする前にstudy-core.mjsのvalidateLearningData・simComparisonsのモードバリデーションに新モードを安全に追加する。共有ファイルを編集できない段階では、永続化しない比較表示のみを可能とする。
5. scripts/build-public-site.mjsの公開配信許可リストに新しいモジュールが必要。guide.mjsのモデル説明、必要ならオフラインキャッシュの配信リストも統合担当が更新し、公開ビルド・Nodeテスト・ブラウザの保存復元・320pxと390pxの表示を確認する。
6. 共有コードを変更する権限がないため、このブランチでは実際のアプリのタブへは未登録。追加モジュールの存在と公開アプリでの提供状態を混同しない。

## 現在のシミュレータラインの状態

- 既存5モデルは保護したまま。新規モデルはフィン効率と熱交換器の**2件**。
- 新規モジュール2ファイル、対応する専用テスト2ファイル、本進捗文書のみがchat/simulatorsの変更対象。
- PRは作成しない。共有レジストリ・公開ビルド許可リストは書き換えない。統合は他ラインの担当へ引き継ぐ。


## 第3モデル：§5.3〜5.5 両面対流の非定常平板伝導

追加：transient-slab.mjs、tests/transient-slab.test.mjs。既存5モデル、他ライン、レッスン、問題、用語集、共有レジストリに変更なし。専門家校閲前の独立作成教育モデルであり、原本の翻訳・図・数値データの転載は含まない。

### 物理モデル

- 全厚さd、片面面積Aの広い平板。初期温度Tiは一様。両面で同じ流体温度T∞、対流熱伝達率h。物性k、ρ、cpは一定。端面・側面熱流、発熱、放射、相変化は無視。
- 中心から表面の半厚さL=d/2、中心対称条件 dT/dx=0、表面対流条件 −k dT/dx=h(Ts−T∞)。α=k/(ρcp) [m²/s]、Bi=hL/k、Fo=αt/L²。この2つに全厚さdを代入してはならない。
- 固有値μnは μn tanμn=Bi の正の根を各区間(nπ, (n+1/2)π)の二分探索で算出。Cn=4sinμn/(2μn+sin2μn)。正規化温度 θ=Σ Cn cos(μn x/L) exp(−μn² Fo)。解は128項の級数。t=0では指定した一様温度をそのまま採用する。
- この教育用実装は級数の打切り誤差を管理するため、Bi≤100かつt=0またはFo≥1e-4に限定。Foが正で小さすぎる場合は結果を推測せず入力エラーとして案内。これは方程式自体の物理的成立範囲ではなく、実装上の数値精度の制約。
- 出力は中心・表面・板厚平均温度、集中熱容量近似の比較温度、片面表面熱流束 [W/m²]、両面合計の瞬間熱移動率 Qdot=2hA(Ts−T∞) [W]、累積の放熱量 E=ρcpdA(Ti−Tavg) [J]。冷却の放熱を正、加熱の吸熱を負とする。
- SVG模式図、中心から表面への温度分布曲線、中心・表面のFoに対する温度履歴曲線、単位付きの計算手順を新規モジュール内で生成。グラフの表示Fo上限8は描画の制約であり、計算そのものの上限ではない。

外部の照合先：
- University of Washington, Transient one-dimensional heat conduction: https://faculty.washington.edu/baneyx/340/Transient_conduction.pdf （固有値と級数解）
- LearnChemE / University of Colorado Boulder, Transient Conduction Through a Plane Wall: https://learncheme.com/simulations/heat-transfer/transient-conduction-through-a-plane-wall/ （空間分布と集中熱容量近似の差）

上記の一般的な数式の形式を独立照合した。図や文章の複製は行わず、原本教材の全ページ照合や第三者の専門家評価が完了したとみなさない。

### 専用テスト

専用ファイル tests/transient-slab.test.mjs に11件の検証を追加。GitHub保存後のモジュールを読み直してJavaScript実行環境でテストし、11成功・0失敗。

内容：①半厚さとBi/Fo、②固有値方程式と既知の最小固有値、③中心対称・表面対流の境界条件、④蓄積熱量の数値時間微分と表面放熱の一致、⑤加熱への反転、⑥t=0と初期温度差0、⑦Bi小の集中熱容量法比較とBi大の勾配、⑧長時間極限、⑨最小Foで128項対192項、⑩入力・数値制約、⑪HTMLエスケープとグラフ表示。

Node.jsでの標準テストランナー実行、GitHub Pages配信ビルド、Safariを含む実ブラウザ・実機操作は未実施。統合時に node --test tests/transient-slab.test.mjs を実行すること。

### 共有ファイル統合メモ（本ラインは編集しない）

1. app.js にtransient-slab.mjsをimport。SIM_META、ui.simValues、タブに新規モードslabを登録。既存transient（集中熱容量法）と別モードにする。
2. 計算関数calculateSlabTransient、入力renderSlabFields、手順renderSlabSteps、模式図renderSlabDiagram、分布slabProfileGraph、履歴slabHistoryGraphを専用の表示経路へ接続。既存の定常ΔT–Qdotグラフや集中熱容量法グラフへ混入させない。
3. onInputとonChangeをslabFieldNamesへ対応させ、エラー時も元入力値を維持する。保存比較を実装する場合はstudy-core.mjsのvalidateLearningDataのsimComparisons検証を同時に変更し、既存の保存データを破損させない。
4. scripts/build-public-site.mjsの明示配信許可リスト、sw.jsのキャッシュとguide.mjsの説明・読書導線は統合担当が作業。未登録モジュールを公開済みと扱わない。
5. 統合時の追加確認：Node.js全テスト、公開ビルド、モバイル320/390px、t=0・極小Fo・高Bi、加熱/冷却、比較・保存復元、オフライン動作。

## 第3モデル時点の進捗

独立した追加モデルは計3件：§4.5 フィン効率、§3.2〜3.3 熱交換器ε–NTU・LMTD、§5.3〜5.5 非定常平板。既存5件は保護し、合計8種類に相当する計算モジュールが存在。ただし追加3件はいずれも公開アプリに未登録。
独立JavaScriptテストは7+9+11=27件成功。公開ブラウザのE2Eテストや専門家校閲の完了ではない。PRは作らない。ブランチchat/simulators以外は編集しない。PR #1側の進捗との再統合は後工程。


---

## 【最新版：2026-10-30】第4モデル追加とCodex本線向け引き継ぎ

**この節が最新の到達点です。** 上の「第2/第3モデル時点」の件数と実装状況は当時の履歴であり、統合時は以下を優先してください。本線PR #1はこのラインから更新せず、Codexが週次制限リセット後に統合する前提です。

### 新規実装：§10.3・10.4　二面閉鎖系の放射熱交換

- 新規モジュール：radiation-enclosure.mjs
- 新規専用テスト：tests/radiation-enclosure.test.mjs
- モジュール最新実装コミット：9243d27cfda981c433bbdc9dd3c7ac31fdc961b4
- 専用テストのコミット：b3a5f895db31baa317f8c7e363ddcc2eb165036d
- 作業ブランチ：chat/simulators。上記の機能コミット以降、本進捗記録の追記コミットによってブランチHEADはさらに進む。統合時の正しい最新HEADはGitHub上のchat/simulators参照そのもので確認すること。
- PR #1の最新確認HEAD：9cb61fb93e1d9b14a4b689231f961eafa4f9dc07（2026-10-30確認）。この値は本線側が動けば変わる。ラインBの分岐起点は c8d207710374411694898093ca9d6adc16fa0fcf のまま。

**物理的な前提と対象範囲：** 閉じた2表面のうち面1は凸で自己照射なし、面2が面1を完全に取り囲み、F11=0、F12=1、F21=A1/A2、F22=1−F21。A2≥A1を強制し、面積比から形態係数を決める。球や端効果を無視できる同心長円筒、十分広い対向平板（面積が等しい極限）などの理想問題を想定。任意の離れた2枚の有限平板でF12を1とみなしてはならず、形態係数を自由入力する形式ではない。

2面は不透明・拡散・灰色・等温、媒質は非参加。各面の放射率ε1、ε2は0より大きく1以下。入力は面積A1/A2[m²]、ε1/ε2、表面温度T1/T2[℃]。T[K]=T[℃]+273.15に換算し、温度の4乗差は (T1−T2)(T1+T2)(T1²+T2²) に因数分解して数値誤差を抑制。

放射抵抗 R1=(1−ε1)/(ε1 A1)、Rspace=1/A1、R2=(1−ε2)/(ε2 A2)、Rtotal=R1+Rspace+R2 [m⁻²]。正味の熱移動率 Qdot=σ(T1^4−T2^4)/Rtotal [W] を面1から面2への正方向で計算。実効放射率εeff=1/(A1 Rtotal)、表面熱流束、各面の黒体放射発散度、ラジオシティJ1/J2、照射量G1/G2、各面の正味収支を表示する。

SVG模式図、計算過程の詳細、面1温度に対するQdotの温度応答グラフ、比較条件曲線を新規モジュール内に実装。現在の既存radiationモードは単純な黒い周囲環境を仮定するモデルなので、**置き換えず別モード**とする。

**第4モデルの物理的検査：** ローカルNode.js v22.16.0の標準ランナーで専用の12テストすべて成功・失敗0。黒体極限、等面積平行平板、外側面積が非常に大きい極限、形態係数の総和と相反則、独立した2×2ラジオシティ線形方程式による熱収支、熱流の反転、等温時のゼロ、近接温度差の安定性、面積に対する比例、異常入力拒否とエスケープ、グラフ表示を確認。

基本例：A1=1m²、A2=4m²、ε1=0.8、ε2=0.6、T1=200℃、T2=25℃では、F21=0.25、F22=0.75、εeff=12/17≈0.705882、Qdot≈1689.75087W。面1と面2の正味熱移動率は同じ大きさで逆符号。

独立照合した一般式の参考：
- 放射ネットワーク・閉鎖2面の式：https://madar-ju.com/storage/images/files/file_1738891122cRBDf.pdf （章13.3）。
- 形態係数の相反則と総和則：https://standards.iteh.ai/catalog/standards/cen/71917d89-5888-4d2b-9702-5026855480ed/cen-clc-tr-17603-31-09-2021 。
- 上記教材や出典からの画像の複製、本文の翻訳、数値表の抽出は行っていない。

### 統合時の前提・注意事項（Codex本線専任）

1. **本線・共有ファイルはラインBでは変更しない。** 2026-10-30時点のラインBの変更対象は、新規の4モジュール、専用テスト4ファイル、本記録のみ。PRは新設・更新しない。起点c8d2077から本線PR #1のHEADは先に進んでいるため、現時点の本線に対して新しいソースを取り込み、共有ファイルへ反映する際は現行実装を読み直して調整すること。
2. 追加済み4モジュールと名称：①fin-efficiency.mjs / tests/fin-efficiency.test.mjs、②heat-exchanger.mjs / tests/heat-exchanger.test.mjs、③transient-slab.mjs / tests/transient-slab.test.mjs、④radiation-enclosure.mjs / tests/radiation-enclosure.test.mjs。各モジュールは原則ESMの独立した純関数群であり、既存の5モードを壊さない。
3. app.js のSIM_META、ui.simValues、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、タブとモード切替、onInput/onChangeに4つの新モードを追加する。推奨モードIDはfin、exchanger、slab、enclosure。現行mode radiation、transient、resistanceとは別の計算・グラフ表示経路とする。
4. radiation-enclosure.mjs から統合する主なexports：RADIATION_ENCLOSURE_DEFAULTS、radiationEnclosureFieldNames、calculateRadiationEnclosure、renderRadiationEnclosureFields、renderRadiationEnclosureSteps、renderRadiationEnclosureDiagram、radiationEnclosureHeatGraph。無効入力はerrorを返すため、出力関数や保存処理の前に処理すること。
5. heat-exchanger.mjsはflowというselect形式の追加入力を持つ。slabはt=0またはFo≥1e-4、Bi≤100という実装の数値制限を持つ。finは独立した空間温度分布。これらを従来の共通ΔT–Qdot表示に誤接続しない。面積・温度・放射率の単位検証と早期Foのエラー表示を維持する。
6. study-core.mjs のvalidateLearningData内simComparisonsのモード検証は既存モード専用。端末に4つの新モードの比較結果を保存する場合、合法な計算値だけを検証する形で分岐を追加し、旧データ・インポート/エクスポートとの後方互換を確認する。ここを更新せずsave-comparisonを有効にすると復元時に不正扱いされ得る。
7. scripts/build-public-site.mjsはESMを明示的に配信許可するため4モジュールを登録。sw.js、キャッシュバージョンとオフライン対応、guide.mjsや各節の学習導線も統合担当が確認する。追加ファイルは2026-10-30時点でGitHub Pagesの既存アプリ画面に未登録。
8. PR #1統合後は、node --testによる全テスト、公開ビルド、表示エラー・SVGの安全性・320/390px UI・端末保存/復元・オフライン・ブラウザE2Eに加え、4モジュールの理論式・物理的適用範囲を改めて監査する。既存レッスン/問題/用語集の正確性とライセンスも本線で別途監査する。

### 本ライン最新の数量と残課題

**既存5モデル（未変更）＋新規4モデル（未統合）＝総計9種類に相当する実装。** 新規専用テスト7+9+11+12=**39件**を個別実行してすべて成功（第1〜3モデルはGitHub取得ソースの独立JavaScript環境で検証、第4モデルはNode.js標準テストランナーで検証）。新規モデルをアプリの実際のタブで使える状態にする統合作業、公開ビルド・実ブラウザ・実機テスト、専門家校閲は未実施。Codex本線の週次制限が解けるまで、このラインでは自分の担当範囲と専用ブランチの開発・整備を継続する。


## 第5モデル（2026-10-30）：円筒断熱材の定常伝導と臨界半径

### 実装ファイル・最新コードコミット

- 新規モジュール：cylindrical-insulation.mjs
- 実装コミット：d7092435d4d7c3b3a61f62a65c5e3c275650009c
- 新規テスト：tests/cylindrical-insulation.test.mjs
- テストコミット：681bf909767129d4a27a1b5e76a7e11c82fe75ac
- これらの後に本進捗文書を更新。PR #1本線、既存モード、共有ソース、他ラインのファイルは一切変更しない。PRも作成しない。

### 対象・物理モデル・数値条件

第2章の定常熱伝導、熱抵抗の応用。内側円筒外表面の半径r0を一定温度Tbに保ち、長さℓの円筒を熱伝導率kの均質な断熱材で厚さdだけ覆う。周囲流体温度T∞、外面の対流熱伝達率hは一定。固体の伝導は半径方向一次元・定常。端面の熱損失、管壁、内部対流、放射、物性の温度依存を無視する。

- 外半径ro=r0+d、伝導抵抗 Rcond=ln(ro/r0)/(2πkℓ) [K/W]、外面対流抵抗 Rconv=1/(2πroℓh) [K/W]、合成抵抗 Rtotal=Rcond+Rconv。
- 符号付き熱移動率 Qdot=(Tb−T∞)/Rtotal [W]。正符号は外向き放熱、負符号は内向き吸熱。表面温度 Ts=Tb−Qdot Rcond、外面熱流束 q''=Qdot/(2πroℓ)。断熱材内 T(r)=Tb−Qdot ln(r/r0)/(2πkℓ)。
- d=0の場合はRcond=0、Ts=Tb。微小なdに対してはlog1p(d/r0)を用い精度を改善。入力欄は十進数のみ、絶対零度以下・数値範囲外・無限値を拒否する。
- 臨界半径 rcrit=k/h。rcrit>r0の場合、絶対熱移動率|Qdot|はdcrit=rcrit−r0で最大。rcrit≤r0の場合は断熱材の厚さに対して単調減少。固定hを仮定する理論上の極値であり、実際の保温設計の推奨厚さではない。
- 断面模式SVG、内面から外面への温度分布グラフ、d対|Qdot|と臨界厚さ位置のグラフ、比較条件の重ね合わせ、計算手順と前提条件を独立作成。入力範囲内で臨界厚さが実現できない場合はそのことを明示。
- 標準例：r0=0.004m、d=0.003m、ℓ=1m、k=0.05W/(m K)、h=5W/(m² K)、Tb=80℃、T∞=20℃。rcrit=0.010m、dcrit=0.006m、Qdot=9.48077513W、Ts=63.1117779℃、断熱材なしに対する|Qdot|比=1.25742686。
- 教材の文章・図・表・数値データは転載せず、標準的な熱抵抗・Fourier法則から独自実装。専門家による査読や現実の保温設備への適用性検証は未実施。

### 専用テスト実行状況

Node.js標準ランナー実行：node --test tests/cylindrical-insulation.test.mjs。**12成功・失敗0**。確認は、独立した熱抵抗の算術、外面対流との熱収支、半径別のFourier熱流、臨界厚さの最大値、臨界半径未満からの単調減少、断熱材なしの極限、微小厚さの対数計算、加熱・冷却の符号反転、温度差ゼロ、長さ比例、入力検証、HTMLエスケープとSVG・比較グラフ。GitHub保存後に新規2ファイルの存在・blob SHA・ブランチ差分を確認。公開アプリ上の結合試験・実ブラウザ・スマートフォン試験は未実施。

### Codex統合担当への手順・残課題

1. PR #1の最新HEADを統合時に再取得する。ラインBは起点c8d207710374411694898093ca9d6adc16fa0fcfから分岐しており本線は先に進んでいる。本線の共有ソースを巻き戻したり、本ライン側からPR #1へ直接コミットしない。
2. 取り込むファイルはcylindrical-insulation.mjsとtests/cylindrical-insulation.test.mjs。既存の平板伝導conductionや直列抵抗resistanceを置換しない新モードIDの例はcylinder。
3. app.jsのimport、SIM_META、ui.simValues、モードタブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeを拡張する。主なexportはCYLINDER_DEFAULTS、cylinderFieldNames、calculateCylindricalInsulation、renderCylinderFields、renderCylinderSteps、renderCylinderDiagram、cylinderTemperatureGraph、cylinderThicknessGraph。値の制約、入力エラー表示、計算結果の符号を維持。
4. 空間温度グラフは相対半径位置（d=0では内外面が一致）、厚さの感度グラフはd対|Qdot|。旧来のΔT対Qdotグラフを誤って流用しない。
5. study-core.mjsのvalidateLearningData内のsimComparisons検証を拡張し、比較条件の保存・復元時に新モードの合法データだけを受け入れ、旧データを破損させない。scripts/build-public-site.mjsの公開配信許可リスト、sw.jsのキャッシュバージョンとオフライン、guide.mjsの説明と節リンクは本線で追加する。
6. 公開ビルドとNode全テスト、320/390px表示、Safari/Chrome、d=0、rcrit<r0、温度差の反転、ラベル、比較曲線、端末保存、オフラインのE2E試験を実施。
7. 次段階の研究拡張は管壁・管内対流、hの外径依存、放射・温度依存物性、接触抵抗。現モデルではそれらを自動予測しない。

### 最新のラインB総括（2026-10-30）

新規追加モジュールと専用テストの対：
1. fin-efficiency.mjs / tests/fin-efficiency.test.mjs（§4.5）
2. heat-exchanger.mjs / tests/heat-exchanger.test.mjs（§3.2・3.3）
3. transient-slab.mjs / tests/transient-slab.test.mjs（§5.3〜5.5）
4. radiation-enclosure.mjs / tests/radiation-enclosure.test.mjs（§10.3・10.4）
5. cylindrical-insulation.mjs / tests/cylindrical-insulation.test.mjs（第2章の応用）

**既存5モデルを保護＋独立新規5モデル＝計10種類に相当する計算モジュール。新規専用テスト累計7+9+11+12+12=51成功、失敗0。** 第1〜3モデルは保存ソースの独立JavaScript環境で確認、第4〜5モデルはNode.js標準ランナーで確認。追加5モデルはGitHub Pagesの既存アプリ画面に未登録のため、実アプリの完成を意味しない。共有アプリへの結合、公開ビルド、E2E、専門家査読は未解決。統合はCodex本線が行い、その後に全体を再監査する。監視への報告対象はこの専用記録と新規10ファイル。本ラインはPR #1に直接触れない。


## 第6モデル（2026-10-30）：§5.6 半無限固体の表面温度ステップ応答

### 保存対象・コミット

- 新規モジュール：semi-infinite-solid.mjs
- 実装コミット：cf2c672bd8df6977c3add7c8ee1602a90928cafc
- 専用テスト：tests/semi-infinite-solid.test.mjs
- テストコミット：5f903745f69c01f4f2f23abe3a1b3b53c19e3bb2
- GitHub保存後、モジュールとテストのblob SHAを取得し、検証済みのローカルソースと文字単位で完全一致することを確認した。
- 上記がこの版での最新のコード・テスト成果コミット。本記録の追記コミットもchat/simulatorsに限定。正確なブランチHEADはGitHub上の本記録の履歴・ブランチ表示を参照。

### 物理モデル・機能と重要な制限

- 第5章§5.6に関係する、一次元半無限固体の非定常熱伝導。固体はx≥0に広がり、初期温度Tiは一様。時刻0+から表面x=0を一定のTsに維持し、深部の温度はTiに留まる。熱伝導率k、密度ρ、比熱容量cpは一定。内部発熱、相変化、放射、周辺の端面と二次元影響を無視する。
- 熱拡散率α=k/(ρcp) [m²/s]、相似変数η=x/[2√(αt)]、温度T(x,t)=Ti+(Ts−Ti)erfc(η)。xは表面から固体内部への深さ[m]、tは経過時間[s]。
- 表面の固体内部向き熱流束q''=k(Ts−Ti)/√(π αt) [W/m²]。面積Aに対してQdot=Aq'' [W]。累積の固体内部へのエネルギーE=2kA(Ts−Ti)√[t/(π α)] [J]。正は加熱、負は冷却。Wの瞬間熱移動率とJの蓄積エネルギーを区別。
- 表面温度指定のDirichlet境界である点が重要。既存の集中熱容量transient、両面対流のtransient-slabや一定hのconvectiveモデルとは別物。熱伝達率hや流体の温度T∞から実際の表面温度を予測するモデルではない。
- 補誤差関数erfc(z)=2/√π ∫[z,∞]exp(−u²)duを独立実装。32点Gauss–Legendre求積を使用し、z≥3.5では1−erf(z)による桁落ちを避けるためガウス関数の末尾を直接積分する。z≥27は約10^-318以下の領域を0と扱う。Python SciPyのerfcに対しz=0〜5.4の541点で最大絶対誤差約1.4×10^-15（丸めと実装条件に依存）。学術用途・高精度設計に無条件で利用できる保証ではない。
- t=0では表面熱流束が数学的に発散するため、計算入力tは0.001〜1e8 sの正値に限定。ただし温度分布ヘルパーの時刻0は「x=0でt→0+の表面境界値、x>0は初期温度」を返し、温度履歴グラフの初期条件を可視化する。
- 入力：k、ρ、cp、Ti、Ts、t、評価深さx、表面積A、実物の奥行きD。最後のDは解析解の境界条件には使わず、半無限体近似の適用目安にのみ利用する。
- 「温度変化割合が表面温度差の1%に下がる深さδ99」をerfcの逆数値解で算出。実際の奥行きDでの変化割合を表示し、1%を超える場合に近似の妥当性を警告。ただし1%閾値は教育上の便宜的な目安であり、有限体・裏面境界・二次元効果・表面温度の立ち上がりについての厳密な保証ではない。
- 深さ方向の温度分布グラフ（比較条件を重畳可能）、指定深さの温度履歴グラフ、伝熱方向を示す独自SVG模式図、初期条件・式・単位・仮定・誤差の詳細説明を新規モジュールに収録。HTML入力値をエスケープしている。
- 一般式の独立照合先：ScienceDirectのConduction Heat Transfer概説（https://www.sciencedirect.com/topics/engineering/conduction-heat-transfer）とElsevierの熱伝導例題（https://booksite.elsevier.com/samplechapters/9780123735881/9780123735881.pdf）。教材本文、図、数値表を転載していない。第三者による専門家校閲は未実施。

### 第6モデル専用テストと残課題

Node.js v22.16.0の標準ランナーで「node --test tests/semi-infinite-solid.test.mjs」を実行し、12件成功、失敗0。
内訳：
1. erfcの既知値・極限・単調性・不正引数。
2. α、η、表面・内部・深部の温度境界。
3. 温度の数値空間微分とFourier法則による表面熱流束の一致。
4. 累積エネルギーの数値時間微分と瞬間熱移動率の一致。
5. 深さ方向の温度上昇をSimpson積分した蓄積エネルギーと解析積分の一致。
6. 熱方程式∂T/∂t=α∂²T/∂x²の数値残差。
7. 加熱・冷却の符号対称性。
8. 等温差ゼロでの温度・熱移動量ゼロ。
9. √tに比例する浸透深さと実物奥行きの警告。
10. t=0+の温度境界と発散する熱流束の取り扱い。
11. 不正入力・絶対零度・型変換・数値範囲の拒否。
12. HTMLエスケープ、SVG説明、プロファイル・履歴グラフと比較表示。

公開アプリに統合した後のE2Eテスト、GitHub Pages配信、iPhone Safari、アクセシビリティの実ブラウザ確認、外部の物理モデル監査は未実施。

### Codexへの追加統合手順（本ラインでは共有コードを変更しない）

1. PR #1本線の最新HEADを統合時に改めて取得すること。本ブランチの起点はc8d207710374411694898093ca9d6adc16fa0fcfで、本線は前進している。共有ソースを古い版へ戻さず、必要な新規ファイルのみ取り込み、現在の登録・保存設計と整合させる。
2. 新規ファイルの対はsemi-infinite-solid.mjs / tests/semi-infinite-solid.test.mjs。新モードIDの推奨名はhalfspace、既存transient・slab・conductionとは分ける。
3. app.jsのimport、SIM_META、ui.simValues、モード切替、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeへ連携。主なexportはSEMI_INFINITE_DEFAULTS、semiInfiniteFieldNames、calculateSemiInfinite、renderSemiInfiniteFields、renderSemiInfiniteSteps、renderSemiInfiniteDiagram、semiInfiniteProfileGraph、semiInfiniteHistoryGraph。必要ならsemiInfiniteTemperatureAtを利用。
4. 結果画面では温度、表面熱流束、熱移動率、累積エネルギー、浸透深さ、奥行きDの近似警告を区別して表示。深さxに対する温度曲線と時間tに対する温度曲線を、既存の共通ΔT–熱移動率グラフへ誤接続しない。
5. 時刻0の温度表示を可能にするヘルパーと、t=0では熱流束が無限大となるためt=0を計算入力から拒否する仕様を混同しない。表面温度が瞬時に指定値になる仮定の物理的制約も可視化する。
6. study-core.mjsのvalidateLearningDataにおけるsimComparisonsの保存・復元検証を必要に応じて拡張し、新規半無限体モードを合法かつ有界なデータだけ受け入れるようにし、既存モードの保存データを破壊しない。
7. scripts/build-public-site.mjsの明示的な配信許可リスト、sw.jsのキャッシュ・配信範囲、guide.mjsの節リンク・説明を統合担当が更新。320/390px、ライト/ダーク、単位ラベル、入力エラー、条件比較・端末保存と復元、オフライン・ServiceWorkerを回帰検証。
8. Node全テスト・公開ビルド・実ブラウザE2Eに加え、相補誤差関数の数値安定性、観測深さ0、極端なt、温度逆転と近似警告の表示を監査する。性能と物理的適用性の最終評価は本線で実施する。

### 第6モデル時点の総括と最新到達点

**既存5モデルは未変更＋独立新規6モデル（全て公開アプリには未統合）＝計11種類のモデル実装。**
新規6件は、フィン効率、熱交換器、非定常平板、二面放射、円筒断熱、半無限体伝導。新規専用テストは7+9+11+12+12+12=**63件成功、0失敗**。第1〜3モデルはGitHub保存ソースの独立JavaScript実行、第4〜6モデルはNode.js標準テストランナーで確認。公開アプリへの統合、ビルド、実機・実ブラウザE2E、専門家校閲は未解決。PR作成なし・本線PR #1への変更なし。監視・Codexは本ファイルの最後の統合チェック項目とchat/simulatorsの最新HEAD・6組の新規モジュール/テストを参照すること。


## 第7モデル（2026-10-30）：平板上の層流強制対流

### 専用ブランチの成果・最新実装コミット

- 作業先：chat/simulators。起点は PR #1 の古い c8d207710374411694898093ca9d6adc16fa0fcf。現行PR #1へはコミットもPR作成も行わない。
- 新規実装：forced-convection-flat-plate.mjs。実装コミット 01cf705e6b8fa5ad106f3ecd10a1938b29599fc0。
- 新規テスト：tests/forced-convection-flat-plate.test.mjs。テストコミット ef66f7e5ab1a3d9a98e77dd52063970f2c9df25f。
- 上記2ファイルはGitHubへ保存後に再取得し、Node.js標準ランナーで実行したローカルファイルとバイト内容（UTF-8文字列）一致を確認した。この後の進捗ファイル追記コミットを含む最新ブランチHEADは chat/simulators を正として参照する。
- このラインで変更するのは新規モジュール、専用テスト、本進捗ファイルのみ。既存の5モードとこれまでの6つの追加モジュールを変更しない。

### 関連節と独立した物理モデル

第6章§6.2〜6.5および§6.9の基礎。水平・垂直の特定姿勢ではなく、等温の平滑平板に平行な一様主流の非圧縮・定常・強制対流を仮定。圧力勾配なし、板の先端から境界層が発達、片面のみに熱交換、流体の密度・粘度・比熱・熱伝導率は一定、表面温度Tsは一様、主流温度T∞も一定。流速や物性は各入力で指定する。自然対流、乱流、遷移、混合対流、入口以外から加熱開始する領域、表面粗さ、流体の物性温度依存、板内部の伝導、放射、摩擦損失、流路拘束は扱わない。

- 入力：流体密度ρ [kg/m³]、主流速u∞ [m/s]、流体粘度μ [Pa s]、流体比熱cp [J/(kg K)]、流体熱伝導率kf [W/(m K)]、流れ方向長さL [m]、幅W [m]、板表面Ts [℃]、主流T∞ [℃]。
- ν=μ/ρ [m²/s]、αf=kf/(ρcp) [m²/s]。ReL=ρu∞L/μ、Pr=μcp/kf。これらの無次元数には固体側の物性を用いない。
- 層流等温平板の平均ヌセルト数 NūL=0.664 ReL^(1/2) Pr^(1/3)。下流端の局所ヌセルト数 NuL=0.332 ReL^(1/2) Pr^(1/3)。平均h̄=NūL kf/L、末端局所hL=NuL kf/L。任意の先端からの距離x>0についてhx=0.332 kf (ρu∞/(μx))^(1/2) Pr^(1/3)。
- 片面積A=LW、符号付きQdot=h̄A(Ts−T∞) [W]。正を平板から流体への放熱、負を流体から平板への加熱。平均熱流束q''=h̄(Ts−T∞) [W/m²]。
- 概略の速度境界層厚さδ99≈5L/√ReL、温度境界層厚さ目安δT≈δ99/Pr^(1/3)。これは描画・学習用の近似尺度であり、h̄算出や厳密な境界層温度場の推定に使用しない。
- 適用性保護：1000≤ReL<500000、0.6≤Pr≤50 の教育上の範囲外では計算を拒否する。Re=1000という下限はモデルの数値発散ではなく、十分に発達する境界層の想定を学習者に意識させる保守的な設定。実際の遷移臨界Reは乱れ・表面条件で変わるため、上限を絶対的な保証と解釈しない。
- 局所hxは理想的な先端x=0で発散するため、x=0は計算エラーとし、位置グラフではx/L=0.01〜1のみ表示。流速感度グラフは適用できる層流範囲内に限定。2種類のSVGグラフ、独自模式図、HTMLエスケープ済み入力、計算式・単位・仮定を日本語で示す手順説明を用意。
- 参考照合：ASHRAE Fundamentals公式の外部流平板の相関表 https://handbook.ashrae.org/Handbooks/F25/SI/f25_ch04/f25_ch04_si.aspx、および平板の局所値と平均値の関係 https://volupe.com/support/empirical-correlations-for-convective-heat-transfer-coefficients/ 。公式資料や書籍の原文・図・表を転載せず、広く知られる式を独立実装。研究設計へ用いる場合は流体物性を膜温度付近で選定し、相関の境界・浮力・流入状態を専門家が再確認する。

### 第7モデルの検査と数値例

Node.js標準テストランナーによる実行コマンド：
node --test tests/forced-convection-flat-plate.test.mjs

全12件成功・失敗0。独立した局所hxの積分による平均hの一致、速度平方根則、長さと幅の異なる効果、ReとPrの別表現、加熱・冷却の符号反転、一定温度差0、低Re・遷移・乱流の拒否、Pr範囲外の拒否、厳格な数値入力、先端特異点、アクセシブルSVGと単位、HTML入力値のエスケープを確認。既存6モデルのテストをこのNode.jsランナーで一括再実行したわけではなく、それらの個別検証履歴は以前の節にある。

標準例：ρ=1.184kg/m³、u∞=3m/s、μ=1.849×10^-5Pa s、cp=1007J/(kg K)、kf=0.0263W/(m K)、L=0.5m、W=0.2m、Ts=80℃、T∞=25℃。ReL≈96051.92、Pr≈0.70796、NūL≈183.41069、h̄≈9.64740W/(m² K)、Qdot≈53.06071W、δ99≈0.008067m。計算は熱交換量を推定するもので、流体内の温度分布・実際の境界層の厚さの厳密解ではない。

### Codex統合時の前提・注意点・未解決事項

1. 本線PR #1の最新HEADを統合時点で再取得し、c8d2077の共有コードに巻き戻さない。chat/simulatorsの新規ファイルだけを最新の本線へ取り込む。PR #1の変更はCodexのみが行う。
2. 統合候補の新モードIDはflatplate。app.jsのSIM_META、ui.simValues初期値、タブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeへ専用分岐を追加。既存のconvection（hを直接与えるモデル）を置換しない。
3. 本モデルの主なexport：FLAT_PLATE_DEFAULTS、flatPlateFieldNames、calculateFlatPlateConvection、flatPlateLocalCoefficient、renderFlatPlateFields、renderFlatPlateSteps、renderFlatPlateDiagram、flatPlateLocalGraph、flatPlateVelocityGraph。平均h、末端局所h、熱移動率、境界層厚さ目安を別の出力欄に区別して表示。
4. 幅を含む片面積A=LWを維持し、既存の共通ΔT対Qdotグラフと新規の局所h(x)・流速感度グラフを誤接続しない。局所hはx=0を入力できず、層流Re範囲外を計算・描画しない。流速感度グラフは横軸0〜1が実際の流速ではなく、凡例・aria説明に対応する最小〜最大流速を示すものなので、統合時に可能なら物理量u∞[m/s]を直接表示するUIへ改善する。
5. study-core.mjsのvalidateLearningData内simComparisonsに新モードを追加してから、比較条件の永続保存を有効化する。旧学習履歴、エクスポート・インポート・ローカル保存の後方互換を保証。
6. scripts/build-public-site.mjsの明示配信許可リストとsw.jsのオフラインキャッシュ更新、guide.mjs第6章の本文導線、レスポンシブ320/390px、Safariと主要ブラウザのE2Eは本線担当。新モジュールは現在GitHub Pages上のアプリ画面には未登録。
7. 追加7モデル全件の理論式と物理条件、境界値、保存比較、前後のモデル切り替え、表示エラー、SVG安全性、公開ビルド、Node全テスト、実ブラウザ・端末を統合後に全体監査する。専門家による工学設計への適用承認は未実施。

### ラインBの到達点（第7モデル追加時）

既存5モデルを保護し、新規の独立7モデル（フィン効率、熱交換器、非定常平板、二面放射、円筒断熱、半無限固体、平板層流強制対流）を追加。**合計12モデルに相当する計算コードが存在**するが、新規7件は全てアプリ本体・公開ページには未統合である。

専用テストの履歴は7+9+11+12+12+12+12=**75件成功・0失敗**。最初の3モデルの27件は独立JavaScript実行環境で、後の4モデルの48件はNode.js標準ランナーで個別実行した。最新追加コードとテストはGitHubから再取得し、検証済みのローカルソースと一致を確認した。公開ビルド、GitHub Pagesの操作試験、端末保存・オフライン・実ブラウザE2E、全体監査は残課題。PRは作成せず、本線PR #1、他ライン、既存レッスン、問題、用語集を変更していない。統合はCodexが行う。


## 第8モデル（2026-10-30）：§7.3 円管内の発達乱流強制対流

### 確定済み成果・最新実装コミット

- ブランチ：chat/simulators。PR #1本線／他ラインへ変更なし。起点はPR #1の旧SHA c8d207710374411694898093ca9d6adc16fa0fcf。
- 追加コード：turbulent-pipe-convection.mjs（実装コミット 7c4b3f439f211f98a0e34d140ee2cf89fe2560e9）。
- 追加専用テスト：tests/turbulent-pipe-convection.test.mjs（テストコミット ace8328d714931917073981b7e5cdd1ad14abcaf）。
- この後に本記録を更新したコミットがラインBの最新HEADとなる。常にchat/simulatorsのHEADを確認すること。
- 今回変更したのは上記の新規2ファイルとこの進捗記録のみ。他のシミュレータや既存アプリを編集しない。PRは作成しない。

### 計算モデルと適用範囲

- 対象は単相・定常・非圧縮・平滑な円管の十分に発達した乱流。内壁温度Twは長さ方向で一定、流体の密度ρ・粘度μ・比熱cp・熱伝導率kfは代表温度で一定とする。断面平均流速u、内径D、加熱長さL、入口混合平均温度Tinを指定する。
- Re=ρuD/μ、Pr=μcp/kf。Darcy摩擦係数 f=(0.79 ln Re−1.64)^(-2)。Gnielinskiの乱流相関 Nu=[(f/8)(Re−1000)Pr]/[1+12.7 sqrt(f/8)(Pr^(2/3)−1)]。平均熱伝達率h=Nu kf/D。ここではFanning係数とDarcy係数を混用しない。
- 相関式の代表的な文献範囲はRe≥3000、0.5≤Pr≤2000だが、本学習モデルは遷移域の曖昧さを抑えるため **10000≤Re≤5000000、0.5≤Pr≤2000** の保守的な範囲へ制限した。入口助走区間の影響を減らすため、独自の教育用判定として L/D≥30 も要求。これを完全発達の物理的保証とみなしてはいけない。
- 流路断面Ac=πD²/4、流体との伝熱面積As=πDL、質量流量ṁ=ρuAc、熱容量流量C=ṁcp、NTU=hAs/C。流れに沿った混合平均温度は T(x)=Tw−(Tw−Tin)exp[−hπDx/(ṁcp)]。Tout=T(L)。壁から流体へ向かう正味熱移動率Qdot=ṁcp(Tout−Tin)。加熱の符号を正、冷却の符号を負とする。
- hAsΔTlm = Qdotとの一致を検算。ΔTlmはTw−TinとTw−Toutの対数平均であり、数値上の差の丸めを回避するため、ΔTlm=(Tw−Tin)(1−exp(−NTU))/NTUから計算。微小NTUではexpm1を使う。実装は流体の物性を温度依存で再計算しない。
- 追加出力はDarcy-Weisbach摩擦損失Δpf=f(L/D)ρu²/2 [Pa]、体積流量Vdot=uAc [m³/s]、理想水力動力Δpf Vdot [W]。これは配管継手損失、ポンプ実消費電力・ポンプ効率、入口・出口の局所損失を含まない。
- UIでは入力フォーム、日本語の式と単位の段階解説、流動方向と壁の加熱・冷却方向を示す独自SVG模式図、位置x/Lに対する流体温度分布、流速に対するhの感度グラフ、比較条件の曲線を用意した。グラフは新規モジュール内で描画し、既存の定常ΔT–Qdotグラフを使わない。感度グラフの横軸0〜1は表示用の正規化座標で、両端の流速m/sを明示している。
- 主要制約：相関式の平均hを全長へ一様に適用。入口助走・非円形ダクト・粗面・混合対流・自然対流・二相流・温度依存物性・管壁伝導・外側境界・放射・局所損失は含まない。学術・設計への利用前に、物性の代表温度、壁温度、流入乱れ、実物の流路長さ・材質の適合性を別途確認する。
- 標準例：ρ=996kg/m³、u=1.2m/s、μ=0.000797Pa s、cp=4180J/(kg K)、kf=0.613W/(m K)、D=0.025m、L=3m、Tin=25℃、Tw=60℃。Re=37490.5897、Pr=5.43468、Nu=230.9268、h=5662.3244W/(m² K)、NTU=0.5440、Tout=39.68575℃、Qdot=36014.9505W、管内摩擦圧力損失≈1928.41Pa、理想水力動力≈1.13593W。
- 一般相関式の照合先：CERN講義資料のGnielinski・Petukhov式 https://indico.cern.ch/event/341722/contribution/10/attachments/671377/922740/Thermal_QA_Coolant_Performance_WP4_25_Sept_2014.pdf 、ならびにIdaho National Laboratory MOOSE実装 https://mooseframework.inl.gov/docs/doxygen/modules/classADWallHeatTransferCoefficientGnielinskiMaterial.html 。数式のみを独立に検証し、文章・図・表の転載はしない。

### 第8モデルのテスト・残留リスク

- Node.js標準ランナーコマンド：node --test tests/turbulent-pipe-convection.test.mjs。**13件成功・0失敗**。実装後のローカルコードで実行し、GitHubへの追加後は取得した実装とテストが一致するか確認する。
- 内訳：①Re/Pr/Nu/f/質量流量、②出口・LMTD・熱収支、③管軸方向の局所対流量の数値積分と全体熱収支、④入口・出口温度と単調性、⑤温度逆転と等温の極限、⑥流速上昇によるh・圧力損失の増加、⑦長さによるhと温度の分離、⑧摩擦圧力損失と理想水力動力、⑨別相関によるオーダー照合、⑩層流・遷移域拒否、⑪Pr範囲・L/D保護、⑫不正入力の拒否、⑬HTMLエスケープ・SVG・比較グラフ。
- 公開ビルド、アプリ結合、GitHub Pages上の動作、スマートフォン・Safari/Chrome、キャッシュ・保存復元、第三者の専門家校閲は未実施。数式とNodeの計算検査が通ったことは、実際のアプリ公開完了を意味しない。

### Codexによる本線統合時の注意点

1. PR #1の最新HEADを統合時点で再取得すること。ラインBの変更をPR #1へ直接コミットしたり、本線の新しい変更を古い起点へ巻き戻さない。
2. 追加対象はturbulent-pipe-convection.mjsとtests/turbulent-pipe-convection.test.mjs。既存のconvection（一定h入力）、flatplate（平板層流強制対流）とは区別し、推奨新モードIDはpipe。
3. app.jsのimport、SIM_META、ui.simValues、モードタブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeへ新モードを安全に追加する。主なexport：PIPE_DEFAULTS、pipeFieldNames、calculatePipeConvection、gnielinskiPipe、pipeBulkTemperatureAt、renderPipeFields、renderPipeSteps、renderPipeDiagram、pipeBulkGraph、pipeVelocityGraph。
4. 結果表示ではhとNu、Re、Pr、出口温度、熱移動率、圧力損失、理想水力動力を単位とともに区別。負の熱移動率、等温時のゼロ、相関式の入力エラーを確認する。圧力損失や水力動力をポンプ実消費電力と誤認させない。
5. 既存の共通ΔT–Qdotグラフではなく、新規のx/L対T(x)と流速対hの2グラフを表示。感度グラフのラベルは流速範囲を必ず表示する。
6. study-core.mjsのvalidateLearningData内simComparisonsに新モードの保存・復元検証を追加してから永続比較を有効化。過去の保存データとインポート・エクスポートの後方互換を監査。
7. scripts/build-public-site.mjsの明示配信許可リスト、sw.jsのキャッシュ・オフライン、guide.mjsの第7章導線を統合側が更新。モバイル320/390px、Safari/Chrome、ライト/ダーク、E2E、Node全テスト、公開ビルドを実施する。
8. 入口・出口温度差と流れの変化で物性が変わる実環境を想定する場合は別モデルや補正が必要。既存モデルの機能を削除しない。ユーザー入力の型・範囲・符号に対する保護を維持。

### 第8モデル時点のラインB総括

既存5モデルは未変更。独立新規モデルは8件（フィン効率、熱交換器、非定常平板、二面放射、円筒断熱、半無限体、平板層流強制対流、円管内乱流強制対流）。**合計13モデルに相当する計算モジュールが存在**するが、追加8件は全てGitHub Pagesのアプリ画面へ未統合。
新規モデルの専用テスト累計は7+9+11+12+12+12+12+13=**88件成功、0失敗**。第1〜3モデルはGitHub保存ソースの独立JavaScript実行、第4〜8モデルはNode.js標準テストランナーで個別検査した。全体のNode一括テスト・公開ビルド・実機E2Eと専門家監査は未実施。監視・Codexは本専用記録とchat/simulatorsのHEAD、および8組の新規ファイルを参照すること。PR作成なし。共有ファイル・本線PR #1・他ラインは改変していない。


## 第9モデル（2026-10-30）：円柱まわりの横流れ強制対流

### 最新の成果・専用コミット

- 専用ブランチ：chat/simulators。起点はPR #1の古いc8d207710374411694898093ca9d6adc16fa0fcf。本線PR #1および他ラインのファイルは一切変更しない。
- 新規計算・描画モジュール：cylinder-crossflow.mjs。最終内容確定コミット：ba36c1171f66e5fffc21bfa261fd2a1c1dcf5650。
- 専用Node.jsテスト：tests/cylinder-crossflow.test.mjs。最終内容確定コミット：819b30cbdf2cd9067df4ad34ee1cc7a136800625。
- 本記録の追記によってブランチHEADがさらに進むため、最新HEADの完全なSHAはchat/simulatorsの参照先を取得すること。追加PRは作らない。
- 新規2ファイルと専用進捗記録以外の既存ファイルは一切変更しない。配信アプリへの統合はCodexが行う。

### 対象・数式・適用条件

第7章§7.6「円柱横流れの熱伝達」の補助教材。等温の長い平滑円柱の側面を、軸と直角の定常・一様な強制主流が流れる場合に、円周平均の熱伝達率hおよび熱移動率を推定する。管内の乱流モデル、平板表面上の層流モデルとは別の相関を用い、後流や局所速度・温度場を数値的に解くCFDではない。

- 入力：流体密度ρ [kg/m³]、速度u∞ [m/s]、流体粘度μ [Pa·s]、比熱cp [J/(kg·K)]、熱伝導率kf [W/(m·K)]、円柱外径D [m]、長さL [m]、一定表面温度Ts [℃]、主流温度T∞ [℃]。流体物性は原則として膜温度(Ts+T∞)/2付近で評価した値を入力する。物性の自動推定はしない。
- ν=μ/ρ [m²/s]、αf=kf/(ρcp) [m²/s]、ReD=ρu∞D/μ、Pr=μcp/kf、PeD=ReD Pr。NuD=0.3+[0.62 ReD^(1/2) Pr^(1/3)/(1+(0.4/Pr)^(2/3))^(1/4)]×[1+(ReD/282000)^(5/8)]^(4/5)（Churchill–Bernstein 1977）。平均h=NuD kf/D。
- 円柱側面積A=πDL（端面は含まない）、符号付き熱移動率Qdot=hA(Ts−T∞) [W]。正を円柱から流体への放熱、負を円柱が吸熱する方向とする。円周平均の表面熱流束q''=h(Ts−T∞) [W/m²]。
- 相関式の使用条件はReD Pr>0.2。独自の教育用保守的制限として、ReD≤10^7、0.1≤Pr≤1000、L/D≥10も設定。これら後3条件は元論文が全条件で「適用不可」と主張した範囲ではなく、学習者が桁外れ・短い円柱・未検証物性を使わないための追加チェックである。
- 円柱の浮力による自然対流が無視できるか、周囲の流れ場と乱れ、表面の粗さ、端面の影響、物性の温度依存、放射、円柱内部の伝導、後流、管群干渉、下流の主流温度変化、流体抵抗と抗力は**計算しない**。実設計では適切な補正・別モデル・実測照合が必要。膜温度は計算に使う物性の参考値で、物性表の代用ではない。
- UI：9項目の単位付き入力、数式と計算手順、流路方向と放熱・吸熱の方向を描いた独自SVG、実際の流速u∞に対するhの曲線、円柱外径Dに対する符号付きQdotの曲線（保存比較条件を重畳可能）。それぞれ軸の物理量と表示範囲を日本語で説明。グラフ描画点も経験式の入力条件外へ外挿しない。HTMLユーザー入力はエスケープする。

理論式の出典確認：
- 元論文の書誌と注意事項：S. W. Churchill and M. Bernstein, A Correlating Equation for Forced Convection From Gases and Liquids to a Circular Cylinder in Crossflow, J. Heat Transfer (1977), DOI 10.1115/1.3450685。https://cir.nii.ac.jp/crid/1362825894077898624
- 式・RePr>0.2の独立照合： https://docs.aerosim.io/nassu/validation/thermal/02_heated_cylinder/02_heated_cylinder.html
- 数式・定義以外の原文・図・表・測定値を転載していない。原本教材との節内対応、研究設計の精度保証、専門家による技術校閲は未完了。

### 第9モデルの検証と残課題

Node.jsの標準テストランナーで node --test tests/cylinder-crossflow.test.mjs を実行し、**14件成功・0失敗**。検証内容：①Re/Pr/Pe/ν/αfとNu式の独立算式、②側面積・表面熱流束と熱量、③円柱長さによるQdotの比例則とhの不変性、④温度差を反転した熱流符号、⑤等温でのゼロ、⑥流速によるRe/Nu/h/Qdotの増加、⑦外径によるRe/Nu/面積の変化、⑧複数Re/Prでの相関式、⑨RePr境界拒否、⑩Re/Pr/長径比の保守的制限、⑪絶対零度以下・数値型・範囲外など、⑫HTMLエスケープと単位、⑬SVG・両グラフと比較、⑭相関の領域境界でのグラフ座標の安全性。

追加の決定論的な900条件の入力探索でも、計算が成立した356条件すべてのグラフにNaN/Infinity/undefinedが現れないことを確認（残りは数値または物理的範囲のため計算拒否）。計算精度・有限円柱への適用性・現実の浮力や後流との誤差を定量保証する試験ではない。GitHub保存ファイルは専用テストにより数値計算と描画を確認したが、公開アプリのページ内で動作するE2Eは未実施。

### Codex最終統合への手順

1. PR #1は最新HEADを統合時点で再取得。ラインBの古い分岐起点へ本線を巻き戻さない。新規ファイルcylinder-crossflow.mjsおよびtests/cylinder-crossflow.test.mjsを最新本線へ取り込む。PR #1へのコミットやマージは本線担当のCodexだけが行う。
2. 新規モードIDの推奨はcrossflow。app.jsのSIM_META、ui.simValues、タブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeへ固有の分岐を追加。既存のconvection・flatplate・pipeを置き換えない。
3. 主なexports：CROSSFLOW_DEFAULTS、crossflowFieldNames、calculateCylinderCrossflow、churchillBernsteinNu、renderCrossflowFields、renderCrossflowSteps、renderCrossflowDiagram、crossflowVelocityGraph、crossflowDiameterGraph。calculateCylinderCrossflowは不適合時にerrorを返す。結果のh、Nu、Re、Pr、熱移動率、警告をそれぞれ表示し、符号を勝手に絶対値に変えない。
4. h対流速およびQdot対円柱外径のグラフは既存のΔT対Qdotのグラフと物理的な意味が異なるので共通グラフへ誤配線しない。RePr、長径比、Pr/Re範囲の拒否をUIでも維持。描画領域で適用外となる比較条件の曲線は自動的に省略する。
5. 比較条件を端末へ永続保存する前にstudy-core.mjsのvalidateLearningDataのsimComparisonsに新モードを追加し、有界で合法なデータのみ保存・復元。旧モードの履歴・インポート・エクスポート後方互換を保つ。
6. scripts/build-public-site.mjsの明示配信許可リスト、sw.jsのキャッシュ、guide.mjs第7章§7.6への導線を統合担当が更新。公開ビルド、node --test、Safari/Chrome、320px/390px、ライト/ダーク、エラーUI、保存比較、オフラインの回帰検証を実施。
7. 最終的な専門家確認では、RePrが小さい条件、遷移・剥離、有限円柱端部、自然対流との混在、物性の膜温度依存、粗さ等の実際の適用限界を別途調べる。

### 第9モデル時点の総括

既存5モデルは保護し、独立新規9モデル（フィン効率、熱交換器、非定常平板、二面放射、円筒断熱、半無限体、平板層流強制対流、円管内乱流強制対流、円柱横流れ）を追加。**合計14種類に相当するモジュール**が存在するが、追加9モデルはまだ公開アプリ画面には未統合。

専用テスト累計：7+9+11+12+12+12+12+13+14＝**102件成功、0失敗**（モデルごとの実行履歴。すべてを本線の統合済みアプリ上で一括検証した結果ではない）。アプリ本体の結合、公開ビルド、GitHub Pages操作・端末保存・オフラインのE2E、全体教材精査、専門家校閲は引き続き未解決。監視とCodexには、chat/simulatorsの現行HEADと本記録、9組の新規ソース・テストを引き継ぐこと。PRは作らず、他ラインの成果や本線PR #1へ手を出さない。


## 第10モデル（2026-10-30）：鉛直平板の自然対流（第8章 §8.3）

### 保存済みソースとコミット

- 新規モデル：natural-convection-vertical.mjs
- 実装コミット：c9af5ca0abc3d2ef9e5373d8c24a0cceea755a6c
- 新規テスト：tests/natural-convection-vertical.test.mjs
- テストコミット：53790f02f7d78a99f86eeda18d8c23561e1e95aa
- 作業対象はchat/simulatorsのみ。新規モジュール、専用テスト、本進捗記録以外のファイルは変更しない。PR #1を変更・更新・マージしない。
- コミット後、GitHubから実装・テストを再取得し、検証済みのローカルソースとの内容の完全一致を確認した。

### 物理モデル・計算範囲

- 静止した広い流体の中に、鉛直で一様表面温度Tsの平板がある場合の自然対流。表面面積A=高さL×幅W×露出面数。片面または、相互干渉がないと仮定した両面を指定できる。流体側の密度ρ、粘度μ、比熱cp、熱伝導率kf、体積膨張係数βは膜温度付近の一定値を入力する。
- ν=μ/ρ [m²/s]、αf=kf/(ρcp) [m²/s]、Pr=ν/αf、GrL=gβ|Ts−T∞|L³/ν²、RaL=GrL Pr。重力加速度g=9.80665 m/s²。ここでLは鉛直方向の板高さ。
- Churchill–Chuの広範囲相関：平均NuL=[0.825+0.387 RaL^(1/6)/{1+(0.492/Pr)^(9/16)}^(8/27)]²、平均h=NuL kf/L [W/(m² K)]。局所h(x)ではなく板高さ全体の平均値。
- 経験相関の使用範囲を0.1≤RaL≤1e12に制限。数値や一般化の過信を防ぐため教育用にPrを0.1〜1000に制限。温度差0の場合はQdot=0を返すがRa=0はこの相関の適用外なのでNuとhはnull（未適用）にする。絶対零度以下、非十進数、非有限値、範囲外および露出面数に小数がある場合はエラーを返す。
- q''=h(Ts−T∞) [W/m²]、Qdot=hA(Ts−T∞) [W]。正は平板からの放熱、負は流体から平板への吸熱。逆転時の浮力流れの向きを独自SVGに描画。温度差を横軸としたQdotグラフ、および板高さLを横軸としたhのグラフを提供。グラフの相関適用外部分は線をつながず省略する。
- 浮力境界層の速度分布、端部、密閉空間の循環、自然対流と外部流による強制対流との混合、放射、相変化、流体物性の温度依存、乱れ強度の細部、二面が干渉する狭い流路は含まない。広範囲相関式は層流専用の解ではないため、対象節§8.3の精密な層流場の再現と混同しない。
- 出典照合：Argonne National Laboratory公開のChurchill–Chu式 https://publications.anl.gov/anlpubs/2019/03/151186.pdf 、同 https://publications.anl.gov/anlpubs/2015/01/79557.pdf 、およびIAEA Sodium Coolant Handbook https://www-pub.iaea.org/MTCD/publications/PDF/CRCP_SOD_003web.pdf 。一般式のみ独立に実装。教材原文の翻訳・図・実験表の転用はしていない。研究設計への精度保証や専門家査読は未実施。
- 標準値：ρ=1.184kg/m³、μ=1.849e-5Pa s、cp=1007J/(kg K)、kf=.0263W/(m K)、β=.00319/K、L=.5m、幅=.4m、面数1、Ts=60℃、T∞=20℃。Pr≈0.707963、Gr≈6.413734e8、Ra≈4.540687e8、Nu≈96.3783、h≈5.06950W/(m² K)、Qdot≈40.556W。

### 第10モデルのテスト・検証

Node.js標準ランナー：node --test tests/natural-convection-vertical.test.mjs
結果は15件成功・0件失敗。実装およびテストをGitHubに保存した後、再取得してソース内容がローカル検証済みファイルと一致することを確認した。
検査内容：①無次元数と平均h/Qdotの独立算式、②Ra/Pr境界と相関式の直接値、③加熱冷却時の符号・浮力方向、④温度差ゼロの特別扱い、⑤面積と両面の比例、⑥高さのRa三乗則、⑦温度差感度、⑧β感度、⑨膜温度と温度差の符号、⑩極端なRaの拒否、⑪型・数値境界・絶対零度、⑫エスケープと単位付き説明、⑬温度差グラフ・比較、⑭高さグラフ・比較、⑮多数の入力条件の有限値/グラフ安全性。
このブランチからのGitHub Pages公開・実ブラウザ表示・実端末・データ永続化・専門家校閲は未実施。

### Codex最終統合への注意点（本ラインは編集しない）

1. 現行PR #1の最新HEADを統合時に改めて取得。ラインBの元起点c8d207710374411694898093ca9d6adc16fa0fcfの共有ソースに巻き戻さず、chat/simulatorsから新規ファイルを取り込む。
2. 統合対象はnatural-convection-vertical.mjsとtests/natural-convection-vertical.test.mjs。新モードID候補 natural。旧convection（一定h指定）やflatplate（外部流での層流強制対流）とは別モードとする。
3. app.jsでimport、SIM_META、ui.simValues初期値、モードタブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeを新モードに対応。主なexportはNATURAL_DEFAULTS、naturalFieldNames、calculateNaturalConvection、churchillChuVertical、renderNaturalFields、renderNaturalSteps、renderNaturalDiagram、naturalTemperatureGraph、naturalHeightGraph。
4. 入力のfaces（露出面数）は数値入力1/2であり整数検証必須。Ts=T∞ではhとNuがnullなので平均熱伝達率欄を「相関未適用」とする。無条件に数値書式化すると0や誤値に化けるので注意。Ra/Prの範囲外ではerrorを正しく表示し、入力値を維持する。
5. 新しいQdot対温度差グラフとh対鉛直高さグラフの物理軸・符号・単位を表示し、旧シミュレータ共通ΔT対Qdotグラフと混同しない。図の上昇/下降方向は温度差符号で変わるが、熱流の向きとは別の物理現象である。
6. study-core.mjsのvalidateLearningData内simComparisonsに合法な新モードを追加してから端末比較保存を有効化。既存の学習履歴とエクスポート/インポートの後方互換性を検査。
7. scripts/build-public-site.mjsに新規ESMを配信許可し、sw.jsのキャッシュ、guide.mjsの第8章導線を最新本線に追加。Node全テスト、ビルド、iPhone Safari/PC、320・390px、ライト/ダーク、保存復元・オフライン、ブラウザE2Eを実施。
8. 物性を実物へ適用する場合は膜温度ごとの表値選定、理想気体のβ≈1/Tfilmの適否、浮力と外部流の相互作用、層流・乱流遷移、平板サイズと有限周辺空間の条件を専門家が別途確認する。

### 最新ラインB進捗・未解決事項（2026-10-30、第10モデル）

既存5種類を変更せず、独立した新規10種類（フィン、熱交換器、非定常平板、二面放射、円筒断熱、半無限体、外部層流平板、円管内乱流、円柱横流れ、鉛直平板自然対流）を追加した。合計15種類に相当する計算モジュールが存在するが、新規10種類は全て公開アプリに未登録。
追加専用テストの累計は7+9+11+12+12+12+12+13+14+15=117件成功、0失敗（各モジュールの独立検証履歴。実アプリ全体のE2Eや全テストの一括実行ではない）。
既存の共有ファイル、別の並行ライン、本線PR #1は未変更。PR未作成。統合作業、共有UI/保存レジストリ、公開ビルド、Safariを含む実ブラウザE2E、権利確認、専門家査読はCodex側での統合後に行う。
今後の引き継ぎでは chat/simulators の最新HEADと本記録、10組の新規実装・テストのみを採用し、古い本線への差し戻しを避けること。


## 第11モデル（2026-10-30）：円管内の層流強制対流（第7章§7.2）

### 追加ファイル・コミット・作業範囲

- 新規実装：laminar-pipe-convection.mjs
- 実装コミット：44300be7bf2c61fb689e2d60e34f398127302a2f
- 専用テスト：tests/laminar-pipe-convection.test.mjs
- テストコミット：46fc423ca93ba476dd79a79d8c0acaeab6fb7afa
- 最新の引き継ぎ記録は本ファイル。最新のコミットHEADはchat/simulatorsブランチの実際の参照値を取得すること。PR作成・PR #1への更新・共有ソース変更はしない。
- GitHub上の2ファイルを再取得し、Node.jsで検証済みローカルファイルのUTF-8文字列と完全一致することを確認。

### 物理的前提・相関式

単相、定常、非圧縮、平滑な円管、一定の内壁温度Tw、一定の流体物性を仮定する。加熱区間入口で「速度分布は十分発達した層流の放物線形」をすでに満たすことが必須。温度境界層は加熱区間入口から発達する。入口で速度分布も同時に発達する問題は扱わない。流体の径方向温度分布そのものは解かず、混合平均温度を計算する。

- 入力：流体の密度ρ、管内平均流速u、粘度μ、比熱cp、流体熱伝導率kf、内径D、加熱区間長L、流体入口Tin、一定の壁温Tw。
- Re=ρuD/μ、Pr=μcp/kf、Pe=RePr、Gz=RePrD/L。
- 等温壁のHausen平均ヌセルト数：Nu平均=3.66+[0.0668Gz/(1+0.04Gz^(2/3))]、平均h=Nu平均×kf/D。十分長い加熱領域のNu平均は3.66へ近付く。
- 加熱開始から任意の位置xまでの累積平均ヌセルト数を同じ相関式から求め、NTU(x)=h平均(x)πDx/(ṁcp)、混合平均温度T(x)=Tin+(Tw−Tin)[1−exp(−NTU(x))]で計算。末端はx=Lの評価。指数減少はexpm1を使い小NTUでの桁落ちを軽減。
- 独立の局所相関：Nu局所(x)=d[x Nu平均(x)]/dx。x=0では理想化された入口特異点のため数値を返さず、グラフはx/L=0.01から描画。局所Nuを積分した結果が区間平均Nuに一致することをテストで確認。
- 壁から流体への熱移動を正とし、Qdot=ṁcp(Tout−Tin)、LMTD=(Tw−Tin)[1−exp(−NTU)]/NTU。加熱/冷却の温度差反転と0差を明示的に処理。
- 管摩擦のDarcy係数は十分発達した層流に対する f=64/Re とし、Δp=f(L/D)ρu²/2、理想水力動力=Δp×体積流量。入口・出口や継手の局所損失、ポンプ効率は含まないため実消費電力を意味しない。
- 速度助走長の目安 Lh≈0.05ReD、温度助走長の目安 Lth≈0.05RePrD を表示。これらは厳密な出口判定ではなく、速度助走長については加熱開始より上流での十分な流路長が必要となることを説明する。
- 本モジュールの保守的な教育用入力範囲は50≤Re<2300、0.6≤Pr≤2000、Pe≥50。乱流や遷移領域、極端に低いPeを拒否する。Re=2300は全ての配管流れの絶対的臨界値ではなく、入口条件・外乱・物性が遷移に影響する。
- 無条件の設計精度は保証しない。浮力の影響、入口の速度分布、物性の膜温度依存、軸方向熱伝導、壁厚、熱伝導との連成、表面粗さ、非円形流路、相変化は評価しない。適用範囲に入っても上流の十分な速度助走や物性の妥当性を検討すること。

一般式の独立照合先：
- Ground Heat, Hellström (1991): https://buildingphysics.com/download/Hellstr%C3%B6m_1991.pdf （管内層流のHausen式と十分に発達した入口速度分布の前提）
- 円管のHausen式と定壁温度の条件：https://www.mdpi.com/2311-5521/11/6/140
- Darcy摩擦係数f=64/Reの適用は十分発達した層流に限定。
資料の原文・図・数値表は転載せず、公開された物理的な関係式を独立に実装する。

### UIと計算例

9入力欄、段階的な計算解説、独自のSVG管内流れ模式図、相対軸位置x/L対混合平均流体温度、x/L対加熱開始からの区間平均Nuの2グラフ。比較条件を重ねられるが永続保存は未登録。HTMLエスケープと無効入力の明示を用意。

標準例：ρ=998kg/m³、u=0.04m/s、μ=0.001Pa s、cp=4180J/(kg K)、kf=0.6W/(m K)、D=0.02m、L=1m、Tin=20℃、Tw=60℃。
Re=798.4、Pr≈6.96667、Pe≈5562.19、Gz≈111.244、Nu平均≈7.51987、h平均≈225.596W/(m² K)、NTU≈0.27039、Tout≈29.4768℃、Qdot≈496.796W、Darcy摩擦圧力損失≈3.2Pa。速度助走長目安≈0.7984m、温度助走長目安≈5.562m。入口前に速度分布が十分発達していることが条件で、L=1mという加熱区間長がそれを自動保証するわけではない。

### 第11モデルのテスト実績

Node.js v22.16.0 の標準ランナー実行：node --test tests/laminar-pipe-convection.test.mjs。
**全13件成功、0失敗。** ①Re/Pr/Pe、Nu・hと熱収支、②長管極限Nu=3.66、③局所Nuの数値積分と区間平均の一致、④局所壁熱流率と混合平均流体の軸方向温度微分による熱収支、⑤温度差反転と0、⑥長さ感度、⑦流速感度、⑧摩擦損失と水力動力、⑨Re/Pr/Peの範囲外拒否、⑩不正数値と絶対零度、⑪入力HTMLエスケープとSVG/グラフ、⑫有効入力の有限値を確認。入口x=0の積分特異点には変数変換を用いた数値積分を使用。計13件のテストを保存しているので、実行時のテスト名は専用ファイルの内容を正とする。

公開アプリ上の結合、GitHub Pagesビルド、Safariを含む実ブラウザ、端末データの保存・復元、アクセシビリティの実操作検証、専門家校閲は未実施。

### Codex最終統合へ渡す注意点

1. 現行PR #1の最新HEADを統合時点で改めて確認し、ラインBの古い起点c8d207710374411694898093ca9d6adc16fa0fcfへ巻き戻さない。対象は新規2ファイルのみ。ラインBから本線へのコミットやPR作成はしない。
2. 既存のturbulent-pipe-convection.mjs（円管内乱流）と今回のlaminar-pipe-convection.mjs（入口の速度分布が発達した層流）は別モード。新モードID候補laminarpipe。既存のpipe/turbulent・convectionは置き換えない。
3. app.jsのimport、SIM_META、ui.simValues初期値、タブ、calculateSimulation、renderSimulator、renderSimulatorOutputsOnly、onInput/onChangeへ接続。主なexport：LAMINAR_PIPE_DEFAULTS、laminarPipeFieldNames、hausenLaminarNu、laminarPipeLocalNu、calculateLaminarPipe、laminarPipeTemperatureAt、renderLaminarPipeFields、renderLaminarPipeSteps、renderLaminarPipeDiagram、laminarPipeBulkGraph、laminarPipeNusseltGraph。
4. 出口温度、Nu平均と局所Nu、平均h、熱移動率、圧力損失、水力動力、速度・温度助走長を混同しない。平均Nu曲線は各xまでの平均であり、局所Nu曲線ではない。軸位置の最小は0.01Lでありx=0の局所係数を有限と誤表示しない。
5. 保存比較を有効化する前にstudy-core.mjsのvalidateLearningData内simComparisonsの許容モードと合法数値の検証を調整。古い学習記録・インポート/エクスポートと後方互換を守る。
6. scripts/build-public-site.mjsの明示的な配信許可リスト、sw.jsのキャッシュとオフライン対応、guide.mjs第7章§7.2との導線をCodex側で更新。既存モデルと異なるグラフの物理軸・単位・範囲・レスポンシブ320/390pxを検証する。
7. PR統合後にNode全テスト・公開ビルド・Safari/ChromeとiPhone・端末保存復元・オフラインE2Eを実施。Re=2300付近、Pe/Pr最小、入口x=0、出口がTwに近い極限、Qdotの加熱/冷却反転、グラフの重ね合わせを回帰テストする。
8. 上流に十分な速度助走区間がない実験装置へモデルをそのまま適用しない。入口で速度と温度が同時発達する問題、自然対流との混在、物性の温度依存は別モデルが必要。

### 最新到達点：ラインBの11新規モデル

既存5モデルを保護し、新規11モデルを追加。今回追加のlaminar-pipe-convection.mjsと専用テストは、他の10組と同じく独立モジュールのままで公開アプリには未登録。
独立テストの履歴は **7+9+11+12+12+12+12+13+14+15+13=130件成功・0失敗**。これらは各モジュールの個別テストであり、全体のGitHub Pages結合・公開ビルド・実ブラウザE2Eの完了ではない。
起点はPR #1のc8d2077。共有ファイルの変更・削除なし、新しいPRなし。chat/simulatorsの最新HEADから必要な新規ファイル11組を取り込み、既存の5モードと教材を保護する。統合の担当はCodexであり、このラインでは実施しない。

## 第12モデル（2026-10-30）：§8.5 鉛直平板上の平滑な層流膜状凝縮

### 追加ファイル・最新の個別コミット
- 実装：laminar-film-condensation.mjs、実装コミット 75af1b72aeea24b5775c09d0ec1e53a4060fb2b0。
- テスト：tests/laminar-film-condensation.test.mjs、最新テスト修正コミット 93b910b156eecded0df1db4a2baeaff083fc00a9。
- 本記録の更新後の最新HEADはchat/simulatorsブランチを参照する。本線PR #1、既存の5シミュレータ、既存11追加モデル、教材・問題・用語集、他ラインのファイルは編集しない。PR作成・統合も実施しない。

### 科学モデルと前提
対象は静止した純粋な飽和蒸気が、等温の鉛直平板の片面で膜状凝縮する現象。凝縮液が重力で滑らかに流下する、波立たない薄膜・層流・一定物性・薄膜内伝導支配・上端に液膜流入なしを仮定。流体物性は代表膜温度で使用者が評価して入力する。

記号：凝縮液の密度ρl、蒸気密度ρv、凝縮液の粘度μl、凝縮液熱伝導率kl、潜熱hfg、凝縮液比熱cpl、板高さL、片面幅W、飽和温度Tsat、壁温Tw。g=9.80665 m/s²、正の温度差ΔT=Tsat−Tw。新規モデルでは凝縮が成立するΔT≥0.01 Kを入力要件とし、温度逆転やΔT=0は本モデルの適用外として計算を拒否する。

- 平均熱伝達率 hbar=(2√2/3)[gρl(ρl−ρv)hfg kl³/(μl LΔT)]^(1/4) [W/(m² K)]。定数は約0.942809。一般に0.943と丸めて示されるNusseltの平滑層流液膜解と同等。
- x=0を平板上端、x=Lを下端とすると、膜厚 δ(x)=[4μl kl ΔT x/{gρl(ρl−ρv)hfg}]^(1/4) [m]。局所熱伝達率hx=kl/δ(x)。x=0では局所hが数学的に発散するため、局所h(0)はエラーとして拒否し、グラフはx/L=0.01〜1のみ表示。膜厚グラフはx/L=0〜1。
- 全放熱 Qdot=hbar L W ΔT [W]。凝縮の質量流量 mdot≈Qdot/hfg [kg/s]。上端からxまでの液膜累積質量流量はmdot(x)=mdot(L)(x/L)^(3/4)。積分から求めた放熱量と、液膜流量の独立運動量収支 Γ=ρl(ρl−ρv)gδ³/(3μl)が一致する。
- 出口の液膜Re=4 mdot/(Wμl)。理想的な平滑（波立たない）液膜の保守的な適用基準としてRe≤30。波立つ層流領域や乱流領域では計算エラーとし、適切な別相関が必要と通知。
- Jakob数Ja=cpl ΔT/hfg≤0.1を、膜の顕熱を無視する近似の教育上の閾値として使用。Jaが大きい場合はRohsenow型の潜熱補正や別モデルを検討するようエラーを返す。この閾値を普遍的な工学設計基準と誤解しない。
- 熱移動率、凝縮量[kg/s, kg/h]、平均Nu、液膜出口厚さ[mm]、局所hおよびxに沿う膜厚と局所hのSVGグラフ、流下・熱流方向の模式図、計算式・仮定・制限を説明する日本語UIを追加。比較条件を描画できるが公開アプリへの比較保存は未登録。
- 蒸気の主流せん断、非凝縮ガス、滴状凝縮、表面張力・波立ち・滴下、顕熱の厳密な評価、凝縮液の粘度・熱伝導率の温度依存、管・曲面、二次元端部効果は含まない。
- 他の既存convection、natural（単相自然対流）および各管内モデルとは**別モード**であり置き換えない。

独立の理論照合：Perry's Handbook の古典的Nusselt式、Scientific/engineering software ht Nusselt_laminar https://ht.readthedocs.io/en/latest/ht.condensation.html 、ScienceDirectの液膜波立ち境界 https://www.sciencedirect.com/topics/engineering/condensate-film 、ASMEの液膜不安定性論文 https://doi.org/10.1115/1.2198249 。一般に周知された方程式を独立実装し、原教材・外部書籍の画像・文章・表をコピーしていない。出典先を表示することと当該機関の専門家査読を得たことは別。

### 基準条件・検算
ρl=958 kg/m³、ρv=0.6 kg/m³、μl=2.82e−4 Pa s、kl=0.68 W/(m K)、hfg=2.26e6 J/kg、cpl=4200 J/(kg K)、L=0.1 m、W=0.4 m、Tsat=100 ℃、Tw=98 ℃。
hbar=17298.468658 W/(m² K)、Qdot=1383.877493 W、mdot=0.00061233517 kg/s、液膜出口Re=21.7140、出口膜厚=0.0524131 mm、Ja=0.00371681。上端は理想化された数学的特異点のため局所hは表示しない。

### 専用テストと未検証事項
GitHub上へ追加したソースとテストを再取得し、独立JavaScript実行環境で15件を実行、**15成功・0失敗**。確認項目：①既知の他物性条件でのNusselt係数、②標準例の独立算式、③膜厚と局所hのべき乗則、④凝縮液運動量収支と潜熱収支、⑤局所hの積分と全放熱の一致、⑥流下高さごとの凝縮質量流量、⑦幅の比例則、⑧高さ感度、⑨温度差感度、⑩粘度・熱伝導率・蒸気密度感度、⑪膜Reによる適用拒否、⑫Jaによる適用拒否、⑬温度差ゼロ・逆向きの拒否、⑭不正入力・絶対零度・密度順序、⑮日本語表示・HTMLエスケープ・SVGグラフ・比較曲線。

追加の決定論的な360入力組合せの探索では、成立した106条件すべての解説・両グラフにNaN/Infinity/undefinedがないことを確認。残り254条件は物性入力または理論適用域外として計算拒否。**今回のテストはNode.js標準ランナー実行ではなく、GitHub保存済みのJavaScriptを独立実行した検査。** 統合担当はnode --test tests/laminar-film-condensation.test.mjsを含む全テストをNode.jsで再実行する。

公開ビルド、GitHub Pages実画面、Safari・Chrome/iPhone 320/390px、端末比較保存復元、Service Worker/オフライン、外部の専門家による適用精度監査は未実施。

### Codexによる本線最終統合時のチェックリスト
1. PR #1最新HEADを統合直前に再取得し、古い起点c8d207710374411694898093ca9d6adc16fa0fcfに巻き戻さず、新規ファイル2件を現在の本線に取り込む。ここではPR #1を変更しない。
2. 新モードID候補condensation。app.jsのimport・SIM_META・ui.simValues初期値・モードタブ・calculateSimulation・renderSimulator・renderSimulatorOutputsOnly・onInput/onChangeへ新規分岐を追加。
3. 主なexports：CONDENSATION_DEFAULTS、condensationFieldNames、nusseltFilmCoefficient、calculateFilmCondensation、filmThicknessAt、filmLocalCoefficient、filmCumulativeMassFlow、renderCondensationFields、renderCondensationSteps、renderCondensationDiagram、condensationThicknessGraph、condensationLocalGraph。計算結果がerrorの場合は出力や保存を止め、入力値を保つ。
4. 表示にはhbar、Nu、Re、Ja、膜厚、Qdot、mdotをそれぞれ適切な単位で出す。厚さδグラフの横軸x/Lと局所hグラフの横軸x/Lは既存のΔT対Qdotグラフでは代用しない。x=0における発散を有限値と表記しない。
5. study-core.mjsのvalidateLearningData・simComparisonsに合法なcondensationモードを追加し、保存・インポート/エクスポート・旧データの後方互換を維持する。許容される物性値の上限下限と凝縮前提を保存時に検証する。
6. scripts/build-public-site.mjsの配信許可リストへ新規ESMを追加し、sw.jsのオフラインキャッシュを更新。guide.mjsと§8.5からの導線は最新本線に合わせて整備する。
7. Node全テストと公開ビルド、実ブラウザ・320/390px・アクセシビリティ・端末保存復元・オフラインE2Eを実施。膜Re>30・Ja>0.1・温度逆転時のエラーUI、グラフ単位、数値入力の不正値を確認する。
8. 膜の波立ち、非凝縮性ガス、温度依存物性を含む実機性能はこの理論解では保証しない。全モデル統合後に専門家を交えた相関式と適用範囲の再監査を行う。

### ラインB最新到達点（第12モデル）
保護済み既存5種類＋新規独立12種類＝17種類のシミュレータモジュールに相当。ただし新規12種類はまだ公開アプリに未統合。
専用テストの個別実行履歴：7+9+11+12+12+12+12+13+14+15+13+15＝**145件成功・0失敗**。最初の3種類の計27件と今回第12モデルの15件は独立JavaScript実行環境、残り第4〜11モデルの103件は各Node.js標準ランナーの履歴。累計145件は統合アプリの全体E2Eではない。
ブランチchat/simulatorsでは新規モジュール・専用テストと本進捗記録のみ編集する。PR #1、本線コード、他ライン、教材や問題は変更しない。監視とCodexは、本記録とブランチの最新HEAD、12組の新規実装＋テストを引き継ぎ、統合後に全体監査を行う。
