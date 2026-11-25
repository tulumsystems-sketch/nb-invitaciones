import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const fullName = formData.get('full_name')?.toString().trim();

  if (!email || !password) {
    return redirect('/registro?error=' + encodeURIComponent('El correo y la contraseña son obligatorios.'));
  }

  const { error } = await locals.supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error) {
    console.error('[POST /api/auth/signup] Error:', error.message);
    return redirect('/registro?error=' + encodeURIComponent(error.message));
  }

  return redirect('/mis-invitaciones');
};