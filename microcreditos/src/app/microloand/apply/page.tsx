// src/app/microloan/apply/page.tsx
'use client';

import * as React from 'react'; 
import { useRouter } from 'next/navigation';
import { Verify } from '@/components/Verify'; 
import { ISuccessResult } from '@worldcoin/minikit-js'; 

export default function ApplyLoanPage() {
  const router = useRouter();
  const [loanAmount, setLoanAmount] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSubmittingToBackend, setIsSubmittingToBackend] = React.useState(false);

  const loanActionId = process.env.NEXT_PUBLIC_WORLD_ID_LOAN_ACTION; 

  const handleLoanProofVerified = async (
    worldIdProofData: ISuccessResult, 
    actionVerified: string, 
    nullifierHashFromProof: string 
  ) => {
    setIsSubmittingToBackend(true);
    setStatusMessage('Identidad verificada para el préstamo. Enviando solicitud al backend...');
    console.log("ApplyLoanPage: Proof verificado para acción", actionVerified, "Monto:", loanAmount);

    if (actionVerified !== loanActionId) {
        setStatusMessage("Error: Acción verificada no coincide con la acción de préstamo requerida.");
        setIsSubmittingToBackend(false);
        return;
    }
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
        setStatusMessage("Error: Por favor, ingresa un monto de préstamo válido antes de verificar.");
        setIsSubmittingToBackend(false);
        return;
    }

    try {
      const backendApiUrlBase = process.env.NEXTAUTH_URL || "";
      const effectiveApiUrl = (backendApiUrlBase && !backendApiUrlBase.startsWith("undefined") && backendApiUrlBase !== "http://localhost:3000") 
                              ? `${backendApiUrlBase}/api/loans/request` 
                              : '/api/loans/request'; 

      const response = await fetch(effectiveApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldIdProofData: worldIdProofData, 
          actionClient: actionVerified,       
          requestedAmount: parseFloat(loanAmount),
          signalClient: "", 
        }),
      });

      const data = await response.json(); 

      if (response.ok && data.success) {
        setStatusMessage(`¡Solicitud Enviada! ID Préstamo: ${data.loanId || 'N/A'}. Estado: ${data.status || 'Recibido'}`);
        setLoanAmount(''); 
      } else {
        setStatusMessage(`Error al enviar solicitud: ${data.message || 'No se pudo enviar la solicitud.'}`);
      }
    } catch (error: any) {
      console.error("ApplyLoanPage: Error al enviar solicitud al backend:", error);
      setStatusMessage(`Error de red: ${error.message || 'No se pudo contactar al servidor.'}`);
    } finally {
      setIsSubmittingToBackend(false);
    }
  };

  const handleVerificationError = (error: any, actionAttempted: string) => {
    console.error(`ApplyLoanPage: Error durante la verificación de World ID para la acción "${actionAttempted}":`, error);
    setStatusMessage(`Falló la verificación con World ID: ${error.message || "Intenta de nuevo."}`);
    setIsSubmittingToBackend(false); 
  };

  if (!loanActionId) {
    return (
      <div className="p-4 my-4 text-center text-red-700 bg-red-100 border border-red-400 rounded">
        Error de Configuración: La acción para solicitar préstamos (<code>NEXT_PUBLIC_WORLD_ID_LOAN_ACTION</code>) no está definida en <code>.env.local</code>.
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
      <div className="w-full max-w-lg p-8 my-10 bg-slate-800 rounded-xl shadow-2xl relative">
        <button 
            onClick={() => router.back()} 
            className="absolute top-4 left-4 text-sky-400 hover:text-sky-300 transition-colors text-sm z-10"
            aria-label="Volver al Dashboard"
        >
          &larr; Volver
        </button>
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-8">
          Solicitar Microcrédito
        </h1>
        
        <div className="mb-6">
          <label htmlFor="loanAmount" className="block text-sm font-medium text-slate-300 mb-2">
            Monto Deseado (USDC nocionales)
          </label>
          <input
            type="number"
            id="loanAmount"
            value={loanAmount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
                setLoanAmount(e.target.value);
                setStatusMessage(''); 
            }}
            placeholder="Ej: 100"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400"
            disabled={isSubmittingToBackend} 
          />
        </div>

        <div className="mt-8">
          {(!loanAmount || parseFloat(loanAmount) <= 0) ? (
            <p className="text-center text-slate-400 text-sm">Ingresa un monto para poder verificar y solicitar el préstamo.</p>
          ) : (
            <Verify
              actionToVerify={loanActionId} 
              onVerificationSuccess={handleLoanProofVerified}
              onVerificationError={handleVerificationError} 
              // No se pasa verificationLevelToUse ni buttonText, ya que Verify los maneja internamente
              // Puedes personalizar los textos de los botones de Orb y Dispositivo si lo deseas:
              // orbButtonText="Verificar Préstamo (Orb)"
              // deviceButtonText="Verificar Préstamo (Dispositivo)"
              hideInternalFeedback={true} // Esta página maneja su propio statusMessage
              // redirectToOnGeneralAccessSuccess={null} // No es necesario, ya que esta no es la acción de acceso general
            />
          )}
        </div>

        {statusMessage && (
          <p className={`mt-6 p-3 rounded-md text-sm text-center ${statusMessage.includes('Error') || statusMessage.includes('Falló') ? 'bg-red-800 text-red-100' : 'bg-green-700 text-green-100'}`}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}