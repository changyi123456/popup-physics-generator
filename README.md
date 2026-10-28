# 物理之書：機械與能量

一本可以拆解、操作、翻閱的手繪 3D 物理實驗書。手搖發電機與史特靈熱機共用同一本實體書、鏡頭、放大鏡、翻頁與即時量測架。

**[翻開全書](https://changyi123456.github.io/popup-physics-generator/)** · [發電機篇](https://changyi123456.github.io/popup-physics-generator/#generator-1) · [熱機篇](https://changyi123456.github.io/popup-physics-generator/#stirling-1) · [離線單檔](dist/index.html) · [MIT 授權](LICENSE)

![手繪立體史特靈熱機與即時圓柱量測](assets/preview.png)

## 同一本書的兩部內容

第一部「電磁與能量」：手搖發電機的構造、感應、週期、能量，共四個跨頁。

第二部「熱與機械」：史特靈熱機的構造、循環、做功、實驗，共四個跨頁。

點書頁頂端的分部索引，或開啟「目錄」跳到指定跨頁。←／→ 可連續翻閱八個跨頁。跨頁前先收回裝置；回到另一部時保留其參數與累積量。新開啟時展示熱機篇，也可用上方網址片段直達指定跨頁，例如 `#stirling-2`。

## 可以親手做什麼

- 所有表面維持紙墨手繪風格：曲面書頁、封面、機械、字體、排線、放大鏡與操作。
- 右頁直接控制浮起／收回、拆解／組裝、運轉／暫停、條件切換與重設；左頁滑桿調整當前裝置參數。
- 發電機：拖搖柄、改轉速／匝數／磁場、交換磁極、反轉、切換電阻負載。暖黃色燈泡隨負載功率明暗變化。
- 熱機：拖飛輪手動探索，或啟動時給一個手推起轉；調整熱端、冷端溫度與煞車負載，切換剖面、加熱與負載釋放。
- 右側書邊的立體圓柱面向裝置。發電機顯示 Φ、ε、P；熱機顯示 p、V、機械負載功率。底部同步累積輸出能量。
- 放大鏡可檢視實際書頁和零件；紙上問答可掀開。手機提供可讀文字與原生控制；無 WebGL 時保留各篇結構示意與讀本。

拖空白處環視；Shift 拖曳只旋轉教具；滾輪縮放。「立體數據」同時近看裝置與量測架。原生替代控制都在閱讀模式內。

鍵盤：←／→ 翻頁，Space 運轉／暫停，E 拆解，P 浮出，B 闔書，M 放大鏡，R 重設，Escape 清除選取。熱機暫停會凍結模型時間，保留當時的轉速與量測值。

## 快速開始

下載後直接以現代瀏覽器開啟 `dist/index.html`。約 7.3 MB 的離線單檔已內嵌 Three.js、完整繁中手寫字型、程式與兩篇向量備援圖，不需外部資源。

開發需 Node.js 20 以上與 Python 3，不需安裝 npm 依賴：

```sh
node build.mjs --audit
npm run dev
```

本機網址 `http://127.0.0.1:4188/`。推送 `main` 後，GitHub Actions 建置、驗證並部署同一個 GitHub Pages 網址。

## 熱機模型

原創雙缸 α 型教學構造：兩顆動力活塞，20 mm 缸徑、18 mm 行程、43 mm 連桿，曲柄相差 90°。活塞位置使用有限長連桿的精確幾何，並直接決定兩氣室體積。

工作氣體固定總量；均勻壓力、理想氣體、等溫氣室、理想回熱器。熱源與冷源設定即時生效，沒有暖機模型。

```text
p = nR / (Vh/Th + Vc/Tc + Vr/Tr)
Tr = (Th − Tc) / ln(Th/Tc)
Wcycle = ∮ p dV = Wh + Wc
τgas = (p − patm) dV/dθ
J dω/dt = τgas − τfriction − τload
Pload = τload ω
```

溫度計算使用 K，體積使用 m³，壓力使用 Pa。書頁與圓柱顯示 kPa、mL、W、J。外部大氣壓在整圈的淨功為零。

轉速由壓力扭矩、摩擦與煞車負載決定；煞車取得的機械功最後轉為熱，沒有接上發電機。飛輪以隱式中點法積分；氣體作功分成負載輸出、摩擦耗散和飛輪動能變化。啟動與手動拖曳包含手部作功。暫停凍結時間；關閉加熱則將兩端設定為等溫，飛輪仍可先消耗原有動能。

等溫與完全回熱假設下的 `1 − Tc/Th` 明確標為**理想效率上限**，不是這個示意裝置的實機效率。未模擬漏氣、有限傳熱、管路壓降及真實暖機。連續曲柄得到平滑 p–V 迴圈，不宣稱實際活塞會按四個理想過程停走。

## 發電機模型

每匝面積 80 cm²，預設 120 匝、0.45 T。60／20 齒增速齒輪讓線圈轉速為搖柄三倍。均勻磁場、4 Ω 線圈、22 Ω 電阻燈泡，忽略電感與機械摩擦。

```text
Φ = BA cosθ
ε = −N dΦ/dt = NBAω sinθ
I = ε / (Rcoil + Rload)
Pload = I² Rload
Eload = ∫ Pload dt
```

Φ 與 ε 相差四分之一週期；電阻負載功率週期為 T/2，兩個半週都累積電能。發電機以 0.18 倍時間、熱機以 0.24 倍時間演示，轉速讀值仍為物理轉速。

## 驗證範圍

`node build.mjs --audit` 驗證發電機 2,416 項條件、熱機 3,614 項條件，以及實際 WebGL 幾何的 361 個線圈／齒輪姿態、721 個雙連桿端點姿態。熱機檢查固定氣體總量、體積導數、定長連桿、每圈能量平衡、等溫零淨功、理想效率上限及飛輪離散能量收支。

兩部均為教學幾何。這些檢查不等同全機的掃掠碰撞、製造公差或實機性能驗證。

## 共用架構

- `src/library.js`：全書目錄、分部、跨頁、零件說明與量測路由。
- `src/model.js`／`src/generator.js`：發電機物理與實體構造。
- `src/stirling-model.js`／`src/stirling.js`：熱機熱力學、動力學與實體構造。
- `src/book.js`：唯一一套曲面紙張、印刷控制、問答紙片與雙向翻頁。
- `src/charts.js`：共用的右頁折出量測架與動態圓柱。
- `src/main.js`：共用場景、當前裝置、狀態、鏡頭與手勢。
- `src/ink.js`／`src/lens.js`：手繪材質與實際畫面放大鏡。
- `build.mjs`：離線打包、兩篇備援圖與模型／幾何驗證。

## 來源與授權

- [日本海上技術安全研究所：史特靈熱機構造](https://www.nmri.go.jp/archives/eng/khirata/stirling/kiriki/begin/struct.html)
- [Ohio University：理想等溫分析與限制](https://people.ohio.edu/urieli/stirling/isothermal/isothermal.html)
- [PHYWE：熱機 p–V、轉速與負載量測](https://www.phywe.com/physics/thermodynamics/temperature-heat/stirling-engine-with-measurelab_11639_12672/)
- [OpenStax：Electric Generators and Back Emf](https://openstax.org/books/university-physics-volume-2/pages/13-6-electric-generators-and-back-emf)
- [教育部：高中物理法拉第電磁感應定律](https://market.cloud.edu.tw/resources/web/1812065)

立體書呈現靈感來自 [Techartist / Every Joule](https://iamtechartist.com/every-joule/)。沿用 Anatomy、Spatial Pop-up Book 與 Mechanical Anatomy Book 的工藝流程；幾何、互動與教材文字為原創實作。

原創程式與教材採 [MIT](LICENSE)。Three.js 與 Anatomy 工具採 MIT；LXGW WenKai TC 字型採 SIL OFL。請保留 [第三方授權](THIRD_PARTY_NOTICES.md) 與字型授權。
