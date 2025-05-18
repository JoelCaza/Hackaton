// src/app/api/loans/request/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Estructura del objeto de prueba que esperamos del cliente (de MiniKit.commandsAsync.verify().finalPayload)
interface ISuccessResultFromClient {
    merkle_root: string;
    nullifier_hash: string;
    proof: string; 
    verification_level: 'orb' | 'device'; 
    // Otros campos de ISuccessResult que podrían ser útiles o que MiniKit envía
}

interface LoanApiRequestBody {
    worldIdProofData: ISuccessResultFromClient; // El proof para la acción de préstamo
    actionClient: string; // La acción que el cliente dice haber usado (ej. "solicitar-prestamo")
    requestedAmount: number;
    signalClient?: string; 
}

const EMPTY_SIGNAL_HASH = "0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4";
// Si usas signals no vacíos, considera: import { encodeSignal } from '@worldcoin/idkit';

export async function POST(request: NextRequest) {
    console.log("API /api/loans/request: Solicitud de préstamo recibida.");
    try {
        const body = await request.json();
        console.log("API /api/loans/request: Cuerpo de la solicitud parseado:", JSON.stringify(body, null, 2));

        if (!body || typeof body !== 'object') {
            return NextResponse.json({ success: false, message: 'Cuerpo de la solicitud vacío o inválido.' }, { status: 400 });
        }

        const { worldIdProofData, actionClient, requestedAmount, signalClient = "" } = body as LoanApiRequestBody;
        
        if (!worldIdProofData || typeof worldIdProofData !== 'object' || 
            !worldIdProofData.merkle_root || !worldIdProofData.nullifier_hash || 
            !worldIdProofData.proof || !worldIdProofData.verification_level || 
            !actionClient || typeof requestedAmount !== 'number' || requestedAmount <= 0 ) {
            console.error("API /api/loans/request: Faltan campos críticos.", { worldIdProofDataExists: !!worldIdProofData, actionClient, requestedAmount });
            return NextResponse.json({ success: false, message: 'Datos incompletos para la solicitud de préstamo.' }, { status: 400 });
        }

        // Validar que la acción sea la correcta para solicitar préstamos
        const expectedLoanAction = process.env.NEXT_PUBLIC_WORLD_ID_LOAN_ACTION;
        if (!expectedLoanAction) {
            console.error("API /api/loans/request: FATAL - NEXT_PUBLIC_WORLD_ID_LOAN_ACTION no configurado.");
            return NextResponse.json({ success: false, message: "Error de configuración: Falta Action ID para préstamos." }, { status: 500 });
        }
        if (actionClient !== expectedLoanAction) {
            console.error("API /api/loans/request: Acción incorrecta. Esperada:", expectedLoanAction, "Recibida:", actionClient);
            return NextResponse.json({ success: false, message: "Acción no válida para esta operación de préstamo." }, { status: 400 });
        }
        console.log("API /api/loans/request: Payload OK. Action:", actionClient, "Monto:", requestedAmount);
        
        const serverSideAppId = process.env.WORLD_ID_APP_ID as `app_${string}`;
        if(!serverSideAppId) {
            console.error("API /api/loans/request: FATAL - WORLD_ID_APP_ID (backend) no configurado.");
            return NextResponse.json({ success: false, message: "Error config servidor: Falta App ID." }, { status: 500 });
        }
        
        const worldIdVerifyUrl = `https://developer.worldcoin.org/api/v2/verify/${serverSideAppId}`;
        console.log("API /api/loans/request: URL para World ID /v2/verify (ANTES DEL FETCH):", worldIdVerifyUrl);

        let signal_hash_to_send = (signalClient.trim() === "") ? EMPTY_SIGNAL_HASH : ""; 
        if (signalClient.trim() !== "") {
             // signal_hash_to_send = encodeSignal(signalClient).toString(); // Si usas @worldcoin/idkit
             console.warn("API /api/loans/request: Signal no vacío, usando EMPTY_SIGNAL_HASH. Implementar hash real si es necesario.");
             signal_hash_to_send = EMPTY_SIGNAL_HASH; // Temporalmente
        }

        const worldIdRequestBody = {
            merkle_root: worldIdProofData.merkle_root,
            nullifier_hash: worldIdProofData.nullifier_hash,
            proof: worldIdProofData.proof, 
            verification_level: worldIdProofData.verification_level,
            action: actionClient, 
            signal_hash: signal_hash_to_send,
        };
        console.log("API /api/loans/request: Cuerpo para World ID /v2/verify:", JSON.stringify(worldIdRequestBody, null, 2));

        const verifyRes = await fetch(worldIdVerifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(worldIdRequestBody),
        });
        
        const responseTextFromWorldID = await verifyRes.text();
        console.log("API /api/loans/request: Respuesta cruda de World ID (Loan):", responseTextFromWorldID.substring(0, 500) + "...");

        if (!verifyRes.ok) {
            console.error("API /api/loans/request: Error de World ID Service (Loan):", verifyRes.status, responseTextFromWorldID);
            return NextResponse.json({ success: false, message: `Error del servicio World ID: ${verifyRes.status}`, worldIdResponseDetails: responseTextFromWorldID }, { status: verifyRes.status });
        }
        
        let worldIdVerifyJson;
        try {
            worldIdVerifyJson = JSON.parse(responseTextFromWorldID);
        } catch (e) {
            console.error("API /api/loans/request: Fallo al parsear JSON de World ID (Loan):", responseTextFromWorldID, e);
            return NextResponse.json({ success: false, message: "Respuesta de World ID (Loan) no JSON válido." }, { status: 500 });
        }
        console.log("API /api/loans/request: JSON de World ID (Loan):", worldIdVerifyJson);

        if (!worldIdVerifyJson.success || worldIdVerifyJson.nullifier_hash !== worldIdProofData.nullifier_hash) {
            console.error("API /api/loans/request: Verificación fallida por World ID o nullifier no coincide (Loan).", worldIdVerifyJson);
            return NextResponse.json({ success: false, message: worldIdVerifyJson.detail || "Falló la verificación con World ID para el préstamo.", worldIdError: worldIdVerifyJson }, { status: 400 });
        }
        
        const verifiedNullifierHash = worldIdVerifyJson.nullifier_hash; // Este es el identificador del usuario
        console.log("API /api/loans/request: Verificación de World ID para préstamo exitosa. NullifierHash:", verifiedNullifierHash);

        // --- LÓGICA DE BASE DE DATOS ---
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');
        const loansCollection = db.collection('loans'); // Nueva colección para préstamos

        const user = await usersCollection.findOne({ worldIdNullifierHash: verifiedNullifierHash });
        if (!user) {
            console.error("API /api/loans/request: Usuario verificado por World ID no encontrado en la base de datos. Nullifier:", verifiedNullifierHash);
            // Esto no debería pasar si el usuario completó el acceso general primero.
            return NextResponse.json({ success: false, message: "Usuario no registrado. Por favor, completa el acceso general primero." }, { status: 403 });
        }

        // (Opcional) Aquí puedes añadir lógica para verificar si el usuario es elegible para un nuevo préstamo
        // ej. no tener préstamos pendientes, etc. Por ahora, lo omitimos para el MVP.

        const newLoanDocument = {
            userIdNullifier: verifiedNullifierHash, // El nullifier del usuario que solicita
            userIdMongo: user._id, // Referencia al _id del usuario en tu colección 'users'
            requestedAmount: requestedAmount,
            status: "pending_approval", // Estado inicial del préstamo
            requestedAt: new Date(),
            actionUsed: actionClient, // Guardar la acción específica usada (ej. "solicitar-prestamo")
            worldIdVerificationDetails: { // Guardar detalles de esta verificación específica para auditoría
                actionVerifiedByWorldId: worldIdVerifyJson.action,
                verificationCreatedAt: worldIdVerifyJson.created_at,
                verificationLevelUsed: worldIdProofData.verification_level,
            }
            // Campos a añadir después: approvedAmount, interestRate, repaymentDueDate, etc.
        };

        const loanInsertResult = await loansCollection.insertOne(newLoanDocument);
        console.log("API /api/loans/request: Solicitud de préstamo creada con ID de MongoDB:", loanInsertResult.insertedId);

        return NextResponse.json({ 
            success: true, 
            message: "Solicitud de préstamo registrada exitosamente y está pendiente de aprobación.",
            loanId: loanInsertResult.insertedId.toString(), // Enviar el ID del préstamo creado
            status: newLoanDocument.status,
        }, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error("API /api/loans/request: Error GENERAL CATCH:", error);
        if (error instanceof SyntaxError && error.message.includes("JSON")) { 
            return NextResponse.json({ success: false, message: 'Error: Cuerpo de la solicitud no es un JSON válido.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: 'Error Interno del Servidor.', errorDetails: error.message || String(error) }, { status: 500 });
    }
}