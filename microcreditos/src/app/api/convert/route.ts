import { NextResponse, NextRequest } from 'next/server';
// No necesitamos ObjectId ni connectToDatabase para una simulación sin DB.

// Asumo que verifyUserSession devuelve algo como esto:
interface VerifiedUserSession {
  userId: string; // El _id de MongoDB del usuario, como string (o cualquier identificador de usuario)
  // ...otros datos de sesión que puedas necesitar
}

// Y que tienes una función verifyUserSession similar a esta (debes implementarla):
async function verifyUserSession(request: NextRequest): Promise<VerifiedUserSession | null> {
    // Aquí tu lógica para obtener la sesión del usuario.
    // Esto es un placeholder, necesitas tu propia implementación.
    // Ejemplo: podría leer un token JWT de las cookies o headers.
    const MOCK_USER_ID = "mock_user_123"; // Para simulación, podemos usar un ID fijo o leer de un token simulado
    const headers = request.headers;
    const authToken = headers.get('authorization')?.split(' ')[1]; 
    
    // Simulación simple: si hay un token (cualquiera), asumimos que es un usuario válido.
    // En una implementación real, validarías el token contra tu sistema de autenticación.
    if (authToken || MOCK_USER_ID) { 
        return { userId: MOCK_USER_ID };
    }
    return null;
}

// CONSTANTES DE CONFIGURACIÓN PARA LA SIMULACIÓN
const MOCK_EXCHANGE_RATE_WLD_TO_USDC = 0.75; // Tasa para MVP.
const FEE_PERCENTAGE = 1; // 1% de comisión

export async function POST(request: NextRequest) {
  console.log("API /api/convert: Solicitud de simulación de intercambio recibida.");
  try {
    // 1. Verificar la sesión del usuario (simulada o real)
    const userSession = await verifyUserSession(request);
    if (!userSession || !userSession.userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor, inicia sesión.' },
        { status: 401 }
      );
    }
    console.log("API /api/convert: Usuario simulado/verificado:", userSession.userId);

    // 2. Parsear el cuerpo de la solicitud
    const body = await request.json();
    const { amount: wldAmountToConvert } = body;

    // 3. Validar las entradas
    if (typeof wldAmountToConvert !== 'number' || wldAmountToConvert <= 0) {
      return NextResponse.json(
        { error: 'La cantidad a convertir debe ser un número positivo.' },
        { status: 400 }
      );
    }
    console.log("API /api/convert: Cantidad a convertir:", wldAmountToConvert);

    // 4. SIMULACIÓN: No hay verificación de saldo de WLD contra la base de datos.
    // Simplemente procedemos con los cálculos.

    // 5. Calcular los montos de la conversión
    const estimatedUSDC = wldAmountToConvert * MOCK_EXCHANGE_RATE_WLD_TO_USDC;
    const feeAmountInUSDC = estimatedUSDC * (FEE_PERCENTAGE / 100);
    const finalUSDCReceived = estimatedUSDC - feeAmountInUSDC;

    if (finalUSDCReceived <= 0) {
        return NextResponse.json(
            { error: 'La cantidad simulada a recibir después de la comisión es cero o negativa.' },
            { status: 400 }
        );
    }
    console.log("API /api/convert: Cálculos de simulación completados.");

    // 6. SIMULACIÓN: No hay operaciones de base de datos.
    // Los pasos (a, b, c, d) de escritura en la base de datos se omiten.

    // 7. Devolver una respuesta de éxito con los datos simulados
    const simulationData = {
        exchangedWLD: wldAmountToConvert,
        receivedUSDC: parseFloat(finalUSDCReceived.toFixed(4)), // Redondear a 4 decimales
        feePaid: parseFloat(feeAmountInUSDC.toFixed(4)),       // Redondear a 4 decimales
        exchangeRateUsed: MOCK_EXCHANGE_RATE_WLD_TO_USDC
    };
    console.log("API /api/convert: Datos de simulación a devolver:", simulationData);

    return NextResponse.json({
      success: true,
      message: 'Simulación de intercambio calculada con éxito.',
      data: simulationData
    });

  } catch (error: any) {
    console.error('Error en la API de simulación de intercambio (/api/convert):', error.stack || error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor durante la simulación.' },
      { status: 500 }
    );
  }
}