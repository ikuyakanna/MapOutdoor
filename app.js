// ===============================
// 大江戸線 証アプリ（試作）
// - 地図: Leaflet + OSM
// - 保存: localStorage
// - 写真必須（アルバム/カメラ）
// ===============================

// まずは「動くこと優先」で数駅だけ入れています。
// stations 配列に追加すれば駅が増えます。
const stations = [
  { id: "tochomae", name: "都庁前", lat: 35.6896, lon: 139.6922 },
  { id: "roppongi", name: "六本木", lat: 35.6628, lon: 139.7310 },
  { id: "daimon", name: "大門", lat: 35.6556, lon: 139.7567 },
  { id: "tsukishima", name: "月島", lat: 35.6640, lon: 139.7820 },
  { id: "ryogoku", name: "両国", lat: 35.6962, lon: 139.7938 },
  { id: "nerima", name: "練馬", lat: 35.7370, lon: 139.6548 },
  { id: "hikarigaoka", name: "光が丘", lat: 35.7585, lon: 139.6317 },
];

const STORAGE_KEY = "oedo_proofs_v1";

function loadProofs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveProofs(proofs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
}

function proofsByStation(proofs) {
  const map = new Map();
  for (const p of proofs) {
    if (!map.has(p.stationId)) map.set(p.stationId, []);
    map.get(p.stationId).push(p);
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => b.createdAt - a.createdAt);
    map.set(k, arr);
  }
  return map;
}

let proofs = loadProofs();
let proofsMap = proofsByStation(proofs);

let selectedStation = null;

// UI refs
const sheet = document.getElementById("sheet");
const stationNameEl = document.getElementById("stationName");
const stationStatusEl = document.getElementById("stationStatus");
const proofListEl = document.getElementById("proofList");
const closeSheetBtn = document.getElementById("closeSheetBtn");
const addProofBtn = document.getElementById("addProofBtn");

const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModalBtn");

const photoInputFile = document.getElementById("photoInputFile");
const photoInputCamera = document.getElementById("photoInputCamera");
const commentInput = document.getElementById("commentInput");
const saveProofBtn = document.getElementById("saveProofBtn");
const formError = document.getElementById("formError");
const photoPreview = document.getElementById("photoPreview");

function openSheet(station) {
  selectedStation = station;

  stationNameEl.textContent = station.name;

  const stationProofs = proofsMap.get(station.id) ?? [];
  const visited = stationProofs.length > 0;

  stationStatusEl.innerHTML = visited
    ? `<span style="color: var(--ok); font-weight:900;">達成</span>（証 ${stationProofs.length} 件）`
    : `<span style="color: var(--muted); font-weight:900;">未達成</span>`;

  renderProofList(stationProofs);

  sheet.classList.remove("hidden");
  sheet.setAttribute("aria-hidden", "false");
}

function closeSheet() {
  sheet.classList.add("hidden");
  sheet.setAttribute("aria-hidden", "true");
  selectedStation = null;
}

function renderProofList(stationProofs) {
  proofListEl.innerHTML = "";
  if (stationProofs.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "var(--muted)";
    empty.style.fontSize = "13px";
    empty.textContent = "まだ証がありません。最初の1件を追加して達成しよう。";
    proofListEl.appendChild(empty);
    return;
  }

  for (const p of stationProofs) {
    const card = document.createElement("div");
    card.className = "proofCard";

    // 日付
    const meta = document.createElement("div");
    meta.className = "proofMeta";
    meta.textContent = new Date(p.createdAt).toLocaleString("ja-JP");

    // 画像
    const img = document.createElement("img");
    img.className = "proofImg";
    img.src = p.photoDataUrl;
    img.alt = "証の写真";

    // コメント
    const comment = document.createElement("div");
    comment.className = "proofComment";
    comment.textContent = p.comment?.trim()
      ? p.comment.trim()
      : "（コメントなし）";

    // 削除ボタン
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn--ghost";
    delBtn.type = "button";
    delBtn.textContent = "削除";
    delBtn.style.marginTop = "10px";

    delBtn.addEventListener("click", () => {
      const ok = confirm("この証を削除しますか？");
      if (!ok) return;

      // 全proofsから該当IDを削除
      proofs = proofs.filter(x => x.id !== p.id);
      saveProofs(proofs);
      proofsMap = proofsByStation(proofs);

      // マーカー再描画（達成状態更新）
      renderMarkers();

      // シート再描画
      openSheet(selectedStation);
    });

   // カードに追加
    card.appendChild(meta);
    card.appendChild(img);
    card.appendChild(comment);
    card.appendChild(delBtn);

    proofListEl.appendChild(card);
  }
}

function openModal() {
  if (!selectedStation) return;

  formError.classList.add("hidden");
  formError.textContent = "";

  // 2つのinputをクリア
  photoInputFile.value = "";
  photoInputCamera.value = "";

  commentInput.value = "";
  photoPreview.classList.add("hidden");
  photoPreview.innerHTML = "";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function setError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}

// 画像をDataURLへ（試作向け。大量/高解像度だとlocalStorageが苦しいので注意）
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイル読み込みに失敗"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function handlePhotoChange(input) {
  const file = input.files?.[0];
  if (!file) {
    photoPreview.classList.add("hidden");
    photoPreview.innerHTML = "";
    return;
  }
  const url = await fileToDataURL(file);
  photoPreview.innerHTML = `<img src="${url}" alt="プレビュー">`;
  photoPreview.classList.remove("hidden");
}

photoInputFile.addEventListener("change", () => handlePhotoChange(photoInputFile));
photoInputCamera.addEventListener("change", () => handlePhotoChange(photoInputCamera));

// 保存
saveProofBtn.addEventListener("click", async () => {
  if (!selectedStation) return;

  const file =
    photoInputFile.files?.[0] ||
    photoInputCamera.files?.[0];

  if (!file) {
    setError("写真が必須です。アルバムかカメラで写真を選んでください。");
    return;
  }

  // 軽いガード（localStorageの容量対策）
  if (file.size > 3 * 1024 * 1024) {
    setError("写真サイズが大きすぎます（3MB以下推奨）。小さめの写真で試してください。");
    return;
  }

  const photoDataUrl = await fileToDataURL(file);
  const comment = commentInput.value ?? "";

  // crypto.randomUUIDがない環境向けフォールバック
  const id = (crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  const newProof = {
    id,
    stationId: selectedStation.id,
    createdAt: Date.now(),
    comment,
    photoDataUrl,
  };

  proofs = [newProof, ...proofs];
  saveProofs(proofs);
  proofsMap = proofsByStation(proofs);

  closeModal();
  renderMarkers();        // 達成表示を更新
  openSheet(selectedStation); // 再描画
});

// ボタン類
closeSheetBtn.addEventListener("click", closeSheet);
addProofBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);

// ===============================
// Map init
// ===============================
const map = L.map("map", { zoomControl: true }).setView([35.6895, 139.6917], 12);

// OSM tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

function isVisited(stationId) {
  const arr = proofsMap.get(stationId) ?? [];
  return arr.length > 0;
}

function markerIcon(visited) {
  const color = visited ? "var(--ok)" : "var(--accent)";
  const inner = visited ? "✓" : "●";
  return L.divIcon({
    className: "customPin",
    html: `
      <div style="
        width: 26px; height: 26px; border-radius: 999px;
        background: rgba(0,0,0,.55);
        border: 2px solid ${color};
        display:flex; align-items:center; justify-content:center;
        color: ${color}; font-weight: 900;
        box-shadow: 0 6px 16px rgba(0,0,0,.4);
      ">${inner}</div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const markers = new Map();

function renderMarkers() {
  for (const m of markers.values()) map.removeLayer(m);
  markers.clear();

  for (const s of stations) {
    const visited = isVisited(s.id);
    const m = L.marker([s.lat, s.lon], { icon: markerIcon(visited) })
      .addTo(map)
      .on("click", () => {
        // Tooltipより先にシートを出したいので即open
        openSheet(s);
      });

    // TooltipはあってもOK（不要なら削除）
    m.bindTooltip(`${s.name}${visited ? "（達成）" : ""}`, {
    permanent: true,
    direction: "top",
    offset: [0, -18],
    opacity: 0.95,
    className: "stationLabel",
    });
    markers.set(s.id, m);
  }
}

renderMarkers();