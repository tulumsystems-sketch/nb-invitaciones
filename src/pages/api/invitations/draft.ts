import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function generateSlug(title?: string): string {
  const base = (title || 'evento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || 'invitacion'}-${suffix}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user, isAnonymous } = locals;

  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sesión no iniciada. Recargá la página.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let payload: {
    draftId?: string | null;
    event_type?: string;
    event_type_other?: string;
    wizard_step?: number;
    data?: Record<string, unknown>;
    style?: Record<string, unknown>;
  };

  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'JSON inválido en la solicitud.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const eventType = payload.event_type || 'otro';
  const eventTypeOther =
    eventType === 'otro' ? (payload.event_type_other || '').trim() || null : null;
  const wizardStep =
    typeof payload.wizard_step === 'number' && payload.wizard_step >= 1 && payload.wizard_step <= 9
      ? payload.wizard_step
      : 1;
  const contentData = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const styleData = payload.style && typeof payload.style === 'object' ? payload.style : {};

  // Si viene un draftId existente, verificamos propiedad y actualizamos
  if (payload.draftId) {
    const { data: existing, error: fetchErr } = await supabase
      .from('invitations')
      .select('id, slug, owner_id')
      .eq('id', payload.draftId)
      .maybeSingle();

    if (fetchErr || !existing || existing.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Borrador no encontrado o sin permisos.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from('invitations')
      .update({
        event_type: eventType,
        event_type_other: eventTypeOther,
        wizard_step: wizardStep,
        data: contentData,
        style: styleData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('owner_id', user.id)
      .select('id, slug, updated_at')
      .single();

    if (updateErr || !updated) {
      console.error('[POST /api/invitations/draft] Error actualizando:', updateErr?.message);
      return new Response(
        JSON.stringify({ ok: false, error: 'No se pudo actualizar el borrador.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, draftId: updated.id, slug: updated.slug, updatedAt: updated.updated_at }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Si es un borrador nuevo, validamos el tope según invitado o cuenta registrada
  const serviceClient = createServiceClient() ?? supabase;
  const { data: limitSetting } = await serviceClient
    .from('settings')
    .select('value')
    .eq('key', 'draft_limits')
    .maybeSingle();

  const maxDrafts = isAnonymous
    ? typeof limitSetting?.value?.guest === 'number'
      ? limitSetting.value.guest
      : 2
    : typeof limitSetting?.value?.user === 'number'
      ? limitSetting.value.user
      : 10;

  const { count, error: countErr } = await supabase
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'draft');

  if (!countErr && typeof count === 'number' && count >= maxDrafts) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Alcanzaste el límite de ${maxDrafts} borradores permitidos para tu cuenta.`,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const titleHint = typeof contentData.title === 'string' ? contentData.title : undefined;
  const slug = generateSlug(titleHint);
  const rawDate = typeof contentData.event_date === 'string' && contentData.event_date ? contentData.event_date : null;

  const { data: created, error: insertErr } = await supabase
    .from('invitations')
    .insert({
      owner_id: user.id,
      slug,
      status: 'draft',
      event_type: eventType,
      event_type_other: eventTypeOther,
      wizard_step: wizardStep,
      event_date: rawDate,
      data: contentData,
      style: styleData,
    })
    .select('id, slug, updated_at')
    .single();

  if (insertErr || !created) {
    console.error('[POST /api/invitations/draft] Error creando:', insertErr?.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo guardar el borrador en la base de datos.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, draftId: created.id, slug: created.slug, updatedAt: created.updated_at }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};