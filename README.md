# 物理之書：機械與能量

一本可以拆解、操作、翻閱的手繪 3D 物理實驗書。手搖發電機、史特靈熱機、離心調速器、渦電流煞車、建築阻尼球與汽車避震器共用同一本實體書、鏡頭、放大鏡、翻頁與即時量測架。

**[翻開全書](https://changyi123456.github.io/popup-physics-generator/)** · [發電機篇](https://changyi123456.github.io/popup-physics-generator/#generator-1) · [熱機篇](https://changyi123456.github.io/popup-physics-generator/#stirling-1) · [調速器篇](https://changyi123456.github.io/popup-physics-generator/#governor-1) · [渦電流篇](https://changyi123456.github.io/popup-physics-generator/#eddy-1) · [阻尼球篇](https://changyi123456.github.io/popup-physics-generator/#tmd-1) · [避震器篇](https://changyi123456.github.io/popup-physics-generator/#suspension-1) · [離線單檔](dist/index.html) · [MIT 授權](LICENSE)

![手繪立體阻尼球與即時圓柱量測](assets/preview.png)

## 一座機械一頁，後面接科學史

| 頁序 | 內容 |
|---|---|
| 1–2 | 手搖發電機操作；法拉第與電磁感應的科學史 |
| 3–4 | 史特靈熱機操作；節熱器與回熱思路的科學史 |
| 5–6 | 離心調速器操作；飛球、蒸汽閥與回授的科學史 |
| 7–8 | 渦電流煞車操作；阿拉戈、傅科與磁制動的科學史 |
| 9–10 | 建築阻尼球操作；弗拉姆吸振器與高樓阻尼的科學史 |
| 11–12 | 汽車避震器操作；彈簧與液壓阻尼器的科學史 |

六座裝置各保留一個操作跨頁，共十二個實體跨頁。科學史是純紙面時間軸與原創概念手繪圖，不放立體機械、量測架或實驗控制；圖稿不是歷史原器復刻。點史料註記可讀文字與原始資料連結。

**拖右下書角往左翻、拖左下書角往右翻。** 紙張彎曲跟隨手勢；短拖會回彈，過半或快速甩動則完成。裝置先收回紙面，印在紙上的機械圖也跟著紙張翻走，翻到下一座時才立起。滑鼠與觸控共用此操作，左上角「目錄」可點選十二個實體書頁並跳頁，拖書角翻閱仍然保留。←／→ 與手機按鈕是替代控制。

閱讀模式保留原本十六節，新增兩部各四節，共 24 節；其小節選擇與實體書的十二頁順序分開。參數、物理相位及累積能量按裝置保留。新開啟從發電機開始；`#governor-1` 直達調速器，`#governor-history` 直達其科學史；舊的 `#stirling-2` 等片段保留對應閱讀小節。

## 可以親手做什麼

- 所有表面維持紙墨手繪風格：曲面書頁、封面、機械、字體、排線、放大鏡與操作。
- 右頁直接控制浮起／收回、拆解／組裝、運轉／暫停、條件切換與重設；左頁滑桿調整當前裝置參數。
- 發電機：拖搖柄、改轉速／匝數／磁場、交換磁極、反轉、切換電阻負載。暖黃色燈泡隨負載功率明暗變化。
- 熱機：拖飛輪手動探索，或啟動時給一個手推起轉；調整熱端、冷端溫度與煞車負載，切換剖面、加熱與負載釋放。
- 調速器：改動力供給、軸端負載與中央配重，切換回授、突加負載。飛球張角、套筒升程、撥叉與動力開度共同作動。
- 渦電流：手推圓盤後放手滑行，調磁場與磁極位置，對照整片／開槽圓盤、鋁／銅材質。磁極移開則無磁制動；開槽和材質更換先停轉並清除該次能量。
- 阻尼球：調激振頻率、調諧頻率比與球阻尼比；切換振台、鎖定歸零重測，或輕推樓層。四索擺長與雙側阻尼器共同作動。
- 避震器：調路面頻率、彈簧剛度與阻尼；切平路看自由衰減，旁通阻尼或剖開筒身看活塞與閥片，也可壓一下車身。
- 右側書邊的立體圓柱面向裝置。發電機顯示 Φ、ε、P；熱機顯示 p、V、機械負載功率；調速器顯示轉速、升程與動力開度；渦電流顯示轉速、制動力矩與發熱功率。阻尼球顯示樓層位移、球相對行程與耗散功率；避震器顯示車身加速度、懸吊行程與耗散功率。底部同步累積輸出或耗散能量。
- 放大鏡可檢視實際書頁和零件；紙上問答可掀開。手機提供可讀文字與原生控制；無 WebGL 時保留各篇結構示意與讀本。

拖空白處環視；Shift 拖曳只旋轉教具；滾輪縮放。「立體數據」同時近看裝置與量測架。原生替代控制都在閱讀模式內。

鍵盤：←／→ 翻頁，Space 運轉／暫停，E 拆解，P 浮出，B 闔書，M 放大鏡，R 重設，Escape 清除選取。熱機暫停會凍結模型時間，保留當時的轉速與量測值。

## 快速開始

下載後直接以現代瀏覽器開啟 `dist/index.html`。約 7.7 MB 的離線單檔已內嵌 Three.js、完整繁中手寫字型、程式與六篇向量備援圖，不需外部資源。

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

## 調速器模型

等臂 Porter 式：每個飛球 250 g、臂長 150 mm，中央套筒質量可調，角度限制 22°–62°。兩組定長上下臂把球的張角變成套筒升程；止推環、撥叉與連桿控制馬達供給。模型聯立主軸與臂的慣性、重力、阻尼、止擋和簡化馬達曲線，以 RK4 積分。比例回授有轉速下垂，並非完美恆速。向心箭頭代表圓周加速度項，不把離心力當作實驗室座標中額外作用力。

```text
r = L sinθ ; h = L cosθ
升程 = 2L(cosθmin − cosθ)
平衡：ω² = (1 + M/m)g / (L cosθ)
動力開度 = clamp(供給 − 回授增益 × 正規化升程, 0, 1)
```

## 渦電流模型

半徑 80 mm、軸孔 6 mm、厚 2 mm 的導電盤；12 道 4° 邊緣開槽從 0.38R 延伸到盤緣。實際幾何、質量與慣量都扣除同樣缺口。鋁、銅使用代表性室溫材料常數；模型不是材料鑑定。

```text
τ = −kω ; P熱 = kω² ≥ 0
k ∝ B² × 導電率 × 厚度 × 磁極交集面積矩 × 開槽係數
ω(t) = ω₀ exp[−(k+b)t/J]
手部淨輸入 = 圓盤動能 + 渦電流熱 + 軸承耗散
```

磁極是 25 mm 方形，依它與真正圓盤的交集積分面積矩；磁極移開或 B=0 時 k=0。開槽抑流係數 0.16 是教學示意，未解電磁場或硬體標定。解析衰減同時計算相位、渦電流熱與軸承耗散；靜止時沒有磁保持力。熱量只轉成小幅的真實計算溫升，沒有誇大成發光高溫。

兩座新裝置以 0.24 倍時間展示，讀值仍是物理量。圓柱與裝置動作直接讀同一個模型，暫停則凍結模型時間。

## 阻尼球與避震器模型

兩座均用 SI 制兩自由度線性模型，由同一狀態產生原生 3D 運動、書上數據與圓柱。以隱式中點法積分，核對振台／路面作功、手部輸入、調參作功、儲存振動能及阻尼耗散；演示時間為物理時間的 0.4 倍。暫停、歷史頁、折回紙面及拆解均凍結物理時間。

阻尼球是原創縮尺試驗台：3 kg 等效樓層、0.3 kg 球、1 Hz 結構固有頻率、2.5% 結構阻尼比，振台目標振幅 3 mm。`kt=mg/L`、`ct=2ζt mωt`；四索幾何保持實際長度並有擺動上升量，動力學採小角度水平近似。鎖定參照將球併入樓層，總質量3.3 kg，並非同質量的「無球」建築；兩者使用相同振台。RMS包含本次起振暫態；調諧不保證所有頻率都減振。不是台北101的結構或性能縮製。

避震器是四分之一車：簧上250 kg、簧下40 kg、輪胎180 kN/m及30 N·s/m，路面振幅8 mm；彈簧10–30 kN/m、阻尼600–3500 N·s/m。以靜態承重平衡為零；改剛度視為同步調預載保持中性車高。筒身、閥孔、閥片、活塞桿、彈簧座及輪胎有實際幾何，油流箭頭為方向示意，非CFD。旁通設理想阻尼為零。彈簧儲能，`P耗=c(v車身−v車輪)²`；車身與車輪分別積分，法向力含靜態重量。

超出小角度／樓層行程，或避震器60 mm相對行程／接地限制時停止並提示重設；未模擬撞擊。閱讀模式的頻率響應曲線是穩態峰值，圓點是瞬時值；兩者明確區分。

## 驗證範圍

`node build.mjs --audit` 驗證發電機 2,416 項條件、熱機 3,614 項條件，調速器 1,088 項、渦電流 2,894 項，加上振動10,814項，共20,826項物理條件，以及實際 WebGL 幾何的 361 個線圈／齒輪姿態、721 個熱機連桿端點姿態、361 個調速連桿與固定尺／支柱間隙姿態與 244 個圓盤軸／滑台姿態。熱機檢查固定氣體總量、體積導數、定長連桿、每圈能量平衡、等溫零淨功、理想效率上限及飛輪離散能量收支。

阻尼球／避震器另通過3,109項原生幾何與動態條件，含604姿態、99組參數、無阻尼超限停機、自由衰減及時域／頻域對照。最大實際懸索端點誤差約3.3e−13 world units，活塞最小內部行程餘量14 world units。

六部均為教學幾何。這些檢查不等同全機的掃掠碰撞、製造公差或實機性能驗證。

## 共用架構

- `src/library.js`：分部、獨立的實體頁序／完整讀本、科學史、零件說明與量測路由。
- `src/model.js`／`src/generator.js`：發電機物理與實體構造。
- `src/stirling-model.js`／`src/stirling.js`：熱機熱力學、動力學與實體構造。
- `src/governor-model.js`／`src/governor.js`：調速器耦合動力學、負回授與機構。
- `src/eddy-model.js`／`src/eddy.js`：渦電流阻尼、材料與缺口慣量、磁隙滑台。
- `src/vibration-model.js`／`src/tmd.js`／`src/suspension.js`：耦合振動、能量收支及兩座新試驗台。
- `src/vibration-kit.js`／`src/vibration-audit.js`：變節距彈簧、彈性柱、懸索及原生接點驗證。
- `src/machine-kit.js`：新裝置共用的手繪原生實體零件。
- `src/book.js`：唯一一套曲面紙張、印刷控制、問答紙片與雙向翻頁。
- `src/charts.js`：共用的右頁折出量測架與動態圓柱。
- `src/main.js`：共用場景、當前裝置、狀態、鏡頭與手勢。
- `src/ink.js`／`src/lens.js`：手繪材質與實際畫面放大鏡。
- `build.mjs`：離線打包、六篇備援圖與模型／幾何驗證。

## 來源與授權

- [Frahm 原始動態吸振專利 US989958A](https://patents.google.com/patent/US989958A/en)
- [台北101官方：風阻尼球構造與目的](https://www.taipei-101.com.tw/tw/observatory/feature/scenery)
- [國震中心：減震器與調諧質塊](https://safehouse.ncree.niar.org.tw/seismic-school/weapons/damper)
- [University of Michigan CTMS：懸吊建模](https://ctms.engin.umich.edu/CTMS/index.php?example=Suspension&section=SystemModeling)
- [KYB：避震器活塞、油路與控制回彈](https://www.kyb.com/resources/shocks-struts-101/how-shocks-work/)
- [Monroe：公司發展年表](https://www.monroe.com/de-de/archive/about-us.html)

- [GUNT：離心調速器實驗台](https://www.gunt.de/images/datasheet/1421/TM-632-Centrifugal-governor-gunt-1421-pdf_1_en-GB.pdf)
- [TecQuipment：Governors](https://www.tecquipment.com/pt/governors)
- [PASCO：完整／開槽金屬片與渦電流](https://cdn.pasco.com/product_document/Magnetic-Force-Accessory-Manual-EM-8642A.pdf)
- [皇家研究院：法拉第發電實驗](https://www.rigb.org/explore-science/explore/collection/michael-faradays-generator)
- [蘇格蘭國立博物館：史特靈與節熱器](https://blog.nms.ac.uk/2016/09/26/200-years-from-stirling-to-saturn-with-a-time-machine/)
- [NASA：1816、1827 年史特靈專利書目](https://ntrs.nasa.gov/api/citations/19780016056/downloads/19780016056.pdf)
- [Science Museum Group：瓦特與調速器](https://collection.sciencemuseumgroup.org.uk/people/ap24508/watt-james)
- [Maxwell：On Governors, 1868 原論文](https://webhomes.maths.ed.ac.uk/~v1ranick/papers/maxwell1.pdf)
- [University of Perugia：阿拉戈裝置](https://fisgeo.unipg.it/dipartimento/collezione-storica-degli-strumenti-di-fisica/contenuti-delle-teche/elettrotecnica/apparato-di-arago)
- [École Polytechnique：1855 年傅科示範器](https://artsandculture.google.com/asset/appareil-de-foucault-ou-machine-d-induction-de-foucault/KgF4tnCtpbYypA?hl=fr)

- [日本海上技術安全研究所：史特靈熱機構造](https://www.nmri.go.jp/archives/eng/khirata/stirling/kiriki/begin/struct.html)
- [Ohio University：理想等溫分析與限制](https://people.ohio.edu/urieli/stirling/isothermal/isothermal.html)
- [PHYWE：熱機 p–V、轉速與負載量測](https://www.phywe.com/physics/thermodynamics/temperature-heat/stirling-engine-with-measurelab_11639_12672/)
- [OpenStax：Electric Generators and Back Emf](https://openstax.org/books/university-physics-volume-2/pages/13-6-electric-generators-and-back-emf)
- [教育部：高中物理法拉第電磁感應定律](https://market.cloud.edu.tw/resources/web/1812065)

立體書呈現靈感來自 [Techartist / Every Joule](https://iamtechartist.com/every-joule/)。沿用 Anatomy、Spatial Pop-up Book 與 Mechanical Anatomy Book 的工藝流程；幾何、互動與教材文字為原創實作。

原創程式與教材採 [MIT](LICENSE)。Three.js 與 Anatomy 工具採 MIT；LXGW WenKai TC 字型採 SIL OFL。請保留 [第三方授權](THIRD_PARTY_NOTICES.md) 與字型授權。
