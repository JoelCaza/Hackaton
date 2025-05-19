// src/app/api/survey/initiate-deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth'; // Tu config de NextAuth
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface InitiateDepositBody {
    amount: number;
    tokenSymbol: 'WLD' | 'USDC.e'; // Asegúrate que estos strings coincidan con los de MiniKit.Tokens
}

export async function POST(req: NextRequest) {
    const reqTimestamp = Date.now();
    console.log(`[${reqTimestamp}] /api/survey/initiate-deposit: Solicitud POST recibida.`);
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });
        }
        const userObjectId = new ObjectId(session.user.id);

        const body = await req.json() as InitiateDepositBody;
        const { amount, tokenSymbol } = body;

        if (typeof amount !== 'number' || amount <= 0.09) { // Mínimo $0.1
             return NextResponse.json({ success: false, error: 'Monto inválido o por debajo del mínimo ($0.10).' }, { status: 400 });
        }
        if (tokenSymbol !== 'WLD' && tokenSymbol !== 'USDC.e') { // Ajusta si usas Tokens.USDCE
             return NextResponse.json({ success: false, error: 'Token no soportado.' }, { status: 400 });
        }

        const referenceId = crypto.randomUUID().replace(/-/g, ''); // ID de referencia único

        const { db } = await connectToDatabase();
        const pendingDepositsCollection = db.collection('pendingSurveyDeposits');

        await pendingDepositsCollection.insertOne({
            referenceId,
            userId: userObjectId,
            requestedAmount: amount,
            tokenSymbol,
            status: 'initiated',
            createdAt: new Date(),
            // Podrías añadir aquí a qué dirección se espera el pago (tu PLATFORM_SURVEY_DEPOSIT_ADDRESS)
            // para doble verificación en el confirm-deposit
        });
        console.log(`[${reqTimestamp}] /api/survey/initiate-deposit: Iniciado depósito para ${userObjectId} con ref: ${referenceId}`);
        
        return NextResponse.json({ success: true, referenceId: referenceId });

    } catch (error: any) {
        console.error(`[${reqTimestamp}] /api/survey/initiate-deposit: Error:`, error.stack || error);
        if (error.name === 'SyntaxError') {
            return NextResponse.json({ success: false, error: 'Cuerpo de solicitud malformado.'}, {status: 400});
        }
        return NextResponse.json({ success: false, error: 'Error interno del servidor al iniciar el depósito.' }, { status: 500 });
    }
}