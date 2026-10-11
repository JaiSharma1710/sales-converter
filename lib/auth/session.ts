import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sales_converter_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthStatus = "authenticated" | "unauthenticated" | "misconfigured";

function getPassword() {
  return process.env.APP_PASSWORD || null;
}

// Sessions are signed with a key derived from the password, so changing
// APP_PASSWORD signs everyone out.
function sign(value: string, password: string) {
  const key = createHash("sha256")
    .update(`sales-converter-session:${password}`)
    .digest();

  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();

  return timingSafeEqual(aHash, bHash);
}

export function isPasswordCorrect(candidate: string) {
  const password = getPassword();

  return password !== null && safeEqual(candidate, password);
}

export function createSessionToken() {
  const password = getPassword();

  if (!password) {
    throw new Error("APP_PASSWORD is not set.");
  }

  const expiresAt = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  return `${expiresAt}.${sign(expiresAt, password)}`;
}

function isValidSessionToken(token: string, password: string) {
  const [expiresAt, signature] = token.split(".");

  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) {
    return false;
  }

  return safeEqual(signature, sign(expiresAt, password));
}

export async function getAuthStatus(): Promise<AuthStatus> {
  // Read the cookie before anything else: it marks the calling page as
  // request-time, so env checks below are never baked in at build time.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const password = getPassword();

  if (!password) {
    // Local development works without a password; production must set one.
    return process.env.NODE_ENV === "production"
      ? "misconfigured"
      : "authenticated";
  }

  return token && isValidSessionToken(token, password)
    ? "authenticated"
    : "unauthenticated";
}

export function isAuthRequired() {
  return getPassword() !== null;
}
