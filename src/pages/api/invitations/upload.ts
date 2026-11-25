import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'invitations';
const ALLOWED_SLOTS = new Set(['cover', 'gallery', 'closing']);
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getAdminStorageClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sesión no iniciada.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const adminClient = getAdminStorageClient();
  if (!adminClient) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const formData = await request.formData();
  const draftId = formData.get('draftId')?.toString().trim();
  const slot = formData.get('slot')?.toString().trim() || 'gallery';
  const file = formData.get('file');

  if (!draftId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Primero guardá el borrador antes de subir fotos.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!ALLOWED_SLOTS.has(slot)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Tipo de foto inválido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!(file instanceof File)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No se recibió ningún archivo.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Formato inválido (solo JPG, PNG o WEBP).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verificar que el borrador pertenezca al usuario actual
  const { data: invitation, error: invErr } = await supabase
    .from('invitations')
    .select('id, owner_id, data')
    .eq('id', draftId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (invErr || !invitation) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Borrador no encontrado o sin permisos.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Leer topes de fotos configurados en public.settings
  const { data: limitRow } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'photo_limits')
    .maybeSingle();

  const limits = {
    cover: typeof limitRow?.value?.cover === 'number' ? limitRow.value.cover : 1,
    gallery: typeof limitRow?.value?.gallery === 'number' ? limitRow.value.gallery : 6,
    closing: typeof limitRow?.value?.closing === 'number' ? limitRow.value.closing : 1,
    maxMb: typeof limitRow?.value?.max_mb === 'number' ? limitRow.value.max_mb : 5,
  };

  const fileSizeMb = file.size / (1024 * 1024);
  if (fileSizeMb > limits.maxMb) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: `La imagen comprimida pesa ${fileSizeMb.toFixed(1)} MB y supera el tope de ${limits.maxMb} MB.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawData =
    invitation.data && typeof invitation.data === 'object'
      ? (invitation.data as Record<string, unknown>)
      : {};

  const rawPhotos =
    rawData.photos && typeof rawData.photos === 'object'
      ? (rawData.photos as { cover?: string | null; gallery?: string[]; closing?: string | null })
      : {};

  const currentPhotos = {
    cover: typeof rawPhotos.cover === 'string' ? rawPhotos.cover : null,
    gallery: Array.isArray(rawPhotos.gallery) ? rawPhotos.gallery : [],
    closing: typeof rawPhotos.closing === 'string' ? rawPhotos.closing : null,
  };

  const existingTotal =
    (currentPhotos.cover ? 1 : 0) +
    currentPhotos.gallery.length +
    (currentPhotos.closing ? 1 : 0);

  const isReplacingCover = slot === 'cover' && Boolean(currentPhotos.cover);
  const isReplacingClosing = slot === 'closing' && Boolean(currentPhotos.closing);

  if (existingTotal >= 8 && !isReplacingCover && !isReplacingClosing) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Alcanzaste el máximo de 8 fotos por invitación.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (slot === 'gallery' && currentPhotos.gallery.length >= limits.gallery) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Alcanzaste el máximo de ${limits.gallery} fotos en la galería.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${user.id}/${invitation.id}/${slot}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    console.error('[POST /api/invitations/upload] Error Storage:', uploadErr.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo subir la imagen a Supabase Storage.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: publicUrlData } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  const publicUrl = publicUrlData.publicUrl;

  const updatedPhotos = {
    cover: slot === 'cover' ? publicUrl : currentPhotos.cover,
    gallery: slot === 'gallery' ? [...currentPhotos.gallery, publicUrl] : currentPhotos.gallery,
    closing: slot === 'closing' ? publicUrl : currentPhotos.closing,
  };

  const mergedData = {
    ...rawData,
    photos: updatedPhotos,
  };

  const { error: updateErr } = await supabase
    .from('invitations')
    .update({ data: mergedData, updated_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .eq('owner_id', user.id);

  if (updateErr) {
    console.error('[POST /api/invitations/upload] Error guardando URL en borrador:', updateErr.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'La foto subió pero no se pudo guardar en el borrador.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, slot, url: publicUrl, photos: updatedPhotos }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};