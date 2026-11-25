import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;
  const id = params.id?.trim();

  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sesión no iniciada.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!id) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Falta el ID de la invitación.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verificar existencia y propiedad antes de borrar
  const { data: existing, error: fetchErr } = await supabase
    .from('invitations')
    .select('id, owner_id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invitación no encontrada o sin permisos.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Intentar limpiar archivos en Storage bajo `<user.id>/<invitation.id>` si existen
  const adminClient = getAdminClient();
  if (adminClient) {
    try {
      const folderPath = `${user.id}/${existing.id}`;
      const { data: files } = await adminClient.storage.from('invitations').list(folderPath);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${folderPath}/${f.name}`);
        await adminClient.storage.from('invitations').remove(paths);
      }
    } catch {
      // No bloqueamos el borrado del registro si la carpeta de Storage está vacía o no existe
    }
  }

  const { error: deleteErr } = await supabase
    .from('invitations')
    .delete()
    .eq('id', existing.id)
    .eq('owner_id', user.id);

  if (deleteErr) {
    console.error('[DELETE /api/invitations/[id]] Error:', deleteErr.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo borrar la invitación.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ ok: true, deletedId: existing.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};