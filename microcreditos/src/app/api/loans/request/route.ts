// src/app/api/loans/apply/route.ts (VERSIÓN SIMULADA REVISADA)
import { NextResponse, NextRequest } from 'next/server';

// Interfaz para la sesión de usuario simulada
interface SimulatedUserSession {
  userId: string;
  displayName?: string; // Ejemplo de otro dato que podría tener la sesión
  contributionLevel?: number; // Podríamos simular esto basado en algo
}

// Placeholder para verifyUserSession - VERSIÓN EXPLÍCITAMENTE SIMULADA
// En un entorno real, esta función validaría un token/cookie de sesión.
async function verifyUserSession(request: NextRequest): Promise<SimulatedUserSession | null> {
  console.log("API /api/loans/apply (SIMULATED): Verificando sesión simulada...");
  // Para esta simulación, asumimos que si se llama a la API, hay un "usuario simulado".
  // Podrías añadir lógica aquí para simular diferentes usuarios o estados de sesión si lo necesitas.
  // Por ejemplo, podrías leer un header 'X-Simulated-User-ID'.
  // Por ahora, siempre devolvemos un usuario simulado genérico.
  const MOCK_USER_ID = `sim_user_${Math.random().toString(36).substring(7)}`;
  const MOCK_CONTRIBUTIONS = Math.floor(Math.random() * 15); // Entre 0 y 14 contribuciones simuladas

  // Si necesitas que el frontend envíe algo para identificar la sesión simulada:
  // const simulatedSessionToken = request.headers.get('X-Simulated-Session');
  // if (!simulatedSessionToken) return null;

  return { 
    userId: MOCK_USER_ID, 
    displayName: "Usuario de Prueba",
    contributionLevel: MOCK_CONTRIBUTIONS // El frontend ya envía esto, pero podríamos simularlo aquí también
  };
}

// CONSTANTES DE CONFIGURACIÓN DEL PRÉSTAMO (Para la simulación)
const MIN_LOAN_AMOUNT_USDC = 0.5;
const MAX_LOAN_AMOUNT_USDC_BASE = 5; // Base, podría ajustarse por contribuciones
const VALID_LOAN_TERMS_DAYS: readonly number[] = [7, 14, 30];
const INTEREST_RATES_BY_TERM: { [key: number]: { baseRate: number, bonusReduction?: number } } = {
  // baseRate, y una posible reducción por contribuciones
  7: { baseRate: 2.0 },
  14: { baseRate: 3.5 },
  30: { baseRate: 5.0 },
};
// Niveles de contribución para modificar términos (ejemplo)
const CONTRIBUTION_TIERS = {
    tier1: { minContributions: 3, interestModifier: -0.2, maxLoanBonus: 1 }, // Reduce tasa en 0.2%, +1 USDC al max
    tier2: { minContributions: 6, interestModifier: -0.5, maxLoanBonus: 2.5 }, // Reduce tasa en 0.5%, +2.5 USDC al max
};


export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  console.log(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Solicitud recibida.`);

  try {
    // 1. Verificar sesión de usuario (simulada)
    const userSession = await verifyUserSession(request);
    if (!userSession || !userSession.userId) {
      console.warn(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Sesión simulada no válida.`);
      return NextResponse.json(
        { success: false, error: 'SIMULADO: No autorizado. Se requiere sesión simulada válida.' },
        { status: 401 }
      );
    }
    console.log(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Usuario simulado: ${userSession.userId}, Nivel Contrib: ${userSession.contributionLevel}`);

    // 2. Parsear el cuerpo de la solicitud
    let body;
    try {
        body = await request.json();
    } catch (e) {
        console.error(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Error al parsear JSON del body.`, e);
        return NextResponse.json({ success: false, error: 'SIMULADO: Cuerpo de la solicitud no es un JSON válido.' }, { status: 400 });
    }
    
    const { amount, termDays, purpose, contributionsCount } = body; // contributionsCount enviado por el frontend
    console.log(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Datos recibidos:`, body);

    // Usar contributionsCount del frontend, o el simulado en la sesión si el frontend no lo envía
    const effectiveContributions = typeof contributionsCount === 'number' ? contributionsCount : userSession.contributionLevel || 0;

    // Determinar términos dinámicos basados en contribuciones
    let dynamicMaxLoanAmount = MAX_LOAN_AMOUNT_USDC_BASE;
    let interestRateModifier = 0;

    if (effectiveContributions >= CONTRIBUTION_TIERS.tier2.minContributions) {
        dynamicMaxLoanAmount += CONTRIBUTION_TIERS.tier2.maxLoanBonus;
        interestRateModifier = CONTRIBUTION_TIERS.tier2.interestModifier;
    } else if (effectiveContributions >= CONTRIBUTION_TIERS.tier1.minContributions) {
        dynamicMaxLoanAmount += CONTRIBUTION_TIERS.tier1.maxLoanBonus;
        interestRateModifier = CONTRIBUTION_TIERS.tier1.interestModifier;
    }

    // 3. Validar entradas
    if (typeof amount !== 'number' || amount < MIN_LOAN_AMOUNT_USDC || amount > dynamicMaxLoanAmount) {
      return NextResponse.json(
        { success: false, error: `SIMULADO: El monto del préstamo debe estar entre ${MIN_LOAN_AMOUNT_USDC} y ${dynamicMaxLoanAmount.toFixed(1)} USDC para tu nivel de ${effectiveContributions} aportes.` },
        { status: 400 }
      );
    }
    if (typeof termDays !== 'number' || !VALID_LOAN_TERMS_DAYS.includes(termDays)) {
      return NextResponse.json(
        { success: false, error: `SIMULADO: Término de préstamo inválido. Opciones válidas: ${VALID_LOAN_TERMS_DAYS.join(', ')} días.` },
        { status: 400 }
      );
    }
    if (typeof purpose !== 'string' || purpose.trim().length < 5 || purpose.trim().length > 300) {
      return NextResponse.json(
        { success: false, error: 'SIMULADO: Por favor, proporciona un propósito válido para el préstamo (5-300 caracteres).' },
        { status: 400 }
      );
    }

    // 4. SIMULACIÓN: No hay verificaciones de DB (préstamos activos, fondos del pool).

    // 5. Calcular interés y monto de repago
    const termRateInfo = INTEREST_RATES_BY_TERM[termDays];
    if (!termRateInfo) {
        console.error(`[${requestStartTime}] SIMULADO: Tasa de interés no definida para el término: ${termDays}`);
        return NextResponse.json({ success: false, error: 'Error de configuración interna simulado: tasa de interés no encontrada.'}, { status: 500 });
    }
    let finalInterestRate = termRateInfo.baseRate + interestRateModifier;
    finalInterestRate = Math.max(0.1, parseFloat(finalInterestRate.toFixed(1))); // Asegurar que la tasa no sea <= 0 y redondear

    const interestAmount = amount * (finalInterestRate / 100);
    const repaymentAmount = amount + interestAmount;
    console.log(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Cálculos de préstamo: Tasa ${finalInterestRate}%, Interés ${interestAmount}, Repago ${repaymentAmount}`);

    // 6. Decidir un estado simulado y un ID de préstamo simulado.
    const simulatedLoanId = `SIM-LOAN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // La "aprobación" podría depender de las contribuciones también
    const approvalChance = 0.6 + (effectiveContributions * 0.03); // Ejemplo: más contribuciones, mayor probabilidad
    const simulatedStatus = Math.random() < Math.min(0.95, approvalChance) ? 'SIMULATED_APPROVED' : 'SIMULATED_PENDING_REVIEW'; 
    
    let eligibilityNote = `Simulación basada en ${effectiveContributions} aportes. Tasa de interés aplicada: ${finalInterestRate}%.`;
    if (simulatedStatus === 'SIMULATED_APPROVED') {
        eligibilityNote = `¡Felicidades! Tu solicitud simulada fue aprobada con una tasa preferencial de ${finalInterestRate}% gracias a tus ${effectiveContributions} aportes.`;
    }

    // 7. Devolver respuesta de éxito simulada
    const responsePayload = {
      success: true,
      message: `SIMULADO: Solicitud de préstamo ${simulatedStatus === 'SIMULATED_APPROVED' ? 'aprobada (simulación)' : 'recibida para revisión (simulación)'}.`,
      simulationData: {
        loanId: simulatedLoanId,
        requestedAmount: amount,
        termDays: termDays,
        interestRate: finalInterestRate,
        interestAmount: parseFloat(interestAmount.toFixed(2)),
        repaymentAmount: parseFloat(repaymentAmount.toFixed(2)),
        purpose: purpose.trim(),
        status: simulatedStatus,
        simulatedProcessingTime: `${Math.floor(Math.random() * 2) + 1} días hábiles (sim.)`,
        eligibilityNote: eligibilityNote,
        userContributionsAtApplication: effectiveContributions
      }
    };
    console.log(`[${requestStartTime}] API /api/loans/apply (SIMULATED): Respuesta enviada:`, responsePayload);
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error(`[${requestStartTime}] Error en API /api/loans/apply (SIMULATED):`, error.stack || error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor durante la simulación.' },
      { status: 500 }
    );
  }
}