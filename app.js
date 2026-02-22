// 大江戸線 証アプリ（試作）
// - Leaflet + OSM
// - localStorage保存
// - 写真必須（アルバム/カメラ）
// - 駅名 常時表示（permanent tooltip）
// - 証 削除対応

window.addEventListener("DOMContentLoaded", () => {
  const stations = [
    { id: "tochomae", name: "都庁前", lat: 35.6896, lon: 139.6922 },
    { id: "roppongi", name: "六本木", lat: 35.6628, lon: 139.7310 },
    { id: "daimon", name: "大門", lat: 35.6556, lon: 139.7567 },
  ];

  const STORAGE_KEY = "oedo_proofs_v3";

  let proofs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  let selectedStation = null;

  // ---- DOM refs ----
  const sheet = document.getElementById("sheet");
  const stationName = document.getElementById("stationName");
  const stationStatus = document.getElementById("stationStatus");
  const proofList = document.getElementById("proofList");

  const modal = document.getElementById("modal");
  const addProofBtn = document.getElementById("addProofBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const closeSheetBtn = document.getElementById("closeSheetBtn");

  const photoInputFile = document.getElementById("photoInputFile");
  const photoInputCamera = document.getElementById("photoInputCamera");
  const photoPreviewWrap = document.getElementById("photoPreviewWrap");
  const photoPreviewInner = document.getElementById("photoPreviewInner");
  const reselectBtn = document.getElementById("reselectBtn");
  const clearPhotoBtn = document.getElementById("clearPhotoBtn");

  const commentInput = document.getElementById("commentInput");
  const saveProofBtn = document.getElementById("saveProofBtn");

  // 念のため：要素が取れているか（取れてないとイベントも付かない）
  if (!addProofBtn || !modal) {
    alert("HTMLの読み込みに失敗しました（idが一致していない可能性）。");
    return;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
  }

  // ---- Map ----
  const map = L.map("map").setView([35.68, 139.75], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // マーカーを作り直せるように保持
  const markerLayers = [];

  function clearMarkers() {
    markerLayers.forEach((m) => map.removeLayer(m));
    markerLayers.length = 0;
  }

function renderMarkers() {
  clearMarkers();

  // 丸いカスタムピンを作る関数
  function markerIcon(visited) {
    const color = visited ? "var(--ok)" : "var(--accent)";
    const inner = visited ? "✓" : "●";

    return L.divIcon({
      className: "customPin",
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(0,0,0,.65);
          border: 2px solid ${color};
          display:flex;
          align-items:center;
          justify-content:center;
          color: ${color};
          font-weight: 900;
          font-size: 14px;
          box-shadow: 0 6px 16px rgba(0,0,0,.5);
        ">
          ${inner}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  stations.forEach((s) => {
    const visited = proofs.some((p) => p.stationId === s.id);

    const m = L.marker(
      [s.lat, s.lon],
      { icon: markerIcon(visited) }
    )
      .addTo(map)
      .on("click", () => openSheet(s));

    // 駅名を常時表示
    m.bindTooltip(`${s.name}${visited ? "（達成）" : ""}`, {
      permanent: true,
      direction: "top",
      offset: [0, -22],
      opacity: 0.95,
      className: "stationLabel",
    });

    markerLayers.push(m);
  });
}

  // ---- Sheet ----
  function openSheet(station) {
    selectedStation = station;

    stationName.textContent = station.name;

    const count = proofs.filter((p) => p.stationId === station.id).length;
    stationStatus.textContent = count > 0 ? `達成（${count}件）` : "未達成";

    renderProofs();
    sheet.classList.remove("hidden");
  }

  function closeSheet() {
    sheet.classList.add("hidden");
  }

  closeSheetBtn.addEventListener("click", closeSheet);

  // ---- Proof list ----
  function renderProofs() {
    proofList.innerHTML = "";

    const list = proofs
      .filter((p) => p.stationId === selectedStation?.id)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (list.length === 0) {
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

        proofs = proofs.filter((x) => x.id !== p.id);
        save();

        // ラベルの達成表示も更新
        renderMarkers();
        renderProofs();
        // 件数表示も更新
        const count = proofs.filter((pp) => pp.stationId === selectedStation?.id).length;
        stationStatus.textContent = count > 0 ? `達成（${count}件）` : "未達成";
      });

      card.append(meta, img, comment, del);
      proofList.appendChild(card);
    });
  }

  // ---- Modal ----
  function openModal() {
    // どの駅か選ばれてない状態だと保存できないのでガード
    if (!selectedStation) {
      alert("先に駅ピンをタップして駅を選んでください。");
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

  function closeModal() {
    modal.classList.add("hidden");
  }

  addProofBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal();
  });

  closeModalBtn.addEventListener("click", closeModal);
  modal.querySelector(".modal__backdrop").addEventListener("click", closeModal);

  // ---- Photo preview ----
  function preview(file) {
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

  // ---- Save ----
  saveProofBtn.addEventListener("click", () => {
    const file = photoInputFile.files?.[0] || photoInputCamera.files?.[0];
    if (!file) {
      alert("写真は必須です。アルバムかカメラで選んでください。");
      return;
    }

    // localStorage対策（試作なので軽め制限）
    if (file.size > 3 * 1024 * 1024) {
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

      save();
      closeModal();

      // 表示更新
      renderMarkers();
      renderProofs();

      const count = proofs.filter((pp) => pp.stationId === selectedStation.id).length;
      stationStatus.textContent = count > 0 ? `達成（${count}件）` : "未達成";
    };
    reader.readAsDataURL(file);
  });

  // 初回表示
  renderMarkers();
});