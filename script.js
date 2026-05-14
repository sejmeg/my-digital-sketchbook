const SUPABASE_URL = "https://snkiftxdblqlsiyqsdvr.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua2lmdHhkYmxxbHNpeXFzZHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTU1ODIsImV4cCI6MjA5NDIzMTU4Mn0.H0tfeBIfP9Kf2JLqsu6dhUUDd8HPmuAIbiTT10DRAc8";

    const supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    console.log("supabase connected");

    // ===== DATA =====
    let posts = [];
    let allTags = [];

    let currentMode = 'gallery';
    let currentFilter = { type: null, value: null };
    let currentArticleId = null;
    let editingPostId = null;
    let currentTags = [];
    let imageDataUrl = null;

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      document.getElementById('btnDiary').className = mode === 'diary' ? 'active' : '';
      document.getElementById('gallery-view').style.display = mode === 'gallery' ? 'block' : 'none';
      document.getElementById('diary-view').style.display = mode === 'diary' ? 'block' : 'none';
      document.getElementById('article-view').style.display = 'none';
      showNormalFabs();
      renderSidebar(); renderContent();
    }

    // ===== FILTER =====
    function getFilteredPosts() {
      let f = [...posts].sort((a, b) => b.date.localeCompare(a.date));
      if (currentFilter.type === 'tag') f = f.filter(p => (p.tags || []).includes(currentFilter.value));
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
      posts.forEach(p => { const ym = p.date.slice(0, 7); map[ym] = (map[ym] || 0) + 1; });
      return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    }

    function getAllTags() {
      const s = new Set();
      posts.forEach(p => (p.tags || []).forEach(t => s.add(t)));
      return [...s];
    }

    function sidebarHTML(mode) {
      const archives = getArchives(), tags = getAllTags();
      const tagHTML = `<div class="sidebar-section"><h2>Tags</h2><div class="tags-list">${tags.map(t => `<span class="tag-item${currentFilter.type === 'tag' && currentFilter.value === t ? ' active' : ''}" onclick="setFilter('tag','${t}')">${t}</span>`).join('')
        }</div></div>`;
      const archHTML = `<div class="sidebar-section"><h2>Archives</h2><ul class="archive-list">${archives.map(([ym, cnt]) => `<li class="archive-item${currentFilter.type === 'archive' && currentFilter.value === ym ? ' active' : ''}" onclick="setFilter('archive','${ym}')"><span>${ym.replace('-', '.')}</span><span class="archive-count">(${cnt})</span></li>`).join('')
        }</ul></div>`;
      return mode === 'gallery' ? tagHTML + archHTML : archHTML + tagHTML;
    }

    function renderSidebar() {
      const html = sidebarHTML(currentMode);
      document.getElementById('sidebarContent').innerHTML = html;
      document.getElementById('spMenuContent').innerHTML = html;
    }

    // ===== GALLERY =====
    function renderGallery() {
      document.getElementById('galleryGrid').innerHTML = getFilteredPosts().map(p =>
        `<div class="gallery-item" onclick="openArticle('${p.id}')">
      <img src="${p.imageUrl || ''}" alt="${p.title}" loading="lazy">
      <div class="gallery-overlay"><span>${p.date.replace(/-/g, '.')}</span></div>
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
          <span class="diary-date-num">${p.date.replace(/-/g, '.')}</span>
          <span class="diary-date-day">(${DAYS[d.getDay()]})</span>
        </div>
        <div class="diary-title">${p.title}</div>
        <div class="diary-body">${p.content.replace(/\n/g, '<br>')}</div>
        <div class="diary-tags-row">
          <div class="diary-tags">${(p.tags || []).map(t => `<span class="diary-tag">${t}</span>`).join('')}</div>
          <button class="diary-edit-btn" onclick="openEditModal('${p.id}')" title="編集">
            <svg><use href="#icon-edit"/></svg>
          </button>
        </div>
      </div>
      <div class="diary-entry-gap"></div>
      <div class="diary-image" onclick="openLightbox('${p.imageUrl || ''}')">
        <img src="${p.imageUrl || ''}" alt="${p.title}" loading="lazy">
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
      document.getElementById('articleHeroImg').src = p.imageUrl || ``;
      document.getElementById('articleDateNum').textContent = p.date.replace(/-/g, '.');
      document.getElementById('articleDateDay').textContent = `(${DAYS[d.getDay()]})`;
      document.getElementById('articleTitle').textContent = p.title;
      document.getElementById('articleContent').innerHTML = p.content.replace(/\n/g, '<br>');
      document.getElementById('articleTags').innerHTML = (p.tags || []).map(t => `<span class="article-tag">${t}</span>`).join('');

      document.getElementById('gallery-view').style.display = 'none';
      document.getElementById('diary-view').style.display = 'none';
      document.getElementById('article-view').style.display = 'block';
      document.getElementById('articleHero').onclick = () => openLightbox(p.imageUrl || ``);

      showArticleFabs();
    }

    function closeArticle() {
      document.getElementById('article-view').style.display = 'none';
      document.getElementById('gallery-view').style.display = currentMode === 'gallery' ? 'block' : 'none';
      document.getElementById('diary-view').style.display = currentMode === 'diary' ? 'block' : 'none';
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
      document.getElementById('postModalTitle').textContent = 'New';
      document.getElementById('publishBtn').textContent = 'Publish';
      document.getElementById('inputTitle').value = '';
      document.getElementById('inputDate').value = new Date().toISOString().slice(0, 10);
      document.getElementById('inputContents').value = '';
      document.getElementById('inputTags').value = '';
      document.getElementById('imagePreview').style.display = 'none';
      document.getElementById('uploadPlusSvg').style.display = 'block';
      renderTagsDisplay();
      document.getElementById('postModalOverlay').classList.add('open');
    }

    function openEditModal(id) {
      const p = posts.find(x => x.id === id); if (!p) return;
      editingPostId = id; currentTags = [...(p.tags || [])]; imageDataUrl = p.imageUrl || null;
      document.getElementById('postModalTitle').textContent = 'Edit';
      document.getElementById('publishBtn').textContent = 'Saved';
      document.getElementById('inputTitle').value = p.title;
      document.getElementById('inputDate').value = p.date;
      document.getElementById('inputContents').value = p.content;
      document.getElementById('inputTags').value = '';
      if (p.imageUrl) {
        document.getElementById('imagePreview').src = p.imageUrl;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('uploadPlusSvg').style.display = 'none';
      } else {
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('uploadPlusSvg').style.display = 'block';
      }
      renderTagsDisplay();
      document.getElementById('postModalOverlay').classList.add('open');
    }

    function closePostModal() { document.getElementById('postModalOverlay').classList.remove('open'); }
    function handleModalOverlayClick(e, id) { if (e.target.id === id) closePostModal(); }

    async function submitPost() {

      console.log("editingPostId:", editingPostId);

      const title = document.getElementById("inputTitle").value;
      const content = document.getElementById("inputContents").value;
      const date = document.getElementById("inputDate").value;

      const file = document.getElementById("imageInput").files[0];

      let imageUrl = "";

      // 画像アップロード
      if (file) {

        const fileName = `${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("images")
          .upload(fileName, file);

        if (uploadError) {
          alert("画像アップロード失敗");
          return;
        }

        const { data } = supabaseClient.storage
          .from("images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      // 編集
      if (editingPostId) {

        const { error } = await supabaseClient
          .from("posts")
          .update({
            title: title,
            content: content,
            image_url: imageUrl || imageDataUrl,
            post_date: date,
            tags: currentTags
          })
          .eq("id", Number(editingPostId));

        if (error) {
          console.error(error);
          alert("更新失敗");
          return;
        }

        alert("更新完了");

        console.log(editingPostId);

      } else {

        // 新規投稿
        const { error } = await supabaseClient
          .from("posts")
          .insert([
            {
              title: title,
              content: content,
              image_url: imageUrl,
              post_date: date,
              tags: currentTags
            }
          ]);

        if (error) {
          console.error(error);
          alert("保存失敗");
          return;
        }

        alert("投稿完了");
      }

      await loadPosts();
      closePostModal();
    }

    async function loadPosts() {

      const { data, error } = await supabaseClient
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      // UI用形式へ変換
      posts = data.map(post => ({
        id: String(post.id),
        title: post.title || "",
        date: post.post_date || "",
        imageUrl: post.image_url || "",
        content: post.content || "",
        tags: post.tags || []
      }));

      // タグ一覧再生成
      allTags = [...new Set(
        posts.flatMap(p => p.tags || [])
      )];

      renderSidebar();
      renderContent();
    }

    // ===== IMAGE =====
    function previewImage(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        imageDataUrl = ev.target.result;
        document.getElementById('imagePreview').src = imageDataUrl;
        document.getElementById('imagePreview').style.display = 'block';
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
    function closeSpMenu() { document.getElementById('spMenuOverlay').classList.remove('open'); }

    // ===== SCROLL TOP =====
    function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

    // ===== BOOT =====
    loadPosts();