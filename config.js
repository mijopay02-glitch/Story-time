/**
 * Configuration Supabase — MIJO Story
 * Remplacez les deux valeurs ci-dessous par les vôtres
 * (Project Settings > API dans votre dashboard Supabase).
 */
const SUPABASE_CONFIG = {
  url: 'https://VOTRE-PROJET.supabase.co',   // <- SUPABASE_URL
  anonKey: 'VOTRE_CLE_ANON_PUBLIQUE',        // <- SUPABASE_ANON_KEY
};

const isConfigPlaceholder =
  SUPABASE_CONFIG.url.includes('VOTRE-PROJET') ||
  SUPABASE_CONFIG.anonKey.includes('VOTRE_CLE');

let supabaseClient = null;

if (!isConfigPlaceholder && window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
  } catch (err) {
    console.warn('[MIJO Story] Échec de connexion à Supabase :', err);
  }
} else {
  console.info(
    '[MIJO Story] Clés Supabase non configurées — remplissez config.js pour activer la connexion.'
  );
}
