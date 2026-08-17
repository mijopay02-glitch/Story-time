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
// Fonction utilitaire pour retirer les accents et les espaces
function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Retire tous les accents (é, è, à -> e, e, a)
}

function categoryFor(story) {
  if (!story || !allCategories.length) return null;

  // On récupère le nom depuis la colonne "category"
  const raw = story.category;
  if (!raw) return null;

  // On nettoie le mot de l'histoire (ex: "Comédie " -> "comedie")
  const normalizedTarget = normalizeString(raw);

  // On cherche la correspondance dans les catégories en nettoyant aussi
  const byName = allCategories.find((c) => {
    const fr = normalizeString(c.name_fr);
    const en = normalizeString(c.name_en);
    const es = normalizeString(c.name_es);
    return fr === normalizedTarget || en === normalizedTarget || es === normalizedTarget;
  });

  if (!byName) {
    console.warn(`[MIJO Story] Impossible de lier l'histoire. "${raw}" ne correspond à aucune catégorie de ta base.`);
  }

  return byName || null;
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
        class="story-card group relative rounded-xl overflow-hidden border border-navy-line bg-navy-soft aspect-[9/16] text-left transition-transform active:scale-[0.97] w-full"
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
  if (msg) msg.textContent = 'Vérifiez votre connexion internet et réessayez.';

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
  initAdInterstitial();
}

/* ---------- Publicité interstitielle (déclenchée par "Retour") ---------- */

function showInterstitialAd(onDismiss) {
  const overlay = document.getElementById('ad-interstitial');
  const closeBtn = document.getElementById('ad-close-btn');
  const countdownEl = document.getElementById('ad-countdown');

  if (!overlay || !closeBtn || !countdownEl) {
    onDismiss();
    return;
  }

  let remaining = 3 + Math.floor(Math.random() * 3); // 3 à 5 secondes
  closeBtn.disabled = true;
  countdownEl.textContent = `Fermeture dans ${remaining}s`;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      closeBtn.disabled = false;
      countdownEl.textContent = 'Vous pouvez fermer';
    } else {
      countdownEl.textContent = `Fermeture dans ${remaining}s`;
    }
  }, 1000);

  function handleClose() {
    clearInterval(timer);
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    closeBtn.removeEventListener('click', handleClose);
    onDismiss();
  }

  closeBtn.addEventListener('click', handleClose);
}

function initAdInterstitial() {
  // Rien à initialiser ici pour l'instant : showInterstitialAd() attache et
  // détache elle-même son écouteur à chaque affichage.
}

function handleReaderBack() {
  showInterstitialAd(() => closeReader());
}

/* ---------- Pop-up Upgrade Premium + paiement Google (simulation) ---------- */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function openUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  const emailInput = document.getElementById('upgrade-email-input');
  const errorEl = document.getElementById('upgrade-error');
  if (!modal) return;

  if (emailInput) emailInput.value = currentProfile.email || '';
  if (errorEl) errorEl.classList.add('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Simule le déclenchement du paiement Google (Google Pay côté web, ou Play
// Billing côté TWA/app native). En production, remplacez ce corps par :
//  - Web : chargez https://pay.google.com/gp/p/js/pay.js, créez un
//    google.payments.api.PaymentsClient, puis appelez
//    client.loadPaymentData(paymentRequest).
//  - App Android (TWA/native) : appelez la Google Play Billing Library
//    (BillingClient.launchBillingFlow) via le pont JS<->Android.
async function triggerGooglePayment() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, transactionId: `SIMU-${Date.now()}` });
    }, 1500);
  });
}

async function activatePremiumAccount(email) {
  localStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
  currentProfile.email = email;
  saveProfile(currentProfile);

  if (currentReaderStory) updatePremiumLock(currentReaderStory);

  if (!supabaseClient) return; // mode démo sans Supabase configuré

  const { error } = await supabaseClient
    .from('users')
    .upsert(
      { id: currentProfile.id, pseudo: currentProfile.pseudo, email, is_premium: true },
      { onConflict: 'id' }
    );
  if (error) console.error('[MIJO Story] Erreur mise à jour utilisateur premium :', error);
}

async function handleGooglePayClick() {
  const emailInput = document.getElementById('upgrade-email-input');
  const errorEl = document.getElementById('upgrade-error');
  const btn = document.getElementById('google-pay-btn');
  const label = document.getElementById('google-pay-label');
  if (!emailInput || !errorEl || !btn || !label) return;

  const email = emailInput.value.trim();
  if (!isValidEmail(email)) {
    errorEl.textContent = 'Veuillez saisir une adresse email valide.';
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');

  btn.disabled = true;
  label.textContent = 'Traitement du paiement…';

  try {
    const payment = await triggerGooglePayment();
    if (!payment.success) throw new Error('Paiement refusé');

    await activatePremiumAccount(email);

    label.textContent = 'Paiement réussi';
    setTimeout(() => {
      closeUpgradeModal();
      btn.disabled = false;
      label.textContent = 'Payer avec Google Pay';
    }, 700);
  } catch (err) {
    console.error('[MIJO Story] Erreur de paiement :', err);
    errorEl.textContent = 'Le paiement a échoué. Réessayez.';
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    label.textContent = 'Payer avec Google Pay';
  }
}

function initUpgradeModal() {
  const modal = document.getElementById('upgrade-modal');
  const closeBtn = document.getElementById('upgrade-close-btn');
  const payBtn = document.getElementById('google-pay-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeUpgradeModal);
  if (payBtn) payBtn.addEventListener('click', handleGooglePayClick);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeUpgradeModal();
    });
  }
}

/* ---------- Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initHome();
  initReader();
});
