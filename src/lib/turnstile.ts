/**
 * Valida el token de Cloudflare Turnstile en el servidor.
 * Si TURNSTILE_SECRET_KEY no está configurada en desarrollo local, permite pasar con aviso.
 */
export async function verifyTurnstileToken(token: string | null | undefined, remoteIp?: string | null): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (import.meta.env.DEV) {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY no definida en DEV; se omite validación.');
      return true;
    }
    return false;
  }

  if (!token || token.trim().length === 0) {
    return false;
  }

  try {
    const formBody = new URLSearchParams();
    formBody.append('secret', secretKey);
    formBody.append('response', token);
    if (remoteIp) {
      formBody.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    if (!res.ok) return false;
    const result = (await res.json()) as { success?: boolean };
    return Boolean(result.success);
  } catch (err) {
    console.error('[turnstile] Error verificando token:', err);
    return false;
  }
}