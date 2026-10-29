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