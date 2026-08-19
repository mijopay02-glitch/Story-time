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

/* ---------- Langue / i18n ---------- */

const LANG_STORAGE_KEY = 'mijo_story_lang';
const SUPPORTED_LANGS = ['fr', 'en', 'es'];

const I18N = {
  fr: {
    filter_all: 'Toutes',
    loading: 'Chargement des histoires…',
    error_title: 'Impossible de charger les histoires',
    error_msg: 'Vérifiez votre connexion internet et réessayez.',
    retry: 'Réessayer',
    empty_title: 'Aucune histoire ici',
    empty_msg: "Cette catégorie ne contient pas encore d'histoire.",
    premium_badge: 'Premium',
    premium_lock_title: 'Histoire réservée aux membres',
    premium_lock_body: 'Débloquez la suite et toutes les histoires premium de MIJO Story.',
    unlock_btn: "Débloquer l'histoire",
    premium_modal_title: 'Bientôt disponible',
    premium_modal_body: 'Le contenu premium et les paiements arrivent prochainement. Revenez bientôt !',
    premium_modal_ok: 'Compris',
    lang_select_prompt: 'Choisissez votre langue',
  },
  en: {
    filter_all: 'All',
    loading: 'Loading stories…',
    error_title: 'Unable to load stories',
    error_msg: 'Check your internet connection and try again.',
    retry: 'Retry',
    empty_title: 'No stories here',
    empty_msg: "This category doesn't have any stories yet.",
    premium_badge: 'Premium',
    premium_lock_title: 'Members-only story',
    premium_lock_body: 'Unlock the rest and all of MIJO Story\'s premium stories.',
    unlock_btn: 'Unlock story',
    premium_modal_title: 'Coming soon',
    premium_modal_body: 'Premium content and payments are coming soon. Check back!',
    premium_modal_ok: 'Got it',
    lang_select_prompt: 'Choose your language',
  },
  es: {
    filter_all: 'Todas',
    loading: 'Cargando historias…',
    error_title: 'No se pudieron cargar las historias',
    error_msg: 'Verifica tu conexión a internet e inténtalo de nuevo.',
    retry: 'Reintentar',
    empty_title: 'No hay historias aquí',
    empty_msg: 'Esta categoría todavía no tiene historias.',
    premium_badge: 'Premium',
    premium_lock_title: 'Historia solo para miembros',
    premium_lock_body: 'Desbloquea el resto y todas las historias premium de MIJO Story.',
    unlock_btn: 'Desbloquear historia',
    premium_modal_title: 'Próximamente',
    premium_modal_body: 'El contenido premium y los pagos llegarán pronto. ¡Vuelve pronto!',
    premium_modal_ok: 'Entendido',
    lang_select_prompt: 'Elige tu idioma',
  },
};

function getStoredLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return SUPPORTED_LANGS.includes(stored) ? stored : null;
}

let APP_LANG = getStoredLang() || 'fr';

function t(key) {
  return (I18N[APP_LANG] && I18N[APP_LANG][key]) || I18N.fr[key] || key;
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

// Rafraîchit uniquement le texte du lecteur (titre, catégorie, paragraphes)
// sans relancer l'audio d'ambiance ni fermer/rouvrir la vue.
function refreshReaderLanguage() {
  if (!currentReaderStory) return;
  const story = currentReaderStory;
  const category = categoryFor(story);

  const titleEl = document.getElementById('reader-title');
  if (titleEl) titleEl.textContent = localizedField(story, 'title');

  const categoryEl = document.getElementById('reader-category');
  if (categoryEl) categoryEl.textContent = category ? localizedField(category, 'name') : '';

  renderParagraphs(document.getElementById('reader-text-1'), localizedField(story, 'text_1'));
  renderParagraphs(document.getElementById('reader-text-2'), localizedField(story, 'text_2'));
}

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  APP_LANG = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyStaticTranslations();
  renderCategoryFilters();
  renderStoriesGrid();
  refreshReaderLanguage();
}

function showLanguageModal({ mandatory }) {
  const modal = document.getElementById('lang-modal');
  const closeBtn = document.getElementById('lang-close-btn');
  if (!modal) return;

  if (closeBtn) closeBtn.classList.toggle('hidden', mandatory);
  if (closeBtn) closeBtn.classList.toggle('flex', !mandatory);

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.dataset.mandatory = mandatory ? 'true' : 'false';
}

function hideLanguageModal() {
  const modal = document.getElementById('lang-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function initLanguage() {
  const modal = document.getElementById('lang-modal');
  const closeBtn = document.getElementById('lang-close-btn');
  const settingsBtn = document.getElementById('lang-settings-btn');

  if (modal) {
    modal.querySelectorAll('.lang-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wasMandatory = modal.dataset.mandatory === 'true';
        setLang(btn.dataset.lang);
        hideLanguageModal();
        if (wasMandatory) initHome();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal && modal.dataset.mandatory !== 'true') hideLanguageModal();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', hideLanguageModal);
  if (settingsBtn) settingsBtn.addEventListener('click', () => showLanguageModal({ mandatory: false }));
}

/* ---------- Accueil : catégories + histoires ---------- */

let allCategories = [];
let allStories = [];
let activeCategory = 'all';
let favoriteStoryIds = new Set();

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

async function fetchFavorites() {
  if (!supabaseClient || !currentProfile) return [];
  const { data, error } = await supabaseClient
    .from('favorites')
    .select('story_id')
    .eq('user_id', currentProfile.id);
  if (error) {
    console.warn('[MIJO Story] Impossible de charger les favoris :', error);
    return [];
  }
  return (data || []).map((row) => String(row.story_id));
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
    { key: 'all', label: t('filter_all') },
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

function heartIcon(filled) {
  return filled
    ? `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 text-rose-400" fill="currentColor"><path d="M12 21s-6.7-4.35-9.33-8.2C1.02 10.28 1.9 6.7 5.1 5.6c2-.7 3.9.1 4.9 1.7 1-1.6 2.9-2.4 4.9-1.7 3.2 1.1 4.08 4.68 2.43 7.2C18.7 16.65 12 21 12 21z"/></svg>`
    : `<svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.7-4.35-9.33-8.2C1.02 10.28 1.9 6.7 5.1 5.6c2-.7 3.9.1 4.9 1.7 1-1.6 2.9-2.4 4.9-1.7 3.2 1.1 4.08 4.68 2.43 7.2C18.7 16.65 12 21 12 21z"/></svg>`;
}

function storyCardTemplate(story) {
  const title = localizedField(story, 'title');
  const isFav = favoriteStoryIds.has(String(story.id));
  return `
    <div class="relative">
      <button
        data-story-id="${story.id}"
        class="story-card group relative rounded-xl overflow-hidden border border-navy-line bg-navy-soft aspect-[2/3] text-left w-full"
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
            ? `<span class="absolute top-2 right-2 bg-gold text-navy text-[10px] font-display font-bold px-2 py-0.5 rounded-full shadow">${t('premium_badge')}</span>`
            : ''
        }
        <div class="absolute bottom-0 left-0 right-0 p-2.5">
          <p class="font-display text-sm font-semibold leading-snug text-[color:var(--text-primary)] line-clamp-2">${title}</p>
        </div>
      </button>

      <button
        class="favorite-btn absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-navy/70 backdrop-blur border border-navy-line flex items-center justify-center text-[color:var(--text-primary)] transition-colors ${
          isFav ? 'border-rose-400/60' : ''
        }"
        data-story-id="${story.id}"
        aria-label="Ajouter aux favoris"
      >${heartIcon(isFav)}</button>
    </div>`;
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
  if (msg) msg.textContent = t('error_msg');

  try {
    const [categories, stories, favorites] = await Promise.all([
      fetchCategories(),
      fetchStories(),
      fetchFavorites(),
    ]);
    allCategories = categories;
    allStories = stories;
    favoriteStoryIds = new Set(favorites);
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
      const favBtn = e.target.closest('.favorite-btn');
      if (favBtn) {
        toggleFavorite(favBtn.dataset.storyId);
        return;
      }
      const card = e.target.closest('.story-card');
      if (!card) return;
      const story = allStories.find((s) => String(s.id) === card.dataset.storyId);
      if (story) openReader(story);
    });
  }

  loadHomeData();
}

/* ---------- Favoris ---------- */

function syncFavoriteButtons(storyId) {
  const id = String(storyId);
  const isFav = favoriteStoryIds.has(id);

  document.querySelectorAll(`.favorite-btn[data-story-id="${id}"]`).forEach((btn) => {
    btn.innerHTML = heartIcon(isFav);
    btn.classList.toggle('border-rose-400/60', isFav);
  });

  const readerBtn = document.getElementById('reader-favorite-btn');
  if (readerBtn && readerBtn.dataset.storyId === id) {
    readerBtn.innerHTML = heartIcon(isFav);
    readerBtn.classList.toggle('border-rose-400/60', isFav);
  }
}

async function toggleFavorite(storyId) {
  if (!currentProfile) return;
  const id = String(storyId);
  const wasFav = favoriteStoryIds.has(id);

  // Mise à jour optimiste de l'UI, avant même la réponse du serveur.
  if (wasFav) favoriteStoryIds.delete(id);
  else favoriteStoryIds.add(id);
  syncFavoriteButtons(id);

  if (!supabaseClient) return; // mode démo : reste local tant que Supabase n'est pas configuré

  try {
    if (wasFav) {
      const { error } = await supabaseClient
        .from('favorites')
        .delete()
        .eq('user_id', currentProfile.id)
        .eq('story_id', id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from('favorites')
        .insert({ user_id: currentProfile.id, story_id: id });
      if (error) throw error;
    }
  } catch (err) {
    console.error('[MIJO Story] Erreur lors de la mise à jour des favoris :', err);
    // Retour en arrière si l'écriture serveur échoue
    if (wasFav) favoriteStoryIds.add(id);
    else favoriteStoryIds.delete(id);
    syncFavoriteButtons(id);
  }
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

  const favBtn = document.getElementById('reader-favorite-btn');
  if (favBtn) {
    favBtn.dataset.storyId = String(story.id);
    const isFav = favoriteStoryIds.has(String(story.id));
    favBtn.innerHTML = heartIcon(isFav);
    favBtn.classList.toggle('border-rose-400/60', isFav);
  }

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
  if (backBtn) backBtn.addEventListener('click', handleReaderBack);

  const favBtn = document.getElementById('reader-favorite-btn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      if (favBtn.dataset.storyId) toggleFavorite(favBtn.dataset.storyId);
    });
  }

  const ambientBtn = document.getElementById('ambient-toggle-btn');
  if (ambientBtn) ambientBtn.addEventListener('click', toggleAmbient);

  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) unlockBtn.addEventListener('click', openUpgradeModal);

  initUpgradeModal();
}

function handleReaderBack() {
  // Publicité interstitielle retirée. Le retour ferme directement le
  // lecteur — pour la réintroduire plus tard, réinsérer ici un appel à un
  // éventuel showInterstitialAd(() => closeReader()).
  closeReader();
}

/* ---------- Pop-up Premium : "bientôt disponible" ----------
 * Le paiement réel (Google Play Billing) n'est pas branché pour l'instant.
 * Toute la structure reste en place pour l'activer plus tard :
 *   1. Réintroduire le formulaire/bouton de paiement dans le modal HTML.
 *   2. Remplacer le corps de openUpgradeModal() ci-dessous par l'ouverture
 *      du vrai flux de paiement, en s'appuyant sur triggerGooglePayment()
 *      et un Worker de vérification serveur (voir verify-premium-worker.js
 *      fourni précédemment) — NE JAMAIS accorder le premium côté client
 *      sans vérification serveur.
 */

function openUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function initUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  const closeBtn = document.getElementById('upgrade-close-btn');
  const okBtn = document.getElementById('upgrade-ok-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeUpgradeModal);
  if (okBtn) okBtn.addEventListener('click', closeUpgradeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeUpgradeModal();
    });
  }
}

/* ---------- Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initLanguage();
  initReader();

  if (getStoredLang()) {
    applyStaticTranslations();
    initHome();
  } else {
    // Premier lancement : on force le choix de la langue avant de charger
    // le contenu. initHome() est déclenché juste après la sélection (voir
    // initLanguage()).
    showLanguageModal({ mandatory: true });
  }
});
