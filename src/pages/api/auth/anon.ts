import type { APIRoute } from 'astro';
import { verifyTurnstileToken } from '../../../lib/turnstile';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const { supabase, user } = locals;

  // Si ya existe una sesión activa (anónima o registrada), devolvemos su estado actual
  if (user) {
    return new Response(
      JSON.stringify({
        ok: true,
        userId: user.id,
        isAnonymous: Boolean(user.is_anonymous),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { turnstileToken?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Si viene vacío en entorno sin Turnstile configurado, se maneja abajo
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    clientAddress ||
    null;

  const validCaptcha = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!validCaptcha) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Verificación anti-bot inválida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.error('[POST /api/auth/anon] Error:', error?.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo iniciar la sesión de invitado.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Leer tope de borradores para invitado desde settings (default 2)
  const { data: settingRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'draft_limits')
    .maybeSingle();

  const maxGuestDrafts =
    typeof settingRow?.value?.guest === 'number' ? settingRow.value.guest : 2;

  return new Response(
    JSON.stringify({
      ok: true,
      userId: data.user.id,
      isAnonymous: true,
      maxDrafts: maxGuestDrafts,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};