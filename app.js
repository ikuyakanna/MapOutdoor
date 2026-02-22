const stations = [
  { id:"tochomae", name:"都庁前", lat:35.6896, lon:139.6922 },
  { id:"roppongi", name:"六本木", lat:35.6628, lon:139.7310 },
  { id:"daimon", name:"大門", lat:35.6556, lon:139.7567 },
];

const STORAGE_KEY = "oedo_proofs_v3";

let proofs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let selectedStation = null;

const map = L.map("map").setView([35.68,139.75],12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
}

function renderMarkers(){
  stations.forEach(s=>{
    const visited = proofs.some(p=>p.stationId===s.id);

    const m = L.marker([s.lat,s.lon]).addTo(map)
      .on("click",()=>openSheet(s));

    m.bindTooltip(s.name,{
      permanent:true,
      direction:"top",
      className:"stationLabel"
    });
  });
}
renderMarkers();

const sheet = document.getElementById("sheet");
const stationName = document.getElementById("stationName");
const stationStatus = document.getElementById("stationStatus");
const proofList = document.getElementById("proofList");

function openSheet(station){
  selectedStation = station;
  stationName.textContent = station.name;
  const count = proofs.filter(p=>p.stationId===station.id).length;
  stationStatus.textContent = count>0 ? "達成" : "未達成";
  renderProofs();
  sheet.classList.remove("hidden");
}

document.getElementById("closeSheetBtn").onclick=()=>sheet.classList.add("hidden");

function renderProofs(){
  proofList.innerHTML="";
  const list = proofs.filter(p=>p.stationId===selectedStation.id);
  list.forEach(p=>{
    const card=document.createElement("div");
    card.className="proofCard";

    const img=document.createElement("img");
    img.className="proofImg";
    img.src=p.photo;

    const comment=document.createElement("div");
    comment.textContent=p.comment||"";

    const del=document.createElement("button");
    del.textContent="削除";
    del.className="btn btn--ghost";
    del.onclick=()=>{
      if(confirm("削除しますか？")){
        proofs=proofs.filter(x=>x.id!==p.id);
        save();
        renderProofs();
      }
    };

    card.append(img,comment,del);
    proofList.appendChild(card);
  });
}

const modal=document.getElementById("modal");
document.getElementById("addProofBtn").onclick=()=>modal.classList.remove("hidden");
document.getElementById("closeModalBtn").onclick=()=>modal.classList.add("hidden");
modal.querySelector(".modal__backdrop").onclick=()=>modal.classList.add("hidden");

const photoInputFile=document.getElementById("photoInputFile");
const photoInputCamera=document.getElementById("photoInputCamera");
const photoPreviewWrap=document.getElementById("photoPreviewWrap");
const photoPreviewInner=document.getElementById("photoPreviewInner");

function preview(file){
  const reader=new FileReader();
  reader.onload=e=>{
    photoPreviewInner.innerHTML=`<img src="${e.target.result}">`;
    photoPreviewWrap.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

photoInputFile.onchange=e=>preview(e.target.files[0]);
photoInputCamera.onchange=e=>preview(e.target.files[0]);

document.getElementById("reselectBtn").onclick=()=>photoInputFile.click();
document.getElementById("clearPhotoBtn").onclick=()=>{
  photoPreviewWrap.classList.add("hidden");
  photoPreviewInner.innerHTML="";
  photoInputFile.value="";
  photoInputCamera.value="";
};

document.getElementById("saveProofBtn").onclick=()=>{
  const file=photoInputFile.files[0]||photoInputCamera.files[0];
  if(!file){
    alert("写真は必須です");
    return;
  }
  const reader=new FileReader();
  reader.onload=e=>{
    proofs.push({
      id:Date.now(),
      stationId:selectedStation.id,
      photo:e.target.result,
      comment:document.getElementById("commentInput").value
    });
    save();
    modal.classList.add("hidden");
    renderProofs();
  };
  reader.readAsDataURL(file);
};