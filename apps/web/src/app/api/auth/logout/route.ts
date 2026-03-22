import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  getSessionTokenFromCookies,
  invalidateSessionToken
} from "../../../../lib/auth";

export async function POST() {
  const token = await getSessionTokenFromCookies();
  if (token) {
    invalidateSessionToken(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
