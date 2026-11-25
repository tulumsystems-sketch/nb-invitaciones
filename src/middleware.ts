import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient, checkIsAdmin } from './lib/supabase';

// Rutas que exigen una cuenta real (no anónima)
const ACCOUNT_PROTECTED_PREFIXES = ['/mis-invitaciones', '/publicar'];
// Rutas exclusivas de administración
const ADMIN_PROTECTED_PREFIXES = ['/admin'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;
  const supabase = createSupabaseServerClient(request, cookies);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAnonymous = Boolean(user?.is_anonymous);
  const isAdmin = user && !isAnonymous ? await checkIsAdmin(supabase, user.id) : false;

  locals.supabase = supabase;
  locals.user = user ?? null;
  locals.isAnonymous = isAnonymous;
  locals.isAdmin = isAdmin;

  const pathname = url.pathname;

  // Proteger /admin (requiere usuario real + fila en tabla admins)
  if (ADMIN_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user) {
      return redirect('/login?error=' + encodeURIComponent('Iniciá sesión para acceder al panel admin.'));
    }
    if (!isAdmin) {
      return redirect('/mis-invitaciones?error=' + encodeURIComponent('No tenés permisos de administrador.'));
    }
  }

  // Proteger /mis-invitaciones y /publicar (requiere cuenta real, no invitado anónimo)
  if (ACCOUNT_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user || isAnonymous) {
      return redirect('/login?error=' + encodeURIComponent('Creá o iniciá tu cuenta para ver tus invitaciones.'));
    }
  }

  return next();
});