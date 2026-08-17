/**
 * MIJO Story — app.js
 * Socle applicatif : profil anonyme (localStorage) + statut de connexion.
 */

const PROFILE_STORAGE_KEY = 'mijo_story_profile';

/* ---------- Profil anonyme ---------- */

function generatePseudo() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Lecteur #${num}`;
}

function generateUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  // Repli si crypto.randomUUID indisponible (vieux navigateurs)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateProfile() {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[MIJO Story] Profil corrompu, régénération.', err);
    }
  }
  const profile = {
    id: generateUUID(),
    pseudo: generatePseudo(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

let currentProfile = getOrCreateProfile();

/* ---------- Affichage du pseudo + édition en un clic ---------- */

function renderPseudo() {
  const el = document.getElementById('user-pseudo');
  if (el) el.textContent = currentProfile.pseudo;
}

function enterEditMode() {
  const display = document.getElementById('user-pseudo');
  const input = document.getElementById('user-pseudo-input');
  if (!display || !input) return;

  input.value = currentProfile.pseudo;
  display.classList.add('hidden');
  input.classList.remove('hidden');
  input.focus();
  input.select();
}

function commitPseudoEdit() {
  const input = document.getElementById('user-pseudo-input');
  const display = document.getElementById('user-pseudo');
  if (!input || !display) return;

  const cleaned = input.value.trim().slice(0, 24);
  currentProfile.pseudo = cleaned.length > 0 ? cleaned : currentProfile.pseudo;
  saveProfile(currentProfile);

  renderPseudo();
  input.classList.add('hidden');
  display.classList.remove('hidden');
}

function initProfileUI() {
  renderPseudo();

  const display = document.getElementById('user-pseudo');
  const editBtn = document.getElementById('edit-pseudo-btn');
  const input = document.getElementById('user-pseudo-input');

  if (editBtn) editBtn.addEventListener('click', enterEditMode);
  if (display) display.addEventListener('click', enterEditMode);

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitPseudoEdit();
      if (e.key === 'Escape') {
        input.classList.add('hidden');
        display.classList.remove('hidden');
      }
    });
    input.addEventListener('blur', commitPseudoEdit);
  }
}

/* ---------- Accueil : catégories + histoires ---------- */

const APP_LANG = 'fr'; // langue d'affichage par défaut (fr / en / es)

let allCategories = [];
let allStories = [];
let activeCategory = 'all';

function localizedField(obj, field) {
  return (
    obj[`${field}_${APP_LANG}`] || obj[`${field}_fr`] || obj[`${field}_en`] || ''
  );
}

async function fetchCategories() {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchStories() {
  const { data, error } = await supabaseClient
    .from('stories')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Les histoires peuvent référencer leur catégorie de plusieurs façons selon
// votre schéma : par id (`category_id`), par id stocké dans `category`, ou
// par nom (fr/en/es). On essaie les trois, dans cet ordre.
function categoryFor(story) {
  if (!story || !allCategories.length) return null;

  if (story.category_id != null) {
    const byId = allCategories.find((c) => String(c.id) === String(story.category_id));
    if (byId) return byId;
  }

  const raw = story.category;
  if (raw === null || raw === undefined || raw === '') return null;

  if (!isNaN(raw)) {
    const byNumericId = allCategories.find((c) => String(c.id) === String(raw));
    if (byNumericId) return byNumericId;
  }

  const normalized = String(raw).trim().toLowerCase();
  const byName = allCategories.find((c) =>
    [c.name_en, c.name_fr, c.name_es].some((n) => (n || '').trim().toLowerCase() === normalized)
  );

  if (!byName) {
    console.warn(
      '[MIJO Story] Catégorie introuvable pour l\'histoire',
      story.id,
      '— valeur reçue :',
      JSON.stringify(raw),
      '— catégories disponibles :',
      allCategories.map((c) => ({ id: c.id, name_fr: c.name_fr, name_en: c.name_en }))
    );
  }

  return byName || null;
}

function renderCategoryFilters() {
  const nav = document.getElementById('category-filters');
  if (!nav) return;

  const pills = [
    { key: 'all', label: 'Toutes' },
    ...allCategories.map((c) => ({ key: String(c.id), label: localizedField(c, 'name') })),
  ];

  nav.innerHTML = pills
    .map((p) => {
      const active = p.key === activeCategory;
      return `<button
          data-category="${p.key}"
          class="filter-pill shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active
              ? 'bg-gold text-navy border-gold'
              : 'bg-navy-elevated text-[color:var(--text-muted)] border-navy-line hover:border-gold/50'
          }"
        >${p.label}</button>`;
    })
    .join('');

  nav.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category === activeCategory) return;
      activeCategory = btn.dataset.category;
      renderCategoryFilters();
      renderStoriesGrid();
    });
  });
}

function storyCardTemplate(story) {
  const title = localizedField(story, 'title');
  return `
    <button
      data-story-id="${story.id}"
      class="story-card group relative rounded-xl overflow-hidden border border-navy-line bg-navy-soft aspect-[9/16] text-left transition-transform active:scale-[0.97]"
    >
      <img
        src="${story.thumbnail_url}"
        alt="${title}"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-navy via-navy/10 to-transparent"></div>
      ${
        story.is_premium
          ? `<span class="absolute top-2 right-2 bg-gold text-navy text-[10px] font-display font-bold px-2 py-0.5 rounded-full shadow">Premium</span>`
          : ''
      }
      <div class="absolute bottom-0 left-0 right-0 p-2.5">
        <p class="font-display text-sm font-semibold leading-snug text-[color:var(--text-primary)] line-clamp-2">${title}</p>
      </div>
    </button>`;
}

function renderStoriesGrid() {
  const grid = document.getElementById('stories-grid');
  const emptyEl = document.getElementById('stories-empty');
  if (!grid || !emptyEl) return;

  const filtered =
    activeCategory === 'all'
      ? allStories
      : allStories.filter((s) => {
          const cat = categoryFor(s);
          return cat && String(cat.id) === activeCategory;
        });

  if (filtered.length === 0) {
    grid.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    emptyEl.classList.add('flex');
    return;
  }

  emptyEl.classList.add('hidden');
  emptyEl.classList.remove('flex');
  grid.classList.remove('hidden');
  grid.innerHTML = filtered.map(storyCardTemplate).join('');
}

function setHomeState(state) {
  // state: 'loading' | 'error' | 'ready'
  const loader = document.getElementById('stories-loader');
  const errorEl = document.getElementById('stories-error');
  const grid = document.getElementById('stories-grid');
  const emptyEl = document.getElementById('stories-empty');

  loader.classList.toggle('hidden', state !== 'loading');
  errorEl.classList.toggle('hidden', state !== 'error');
  errorEl.classList.toggle('flex', state === 'error');

  if (state !== 'ready') {
    grid.classList.add('hidden');
    emptyEl.classList.add('hidden');
  }
}

async function loadHomeData() {
  if (!supabaseClient) {
    setHomeState('error');
    const msg = document.getElementById('stories-error-msg');
    if (msg) msg.textContent = 'Supabase non configuré — renseignez vos clés dans config.js.';
    return;
  }

  setHomeState('loading');
  const msg = document.getElementById('stories-error-msg');
  if (msg) msg.textContent = 'Vérifiez votre connexion internet et réessayez.';

  try {
    const [categories, stories] = await Promise.all([fetchCategories(), fetchStories()]);
    allCategories = categories;
    allStories = stories;
    renderCategoryFilters();
    renderStoriesGrid();
    setHomeState('ready');
  } catch (err) {
    console.error('[MIJO Story] Erreur de chargement :', err);
    setHomeState('error');
  }
}

function initHome() {
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) retryBtn.addEventListener('click', loadHomeData);

  // Délégation d'événement : la grille est régénérée à chaque filtre,
  // le conteneur, lui, reste le même élément du DOM.
  const grid = document.getElementById('stories-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.story-card');
      if (!card) return;
      const story = allStories.find((s) => String(s.id) === card.dataset.storyId);
      if (story) openReader(story);
    });
  }

  loadHomeData();
}

/* ---------- Lecteur immersif ---------- */

const PREMIUM_STORAGE_KEY = 'mijo_story_premium_unlocked';
const DEFAULT_ACCENT = '#d4a03d';

const ICON_VOLUME_ON = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a9 9 0 0 1 0 12"/></svg>`;
const ICON_VOLUME_OFF = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>`;

let currentReaderStory = null;

// Utilise la couleur réelle de la catégorie (`theme_color`) plutôt qu'une
// palette codée en dur, avec un repli doré si elle est absente.
function accentFor(category) {
  return (category && category.theme_color) || DEFAULT_ACCENT;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderParagraphs(container, text) {
  if (!container) return;
  const paragraphs = (text || '').split(/\n{2,}/).filter((p) => p.trim().length > 0);
  container.innerHTML = paragraphs
    .map((p) => `<p class="mb-4">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function isPremiumUnlocked() {
  return localStorage.getItem(PREMIUM_STORAGE_KEY) === 'true';
}

function updatePremiumLock(story) {
  const lock = document.getElementById('premium-lock');
  const text2 = document.getElementById('reader-text-2');
  if (!lock || !text2) return;

  const locked = Boolean(story.is_premium) && !isPremiumUnlocked();
  lock.classList.toggle('hidden', !locked);
  text2.classList.toggle('blur-sm', locked);
  text2.classList.toggle('select-none', locked);
  text2.classList.toggle('pointer-events-none', locked);
}

function renderAmbientIcon(playing) {
  const btn = document.getElementById('ambient-toggle-btn');
  if (!btn) return;
  btn.innerHTML = playing ? ICON_VOLUME_ON : ICON_VOLUME_OFF;
  btn.dataset.playing = playing ? 'true' : 'false';
}

function setupAmbientAudio(category) {
  const audio = document.getElementById('ambient-audio');
  const btn = document.getElementById('ambient-toggle-btn');
  if (!audio || !btn) return;

  const src = category && category.ambient_audio_url ? category.ambient_audio_url : '';

  if (!src) {
    console.warn(
      '[MIJO Story] Aucune URL audio trouvée — catégorie non reconnue ou "ambient_audio_url" vide pour :',
      category
    );
    audio.pause();
    audio.removeAttribute('src');
    btn.classList.add('hidden');
    btn.classList.remove('flex');
    return;
  }

  btn.classList.remove('hidden');
  btn.classList.add('flex');
  audio.loop = true;
  audio.src = src;

  // Autoplay tenté ici, dans le prolongement du clic utilisateur sur la
  // carte d'histoire. Les navigateurs peuvent tout de même le bloquer :
  // dans ce cas le bouton passe simplement en mode "coupé".
  audio
    .play()
    .then(() => renderAmbientIcon(true))
    .catch(() => renderAmbientIcon(false));
}

function toggleAmbient() {
  const audio = document.getElementById('ambient-audio');
  if (!audio || !audio.src) return;

  if (audio.paused) {
    audio
      .play()
      .then(() => renderAmbientIcon(true))
      .catch(() => renderAmbientIcon(false));
  } else {
    audio.pause();
    renderAmbientIcon(false);
  }
}

function openReader(story) {
  currentReaderStory = story;
  const category = categoryFor(story);
  const accent = accentFor(category);
  document.documentElement.style.setProperty('--accent', accent);

  const title = localizedField(story, 'title');
  const cover = document.getElementById('reader-cover');
  if (cover) {
    cover.src = story.thumbnail_url || '';
    cover.alt = title;
  }

  const titleEl = document.getElementById('reader-title');
  if (titleEl) titleEl.textContent = title;

  const categoryEl = document.getElementById('reader-category');
  if (categoryEl) categoryEl.textContent = category ? localizedField(category, 'name') : '';

  renderParagraphs(document.getElementById('reader-text-1'), localizedField(story, 'text_1'));
  renderParagraphs(document.getElementById('reader-text-2'), localizedField(story, 'text_2'));

  updatePremiumLock(story);
  setupAmbientAudio(category);

  const readerView = document.getElementById('reader-view');
  if (readerView) {
    readerView.classList.remove('hidden');
    readerView.scrollTop = 0;
  }
  document.body.classList.add('overflow-hidden');
}

function closeReader() {
  const audio = document.getElementById('ambient-audio');
  if (audio) audio.pause();

  const readerView = document.getElementById('reader-view');
  if (readerView) readerView.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  currentReaderStory = null;
}

function initReader() {
  const backBtn = document.getElementById('reader-back-btn');
  if (backBtn) backBtn.addEventListener('click', closeReader);

  const ambientBtn = document.getElementById('ambient-toggle-btn');
  if (ambientBtn) ambientBtn.addEventListener('click', toggleAmbient);

  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      // Simule l'upgrade premium : dans un prochain bloc, ceci déclenchera
      // le vrai flux de paiement/abonnement.
      localStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
      if (currentReaderStory) updatePremiumLock(currentReaderStory);
    });
  }
}

/* ---------- Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initHome();
  initReader();
});
