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

/* ---------- Statut du socle (Tailwind / Supabase / Profil) ---------- */

function initStatusPanel() {
  const supabaseStatusEl = document.getElementById('status-supabase');
  if (!supabaseStatusEl) return;

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    supabaseStatusEl.textContent = 'Connecté';
    supabaseStatusEl.classList.add('text-emerald-400');
  } else {
    supabaseStatusEl.textContent = 'Clés non configurées';
    supabaseStatusEl.classList.add('text-amber-400');
  }

  const uuidEl = document.getElementById('status-uuid');
  if (uuidEl) uuidEl.textContent = currentProfile.id;
}

/* ---------- Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initStatusPanel();
});
