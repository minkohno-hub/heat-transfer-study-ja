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
