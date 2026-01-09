// Biagio Photography CMS - Frontend Application

// ==================== State ====================
let seriesData = [];
let aboutData = {};
let currentSeriesId = null;
let currentPhotoIndex = null;
let seriesDescriptionEditor = null;
let aboutContentEditor = null;
let seriesSortable = null;
let photosSortable = null;

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
  initEditors();
  initDragDrop();
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
    const [seriesRes, aboutRes] = await Promise.all([
      fetch('/api/series'),
      fetch('/api/about')
    ]);
    
    seriesData = await seriesRes.json();
    aboutData = await aboutRes.json();
    
    renderSeriesList();
    renderAboutPage();
  } catch (err) {
    showToast('Failed to load data', 'error');
    console.error(err);
  }
  hideLoading();
}

// ==================== View Management ====================

function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === viewName) {
      btn.classList.add('active');
    }
  });
  
  // Show selected view
  if (viewName === 'series-list') {
    document.getElementById('series-list-view').classList.remove('hidden');
  } else if (viewName === 'series-edit') {
    document.getElementById('series-edit-view').classList.remove('hidden');
  } else if (viewName === 'about') {
    document.getElementById('about-view').classList.remove('hidden');
  }
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
        <span class="photo-card-meta">${escapeHtml(photo.metadata || 'No metadata')}</span>
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

function openPhotoEdit(index) {
  const series = seriesData.find(s => s.id === currentSeriesId);
  if (!series || !series.photos[index]) return;
  
  currentPhotoIndex = index;
  const photo = series.photos[index];
  
  document.getElementById('photo-edit-preview').src = '/' + photo.image;
  document.getElementById('photo-metadata-input').value = photo.metadata || '';
  
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
  
  const metadata = document.getElementById('photo-metadata-input').value.trim();
  
  series.photos[currentPhotoIndex].metadata = metadata;
  
  showLoading('Saving...');
  try {
    await fetch(`/api/series/${currentSeriesId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: series.photos })
    });
    
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
