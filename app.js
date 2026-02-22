// 路線 証アプリ（SVG簡易路線図 + 複数路線 + 編集モード）
// - 外部APIなし（無料運用向き）
// - 左上ハンバーガー → 路線一覧（起動時は開いた状態）
// - 画面外タップで閉じる
// - 未選択なら「路線図を選択してください」
// - 路線行：路線名 + 達成率（達成駅数/全駅）
// - 駅クリック → 詳細シート → 証追加（写真必須・削除可）
// - 証の表示順：コメント → 写真 → 日付
// - 編集モード（PC用）：駅ドラッグ、グリッド表示/スナップ、配置JSONコピー/DL
// - 編集は「路線ごと」に保存（layout_<lineId>_v1）
// - iPhoneでは編集バーを親ごと完全非表示（編集機能も実質OFF）
// - 大江戸線の支線：E-01(新宿西口) → E-28(都庁前)
// - 大江戸線の例外：E-18 築地市場は駅名を左に出す

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 0) Canvas size
  // =========================
  const SVG_W = 390;
  const SVG_H = 844;

  // =========================
  // 1) Lines（ここに増やしていく）
  //   color: 路線色（③）
  // =========================
  const lines = [
    {
      id: "oedo",
      name: "都営大江戸線",
      color: "#b6007a", // ★マゼンタ（本物寄せ）
      stations: [
        { id:"E-01", code:"E-01", name:"新宿西口", x:140, y:420 },
        { id:"E-02", code:"E-02", name:"東新宿", x:200, y:420 },
        { id:"E-03", code:"E-03", name:"若松河田", x:260, y:420 },
        { id:"E-04", code:"E-04", name:"牛込柳町", x:320, y:420 },
        { id:"E-05", code:"E-05", name:"牛込神楽坂", x:320, y:460 },
        { id:"E-06", code:"E-06", name:"飯田橋", x:320, y:500 },
        { id:"E-07", code:"E-07", name:"春日", x:320, y:540 },
        { id:"E-08", code:"E-08", name:"本郷三丁目", x:320, y:580 },
        { id:"E-09", code:"E-09", name:"上野御徒町", x:320, y:620 },
        { id:"E-10", code:"E-10", name:"新御徒町", x:320, y:660 },
        { id:"E-11", code:"E-11", name:"蔵前", x:320, y:700 },
        { id:"E-12", code:"E-12", name:"両国", x:320, y:740 },
        { id:"E-13", code:"E-13", name:"森下", x:320, y:780 },
        { id:"E-14", code:"E-14", name:"清澄白河", x:320, y:820 },
        { id:"E-15", code:"E-15", name:"門前仲町", x:260, y:820 },
        { id:"E-16", code:"E-16", name:"月島", x:200, y:820 },
        { id:"E-17", code:"E-17", name:"勝どき", x:140, y:820 },
        { id:"E-18", code:"E-18", name:"築地市場", x:80, y:820 },
        { id:"E-19", code:"E-19", name:"汐留", x:80, y:780 },
        { id:"E-20", code:"E-20", name:"大門", x:80, y:740 },
        { id:"E-21", code:"E-21", name:"赤羽橋", x:80, y:700 },
        { id:"E-22", code:"E-22", name:"麻布十番", x:80, y:660 },
        { id:"E-23", code:"E-23", name:"六本木", x:80, y:620 },
        { id:"E-24", code:"E-24", name:"青山一丁目", x:80, y:580 },
        { id:"E-25", code:"E-25", name:"国立競技場", x:80, y:540 },
        { id:"E-26", code:"E-26", name:"代々木", x:80, y:500 },
        { id:"E-27", code:"E-27", name:"新宿", x:80, y:460 },
        { id:"E-28", code:"E-28", name:"都庁前", x:80, y:420 },
        { id:"E-29", code:"E-29", name:"西新宿五丁目", x:80, y:380 },
        { id:"E-30", code:"E-30", name:"中野坂上", x:80, y:340 },
        { id:"E-31", code:"E-31", name:"東中野", x:80, y:300 },
        { id:"E-32", code:"E-32", name:"中井", x:80, y:260 },
        { id:"E-33", code:"E-33", name:"落合南長崎", x:80, y:220 },
        { id:"E-34", code:"E-34", name:"新江古田", x:80, y:180 },
        { id:"E-35", code:"E-35", name:"練馬", x:80, y:140 },
        { id:"E-36", code:"E-36", name:"豊島園", x:80, y:100 },
        { id:"E-37", code:"E-37", name:"練馬春日町", x:80, y:60 },
        { id:"E-38", code:"E-38", name:"光が丘", x:80, y:20 },
      ],
    },
    {
      id: "marunouchi",
      name: "東京メトロ丸ノ内線",
      color: "#ff3b30", // 赤
      stations: [
        { id:"M-01", code:"M-01", name:"池袋", x:220, y:20 },
        { id:"M-02", code:"M-02", name:"新大塚", x:220, y:60 },
        { id:"M-03", code:"M-03", name:"茗荷谷", x:220, y:100 },
        { id:"M-04", code:"M-04", name:"後楽園", x:220, y:140 },
        { id:"M-05", code:"M-05", name:"本郷三丁目", x:220, y:180 },
        { id:"M-06", code:"M-06", name:"御茶ノ水", x:220, y:220 },
        { id:"M-07", code:"M-07", name:"淡路町", x:220, y:260 },
        { id:"M-08", code:"M-08", name:"大手町", x:220, y:300 },
        { id:"M-09", code:"M-09", name:"東京", x:220, y:340 },
        { id:"M-10", code:"M-10", name:"銀座", x:220, y:380 },
        { id:"M-11", code:"M-11", name:"霞ヶ関", x:220, y:420 },
        { id:"M-12", code:"M-12", name:"国会議事堂前", x:220, y:460 },
        { id:"M-13", code:"M-13", name:"赤坂見附", x:220, y:500 },
        { id:"M-14", code:"M-14", name:"四ツ谷", x:220, y:540 },
        { id:"M-15", code:"M-15", name:"四谷三丁目", x:220, y:580 },
        { id:"M-16", code:"M-16", name:"新宿御苑前", x:220, y:620 },
        { id:"M-17", code:"M-17", name:"新宿三丁目", x:220, y:660 },
        { id:"M-18", code:"M-18", name:"新宿", x:220, y:700 },
        { id:"M-19", code:"M-19", name:"西新宿", x:220, y:740 },
        { id:"M-20", code:"M-20", name:"中野坂上", x:220, y:780 },

        { id:"M-21", code:"M-21", name:"新中野", x:180, y:780 },
        { id:"M-22", code:"M-22", name:"東高円寺", x:140, y:780 },
        { id:"M-23", code:"M-23", name:"新高円寺", x:100, y:780 },
        { id:"M-24", code:"M-24", name:"南阿佐ケ谷", x:60, y:780 },
        { id:"M-25", code:"M-25", name:"荻窪", x:20, y:780 },

        { id:"M-26", code:"M-26", name:"中野新橋", x:260, y:780 },
        { id:"M-27", code:"M-27", name:"中野富士見町", x:300, y:780 },
        { id:"M-28", code:"M-28", name:"方南町", x:340, y:780 },
      ],
    }
  ];

  // =========================
  // 2) Storage keys（路線ごと）
  // =========================
  const proofKey = (lineId) => `proofs_${lineId}_v1`;
  const layoutKey = (lineId) => `layout_${lineId}_v1`;

  // =========================
  // 3) DOM
  // =========================
  const svg = document.getElementById("oedoSvg");
  const emptyState = document.getElementById("emptyState");

  // menu
  const menuButton = document.getElementById("menuButton");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  const lineList = document.getElementById("lineList");

  // editor bar
  const editorBar = document.getElementById("editorBar");
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

  // ★追加：左右2ボタン
  const pickPhotoBtn = document.getElementById("pickPhotoBtn");
  const takePhotoBtn = document.getElementById("takePhotoBtn");

  if (!svg) {
    alert("HTMLに #oedoSvg が見つかりません。");
    return;
  }

  // =========================
  // 4) iPhone判定：編集UI完全非表示
  // =========================
  const isIPhone = /iPhone|iPod/i.test(navigator.userAgent);
  if (isIPhone) {
    if (editorBar) editorBar.style.display = "none";
  }

  // =========================
  // 5) Menu open/close
  // =========================
  function openMenu(){
    sideMenu?.classList.add("open");
    overlay?.classList.add("show");
  }
  function closeMenu(){
    sideMenu?.classList.remove("open");
    overlay?.classList.remove("show");
  }

  menuButton?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sideMenu.classList.contains("open")) closeMenu();
    else openMenu();
  });

  overlay?.addEventListener("click", () => {
    closeMenu();
    // 路線未選択のときはメッセージを出したい → emptyStateは常時制御してるのでここでは触らない
  });

  // =========================
  // 6) State（路線切り替え用）
  // =========================
  let currentLine = null;      // {id,name,color,stations...}
  let stations = [];           // 現在描画している stations（編集で変わる）
  let proofs = [];             // 現在路線の proofs
  let selectedStation = null;

  // editor state
  let editMode = false;
  let showGrid = false;
  let snapToGrid = true;
  const GRID_SIZE = 20;
  const GRID_BOLD = 100;

  let dragging = null; // { station, dx, dy }
  let movedDuringDrag = false;

  // ★追加：直前の写真入力元
  let lastPhotoSource = "file"; // "file" or "camera"

  // =========================
  // 7) Helpers
  // =========================
  function elNS(name){
    return document.createElementNS("http://www.w3.org/2000/svg", name);
  }

  function setLineColor(color){
    document.documentElement.style.setProperty("--line", color);
  }

  function loadProofs(lineId){
    proofs = JSON.parse(localStorage.getItem(proofKey(lineId)) || "[]");
  }
  function saveProofs(){
    if (!currentLine) return;
    localStorage.setItem(proofKey(currentLine.id), JSON.stringify(proofs));
  }

  // ④ 路線ごとにレイアウト保存
  function loadLayout(line){
    const raw = localStorage.getItem(layoutKey(line.id));
    if (!raw) return line.stations.map(s => ({...s}));
    try{
      const arr = JSON.parse(raw);
      // id一致で上書き（name/codeは念のため維持）
      const byId = new Map(arr.map(x => [x.id, x]));
      return line.stations.map(s => {
        const p = byId.get(s.id);
        if (!p) return ({...s});
        return ({...s, x: Number(p.x), y: Number(p.y) });
      });
    }catch{
      return line.stations.map(s => ({...s}));
    }
  }
  function saveLayout(){
    if (!currentLine) return;
    const arr = stations.map(s => ({
      id: s.id, code: s.code, name: s.name, x: Math.round(s.x), y: Math.round(s.y)
    }));
    localStorage.setItem(layoutKey(currentLine.id), JSON.stringify(arr));
  }

  function isVisited(stationId){
    return proofs.some(p => p.stationId === stationId);
  }
  function countByStation(stationId){
    return proofs.filter(p => p.stationId === stationId).length;
  }
  function visitedStationCount(line){
    const p = JSON.parse(localStorage.getItem(proofKey(line.id)) || "[]");
    return new Set(p.map(x => x.stationId)).size;
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
  // 8) Edit mode / dragging
  // =========================
  function setEditMode(on){
    editMode = on;

    if (toggleEditBtn) toggleEditBtn.textContent = `編集モード：${editMode ? "ON" : "OFF"}`;

    if (editorHint) {
      editorHint.textContent = editMode
        ? "ON：駅をドラッグで移動。グリッド/スナップも可。終わったら「配置JSONをコピー」"
        : "OFF：駅をタップして証を追加できます";
    }
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
    if (dragging) {
      // ④：路線ごとの配置を随時保存
      saveLayout();
    }
    dragging = null;
  }

  svg.addEventListener("pointermove", moveDrag, { passive: false });
  window.addEventListener("pointerup", endDrag);

  // =========================
  // 9) ラベル配置（路線ごとに分岐してOK）
  // =========================
function labelPlacement(lineId, st){
  // 大江戸線：築地市場は左
  if (lineId === "oedo" && st.id === "E-18") {
    return { nameDx: -18, nameDy: 5, codeDx: -18, codeDy: 16, anchor: "end" };
  }

  // 大江戸線：上端の2駅は左（光が丘・練馬春日町）
  if (lineId === "oedo" && (st.id === "E-37" || st.id === "E-38")) {
    return { nameDx: -18, nameDy: 5, codeDx: -18, codeDy: 16, anchor: "end" };
  }

  // ===== 丸ノ内線：被り回避（左右交互） =====
  if (lineId === "marunouchi") {
    // 縦の柱（M-01〜M-20）：左右交互に出す
    if (/^M-(0[1-9]|1\d|20)$/.test(st.id)) {
      // stations 配列の順番を使って交互にする（レイアウト変更にも強い）
      const idx = stations.findIndex(x => x.id === st.id); // 0-based
      const isLeft = idx % 2 === 0; // 0,2,4...を左に
      return isLeft
        ? { nameDx: -18, nameDy: 5, codeDx: -18, codeDy: 16, anchor: "end" }
        : { nameDx: 18,  nameDy: 5, codeDx: 18,  codeDy: 16, anchor: "start" };
    }

// 横ライン（y=780付近）は「上/下」を交互にして被り回避
if (/^M-(21|22|23|24|25|26|27|28)$/.test(st.id)) {
  // 横並びの順番（左→右）
  const order = ["M-25","M-24","M-23","M-22","M-21","M-20","M-26","M-27","M-28"];
  const i = order.indexOf(st.id);

  // 念のため：見つからない場合はデフォルト上
  const isUp = (i === -1) ? true : (i % 2 === 0); // 偶数=上、奇数=下

  if (isUp) {
    return { nameDx: 0, nameDy: -18, codeDx: 0, codeDy: -34, anchor: "middle" };
  } else {
    return { nameDx: 0, nameDy: 22, codeDx: 0, codeDy: 38, anchor: "middle" };
  }
}
  }

  // ===== 共通ルール（デフォルト） =====
  // 上端（yが小さい）→下に出す
  if (st.y <= 80) {
    return { nameDx: 0, nameDy: 18, codeDx: 0, codeDy: 32, anchor: "middle" };
  }

  // 左側 → 左、右側 → 右
  if (st.x <= 90) {
    return { nameDx: -18, nameDy: 5, codeDx: -18, codeDy: 16, anchor: "end" };
  }
  if (st.x >= 300) {
    return { nameDx: 18, nameDy: 5, codeDx: 18, codeDy: 16, anchor: "start" };
  }

  // それ以外 → 上に
  return { nameDx: 0, nameDy: -18, codeDx: 0, codeDy: -34, anchor: "middle" };
}

  // =========================
  // 10) Render
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

    if (!currentLine) return;

    // 路線（環状に閉じない）
    const pts = stations.map(s => `${s.x},${s.y}`).join(" ");
    const route = elNS("polyline");
    route.setAttribute("points", pts);
    route.setAttribute("class", "routeLine");
    svg.appendChild(route);

    // 大江戸線だけ支線：E-01 → E-28
    if (currentLine.id === "oedo") {
      const e01 = stations.find(s => s.id === "E-01");
      const e28 = stations.find(s => s.id === "E-28");
      if (e01 && e28) {
        const spur = elNS("line");
        spur.setAttribute("x1", e01.x);
        spur.setAttribute("y1", e01.y);
        spur.setAttribute("x2", e28.x);
        spur.setAttribute("y2", e28.y);
        spur.setAttribute("class", "routeSpur");
        svg.appendChild(spur);
      }
    }

    stations.forEach((s) => {
      const g = elNS("g");
      g.setAttribute("class", "stationNode");
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
      inner.setAttribute("stroke", visited ? "var(--ok)" : "var(--line)");

      const place = labelPlacement(currentLine.id, s);

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

      const onPointerDown = (evt) => {
        if (!editMode) return;
        evt.preventDefault();
        evt.stopPropagation();
        g.setPointerCapture?.(evt.pointerId);
        startDrag(s, evt);
      };

      const onClick = () => {
        if (!currentLine) return;
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
  // 11) Line list
  // =========================
  function renderLineList(){
    lineList.innerHTML = "";

    lines.forEach((line) => {
      const done = visitedStationCount(line);
      const total = line.stations.length;

      const row = document.createElement("div");
      row.className = "lineRow" + (currentLine?.id === line.id ? " active" : "");

      const left = document.createElement("div");
      left.className = "lineName";
      left.textContent = line.name;

      const right = document.createElement("div");
      right.className = "lineRate";
      right.textContent = `${done}/${total}`;

      row.append(left, right);

      row.addEventListener("click", () => {
        selectLine(line.id);
        closeMenu();
      });

      lineList.appendChild(row);
    });
  }

  // =========================
  // 12) Line select
  // =========================
  function showEmpty(){
    emptyState?.classList.remove("hidden");
  }
  function hideEmpty(){
    emptyState?.classList.add("hidden");
  }

  function selectLine(lineId){
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    currentLine = line;
    setLineColor(line.color);

    // ④：路線ごとの配置をロード（なければデフォルト）
    stations = loadLayout(line);

    loadProofs(line.id);
    selectedStation = null;

    closeSheet();
    closeModal();

    // 編集モードは路線切り替え時にOFFへ（事故防止）
    setEditMode(false);

    hideEmpty();
    renderSvg();
    renderLineList();
  }

  // =========================
  // 13) Sheet
  // =========================
  function openSheet(station){
    if (!currentLine) return;
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
  closeSheetBtn?.addEventListener("click", closeSheet);

  // =========================
  // 14) Proof list（表示順：コメント→写真→日付）
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

      const comment = document.createElement("div");
      comment.style.marginTop = "2px";
      comment.textContent = (p.comment || "").trim() ? p.comment : "（コメントなし）";

      const img = document.createElement("img");
      img.className = "proofImg";
      img.src = p.photo;
      img.alt = "証の写真";

      const meta = document.createElement("div");
      meta.style.color = "var(--muted)";
      meta.style.fontSize = "12px";
      meta.style.marginTop = "8px";
      meta.textContent = new Date(p.createdAt).toLocaleString("ja-JP");

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
        renderLineList();

        const c = countByStation(selectedStation.id);
        stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";
      });

      card.append(comment, img, meta, del);
      proofList.appendChild(card);
    });
  }

  // =========================
  // 15) Modal
  // =========================
  function openModal(){
    if (editMode) {
      alert("編集モード中は証追加できません。OFFにしてください。");
      return;
    }
    if (!currentLine){
      alert("先に路線図を選択してください。");
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
    lastPhotoSource = "file"; // 初期はアルバム側

    modal.classList.remove("hidden");
  }

  function closeModal(){
    modal.classList.add("hidden");
  }

  addProofBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal();
  });

  closeModalBtn?.addEventListener("click", closeModal);
  modal?.querySelector(".modal__backdrop")?.addEventListener("click", closeModal);

  // ★追加：左右ボタン → 隠しinputを開く
  pickPhotoBtn?.addEventListener("click", () => {
    lastPhotoSource = "file";
    photoInputFile?.click();
  });

  takePhotoBtn?.addEventListener("click", () => {
    lastPhotoSource = "camera";
    photoInputCamera?.click();
  });

  // photo preview
  function preview(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      photoPreviewInner.innerHTML = `<img src="${e.target.result}" alt="プレビュー">`;
      photoPreviewWrap.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  photoInputFile?.addEventListener("change", (e) => {
    lastPhotoSource = "file";
    const f = e.target.files?.[0];
    if (f) preview(f);
  });

  photoInputCamera?.addEventListener("change", (e) => {
    lastPhotoSource = "camera";
    const f = e.target.files?.[0];
    if (f) preview(f);
  });

  // ★改善：選びなおす → 直前の入口を開く
  reselectBtn?.addEventListener("click", () => {
    if (lastPhotoSource === "camera") photoInputCamera?.click();
    else photoInputFile?.click();
  });

  clearPhotoBtn?.addEventListener("click", () => {
    photoInputFile.value = "";
    photoInputCamera.value = "";
    photoPreviewWrap.classList.add("hidden");
    photoPreviewInner.innerHTML = "";
  });

  // save proof
  saveProofBtn?.addEventListener("click", () => {
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
      renderLineList();

      const c = countByStation(selectedStation.id);
      stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";
    };
    reader.readAsDataURL(file);
  });

  // =========================
  // 16) Editor bar actions（PCのみ）
  // =========================
  setEditMode(false);

  if (gridToggle) gridToggle.checked = false;
  if (snapToggle) snapToggle.checked = true;
  showGrid = !!gridToggle?.checked;
  snapToGrid = !!snapToggle?.checked;

  if (!isIPhone) {
    toggleEditBtn?.addEventListener("click", () => {
      if (!currentLine) {
        alert("先に路線図を選択してください。");
        return;
      }
      setEditMode(!editMode);
      if (editMode) closeSheet();
      renderSvg();
    });

    copyJsonBtn?.addEventListener("click", async () => {
      if (!currentLine) {
        alert("先に路線図を選択してください。");
        return;
      }
      const json = stationsExportJson();
      await copyToClipboard(json);
    });

    downloadJsonBtn?.addEventListener("click", () => {
      if (!currentLine) {
        alert("先に路線図を選択してください。");
        return;
      }
      const json = stationsExportJson();
      downloadText(`${currentLine.id}_stations_layout.json`, json);
    });

    gridToggle?.addEventListener("change", () => {
      showGrid = gridToggle.checked;
      renderSvg();
    });

    snapToggle?.addEventListener("change", () => {
      snapToGrid = snapToggle.checked;
    });
  } else {
    // iPhoneは編集機能OFF
    editMode = false;
    showGrid = false;
    snapToGrid = true;
  }

  // =========================
  // 17) Initial
  // =========================
  renderLineList();
  showEmpty();
  openMenu();
});