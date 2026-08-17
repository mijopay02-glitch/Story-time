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

// Les histoires référencent leur catégorie via le nom anglais (colonne
// `category`), pas via un id — on relie donc les deux tables par ce nom.
function categoryFor(story) {
  return allCategories.find((c) => c.name_en === story.category) || null;
}

function renderCategoryFilters() {
  const nav = document.getElementById('category-filters');
  if (!nav) return;

  const pills = [
    { key: 'all', label: 'Toutes' },
    ...allCategories.map((c) => ({ key: c.name_en, label: localizedField(c, 'name') })),
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
    <button class="story-card group relative rounded-xl overflow-hidden border border-navy-line bg-navy-soft aspect-[9/16] text-left transition-transform active:scale-[0.97]">
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
      : allStories.filter((s) => s.category === activeCategory);

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
  loadHomeData();
}

/* ---------- Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initHome();
});
