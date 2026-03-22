import { cookies } from "next/headers";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "orxoca_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getSessionSigningSecret(): string {
  const explicitSecret = process.env.APP_SESSION_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }
  const appPassword = process.env.APP_PASSWORD?.trim();
  if (!appPassword) {
    throw new Error("Falta APP_PASSWORD en variables de entorno.");
  }
  return `orxoca::${appPassword}`;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSigningSecret()).update(payload).digest("base64url");
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) {
    throw new Error("Falta APP_PASSWORD en variables de entorno.");
  }
  const provided = password.trim();
  const expectedBuffer = Buffer.from(expected, "utf-8");
  const providedBuffer = Buffer.from(provided, "utf-8");
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function createSessionToken(): string {
  const exp = nowSeconds() + SESSION_TTL_SECONDS;
  const payload = `${exp}.${randomUUID()}`;
  const payloadBase64 = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = signPayload(payload);
  return `${payloadBase64}.${signature}`;
}

export function invalidateSessionToken(_token: string): void {
  // Sesion stateless: se invalida removiendo cookie en logout.
}

export function isSessionTokenValid(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const payloadBase64 = parts[0];
  const providedSignature = parts[1];
  if (!payloadBase64 || !providedSignature) {
    return false;
  }
  let payload: string;
  try {
    payload = Buffer.from(payloadBase64, "base64url").toString("utf-8");
  } catch {
    return false;
  }

  const expectedSignature = signPayload(payload);
  const providedBuffer = Buffer.from(providedSignature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  const payloadParts = payload.split(".");
  if (payloadParts.length < 2) {
    return false;
  }
  const exp = Number(payloadParts[0]);
  if (!Number.isFinite(exp) || exp <= nowSeconds()) {
    return false;
  }
  return true;
}

export async function getSessionTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function isAuthenticatedRequest(): Promise<boolean> {
  const token = await getSessionTokenFromCookies();
  return isSessionTokenValid(token);
}
