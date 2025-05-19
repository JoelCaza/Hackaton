// src/app/api/survey/confirm-deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'; // Importa el tipo

interface ConfirmDepositRequestBody {
    minikitPayload: MiniAppPaymentSuccessPayload; // El payload de éxito de MiniKit.commandsAsync.pay()
}

export async function POST(req: NextRequest) {
    const reqTimestamp = Date.now();
    console.log(`[${reqTimestamp}] /api/survey/confirm-deposit: Solicitud POST recibida.`);
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });
        }
        const userObjectId = new ObjectId(session.user.id);

        const body = await req.json() as ConfirmDepositRequestBody;
        const { minikitPayload } = body;

        if (!minikitPayload || !minikitPayload.reference || !minikitPayload.transaction_id) {
            return NextResponse.json({ success: false, error: 'Payload de MiniKit inválido o incompleto.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const pendingDepositsCollection = db.collection('pendingSurveyDeposits');
        const usersCollection = db.collection('users'); // Para actualizar el balance interno simulado
        const transactionsCollection = db.collection('transactions'); // Para loguear

        // 1. Recuperar el depósito iniciado desde tu DB usando la referencia
        const initiatedDeposit = await pendingDepositsCollection.findOne({
            referenceId: minikitPayload.reference,
            userId: userObjectId, // Asegurar que es del mismo usuario
            status: 'initiated' // Solo procesar los que están pendientes
        });

        if (!initiatedDeposit) {
            console.warn(`[${reqTimestamp}] /api/survey/confirm-deposit: No se encontró depósito iniciado válido para ref: ${minikitPayload.reference} y usuario ${userObjectId}`);
            return NextResponse.json({ success: false, error: 'Depósito iniciado no encontrado o ya procesado.' }, { status: 404 });
        }

        // 2. Verificar la transacción con el API del Developer Portal de World ID
        const worldIdAppId = process.env.WORLD_ID_APP_ID; // ej. app_xxxx
        const devPortalApiKey = process.env.DEV_PORTAL_API_KEY; // Tu clave API secreta

        if (!worldIdAppId || !devPortalApiKey) {
            console.error(`[${reqTimestamp}] /api/survey/confirm-deposit: Faltan variables de entorno WORLD_ID_APP_ID o DEV_PORTAL_API_KEY`);
            return NextResponse.json({ success: false, error: 'Error de configuración del servidor.' }, { status: 500 });
        }

        const verificationUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${minikitPayload.transaction_id}?app_id=${worldIdAppId}`;
        console.log(`[${reqTimestamp}] /api/survey/confirm-deposit: Verificando tx con World ID: ${verificationUrl}`);

        const worldIdResponse = await fetch(verificationUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${devPortalApiKey}` },
        });

        const transactionDetails = await worldIdResponse.json();

        if (!worldIdResponse.ok) {
            console.error(`[${reqTimestamp}] /api/survey/confirm-deposit: Error del API de World ID al verificar tx:`, transactionDetails);
            return NextResponse.json({ success: false, error: `Error del API de World ID: ${transactionDetails.detail || worldIdResponse.statusText}` }, { status: worldIdResponse.status });
        }
        console.log(`[${reqTimestamp}] /api/survey/confirm-deposit: Detalles de tx de World ID:`, transactionDetails);

        // 3. Validar consistencia y estado de la transacción
        //    (status puede ser 'pending', 'confirmed', 'mined', 'failed', etc.)
        if (transactionDetails.reference !== initiatedDeposit.referenceId) {
            // Esto sería muy raro y podría indicar un problema de seguridad o un error
            console.error(`[${reqTimestamp}] /api/survey/confirm-deposit: ¡DISCREPANCIA DE REFERENCIA! Esperada: ${initiatedDeposit.referenceId}, Recibida de World ID: ${transactionDetails.reference}`);
            return NextResponse.json({ success: false, error: 'Discrepancia en la referencia de la transacción.' }, { status: 400 });
        }

        // Para el hackathon, podemos ser optimistas si no es 'failed' o 'reverted'.
        // En producción, querrías esperar a 'mined' o 'confirmed', posiblemente con polling.
        if (transactionDetails.status === 'failed' || transactionDetails.status === 'reverted') {
            await pendingDepositsCollection.updateOne(
                { _id: initiatedDeposit._id },
                { $set: { status: 'failed_on_chain', transactionId: minikitPayload.transaction_id, worldIdTxDetails: transactionDetails, updatedAt: new Date() } }
            );
            return NextResponse.json({ success: false, error: `El pago en cadena falló (Estado: ${transactionDetails.status}).` }, { status: 400 });
        }

        // ¡Pago Exitoso y Verificado!
        // 4. Actualizar estado en tu DB y "acreditar" el depósito al usuario internamente
        await pendingDepositsCollection.updateOne(
            { _id: initiatedDeposit._id },
            { $set: { status: 'confirmed_on_chain', transactionId: minikitPayload.transaction_id, worldIdTxDetails: transactionDetails, updatedAt: new Date() } }
        );

        // Aquí es donde tu lógica de "acreditar" el depósito al usuario para la encuesta entra en juego.
        // Podrías tener una colección `userSurveyBalances` o añadirlo a un campo en `users`.
        // Por ejemplo, si guardas el monto participado en la colección 'users':
        // await usersCollection.updateOne(
        //    { _id: userObjectId },
        //    { $inc: { surveyParticipationBalance: initiatedDeposit.requestedAmount } } // O un campo específico
        // );

        // Registrar la transacción de depósito en tu ledger
        await transactionsCollection.insertOne({
            userId: userObjectId,
            type: 'SURVEY_DEPOSIT_CONFIRMED',
            description: `Depósito confirmado para encuesta: ${initiatedDeposit.requestedAmount} ${initiatedDeposit.tokenSymbol}`,
            amount: initiatedDeposit.requestedAmount,
            tokenType: initiatedDeposit.tokenSymbol,
            relatedSurveyDepositId: initiatedDeposit._id, // Enlazar al documento de depósito
            metadata: { 
                worldcoinTransactionId: minikitPayload.transaction_id,
                referenceId: initiatedDeposit.referenceId,
            },
            timestamp: new Date(),
            status: 'COMPLETED'
        });

        console.log(`[${reqTimestamp}] /api/survey/confirm-deposit: Depósito confirmado para ${userObjectId}, ref: ${minikitPayload.reference}, tx: ${minikitPayload.transaction_id}`);
        return NextResponse.json({ success: true, message: "Depósito confirmado exitosamente." });

    } catch (error: any) {
        console.error(`[${reqTimestamp}] /api/survey/confirm-deposit: Error:`, error.stack || error);
        if (error.name === 'SyntaxError') {
            return NextResponse.json({ success: false, error: 'Cuerpo de solicitud malformado.'}, {status: 400});
        }
        return NextResponse.json({ success: false, error: 'Error interno del servidor al confirmar el depósito.' }, { status: 500 });
    }
}