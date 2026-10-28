// One WebGL context is shared by the book and its magnifier.
// Copy the current frame immediately after rendering, before its drawing buffer is released.
export function createMagnifier({ canvas, getRenderer, getCamera, state, book, rayAt, partInfo, chapters }) {
  const lens = document.querySelector("#lens"), note = document.querySelector("#lens-note");
  const output = document.querySelector("#lens-canvas"), context = output.getContext("2d");
  let point = null, lastKey = "";
  function hide() { point = null; lens.hidden = true; note.hidden = true; lastKey = ""; }
  function show(e, part, pageHit) {
    const onText = pageHit?.object.userData.bookSide === "left";
    if ((!state.lensEnabled && !onText) || state.open < 0.95) { hide(); return; }
    const diameter = innerWidth < 700 ? 146 : 172, radius = diameter / 2;
    const limit = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    point = { x: e.clientX, y: e.clientY, diameter, printedText: onText && !part && (1 - pageHit.uv.y) * 244 < 174 };
    lens.style.left = limit(e.clientX - radius, 3, innerWidth - diameter - 3) + "px";
    lens.style.top = limit(e.clientY - radius, 3, innerHeight - diameter - 3) + "px";
    lens.hidden = false;
    let title, explanation, key;
    if (part && partInfo[part]) {
      key = part; title = partInfo[key].title; explanation = partInfo[key].text;
    } else if (onText) {
      const region = book.hit(pageHit.uv);
      if (region?.part) { key = region.part; title = partInfo[key].title; explanation = partInfo[key].text; }
      else {
        const y = (1 - pageHit.uv.y) * 244;
        key = y > 174 ? 'settings' : y > 105 ? 'physics' : 'chapter';
        if(state.history){title='機械科學史手記';explanation='這一頁以時間軸與概念手繪圖介紹機械的發展。圖稿為原理示意；點右頁下方的史料連結可閱讀來源。';}
        else if(['tmd','suspension'].includes(chapters[state.chapter].subject)&&(key==='settings'||key==='physics')){const tmd=chapters[state.chapter].subject==='tmd';title=tmd?'調諧與振動能量交換':'彈簧回復，油壓控制回彈';explanation=tmd?'先固定調諧與阻尼，再改振台頻率。比較樓層與球的相對行程，或鎖定歸零重測。小角度模型依相同輸入計算參照與耗散。':'固定路面與彈簧，比較阻尼；再切到平路觀察自由衰減。彈簧儲能，阻尼器耗散；車身加速度、懸吊行程與熱功率同步計算。';}
        else if(chapters[state.chapter].subject==='governor'&&(key==='settings'||key==='physics')){title=key==='settings'?'控制一個實驗條件':'速度如何變成套筒升程';explanation='固定動力與中央質量，切換回授，再突加負載。觀察飛球、套筒、動力開度和轉速如何依序回應。平衡條件與瞬時動態狀態要分開比較。';}
        else if(chapters[state.chapter].subject==='eddy'&&(key==='settings'||key==='physics')){title=key==='settings'?'比較材質、開槽與磁極位置':'制動力矩與發熱';explanation='磁煞車力矩反抗角速度，P熱 = kω² 為非負。開槽會改變電流路徑與慣量；銅、鋁的密度與導電率也不同。更換圓盤會先停轉，再重新起轉比較。';}
        else if(chapters[state.chapter].subject==='stirling'&&key==='settings'){title='一次改變一個條件';explanation='固定熱端與冷端溫度，只改煞車負載，觀察轉速與機械輸出功率；再固定負載，比較不同溫差。溫度代表理想熱源與冷源設定。';}
        else if(chapters[state.chapter].subject==='stirling'&&key==='physics'){title='從壓力、體積到機械功';explanation='紙上的 p–V 圈內面積代表每圈氣體淨功。瞬時壓力扭矩可以反向；飛輪暫存能量，輸出分到機械負載與摩擦。理想效率上限不是實機效率。';}
        else if(key==='settings'){title='一次改變一個條件';explanation='在相同角度比較轉速、匝數或磁場。預測電壓振幅隨 N、B、ω 成正比；頻率由轉速決定。';}
        else if(key==='physics'){title='角度與變化率';explanation='磁通鏈為 NBA cosθ，感應電壓為它的負時間變化率。磁通量最大時，勻速轉動的感應電壓恰為零。';}
        else {title=chapters[state.chapter].title;explanation=chapters[state.chapter].paragraphs[1];}
      }
    } else { note.hidden = true; return; }
    if (key !== lastKey) { note.querySelector("strong").textContent = title; note.querySelector("p").textContent = explanation; lastKey = key; }
    const noteWidth = Math.min(290, innerWidth - 34);
    let x = e.clientX + radius + 18, y = e.clientY - 90;
    if (x + noteWidth > innerWidth - 15) x = e.clientX - radius - noteWidth - 18;
    if (x < 15) { x = 17; y = e.clientY + radius + 18; }
    note.style.left = limit(x, 15, innerWidth - noteWidth - 15) + "px";
    note.style.top = limit(y, 20, innerHeight - 220) + "px"; note.hidden = false;
  }
  function draw() {
    if (!point || !getRenderer()) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5), size = Math.round(point.diameter * dpr);
    if (output.width !== size) { output.width = size; output.height = size; }
    const sx = (point.x - rect.left) * canvas.width / rect.width, sy = (point.y - rect.top) * canvas.height / rect.height;
    const source = point.diameter * canvas.width / rect.width / 2.2;
    context.clearRect(0, 0, size, size); context.save(); context.beginPath(); context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); context.clip();
    context.drawImage(canvas, sx - source / 2, sy - source / 2, source, source, 0, 0, size, size);
    if (point.printedText) {
      const pageHit = rayAt({ clientX: point.x, clientY: point.y }).intersectObjects(book.pages, false)[0];
      if (pageHit?.object.userData.bookSide === "left") {
        const patch = book.printPatch(pageHit.uv, "left", getCamera(), rect.width, rect.height), scale = dpr * 2.2;
        const a = patch.a * scale, b = patch.b * scale, c = patch.c * scale, d = patch.d * scale;
        context.save(); context.setTransform(a, b, c, d, size / 2 - a * patch.x - c * patch.y, size / 2 - b * patch.x - d * patch.y);
        context.drawImage(patch.source, 0, 0); context.restore();
      }
    }
    const sheen = context.createLinearGradient(0, 0, size, size);
    sheen.addColorStop(0, "rgba(246,251,242,.13)"); sheen.addColorStop(0.6, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(72,92,64,.05)");
    context.fillStyle = sheen; context.fillRect(0, 0, size, size); context.restore();
  }
  return { hide, show, draw };
}
