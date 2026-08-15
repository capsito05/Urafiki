import { createClient } from '@supabase/supabase-js';

function sanitizeUrl(raw: string | undefined): string {
  if (!raw) return '';
  // Enlève les espaces et guillemets accidentels, et la barre oblique finale
  // qui provoque des erreurs "Invalid path specified in request URL" côté Supabase.
  return raw.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
}

function sanitizeKey(raw: string | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Variables d'environnement Supabase manquantes. Copie .env.example vers .env et renseigne VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
  );
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  // eslint-disable-next-line no-console
  console.warn(
    `VITE_SUPABASE_URL ne ressemble pas à une URL de projet Supabase valide (attendu: https://xxxxx.supabase.co). Valeur actuelle : "${supabaseUrl}"`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
