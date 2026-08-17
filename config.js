/**
 * Configuration Supabase — MIJO Story
 * Remplacez les deux valeurs ci-dessous par les vôtres
 * (Project Settings > API dans votre dashboard Supabase).
 */
const SUPABASE_CONFIG = {
  url: 'https://xfpmlemgmakdufxmomwq.supabase.co',   // <- SUPABASE_URL
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcG1sZW1nbWFrZHVmeG1vbXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mjk1NDgsImV4cCI6MjEwMjQwNTU0OH0.QM4VYFOmrqPssPBgBcq5ruwu8ZwuPj0mrdqvR8ibJ-0',        // <- SUPABASE_ANON_KEY
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
