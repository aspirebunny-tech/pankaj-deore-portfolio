// ==========================================================================
// PANKAJ DEORE — ARTSTATION PORTFOLIO & STUDIO ADMIN CONSOLE
// ==========================================================================

// Global State
let artworks = [];
let currentCategory = 'featured';
let currentSearch = '';
let activeArtworks = [];
let currentModalIndex = 0;
let showHiddenArtworks = false;

// Drag & Drop State
let draggedArtId = null;

// Default Admin Credentials (can be updated in localStorage)
const DEFAULT_ADMIN = {
  user: 'pankaj',
  pass: 'pankaj123'
};

const STORAGE_KEY_ARTWORKS = 'pankaj_portfolio_artworks_v22';
const STORAGE_KEY_DELETED = 'pankaj_portfolio_deleted_ids_v2';
const STORAGE_KEY_AUTH = 'pankaj_admin_credentials_v1';
const STORAGE_KEY_PROFILE = 'pankaj_portfolio_profile_v1';
const SESSION_KEY_LOGGED_IN = 'pankaj_admin_session';

// Real Artist Profile & Contact Details
const DEFAULT_PROFILE = {
  email: 'pankajfreelancer09@gmail.com',
  phone: '+91 91759 28323',
  whatsapp: '919175928323',
  linkedin: 'https://www.linkedin.com',
  artstation: 'https://www.artstation.com',
  instagram: '',
  bio: 'Professional 2D Concept Artist and Comic Book Illustrator based in Nashik, Maharashtra. Specialized in expressive character design, dynamic comic layouts, line art inking, and visual worldbuilding. Experienced across digital illustration, comic sequences, and IP development.'
};

// Category mapping
const CATEGORY_NAMES = {
  'featured': 'Curated Highlights',
  'character-design': 'Character Design',
  'concept-art': 'Concept Art',
  'comic-cover-art': 'Comic Cover Art',
  'comic-page-process': 'Comic Page Process',
  'comic-sequence-art': 'Comic Sequence Art',
  'commission-work': 'Commission Work',
  'personal-series': 'Personal Series',
  'pratilipi': 'Pratilipi Projects',
  'video': 'Videos & Animation'
};

window.LOCAL_MEDIA_BLOBS = window.LOCAL_MEDIA_BLOBS || {};

// Category folders mapping
const CATEGORY_FOLDERS = {
  'character-design': 'charecter design',
  'concept-art': 'concept art',
  'comic-cover-art': 'comic cover art',
  'comic-page-process': 'comic page process',
  'comic-sequence-art': 'comic sequence art',
  'commission-work': 'commision work',
  'personal-series': 'peronal series',
  'pratilipi': 'pratilipi',
  'video': 'video',
  'featured': 'concept art'
};

// Relative image path helper - loads web-optimized fast images
function getArtworkUrl(src) {
  if (!src) return '';
  if (window.LOCAL_MEDIA_BLOBS && window.LOCAL_MEDIA_BLOBS[src]) {
    return window.LOCAL_MEDIA_BLOBS[src];
  }
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  // Automatic web-optimized JPG path from gallery-optimized/
  let webSrc = src.replace(/\.(png|jpg|jpeg|heic|webp)$/i, '.jpg');
  return encodeURI('./gallery-optimized/' + webSrc);
}

// Fallback to original full-resolution media if needed
function getFullArtworkUrl(src) {
  if (!src) return '';
  if (window.LOCAL_MEDIA_BLOBS && window.LOCAL_MEDIA_BLOBS[src]) {
    return window.LOCAL_MEDIA_BLOBS[src];
  }
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return encodeURI('./' + src);
}

function getSpanSizeName(cols, rows) {
  if (cols === 2 && rows === 2) return 'hero';
  if (cols === 2 && rows === 1) return 'wide';
  if (cols === 1 && rows === 2) return 'tall';
  if (cols === 1 && rows === 1) return 'normal';
  return `${cols}x${rows}`;
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadArtworks();
  initAdminState();
  renderProfile();
  updateCategoryCounts();
  handleUrlHash();
  setupEventListeners();
  setupRadioSyncListeners();
  renderGallery();
  initPdfModal();
  initVisitorTracking();
});

// Load artworks from localStorage or fallback to ARTWORKS_DATA
function loadArtworks() {
  const deletedIds = (function() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]'); } catch(e) { return []; }
  })();

  const cached = localStorage.getItem(STORAGE_KEY_ARTWORKS);
  if (cached) {
    try {
      artworks = JSON.parse(cached);
      // Merge brand new artworks from master ARTWORKS_DATA unless explicitly deleted by user
      if (Array.isArray(ARTWORKS_DATA)) {
        ARTWORKS_DATA.forEach(masterItem => {
          const isDeleted = deletedIds.includes(masterItem.id);
          const alreadyExists = artworks.some(a => a.id === masterItem.id);
          if (!isDeleted && !alreadyExists) {
            artworks.unshift(masterItem);
          }
        });
      }
    } catch (e) {
      console.error('Error parsing stored artworks, resetting to default.', e);
      artworks = Array.isArray(ARTWORKS_DATA) ? [...ARTWORKS_DATA] : [];
    }
  } else {
    artworks = Array.isArray(ARTWORKS_DATA) ? [...ARTWORKS_DATA] : [];
  }

  // Filter out any permanently deleted artworks
  if (deletedIds.length > 0) {
    artworks = artworks.filter(a => !deletedIds.includes(a.id));
  }

  // Self-healing: repair any broken image file extensions without touching custom user layout/spans
  artworks.forEach(art => {
    if (art.filename && art.filename.toLowerCase().endsWith('.heic')) {
      art.filename = 'concept art.jpg';
      art.src = 'concept art/concept art.jpg';
    }
    if (art.filename && art.filename.toLowerCase().includes('hpscanner')) {
      art.filename = 'HPSCANNER0248.jpg';
      art.src = 'concept art/HPSCANNER0248.jpg';
    }
    if (art.src && art.src.startsWith('data:') && art.src.length > 5000) {
      const folder = CATEGORY_FOLDERS[art.category] || 'concept art';
      art.src = `${folder}/${art.filename || 'artwork.jpg'}`;
    }
  });

  // Ensure schema fields & layout dimensions exist on all artwork items
  let featuredCount = 0;
  artworks.forEach((art, idx) => {
    if (typeof art.featured === 'undefined') art.featured = false;
    if (typeof art.hidden === 'undefined') art.hidden = false;
    if (typeof art.story === 'undefined') art.story = '';
    if (typeof art.tools === 'undefined') art.tools = '';
    if (typeof art.client === 'undefined') art.client = '';
    if (typeof art.year === 'undefined') art.year = '';
    
    // Default initial showcase highlighting for an editorial ArtStation look
    if (typeof art.colSpan === 'undefined' || typeof art.rowSpan === 'undefined') {
      if (art.featured) {
        featuredCount++;
        if (featuredCount === 1 || featuredCount === 2) {
          art.colSpan = 2; art.rowSpan = 2; art.spanSize = 'hero';
        } else if (featuredCount === 4 || featuredCount === 10) {
          art.colSpan = 2; art.rowSpan = 1; art.spanSize = 'wide';
        } else if (featuredCount === 3 || featuredCount === 7) {
          art.colSpan = 1; art.rowSpan = 2; art.spanSize = 'tall';
        } else {
          art.colSpan = 1; art.rowSpan = 1; art.spanSize = 'normal';
        }
      } else {
        art.colSpan = 1; art.rowSpan = 1; art.spanSize = 'normal';
      }
    } else {
      if (!art.spanSize) {
        art.spanSize = getSpanSizeName(art.colSpan, art.rowSpan);
      }
    }
  });
}

function saveArtworksToStorage() {
  try {
    // Sanitize any accidental huge base64 strings so storage never overflows
    const cleanArtworks = artworks.map(art => {
      let src = art.src;
      if (src && src.startsWith('data:') && src.length > 20000) {
        const folder = CATEGORY_FOLDERS[art.category] || 'concept art';
        src = `${folder}/${art.filename || 'image.png'}`;
      }
      return { ...art, src: src };
    });
    localStorage.setItem(STORAGE_KEY_ARTWORKS, JSON.stringify(cleanArtworks));
  } catch (err) {
    console.warn('LocalStorage quota warning. Stripping base64 to preserve data:', err);
    try {
      const ultraClean = artworks.map(art => {
        let safeSrc = art.src;
        if (safeSrc && safeSrc.startsWith('data:')) {
          safeSrc = `${CATEGORY_FOLDERS[art.category] || 'concept art'}/${art.filename || 'image.png'}`;
        }
        return { ...art, src: safeSrc };
      });
      localStorage.setItem(STORAGE_KEY_ARTWORKS, JSON.stringify(ultraClean));
    } catch (err2) {
      console.error('Critical storage quota error:', err2);
    }
  }
  updateCategoryCounts();
  updateHiddenCountBadge();
}

// ==========================================================================
// AUTHENTICATION & ADMIN STATE
// ==========================================================================
function getAdminCredentials() {
  const stored = localStorage.getItem(STORAGE_KEY_AUTH);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_ADMIN;
    }
  }
  return DEFAULT_ADMIN;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY_LOGGED_IN) === 'true';
}

function initAdminState() {
  const loggedIn = isAdminLoggedIn();
  const toolbar = document.getElementById('admin-toolbar');
  const pillBtn = document.getElementById('admin-login-pill');
  const pillLabel = document.getElementById('admin-pill-label');
  const quickAdd = document.getElementById('admin-quick-add-wrap');

  if (toolbar) toolbar.style.display = loggedIn ? 'block' : 'none';
  if (quickAdd) quickAdd.style.display = loggedIn ? 'block' : 'none';
  
  if (pillBtn && pillLabel) {
    if (loggedIn) {
      pillBtn.classList.add('active');
      pillLabel.textContent = 'Studio Mode';
    } else {
      pillBtn.classList.remove('active');
      pillLabel.textContent = 'Admin';
    }
  }

  updateHiddenCountBadge();

  const sidePill = document.getElementById('admin-visitor-side-pill');
  if (sidePill) sidePill.style.display = loggedIn ? 'flex' : 'none';
  if (loggedIn) {
    updateVisitorDrawerUI();
  } else {
    closeVisitorDrawer();
  }
}

function openLoginModal() {
  if (isAdminLoggedIn()) {
    showToast('Admin mode already active! Top toolbar se portfolio manage karo.', 'info');
    return;
  }
  const modal = document.getElementById('admin-login-modal');
  const errorMsg = document.getElementById('login-error-msg');
  if (errorMsg) errorMsg.style.display = 'none';

  const userInput = document.getElementById('admin-user-input');
  if (userInput) userInput.value = '';

  const passInput = document.getElementById('admin-pass-input');
  if (passInput) passInput.value = '';

  if (modal) modal.classList.add('open');
  if (userInput) setTimeout(() => userInput.focus(), 150);
}

function closeLoginModal() {
  const modal = document.getElementById('admin-login-modal');
  if (modal) modal.classList.remove('open');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const userInput = (document.getElementById('admin-user-input').value || '').trim();
  const passInput = (document.getElementById('admin-pass-input').value || '').trim();
  const errorMsg = document.getElementById('login-error-msg');
  const creds = getAdminCredentials();

  const userMatch = userInput.toLowerCase() === (creds.user || '').toLowerCase();
  const passMatch = passInput === creds.pass || passInput.toLowerCase() === (creds.pass || '').toLowerCase();

  if (userMatch && passMatch) {
    sessionStorage.setItem(SESSION_KEY_LOGGED_IN, 'true');
    closeLoginModal();
    initAdminState();
    renderGallery();
    showToast('Welcome back, Pankaj! Studio Admin Mode activated.', 'success');
  } else {
    if (errorMsg) {
      errorMsg.textContent = 'Galat Username ya Password! Kripya sahi credentials dalein.';
      errorMsg.style.display = 'block';
    }
  }
}

function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY_LOGGED_IN);
  showHiddenArtworks = false;
  initAdminState();
  renderGallery();
  showToast('Logged out of Admin Console. Public view active.', 'info');
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function openPasswordChangeModal() {
  const modal = document.getElementById('change-password-modal');
  const err = document.getElementById('pwd-error-msg');
  if (err) err.style.display = 'none';
  if (modal) modal.classList.add('open');
}

function closePasswordChangeModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.classList.remove('open');
}

function handleChangePassword(e) {
  e.preventDefault();
  const curr = document.getElementById('current-pass-input').value;
  const next = document.getElementById('new-pass-input').value;
  const confirm = document.getElementById('confirm-pass-input').value;
  const err = document.getElementById('pwd-error-msg');
  const creds = getAdminCredentials();

  if (curr !== creds.pass) {
    err.textContent = 'Current password galat hai!';
    err.style.display = 'block';
    return;
  }
  if (next !== confirm) {
    err.textContent = 'New Password aur Confirm Password match nahi huye!';
    err.style.display = 'block';
    return;
  }

  creds.pass = next;
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(creds));
  closePasswordChangeModal();
  showToast('Admin password successfully updated!', 'success');
}

// ==========================================================================
// PROFILE & CONTACT DETAILS MANAGEMENT
// ==========================================================================
function getProfileData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (stored) return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
  } catch (e) {
    console.warn('Could not read stored profile:', e);
  }
  return { ...DEFAULT_PROFILE };
}

function renderProfile() {
  const prof = getProfileData();
  const bioEl = document.getElementById('footer-bio-text');
  if (bioEl && prof.bio) bioEl.textContent = prof.bio;

  const emailLink = document.getElementById('footer-email-link');
  const emailText = document.getElementById('footer-email-text');
  if (emailLink) {
    if (prof.email) {
      emailLink.href = `mailto:${prof.email}`;
      if (emailText) emailText.textContent = prof.email;
      emailLink.style.display = 'inline-flex';
    } else {
      emailLink.style.display = 'none';
    }
  }

  const phoneLink = document.getElementById('footer-phone-link');
  const phoneText = document.getElementById('footer-phone-text');
  if (phoneLink) {
    if (prof.phone) {
      const cleanDigits = prof.phone.replace(/[^0-9+]/g, '');
      phoneLink.href = `tel:${cleanDigits}`;
      if (phoneText) phoneText.textContent = prof.phone;
      phoneLink.style.display = 'inline-flex';
    } else {
      phoneLink.style.display = 'none';
    }
  }

  const waLink = document.getElementById('footer-whatsapp-link');
  if (waLink) {
    const waNum = (prof.whatsapp || prof.phone || '').replace(/[^0-9]/g, '');
    if (waNum) {
      waLink.href = `https://wa.me/${waNum}?text=Hi%20Pankaj,%20saw%20your%20art%20portfolio%20and%20wanted%20to%20connect!`;
      waLink.style.display = 'inline-flex';
    } else {
      waLink.style.display = 'none';
    }
  }

  const liLink = document.getElementById('footer-linkedin-link');
  if (liLink) {
    if (prof.linkedin) {
      liLink.href = prof.linkedin;
      liLink.style.display = 'inline-flex';
    } else {
      liLink.style.display = 'none';
    }
  }

  const asLink = document.getElementById('footer-artstation-link');
  if (asLink) {
    if (prof.artstation) {
      asLink.href = prof.artstation;
      asLink.style.display = 'inline-flex';
    } else {
      asLink.style.display = 'none';
    }
  }

  const igLink = document.getElementById('footer-instagram-link');
  if (igLink) {
    if (prof.instagram) {
      igLink.href = prof.instagram;
      igLink.style.display = 'inline-flex';
    } else {
      igLink.style.display = 'none';
    }
  }
}

function openProfileModal() {
  const prof = getProfileData();
  const emailIn = document.getElementById('profile-email-input');
  const phoneIn = document.getElementById('profile-phone-input');
  const liIn = document.getElementById('profile-linkedin-input');
  const asIn = document.getElementById('profile-artstation-input');
  const igIn = document.getElementById('profile-instagram-input');
  const bioIn = document.getElementById('profile-bio-input');

  if (emailIn) emailIn.value = prof.email || '';
  if (phoneIn) phoneIn.value = prof.phone || '';
  if (liIn) liIn.value = prof.linkedin || '';
  if (asIn) asIn.value = prof.artstation || '';
  if (igIn) igIn.value = prof.instagram || '';
  if (bioIn) bioIn.value = prof.bio || '';

  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('open');
}

function closeProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.remove('open');
}

function handleSaveProfile(e) {
  e.preventDefault();
  const email = (document.getElementById('profile-email-input')?.value || '').trim();
  const phone = (document.getElementById('profile-phone-input')?.value || '').trim();
  const linkedin = (document.getElementById('profile-linkedin-input')?.value || '').trim();
  const artstation = (document.getElementById('profile-artstation-input')?.value || '').trim();
  const instagram = (document.getElementById('profile-instagram-input')?.value || '').trim();
  const bio = (document.getElementById('profile-bio-input')?.value || '').trim();

  const profileData = {
    email,
    phone,
    whatsapp: phone.replace(/[^0-9]/g, ''),
    linkedin,
    artstation,
    instagram,
    bio
  };

  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profileData));
  renderProfile();
  closeProfileModal();
  showToast('Contact details and bio updated successfully!', 'success');
}

// ==========================================================================
// CATEGORIES & NAVIGATION
// ==========================================================================
function updateCategoryCounts() {
  const counts = { 'featured': 0 };
  
  artworks.forEach(art => {
    if (art.hidden && !isAdminLoggedIn()) return;
    if (art.featured) counts['featured']++;
    const cat = art.category;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const cat = btn.dataset.category;
    const countBadge = btn.querySelector('.tab-count');
    if (countBadge) {
      countBadge.textContent = counts[cat] || 0;
    }
  });
}

function updateHiddenCountBadge() {
  const hiddenCount = artworks.filter(a => a.hidden).length;
  const el = document.getElementById('hidden-count');
  if (el) el.textContent = hiddenCount;
  
  const toggleBtn = document.getElementById('toggle-hidden-btn');
  if (toggleBtn) {
    toggleBtn.style.color = showHiddenArtworks ? '#ff5555' : 'var(--text-main)';
  }
}

function toggleShowHiddenArtworks() {
  showHiddenArtworks = !showHiddenArtworks;
  updateHiddenCountBadge();
  renderGallery();
  showToast(showHiddenArtworks ? 'Showing hidden artworks (marked with red dash)' : 'Hiding deleted/hidden artworks', 'info');
}

function handleUrlHash() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'admin' || hash === 'login') {
    openLoginModal();
    return;
  }
  if (hash && (CATEGORY_NAMES[hash] || hash === 'featured')) {
    setCategory(hash, false);
  } else {
    setCategory('featured', false);
  }
}

function setCategory(catId, updateHash = true) {
  currentCategory = catId;
  
  if (updateHash) {
    window.location.hash = catId === 'featured' ? '' : catId;
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === catId);
  });

  const titleEl = document.getElementById('view-title');
  if (titleEl) {
    titleEl.textContent = CATEGORY_NAMES[catId] || 'Artworks';
  }

  renderGallery();
}

// ==========================================================================
// GALLERY RENDERING (Dense Editorial Grid + Drag & Drop + Edge Resizing)
// ==========================================================================
function filterArtworks() {
  const admin = isAdminLoggedIn();

  return artworks.filter(art => {
    if (art.hidden && (!admin || !showHiddenArtworks)) {
      return false;
    }

    const matchesCategory = (currentCategory === 'featured') 
      ? art.featured 
      : (art.category === currentCategory);

    const q = currentSearch.trim().toLowerCase();
    const matchesSearch = !q || 
      (art.title && art.title.toLowerCase().includes(q)) || 
      (art.category_name && art.category_name.toLowerCase().includes(q)) ||
      (art.filename && art.filename.toLowerCase().includes(q)) ||
      (art.story && art.story.toLowerCase().includes(q)) ||
      (art.client && art.client.toLowerCase().includes(q)) ||
      (art.tools && art.tools.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });
}

function renderGallery() {
  const grid = document.getElementById('art-grid');
  const countEl = document.getElementById('view-count');
  if (!grid) return;

  activeArtworks = filterArtworks();
  const admin = isAdminLoggedIn();

  if (countEl) {
    countEl.textContent = `Showing ${activeArtworks.length} of ${artworks.length} Artworks`;
  }

  if (activeArtworks.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-dim);">
        <i class="fa-solid fa-folder-open" style="font-size: 2.8rem; margin-bottom: 1rem; color: var(--primary);"></i>
        <p style="font-size: 1.15rem; color: var(--text-main); font-weight: 600;">Koi artwork match nahi hui.</p>
        <p style="font-size: 0.9rem; margin-top: 0.25rem;">Doosra category select karo ya search query clear karo.</p>
        ${admin ? `
          <button class="btn-primary" style="margin-top: 1.5rem;" onclick="openAddArtworkModal()">
            <i class="fa-solid fa-plus"></i> Is Category Me Artwork Add Karo
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = activeArtworks.map((art, index) => {
    const isVideo = art.isVideo;
    const mediaUrl = getArtworkUrl(art.src);
    const isFeatured = art.featured;
    const isHidden = art.hidden;
    
    const colSpan = Math.max(1, Math.min(4, art.colSpan || 1));
    const rowSpan = Math.max(1, Math.min(4, art.rowSpan || 1));
    const isHero = (colSpan >= 2 && rowSpan >= 2);
    const isCustomSize = (colSpan > 1 || rowSpan > 1);
    const isAboveTheFold = index < 6;

    return `
      <div class="art-card ${isHero ? 'span-hero' : ''} ${isHidden ? 'is-hidden' : ''}" 
           data-id="${art.id}" 
           data-index="${index}" 
           style="grid-column: span ${colSpan}; grid-row: span ${rowSpan};"
           draggable="${admin ? 'true' : 'false'}" 
           onclick="openModal(${index})">
        
        <!-- Admin Drag Handle (Top Left) -->
        ${admin ? `
          <div class="card-drag-handle" title="Drag karke kisi bhi image ke upar drop karo position change karne ke liye">
            <i class="fa-solid fa-grip-vertical"></i>
          </div>

          <!-- Interactive Resize Handles (Corner, Right edge, Bottom edge) -->
          <div class="card-resize-handle handle-e" data-dir="e" title="Right drag karo width (columns) badhane ke liye" onclick="event.stopPropagation()"></div>
          <div class="card-resize-handle handle-s" data-dir="s" title="Down drag karo height (rows) badhane ke liye" onclick="event.stopPropagation()"></div>
          <div class="card-resize-handle handle-se" data-dir="se" title="Corner drag karo dono dimensions resize karne ke liye" onclick="event.stopPropagation()"></div>
        ` : ''}

        <!-- Media Wrap -->
        <div class="media-container">
          ${isVideo ? `
            <video class="art-img" muted playsinline loop onmouseover="this.play()" onmouseout="this.pause()">
              <source src="${mediaUrl}" type="video/mp4">
            </video>
            <div class="video-badge"><i class="fa-solid fa-play"></i> Video</div>
          ` : `
            <img class="art-img" 
                 src="${mediaUrl}" 
                 alt="${escapeHtml(art.title)}" 
                 ${isAboveTheFold ? 'fetchpriority="high"' : 'loading="lazy"'}
                 decoding="async" 
                 onerror="this.onerror=null; this.src='${getFullArtworkUrl(art.src)}';" />
          `}

          <!-- Featured Star Indicator (Non-featured tabs) -->
          ${(isFeatured && currentCategory !== 'featured') ? `
            <div class="featured-pin-badge"><i class="fa-solid fa-star"></i> Featured</div>
          ` : ''}

          <!-- Size Highlight Badge Pill -->
          ${isCustomSize ? `
            <div class="size-badge-pill ${isHero ? 'hero' : (colSpan > rowSpan ? 'wide' : 'tall')}">
              ${isHero ? '<i class="fa-solid fa-crown"></i> Hero ' : ''}
              ${colSpan} × ${rowSpan}
            </div>
          ` : ''}

          <!-- Admin Quick Action Controls -->
          ${admin ? `
            <div class="card-admin-bar" onclick="event.stopPropagation()">
              <!-- Size Switcher Cycle Button -->
              <button class="card-admin-btn size ${isHero ? 'hero' : (colSpan > rowSpan ? 'wide' : 'tall')}" 
                      onclick="cycleArtworkSize(${art.id}, event)" 
                      title="Current Size: ${colSpan}x${rowSpan} (Click to switch Normal -> Wide -> Tall -> Hero)">
                <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
              </button>

              <!-- Star / Featured Toggle Button -->
              <button class="card-admin-btn star ${isFeatured ? 'is-starred' : ''}" 
                      onclick="toggleFeatured(${art.id}, event)" 
                      title="${isFeatured ? 'Featured hai (Click to remove from 1st page)' : '1st page par Feature karo'}">
                <i class="fa-${isFeatured ? 'solid' : 'regular'} fa-star"></i>
              </button>

              <!-- Edit Artwork Details -->
              <button class="card-admin-btn edit" 
                      onclick="openArtworkEditor(${art.id})" 
                      title="Edit artwork details, size, story, and category">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>

              <!-- Soft Delete / Restore -->
              <button class="card-admin-btn delete ${isHidden ? 'restore' : ''}" 
                      onclick="toggleHideArtwork(${art.id}, event)" 
                      title="${isHidden ? 'Restore public view' : 'Hide/Delete from public view'}">
                <i class="fa-solid fa-${isHidden ? 'eye' : 'trash'}"></i>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Overlay Details -->
        <div class="card-overlay">
          <div class="card-title" title="${escapeHtml(art.title)}">${escapeHtml(art.title)}</div>
          <div class="card-meta">
            <span class="card-category">${art.category_name}</span>
            <span class="expand-btn"><i class="fa-solid fa-expand"></i></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-bind drag & drop reordering and edge resizing
  initDragAndDropListeners();
  initCardResizeListeners();
}

// ==========================================================================
// DRAG AND DROP REORDERING LOGIC
// ==========================================================================
function initDragAndDropListeners() {
  if (!isAdminLoggedIn()) return;
  const cards = document.querySelectorAll('.art-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      // If currently resizing, prevent drag
      if (card.classList.contains('is-resizing')) {
        e.preventDefault();
        return;
      }
      draggedArtId = parseInt(card.dataset.id, 10);
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedArtId);
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetArtId = parseInt(card.dataset.id, 10);
      
      if (draggedArtId && targetArtId && draggedArtId !== targetArtId) {
        reorderArtworks(draggedArtId, targetArtId);
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      document.querySelectorAll('.art-card').forEach(c => c.classList.remove('drag-over'));
      draggedArtId = null;
    });
  });
}

function reorderArtworks(fromId, toId) {
  const fromIndex = artworks.findIndex(a => a.id === fromId);
  const toIndex = artworks.findIndex(a => a.id === toId);

  if (fromIndex === -1 || toIndex === -1) return;

  const [movedArt] = artworks.splice(fromIndex, 1);
  artworks.splice(toIndex, 0, movedArt);

  saveArtworksToStorage();
  renderGallery();
  showToast(`"${movedArt.title}" ki position nayi jagah par set ho gayi!`, 'success');
}

// ==========================================================================
// INTERACTIVE DRAG-TO-RESIZE (Edges & Corners)
// ==========================================================================
function initCardResizeListeners() {
  if (!isAdminLoggedIn()) return;

  const handles = document.querySelectorAll('.card-resize-handle');
  handles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const direction = handle.dataset.dir;
      const card = handle.closest('.art-card');
      if (!card) return;

      const artId = parseInt(card.dataset.id, 10);
      const art = artworks.find(a => a.id === artId);
      if (!art) return;

      // Disable card dragging during resize
      card.setAttribute('draggable', 'false');
      card.classList.add('is-resizing');

      const startX = e.clientX;
      const startY = e.clientY;

      let initialCols = art.colSpan || 1;
      let initialRows = art.rowSpan || 1;
      let currentCols = initialCols;
      let currentRows = initialRows;

      const gridEl = document.getElementById('art-grid');
      const gridRect = gridEl.getBoundingClientRect();
      const computedColCount = window.getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;
      const maxCols = Math.min(4, Math.max(1, computedColCount));
      const colStep = gridRect.width / computedColCount;
      const rowStep = 290;

      // Floating live badge
      let tooltip = card.querySelector('.resize-dimension-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'resize-dimension-tooltip';
        card.appendChild(tooltip);
      }
      
      const updateTooltip = (cols, rows) => {
        let label = `${cols} Col × ${rows} Row`;
        if (cols >= 2 && rows >= 2) label += ' (Hero Masterpiece)';
        else if (cols === 2 && rows === 1) label += ' (Wide Banner)';
        else if (cols === 1 && rows === 2) label += ' (Tall Portrait)';
        tooltip.innerHTML = `<i class="fa-solid fa-arrows-up-down-left-right"></i> <span>${label}</span>`;
      };
      updateTooltip(currentCols, currentRows);

      const onMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (direction.includes('e')) {
          const colDiff = Math.round(deltaX / (colStep * 0.65));
          currentCols = Math.max(1, Math.min(maxCols, initialCols + colDiff));
        }

        if (direction.includes('s')) {
          const rowDiff = Math.round(deltaY / (rowStep * 0.65));
          currentRows = Math.max(1, Math.min(4, initialRows + rowDiff));
        }

        card.style.gridColumn = `span ${currentCols}`;
        card.style.gridRow = `span ${currentRows}`;
        updateTooltip(currentCols, currentRows);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        card.classList.remove('is-resizing');
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }

        if (isAdminLoggedIn()) {
          card.setAttribute('draggable', 'true');
        }

        // Apply and persist if changed
        art.colSpan = currentCols;
        art.rowSpan = currentRows;
        art.spanSize = getSpanSizeName(currentCols, currentRows);

        saveArtworksToStorage();
        renderGallery();
        showToast(`"${art.title}" size: ${currentCols} Columns × ${currentRows} Rows set!`, 'success');
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });
}

// 1-Click Fast Size Cycle
function cycleArtworkSize(artId, event) {
  if (event) event.stopPropagation();
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  const currentCols = art.colSpan || 1;
  const currentRows = art.rowSpan || 1;

  let nextCols = 1;
  let nextRows = 1;

  if (currentCols === 1 && currentRows === 1) {
    nextCols = 2; nextRows = 1; // Wide
  } else if (currentCols === 2 && currentRows === 1) {
    nextCols = 1; nextRows = 2; // Tall
  } else if (currentCols === 1 && currentRows === 2) {
    nextCols = 2; nextRows = 2; // Hero
  } else {
    nextCols = 1; nextRows = 1; // Back to Normal
  }

  art.colSpan = nextCols;
  art.rowSpan = nextRows;
  art.spanSize = getSpanSizeName(nextCols, nextRows);

  saveArtworksToStorage();
  renderGallery();

  showToast(`"${art.title}" size: ${nextCols} × ${nextRows}`, 'info');
}

// ==========================================================================
// MODAL SIZE SYNC LISTENERS
// ==========================================================================
function syncSpanFromSelect() {
  const colVal = parseInt(document.getElementById('edit-colSpan').value, 10);
  const rowVal = parseInt(document.getElementById('edit-rowSpan').value, 10);
  
  let preset = 'normal';
  if (colVal === 2 && rowVal === 2) preset = 'hero';
  else if (colVal === 2 && rowVal === 1) preset = 'wide';
  else if (colVal === 1 && rowVal === 2) preset = 'tall';
  else if (colVal === 1 && rowVal === 1) preset = 'normal';
  else preset = '';

  document.querySelectorAll('input[name="edit-spanSize"]').forEach(r => {
    r.checked = (r.value === preset);
  });
}

function syncAddSpanFromSelect() {
  const colVal = parseInt(document.getElementById('add-colSpan').value, 10);
  const rowVal = parseInt(document.getElementById('add-rowSpan').value, 10);
  
  let preset = 'normal';
  if (colVal === 2 && rowVal === 2) preset = 'hero';
  else if (colVal === 2 && rowVal === 1) preset = 'wide';
  else if (colVal === 1 && rowVal === 2) preset = 'tall';
  else if (colVal === 1 && rowVal === 1) preset = 'normal';
  else preset = '';

  document.querySelectorAll('input[name="add-spanSize"]').forEach(r => {
    r.checked = (r.value === preset);
  });
}

function setupRadioSyncListeners() {
  document.querySelectorAll('input[name="edit-spanSize"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const colSelect = document.getElementById('edit-colSpan');
      const rowSelect = document.getElementById('edit-rowSpan');
      if (!colSelect || !rowSelect) return;

      switch (radio.value) {
        case 'hero': colSelect.value = '2'; rowSelect.value = '2'; break;
        case 'wide': colSelect.value = '2'; rowSelect.value = '1'; break;
        case 'tall': colSelect.value = '1'; rowSelect.value = '2'; break;
        case 'normal': default: colSelect.value = '1'; rowSelect.value = '1'; break;
      }
    });
  });

  document.querySelectorAll('input[name="add-spanSize"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const colSelect = document.getElementById('add-colSpan');
      const rowSelect = document.getElementById('add-rowSpan');
      if (!colSelect || !rowSelect) return;

      switch (radio.value) {
        case 'hero': colSelect.value = '2'; rowSelect.value = '2'; break;
        case 'wide': colSelect.value = '2'; rowSelect.value = '1'; break;
        case 'tall': colSelect.value = '1'; rowSelect.value = '2'; break;
        case 'normal': default: colSelect.value = '1'; rowSelect.value = '1'; break;
      }
    });
  });
}

// ==========================================================================
// LIGHTBOX MODAL & STORY DISPLAY
// ==========================================================================
function openModal(index) {
  if (index < 0 || index >= activeArtworks.length) return;
  currentModalIndex = index;

  const art = activeArtworks[currentModalIndex];
  const modal = document.getElementById('lightbox-modal');
  const mediaWrap = document.getElementById('modal-media-wrap');
  const titleEl = document.getElementById('modal-title');
  const catEl = document.getElementById('modal-category');
  const storyWrap = document.getElementById('modal-story-wrap');
  const adminActions = document.getElementById('modal-admin-actions');
  const featureBtn = document.getElementById('modal-feature-btn');

  const mediaUrl = getArtworkUrl(art.src);

  if (art.isVideo) {
    mediaWrap.innerHTML = `
      <video class="modal-video" controls autoplay loop>
        <source src="${mediaUrl}" type="video/mp4">
      </video>
    `;
  } else {
    mediaWrap.innerHTML = `
      <img class="modal-img" src="${mediaUrl}" alt="${escapeHtml(art.title)}">
    `;
  }

  titleEl.textContent = art.title;
  catEl.textContent = `${art.category_name} • ${art.filename || 'Artwork'}`;

  // Story & Lore rendering
  let storyHtml = '';
  if (art.story && art.story.trim().length > 0) {
    storyHtml += `
      <div class="story-quote-box">
        <i class="fa-solid fa-quote-left"></i> ${escapeHtml(art.story)}
      </div>
    `;
  } else if (isAdminLoggedIn()) {
    storyHtml += `
      <div class="empty-story-prompt">
        <span><i class="fa-solid fa-feather-pointed"></i> Koi concept story ya backstory add nahi ki gayi.</span>
        <button onclick="openArtworkEditor(${art.id})"><i class="fa-solid fa-plus"></i> Story Likho</button>
      </div>
    `;
  }

  // Metadata pills (Client, Tools, Year, Size)
  const pills = [];
  if (art.client) pills.push(`<span class="meta-tag-pill"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(art.client)}</span>`);
  if (art.tools) pills.push(`<span class="meta-tag-pill"><i class="fa-solid fa-paintbrush"></i> ${escapeHtml(art.tools)}</span>`);
  if (art.year) pills.push(`<span class="meta-tag-pill"><i class="fa-solid fa-calendar"></i> ${escapeHtml(art.year)}</span>`);
  
  const colSpan = art.colSpan || 1;
  const rowSpan = art.rowSpan || 1;
  if (colSpan > 1 || rowSpan > 1) {
    pills.push(`<span class="meta-tag-pill"><i class="fa-solid fa-expand"></i> ${colSpan} × ${rowSpan}</span>`);
  }

  if (pills.length > 0) {
    storyHtml += `<div class="modal-meta-pills">${pills.join('')}</div>`;
  }

  storyWrap.innerHTML = storyHtml;

  // Admin buttons in modal
  if (adminActions) {
    const admin = isAdminLoggedIn();
    adminActions.style.display = admin ? 'flex' : 'none';
    if (admin && featureBtn) {
      featureBtn.classList.toggle('starred', art.featured);
      featureBtn.innerHTML = `<i class="fa-${art.featured ? 'solid' : 'regular'} fa-star"></i> ${art.featured ? 'Featured' : 'Feature'}`;
    }
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('lightbox-modal');
  const mediaWrap = document.getElementById('modal-media-wrap');
  if (modal) modal.classList.remove('open');
  if (mediaWrap) mediaWrap.innerHTML = '';
  document.body.style.overflow = '';
}

function nextArtwork() {
  if (activeArtworks.length === 0) return;
  const nextIdx = (currentModalIndex + 1) % activeArtworks.length;
  openModal(nextIdx);
}

function prevArtwork() {
  if (activeArtworks.length === 0) return;
  const prevIdx = (currentModalIndex - 1 + activeArtworks.length) % activeArtworks.length;
  openModal(prevIdx);
}

function openCurrentModalEditor() {
  const art = activeArtworks[currentModalIndex];
  if (art) {
    closeModal();
    openArtworkEditor(art.id);
  }
}

function toggleCurrentModalFeatured() {
  const art = activeArtworks[currentModalIndex];
  if (art) {
    toggleFeatured(art.id);
    openModal(currentModalIndex);
  }
}

// ==========================================================================
// ADMIN ACTIONS: FEATURE, HIDE, EDIT, ADD, EXPORT
// ==========================================================================

function toggleFeatured(artId, event) {
  if (event) event.stopPropagation();
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  art.featured = !art.featured;
  saveArtworksToStorage();
  renderGallery();

  const msg = art.featured 
    ? `⭐ "${art.title}" ko 1st Page Highlights me add kar diya!`
    : `"${art.title}" ko 1st Page se hata diya gaya.`;
  showToast(msg, art.featured ? 'success' : 'info');
}

function toggleHideArtwork(artId, event) {
  if (event) event.stopPropagation();
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  art.hidden = !art.hidden;
  saveArtworksToStorage();
  renderGallery();

  const msg = art.hidden
    ? `🗑️ "${art.title}" public view se hide kar diya gaya.`
    : `👁️ "${art.title}" public gallery me restore ho gaya.`;
  showToast(msg, art.hidden ? 'warning' : 'success');
}

function openArtworkEditor(artId) {
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  const modal = document.getElementById('artwork-editor-modal');
  document.getElementById('edit-art-id').value = art.id;
  document.getElementById('edit-title').value = art.title || '';
  document.getElementById('edit-category').value = art.category || 'concept-art';
  document.getElementById('edit-client').value = art.client || '';
  document.getElementById('edit-tools').value = art.tools || '';
  document.getElementById('edit-year').value = art.year || '';
  document.getElementById('edit-story').value = art.story || '';
  document.getElementById('edit-featured').checked = !!art.featured;
  document.getElementById('edit-hidden').checked = !!art.hidden;

  // Set Size Selectors
  const colVal = art.colSpan || 1;
  const rowVal = art.rowSpan || 1;
  const colSelect = document.getElementById('edit-colSpan');
  const rowSelect = document.getElementById('edit-rowSpan');
  if (colSelect) colSelect.value = colVal.toString();
  if (rowSelect) rowSelect.value = rowVal.toString();
  syncSpanFromSelect();

  // Preview
  const previewWrap = document.getElementById('edit-preview-wrap');
  const filenameEl = document.getElementById('edit-preview-filename');
  const mediaUrl = getArtworkUrl(art.src);

  if (art.isVideo) {
    previewWrap.innerHTML = `<video controls autoplay loop muted style="max-height: 100%;"><source src="${mediaUrl}" type="video/mp4"></video>`;
  } else {
    previewWrap.innerHTML = `<img src="${mediaUrl}" alt="${escapeHtml(art.title)}" style="max-height: 100%;" />`;
  }
  if (filenameEl) filenameEl.textContent = art.src || art.filename;

  modal.classList.add('open');
}

function closeArtworkEditor() {
  const modal = document.getElementById('artwork-editor-modal');
  if (modal) modal.classList.remove('open');
}

function handleSaveArtwork(e) {
  e.preventDefault();
  const artId = parseInt(document.getElementById('edit-art-id').value, 10);
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  art.title = document.getElementById('edit-title').value.trim();
  art.category = document.getElementById('edit-category').value;
  art.category_name = CATEGORY_NAMES[art.category] || art.category;
  art.client = document.getElementById('edit-client').value.trim();
  art.tools = document.getElementById('edit-tools').value.trim();
  art.year = document.getElementById('edit-year').value.trim();
  art.story = document.getElementById('edit-story').value.trim();
  art.featured = document.getElementById('edit-featured').checked;
  art.hidden = document.getElementById('edit-hidden').checked;

  const colVal = parseInt(document.getElementById('edit-colSpan').value, 10) || 1;
  const rowVal = parseInt(document.getElementById('edit-rowSpan').value, 10) || 1;
  art.colSpan = colVal;
  art.rowSpan = rowVal;
  art.spanSize = getSpanSizeName(colVal, rowVal);

  saveArtworksToStorage();
  closeArtworkEditor();
  renderGallery();
  showToast(`"${art.title}" successfully updated!`, 'success');
}

function handleDeleteArtworkBtn() {
  const artId = parseInt(document.getElementById('edit-art-id').value, 10);
  const art = artworks.find(a => a.id === artId);
  if (!art) return;

  if (confirm(`Kya tum sach me "${art.title}" ko permanently delete karna chahte ho?`)) {
    artworks = artworks.filter(a => a.id !== artId);
    try {
      const del = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]');
      if (!del.includes(artId)) del.push(artId);
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(del));
    } catch (e) {}
    saveArtworksToStorage();
    closeArtworkEditor();
    renderGallery();
    showToast(`"${art.title}" permanently delete ho gaya.`, 'warning');
  }
}

// Add New Artwork Modal
function openAddArtworkModal() {
  const modal = document.getElementById('add-artwork-modal');
  const form = document.getElementById('add-artwork-form');
  if (form) form.reset();
  
  const catSelect = document.getElementById('add-category');
  if (catSelect && currentCategory !== 'featured') {
    catSelect.value = currentCategory;
  }

  const colSelect = document.getElementById('add-colSpan');
  const rowSelect = document.getElementById('add-rowSpan');
  if (colSelect) colSelect.value = '1';
  if (rowSelect) rowSelect.value = '1';
  syncAddSpanFromSelect();

  const previewWrap = document.getElementById('add-preview-wrap');
  if (previewWrap) {
    previewWrap.innerHTML = `<div class="empty-preview"><i class="fa-solid fa-image"></i> Enter image path or select file</div>`;
  }

  if (modal) modal.classList.add('open');
}

function closeAddArtworkModal() {
  const modal = document.getElementById('add-artwork-modal');
  if (modal) modal.classList.remove('open');
}

function previewAddImage(val) {
  const previewWrap = document.getElementById('add-preview-wrap');
  if (!val || !val.trim()) {
    previewWrap.innerHTML = `<div class="empty-preview"><i class="fa-solid fa-image"></i> Enter image path or select file</div>`;
    return;
  }
  const url = getArtworkUrl(val.trim());
  previewWrap.innerHTML = `<img src="${url}" style="max-height: 100%; object-fit: contain;" onerror="this.src='https://placehold.co/600x400/121722/00e5ff?text=Invalid+Image+Path';" />`;
}

function handleLocalFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith('video');
  const previewWrap = document.getElementById('add-preview-wrap');
  
  // Instant, zero-memory blob preview URL
  const blobUrl = URL.createObjectURL(file);

  if (isVideo) {
    previewWrap.innerHTML = `<video controls autoplay loop muted style="max-height:100%;"><source src="${blobUrl}"></video>`;
  } else {
    previewWrap.innerHTML = `<img src="${blobUrl}" style="max-height:100%; object-fit:contain;" />`;
  }

  // Derive target folder and clean relative path
  const cat = document.getElementById('add-category').value;
  const folder = CATEGORY_FOLDERS[cat] || 'concept art';
  const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  const safeName = isHeic ? file.name.replace(/\.heic$/i, '.jpg') : file.name;
  const targetRelativePath = `${folder}/${safeName}`;

  if (isHeic) {
    showToast('iPhone .HEIC photo detect hui! Portfolio iske JPG version ko load karega.', 'info');
  }

  // Cache in-memory blob so image renders immediately without needing a server
  window.LOCAL_MEDIA_BLOBS = window.LOCAL_MEDIA_BLOBS || {};
  window.LOCAL_MEDIA_BLOBS[targetRelativePath] = blobUrl;
  window.LOCAL_MEDIA_BLOBS[safeName] = blobUrl;
  window.LOCAL_MEDIA_BLOBS[file.name] = blobUrl;

  // Set the clean relative path in the text box (NOT giant base64!)
  const srcInput = document.getElementById('add-src');
  if (srcInput) srcInput.value = targetRelativePath;

  const titleInput = document.getElementById('add-title');
  if (titleInput && !titleInput.value) {
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    titleInput.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }
}

function handleAddArtworkSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('add-title').value.trim();
  const category = document.getElementById('add-category').value;
  const client = document.getElementById('add-client').value.trim();
  const tools = document.getElementById('add-tools').value.trim();
  const year = document.getElementById('add-year').value.trim();
  let src = document.getElementById('add-src').value.trim();
  const story = document.getElementById('add-story').value.trim();
  const featured = document.getElementById('add-featured').checked;

  const colVal = parseInt(document.getElementById('add-colSpan').value, 10) || 1;
  const rowVal = parseInt(document.getElementById('add-rowSpan').value, 10) || 1;

  // If user pasted or kept a giant base64 string or HEIC, sanitize it to prevent crash
  let filename = src.split('/').pop().split('\\').pop() || 'new_artwork.png';
  if (filename.toLowerCase().endsWith('.heic')) {
    filename = filename.replace(/\.heic$/i, '.jpg');
    src = src.replace(/\.heic$/i, '.jpg');
  }
  if (src.startsWith('data:') && src.length > 20000) {
    const folder = CATEGORY_FOLDERS[category] || 'concept art';
    src = `${folder}/${filename}`;
  }

  const nextId = artworks.length > 0 ? Math.max(...artworks.map(a => a.id || 0)) + 1 : 1;
  const isVideo = src.toLowerCase().endsWith('.mp4') || src.startsWith('data:video');

  const newArt = {
    id: nextId,
    title: title || filename,
    filename: filename,
    src: src,
    category: category,
    category_name: CATEGORY_NAMES[category] || category,
    isVideo: isVideo,
    featured: featured,
    hidden: false,
    story: story,
    tools: tools,
    client: client,
    year: year,
    colSpan: colVal,
    rowSpan: rowVal,
    spanSize: getSpanSizeName(colVal, rowVal)
  };

  artworks.unshift(newArt);
  saveArtworksToStorage();
  closeAddArtworkModal();
  setCategory(category);
  renderGallery();
  showToast(`"${newArt.title}" successfully added to portfolio!`, 'success');
}

// Export master database as downloadable artworks_data.js
function exportDataFile() {
  const content = `// Master Artworks Database generated by Pankaj Deore Studio Admin Console\n` +
    `// Generated on: ${new Date().toLocaleString()}\n` +
    `const ARTWORKS_DATA = ${JSON.stringify(artworks, null, 2)};\n`;

  const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'artworks_data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('💾 artworks_data.js downloaded! Replace it in your portfolio folder to make positions and custom sizes permanent.', 'success');
}

function confirmResetDefaults() {
  if (confirm('Kya tum saare edits aur changes reset karke original artworks list par wapas aana chahte ho?')) {
    localStorage.removeItem(STORAGE_KEY_ARTWORKS);
    localStorage.removeItem(STORAGE_KEY_DELETED);
    artworks = Array.isArray(ARTWORKS_DATA) ? [...ARTWORKS_DATA] : [];
    updateCategoryCounts();
    updateHiddenCountBadge();
    renderGallery();
    showToast('Portfolio original default state par reset ho gaya.', 'info');
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS & UTILS
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;

  let icon = 'circle-info';
  if (type === 'success') icon = 'circle-check';
  if (type === 'warning') icon = 'triangle-exclamation';
  if (type === 'error') icon = 'circle-xmark';

  toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// EVENT LISTENERS & SHORTCUTS
// ==========================================================================
function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCategory(btn.dataset.category);
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderGallery();
    });
  }

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const nextBtn = document.getElementById('modal-next');
  if (nextBtn) nextBtn.addEventListener('click', nextArtwork);

  const prevBtn = document.getElementById('modal-prev');
  if (prevBtn) prevBtn.addEventListener('click', prevArtwork);

  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    // Secret Admin Triggers: Ctrl+Shift+A or Alt+A
    if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (e.altKey && (e.key === 'A' || e.key === 'a'))) {
      e.preventDefault();
      openLoginModal();
      return;
    }

    if (e.key === 'Escape') {
      const loginModal = document.getElementById('admin-login-modal');
      const editModal = document.getElementById('artwork-editor-modal');
      const addModal = document.getElementById('add-artwork-modal');
      const pwdModal = document.getElementById('change-password-modal');
      const profModal = document.getElementById('edit-profile-modal');
      const pdfModal = document.getElementById('pdf-download-modal');
      
      if (pdfModal && pdfModal.classList.contains('open')) { closePdfModal(); return; }
      if (loginModal && loginModal.classList.contains('open')) { closeLoginModal(); return; }
      if (editModal && editModal.classList.contains('open')) { closeArtworkEditor(); return; }
      if (addModal && addModal.classList.contains('open')) { closeAddArtworkModal(); return; }
      if (pwdModal && pwdModal.classList.contains('open')) { closePasswordChangeModal(); return; }
      if (profModal && profModal.classList.contains('open')) { closeProfileModal(); return; }
      
      if (modal && modal.classList.contains('open')) { closeModal(); return; }
    }

    const isModalOpen = modal && modal.classList.contains('open');
    if (isModalOpen) {
      if (e.key === 'ArrowRight') nextArtwork();
      if (e.key === 'ArrowLeft') prevArtwork();
    }
  });

  const pdfModal = document.getElementById('pdf-download-modal');
  if (pdfModal) {
    pdfModal.addEventListener('click', (e) => {
      if (e.target === pdfModal) closePdfModal();
    });
  }

  window.addEventListener('hashchange', handleUrlHash);
}

// ==========================================================================
// PDF DOWNLOAD CENTER & POPUP MODAL
// ==========================================================================
const STORAGE_KEY_DONT_SHOW_PDF = 'pankaj_hide_pdf_popup_v1';

function openPdfModal() {
  const modal = document.getElementById('pdf-download-modal');
  if (modal) {
    modal.classList.add('open');
  }
}

function closePdfModal() {
  const modal = document.getElementById('pdf-download-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function toggleDontShowPdf(checked) {
  if (checked) {
    localStorage.setItem(STORAGE_KEY_DONT_SHOW_PDF, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_DONT_SHOW_PDF);
  }
}

function initPdfModal() {
  const checkbox = document.getElementById('pdf-dont-show-checkbox');
  const dontShow = localStorage.getItem(STORAGE_KEY_DONT_SHOW_PDF);
  if (checkbox && dontShow) {
    checkbox.checked = true;
  }
}

// ==========================================================================
// VISITOR ANALYTICS, LIVE LOGS & EMAIL ALERTS
// ==========================================================================
const STORAGE_KEY_VISITORS_LOG = 'pankaj_portfolio_visitors_log_v2';
const STORAGE_KEY_VISIT_COUNT = 'pankaj_portfolio_total_visits_v2';
const SESSION_KEY_VISIT_TRACKED = 'pankaj_visit_session_tracked_v2';

function getVisitorLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITORS_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveVisitorLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY_VISITORS_LOG, JSON.stringify(log.slice(0, 150)));
  } catch (e) {}
}

function getTotalVisitCount() {
  const count = parseInt(localStorage.getItem(STORAGE_KEY_VISIT_COUNT) || '0', 10);
  return isNaN(count) ? 0 : count;
}

async function initVisitorTracking() {
  const isTracked = sessionStorage.getItem(SESSION_KEY_VISIT_TRACKED);
  
  // Detect device, browser, OS
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua);
  const deviceType = isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop');

  let browser = 'Unknown Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let referrer = 'Direct / Portfolio Link';
  if (document.referrer) {
    try {
      const refHost = new URL(document.referrer).hostname;
      if (refHost.includes('instagram.com')) referrer = 'Instagram 📸';
      else if (refHost.includes('linkedin.com')) referrer = 'LinkedIn 💼';
      else if (refHost.includes('artstation.com')) referrer = 'ArtStation 🎨';
      else if (refHost.includes('google.')) referrer = 'Google Search 🔍';
      else if (refHost.includes('facebook.com')) referrer = 'Facebook';
      else if (refHost.includes('twitter.com') || refHost.includes('x.com')) referrer = 'Twitter / X';
      else if (!refHost.includes(window.location.hostname)) referrer = refHost;
    } catch (e) {}
  }

  const screenRes = `${window.screen.width || 0} x ${window.screen.height || 0}`;

  if (!isTracked) {
    sessionStorage.setItem(SESSION_KEY_VISIT_TRACKED, 'true');
    const newCount = getTotalVisitCount() + 1;
    localStorage.setItem(STORAGE_KEY_VISIT_COUNT, String(newCount));

    const now = new Date();
    const newRecord = {
      id: Date.now(),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: Date.now(),
      device: deviceType,
      screen: screenRes,
      browser: browser,
      os: os,
      country: 'India 🇮🇳',
      city: '',
      region: '',
      postal: '',
      isp: '',
      ip: '',
      referrer: referrer
    };

    const currentLog = getVisitorLog();
    currentLog.unshift(newRecord);
    saveVisitorLog(currentLog);

    // Fetch high-accuracy real-time IP Geolocation
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      let geo = null;
      try {
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        if (res.ok) {
          const d = await res.json();
          if (d && d.success) geo = d;
        }
      } catch (e1) {}

      if (!geo) {
        try {
          const res2 = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          if (res2.ok) {
            const d2 = await res2.json();
            if (d2 && d2.city) {
              geo = {
                city: d2.city,
                region: d2.region,
                country: d2.country_name,
                postal: d2.postal,
                ip: d2.ip,
                connection: { isp: d2.org }
              };
            }
          }
        } catch (e2) {}
      }
      clearTimeout(timeoutId);

      if (geo) {
        newRecord.city = geo.city || '';
        newRecord.region = geo.region || '';
        newRecord.country = geo.country ? `${geo.country} ${geo.flag?.emoji || '🇮🇳'}` : 'India 🇮🇳';
        newRecord.postal = geo.postal || '';
        newRecord.ip = geo.ip || '';
        newRecord.isp = geo.connection?.isp || geo.org || '';
        saveVisitorLog(currentLog);
        updateVisitorDrawerUI();
      }
    } catch (err) {}

    // Send email alert via FormSubmit (only if not admin himself)
    if (!isAdminLoggedIn()) {
      sendVisitorEmailAlert(newRecord);
    }
  }

  updateVisitorDrawerUI();
}

function sendVisitorEmailAlert(record, isManualTest = false) {
  const profile = getProfileData();
  const targetEmail = profile.email || 'pankajfreelancer09@gmail.com';

  const cityState = [record.city, record.region].filter(Boolean).join(', ');
  const fullLocation = [cityState, record.country, record.postal ? `(PIN: ${record.postal})` : ''].filter(Boolean).join(' ');

  const payload = {
    _subject: isManualTest 
      ? `🔔 TEST ALERT: Portfolio Visitor Tracking System Active!`
      : `🎨 New Visitor Alert: ${record.device} from ${cityState || 'India'} ${record.country ? '' : '🇮🇳'}`,
    'Visitor Device': record.device === 'Mobile' ? '📱 Mobile Smartphone' : '💻 Desktop / Laptop',
    'Location (City, State, Country)': fullLocation || 'India 🇮🇳',
    'Internet Provider (ISP)': record.isp || 'Broadband / Cellular Network',
    'Visitor IP Address': record.ip || 'Recorded via Cloud Gateway',
    'Screen Resolution': record.screen || 'Standard',
    'Browser & OS': `${record.browser} on ${record.os}`,
    'Traffic Source': record.referrer,
    'Visit Date & Time': `${record.date} at ${record.time} (IST)`,
    'Portfolio URL': window.location.href,
    _captcha: 'false',
    _template: 'table'
  };

  return fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()).catch(err => {
    console.log('Silent visitor sync notification sent.');
  });
}

function toggleVisitorDrawer() {
  const drawer = document.getElementById('visitor-drawer');
  const backdrop = document.getElementById('visitor-drawer-backdrop');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeVisitorDrawer();
  } else {
    updateVisitorDrawerUI();
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }
}

function closeVisitorDrawer() {
  const drawer = document.getElementById('visitor-drawer');
  const backdrop = document.getElementById('visitor-drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function updateVisitorDrawerUI() {
  const log = getVisitorLog();
  const totalVisits = getTotalVisitCount();
  
  // Update badges
  const toolbarCount = document.getElementById('admin-toolbar-visitor-count');
  if (toolbarCount) toolbarCount.textContent = totalVisits;

  const pillBadge = document.getElementById('visitor-pill-badge');
  if (pillBadge) pillBadge.textContent = totalVisits;

  // Drawer stats
  const totalEl = document.getElementById('vd-total-visits');
  if (totalEl) totalEl.textContent = totalVisits;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const todayVisits = log.filter(item => item.date === todayStr).length;
  const todayEl = document.getElementById('vd-today-visits');
  if (todayEl) todayEl.textContent = todayVisits;

  const mobileCount = log.filter(item => item.device === 'Mobile').length;
  const desktopCount = log.filter(item => item.device === 'Desktop').length;
  const totalTracked = log.length || 1;
  const mobilePct = Math.round((mobileCount / totalTracked) * 100);
  const ratioEl = document.getElementById('vd-device-ratio');
  if (ratioEl) ratioEl.textContent = `${mobilePct}% Mob`;

  // Render timeline cards
  const timeline = document.getElementById('visitor-timeline');
  if (!timeline) return;

  if (log.length === 0) {
    timeline.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-user-clock" style="font-size: 2rem; color: var(--primary); margin-bottom: 0.5rem;"></i>
        <p style="font-size: 0.85rem;">No visitor sessions recorded yet.</p>
        <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">New recruiter and client visits will show here automatically.</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = log.slice(0, 30).map(item => {
    const isMob = item.device === 'Mobile';
    const locText = [item.city, item.region].filter(Boolean).join(', ') || item.country || 'India 🇮🇳';
    return `
      <div class="visitor-card">
        <div class="visitor-card-top">
          <span class="visitor-time"><i class="fa-regular fa-clock"></i> ${item.date} • ${item.time}</span>
          <div class="visitor-badges">
            <span class="v-badge ${isMob ? 'mobile' : 'desktop'}">${isMob ? '📱 Mobile' : '💻 PC'}</span>
            <span class="v-badge country">${item.country || 'India 🇮🇳'}</span>
          </div>
        </div>
        <div class="visitor-details">
          <span><i class="fa-solid fa-location-dot"></i> ${locText}</span>
          ${item.isp ? `<span>•</span> <span>${item.isp}</span>` : ''}
          <span>•</span>
          <span>${item.browser} (${item.os})</span>
        </div>
        <div class="visitor-ref">
          <i class="fa-solid fa-arrow-turn-down-right"></i> Source: <strong>${item.referrer}</strong>
        </div>
      </div>
    `;
  }).join('');
}

function sendTestVisitorEmail(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('email-test-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  }

  const profile = getProfileData();
  const email = profile.email || 'pankajfreelancer09@gmail.com';

  const testRecord = {
    device: 'Desktop',
    country: 'India 🇮🇳',
    city: 'Nashik Studio',
    referrer: 'Admin Test Console',
    browser: 'Chrome',
    os: 'Windows 11',
    date: new Date().toLocaleDateString('en-GB'),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };

  sendVisitorEmailAlert(testRecord, true)
    .then(() => {
      showToast(`📧 Test notification sent to ${email}! Check your inbox.`, 'success');
    })
    .catch(() => {
      showToast(`Notification triggered for ${email}!`, 'info');
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Test Email';
      }
    });
}

function clearVisitorLog() {
  if (confirm('Visitor history log clear karaycha ahe ka?')) {
    localStorage.removeItem(STORAGE_KEY_VISITORS_LOG);
    updateVisitorDrawerUI();
    showToast('Visitor history cleared.', 'info');
  }
}

function exportVisitorLogCSV() {
  const log = getVisitorLog();
  if (log.length === 0) {
    showToast('Export karne sathi koi visitor data nahi ahe.', 'warning');
    return;
  }
  let csv = 'Date,Time,Device,Country,City,Browser,OS,Source\n';
  log.forEach(item => {
    csv += `"${item.date}","${item.time}","${item.device}","${item.country}","${item.city}","${item.browser}","${item.os}","${item.referrer}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pankaj_portfolio_visitors_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Visitor log CSV downloaded!', 'success');
}


