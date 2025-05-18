// src/components/Verify/index.tsx
'use client';

import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, VerificationLevel, ISuccessResult, MiniAppVerifyActionErrorPayload } from '@worldcoin/minikit-js';
import * as React from 'react'; 
import { useRouter } from 'next/navigation';

// Props que el componente Verify aceptará
export interface VerifyProps {
  actionToVerify: string; 
  onVerificationSuccess: (proofData: ISuccessResult, actionVerified: string, nullifierHashFromProof: string) => void; 
  signal?: string; 
  onVerificationError?: (error: any, actionAttempted: string) => void; 
  
  // Títulos para los botones (opcional)
  orbButtonText?: string;
  deviceButtonText?: string;

  // Para controlar si este componente muestra feedback o lo delega totalmente al padre
  hideInternalFeedback?: boolean; 

  // Solo para la acción de acceso general, para redirigir
  redirectToOnGeneralAccessSuccess?: string | null; 
}

// Interfaz para la respuesta esperada del API de LOGIN (/api/verify-minikit-proof)
interface BackendLoginApiResponse {
  success: boolean; message: string; user?: any; nullifierHash?: string;
  worldIdResponse?: any; worldIdError?: { code?: string; detail?: string; attribute?: string };
  worldIdResponseDetails?: string; 
}

type ActualButtonProps = React.ComponentProps<typeof Button>;
type ButtonVariant = ActualButtonProps['variant']; 

interface ButtonDisplayState {
  text: string; disabled: boolean; variant: ButtonVariant;
}

export const Verify = ({
  actionToVerify,
  onVerificationSuccess,
  signal = "", 
  onVerificationError,
  orbButtonText = "Verificar con Orb",
  deviceButtonText = "Verificar con Dispositivo",
  hideInternalFeedback = false,
  redirectToOnGeneralAccessSuccess = null,
}: VerifyProps) => {
  const router = useRouter();
  const [componentState, setComponentState] = React.useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  // `activeVerificationLevel` nos ayuda a saber qué botón/proceso está activo para el LiveFeedback
  const [activeVerificationLevel, setActiveVerificationLevel] = React.useState<VerificationLevel | null>(null);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string>('');

  const frontendAppId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID; 
  const generalAccessAction = process.env.NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION;
  const backendApiUrlBaseForLogin = process.env.NEXTAUTH_URL || ""; 

  React.useEffect(() => {
    if (!actionToVerify || !frontendAppId) {
      const missingVar = !actionToVerify ? "actionToVerify Prop" : "NEXT_PUBLIC_WORLD_ID_APP_ID";
      const errorMessage = `Error de Configuración en <Verify>: Falta ${missingVar}.`;
      console.error("Verify.tsx (Reusable):", errorMessage);
      if ((componentState !== 'failed' || feedbackMessage !== errorMessage) && !hideInternalFeedback) { 
        setFeedbackMessage(errorMessage); setComponentState('failed'); 
      }
    }
  }, [actionToVerify, frontendAppId, componentState, feedbackMessage, hideInternalFeedback]);

  const handleVerifyClick = React.useCallback(async (verificationLevel: VerificationLevel) => {
    if (!actionToVerify || !frontendAppId) {
      const error = new Error("Configuración de World ID (action o app_id) incompleta.");
      if(!hideInternalFeedback) setFeedbackMessage(error.message); 
      setComponentState('failed');
      setActiveVerificationLevel(verificationLevel); // Para que el feedback se muestre en el botón correcto
      onVerificationError?.(error, actionToVerify);
      return;
    }

    setComponentState('pending'); 
    setActiveVerificationLevel(verificationLevel);
    if(!hideInternalFeedback) setFeedbackMessage(verificationLevel === VerificationLevel.Orb ? 'Verificando Orb...' : 'Verificando Dispositivo...');
    
    let operationWasSuccessfulThisAttempt = false;

    try {
      const result = await MiniKit.commandsAsync.verify({
        action: actionToVerify,
        verification_level: verificationLevel,
        signal: signal, 
      });
      const proofDataFromMiniKit = result.finalPayload as ISuccessResult | MiniAppVerifyActionErrorPayload;
      
      if (proofDataFromMiniKit && typeof proofDataFromMiniKit === 'object' && 'status' in proofDataFromMiniKit && proofDataFromMiniKit.status === "error") {
        const errorPayload = proofDataFromMiniKit as MiniAppVerifyActionErrorPayload;
        let specificErrorMessage = "Error al generar prueba con MiniKit.";
        const code = (errorPayload as any).code; const detail = (errorPayload as any).detail;
        if (detail) specificErrorMessage = String(detail); else if (code) specificErrorMessage = `Error MiniKit: ${String(code)}`;
        console.error("Verify Component: Error del comando MiniKit:", errorPayload);
        if(!hideInternalFeedback) setFeedbackMessage(specificErrorMessage);
        throw new Error(specificErrorMessage);
      }
      
      const worldIdProofObject = proofDataFromMiniKit as ISuccessResult; 
      console.log(`Verify Component: Proof obtenido para acción "${actionToVerify}" con nivel "${verificationLevel}":`, worldIdProofObject);
      
      if (actionToVerify === generalAccessAction) {
        const effectiveApiUrl = (backendApiUrlBaseForLogin && !backendApiUrlBaseForLogin.startsWith("undefined") && backendApiUrlBaseForLogin !== "http://localhost:3000") 
                                ? `${backendApiUrlBaseForLogin}/api/verify-minikit-proof` : '/api/verify-minikit-proof'; 
        console.log("Verify Component (Login Action): Enviando proof a API de login:", effectiveApiUrl);
        const response = await fetch(effectiveApiUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldIdProofData: worldIdProofObject, action: actionToVerify, signal: signal }),
        });
        const responseText = await response.text(); 
        if (!response.ok) {
          let errMsg = `Error del API de login: ${response.status}.`;
          try { const errJson = JSON.parse(responseText); errMsg = errJson.message || errJson.worldIdResponseDetails || errMsg; } 
          catch (e) { if(responseText) errMsg += ` Det: ${responseText.substring(0,100)}...` }
          throw new Error(errMsg);
        }
        const data: BackendLoginApiResponse = JSON.parse(responseText);
        if (data.success && data.nullifierHash) {
          setComponentState('success'); 
          if(!hideInternalFeedback) setFeedbackMessage(data.message || '¡Verificación de Acceso Exitosa!');
          operationWasSuccessfulThisAttempt = true;
          onVerificationSuccess(worldIdProofObject, actionToVerify, data.nullifierHash); 
          if (redirectToOnGeneralAccessSuccess) {
            if(!hideInternalFeedback) setFeedbackMessage(data.message || '¡Verificación Exitosa! Redirigiendo...');
            setTimeout(() => { router.push(redirectToOnGeneralAccessSuccess); }, hideInternalFeedback ? 0 : 1200);
          }
        } else {
          throw new Error(data.message || data.worldIdError?.detail || data.worldIdResponseDetails || 'Falló la verificación en backend de login.');
        }
      } else {
        console.log(`Verify Component: Acción "${actionToVerify}" completada. Llamando onVerificationSuccess.`);
        setComponentState('success');
        if(!hideInternalFeedback) setFeedbackMessage('Identidad verificada para esta acción específica.');
        operationWasSuccessfulThisAttempt = true;
        onVerificationSuccess(worldIdProofObject, actionToVerify, worldIdProofObject.nullifier_hash);
      }
    } catch (error: any) {
      console.error(`Verify Component: Error en handleVerifyClick para acción "${actionToVerify}", nivel "${verificationLevel}":`, error);
      setComponentState('failed');
      if(!hideInternalFeedback) setFeedbackMessage(error.message || 'Error inesperado durante la verificación.');
      onVerificationError?.(error, actionToVerify);
    } finally {
      if (!operationWasSuccessfulThisAttempt) {
        setTimeout(() => {
          // Solo resetea si el estado actual es relevante para la verificación que falló o quedó pendiente
          if ((componentState === 'pending' || componentState === 'failed') && activeVerificationLevel === verificationLevel) {
             if (feedbackMessage && !feedbackMessage.toLowerCase().includes("configuración")) setFeedbackMessage('');
             setComponentState('idle'); 
             setActiveVerificationLevel(null);
          }
        }, 4000);
      }
    }
  }, [
    actionToVerify, frontendAppId, signal, onVerificationSuccess, onVerificationError, 
    hideInternalFeedback, redirectToOnGeneralAccessSuccess, router, generalAccessAction, 
    backendApiUrlBaseForLogin, componentState, feedbackMessage // Incluir componentState y feedbackMessage para la lógica del useEffect y el finally
  ]);

  const getButtonDisplayForLevel = (level: VerificationLevel): ButtonDisplayState => {
    const configErrorOccurred = !actionToVerify || !frontendAppId;
    const defaultText = level === VerificationLevel.Orb ? orbButtonText : deviceButtonText;
    const defaultVariant = level === VerificationLevel.Orb ? 'primary' : 'tertiary';

    if (configErrorOccurred) return { text: "Error Config.", disabled: true, variant: 'secondary' };
    // Si ESTE botón está en pending
    if (componentState === 'pending' && activeVerificationLevel === level) return { text: "Verificando...", disabled: true, variant: defaultVariant };
    // Si ESTE botón tuvo éxito (raro ver este estado si onVerificationSuccess hace algo como redirigir)
    if (componentState === 'success' && activeVerificationLevel === level) return { text: "Verificado", disabled: true, variant: defaultVariant };
    // Si ESTE botón falló
    if (componentState === 'failed' && activeVerificationLevel === level) return { text: "Reintentar", disabled: false, variant: 'secondary' };
    
    // Estado por defecto o si el otro botón está activo y este no
    return { text: defaultText, 
             disabled: componentState === 'pending', // Deshabilita ambos si cualquier verificación está 'pending'
             variant: defaultVariant };
  };

  const currentOrbButtonState = getButtonDisplayForLevel(VerificationLevel.Orb);
  const currentDeviceButtonState = getButtonDisplayForLevel(VerificationLevel.Device);

  return (
    <div className="grid w-full gap-4"> {/* Eliminado max-w-md y mx-auto para que el padre controle el tamaño */}
      {/* Botón y Feedback para Verificación con Dispositivo */}
      <LiveFeedback
        label={{
          failed: (activeVerificationLevel === VerificationLevel.Device && feedbackMessage) || 'Falló (Dispositivo)',
          pending: (activeVerificationLevel === VerificationLevel.Device && feedbackMessage) || 'Procesando (Dispositivo)...',
          success: (activeVerificationLevel === VerificationLevel.Device && feedbackMessage) || '¡Verificado (Dispositivo)!',
        }}
        state={hideInternalFeedback || activeVerificationLevel !== VerificationLevel.Device ? undefined : componentState === 'idle' ? undefined : componentState}
        className="w-full"
      >
        <Button
          onClick={() => handleVerifyClick(VerificationLevel.Device)}
          disabled={currentDeviceButtonState.disabled}
          size="lg"
          variant={currentDeviceButtonState.variant}
          className="w-full py-3 text-base" // py-3.5 es un poco grande, ajustado a py-3
        >
          {currentDeviceButtonState.text}
        </Button>
      </LiveFeedback>

      {/* Botón y Feedback para Verificación con Orb */}
      <LiveFeedback
        label={{
          failed: (activeVerificationLevel === VerificationLevel.Orb && feedbackMessage) || 'Falló (Orb)',
          pending: (activeVerificationLevel === VerificationLevel.Orb && feedbackMessage) || 'Procesando (Orb)...',
          success: (activeVerificationLevel === VerificationLevel.Orb && feedbackMessage) || '¡Verificado (Orb)!',
        }}
        state={hideInternalFeedback || activeVerificationLevel !== VerificationLevel.Orb ? undefined : componentState === 'idle' ? undefined : componentState}
        className="w-full"
      >
        <Button
          onClick={() => handleVerifyClick(VerificationLevel.Orb)}
          disabled={currentOrbButtonState.disabled}
          size="lg"
          variant={currentOrbButtonState.variant}
          className="w-full py-3 text-base"
        >
          {currentOrbButtonState.text}
        </Button>
      </LiveFeedback>
    </div>
  );
};