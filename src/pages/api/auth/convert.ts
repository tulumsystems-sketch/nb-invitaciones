import type { APIRoute } from 'astro';

/**
 * Convierte la sesión anónima actual en una cuenta real (email + contraseña)
 * conservando el mismo `user.id` y todos los borradores asociados a `owner_id`.
 * Confirmación de email desactivada en el piloto.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { supabase, user } = locals;

  if (!user) {
    return redirect('/registro?error=' + encodeURIComponent('No hay una sesión activa para guardar.'));
  }

  const formData = await request.formData();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const fullName = formData.get('full_name')?.toString().trim();
  const returnTo = formData.get('return_to')?.toString() || '/mis-invitaciones';

  if (!email || !password || password.length < 6) {
    return redirect(
      '/registro?error=' + encodeURIComponent('Ingresá un correo válido y contraseña de al menos 6 caracteres.')
    );
  }

  const { data, error } = await supabase.auth.updateUser({
    email,
    password,
    data: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    console.error('[POST /api/auth/convert] Error:', error.message);
    return redirect('/registro?error=' + encodeURIComponent(error.message));
  }

  // Sincronizar full_name en profiles si se envió
  if (data.user && fullName) {
    await supabase
      .from('profiles')
      .upsert({ id: data.user.id, full_name: fullName }, { onConflict: 'id' });
  }

  const safeRedirect = returnTo.startsWith('/') ? returnTo : '/mis-invitaciones';
  return redirect(safeRedirect);
};