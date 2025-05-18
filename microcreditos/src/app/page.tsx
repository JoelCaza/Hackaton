// src/app/page.tsx
'use client';

import { Page } from '@/components/PageLayout'; 
import { Verify, VerifyProps } from '@/components/Verify'; // Importa Verify y sus Props
import { ISuccessResult, VerificationLevel } from '@worldcoin/minikit-js';
import * as React from 'react'; 
import { useSession, signOut } from 'next-auth/react'; 
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const accessAction = process.env.NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION;

  const handleLoginSuccess = (proofData: ISuccessResult, actionVerified: string, nullifierHash: string) => {
    console.log(`HomePage: Login/WorldID verification step successful for action ${actionVerified}, nullifier: ${nullifierHash}. NextAuth signIn called by Verify component.`);
    // La redirección es manejada por el componente Verify si se pasa redirectToOnGeneralAccessSuccess
    // O por NextAuth después de un signIn exitoso.
  };

  const handleLoginError = (error: any, actionAttempted: string) => {
    console.error(`HomePage: Error en login/WorldID verification step para acción ${actionAttempted}:`, error);
  };

  if (status === "loading") {
    return <Page><Page.Main><div className="text-center p-10">Cargando sesión...</div></Page.Main></Page>;
  }

  if (session) { 
    return (
      <Page>
        <Page.Header><h1 className="text-2xl font-bold">Microcréditos</h1></Page.Header>
        <Page.Main>
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="w-full max-w-sm text-center">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">¡Bienvenido, {session.user?.username || session.user?.name || 'Usuario'}!</h2>
              {session.user?.profilePictureUrl && (
                <img src={session.user.profilePictureUrl} alt="Foto de perfil" className="w-24 h-24 rounded-full mx-auto mb-4" />
              )}
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full mb-4 px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700"
              >
                Ir al Dashboard
              </button>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })} 
                className="w-full px-6 py-3 text-lg font-medium text-blue-600 bg-transparent border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </Page.Main>
      </Page>
    );
  }

  if (!accessAction) {
    return (
      <Page>
        <Page.Header><h1 className="text-2xl font-bold">Microcréditos</h1></Page.Header>
        <Page.Main>
          <div className="p-4 my-4 text-center text-red-700 bg-red-100 border border-red-400 rounded">
            Error de Configuración: Falta la acción de acceso general.
          </div>
        </Page.Main>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header><h1 className="text-2xl font-bold">Microcréditos</h1></Page.Header>
      <Page.Main>
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="w-full max-w-sm text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Bienvenido a Microcréditos</h2>
            <p className="mb-6 text-gray-600">Verifica tu identidad para acceder.</p>
            {/* El componente Verify ahora muestra ambos botones por defecto.
              No necesitas pasar 'verificationLevelToUse' o 'buttonText' a menos que quieras
              sobreescribir los textos por defecto 'orbButtonText' o 'deviceButtonText'.
            */}
            <Verify
              actionToVerify={accessAction}
              onVerificationSuccess={handleLoginSuccess}
              onVerificationError={handleLoginError}
              // verificationLevelToUse y buttonText ya no son props directas de esta manera
              // Puedes usar orbButtonText y deviceButtonText para cambiar los textos
              orbButtonText="Acceder con Orb" // Opcional
              deviceButtonText="Acceder con Dispositivo" // Opcional
              redirectToOnGeneralAccessSuccess="/dashboard" 
            />
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}