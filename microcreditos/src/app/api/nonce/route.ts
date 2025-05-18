// src/app/api/nonce/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) { // Asegúrate que la función sea async
  const nonce = crypto.randomUUID().replace(/-/g, "");

  try {
    // Si TypeScript insiste que cookies() devuelve una Promise:
    const cookieStore = await cookies();
    cookieStore.set("siwe_nonce", nonce, {
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  } catch (error) {
    console.error("Error setting cookie in /api/nonce:", error);
    return NextResponse.json({ error: "Failed to set nonce cookie" }, { status: 500 });
  }

  return NextResponse.json({ nonce });
}