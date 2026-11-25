import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const formData = await request.formData();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return redirect('/login?error=' + encodeURIComponent('El correo y la contraseña son obligatorios.'));
  }

  const { error } = await locals.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect('/login?error=' + encodeURIComponent(error.message));
  }

  return redirect('/mis-invitaciones');
};