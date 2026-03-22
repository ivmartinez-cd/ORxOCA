import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  verifyPassword
} from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    if (!verifyPassword(password)) {
      return NextResponse.json({ ok: false, error: "Contrasena invalida." }, { status: 401 });
    }

    const sessionToken = createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: getSessionCookieName(),
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionTtlSeconds()
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error inesperado"
      },
      { status: 500 }
    );
  }
}
