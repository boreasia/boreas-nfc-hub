/**
 * Sesión de /admin con cookie firmada, en vez de Basic Auth (prompt nativo del
 * navegador). Sigue siendo un solo administrador (Boreas) con las mismas
 * credenciales ADMIN_USER/ADMIN_PASSWORD de siempre — esto NO es un sistema
 * multi-usuario, solo cambia cómo se presenta y se recuerda el login.
 *
 * Portable a propósito entre dos runtimes distintos:
 *   - middleware.ts corre SIEMPRE en Edge Runtime en Next 14 (no hay opción
 *     `runtime: "nodejs"` para middleware), así que nada de `node:crypto` ni
 *     `Buffer` acá — solo Web Crypto (`crypto.subtle`) y `btoa`/`atob`, que
 *     existen como globals tanto en Edge Runtime como en Node 20+.
 *   - app/api/auth/login|logout corren en Node por defecto (route handlers
 *     normales), pero como usan las mismas funciones no hace falta duplicar
 *     nada ni mantener dos implementaciones.
 */

export const ADMIN_SESSION_COOKIE = "boreas_admin_session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

function getSecret(): string {
  // Sin ADMIN_SESSION_SECRET dedicado, firmamos con ADMIN_PASSWORD: quien ya
  // conoce esa contraseña tiene acceso completo de todos modos, así que no
  // suma un límite de confianza nuevo — pero en producción es mejor tener un
  // secreto propio (ver .env.example).
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  return atob(input.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(signature);
}

/**
 * Comparación en tiempo constante (no corta apenas encuentra una diferencia).
 * Evita que una diferencia de timing filtre, carácter por carácter, cuánto de
 * la contraseña/usuario/firma coincide. No sustituye un secreto robusto, pero
 * es gratis y buena práctica.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Crea el token de sesión (payload con expiración + firma HMAC-SHA256). */
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  const payload = base64url(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }));
  const signature = await hmacHex(payload, secret);
  return `${payload}.${signature}`;
}

/** Verifica firma + expiración. `false` ante cualquier problema (nunca lanza). */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = getSecret();
  if (!secret || !token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const expectedSignature = await hmacHex(payload, secret);
    if (!safeEqual(signature, expectedSignature)) return false;

    const { exp } = JSON.parse(base64urlDecode(payload)) as { exp?: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}
