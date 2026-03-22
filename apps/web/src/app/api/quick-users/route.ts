import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "../../../lib/auth";
import { listQuickUsers } from "../../../lib/db";

export async function GET() {
  try {
    if (!(await isAuthenticatedRequest())) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      data: await listQuickUsers()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error de base de datos"
      },
      { status: 500 }
    );
  }
}
