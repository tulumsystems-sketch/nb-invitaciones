import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Crea un cliente de Supabase vinculado al request y a las cookies de Astro.
 * Se usa exclusivamente en el servidor (middleware, páginas SSR y endpoints /api/*).
 */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el entorno.');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('Cookie') ?? '';
        return parseCookieHeader(cookieHeader).map((c) => ({
          name: c.name,
          value: c.value ?? '',
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            ...options,
          });
          // Garantiza que la cookie salga en la respuesta aunque Astro ya haya leído headers
          const serialized = serializeCookieHeader(name, value, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            ...options,
          });
          request.headers.append('x-astro-set-cookie', serialized);
        });
      },
    },
  });
}

/**
 * Consulta la tabla `admins` para saber si el usuario autenticado tiene rol admin.
 */
export async function checkIsAdmin(
  supabase: ReturnType<typeof createServerClient>,
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[checkIsAdmin] Error consultando admins:', error.message);
    return false;
  }

  return Boolean(data);
}