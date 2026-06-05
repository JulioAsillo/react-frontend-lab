"use client";

/**
 * authHash — verificación de contraseñas con PBKDF2 (Web Crypto API).
 *
 * En el frontend NO se guarda la contraseña, solo el resultado de derivarla:
 *   PBKDF2(password, salt, iterations, SHA-256) → 256 bits (hex).
 * La "semilla" (la contraseña real) solo la conoce la persona con acceso.
 *
 * IMPORTANTE — alcance de seguridad: esto ofusca la credencial y resiste fuerza
 * bruta offline mucho mejor que SHA256 simple, pero la verificación ocurre en el
 * cliente; la seguridad real solo existe cuando valida el backend. Úsese contra-
 * señas largas y aleatorias para que el hash en el bundle no sea crackeable.
 *
 * Requiere contexto seguro (https) o localhost para que crypto.subtle exista.
 */

const enc = new TextEncoder();

function hexFromBuf(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function bufFromHex(hex) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}

const DEFAULT_ITERATIONS = 150000;

/** Deriva el hash hex de una contraseña con PBKDF2-SHA256. */
export async function pbkdf2Hex(password, saltHex, iterations = DEFAULT_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: bufFromHex(saltHex), iterations, hash: "SHA-256" },
    key, 256
  );
  return hexFromBuf(bits);
}

/** Verifica una contraseña contra una credencial { salt, hash, iterations }. */
export async function verifyPassword(password, cred) {
  if (!cred || !cred.hash || !cred.salt) return false;
  const h = await pbkdf2Hex(password, cred.salt, cred.iterations || DEFAULT_ITERATIONS);
  // Comparación de tiempo constante (evita timing attacks triviales).
  if (h.length !== cred.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ cred.hash.charCodeAt(i);
  return diff === 0;
}

/**
 * Genera una credencial { salt, hash, iterations } para una contraseña dada.
 * Úsese para PRODUCIR los valores que se pegan en authStore (no se usa en runtime
 * de login). La sal es aleatoria de 16 bytes.
 */
export async function generateCredential(password, iterations = DEFAULT_ITERATIONS) {
  const saltHex = hexFromBuf(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2Hex(password, saltHex, iterations);
  return { salt: saltHex, hash, iterations };
}
