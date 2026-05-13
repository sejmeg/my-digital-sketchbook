// ===== DATA =====
let posts   = JSON.parse(localStorage.getItem('sketchbook_posts') || '[]');
let allTags = JSON.parse(localStorage.getItem('sketchbook_tags')  || '[]');

let currentMode      = 'gallery';
let currentFilter    = { type: null, value: null };
let currentArticleId = null;
let editingPostId    = null;
let currentTags      = [];
let imageDataUrl     = null;

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ===== DEMO DATA =====
if (posts.length === 0) {
  const imgs = ['sk1','sk2','sk3','sk4','sk5'].map(s=>`https://picsum.photos/seed/${s}/400/400`);
  const tagSets = [['キャラクター','ファンアート'],['風景','デジタル'],['スケッチ'],['カラー','オリジナル'],['線画']];
  const months  = ['2026-05','2026-04','2026-03','2026-02','2026-01'];
  let pid = 1;
  months.forEach(m => {
    for (let d = 1; d <= 5; d++) {
      const day = String(d * 2).padStart(2, '0');
      posts.push({ id: String(pid++), title: `作品タイトル ${pid-1}`, date: `${m}-${day}`,
        imageUrl: imgs[d-1],
        content: '本文が入ります。本文が入ります。本文が入ります。本文が入ります。本文が入ります。\n\n本文が入ります。本文が入ります。本文が入ります。\n\n本文が入ります。',
        tags: tagSets[d-1] });
      tagSets[d-1].forEach(t => { if (!allTags.includes(t)) allTags.push(t); });
    }
  });
  savePosts();
}

function savePosts() {
  localStorage.setItem('sketchbook_posts', JSON.stringify(posts));
  localStorage.setItem('sketchbook_tags',  JSON.stringify(allTags));
}

// ===== FAB GROUP 管理 =====
// 通常: add + top-pc + top-sp(SP) + hamburger(SP)
// 投稿詳細: edit + add (static非表示) → dynamic追加
function showNormalFabs() {
  document.querySelectorAll('.fab-dynamic').forEach(el => el.remove());
  document.querySelectorAll('.fab-static').forEach(el => el.style.display = '');
}

function showArticleFabs() {
  document.querySelectorAll('.fab-static').forEach(el => el.style.display = 'none');

  const fabGroup = document.getElementById('fabGroup');

  const editBtn = document.createElement('button');
  editBtn.className = 'fab fab-dynamic';
  editBtn.title = '編集';
  editBtn.innerHTML = '<svg style="width:22px;height:22px"><use href="#icon-edit"/></svg>';
  editBtn.onclick = () => openEditModal(currentArticleId);

  const addBtn = document.createElement('button');
  addBtn.className = 'fab fab-add fab-dynamic';
  addBtn.title = '新規投稿';
  addBtn.innerHTML = '<svg style="width:22px;height:22px"><use href="#icon-add"/></svg>';
  addBtn.onclick = openAddModal;

  fabGroup.prepend(addBtn);
  fabGroup.prepend(editBtn);
}

// ===== MODE =====
function setMode(mode) {
  currentMode = mode;
  currentFilter = { type: null, value: null };
  document.getElementById('btnGallery').className = mode === 'gallery' ? 'active' : '';
  document.getElementById('btnDiary').className   = mode === 'diary'   ? 'active' : '';
  document.getElementById('gallery-view').style.display = mode === 'gallery' ? 'block' : 'none';
  document.getElementById('diary-view').style.display   = mode === 'diary'   ? 'block' : 'none';
  document.getElementById('article-view').style.display = 'none';
  showNormalFabs();
  renderSidebar(); renderContent();
}

// ===== FILTER =====
function getFilteredPosts() {
  let f = [...posts].sort((a,b) => b.date.localeCompare(a.date));
  if (currentFilter.type === 'tag')     f = f.filter(p => (p.tags||[]).includes(currentFilter.value));
  if (currentFilter.type === 'archive') f = f.filter(p => p.date.startsWith(currentFilter.value));
  return f;
}

function setFilter(type, value) {
  currentFilter = (currentFilter.type === type && currentFilter.value === value)
    ? { type: null, value: null } : { type, value };
  renderSidebar(); renderContent(); closeSpMenu();
}

// ===== SIDEBAR =====
function getArchives() {
  const map = {};
  posts.forEach(p => { const ym = p.date.slice(0,7); map[ym] = (map[ym]||0)+1; });
  return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]));
}

function getAllTags() {
  const s = new Set();
  posts.forEach(p => (p.tags||[]).forEach(t => s.add(t)));
  return [...s];
}

function sidebarHTML(mode) {
  const archives = getArchives(), tags = getAllTags();
  const tagHTML = `<div class="sidebar-section"><h2>Tags</h2><div class="tags-list">${
    tags.map(t=>`<span class="tag-item${currentFilter.type==='tag'&&currentFilter.value===t?' active':''}" onclick="setFilter('tag','${t}')">${t}</span>`).join('')
  }</div></div>`;
  const archHTML = `<div class="sidebar-section"><h2>Archives</h2><ul class="archive-list">${
    archives.map(([ym,cnt])=>`<li class="archive-item${currentFilter.type==='archive'&&currentFilter.value===ym?' active':''}" onclick="setFilter('archive','${ym}')"><span>${ym.replace('-','.')}</span><span class="archive-count">(${cnt})</span></li>`).join('')
  }</ul></div>`;
  return mode === 'gallery' ? tagHTML + archHTML : archHTML + tagHTML;
}

function renderSidebar() {
  const html = sidebarHTML(currentMode);
  document.getElementById('sidebarContent').innerHTML = html;
  document.getElementById('spMenuContent').innerHTML  = html;
}

// ===== GALLERY =====
function renderGallery() {
  document.getElementById('galleryGrid').innerHTML = getFilteredPosts().map(p =>
    `<div class="gallery-item" onclick="openArticle('${p.id}')">
      <img src="${p.imageUrl||'https://picsum.photos/seed/'+p.id+'/400/400'}" alt="${p.title}" loading="lazy">
      <div class="gallery-overlay"><span>${p.date.replace(/-/g,'.')}</span></div>
    </div>`
  ).join('');
}

// ===== DIARY =====
function renderDiary() {
  document.getElementById('diaryList').innerHTML = getFilteredPosts().map(p => {
    const d = new Date(p.date);
    return `<div class="diary-entry">
      <div class="diary-entry-content">
        <div class="diary-date-row">
          <span class="diary-date-num">${p.date.replace(/-/g,'.')}</span>
          <span class="diary-date-day">(${DAYS[d.getDay()]})</span>
        </div>
        <div class="diary-title">${p.title}</div>
        <div class="diary-body">${p.content.replace(/\n/g,'<br>')}</div>
        <div class="diary-tags-row">
          <div class="diary-tags">${(p.tags||[]).map(t=>`<span class="diary-tag">${t}</span>`).join('')}</div>
          <button class="diary-edit-btn" onclick="openEditModal('${p.id}')" title="編集">
            <svg><use href="#icon-edit"/></svg>
          </button>
        </div>
      </div>
      <div class="diary-entry-gap"></div>
      <div class="diary-image" onclick="openLightbox('${p.imageUrl||''}')">
        <img src="${p.imageUrl||'https://picsum.photos/seed/'+p.id+'/400/400'}" alt="${p.title}" loading="lazy">
      </div>
    </div>`;
  }).join('');
}

function renderContent() {
  if (currentMode === 'gallery') renderGallery(); else renderDiary();
}

// ===== ARTICLE =====
function openArticle(id) {
  const p = posts.find(x => x.id === id); if (!p) return;
  currentArticleId = id;
  const d = new Date(p.date);
  document.getElementById('articleHeroImg').src         = p.imageUrl || `https://picsum.photos/seed/${id}/800/600`;
  document.getElementById('articleDateNum').textContent = p.date.replace(/-/g,'.');
  document.getElementById('articleDateDay').textContent = `(${DAYS[d.getDay()]})`;
  document.getElementById('articleTitle').textContent   = p.title;
  document.getElementById('articleContent').innerHTML   = p.content.replace(/\n/g,'<br>');
  document.getElementById('articleTags').innerHTML      = (p.tags||[]).map(t=>`<span class="article-tag">${t}</span>`).join('');

  document.getElementById('gallery-view').style.display = 'none';
  document.getElementById('diary-view').style.display   = 'none';
  document.getElementById('article-view').style.display = 'block';
  document.getElementById('articleHero').onclick        = () => openLightbox(p.imageUrl || `https://picsum.photos/seed/${id}/800/600`);

  showArticleFabs();
}

function closeArticle() {
  document.getElementById('article-view').style.display  = 'none';
  document.getElementById('gallery-view').style.display  = currentMode === 'gallery' ? 'block' : 'none';
  document.getElementById('diary-view').style.display    = currentMode === 'diary'   ? 'block' : 'none';
  showNormalFabs();
}

// ===== LIGHTBOX =====
function openLightbox(src) {
  if (!src) return;
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxOverlay').classList.add('open');
}
function closeLightbox() { document.getElementById('lightboxOverlay').classList.remove('open'); }

// ===== MODAL =====
function openAddModal() {
  editingPostId = null; currentTags = []; imageDataUrl = null;
  document.getElementById('postModalTitle').textContent  = 'New';
  document.getElementById('publishBtn').textContent      = 'Publish';
  document.getElementById('inputTitle').value            = '';
  document.getElementById('inputDate').value             = new Date().toISOString().slice(0,10);
  document.getElementById('inputContents').value         = '';
  document.getElementById('inputTags').value             = '';
  document.getElementById('imagePreview').style.display  = 'none';
  document.getElementById('uploadPlusSvg').style.display = 'block';
  renderTagsDisplay();
  document.getElementById('postModalOverlay').classList.add('open');
}

function openEditModal(id) {
  const p = posts.find(x => x.id === id); if (!p) return;
  editingPostId = id; currentTags = [...(p.tags||[])]; imageDataUrl = p.imageUrl || null;
  document.getElementById('postModalTitle').textContent  = 'Edit';
  document.getElementById('publishBtn').textContent      = 'Saved';
  document.getElementById('inputTitle').value            = p.title;
  document.getElementById('inputDate').value             = p.date;
  document.getElementById('inputContents').value         = p.content;
  document.getElementById('inputTags').value             = '';
  if (p.imageUrl) {
    document.getElementById('imagePreview').src            = p.imageUrl;
    document.getElementById('imagePreview').style.display  = 'block';
    document.getElementById('uploadPlusSvg').style.display = 'none';
  } else {
    document.getElementById('imagePreview').style.display  = 'none';
    document.getElementById('uploadPlusSvg').style.display = 'block';
  }
  renderTagsDisplay();
  document.getElementById('postModalOverlay').classList.add('open');
}

function closePostModal() { document.getElementById('postModalOverlay').classList.remove('open'); }
function handleModalOverlayClick(e, id) { if (e.target.id === id) closePostModal(); }

function submitPost() {
  const title   = document.getElementById('inputTitle').value.trim();
  const date    = document.getElementById('inputDate').value;
  const content = document.getElementById('inputContents').value.trim();
  if (!title || !date) { alert('Title と Date は必須です'); return; }
  currentTags.forEach(t => { if (!allTags.includes(t)) allTags.push(t); });
  if (editingPostId) {
    const idx = posts.findIndex(x => x.id === editingPostId);
    if (idx >= 0) posts[idx] = { ...posts[idx], title, date, content, tags: currentTags,
      imageUrl: imageDataUrl || posts[idx].imageUrl };
  } else {
    posts.push({ id: String(Date.now()), title, date, content, tags: currentTags, imageUrl: imageDataUrl || '' });
  }
  savePosts(); closePostModal(); renderSidebar(); renderContent();
}

// ===== IMAGE =====
function previewImage(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    imageDataUrl = ev.target.result;
    document.getElementById('imagePreview').src            = imageDataUrl;
    document.getElementById('imagePreview').style.display  = 'block';
    document.getElementById('uploadPlusSvg').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ===== TAGS =====
function renderTagsDisplay() {
  document.getElementById('tagsDisplay').innerHTML = currentTags.map(t =>
    `<span class="tag-chip">${t}<span class="tag-chip-remove" onclick="removeTag('${t}')">×</span></span>`
  ).join('');
}
function removeTag(t) { currentTags = currentTags.filter(x => x !== t); renderTagsDisplay(); }

document.getElementById('inputTags').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val && !currentTags.includes(val)) { currentTags.push(val); renderTagsDisplay(); }
    e.target.value = '';
    document.getElementById('tagSuggestions').classList.remove('open');
  }
});

document.getElementById('inputTags').addEventListener('input', e => {
  const val = e.target.value.trim().toLowerCase();
  if (!val) { document.getElementById('tagSuggestions').classList.remove('open'); return; }
  const matches = allTags.filter(t => t.toLowerCase().includes(val) && !currentTags.includes(t));
  if (!matches.length) { document.getElementById('tagSuggestions').classList.remove('open'); return; }
  document.getElementById('tagSuggestions').innerHTML = matches.map(t =>
    `<div class="tag-suggestion-item" onclick="selectTagSuggestion('${t}')">${t}</div>`).join('');
  document.getElementById('tagSuggestions').classList.add('open');
});

function selectTagSuggestion(t) {
  if (!currentTags.includes(t)) { currentTags.push(t); renderTagsDisplay(); }
  document.getElementById('inputTags').value = '';
  document.getElementById('tagSuggestions').classList.remove('open');
}

// ===== SP MENU =====
function toggleSpMenu() { document.getElementById('spMenuOverlay').classList.toggle('open'); }
function closeSpMenu()  { document.getElementById('spMenuOverlay').classList.remove('open'); }

// ===== SCROLL TOP =====
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ===== BOOT =====
renderSidebar();
renderContent();
