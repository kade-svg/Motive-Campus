const STORAGE_KEY = "motiveCampusData";
const THEME_KEY = "motiveCampusTheme";
const COLORS = ["#b9b8ff","#a7ddc3","#ffd89b","#f3b3c8","#b5d8ff","#d6b7f2","#bfe6e9","#d8d8dc"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const SLOTS = ["Period 1","Period 2","Period 3","Period 4","Period 5","Period 6","Period 7","Period 8"];

const defaultData = {
  profile: { name: "Student", school: "" },
  classes: [],
  notes: [],
  timetable: {}
};

let data = loadData();
let currentView = "home";

function loadData(){
  try { return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return structuredClone(defaultData); }
}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderAll(); }
function esc(v=""){ return String(v).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function fmtDate(iso){ try { return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric"}).format(new Date(iso)); } catch{return "";} }
function clsById(id){ return data.classes.find(c=>c.id===id); }

function showView(view){
  currentView = view;
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active", v.id===`view-${view}`));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  document.querySelectorAll(".mobile-nav-item").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAll(){ renderOverview(); renderTimetable(); renderClasses(); renderNotes(); renderNoteFilters(); }
function renderOverview(){
  const h = new Date().getHours();
  document.getElementById("greeting").textContent = h<12 ? "Good morning." : h<18 ? "Good afternoon." : "Good evening.";
  document.getElementById("profileInitial").textContent = (data.profile.name||"S").trim().charAt(0).toUpperCase() || "S";
  document.getElementById("statClasses").textContent = data.classes.length;
  document.getElementById("statNotes").textContent = data.notes.length;
  document.getElementById("statLessons").textContent = Object.keys(data.timetable).length;

  const upcoming = getNextLesson();
  document.getElementById("nextClassText").textContent = upcoming ? upcoming.text : "Add your timetable to see what’s next.";
  document.getElementById("nextClassMeta").textContent = upcoming ? upcoming.meta : "Your schedule will appear here.";

  const recentNotes = [...data.notes].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,4);
  document.getElementById("recentNotes").innerHTML = recentNotes.length
    ? recentNotes.map(n=>`<div class="mini-row"><span class="mini-dot" style="background:${esc(n.color||COLORS[0])}"></span><div><strong>${esc(n.title||"Untitled note")}</strong><small>${esc(n.tag||"General")} · ${fmtDate(n.updatedAt)}</small></div></div>`).join("")
    : `<div class="mini-empty">Your notes will appear here.</div>`;
  const recentClasses = data.classes.slice(0,4);
  document.getElementById("recentClasses").innerHTML = recentClasses.length
    ? recentClasses.map(c=>`<div class="mini-row"><span class="mini-dot" style="background:${esc(c.color||COLORS[0])}"></span><div><strong>${esc(c.name)}</strong><small>${esc(c.teacher||"No teacher added")} ${c.room?`· ${esc(c.room)}`:""}</small></div></div>`).join("")
    : `<div class="mini-empty">Add your classes to build your workspace.</div>`;
}

function getNextLesson(){
  const day = new Date().getDay(); // Sun=0
  const dayIndex = day===0 ? 0 : Math.min(day-1,4);
  for(let offset=0;offset<7;offset++){
    const idx=(dayIndex+offset)%5, dayName=DAYS[idx];
    for(const slot of SLOTS){
      const key=`${dayName}|${slot}`, id=data.timetable[key], c=clsById(id);
      if(c) return {text:c.name,meta:`${dayName} · ${slot}${c.room?` · ${c.room}`:""}`};
    }
  }
  return null;
}

function renderTimetable(){
  const grid=document.getElementById("timetableGrid");
  grid.innerHTML = `<div class="time-head">Time</div>` + DAYS.map(d=>`<div class="day-head">${d}<small>${new Date().getDate()}</small></div>`).join("");
  SLOTS.forEach(slot=>{
    grid.innerHTML += `<div class="time-label">${slot.replace(" ","<br>")}</div>`;
    DAYS.forEach(day=>{
      const key=`${day}|${slot}`, id=data.timetable[key], c=clsById(id);
      grid.innerHTML += `<div class="slot" data-slot="${esc(slot)}" data-day="${esc(day)}">${c
        ? `<div class="slot-entry" style="background:${esc(c.color||COLORS[0])}"><strong>${esc(c.name)}</strong><small>${esc(c.teacher||"")} ${c.room?`· ${esc(c.room)}`:""}</small></div>`
        : `<div class="slot-empty">+ Add</div>`}</div>`;
    });
  });
}

function renderClasses(){
  const grid=document.getElementById("classGrid"), empty=document.getElementById("classEmpty");
  empty.classList.toggle("hidden", data.classes.length>0);
  grid.innerHTML=data.classes.map(c=>`
    <article class="class-card">
      <div class="class-accent" style="background:${esc(c.color||COLORS[0])}"></div>
      <p class="eyebrow" style="margin-top:2px">${esc(c.code||"Class")}</p>
      <h3>${esc(c.name)}</h3>
      <div class="class-meta">${esc(c.teacher||"Teacher not added")}${c.room?` · ${esc(c.room)}`:""}${c.description?`<br>${esc(c.description)}`:""}</div>
      <div class="class-tags">${(c.tasks||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="class-footer"><button data-edit-class="${esc(c.id)}">Edit</button><span style="font-size:11px;color:var(--muted)">${(c.tasks||[]).length} item${(c.tasks||[]).length===1?"":"s"}</span></div>
    </article>`).join("");
}

function renderNoteFilters(){
  const select=document.getElementById("noteFilter");
  const tags=[...new Set(data.notes.map(n=>n.tag).filter(Boolean))].sort();
  const current=select.value;
  select.innerHTML=`<option value="all">All notes</option>`+tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
  if(tags.includes(current)) select.value=current;
}

function renderNotes(){
  const q=document.getElementById("noteSearch").value.trim().toLowerCase();
  const filter=document.getElementById("noteFilter").value;
  const notes=data.notes.filter(n=>(filter==="all"||n.tag===filter)&&(!q||`${n.title} ${n.content} ${n.tag}`.toLowerCase().includes(q)));
  const grid=document.getElementById("noteGrid"), empty=document.getElementById("noteEmpty");
  empty.classList.toggle("hidden", notes.length>0 || data.notes.length>0);
  grid.innerHTML=notes.map(n=>`
    <article class="note-card" data-edit-note="${esc(n.id)}">
      <div class="note-top"><span class="note-label">${esc(n.tag||"General")}</span><span class="note-date">${fmtDate(n.updatedAt)}</span></div>
      <h3>${esc(n.title||"Untitled note")}</h3>
      <p>${esc(n.content||"No content yet.")}</p>
    </article>`).join("");
}

function openModal(html){
  document.getElementById("modal").innerHTML=html;
  document.getElementById("modalBackdrop").classList.remove("hidden");
}
function closeModal(){ document.getElementById("modalBackdrop").classList.add("hidden"); document.getElementById("modal").innerHTML=""; }

function classForm(existing={}, fromTimetable=null){
  const colors=COLORS;
  const taskText=(existing.tasks||[]).join(", ");
  openModal(`
    <h2>${existing.id?"Edit class":"Add a class"}</h2>
    <p class="modal-sub">Keep the important details for this subject together.</p>
    <form id="classForm" class="form-grid">
      <div class="field"><label>Class name</label><input name="name" required value="${esc(existing.name||"")} " placeholder="e.g. Mathematics"></div>
      <div class="field"><label>Short code</label><input name="code" value="${esc(existing.code||"")}" placeholder="e.g. MATH"></div>
      <div class="field"><label>Teacher</label><input name="teacher" value="${esc(existing.teacher||"")}" placeholder="e.g. Ms Smith"></div>
      <div class="field"><label>Room</label><input name="room" value="${esc(existing.room||"")}" placeholder="e.g. B12"></div>
      <div class="field full"><label>Description</label><input name="description" value="${esc(existing.description||"")}" placeholder="What is this class about?"></div>
      <div class="field full"><label>Tasks / resources (comma separated)</label><input name="tasks" value="${esc(taskText)}" placeholder="Homework, textbook, project"></div>
      <div class="field full"><label>Colour</label><div class="swatches">${colors.map(c=>`<button type="button" class="swatch ${existing.color===c?"selected":""}" data-color="${c}" style="background:${c}" aria-label="Choose colour"></button>`).join("")}</div></div>
      <div class="modal-actions full">
        ${existing.id?`<button type="button" class="button danger" id="deleteClassBtn">Delete</button>`:""}
        <button type="button" class="button secondary" id="cancelModal">Cancel</button>
        <button class="button primary">Save class</button>
      </div>
    </form>
  `);
  let selectedColor=existing.color||colors[0];
  document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;document.querySelectorAll(".swatch").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");});
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("classForm").onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget), obj={id:existing.id||crypto.randomUUID(),name:fd.get("name").trim(),code:fd.get("code").trim(),teacher:fd.get("teacher").trim(),room:fd.get("room").trim(),description:fd.get("description").trim(),tasks:fd.get("tasks").split(",").map(s=>s.trim()).filter(Boolean),color:selectedColor};
    if(existing.id){ data.classes=data.classes.map(c=>c.id===existing.id?obj:c); }
    else data.classes.push(obj);
    saveData(); closeModal();
    if(fromTimetable) chooseTimetableSlot(fromTimetable.day,fromTimetable.slot,obj.id);
  };
  if(existing.id) document.getElementById("deleteClassBtn").onclick=()=>{
    data.classes=data.classes.filter(c=>c.id!==existing.id);
    Object.keys(data.timetable).forEach(k=>{if(data.timetable[k]===existing.id) delete data.timetable[k]});
    saveData(); closeModal();
  };
}

function noteForm(existing={}){
  openModal(`
    <h2>${existing.id?"Edit note":"New note"}</h2>
    <p class="modal-sub">Write it down once. Keep it with the rest of your school day.</p>
    <form id="noteForm" class="form-grid">
      <div class="field full"><label>Title</label><input name="title" required value="${esc(existing.title||"")}" placeholder="e.g. Science revision"></div>
      <div class="field"><label>Tag</label><input name="tag" value="${esc(existing.tag||"General")}" placeholder="Homework, Study…"></div>
      <div class="field"><label>Class</label><select name="classId"><option value="">No class</option>${data.classes.map(c=>`<option value="${esc(c.id)}" ${existing.classId===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field full"><label>Note</label><textarea name="content" placeholder="Start typing…">${esc(existing.content||"")}</textarea></div>
      <div class="modal-actions full">
        ${existing.id?`<button type="button" class="button danger" id="deleteNoteBtn">Delete</button>`:""}
        <button type="button" class="button secondary" id="cancelModal">Cancel</button>
        <button class="button primary">Save note</button>
      </div>
    </form>
  `);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("noteForm").onsubmit=e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const now=new Date().toISOString();
    const obj={id:existing.id||crypto.randomUUID(),title:fd.get("title").trim(),tag:(fd.get("tag").trim()||"General"),classId:fd.get("classId"),content:fd.get("content"),updatedAt:now};
    data.notes=existing.id?data.notes.map(n=>n.id===existing.id?obj:n):[obj,...data.notes];
    saveData(); closeModal();
  };
  if(existing.id) document.getElementById("deleteNoteBtn").onclick=()=>{
    data.notes=data.notes.filter(n=>n.id!==existing.id);saveData();closeModal();
  };
}

function chooseTimetableSlot(day,slot,preselectedId=null){
  const currentId=data.timetable[`${day}|${slot}`];
  openModal(`
    <h2>${currentId?"Edit timetable slot":"Add timetable class"}</h2>
    <p class="modal-sub">${esc(day)} · ${esc(slot)}</p>
    <div class="field"><label>Choose class</label><select id="slotClass">${data.classes.map(c=>`<option value="${esc(c.id)}" ${c.id===(preselectedId||currentId)?"selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
    <div class="modal-actions">
      ${currentId?`<button class="button danger" id="removeSlot">Remove</button>`:""}
      <button class="button secondary" id="cancelModal">Cancel</button>
      <button class="button primary" id="saveSlot">Save</button>
    </div>
  `);
  document.getElementById("cancelModal").onclick=closeModal;
  if(!data.classes.length){ document.getElementById("slotClass").replaceWith(Object.assign(document.createElement("div"),{className:"profile-note",textContent:"Create a class first, then add it to your timetable."})); }
  const save=document.getElementById("saveSlot");
  save.onclick=()=>{ const select=document.getElementById("slotClass"); if(!select?.value)return; data.timetable[`${day}|${slot}`]=select.value;saveData();closeModal(); };
  if(currentId) document.getElementById("removeSlot").onclick=()=>{delete data.timetable[`${day}|${slot}`];saveData();closeModal()};
}

document.addEventListener("click",e=>{
  const viewBtn=e.target.closest("[data-view]");
  const targetBtn=e.target.closest("[data-view-target]");
  const action=e.target.closest("[data-action]");
  if(viewBtn){showView(viewBtn.dataset.view);return}
  if(targetBtn){showView(targetBtn.dataset.viewTarget);return}
  if(action){if(action.dataset.action==="new-class")classForm(); if(action.dataset.action==="new-note")noteForm();return}
  const editClass=e.target.closest("[data-edit-class]"); if(editClass){const c=clsById(editClass.dataset.editClass);if(c)classForm(c);return}
  const editNote=e.target.closest("[data-edit-note]"); if(editNote){const n=data.notes.find(x=>x.id===editNote.dataset.editNote);if(n)noteForm(n);return}
  const slot=e.target.closest(".slot"); if(slot){ if(data.classes.length) chooseTimetableSlot(slot.dataset.day,slot.dataset.slot); else classForm({}, {day:slot.dataset.day,slot:slot.dataset.slot}); }
});
document.getElementById("addClassBtn").onclick=()=>classForm();
document.getElementById("addNoteBtn").onclick=()=>noteForm();
document.getElementById("noteSearch").oninput=renderNotes;
document.getElementById("noteFilter").onchange=renderNotes;
document.getElementById("themeBtn").onclick=()=>{
  const dark=!document.body.classList.contains("dark"); document.body.classList.toggle("dark",dark); document.body.classList.toggle("light",!dark); localStorage.setItem(THEME_KEY,dark?"dark":"light");
};
document.getElementById("mobileMenuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("profileBtn").onclick=()=>{
  openModal(`<div class="profile-card"><div class="profile-avatar">${esc((data.profile.name||"S").charAt(0).toUpperCase())}</div><div><h2>Profile</h2><p class="modal-sub">Your local student profile.</p></div><div class="field"><label>Your name</label><input id="profileName" value="${esc(data.profile.name||"Student")}"></div><div class="field"><label>School (optional)</label><input id="profileSchool" value="${esc(data.profile.school||"")}"></div><p class="profile-note">No account or server is required. These details are saved only in this browser on this device.</p><div class="modal-actions"><button class="button secondary" id="cancelModal">Cancel</button><button class="button primary" id="saveProfile">Save</button></div></div>`);
  document.getElementById("cancelModal").onclick=closeModal;
  document.getElementById("saveProfile").onclick=()=>{data.profile.name=document.getElementById("profileName").value.trim()||"Student";data.profile.school=document.getElementById("profileSchool").value.trim();saveData();closeModal();}
};
document.getElementById("clearTimetableBtn").onclick=()=>{
  if(Object.keys(data.timetable).length && confirm("Clear every timetable entry for this week?")){data.timetable={};saveData();}
};
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

(function init(){
  const storedTheme=localStorage.getItem(THEME_KEY);
  if(storedTheme==="dark")document.body.classList.add("dark");
  if(storedTheme==="light")document.body.classList.add("light");
  renderAll();
  setTimeout(()=>document.getElementById("loading-screen").classList.add("hide"),650);
})();
