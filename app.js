// 大江戸線 証アプリ（SVG簡易路線図 + 編集モード + グリッド）
// - 外部APIなし（無料運用向き）
// - 駅クリック → 詳細シート
// - 写真必須で証保存（削除可）
// - 編集モードONで駅をドラッグして配置調整 → JSONコピー/保存
// - 編集モード中：グリッド表示 & グリッド吸着（スナップ）
// - 路線は環状に閉じない（E-38→E-01は繋がない）
// - 支線として E-01(新宿西口) → E-28(都庁前) を線で追加
// - ラベル被り軽減：区間ごとにラベル方向を自動調整

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 1) Stations（全38駅）※あなたの配置JSONを反映
  // =========================
  const stations = [
    { id:"E-01", code:"E-01", name:"新宿西口", x:360, y:480 },
    { id:"E-02", code:"E-02", name:"東新宿", x:400, y:480 },
    { id:"E-03", code:"E-03", name:"若松河田", x:440, y:480 },
    { id:"E-04", code:"E-04", name:"牛込柳町", x:480, y:480 },
    { id:"E-05", code:"E-05", name:"牛込神楽坂", x:520, y:480 },
    { id:"E-06", code:"E-06", name:"飯田橋", x:560, y:480 },
    { id:"E-07", code:"E-07", name:"春日", x:600, y:480 },
    { id:"E-08", code:"E-08", name:"本郷三丁目", x:640, y:480 },
    { id:"E-09", code:"E-09", name:"上野御徒町", x:680, y:480 },
    { id:"E-10", code:"E-10", name:"新御徒町", x:680, y:520 },
    { id:"E-11", code:"E-11", name:"蔵前", x:680, y:560 },
    { id:"E-12", code:"E-12", name:"両国", x:680, y:600 },
    { id:"E-13", code:"E-13", name:"森下", x:680, y:640 },
    { id:"E-14", code:"E-14", name:"清澄白河", x:680, y:680 },
    { id:"E-15", code:"E-15", name:"門前仲町", x:640, y:680 },
    { id:"E-16", code:"E-16", name:"月島", x:600, y:680 },
    { id:"E-17", code:"E-17", name:"勝どき", x:560, y:680 },
    { id:"E-18", code:"E-18", name:"築地市場", x:520, y:680 },
    { id:"E-19", code:"E-19", name:"汐留", x:480, y:680 },
    { id:"E-20", code:"E-20", name:"大門", x:440, y:680 },
    { id:"E-21", code:"E-21", name:"赤羽橋", x:400, y:680 },
    { id:"E-22", code:"E-22", name:"麻布十番", x:360, y:680 },
    { id:"E-23", code:"E-23", name:"六本木", x:320, y:680 },
    { id:"E-24", code:"E-24", name:"青山一丁目", x:320, y:640 },
    { id:"E-25", code:"E-25", name:"国立競技場", x:320, y:600 },
    { id:"E-26", code:"E-26", name:"代々木", x:320, y:560 },
    { id:"E-27", code:"E-27", name:"新宿", x:320, y:520 },
    { id:"E-28", code:"E-28", name:"都庁前", x:320, y:480 },
    { id:"E-29", code:"E-29", name:"西新宿五丁目", x:320, y:440 },
    { id:"E-30", code:"E-30", name:"中野坂上", x:320, y:400 },
    { id:"E-31", code:"E-31", name:"東中野", x:320, y:360 },
    { id:"E-32", code:"E-32", name:"中井", x:320, y:320 },
    { id:"E-33", code:"E-33", name:"落合南長崎", x:320, y:280 },
    { id:"E-34", code:"E-34", name:"新江古田", x:320, y:240 },
    { id:"E-35", code:"E-35", name:"練馬", x:320, y:200 },
    { id:"E-36", code:"E-36", name:"豊島園", x:320, y:160 },
    { id:"E-37", code:"E-37", name:"練馬春日町", x:320, y:120 },
    { id:"E-38", code:"E-38", name:"光が丘", x:320, y:80 },
  ];

  // =========================
  // 2) Storage
  // =========================
  const STORAGE_KEY = "oedo_proofs_svg_v1";
  let proofs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  let selectedStation = null;

  function saveProofs(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
  }

  // =========================
  // 3) DOM refs
  // =========================
  const svg = document.getElementById("oedoSvg");

  // editor bar
  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const copyJsonBtn = document.getElementById("copyJsonBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const editorHint = document.getElementById("editorHint");
  const gridToggle = document.getElementById("gridToggle");
  const snapToggle = document.getElementById("snapToggle");

  // sheet
  const sheet = document.getElementById("sheet");
  const stationName = document.getElementById("stationName");
  const stationStatus = document.getElementById("stationStatus");
  const proofList = document.getElementById("proofList");
  const closeSheetBtn = document.getElementById("closeSheetBtn");
  const addProofBtn = document.getElementById("addProofBtn");

  // modal
  const modal = document.getElementById("modal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const photoInputFile = document.getElementById("photoInputFile");
  const photoInputCamera = document.getElementById("photoInputCamera");
  const photoPreviewWrap = document.getElementById("photoPreviewWrap");
  const photoPreviewInner = document.getElementById("photoPreviewInner");
  const reselectBtn = document.getElementById("reselectBtn");
  const clearPhotoBtn = document.getElementById("clearPhotoBtn");
  const commentInput = document.getElementById("commentInput");
  const saveProofBtn = document.getElementById("saveProofBtn");

  // 要素チェック
  const required = [
    ["oedoSvg", svg],
    ["toggleEditBtn", toggleEditBtn],
    ["copyJsonBtn", copyJsonBtn],
    ["downloadJsonBtn", downloadJsonBtn],
    ["editorHint", editorHint],
    ["gridToggle", gridToggle],
    ["snapToggle", snapToggle],
  ];
  for (const [id, el] of required) {
    if (!el) {
      alert(`HTMLに要素 #${id} が見つかりません（編集バーの追加漏れかも）`);
      return;
    }
  }

  // =========================
  // 4) Grid settings
  // =========================
  let showGrid = false;
  let snapToGrid = true;
  const GRID_SIZE = 20;
  const GRID_BOLD = 100;

  // SVGの固定サイズ（viewBoxと合わせる）
  const SVG_W = 1000;
  const SVG_H = 700;

  // =========================
  // 5) Helpers
  // =========================
  function isVisited(stationId){
    return proofs.some(p => p.stationId === stationId);
  }
  function countByStation(stationId){
    return proofs.filter(p => p.stationId === stationId).length;
  }
  function elNS(name){
    return document.createElementNS("http://www.w3.org/2000/svg", name);
  }

  function stationsExportJson(){
    const arr = stations.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      x: Math.round(s.x),
      y: Math.round(s.y),
    }));
    return JSON.stringify(arr, null, 2);
  }

  async function copyToClipboard(text){
    try{
      await navigator.clipboard.writeText(text);
      alert("配置JSONをクリップボードにコピーしました！");
    }catch{
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("配置JSONをコピーしました！（フォールバック）");
    }
  }

  function downloadText(filename, text){
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =========================
  // 6) Edit mode (dragging)
  // =========================
  let editMode = false;
  let dragging = null; // { station, dx, dy }
  let movedDuringDrag = false;

  function setEditMode(on){
    editMode = on;
    toggleEditBtn.textContent = `編集モード：${editMode ? "ON" : "OFF"}`;
    editorHint.textContent = editMode
      ? "ON：駅をドラッグで移動。グリッド表示/吸着も可。終わったら「配置JSONをコピー」"
      : "OFF：駅をタップして証を追加できます";
  }

  function svgPointFromClient(clientX, clientY){
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function startDrag(station, evt){
    movedDuringDrag = false;
    const { x, y } = svgPointFromClient(evt.clientX, evt.clientY);
    dragging = {
      station,
      dx: station.x - x,
      dy: station.y - y,
    };
  }

  function moveDrag(evt){
    if (!dragging) return;
    evt.preventDefault();

    const { x, y } = svgPointFromClient(evt.clientX, evt.clientY);

    let newX = x + dragging.dx;
    let newY = y + dragging.dy;

    if (snapToGrid) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    }

    newX = Math.max(20, Math.min(SVG_W - 20, newX));
    newY = Math.max(20, Math.min(SVG_H - 20, newY));

    dragging.station.x = newX;
    dragging.station.y = newY;
    movedDuringDrag = true;

    renderSvg();
  }

  function endDrag(){
    dragging = null;
  }

  svg.addEventListener("pointermove", moveDrag, { passive: false });
  window.addEventListener("pointerup", endDrag);

  // =========================
  // 7) ラベル被り軽減：区間ごとにオフセットを決める
  // =========================
  function labelPlacement(station){
    // 微調整用：偶数/奇数で少しズラす
    const n = parseInt(station.id.replace("E-", ""), 10);
    const wobble = (n % 2 === 0) ? 6 : -6;

    // 上の横線（y=480）は 下に出す
    if (station.y === 480 && station.x >= 360 && station.x <= 680) {
      return {
        nameDx: wobble, nameDy: 24,
        codeDx: wobble, codeDy: 38,
        anchor: "middle"
      };
    }

    // 右縦（x=680）は 左に出す（外側）
    if (station.x === 680 && station.y >= 480) {
      return {
        nameDx: -18, nameDy: wobble,
        codeDx: -18, codeDy: 16 + wobble,
        anchor: "end"
      };
    }

    // 下の横線（y=680）は 上に出す
    if (station.y === 680) {
      return {
        nameDx: wobble, nameDy: -18,
        codeDx: wobble, codeDy: -34,
        anchor: "middle"
      };
    }

    // 左縦（x=320）は 右に出す（外側）
    if (station.x === 320) {
      return {
        nameDx: 18, nameDy: wobble,
        codeDx: 18, codeDy: 16 + wobble,
        anchor: "start"
      };
    }

    // デフォルト（上）
    return {
      nameDx: 0, nameDy: -18,
      codeDx: 0, codeDy: -34,
      anchor: "middle"
    };
  }

  // =========================
  // 8) Render SVG
  // =========================
  function renderGrid(){
    if (!(editMode && showGrid)) return;

    for (let x = 0; x <= SVG_W; x += GRID_SIZE) {
      const line = elNS("line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", 0);
      line.setAttribute("x2", x);
      line.setAttribute("y2", SVG_H);
      line.setAttribute("class", x % GRID_BOLD === 0 ? "gridBold" : "gridLine");
      svg.appendChild(line);
    }

    for (let y = 0; y <= SVG_H; y += GRID_SIZE) {
      const line = elNS("line");
      line.setAttribute("x1", 0);
      line.setAttribute("y1", y);
      line.setAttribute("x2", SVG_W);
      line.setAttribute("y2", y);
      line.setAttribute("class", y % GRID_BOLD === 0 ? "gridBold" : "gridLine");
      svg.appendChild(line);
    }
  }

  function renderSvg(){
    svg.innerHTML = "";

    renderGrid();

    // 背景枠
    const bg = elNS("rect");
    bg.setAttribute("x", "24");
    bg.setAttribute("y", "24");
    bg.setAttribute("width", "952");
    bg.setAttribute("height", "652");
    bg.setAttribute("rx", "26");
    bg.setAttribute("fill", "rgba(255,255,255,.03)");
    bg.setAttribute("stroke", "rgba(255,255,255,.06)");
    svg.appendChild(bg);

    // 路線（環状に閉じない）
    const pts = stations.map(s => `${s.x},${s.y}`).join(" ");
    const line = elNS("polyline");
    line.setAttribute("points", pts);
    line.setAttribute("class", "routeLine");
    svg.appendChild(line);

    // 支線：E-01(新宿西口) → E-28(都庁前)
    const e01 = stations.find(s => s.id === "E-01");
    const e28 = stations.find(s => s.id === "E-28");
    if (e01 && e28) {
      const spur = elNS("line");
      spur.setAttribute("x1", e01.x);
      spur.setAttribute("y1", e01.y);
      spur.setAttribute("x2", e28.x);
      spur.setAttribute("y2", e28.y);
      spur.setAttribute("class", "routeLine");
      svg.appendChild(spur);
    }

    // 駅
    stations.forEach((s) => {
      const g = elNS("g");
      g.setAttribute("class", `stationNode${editMode ? " editing" : ""}`);
      g.style.cursor = editMode ? "grab" : "pointer";

      const outer = elNS("circle");
      outer.setAttribute("cx", s.x);
      outer.setAttribute("cy", s.y);
      outer.setAttribute("r", "12");
      outer.setAttribute("class", "stationOuter");

      const inner = elNS("circle");
      inner.setAttribute("cx", s.x);
      inner.setAttribute("cy", s.y);
      inner.setAttribute("r", "7");
      inner.setAttribute("class", "stationInner");

      const visited = isVisited(s.id);
      inner.setAttribute("fill", "rgba(0,0,0,0)");
      inner.setAttribute("stroke", visited ? "var(--ok)" : "var(--accent)");

      // ラベル配置（被り軽減）
      const place = labelPlacement(s);

      const label = elNS("text");
      label.setAttribute("x", s.x + place.nameDx);
      label.setAttribute("y", s.y + place.nameDy);
      label.setAttribute("text-anchor", place.anchor);
      label.setAttribute("class", "stationLabel");
      label.textContent = s.name;

      const code = elNS("text");
      code.setAttribute("x", s.x + place.codeDx);
      code.setAttribute("y", s.y + place.codeDy);
      code.setAttribute("text-anchor", place.anchor);
      code.setAttribute("class", "stationCode");
      code.textContent = s.code;

      // クリック/ドラッグ
      const onPointerDown = (evt) => {
        if (!editMode) return;
        evt.preventDefault();
        evt.stopPropagation();
        g.setPointerCapture?.(evt.pointerId);
        startDrag(s, evt);
      };

      const onClick = () => {
        if (editMode) {
          if (movedDuringDrag) return;
          return;
        }
        openSheet(s);
      };

      g.addEventListener("pointerdown", onPointerDown);
      g.addEventListener("click", onClick);
      label.addEventListener("click", onClick);
      code.addEventListener("click", onClick);

      g.appendChild(outer);
      g.appendChild(inner);
      svg.appendChild(g);
      svg.appendChild(label);
      svg.appendChild(code);
    });
  }

  // =========================
  // 9) Sheet
  // =========================
  function openSheet(station){
    if (editMode) return;
    selectedStation = station;

    stationName.textContent = `${station.name}（${station.code}）`;
    const c = countByStation(station.id);
    stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";

    renderProofs();
    sheet.classList.remove("hidden");
  }

  function closeSheet(){
    sheet.classList.add("hidden");
  }
  closeSheetBtn.addEventListener("click", closeSheet);

  // =========================
  // 10) Proof list (with delete)
  // =========================
  function renderProofs(){
    proofList.innerHTML = "";

    const list = proofs
      .filter(p => p.stationId === selectedStation?.id)
      .sort((a,b) => b.createdAt - a.createdAt);

    if (list.length === 0){
      const empty = document.createElement("div");
      empty.style.color = "var(--muted)";
      empty.style.fontSize = "13px";
      empty.textContent = "まだ証がありません。";
      proofList.appendChild(empty);
      return;
    }

    list.forEach((p) => {
      const card = document.createElement("div");
      card.className = "proofCard";

      const meta = document.createElement("div");
      meta.style.color = "var(--muted)";
      meta.style.fontSize = "12px";
      meta.style.marginBottom = "8px";
      meta.textContent = new Date(p.createdAt).toLocaleString("ja-JP");

      const img = document.createElement("img");
      img.className = "proofImg";
      img.src = p.photo;
      img.alt = "証の写真";

      const comment = document.createElement("div");
      comment.style.marginTop = "8px";
      comment.textContent = (p.comment || "").trim() ? p.comment : "（コメントなし）";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--ghost";
      del.textContent = "削除";
      del.style.marginTop = "10px";

      del.addEventListener("click", () => {
        if (!confirm("この証を削除しますか？")) return;

        proofs = proofs.filter(x => x.id !== p.id);
        saveProofs();

        renderSvg();
        renderProofs();

        const c = countByStation(selectedStation.id);
        stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";
      });

      card.append(meta, img, comment, del);
      proofList.appendChild(card);
    });
  }

  // =========================
  // 11) Modal
  // =========================
  function openModal(){
    if (editMode) {
      alert("編集モード中は証追加できません。OFFにしてください。");
      return;
    }
    if (!selectedStation){
      alert("先に駅をタップして選んでください。");
      return;
    }

    photoInputFile.value = "";
    photoInputCamera.value = "";
    photoPreviewWrap.classList.add("hidden");
    photoPreviewInner.innerHTML = "";
    commentInput.value = "";

    modal.classList.remove("hidden");
  }

  function closeModal(){
    modal.classList.add("hidden");
  }

  addProofBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal();
  });

  closeModalBtn.addEventListener("click", closeModal);
  modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);

  // =========================
  // 12) Photo preview
  // =========================
  function preview(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreviewInner.innerHTML = `<img src="${e.target.result}" alt="プレビュー">`;
      photoPreviewWrap.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  photoInputFile.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) preview(f);
  });

  photoInputCamera.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) preview(f);
  });

  reselectBtn.addEventListener("click", () => {
    photoInputFile.click();
  });

  clearPhotoBtn.addEventListener("click", () => {
    photoInputFile.value = "";
    photoInputCamera.value = "";
    photoPreviewWrap.classList.add("hidden");
    photoPreviewInner.innerHTML = "";
  });

  // =========================
  // 13) Save proof
  // =========================
  saveProofBtn.addEventListener("click", () => {
    const file = photoInputFile.files?.[0] || photoInputCamera.files?.[0];
    if (!file){
      alert("写真は必須です。アルバムかカメラで選んでください。");
      return;
    }

    if (file.size > 3 * 1024 * 1024){
      alert("写真サイズが大きすぎます（3MB以下推奨）。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      proofs.push({
        id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        stationId: selectedStation.id,
        createdAt: Date.now(),
        photo: e.target.result,
        comment: commentInput.value || "",
      });

      saveProofs();
      closeModal();

      renderSvg();
      renderProofs();

      const c = countByStation(selectedStation.id);
      stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";
    };
    reader.readAsDataURL(file);
  });

  // =========================
  // 14) Editor bar actions
  // =========================
  setEditMode(false);
  gridToggle.checked = false;
  snapToggle.checked = true;
  showGrid = gridToggle.checked;
  snapToGrid = snapToggle.checked;

  toggleEditBtn.addEventListener("click", () => {
    setEditMode(!editMode);
    if (editMode) closeSheet();
    renderSvg();
  });

  copyJsonBtn.addEventListener("click", async () => {
    const json = stationsExportJson();
    await copyToClipboard(json);
  });

  downloadJsonBtn.addEventListener("click", () => {
    const json = stationsExportJson();
    downloadText("oedo_stations_layout.json", json);
  });

  gridToggle.addEventListener("change", () => {
    showGrid = gridToggle.checked;
    renderSvg();
  });

  snapToggle.addEventListener("change", () => {
    snapToGrid = snapToggle.checked;
  });

  // =========================
  // 15) Initial render
  // =========================
  renderSvg();
});