'use client';

import { Page } from '@/components/PageLayout';
import { Verify, VerifyProps } from '@/components/Verify'; // Asumo que estas props son las que usa tu Verify
import { ISuccessResult } from '@worldcoin/minikit-js'; // Solo ISuccessResult
import * as React from 'react';
import { useSession, signOut } from 'next-auth/react'; // signIn no se usa aquí si Verify.tsx lo maneja
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession(); // Renombrado status para claridad
  const router = useRouter();
  const accessAction = process.env.NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION;

  const handleLoginSuccess = (proofData: ISuccessResult, actionVerified: string, nullifierHash: string) => {
    console.log(`HomePage: Verify component reported success for action ${actionVerified}, nullifier: ${nullifierHash}.`);
    // La redirección es manejada por el componente Verify si se pasa redirectToOnGeneralAccessSuccess.
  };

  const handleLoginError = (error: any, actionAttempted: string) => {
    console.error(`HomePage: Verify component reported error for action ${actionAttempted}:`, error);
    // Aquí podrías añadir lógica para mostrar el error en la UI si lo deseas
  };

  // --- Splash Screen Mejorada y Responsiva ---
  if (sessionStatus === "loading") {
    return (
      <Page>
        <Page.Main>
          <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-gradient-to-br from-sky-700 via-indigo-700 to-purple-800">
            <Image
              src="/LogoC.png"
              alt="Logo de CapitalWup"
              width={220} // Base width for aspect ratio
              height={220} // Base height for aspect ratio
              className="mb-8 sm:mb-10 animate-bounce drop-shadow-2xl w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56" // Tamaños responsivos
              priority
            />
            <p className="text-sky-100 text-xl sm:text-2xl font-light [text-shadow:_0_1px_3px_rgb(0_0_0_/_40%)]">
              Iniciando CapitalWup...
            </p>
            <div className="mt-10 sm:mt-12 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 border-4 border-t-sky-100 border-r-sky-100 border-b-sky-100 border-l-white rounded-full animate-spin"></div>
          </div>
        </Page.Main>
      </Page>
    );
  }

  // --- Vista de Usuario Autenticado (Responsiva) ---
  if (session) {
    return (
      <Page>
        <Page.Main>
          <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-100">
            <div className="w-full max-w-md text-center bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl">
              <Image
                src="/LogoC.png"
                alt="Logo CapitalWup"
                width={90} // Base width
                height={90} // Base height
                className="mx-auto mb-5 sm:mb-6 w-16 h-16 sm:w-20 sm:h-20 md:w-[90px] md:h-[90px]" // Tamaños responsivos
              />
              {(session.user as any)?.profilePictureUrl ? (
                <Image
                  src={(session.user as any).profilePictureUrl}
                  alt="Foto de perfil"
                  width={100} // Base width
                  height={100} // Base height
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-5 shadow-md object-cover border-2 border-white" // Ligeramente responsiva
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-200 rounded-full mx-auto mb-5 flex items-center justify-center text-slate-500 text-3xl sm:text-4xl font-semibold shadow-md">
                  {((session.user?.name || (session.user as any)?.username || "U")[0] || "U").toUpperCase()}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-800">
                ¡Bienvenido, <span className="font-bold text-sky-600">{(session.user as any)?.username || session.user?.name || 'Usuario'}</span>!
              </h2>
              <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-md">Has accedido a CapitalWup.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full mb-3 sm:mb-4 px-5 sm:px-6 py-3 sm:py-3.5 text-base sm:text-lg font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-transform hover:scale-105 active:scale-100"
              >
                Ir al Dashboard
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full px-5 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-blue-600 bg-transparent border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-shadow hover:shadow-md"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </Page.Main>
      </Page>
    );
  }

  // --- Vista de Error de Configuración (Responsiva) ---
  if (!accessAction) {
    return (
      <Page>
        <Page.Main>
            <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-100">
                <div className="w-full max-w-md text-center bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl">
                    <Image
                      src="/LogoC.png"
                      alt="Logo CapitalWup"
                      width={100} // Base width
                      height={100} // Base height
                      className="mx-auto mb-5 sm:mb-6 opacity-70 w-20 h-20 sm:w-24 sm:h-24 md:w-[100px] md:h-[100px]" // Tamaños responsivos
                    />
                    <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-2 sm:mb-3">Error de Configuración</h1>
                    <p className="text-sm sm:text-md text-red-700">
                    Falta la acción de acceso general de World ID.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">(Revisa <code>NEXT_PUBLIC_WORLD_ID_ACCESS_ACTION</code>)</p>
                </div>
            </div>
        </Page.Main>
      </Page>
    );
  }

  // --- Vista de Login para Usuario No Autenticado (Pantalla Completa, Responsiva) ---
  return (
    <Page>
      <Page.Main>
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-red-600 via-purple-700 to-blue-700 text-white">
          <div className="w-full max-w-md sm:max-w-lg text-center"> {/* Ajustado max-w para diferentes pantallas */}
            <Image
              src="/LogoC.png"
              alt="Logo de CapitalWup"
              width={220} // Base width
              height={220} // Base height
              className="mx-auto mb-8 sm:mb-10 drop-shadow-2xl w-36 h-36 sm:w-48 sm:h-48 md:w-[220px] md:h-[220px]" // Tamaños responsivos
            />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-4 [text-shadow:_0_2px_5px_rgb(0_0_0_/_40%)]">
              Bienvenido a CapitalWup
            </h2>
            <p className="mb-8 sm:mb-12 text-lg sm:text-xl md:text-2xl text-indigo-100 [text-shadow:_0_1px_3px_rgb(0_0_0_/_30%)] leading-relaxed max-w-md sm:max-w-xl mx-auto">
              Verifica tu identidad para acceder a nuestra comunidad financiera en Ecuador.
            </p>
            
            <div className="max-w-xs sm:max-w-sm mx-auto space-y-4 sm:space-y-5"> {/* Ajustado max-w y space para Verify */}
              <Verify
                actionToVerify={accessAction}
                onVerificationSuccess={handleLoginSuccess}
                onVerificationError={handleLoginError}
                orbButtonText="Acceder con Orb"
                deviceButtonText="Acceder con Dispositivo"
                redirectToOnGeneralAccessSuccess="/dashboard"
              />
            </div>
            <p className="text-xs text-purple-200/90 mt-10 sm:mt-12 md:mt-16">Al verificar, aceptas nuestros <a href="#" className="underline hover:text-white">Términos</a> y <a href="#" className="underline hover:text-white">Privacidad</a>.</p>
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}