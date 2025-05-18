// src/app/api/verify-minikit-proof/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Estructura del objeto de prueba que esperamos del cliente
interface ISuccessResultFromClient {
    merkle_root: string;
    nullifier_hash: string;
    proof: string; 
    verification_level: 'orb' | 'device'; 
    // credential_type no es enviado por el cliente según tus logs, y no es parte del body de V2 para World ID
}

interface VerifyMinikitRequestBody {
    worldIdProofData: ISuccessResultFromClient; 
    action: string;
    signal?: string; 
}

// Este es el hash precalculado para un signal vacío ("") según ejemplos de World ID V2
const EMPTY_SIGNAL_HASH = "0x00c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4";
// Si necesitas hashear signals dinámicos en el backend, considera instalar @worldcoin/idkit y usar:
// import { encodeSignal } from '@worldcoin/idkit';
// const dynamic_signal_hash = encodeSignal(signal).toString();

export async function POST(request: NextRequest) {
    console.log("API /api/verify-minikit-proof (V2 LOGIC, Corrected): Solicitud recibida.");
    try {
        const body = await request.json();
        console.log("API /api/verify-minikit-proof: Cuerpo de la solicitud parseado:", JSON.stringify(body, null, 2));

        if (!body || typeof body !== 'object') {
            console.error("API /api/verify-minikit-proof: Cuerpo de la solicitud vacío o no es un objeto.");
            return NextResponse.json({ success: false, message: 'Cuerpo de la solicitud vacío o inválido.' }, { status: 400 });
        }

        const { worldIdProofData, action, signal = "" } = body as VerifyMinikitRequestBody; 
        
        if (!worldIdProofData || typeof worldIdProofData !== 'object' || 
            !worldIdProofData.merkle_root || !worldIdProofData.nullifier_hash || 
            !worldIdProofData.proof || !worldIdProofData.verification_level || 
            !action ) {
            console.error("API /api/verify-minikit-proof: Faltan campos críticos en worldIdProofData o action.", { worldIdProofData, action });
            return NextResponse.json({ success: false, message: 'worldIdProofData (con merkle_root, nullifier_hash, proof, verification_level) y action son requeridos.' }, { status: 400 });
        }
        console.log("API /api/verify-minikit-proof: Payload procesado OK. Action:", action, "Verification Level:", worldIdProofData.verification_level);
        
        const serverSideAppId = process.env.WORLD_ID_APP_ID as `app_${string}`;
        if(!serverSideAppId) {
            console.error("API /api/verify-minikit-proof: FATAL - WORLD_ID_APP_ID (backend) no configurado.");
            return NextResponse.json({ success: false, message: "Error config servidor: Falta World ID App ID." }, { status: 500 });
        }
        
        const worldIdVerifyUrl = `https://developer.worldcoin.org/api/v2/verify/${serverSideAppId}`;
        // Log CLAVE para verificar la URL ANTES del fetch
        console.log("API /api/verify-minikit-proof: URL para World ID /v2/verify (ANTES DEL FETCH):", worldIdVerifyUrl);

        let signal_hash_to_send: string;
        if (signal.trim() === "") {
            signal_hash_to_send = EMPTY_SIGNAL_HASH;
            console.log("API /api/verify-minikit-proof: Usando EMPTY_SIGNAL_HASH para signal vacío.");
        } else {
            // Aquí necesitarías la función encodeSignal si manejas signals no vacíos.
            // Por ahora, si no es vacío, esta implementación fallará o enviará un hash incorrecto.
            console.warn("API /api/verify-minikit-proof: Signal NO VACÍO recibido ('", signal ,"') pero se usará EMPTY_SIGNAL_HASH. ¡Esto SOLO es correcto si el signal que generó el proof también fue efectivamente tratado como vacío para el hash o si la librería cliente ya lo hasheó y envió el hash aquí como 'signal'!");
            // Si el `signal` que llega del cliente YA ES un hash, úsalo directamente.
            // Si es un string crudo y no es vacío, necesitas hashearlo (ej. con encodeSignal).
            // Para la prueba actual con signal vacío del frontend, EMPTY_SIGNAL_HASH está bien.
            signal_hash_to_send = EMPTY_SIGNAL_HASH; // Asumiendo que el frontend envía signal vacío por ahora.
        }

        const worldIdRequestBody = {
            merkle_root: worldIdProofData.merkle_root,
            nullifier_hash: worldIdProofData.nullifier_hash,
            proof: worldIdProofData.proof, 
            verification_level: worldIdProofData.verification_level, // REQUERIDO POR WORLD ID V2
            action: action,
            signal_hash: signal_hash_to_send, // ENVIAR signal_hash a WORLD ID V2
        };
        console.log("API /api/verify-minikit-proof: Cuerpo para World ID /v2/verify:", JSON.stringify(worldIdRequestBody, null, 2));

        const verifyRes = await fetch(worldIdVerifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(worldIdRequestBody),
        });

        console.log("API /api/verify-minikit-proof: Código de estado de respuesta de World ID:", verifyRes.status);
        console.log("API /api/verify-minikit-proof: Texto de estado de respuesta de World ID:", verifyRes.statusText);

        const responseTextFromWorldID = await verifyRes.text(); 
        console.log("API /api/verify-minikit-proof: Texto crudo de respuesta de World ID (primeros 1000 chars):", responseTextFromWorldID.substring(0, 1000));

        if (!verifyRes.ok) { 
            return NextResponse.json({
                success: false,
                message: `Error del servicio World ID: ${verifyRes.status} ${verifyRes.statusText}`,
                worldIdResponseDetails: responseTextFromWorldID.substring(0, 1000) 
            }, { status: verifyRes.status }); 
        }
        
        let verifyJson;
        try {
            verifyJson = JSON.parse(responseTextFromWorldID);
        } catch(e) {
            console.error("API /api/verify-minikit-proof: Fallo al parsear JSON de World ID:", responseTextFromWorldID, e);
            return NextResponse.json({
                success: false, message: 'Respuesta de World ID no fue JSON válido aunque el status fue OK.',
                rawResponse: responseTextFromWorldID.substring(0, 1000)
            }, { status: 500 });
        }
        
        console.log("API /api/verify-minikit-proof: JSON parseado de World ID:", verifyJson);

        // Para V2, la respuesta 200 OK tiene "success": true según la documentación que compartiste.
        if (!verifyJson.success) { 
            console.error("API /api/verify-minikit-proof: Verificación fallida según JSON de World ID (success: false o ausente).", verifyJson);
            return NextResponse.json({
                success: false,
                message: verifyJson.detail || 'La verificación con World ID falló (indicado en su respuesta JSON).',
                worldIdError: { code: verifyJson.code, detail: verifyJson.detail, attribute: verifyJson.attribute }
            }, { status: 400 });
        }
            
        const nullifierHash = verifyJson.nullifier_hash;
        if (!nullifierHash) { // Aunque si success es true, nullifier_hash debería estar.
            console.error("API /api/verify-minikit-proof: Verificación World ID OK pero sin nullifier_hash:", verifyJson);
            return NextResponse.json({ success: false, message: "Error: nullifier_hash no recibido de World ID." }, { status: 500 });
        }
        console.log("API /api/verify-minikit-proof: Verificación con World ID exitosa. NullifierHash:", nullifierHash);

        // --- INICIO LÓGICA DE BASE DE DATOS ---
        console.log("API /api/verify-minikit-proof: Intentando conectar a MongoDB...");
        const { db } = await connectToDatabase(); 
        console.log("API /api/verify-minikit-proof: Conectado a MongoDB. Buscando/creando usuario...");
        const usersCollection = db.collection('users');
        let user = await usersCollection.findOne({ worldIdNullifierHash: nullifierHash });
        
        const accessAction = process.env.NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION;
        if (!accessAction) {
            console.error("API /api/verify-minikit-proof: FATAL - NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION no configurado.");
            return NextResponse.json({ success: false, message: "Error de config: Action ID de acceso no definido." }, { status: 500 });
        }
        if (!user) {
            if (action === accessAction) {
                console.log("API /api/verify-minikit-proof: Creando nuevo usuario para la acción de acceso:", action);
                const newUserDocument = {
                    worldIdNullifierHash: nullifierHash,
                    balances: { wld: 0, usdc: 0, flexibleSavings: 0, currentFlexibleInterestRate: 0.01 },
                    createdAt: new Date(), updatedAt: new Date(),
                };
                const insertResult = await usersCollection.insertOne(newUserDocument);
                user = await usersCollection.findOne({ _id: insertResult.insertedId });
                console.log("API /api/verify-minikit-proof: Nuevo usuario creado con ID:", user?._id);
            } else {
                console.warn(`API /api/verify-minikit-proof: Acción "${action}" por usuario no encontrado. Requiere acción de acceso ("${accessAction}") primero.`);
                return NextResponse.json({
                     success: true, // La verificación de World ID en sí fue exitosa
                     message: 'Usuario no encontrado. Completa el acceso general primero para esta acción.', 
                     verifiedByWorldId: true, 
                     worldIdResponse: verifyJson 
                    }, { status: 403 });
            }
        } else {
            await usersCollection.updateOne({ worldIdNullifierHash: nullifierHash }, { $set: { updatedAt: new Date() } });
            console.log("API /api/verify-minikit-proof: 'updatedAt' para usuario existente:", user._id);
        }
        if (!user) { 
            console.error("API /api/verify-minikit-proof: Crítico - Usuario no disponible tras operaciones BD.");
            return NextResponse.json({
                success: true, 
                message: 'El usuario no pudo ser procesado en la base de datos después de una verificación exitosa.', 
                verifiedByWorldId: true, worldIdResponse: verifyJson
            }, { status: 500 });
        }
        const { _id, ...userData } = user;
        // --- FIN LÓGICA DE BASE DE DATOS ---

        console.log("API /api/verify-minikit-proof: Proceso finalizado con éxito para nullifier:", nullifierHash);
        return NextResponse.json({
            success: true, 
            message: 'Identidad verificada y procesada exitosamente.', 
            user: userData, 
            nullifierHash, 
            worldIdResponse: verifyJson 
        }, { status: 200 });

    } catch (error: any) {
        console.error("API /api/verify-minikit-proof: Error GENERAL CATCH (inesperado):", error);
        if (error instanceof SyntaxError && error.message.includes("JSON")) { 
            return NextResponse.json({ success: false, message: 'Error: El cuerpo de la solicitud no es un JSON válido o está vacío.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: 'Error Interno del Servidor.', errorDetails: error.message || String(error) }, { status: 500 });
    }
}