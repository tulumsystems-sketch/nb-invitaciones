import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export interface MusicTrackItem {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
  mood: string | null;
}

const FALLBACK_TRACKS: MusicTrackItem[] = [
  {
    id: 'demo-piano-sereno',
    title: 'Amanecer en Piano',
    artist: 'Biblioteca NB',
    file_url: '',
    mood: 'Romántico / Clásico',
  },
  {
    id: 'demo-acustico-suave',
    title: 'Brisa Acústica',
    artist: 'Biblioteca NB',
    file_url: '',
    mood: 'Minimalista / Cálido',
  },
  {
    id: 'demo-celebracion-luz',
    title: 'Luz de Fiesta',
    artist: 'Biblioteca NB',
    file_url: '',
    mood: 'Alegre / Celebración',
  },
];

export const GET: APIRoute = async ({ locals }) => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  const client =
    url && serviceKey
      ? createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : locals.supabase;

  try {
    const { data, error } = await client
      .from('music_tracks')
      .select('id, title, artist, file_url, mood')
      .eq('active', true)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return new Response(JSON.stringify({ ok: true, tracks: data, source: 'database' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Si la tabla todavía no tiene filas, devolvemos pistas de referencia para la demo
  }

  return new Response(JSON.stringify({ ok: true, tracks: FALLBACK_TRACKS, source: 'fallback' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};