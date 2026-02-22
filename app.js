// 大江戸線 証アプリ（試作）
// - Leaflet + OSM
// - localStorage保存
// - 写真必須（アルバム/カメラ）
// - 駅名 常時表示（permanent tooltip）
// - 証 削除対応
// - 駅座標は Nominatim で取得してキャッシュ（試作向け）

window.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // 1) 大江戸線（38駅）駅名だけ持つ
  //    id は保存キーに使うので固定推奨
  // -----------------------------
  const stationSeeds = [
    { id: "E-01", name: "都庁前" },
    { id: "E-02", name: "新宿西口" },
    { id: "E-03", name: "東新宿" },
    { id: "E-04", name: "若松河田" },
    { id: "E-05", name: "牛込柳町" },
    { id: "E-06", name: "牛込神楽坂" },
    { id: "E-07", name: "飯田橋" },
    { id: "E-08", name: "春日" },
    { id: "E-09", name: "本郷三丁目" },
    { id: "E-10", name: "上野御徒町" },
    { id: "E-11", name: "新御徒町" },
    { id: "E-12", name: "蔵前" },
    { id: "E-13", name: "両国" },
    { id: "E-14", name: "森下" },
    { id: "E-15", name: "清澄白河" },
    { id: "E-16", name: "門前仲町" },
    { id: "E-17", name: "月島" },
    { id: "E-18", name: "勝どき" },
    { id: "E-19", name: "築地市場" },
    { id: "E-20", name: "汐留" },
    { id: "E-21", name: "大門" },
    { id: "E-22", name: "赤羽橋" },
    { id: "E-23", name: "麻布十番" },
    { id: "E-24", name: "六本木" },
    { id: "E-25", name: "青山一丁目" },
    { id: "E-26", name: "国立競技場" },
    { id: "E-27", name: "代々木" },
    { id: "E-28", name: "新宿" },
    { id: "E-29", name: "西新宿五丁目" },
    { id: "E-30", name: "中野坂上" },
    { id: "E-31", name: "東中野" },
    { id: "E-32", name: "中井" },
    { id: "E-33", name: "落合南長崎" },
    { id: "E-34", name: "新江古田" },
    { id: "E-35", name: "練馬" },
    { id: "E-36", name: "豊島園" },
    { id: "E-37", name: "練馬春日町" },
    { id: "E-38", name: "光が丘" },
  ];

  // 実際に使う stations（lat/lon を埋めたもの）
  let stations = [];

  const STORAGE_KEY = "oedo_proofs_v3";
  const STATION_GEO_CACHE_KEY = "oedo_station_geo_cache_v1";

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

  // 念のため：要素が取れているか
  if (!addProofBtn || !modal) {
    alert("HTMLの読み込みに失敗しました（idが一致していない可能性）。");
    return;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
  }

  // -----------------------------
  // 2) Map
  // -----------------------------
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

      const m = L.marker([s.lat, s.lon], { icon: markerIcon(visited) })
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

  // -----------------------------
  // 3) 駅名→座標（Nominatim）
  //    ※試作向け：キャッシュ + 1.2秒間隔
  // -----------------------------
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function geocodeStation(name) {
    // できるだけ精度を上げるため「都営大江戸線 東京」を付与
    const q = `${name}駅 都営大江戸線 東京`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;

    return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  }

  function loadGeoCache() {
    try {
      return JSON.parse(localStorage.getItem(STATION_GEO_CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveGeoCache(cache) {
    localStorage.setItem(STATION_GEO_CACHE_KEY, JSON.stringify(cache));
  }

  async function initStationsByGeocode() {
    const cache = loadGeoCache();
    const built = [];

    // 1リクエスト/秒の制限を意識して 1.2秒間隔
    const intervalMs = 1200;

    for (const seed of stationSeeds) {
      // キャッシュがあれば使う
      if (cache[seed.id] && typeof cache[seed.id].lat === "number" && typeof cache[seed.id].lon === "number") {
        built.push({ ...seed, lat: cache[seed.id].lat, lon: cache[seed.id].lon });
        continue;
      }

      // キャッシュがない場合だけ geocode
      try {
        const geo = await geocodeStation(seed.name);
        if (geo) {
          cache[seed.id] = geo;
          built.push({ ...seed, ...geo });
          saveGeoCache(cache);
        } else {
          console.warn("geocode failed:", seed);
        }
      } catch (e) {
        console.warn("geocode error:", seed, e);
      }

      // 連打防止
      await sleep(intervalMs);
    }

    // 取れた駅だけ使う（全部取れれば38）
    stations = built;
  }

  // -----------------------------
  // 4) Sheet
  // -----------------------------
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

  // -----------------------------
  // 5) Proof list
  // -----------------------------
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

  // -----------------------------
  // 6) Modal
  // -----------------------------
  function openModal() {
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

  // -----------------------------
  // 7) Photo preview
  // -----------------------------
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

  // -----------------------------
  // 8) Save
  // -----------------------------
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

  // -----------------------------
  // 9) 初回表示（駅座標の準備→描画）
  // -----------------------------
  (async () => {
    // ここで駅座標を準備
    await initStationsByGeocode();

    if (!stations.length) {
      alert("駅の座標取得に失敗しました。ネットワーク制限やアクセス制限の可能性があります。");
      return;
    }

    renderMarkers();
  })();
});