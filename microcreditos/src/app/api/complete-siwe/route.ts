// src/app/api/complete-siwe/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js';

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
  username?: string | null;
  
}

// La función POST ya es async, lo cual es correcto.
export async function POST(req: NextRequest) {
  try {
    const { payload, nonce: clientNonce, username } = (await req.json()) as IRequestPayload;

    // Si TypeScript insiste que cookies() devuelve una Promise:
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get('siwe_nonce')?.value;

    if (!storedNonce) {
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'Nonce not found or expired.',
      }, { status: 400 });
    }

    if (clientNonce !== storedNonce) {
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'Invalid nonce.',
      }, { status: 400 });
    }

    cookieStore.delete('siwe_nonce');

    const verificationResult = await verifySiweMessage(payload, storedNonce);

    if (verificationResult.isValid) {
      const userInfoToStore = {
        address: payload.address,
        username: username || payload.address,
      };

      cookieStore.set("user_info", JSON.stringify(userInfoToStore), {
        secure: process.env.NODE_ENV !== 'development',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 semana
      });

      return NextResponse.json({
        status: 'success',
        isValid: true,
        address: payload.address,
        username: userInfoToStore.username,
      });
    } else {
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'SIWE message verification failed.',
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error verifying SIWE:", error);
    // Asegúrate de que el mensaje de error sea una cadena
    const message = typeof error.message === 'string' ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({
      status: 'error',
      isValid: false,
      message: message,
    }, { status: 500 });
  }
}