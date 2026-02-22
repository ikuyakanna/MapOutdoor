// 大江戸線 証アプリ（SVG簡易路線図版）
// - 外部APIなし
// - GitHub Pagesで完結
// - 駅クリック → 詳細シート
// - 写真必須で証保存（削除可）

window.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 1) Stations（全38駅）
  // ※ x,y は「それっぽい形」の簡易配置です
  //   後で微調整したい場合はここをいじるだけでOK
  // =========================
  const stations = [
    { id:"E-01", code:"E-01", name:"新宿西口", x:520, y:250 },
    { id:"E-02", code:"E-02", name:"東新宿", x:600, y:270 },
    { id:"E-03", code:"E-03", name:"若松河田", x:650, y:295 },
    { id:"E-04", code:"E-04", name:"牛込柳町", x:690, y:330 },
    { id:"E-05", code:"E-05", name:"牛込神楽坂", x:710, y:370 },
    { id:"E-06", code:"E-06", name:"飯田橋", x:700, y:410 },
    { id:"E-07", code:"E-07", name:"春日", x:680, y:450 },
    { id:"E-08", code:"E-08", name:"本郷三丁目", x:650, y:490 },
    { id:"E-09", code:"E-09", name:"上野御徒町", x:610, y:525 },
    { id:"E-10", code:"E-10", name:"新御徒町", x:570, y:545 },
    { id:"E-11", code:"E-11", name:"蔵前", x:525, y:555 },
    { id:"E-12", code:"E-12", name:"両国", x:475, y:555 },
    { id:"E-13", code:"E-13", name:"森下", x:420, y:545 },
    { id:"E-14", code:"E-14", name:"清澄白河", x:380, y:520 },
    { id:"E-15", code:"E-15", name:"門前仲町", x:350, y:485 },
    { id:"E-16", code:"E-16", name:"月島", x:340, y:445 },
    { id:"E-17", code:"E-17", name:"勝どき", x:350, y:405 },
    { id:"E-18", code:"E-18", name:"築地市場", x:380, y:365 },
    { id:"E-19", code:"E-19", name:"汐留", x:410, y:330 },
    { id:"E-20", code:"E-20", name:"大門", x:440, y:300 },
    { id:"E-21", code:"E-21", name:"赤羽橋", x:470, y:275 },
    { id:"E-22", code:"E-22", name:"麻布十番", x:505, y:255 },
    { id:"E-23", code:"E-23", name:"六本木", x:545, y:240 },
    { id:"E-24", code:"E-24", name:"青山一丁目", x:590, y:230 },
    { id:"E-25", code:"E-25", name:"国立競技場", x:630, y:225 },
    { id:"E-26", code:"E-26", name:"代々木", x:660, y:215 },
    { id:"E-27", code:"E-27", name:"新宿", x:610, y:205 },
    { id:"E-28", code:"E-28", name:"都庁前", x:560, y:205 },
    { id:"E-29", code:"E-29", name:"西新宿五丁目", x:500, y:210 },
    { id:"E-30", code:"E-30", name:"中野坂上", x:450, y:225 },
    { id:"E-31", code:"E-31", name:"東中野", x:410, y:250 },
    { id:"E-32", code:"E-32", name:"中井", x:385, y:285 },
    { id:"E-33", code:"E-33", name:"落合南長崎", x:375, y:330 },
    { id:"E-34", code:"E-34", name:"新江古田", x:385, y:375 },
    { id:"E-35", code:"E-35", name:"練馬", x:410, y:420 },
    { id:"E-36", code:"E-36", name:"豊島園", x:445, y:455 },
    { id:"E-37", code:"E-37", name:"練馬春日町", x:480, y:485 },
    { id:"E-38", code:"E-38", name:"光が丘", x:520, y:505 },
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

  const sheet = document.getElementById("sheet");
  const stationName = document.getElementById("stationName");
  const stationStatus = document.getElementById("stationStatus");
  const proofList = document.getElementById("proofList");
  const closeSheetBtn = document.getElementById("closeSheetBtn");
  const addProofBtn = document.getElementById("addProofBtn");

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

  // =========================
  // 4) Helpers
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

  // =========================
  // 5) Render SVG route + stations
  // =========================
  function renderSvg(){
    svg.innerHTML = "";

    // 背景の薄い枠
    const bg = elNS("rect");
    bg.setAttribute("x", "24");
    bg.setAttribute("y", "24");
    bg.setAttribute("width", "952");
    bg.setAttribute("height", "652");
    bg.setAttribute("rx", "26");
    bg.setAttribute("fill", "rgba(255,255,255,.03)");
    bg.setAttribute("stroke", "rgba(255,255,255,.06)");
    svg.appendChild(bg);

    // 路線（駅を順につないだ polyline）
    const pts = stations.map(s => `${s.x},${s.y}`).join(" ");
    const line = elNS("polyline");
    line.setAttribute("points", pts + " " + `${stations[0].x},${stations[0].y}`); // ループっぽく戻す
    line.setAttribute("class", "routeLine");
    svg.appendChild(line);

    // 駅ノード
    stations.forEach((s) => {
      const g = elNS("g");
      g.setAttribute("class", "stationNode");
      g.style.cursor = "pointer";

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

      // ラベル（常時表示）
      const label = elNS("text");
      label.setAttribute("x", s.x + 16);
      label.setAttribute("y", s.y - 2);
      label.setAttribute("class", "stationLabel");
      label.textContent = s.name;

      const code = elNS("text");
      code.setAttribute("x", s.x + 16);
      code.setAttribute("y", s.y + 14);
      code.setAttribute("class", "stationCode");
      code.textContent = s.code;

      // クリック
      const onClick = () => openSheet(s);
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
  // 6) Sheet
  // =========================
  function openSheet(station){
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
  // 7) Proof list (with delete)
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

        // SVGも更新（達成色）
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
  // 8) Modal
  // =========================
  function openModal(){
    if (!selectedStation){
      alert("先に駅をタップして選んでください。");
      return;
    }
    // 初期化
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
  // 9) Photo preview
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
  // 10) Save proof
  // =========================
  saveProofBtn.addEventListener("click", () => {
    const file = photoInputFile.files?.[0] || photoInputCamera.files?.[0];
    if (!file){
      alert("写真は必須です。アルバムかカメラで選んでください。");
      return;
    }

    // localStorage容量対策（試作）
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

      // SVGの達成色更新
      renderSvg();
      renderProofs();

      const c = countByStation(selectedStation.id);
      stationStatus.textContent = c > 0 ? `達成（${c}件）` : "未達成";
    };
    reader.readAsDataURL(file);
  });

  // =========================
  // 11) Initial render
  // =========================
  renderSvg();
});