// Biagio Photography CMS - Frontend Application

// ==================== State ====================
let seriesData = [];
let aboutData = {};
let homeData = { slides: [] };
let currentSeriesId = null;
let currentPhotoIndex = null;
let currentSlideId = null;
let homeTextFormat = { bold: false, italic: false, align: 'center' };
let currentTextX = 50;
let currentTextY = 50;
let currentAspectRatio = 3 / 2;
let simulatedDeviceWidth  = null;
let simulatedDeviceHeight = null;   // physical screen height of selected preset
let simulatedDeviceBase   = null;   // original portrait width of selected preset
let simulatedDeviceOrientation = 'portrait';

const DEVICES = {
  393:  { name: 'iPhone 15',  h: 852,  category: 'phone'   },
  430:  { name: 'iPhone 15+', h: 932,  category: 'phone'   },
  744:  { name: 'iPad Mini',  h: 1133, category: 'tablet'  },
  820:  { name: 'iPad 11"',   h: 1180, category: 'tablet'  },
  1024: { name: 'iPad 13"',   h: 1366, category: 'tablet'  },
  1440: { name: '15″ 4K',     h: 900,  category: 'monitor' },
  1920: { name: '24″ 4K',     h: 1080, category: 'monitor' },
};

const DEVICE_CATEGORIES = {
  phone:   [393, 430],
  tablet:  [744, 820, 1024],
  monitor: [1440, 1920],
};

let activeCategory = null;
let seriesDescriptionEditor = null;
let aboutContentEditor = null;
let seriesSortable = null;
let photosSortable = null;

// ==================== CROPPING FEATURE - SAVED FOR FUTURE USE ====================
/*
   Focal-point image cropping with guide lines and X/Y sliders.
   Currently disabled in favor of simple scale-only behavior.

   To re-enable cropping on home slides in the CMS:

   1. In cms/public/index.html (home tab editor):
      - Uncomment the crop guide line divs (lines 477-480):
        <div id="crop-guide-x" style="..."></div>
        <div id="crop-guide-y" style="..."></div>

   2. In cms/public/index.html (home tab form controls):
      - Restore the imagePosX and imagePosY slider inputs to the form

   3. In cms/public/app.js:
      - Uncomment the calls to updateGuideLines() in:
        * renderHomeSlidePreview() function
        * Event listeners for imagePosX/imagePosY sliders

   4. In assets/js/main.js (website):
      - Uncomment the homeCompositeLayout() calls in loadHomeSlides():
        * Line ~584: In $bg[0].onload handler
        * Line ~632: In applyAllLayouts() function
      - Update CSS .home-composite-wrap: position: absolute; top: 0; left: 0;
      - Update CSS .home-slide: position: relative; overflow: hidden;
*/

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
  initEditors();
  initDragDrop();
  initPreviewResize();
  initTextDrag();
  loadData();
  checkGitStatus();

  // Periodically check git status
  setInterval(checkGitStatus, 30000);
});

function initEditors() {
  // Series description editor
  seriesDescriptionEditor = new Quill('#series-description-editor', {
    theme: 'snow',
    placeholder: 'Write a description for this series...',
    modules: {
      toolbar: [
        ['bold', 'italic'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['clean']
      ]
    }
  });

  // About content editor
  aboutContentEditor = new Quill('#about-content-editor', {
    theme: 'snow',
    placeholder: 'Write your bio...',
    modules: {
      toolbar: [
        ['bold', 'italic'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ]
    }
  });
}

function initDragDrop() {
  // Drag and drop for photo upload area
  const uploadArea = document.getElementById('photo-upload-area');
  
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePhotoUpload(files);
    }
  });
}

// ==================== Data Loading ====================

async function loadData() {
  showLoading('Loading...');
  try {
    const [seriesRes, aboutRes, homeRes] = await Promise.all([
      fetch('/api/series'),
      fetch('/api/about'),
      fetch('/api/home')
    ]);

    seriesData = await seriesRes.json();
    aboutData = await aboutRes.json();
    homeData = await homeRes.json();

    // Auto-populate home slides from photos marked with homepage: true
    syncHomeSliderFromPhotos();

    renderSeriesList();
    renderAboutPage();
    renderHomeList();

    // Ensure home tab is shown and active on load
    showView('home');
    document.querySelector('[data-tab="home"]').classList.add('active');
  } catch (err) {
    showToast('Failed to load data', 'error');
    console.error(err);
  }
  hideLoading();
}

// Auto-populate home slides from photos marked with homepage: true
function syncHomeSliderFromPhotos() {
  // Collect all photos with homepage: true
  const homepagePhotos = [];
  seriesData.forEach(series => {
    series.photos.forEach(photo => {
      if (photo.homepage === true) {
        homepagePhotos.push({ ...photo, seriesId: series.id, seriesTitle: series.title });
      }
    });
  });

  // Create slides for photos that don't have a corresponding slide yet
  homepagePhotos.forEach((photo, index) => {
    const slideExists = homeData.slides.some(s => s.background === photo.image);
    if (!slideExists) {
      const newSlide = {
        id: Date.now().toString() + index,
        background: photo.image,
        foreground: null,
        title: `Slide 1`,
        text: '',
        textFormat: { bold: false, italic: false, align: 'center' },
        textX: 50,
        textY: 50,
        seriesId: photo.seriesId
      };
      homeData.slides.push(newSlide);
    }
  });

  // Renumber all slides per series with incremental titles
  renumberSlidesBySeriesGroup();
}

// Renumber slides by series group with incremental numbers per group
function renumberSlidesBySeriesGroup() {
  const slidesBySeriesId = {};

  // Group slides by series
  homeData.slides.forEach(slide => {
    const seriesId = slide.seriesId || 'no-series';
    if (!slidesBySeriesId[seriesId]) {
      slidesBySeriesId[seriesId] = [];
    }
    slidesBySeriesId[seriesId].push(slide);
  });

  // Renumber slides within each group
  Object.keys(slidesBySeriesId).forEach(seriesId => {
    slidesBySeriesId[seriesId].forEach((slide, index) => {
      if (!slide.title || slide.title.startsWith('Slide ')) {
        slide.title = `Slide ${index + 1}`;
      }
    });
  });
}

// ==================== View Management ====================

function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  
  // Update tab buttons (sub-views map back to their parent tab)
  const tabName = viewName === 'series-edit' ? 'series-list'
    : viewName === 'home-slide-edit' ? 'home'
    : viewName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) btn.classList.add('active');
  });
  
  // Show selected view
  const viewMap = {
    'series-list':    'series-list-view',
    'series-edit':    'series-edit-view',
    'about':          'about-view',
    'home':           'home-view',
    'home-slide-edit':'home-slide-edit-view'
  };
  const viewId = viewMap[viewName];
  if (viewId) document.getElementById(viewId).classList.remove('hidden');
}

// ==================== Series List ====================

function renderSeriesList() {
  const grid = document.getElementById('series-grid');
  
  if (seriesData.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <p class="text-lg mb-2">No series yet</p>
        <p>Click "+ New Series" to create your first photo series</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = seriesData.map((series, index) => {
    const thumb = series.photos.length > 0 
      ? `/${series.photos[0].image}` 
      : '';
    const photoCount = series.photos.length;
    
    return `
      <div class="series-card" data-id="${series.id}" onclick="editSeries('${series.id}')">
        <div class="series-card-handle" onclick="event.stopPropagation()">⋮⋮</div>
        ${thumb 
          ? `<img src="${thumb}" alt="${series.title}" class="series-card-thumb">` 
          : `<div class="series-card-thumb flex items-center justify-center text-2xl">📷</div>`
        }
        <div class="series-card-info">
          <div class="series-card-title">${escapeHtml(series.title)}</div>
          <div class="series-card-meta">${photoCount} photo${photoCount !== 1 ? 's' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Initialize sortable
  if (seriesSortable) {
    seriesSortable.destroy();
  }
  
  seriesSortable = new Sortable(grid, {
    animation: 150,
    handle: '.series-card-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: async () => {
      const newOrder = Array.from(grid.querySelectorAll('.series-card'))
        .map(card => card.dataset.id);
      
      try {
        await fetch('/api/series-order', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder })
        });
        
        // Update local data
        seriesData = newOrder.map(id => seriesData.find(s => s.id === id));
        checkGitStatus();
      } catch (err) {
        showToast('Failed to save order', 'error');
      }
    }
  });
}

// ==================== Series Edit ====================

function editSeries(id) {
  const series = seriesData.find(s => s.id === id);
  if (!series) return;
  
  currentSeriesId = id;
  
  // Update title
  document.getElementById('edit-series-title').textContent = series.title;
  document.getElementById('series-title-input').value = series.title;
  
  // Update description editor
  seriesDescriptionEditor.root.innerHTML = convertTextToHtml(series.description);
  
  // Render photos
  renderPhotosGrid(series.photos);
  
  showView('series-edit');
}

function renderPhotosGrid(photos) {
  const grid = document.getElementById('photos-grid');
  
  if (photos.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 text-center py-8 text-gray-400">
        <p>No photos yet. Upload some above!</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = photos.map((photo, index) => `
    <div class="photo-card" data-index="${index}" onclick="openPhotoEdit(${index})">
      <img src="/${photo.image}" alt="" loading="lazy">
      <div class="photo-card-overlay">
        <span class="photo-card-meta">${photo.metadata && typeof photo.metadata === 'object' ? [photo.metadata.camera, photo.metadata.lens, photo.metadata.filmRoll].filter(Boolean).map(escapeHtml).join(' · ') : escapeHtml(photo.metadata || 'No metadata')}</span>
      </div>
    </div>
  `).join('');
  
  // Initialize sortable for photos
  if (photosSortable) {
    photosSortable.destroy();
  }
  
  photosSortable = new Sortable(grid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: async () => {
      const series = seriesData.find(s => s.id === currentSeriesId);
      if (!series) return;
      
      const newOrder = Array.from(grid.querySelectorAll('.photo-card'))
        .map(card => parseInt(card.dataset.index));
      
      // Reorder photos in local data
      const reorderedPhotos = newOrder.map(i => series.photos[i]);
      series.photos = reorderedPhotos;
      
      // Save to server
      try {
        await fetch(`/api/series/${currentSeriesId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: series.photos })
        });
        
        // Re-render with new indices
        renderPhotosGrid(series.photos);
        checkGitStatus();
      } catch (err) {
        showToast('Failed to save photo order', 'error');
      }
    }
  });
}

async function saveSeriesInfo() {
  const series = seriesData.find(s => s.id === currentSeriesId);
  if (!series) return;
  
  const title = document.getElementById('series-title-input').value.trim();
  const description = convertHtmlToText(seriesDescriptionEditor.root.innerHTML);
  
  if (!title) {
    showToast('Title is required', 'error');
    return;
  }
  
  showLoading('Saving...');
  try {
    const res = await fetch(`/api/series/${currentSeriesId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    if (!res.ok) throw new Error('Failed to save');
    
    // Update local data
    series.title = title;
    series.description = description;

    document.getElementById('edit-series-title').textContent = title;
    renderSeriesList(); // Refresh the series list to show updated title
    showToast('Changes saved!', 'success');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to save changes', 'error');
  }
  hideLoading();
}

async function deleteCurrentSeries() {
  if (!currentSeriesId) return;
  
  if (!confirm('Are you sure you want to delete this series? The photos will remain on disk but will be removed from the website.')) {
    return;
  }
  
  showLoading('Deleting...');
  try {
    const res = await fetch(`/api/series/${currentSeriesId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    
    // Remove from local data
    seriesData = seriesData.filter(s => s.id !== currentSeriesId);
    currentSeriesId = null;
    
    showToast('Series deleted', 'success');
    showView('series-list');
    renderSeriesList();
    checkGitStatus();
  } catch (err) {
    showToast('Failed to delete series', 'error');
  }
  hideLoading();
}

// ==================== Photo Upload ====================

function uploadPhotos(event) {
  const files = event.target.files;
  if (files.length > 0) {
    handlePhotoUpload(files);
  }
  event.target.value = '';
}

async function handlePhotoUpload(files) {
  if (!currentSeriesId) return;
  
  const optimize = document.getElementById('optimize-checkbox').checked;
  const formData = new FormData();
  
  for (const file of files) {
    formData.append('photos', file);
  }
  formData.append('optimize', optimize.toString());
  
  showLoading(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`);
  
  try {
    const res = await fetch(`/api/series/${currentSeriesId}/photos`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error('Upload failed');
    
    const result = await res.json();
    
    // Update local data
    const series = seriesData.find(s => s.id === currentSeriesId);
    if (series) {
      // Reload the series to get updated photos
      const updatedRes = await fetch(`/api/series/${currentSeriesId}`);
      const updated = await updatedRes.json();
      series.photos = updated.photos;
      renderPhotosGrid(series.photos);
    }
    
    showToast(`${result.photos.length} photo${result.photos.length > 1 ? 's' : ''} uploaded!`, 'success');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to upload photos', 'error');
    console.error(err);
  }
  hideLoading();
}

// ==================== Photo Edit Modal ====================

function updateCount(inputId, countId) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  if (input && count) count.textContent = `(${input.value.length}/20)`;
}

function openPhotoEdit(index) {
  const series = seriesData.find(s => s.id === currentSeriesId);
  if (!series || !series.photos[index]) return;

  currentPhotoIndex = index;
  const photo = series.photos[index];

  document.getElementById('photo-edit-preview').src = '/' + photo.image;
  const meta = (photo.metadata && typeof photo.metadata === 'object') ? photo.metadata : {};

  const fields = [
    ['photo-camera-input',     'camera-count',     meta.camera     || ''],
    ['photo-lens-input',       'lens-count',       meta.lens       || ''],
    ['photo-film-input',       'film-count',       meta.filmRoll   || ''],
    ['photo-developing-input', 'developing-count', meta.developing || ''],
    ['photo-scanning-input',   'scanning-count',   meta.scanning   || ''],
    ['photo-printing-input',   'printing-count',   meta.printing   || ''],
  ];
  fields.forEach(([inputId, countId, value]) => {
    const el = document.getElementById(inputId);
    if (el) { el.value = value; updateCount(inputId, countId); }
  });

  // Load homepage flag
  const homepageCheckbox = document.getElementById('photo-homepage-checkbox');
  if (homepageCheckbox) {
    homepageCheckbox.checked = photo.homepage === true;
  }

  document.getElementById('photo-edit-modal').classList.remove('hidden');
}

function hidePhotoEditModal() {
  document.getElementById('photo-edit-modal').classList.add('hidden');
  currentPhotoIndex = null;
}

async function savePhotoMetadata() {
  if (currentPhotoIndex === null) return;

  const series = seriesData.find(s => s.id === currentSeriesId);
  if (!series) return;

  const metadata = {
    camera:     document.getElementById('photo-camera-input').value.trim(),
    lens:       document.getElementById('photo-lens-input').value.trim(),
    filmRoll:   document.getElementById('photo-film-input').value.trim(),
    developing: document.getElementById('photo-developing-input').value.trim(),
    scanning:   document.getElementById('photo-scanning-input').value.trim(),
    printing:   document.getElementById('photo-printing-input').value.trim(),
  };

  series.photos[currentPhotoIndex].metadata = metadata;
  const wasHomepage = series.photos[currentPhotoIndex].homepage === true;
  const isNowHomepage = document.getElementById('photo-homepage-checkbox').checked;
  series.photos[currentPhotoIndex].homepage = isNowHomepage;

  // Handle bidirectional sync with home slides
  if (!wasHomepage && isNowHomepage) {
    // Creating a new home slide from this photo
    const photo = series.photos[currentPhotoIndex];
    const newSlide = {
      id: Date.now().toString(),
      background: photo.image,
      foreground: null,
      title: 'Slide 1',
      text: '',
      textFormat: { bold: false, italic: false, align: 'center' },
      textX: 50,
      textY: 50,
      seriesId: currentSeriesId
    };
    homeData.slides.push(newSlide);
    renumberSlidesBySeriesGroup();
  } else if (wasHomepage && !isNowHomepage) {
    // Deleting the corresponding home slide
    const photo = series.photos[currentPhotoIndex];
    homeData.slides = homeData.slides.filter(s => s.background !== photo.image);
    renumberSlidesBySeriesGroup();
  }

  showLoading('Saving...');
  try {
    await fetch(`/api/series/${currentSeriesId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: series.photos })
    });

    // Save home slides changes if any
    if (isNowHomepage || wasHomepage) {
      await fetch('/api/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: homeData.slides })
      });
    }

    renderPhotosGrid(series.photos);
    showToast('Metadata saved!', 'success');
    hidePhotoEditModal();
    checkGitStatus();
  } catch (err) {
    showToast('Failed to save metadata', 'error');
  }
  hideLoading();
}

async function deletePhoto() {
  if (currentPhotoIndex === null) return;
  
  if (!confirm('Remove this photo from the series? The file will remain on disk.')) {
    return;
  }
  
  showLoading('Removing...');
  try {
    const res = await fetch(`/api/series/${currentSeriesId}/photos/${currentPhotoIndex}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    
    // Update local data
    const series = seriesData.find(s => s.id === currentSeriesId);
    if (series) {
      series.photos.splice(currentPhotoIndex, 1);
      renderPhotosGrid(series.photos);
    }
    
    showToast('Photo removed', 'success');
    hidePhotoEditModal();
    checkGitStatus();
  } catch (err) {
    showToast('Failed to remove photo', 'error');
  }
  hideLoading();
}

// ==================== Create Series Modal ====================

function showCreateSeriesModal() {
  document.getElementById('new-series-title').value = '';
  document.getElementById('create-series-modal').classList.remove('hidden');
  document.getElementById('new-series-title').focus();
}

function hideCreateSeriesModal() {
  document.getElementById('create-series-modal').classList.add('hidden');
}

async function createSeries() {
  const title = document.getElementById('new-series-title').value.trim();
  
  if (!title) {
    showToast('Please enter a title', 'error');
    return;
  }
  
  showLoading('Creating...');
  try {
    const res = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create series');
    }
    
    const newSeries = await res.json();
    seriesData.push(newSeries);
    
    hideCreateSeriesModal();
    renderSeriesList();
    editSeries(newSeries.id);
    
    showToast('Series created!', 'success');
    checkGitStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
  hideLoading();
}

// ==================== About Page ====================

function renderAboutPage() {
  // Set image
  if (aboutData.image) {
    document.getElementById('about-image-preview').src = '/' + aboutData.image;
  }
  
  // Set content
  aboutContentEditor.root.innerHTML = convertTextToHtml(aboutData.content || '');
  
  // Set links
  renderLinks();
}

function renderLinks() {
  const container = document.getElementById('links-container');
  
  if (!aboutData.links || aboutData.links.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No links yet</p>';
    return;
  }
  
  container.innerHTML = aboutData.links.map((link, index) => `
    <div class="link-row">
      <input type="text" value="${escapeHtml(link.text)}" placeholder="Label" 
             onchange="updateLink(${index}, 'text', this.value)">
      <input type="text" value="${escapeHtml(link.url)}" placeholder="URL" 
             onchange="updateLink(${index}, 'url', this.value)">
      <button onclick="removeLink(${index})">✕</button>
    </div>
  `).join('');
}

function addLink() {
  if (!aboutData.links) {
    aboutData.links = [];
  }
  aboutData.links.push({ text: '', url: '' });
  renderLinks();
}

function updateLink(index, field, value) {
  if (aboutData.links && aboutData.links[index]) {
    aboutData.links[index][field] = value;
  }
}

function removeLink(index) {
  if (aboutData.links) {
    aboutData.links.splice(index, 1);
    renderLinks();
  }
}

async function uploadAboutImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const optimize = document.getElementById('about-optimize-checkbox').checked;
  const formData = new FormData();
  formData.append('image', file);
  formData.append('optimize', optimize.toString());
  
  showLoading('Uploading image...');
  try {
    const res = await fetch('/api/about/image', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error('Upload failed');
    
    const result = await res.json();
    aboutData.image = result.image;
    document.getElementById('about-image-preview').src = '/' + result.image;
    
    showToast('Image uploaded!', 'success');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to upload image', 'error');
  }
  hideLoading();
  event.target.value = '';
}

async function saveAbout() {
  const content = convertHtmlToText(aboutContentEditor.root.innerHTML);
  
  // Filter out empty links
  const links = (aboutData.links || []).filter(l => l.text && l.url);
  
  showLoading('Saving...');
  try {
    const res = await fetch('/api/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, links })
    });
    
    if (!res.ok) throw new Error('Failed to save');
    
    aboutData.content = content;
    aboutData.links = links;
    renderLinks();
    
    showToast('About page saved!', 'success');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to save about page', 'error');
  }
  hideLoading();
}

// ==================== Git / Publish ====================

async function checkGitStatus() {
  try {
    const res = await fetch('/api/git/status');
    const status = await res.json();
    
    const statusEl = document.getElementById('git-status');
    const publishBtn = document.getElementById('publish-btn');
    
    if (status.isClean) {
      statusEl.innerHTML = '<span class="text-green-400">✓ All changes published</span>';
      publishBtn.disabled = true;
      publishBtn.classList.add('opacity-50');
    } else {
      const totalChanges = (status.modified?.length || 0) + 
                          (status.created?.length || 0) + 
                          (status.not_added?.length || 0);
      statusEl.innerHTML = `<span class="text-yellow-400">● ${totalChanges} unpublished change${totalChanges !== 1 ? 's' : ''}</span>`;
      publishBtn.disabled = false;
      publishBtn.classList.remove('opacity-50');
    }
  } catch (err) {
    document.getElementById('git-status').innerHTML = '<span class="text-red-400">⚠ Git error</span>';
  }
}

async function publish() {
  if (!confirm('Publish all changes to the website?')) {
    return;
  }
  
  showLoading('Publishing changes...');
  try {
    const res = await fetch('/api/publish', {
      method: 'POST'
    });
    
    const result = await res.json();
    
    if (!res.ok) {
      // Check if it's an authentication error
      if (result.needsAuth || res.status === 401) {
        hideLoading();
        showAuthHelp();
        return;
      }
      throw new Error(result.error || 'Publish failed');
    }
    
    showToast(result.message, 'success');
    checkGitStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
  hideLoading();
}

// Show authentication help modal
function showAuthHelp() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'auth-help-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="closeAuthHelp()"></div>
    <div class="modal-content bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
      <h3 class="text-xl font-semibold mb-4 text-gray-900">🔐 GitHub Setup Required</h3>
      <div class="space-y-4 text-gray-700">
        <p>To publish changes, you need to set up GitHub authentication. This is a one-time setup.</p>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="font-medium text-blue-800 mb-2">Quick Steps:</p>
          <ol class="list-decimal list-inside space-y-1 text-sm text-blue-700">
            <li>Go to GitHub → Settings → Developer settings → Personal access tokens</li>
            <li>Create a new token with "repo" permissions</li>
            <li>Copy the token (starts with ghp_...)</li>
            <li>Try publishing again - use the token as password</li>
          </ol>
        </div>
        
        <p class="text-sm text-gray-500">
          📄 Full instructions in Italian are available in:<br>
          <code class="bg-gray-100 px-2 py-1 rounded">cms/SETUP_GITHUB.md</code>
        </p>
        
        <div class="flex gap-3 justify-end pt-2">
          <a href="https://github.com/settings/tokens/new" target="_blank" 
             class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium">
            Open GitHub Settings
          </a>
          <button onclick="closeAuthHelp()" class="px-4 py-2 text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeAuthHelp() {
  const modal = document.getElementById('auth-help-modal');
  if (modal) {
    modal.remove();
  }
}

// ==================== Utilities ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function convertTextToHtml(text) {
  if (!text) return '';
  // Convert paragraphs (double newline) to <p> tags
  return text.split(/\n\n+/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function convertHtmlToText(html) {
  if (!html) return '';
  // Create a temporary div
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Convert <p> and <br> to newlines
  div.querySelectorAll('p').forEach(p => {
    p.insertAdjacentText('afterend', '\n\n');
  });
  div.querySelectorAll('br').forEach(br => {
    br.insertAdjacentText('afterend', '\n');
  });
  
  // Get text and clean up
  return div.textContent.trim().replace(/\n{3,}/g, '\n\n');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const messageEl = document.getElementById('toast-message');
  
  messageEl.textContent = message;
  toast.className = `toast ${type}`;
  
  // Remove hidden and trigger animation
  toast.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function showLoading(message = 'Loading...') {
  document.getElementById('loading-message').textContent = message;
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// ==================== Home Page ====================

function renderHomeList() {
  const grid = document.getElementById('home-slides-grid');
  if (!grid) return;

  const slides = homeData.slides || [];

  if (slides.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <p class="text-lg mb-2">No slides yet</p>
        <p>Click "+ Add Slide" to create your first home slide</p>
      </div>
    `;
    return;
  }

  // Group slides by series
  const slidesBySeriesId = {};
  slides.forEach(slide => {
    const seriesId = slide.seriesId || 'no-series';
    if (!slidesBySeriesId[seriesId]) {
      slidesBySeriesId[seriesId] = [];
    }
    slidesBySeriesId[seriesId].push(slide);
  });

  // Render grouped slides with series headers
  let html = '';
  Object.keys(slidesBySeriesId).forEach(seriesId => {
    const groupSlides = slidesBySeriesId[seriesId];
    const seriesTitle = seriesId === 'no-series'
      ? 'No Series'
      : (seriesData.find(s => s.id === seriesId)?.title || 'Unknown Series');

    // Add series header
    html += `<div class="col-span-full mt-4 mb-2"><h3 class="text-lg font-semibold text-gray-700">${escapeHtml(seriesTitle)}</h3></div>`;

    // Add slides for this series
    html += groupSlides.map((slide, slideIndex) => `
      <div class="series-card" onclick="editHomeSlide('${slide.id}')">
        ${slide.background
          ? `<img src="/${slide.background}" alt="" class="series-card-thumb">`
          : `<div class="series-card-thumb flex items-center justify-center text-2xl bg-gray-100">🖼️</div>`
        }
        <div class="series-card-info">
          <div class="series-card-title">${escapeHtml(slide.title || `Slide ${slideIndex + 1}`)}</div>
          <div class="series-card-meta">${slide.background ? 'BG ✓' : 'No BG'} · ${slide.foreground ? 'FG ✓' : 'No FG'}</div>
        </div>
      </div>
    `).join('');
  });

  grid.innerHTML = html;
}

async function addHomeSlide() {
  showLoading('Creating slide...');
  try {
    const res = await fetch('/api/home/slides', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create slide');
    const newSlide = await res.json();
    // Title will be assigned by renumberSlidesBySeriesGroup during renderHomeList
    homeData.slides.push(newSlide);
    renumberSlidesBySeriesGroup();
    renderHomeList();
    editHomeSlide(newSlide.id);
    checkGitStatus();
  } catch (err) {
    showToast('Failed to create slide', 'error');
  }
  hideLoading();
}

function editHomeSlide(id) {
  const slide = homeData.slides.find(s => s.id === id);
  if (!slide) return;
  currentSlideId = id;

  // Populate controls
  document.getElementById('home-title-input').value = slide.title || 'Slide 1';
  document.getElementById('home-text-input').value = slide.text || '';
  document.getElementById('home-textSize-slider').value       = slide.textSize       ?? 5;
  document.getElementById('home-textLineHeight-slider').value = slide.textLineHeight ?? 1.2;

  currentTextX = slide.textX ?? 50;
  currentTextY = slide.textY ?? 50;

  updateHomeSliderLabel('textSize');
  updateHomeSliderLabel('textLineHeight');

  // Text formatting
  homeTextFormat.bold   = slide.textBold   || false;
  homeTextFormat.italic = slide.textItalic || false;
  homeTextFormat.align  = slide.textAlign  || 'center';
  updateFormatButtons();

  // Shadow
  document.getElementById('toggle-shadow').checked             = slide.shadowEnabled ?? true;
  document.getElementById('home-shadowIntensity-slider').value = slide.shadowIntensity ?? 60;
  document.getElementById('home-shadowDistance-slider').value  = slide.shadowDistance  ?? 4;
  updateHomeSliderLabel('shadowIntensity');
  updateHomeSliderLabel('shadowDistance');

  // Text color
  document.getElementById('home-textColor-picker').value = slide.textColor || '#ffffff';

  // Update page header to show the slide title
  const slideIndex = homeData.slides.findIndex(s => s.id === id);
  document.getElementById('home-slide-edit-title').textContent =
    slide.title || `Slide ${slideIndex + 1}`;

  // Crop position controls removed (part of cropping feature backup)

  // Show view so container has real dimensions, then load images + update UI
  showView('home-slide-edit');

  requestAnimationFrame(() => {
    resetPreviewSize();
    applyCompositeLayout();
    loadHomeImages(slide);
    updateImageStatus();
    updateHomePreview();
    updateRatioLabel();
  });
}

// Load BG + FG into the preview — the container is always the user-set aspect ratio
function loadHomeImages(slide) {
  const bgSrc = slide.background ? '/' + slide.background : null;
  const fgSrc = slide.foreground ? '/' + slide.foreground : null;

  const bgPrev = document.getElementById('home-preview-bg');
  const fgPrev = document.getElementById('home-preview-fg');
  const seam   = document.getElementById('home-fg-seam');

  // Reset seam — will redraw when new FG loads
  if (seam) seam.style.display = 'none';

  // FG: wire onload before setting src so cached images are caught
  if (fgSrc) {
    fgPrev.onload = () => applyCompositeLayout();
    fgPrev.src = fgSrc;
    if (fgPrev.complete && fgPrev.naturalWidth > 0) applyCompositeLayout();
  }

  // BG: recompute composite layout once BG natural dimensions are known
  if (bgSrc) {
    bgPrev.onload  = () => applyCompositeLayout();
    bgPrev.onerror = () => console.warn('[CMS] BG failed to load:', bgSrc);
    bgPrev.src = bgSrc;
    if (bgPrev.complete && bgPrev.naturalWidth > 0) applyCompositeLayout();
  }
}

// For each column of the FG image, find the topmost opaque pixel and build
// an SVG path that traces that contour from left to right — so the line follows
// the actual silhouette top-edge of the FG subject rather than a straight line.
function updateFGSeam() {
  const fgImg    = document.getElementById('home-preview-fg');
  const container= document.getElementById('home-preview-container');
  const seam     = document.getElementById('home-fg-seam');
  const seamPath = document.getElementById('home-fg-seam-path');
  if (!fgImg || !container || !seam || !seamPath) return;

  if (!fgImg.naturalWidth || fgImg.src.startsWith('data:')) {
    seam.style.display = 'none';
    return;
  }

  try {
    const iw = fgImg.naturalWidth;
    const ih = fgImg.naturalHeight;
    const cw = container.offsetWidth  || container.getBoundingClientRect().width;
    const ch = container.offsetHeight || container.getBoundingClientRect().height;

    // Scan at the thumbnail's own pixel width for a smooth 1-point-per-pixel line
    const scanW = Math.min(iw, Math.round(cw) || 300);
    const scanH = Math.round(ih * scanW / iw);

    const canvas = document.createElement('canvas');
    canvas.width  = scanW;
    canvas.height = scanH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(fgImg, 0, 0, scanW, scanH);
    const { data } = ctx.getImageData(0, 0, scanW, scanH);

    // Per-column: find topmost row where alpha > threshold
    const threshold = 10;
    const topRow = new Int16Array(scanW).fill(-1);
    for (let x = 0; x < scanW; x++) {
      for (let y = 0; y < scanH; y++) {
        if (data[(y * scanW + x) * 4 + 3] > threshold) {
          topRow[x] = y;
          break;
        }
      }
    }

    // Map image-space coords → container CSS-space coords using the composite layout.
    // FG fills the full width of the composite wrap and is bottom-aligned within it.
    const { wrapL, wrapT, wrapW, wrapH } = _compositeLayout;
    const renderedW = wrapW;
    const renderedH = wrapW * ih / iw;
    const offX      = wrapL;
    const offY      = wrapT + wrapH - renderedH;

    // Build SVG path — M to start a segment, L to continue, gaps where column is fully transparent
    let d = '';
    let drawing = false;
    for (let x = 0; x < scanW; x++) {
      if (topRow[x] < 0) { drawing = false; continue; }
      const px = (offX + (x / scanW) * renderedW).toFixed(1);
      const py = (offY + (topRow[x] / scanH) * renderedH).toFixed(1);
      d += drawing ? `L${px} ${py} ` : `M${px} ${py} `;
      drawing = true;
    }

    seamPath.setAttribute('d', d);
    seam.style.display = d ? 'block' : 'none';

    // Respect visibility toggle
    const seamToggle = document.getElementById('toggle-seam');
    if (seamToggle && !seamToggle.checked) seam.style.display = 'none';

  } catch (e) {
    console.warn('[CMS] FG seam detection failed:', e);
    seam.style.display = 'none';
  }
}

// ==================== Text Color / CMYK ====================

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbToCmyk(r, g, b) {
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const k = 1 - Math.max(r1, g1, b1);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - r1 - k) / (1 - k) * 100),
    m: Math.round((1 - g1 - k) / (1 - k) * 100),
    y: Math.round((1 - b1 - k) / (1 - k) * 100),
    k: Math.round(k * 100),
  };
}

function cmykToRgb(c, m, y, k) {
  const k1 = k / 100;
  return {
    r: Math.round(255 * (1 - c / 100) * (1 - k1)),
    g: Math.round(255 * (1 - m / 100) * (1 - k1)),
    b: Math.round(255 * (1 - y / 100) * (1 - k1)),
  };
}

function onTextColorPickerChange() {
  updateHomePreview();
}

function updateHomeSliderLabel(name) {
  const slider = document.getElementById(`home-${name}-slider`);
  const label  = document.getElementById(`home-${name}-label`);
  if (!slider || !label) return;
  const val = parseFloat(slider.value);
  label.textContent = name === 'shadowDistance' ? `${val}px` : name === 'textLineHeight' ? `${val}` : `${val}%`;
}

// ==================== Text Formatting ====================

const _BTN_ACTIVE   = 'w-7 h-7 rounded border border-blue-400 bg-blue-50 text-blue-700 flex items-center justify-center text-sm leading-none';
const _BTN_INACTIVE = 'w-7 h-7 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-sm leading-none';

function updateFormatButtons() {
  const b = homeTextFormat;
  const q = id => document.getElementById(id);
  if (q('btn-text-bold'))     q('btn-text-bold').className     = (b.bold            ? _BTN_ACTIVE : _BTN_INACTIVE) + ' font-bold';
  if (q('btn-text-italic'))   q('btn-text-italic').className   = (b.italic          ? _BTN_ACTIVE : _BTN_INACTIVE) + ' italic';
  if (q('btn-align-left'))    q('btn-align-left').className    = (b.align==='left'   ? _BTN_ACTIVE : _BTN_INACTIVE);
  if (q('btn-align-center'))  q('btn-align-center').className  = (b.align==='center' ? _BTN_ACTIVE : _BTN_INACTIVE);
  if (q('btn-align-right'))   q('btn-align-right').className   = (b.align==='right'  ? _BTN_ACTIVE : _BTN_INACTIVE);
}

function toggleHomeFormat(type) {
  homeTextFormat[type] = !homeTextFormat[type];
  updateFormatButtons();
  updateHomePreview();
}

function setHomeAlign(align) {
  homeTextFormat.align = align;
  updateFormatButtons();
  updateHomePreview();
}

// Toggle visibility of seam/text overlays
function updatePreviewToggles() {
  const seamOn = document.getElementById('toggle-seam')?.checked ?? true;
  const textOn = document.getElementById('toggle-text')?.checked ?? true;

  // Seam: re-run calculation when turning on; force-hide when off
  if (seamOn) {
    updateFGSeam();
  } else {
    const seam = document.getElementById('home-fg-seam');
    if (seam) seam.style.display = 'none';
  }

  // Text
  const textEl = document.getElementById('home-preview-text');
  if (textEl) textEl.style.visibility = textOn ? 'visible' : 'hidden';
}

// ==================== Preview ====================

function updateHomePreview() {
  const slide = homeData.slides.find(s => s.id === currentSlideId);
  if (!slide) return;

  const text     = document.getElementById('home-text-input').value;
  const textSize = parseFloat(document.getElementById('home-textSize-slider').value);

  const container = document.getElementById('home-preview-container');
  const h = container.offsetHeight;

  // Text content + position + size
  const textEl = document.getElementById('home-preview-text');
  textEl.textContent    = text;
  textEl.style.left     = currentTextX + '%';
  textEl.style.top      = currentTextY + '%';
  textEl.style.fontSize   = (h * textSize / 100) + 'px';
  textEl.style.lineHeight = parseFloat(document.getElementById('home-textLineHeight-slider')?.value ?? 1.2);

  // Formatting
  textEl.style.fontWeight = homeTextFormat.bold   ? 'bold'   : 'normal';
  textEl.style.fontStyle  = homeTextFormat.italic ? 'italic' : 'normal';
  textEl.style.textAlign  = homeTextFormat.align;

  // Text shadow
  const shadowEnabled   = document.getElementById('toggle-shadow')?.checked ?? true;
  const shadowIntensity = parseFloat(document.getElementById('home-shadowIntensity-slider')?.value ?? 60) / 100;
  const shadowDistance  = parseFloat(document.getElementById('home-shadowDistance-slider')?.value  ?? 4);
  textEl.style.textShadow = (shadowEnabled && shadowIntensity > 0)
    ? `0 ${shadowDistance}px ${shadowDistance * 2}px rgba(0,0,0,${shadowIntensity.toFixed(2)})`
    : 'none';

  // Text color
  textEl.style.color = document.getElementById('home-textColor-picker')?.value ?? '#ffffff';

  // Apply text visibility toggle
  const textToggle = document.getElementById('toggle-text');
  textEl.style.visibility = (!textToggle || textToggle.checked) ? 'visible' : 'hidden';
}

// ==================== Padding controls ====================

// ==================== Crop position + composite layout ====================

// Cached layout used by updateFGSeam — avoids recomputing inside the seam function
let _compositeLayout = { wrapL: 0, wrapT: 0, wrapW: 0, wrapH: 0 };

/* updateCropLabel() removed - part of cropping feature backup (see git history) */

/**
 * Positions and sizes #home-composite-wrap so BG + FG move, scale,
 * and crop together (cover mode — composite always fills the container).
 *
 * The focal point (posX, posY) is placed at the container centre, clamped
 * so the composite never exposes the container background.
 *
 * Guide lines track where the focal point actually lands in the container:
 *   lineX = (wrapL + posX * wrapW) / cw
 * When the image has no overflow this equals posX (line is at the slider %).
 * As the crop gets heavier the clamp pulls the line toward 50 %.
 */
function applyCompositeLayout() {
  const bg   = document.getElementById('home-preview-bg');
  const wrap = document.getElementById('home-composite-wrap');
  const cont = document.getElementById('home-preview-container');
  if (!wrap || !cont) return;

  const cw = cont.offsetWidth;
  const ch = cont.offsetHeight;
  if (!cw || !ch) return;

  // Use BG's natural pixel dimensions; fall back to container AR if not yet loaded
  const bw = (bg && bg.naturalWidth)  || cw;
  const bh = (bg && bg.naturalHeight) || ch;
  const compositeAR = bw / bh;
  const containerAR = cw / ch;

  const posX = parseFloat(document.getElementById('home-cropX-slider')?.value ?? 50) / 100;
  const posY = parseFloat(document.getElementById('home-cropY-slider')?.value ?? 50) / 100;

  let wrapW, wrapH, wrapL, wrapT;

  // Cover — composite always fills the container.
  // Place posX% of the image at the horizontal centre; posY% at the vertical centre.
  // Clamp so the composite never exposes the container background.
  if (compositeAR > containerAR) {
    // Composite wider → fill height, pan horizontally
    wrapH = ch;   wrapW = ch * compositeAR;
    wrapT = 0;
    wrapL = Math.min(0, Math.max(-(wrapW - cw), cw / 2 - posX * wrapW));
  } else {
    // Composite taller → fill width, pan vertically
    wrapW = cw;   wrapH = cw / compositeAR;
    wrapL = 0;
    wrapT = Math.min(0, Math.max(-(wrapH - ch), ch / 2 - posY * wrapH));
  }

  wrap.style.width  = wrapW + 'px';
  wrap.style.height = wrapH + 'px';
  wrap.style.left   = wrapL + 'px';
  wrap.style.top    = wrapT + 'px';

  _compositeLayout = { wrapL, wrapT, wrapW, wrapH };

  // Move guide lines to wherever the focal point actually landed in the container.
  // No crop → line sits at posX% / posY%.  Heavy crop → line converges on 50%.
  const guideX = document.getElementById('crop-guide-x');
  const guideY = document.getElementById('crop-guide-y');
  if (guideX) guideX.style.left = ((wrapL + posX * wrapW) / cw * 100).toFixed(2) + '%';
  if (guideY) guideY.style.top  = ((wrapT + posY * wrapH) / ch * 100).toFixed(2) + '%';

  // Redraw the FG silhouette seam with the updated composite position
  updateFGSeam();
}

// ==================== Preview Resize (right + bottom handles) ====================

let _previewResizing    = null;   // 'right' | 'bottom' | null
let _previewResizeStart = {};
let canvasARLocked      = false;

function toggleCanvasARLock() {
  canvasARLocked = !canvasARLocked;
  const btn   = document.getElementById('canvas-ar-lock');
  const label = document.getElementById('canvas-ar-lock-label');
  const svgPath = canvasARLocked
    ? 'M7 11V7a5 5 0 0 1 10 0v4'   // closed shackle
    : 'M7 11V7a5 5 0 0 1 9.9-1';   // open shackle
  if (btn) {
    btn.querySelector('path').setAttribute('d', svgPath);
    btn.style.color = canvasARLocked ? '#6366f1' : '#9ca3af';
  }
  if (label) label.textContent = canvasARLocked ? 'locked' : 'free';
  // Capture current AR as the locked ratio
  if (canvasARLocked) {
    const frame = document.getElementById('home-preview-container');
    const wrap  = document.getElementById('preview-inner-wrap');
    if (frame && wrap) currentAspectRatio = wrap.offsetWidth / frame.offsetHeight;
  }
}

function startPreviewResize(edge, e) {
  if (simulatedDeviceWidth !== null) return;   // locked in preset / custom-dim mode

  const wrap  = document.getElementById('preview-inner-wrap');
  const frame = document.getElementById('home-preview-container');
  if (!wrap || !frame) return;

  // Freeze explicit px height on the frame so width and height become independent
  const currentH = frame.offsetHeight;
  const currentW = wrap.offsetWidth;
  frame.style.aspectRatio = '';
  frame.style.height      = currentH + 'px';
  currentAspectRatio      = currentW / currentH;

  wrap.style.width = currentW + 'px';   // pin width too so drag delta is stable
  _previewResizeStart = { x: e.clientX, y: e.clientY, w: currentW, h: currentH };
  _previewResizing = edge;
  e.preventDefault();
}

function initPreviewResize() {
  document.addEventListener('mousemove', e => {
    if (!_previewResizing) return;

    const wrap  = document.getElementById('preview-inner-wrap');
    const frame = document.getElementById('home-preview-container');
    const area  = document.getElementById('preview-resize-area');
    if (!wrap || !frame || !area) return;

    const maxW = area.offsetWidth;

    const areaBottom = area.getBoundingClientRect().bottom;
    const frameTop   = frame.getBoundingClientRect().top;
    const maxH       = Math.max(60, Math.floor(areaBottom - frameTop));

    if (_previewResizing === 'right') {
      let newW = Math.max(320, Math.min(maxW, _previewResizeStart.w + (e.clientX - _previewResizeStart.x)));
      // Enforce 4:1 max landscape AR when in free mode (no simulated device)
      if (simulatedDeviceWidth === null) {
        newW = Math.min(newW, Math.round(frame.offsetHeight * FREE_MAX_LANDSCAPE_AR));
      }
      wrap.style.width = newW + 'px';
      if (canvasARLocked) {
        // Keep AR: height follows width
        const lockedAR = _previewResizeStart.w / _previewResizeStart.h;
        frame.style.height = Math.max(60, Math.min(maxH, Math.round(newW / lockedAR))) + 'px';
      }
      // Unlocked: height stays fixed (already pinned in startPreviewResize)
      updatePreviewShellLayout();

    } else {
      // Bottom handle — clamped so canvas never extends past resize-area boundary
      let newH = Math.min(maxH, Math.max(60, _previewResizeStart.h + (e.clientY - _previewResizeStart.y)));
      // Enforce 4:1 max landscape AR in free mode: height must be >= width/4
      if (simulatedDeviceWidth === null) {
        newH = Math.max(newH, Math.ceil(wrap.offsetWidth / FREE_MAX_LANDSCAPE_AR));
      }
      frame.style.height = newH + 'px';
      if (canvasARLocked) {
        // Keep AR: width follows height
        const lockedAR = _previewResizeStart.w / _previewResizeStart.h;
        const newW = Math.max(320, Math.min(maxW, Math.round(newH * lockedAR)));
        wrap.style.width = newW + 'px';
        updatePreviewShellLayout();
      }
      // Unlocked: width stays fixed
    }

    currentAspectRatio = wrap.offsetWidth / frame.offsetHeight;
    updateRatioLabel();
    applyCompositeLayout();
  });

  document.addEventListener('mouseup', () => { _previewResizing = null; });

  window.addEventListener('resize', () => {
    if (simulatedDeviceWidth !== null && simulatedDeviceHeight !== null) {
      applyPreviewScale();
    } else {
      const wrap = document.getElementById('preview-inner-wrap');
      if (wrap && wrap.style.width && !wrap.style.width.endsWith('%')) {
        const area = document.getElementById('preview-resize-area');
        if (area && parseInt(wrap.style.width) > area.offsetWidth) {
          wrap.style.width = '100%';
        }
      }
    }
    updateRatioLabel();
  });
}

// ==================== Text Drag ====================

function initTextDrag() {
  let _dragging = false;
  let _dragStart = {};

  document.addEventListener('mousedown', (e) => {
    const textEl = document.getElementById('home-preview-text');
    const container = document.getElementById('home-preview-container');
    if (!textEl || !container) return;
    if (!textEl.contains(e.target)) return;
    // Only drag when toggle-text is on
    const toggle = document.getElementById('toggle-text');
    if (toggle && !toggle.checked) return;

    e.preventDefault();
    e.stopPropagation();
    _dragging = true;
    const rect = container.getBoundingClientRect();
    _dragStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentTextX,
      startY: currentTextY,
      cw: rect.width,
      ch: rect.height
    };
    textEl.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!_dragging) return;
    const dx = e.clientX - _dragStart.mouseX;
    const dy = e.clientY - _dragStart.mouseY;
    currentTextX = Math.max(0, Math.min(100, _dragStart.startX + (dx / _dragStart.cw) * 100));
    currentTextY = Math.max(0, Math.min(100, _dragStart.startY + (dy / _dragStart.ch) * 100));
    const textEl = document.getElementById('home-preview-text');
    if (textEl) {
      textEl.style.left = currentTextX + '%';
      textEl.style.top  = currentTextY + '%';
    }
  });

  document.addEventListener('mouseup', () => {
    if (_dragging) {
      _dragging = false;
      const textEl = document.getElementById('home-preview-text');
      if (textEl) textEl.style.cursor = 'grab';
    }
  });
}

function resetPreviewSize() {
  simulatedDeviceWidth       = null;
  simulatedDeviceHeight      = null;
  simulatedDeviceBase        = null;
  simulatedDeviceOrientation = 'portrait';
  currentAspectRatio         = 3 / 2;
  activeCategory             = null;
  const wrap  = document.getElementById('preview-inner-wrap');
  const frame = document.getElementById('home-preview-container');
  const shell = document.getElementById('preview-website-shell');
  if (wrap)  { wrap.style.width = '100%'; wrap.style.height = ''; wrap.style.transform = ''; wrap.style.transformOrigin = ''; wrap.style.marginLeft = ''; }
  if (frame) { frame.style.height = ''; frame.style.aspectRatio = '3/2'; }
  if (shell) { shell.style.height = ''; shell.style.overflow = 'hidden'; }
  const orientBtn = document.getElementById('btn-orientation');
  if (orientBtn) orientBtn.style.display = 'none';
  _updateCategoryBtns();
  _hidePanels();
  ['free-w','free-h','free-ar-w','free-ar-h'].forEach(id => { const el = document.getElementById(id); if (el) { el.value = ''; el.disabled = false; } });
  freeARLocked = false;  freeResLocked = false;
  _updateFreeLockUI();
  requestAnimationFrame(() => { updatePreviewShellLayout(); updateRatioLabel(); applyCompositeLayout(); });
}

// ==================== Category tabs + Free-mode inputs ====================

const _SVG_LOCK_CLOSED = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const _SVG_LOCK_OPEN   = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';

let freeARLocked  = false;
let freeResLocked = false;

function _gcd(a, b) { return b === 0 ? a : _gcd(b, a % b); }

function _updateCategoryBtns() {
  ['phone','tablet','monitor','free'].forEach(cat => {
    const btn = document.getElementById('cat-' + cat);
    if (!btn) return;
    const active = activeCategory === cat;
    btn.classList.toggle('bg-indigo-600',        active);
    btn.classList.toggle('text-white',           active);
    btn.classList.toggle('hover:bg-indigo-700',  active);
    btn.classList.toggle('bg-gray-100',          !active);
    btn.classList.toggle('text-gray-600',        !active);
    btn.classList.toggle('hover:bg-gray-200',    !active);
  });
}

function _hidePanels() {
  ['panel-device','panel-free'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function _showDevicePanel(category) {
  const sel = document.getElementById('device-model-select');
  if (!sel) return;
  sel.innerHTML = '';
  (DEVICE_CATEGORIES[category] || []).forEach(w => {
    const opt = document.createElement('option');
    opt.value       = w;
    opt.textContent = DEVICES[w].name;
    sel.appendChild(opt);
  });
  const panel = document.getElementById('panel-device');
  if (panel) panel.style.display = '';
}

function _updateDeviceInfoDisplay() {
  // Live bar is now driven by updateRatioLabel(); nothing extra needed here.
  updateRatioLabel();
}

function selectCategory(cat) {
  activeCategory = cat;
  _updateCategoryBtns();
  _hidePanels();

  if (cat === 'free') {
    const fp = document.getElementById('panel-free');
    if (fp) fp.style.display = '';
    const orientBtn = document.getElementById('btn-orientation');
    if (orientBtn) orientBtn.style.display = 'none';
    setDevicePreset(null);
  } else {
    _showDevicePanel(cat);
    const sel = document.getElementById('device-model-select');
    if (sel && sel.options.length > 0) {
      sel.selectedIndex = 0;
      setDevicePreset(parseInt(sel.value));
    }
  }
}

function onDeviceModelChange() {
  const sel = document.getElementById('device-model-select');
  if (!sel) return;
  const w = parseInt(sel.value);
  if (w) setDevicePreset(w);
}

function _updateFreeLockUI() {
  const arDisabled  = freeARLocked || freeResLocked;
  const resDisabled = freeResLocked;
  ['free-ar-w','free-ar-h'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = arDisabled; });
  ['free-w','free-h'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = resDisabled; });

  const arLock  = document.getElementById('free-ar-lock');
  const resLock = document.getElementById('free-res-lock');
  if (arLock) {
    arLock.innerHTML   = freeARLocked ? _SVG_LOCK_CLOSED : _SVG_LOCK_OPEN;
    arLock.style.color = freeARLocked ? '#6366f1' : '#9ca3af';
    arLock.title       = freeARLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio';
  }
  if (resLock) {
    resLock.innerHTML   = freeResLocked ? _SVG_LOCK_CLOSED : _SVG_LOCK_OPEN;
    resLock.style.color = freeResLocked ? '#6366f1' : '#9ca3af';
    resLock.title       = freeResLocked ? 'Unlock resolution' : 'Lock resolution';
  }
}

function toggleFreeARLock()  { freeARLocked  = !freeARLocked;  _updateFreeLockUI(); }
function toggleFreeResLock() { freeResLocked = !freeResLocked; _updateFreeLockUI(); }

function _syncFreeARFromWH() {
  if (freeARLocked) return;
  const w = parseInt(document.getElementById('free-w').value);
  const h = parseInt(document.getElementById('free-h').value);
  if (w > 0 && h > 0) {
    const g = _gcd(w, h);
    document.getElementById('free-ar-w').value = w / g;
    document.getElementById('free-ar-h').value = h / g;
  }
}

function _applyFreeCustomDims() {
  const w = parseInt(document.getElementById('free-w').value);
  const h = parseInt(document.getElementById('free-h').value);
  const wrap  = document.getElementById('preview-inner-wrap');
  const shell = document.getElementById('preview-website-shell');
  if (w > 0 && h > 0) {
    simulatedDeviceWidth  = w;
    simulatedDeviceHeight = h;
    updatePreviewShellLayout();
    requestAnimationFrame(() => { applyPreviewScale(); updateRatioLabel(); applyCompositeLayout(); });
  } else if (!(w > 0) && !(h > 0)) {
    simulatedDeviceWidth  = null;
    simulatedDeviceHeight = null;
    if (wrap)  { wrap.style.transform = ''; wrap.style.transformOrigin = ''; wrap.style.marginLeft = ''; wrap.style.width = '100%'; wrap.style.height = ''; }
    if (shell) { shell.style.height = ''; shell.style.overflow = 'hidden'; }
    updatePreviewShellLayout();
    requestAnimationFrame(() => { updateRatioLabel(); applyCompositeLayout(); });
  }
}

const FREE_MAX_LANDSCAPE_AR = 4; // hard cap: never wider than 4:1

function onFreeWChange() {
  if (freeResLocked) return;
  const w = parseInt(document.getElementById('free-w').value);
  if (freeARLocked) {
    const arW = parseInt(document.getElementById('free-ar-w').value) || 16;
    const arH = parseInt(document.getElementById('free-ar-h').value) || 9;
    if (w > 0) document.getElementById('free-h').value = Math.round(w * arH / arW);
  }
  // Enforce 4:1 max: if new width makes ratio too wide, push height up
  const h = parseInt(document.getElementById('free-h').value);
  if (w > 0 && h > 0 && w / h > FREE_MAX_LANDSCAPE_AR) {
    document.getElementById('free-h').value = Math.ceil(w / FREE_MAX_LANDSCAPE_AR);
  }
  _syncFreeARFromWH();
  _applyFreeCustomDims();
}

function onFreeHChange() {
  if (freeResLocked) return;
  const h = parseInt(document.getElementById('free-h').value);
  if (freeARLocked) {
    const arW = parseInt(document.getElementById('free-ar-w').value) || 16;
    const arH = parseInt(document.getElementById('free-ar-h').value) || 9;
    if (h > 0) document.getElementById('free-w').value = Math.round(h * arW / arH);
  }
  // Enforce 4:1 max: if new height makes ratio too wide, cap width
  const w = parseInt(document.getElementById('free-w').value);
  if (w > 0 && h > 0 && w / h > FREE_MAX_LANDSCAPE_AR) {
    document.getElementById('free-w').value = Math.floor(h * FREE_MAX_LANDSCAPE_AR);
  }
  _syncFreeARFromWH();
  _applyFreeCustomDims();
}

function onFreeARChange() {
  if (freeARLocked || freeResLocked) return;
  let arW = parseInt(document.getElementById('free-ar-w').value);
  const arH = parseInt(document.getElementById('free-ar-h').value);
  if (arW > 0 && arH > 0) {
    // Enforce 4:1 max on the AR inputs themselves
    if (arW / arH > FREE_MAX_LANDSCAPE_AR) {
      arW = FREE_MAX_LANDSCAPE_AR * arH;
      document.getElementById('free-ar-w').value = arW;
    }
    const w = parseInt(document.getElementById('free-w').value);
    if (w > 0) {
      document.getElementById('free-h').value = Math.round(w * arH / arW);
      _applyFreeCustomDims();
    }
  }
}

// ==================== Device Presets ====================

/**
 * Match the canvas (home-preview-container) aspect ratio to the currently
 * simulated device dimensions so the image fills the device screen completely.
 * Only called for real device presets (phone / tablet / monitor), NOT for
 * free mode or manual drag-handle resizing.
 */
function _syncCanvasToDevice() {
  const frame = document.getElementById('home-preview-container');
  if (!frame || !simulatedDeviceWidth || !simulatedDeviceHeight) return;
  frame.style.height      = '';
  frame.style.aspectRatio = simulatedDeviceWidth + '/' + simulatedDeviceHeight;
  currentAspectRatio      = simulatedDeviceWidth / simulatedDeviceHeight;
}

function setDevicePreset(width) {
  simulatedDeviceBase        = width;
  simulatedDeviceWidth       = width;
  simulatedDeviceOrientation = 'portrait';

  const device    = width ? DEVICES[width] : null;
  const orientBtn = document.getElementById('btn-orientation');
  if (orientBtn) {
    const show = device && device.category !== 'monitor';
    orientBtn.style.display = show ? '' : 'none';
    orientBtn.textContent   = 'Portrait';
    orientBtn.title         = 'Switch to landscape';
  }

  const wrap  = document.getElementById('preview-inner-wrap');
  const shell = document.getElementById('preview-website-shell');
  if (!wrap) return;

  if (width === null) {
    simulatedDeviceHeight = null;
    simulatedDeviceWidth  = null;
    wrap.style.width           = '100%';
    wrap.style.height          = '';
    wrap.style.transform       = '';
    wrap.style.transformOrigin = '';
    wrap.style.marginLeft      = '';
    if (shell) { shell.style.height = ''; shell.style.overflow = 'hidden'; }
    updatePreviewShellLayout();
    requestAnimationFrame(() => { _applyFreeCustomDims(); updateRatioLabel(); applyCompositeLayout(); });
  } else {
    simulatedDeviceHeight = device ? device.h : null;
    _syncCanvasToDevice();
    updatePreviewShellLayout();
    requestAnimationFrame(() => {
      applyPreviewScale();
      _updateDeviceInfoDisplay();
      updateRatioLabel();
      applyCompositeLayout();
    });
  }
}

function toggleDeviceOrientation() {
  if (!simulatedDeviceBase) return;
  const device = DEVICES[simulatedDeviceBase];
  if (!device || device.category === 'monitor') return;

  simulatedDeviceOrientation = simulatedDeviceOrientation === 'portrait' ? 'landscape' : 'portrait';
  const isPortrait = simulatedDeviceOrientation === 'portrait';

  if (isPortrait) {
    simulatedDeviceWidth  = simulatedDeviceBase;
    simulatedDeviceHeight = device.h;
  } else {
    simulatedDeviceWidth  = device.h;
    simulatedDeviceHeight = simulatedDeviceBase;
  }

  const orientBtn = document.getElementById('btn-orientation');
  if (orientBtn) {
    orientBtn.textContent = isPortrait ? 'Portrait' : 'Landscape';
    orientBtn.title       = isPortrait ? 'Switch to landscape' : 'Switch to portrait';
  }

  _syncCanvasToDevice();
  updatePreviewShellLayout();
  requestAnimationFrame(() => {
    applyPreviewScale();
    _updateDeviceInfoDisplay();
    updateRatioLabel();
    applyCompositeLayout();
  });
}

function applyPreviewScale() {
  const wrap  = document.getElementById('preview-inner-wrap');
  const shell = document.getElementById('preview-website-shell');
  const area  = document.getElementById('preview-resize-area');
  if (!wrap || !area || simulatedDeviceWidth === null || simulatedDeviceHeight === null) return;

  // 1. Clip the website shell to the device's physical screen height
  //    (everything below the fold is hidden, just like on a real device)
  shell.style.height   = simulatedDeviceHeight + 'px';
  shell.style.overflow = 'hidden';

  // 2. Make the inner-wrap exactly the device screen size
  wrap.style.width  = simulatedDeviceWidth  + 'px';
  wrap.style.height = simulatedDeviceHeight + 'px';

  // 3. Reset transform so we get real offsetWidth for centering
  wrap.style.transform       = '';
  wrap.style.transformOrigin = '';
  wrap.style.marginLeft      = '';

  const availableW = area.offsetWidth  - 4;   // 4 px safety buffer
  const availableH = area.offsetHeight - 4;

  // 4. Scale the device screen rectangle to fit inside the green preview area
  //    (scaleW limits width, scaleH limits height — take the smaller one)
  const scale = Math.min(availableW / simulatedDeviceWidth,
                         availableH / simulatedDeviceHeight);

  wrap.style.transform       = `scale(${scale})`;
  wrap.style.transformOrigin = 'top left';
  wrap.style.marginLeft      = '0';
}

// Mirror the real website's 840px breakpoint in the preview shell
function updatePreviewShellLayout() {
  const shell = document.getElementById('preview-website-shell');
  if (!shell) return;
  const w = simulatedDeviceWidth ??
            (document.getElementById('preview-inner-wrap')?.offsetWidth ?? 9999);
  shell.setAttribute('data-layout', w <= 840 ? 'mobile' : 'desktop');
}

function _gcd(a, b) { return b === 0 ? a : _gcd(b, a % b); }

function updateRatioLabel() {
  // Ratio badge is based on the photo frame dimensions
  const frame = document.getElementById('home-preview-container');
  const label = document.getElementById('preview-ratio-label');
  if (!frame || !label) return;
  const w = Math.round(frame.offsetWidth);
  const h = Math.round(frame.offsetHeight);
  if (!w || !h) return;

  const ratio = w / h;
  const known = [[21,9],[16,9],[3,2],[4,3],[5,4],[1,1],[4,5],[3,4],[2,3],[9,16],[9,21]];
  let ratioStr = null;
  for (const [rw, rh] of known) {
    if (Math.abs(ratio - rw / rh) < 0.025) { ratioStr = `${rw}:${rh}`; break; }
  }
  if (!ratioStr) {
    const g  = _gcd(w, h);
    const rw = w / g, rh = h / g;
    ratioStr = (rw <= 24 && rh <= 24) ? `${rw}:${rh}` : `${ratio.toFixed(2)}:1`;
  }
  label.textContent = ratioStr;

  // ── Universal live canvas info bar ──────────────────────────────────────────
  // For device presets use the simulated pixel dimensions; otherwise use the
  // actual CSS canvas dimensions (free / default mode).
  const dispW = simulatedDeviceWidth  || w;
  const dispH = simulatedDeviceHeight || h;
  const g2    = _gcd(dispW, dispH);
  const arW2  = dispW / g2, arH2 = dispH / g2;
  const arStr = (arW2 <= 99 && arH2 <= 99) ? `${arW2}:${arH2}` : `${(dispW / dispH).toFixed(2)}:1`;

  const liveAR  = document.getElementById('canvas-ar-live');
  const liveRes = document.getElementById('canvas-res-live');
  if (liveAR)  liveAR.textContent  = arStr;
  if (liveRes) liveRes.textContent = `${dispW} × ${dispH}`;

  // ── Sync free-panel inputs from canvas when no simulated device is active ──
  if (activeCategory === 'free' && !simulatedDeviceWidth) {
    const elArW = document.getElementById('free-ar-w');
    const elArH = document.getElementById('free-ar-h');
    const elW   = document.getElementById('free-w');
    const elH   = document.getElementById('free-h');
    if (elArW && !elArW.matches(':focus')) elArW.value = (arW2 <= 99) ? arW2 : (dispW/dispH).toFixed(2);
    if (elArH && !elArH.matches(':focus')) elArH.value = (arH2 <= 99) ? arH2 : 1;
    if (elW   && !elW.matches(':focus'))   elW.value   = dispW;
    if (elH   && !elH.matches(':focus'))   elH.value   = dispH;
  }
}

// ── Error modal ──────────────────────────────────────────────────────────────
function showErrorModal(message) {
  const modal = document.getElementById('error-modal');
  document.getElementById('error-modal-message').textContent = message;
  modal.style.display = 'flex';
}

function closeErrorModal() {
  document.getElementById('error-modal').style.display = 'none';
}

// Helper: resolve an image file to its natural dimensions
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

async function uploadHomeImage(type, event) {
  const file = event.target.files[0];
  if (!file || !currentSlideId) return;

  // ── Client-side validations ───────────────────────────────────────────────
  const slide = homeData.slides.find(s => s.id === currentSlideId);

  if (type === 'foreground') {
    // 1. FG requires a BG to already exist
    if (!slide || !slide.background) {
      showErrorModal('you need to upload a background image first');
      event.target.value = '';
      return;
    }
    // 3. FG must be .png
    if (file.type !== 'image/png') {
      showErrorModal('foreground image need to be a .png');
      event.target.value = '';
      return;
    }
    // 4. FG width must match BG width
    try {
      const fgDims = await getImageDimensions(file);
      // Load BG to get its width
      const bgDims = await new Promise((resolve, reject) => {
        const bgImg = new Image();
        bgImg.onload  = () => resolve({ w: bgImg.naturalWidth });
        bgImg.onerror = reject;
        bgImg.src = slide.background;
      });
      if (fgDims.w !== bgDims.w) {
        showErrorModal('the foreground image need to match the background image width');
        event.target.value = '';
        return;
      }
    } catch {
      // If we can't compare, proceed and let server validate
    }
  }

  if (type === 'background') {
    // 2. BG must be .jpg
    if (!file.type.match(/^image\/jpe?g$/)) {
      showErrorModal('background image need to be a .jpg');
      event.target.value = '';
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const optimize = document.getElementById('home-optimize-checkbox').checked;
  const formData = new FormData();
  formData.append('image', file);
  formData.append('optimize', optimize.toString());

  showLoading(`Uploading ${type} image...`);
  try {
    const res = await fetch(`/api/home/slides/${currentSlideId}/${type}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    const result = await res.json();

    // Update local slide data then reload all images
    if (slide) {
      slide[type] = result.image;
      loadHomeImages(slide);
    }

    updateImageStatus();
    updateHomePreview();
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`, 'success');
    checkGitStatus();
  } catch (err) {
    showToast(err.message || `Failed to upload ${type} image`, 'error');
  }
  hideLoading();
  event.target.value = '';
}

async function removeHomeImage(type) {
  const slide = homeData.slides.find(s => s.id === currentSlideId);
  if (!slide) return;

  // Show confirmation
  if (!confirm(`Remove ${type} image?`)) return;

  showLoading(`Removing ${type} image...`);
  try {
    const res = await fetch(`/api/home/slides/${currentSlideId}/${type}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Delete failed');
    }

    // Update local slide data
    slide[type] = null;
    loadHomeImages(slide);
    updateImageStatus();
    updateHomePreview();
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} removed!`, 'success');
    checkGitStatus();
  } catch (err) {
    showToast(err.message || `Failed to remove ${type} image`, 'error');
  }
  hideLoading();
}

function updateImageStatus() {
  const slide = homeData.slides.find(s => s.id === currentSlideId);
  if (!slide) return;

  // Show/hide FG remove button based on whether foreground exists
  const fgRemoveBtn = document.getElementById('home-fg-remove-btn');
  if (slide.foreground) {
    fgRemoveBtn.classList.remove('hidden');
  } else {
    fgRemoveBtn.classList.add('hidden');
  }
}

async function saveHomeSlide() {
  const slide = homeData.slides.find(s => s.id === currentSlideId);
  if (!slide) return;

  slide.title           = document.getElementById('home-title-input').value || 'Slide 1';
  slide.text            = document.getElementById('home-text-input').value;
  slide.textX           = currentTextX;
  slide.textY           = currentTextY;
  slide.textSize        = parseFloat(document.getElementById('home-textSize-slider').value);
  slide.textLineHeight  = parseFloat(document.getElementById('home-textLineHeight-slider').value);
  slide.textBold        = homeTextFormat.bold;
  slide.textItalic      = homeTextFormat.italic;
  slide.textAlign       = homeTextFormat.align;
  slide.shadowEnabled   = document.getElementById('toggle-shadow').checked;
  slide.shadowIntensity = parseFloat(document.getElementById('home-shadowIntensity-slider').value);
  slide.shadowDistance  = parseFloat(document.getElementById('home-shadowDistance-slider').value);
  slide.textColor       = document.getElementById('home-textColor-picker').value;

  // Crop position fields removed (part of cropping feature backup)

  showLoading('Saving...');
  try {
    const res = await fetch('/api/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: homeData.slides })
    });
    if (!res.ok) throw new Error('Failed to save');
    renderHomeList();
    showToast('Slide saved!', 'success');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to save slide', 'error');
  }
  hideLoading();
}

async function deleteHomeSlide() {
  if (!currentSlideId) return;
  if (!confirm('Delete this slide?')) return;

  showLoading('Deleting...');
  try {
    // Find the slide to get its background image
    const slideToDelete = homeData.slides.find(s => s.id === currentSlideId);
    const backgroundImage = slideToDelete ? slideToDelete.background : null;

    const res = await fetch(`/api/home/slides/${currentSlideId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    homeData.slides = homeData.slides.filter(s => s.id !== currentSlideId);

    // Sync: uncheck homepage for the corresponding photo
    if (backgroundImage) {
      for (let series of seriesData) {
        for (let photo of series.photos) {
          if (photo.image === backgroundImage) {
            photo.homepage = false;
          }
        }
      }

      // Save all series changes
      await Promise.all(seriesData.map(series =>
        fetch(`/api/series/${series.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: series.photos })
        })
      ));
    }

    currentSlideId = null;
    renderHomeList();
    showToast('Slide deleted and synced with photos', 'success');
    showView('home');
    checkGitStatus();
  } catch (err) {
    showToast('Failed to delete slide', 'error');
  }
  hideLoading();
}

// Handle Enter key in create series modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const modal = document.getElementById('create-series-modal');
    if (!modal.classList.contains('hidden')) {
      createSeries();
    }
  }
  
  if (e.key === 'Escape') {
    hideCreateSeriesModal();
    hidePhotoEditModal();
  }
});
