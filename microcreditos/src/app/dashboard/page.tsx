// src/app/dashboard/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
// Importaciones de MiniKit que necesitarás para handleSignInWithWorldID
import {
  MiniKit,
  WalletAuthInput,
  MiniAppWalletAuthSuccessPayload,
  MiniAppWalletAuthErrorPayload,
} from '@worldcoin/minikit-js';

interface UserInfo {
  address: string;
  username: string | null;
}

const UserAvatarPlaceholder = ({ className }: { className?: string }) => (
  <div className={`bg-slate-300 rounded-full flex items-center justify-center overflow-hidden ${className || "w-24 h-24"}`}>
    <svg className="w-3/4 h-3/4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
    </svg>
  </div>
);

const TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL = 50; // Contribuciones para que el pool se vea "lleno"
const CONTRIBUTION_ANIMATION_DURATION = 1800; // ms
const USER_INFO_LOCALSTORAGE_KEY = "worldIdUserInfo"; // Key para info de usuario
const POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2"; // Key para aportes al pool

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = React.useState(true);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false); // Para el proceso de login/logout
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [animateNewContribution, setAnimateNewContribution] = React.useState(false);
  const [animationTriggerKey, setAnimationTriggerKey] = React.useState(0);
  const [poolContributionsCount, setPoolContributionsCount] = React.useState(0);
  const [pulsePool, setPulsePool] = React.useState(false);

  // Cargar estado inicial del usuario y contador de contribuciones del pool
  React.useEffect(() => {
    const savedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
    setPoolContributionsCount(savedContributions);

    const storedUser = localStorage.getItem(USER_INFO_LOCALSTORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser: UserInfo = JSON.parse(storedUser);
        setUserInfo(parsedUser);
        // Opcional: Si necesitas repoblar el estado interno de MiniKit al cargar
        // if (MiniKit.isInitialized() && parsedUser.address && typeof window !== 'undefined') {
        //    ((window as any).MiniKit as any).walletAddress = parsedUser.address;
        //    ((window as any).MiniKit.user as any).username = parsedUser.username;
        // }
      } catch (e) {
        console.error("Error parsing user info from localStorage", e);
        localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
      }
    }
    setIsLoadingUserInfo(false);
  }, []);

  // Efecto para la animación de NUEVA contribución directa del usuario
  React.useEffect(() => {
    if (searchParams.get('contribution') === 'true') {
      setAnimateNewContribution(true); // Dispara la animación de la "chispa"
      setAnimationTriggerKey(prevKey => prevKey + 1);

      // El contador ya se actualizó en localStorage DESDE la página que originó la contribución (exchange o survey)
      // Aquí solo leemos el valor más reciente para actualizar el % de llenado visual
      const updatedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
      setPoolContributionsCount(updatedContributions);
      
      setPulsePool(true); // Activar pulso del pool por la nueva contribución

      // Limpiar el parámetro de la URL
      const currentPath = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: currentPath, url: currentPath }, '', currentPath);

      const animationTimer = setTimeout(() => setAnimateNewContribution(false), CONTRIBUTION_ANIMATION_DURATION);
      const pulseTimer = setTimeout(() => setPulsePool(false), 800); // Duración del pulso visual del pool
      return () => { clearTimeout(animationTimer); clearTimeout(pulseTimer); };
    }
  }, [searchParams]);

  const poolFillPercentage = Math.min((poolContributionsCount / TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL) * 100, 100);

  // --- FUNCIÓN DE INICIO DE SESIÓN CON WORLD ID MINIKIT (COMPLETA ESTA LÓGICA) ---
  const handleSignInWithWorldID = async () => {
    setIsAuthLoading(true);
    setAuthError(null);

    if (typeof window !== 'undefined' && !MiniKit.isInstalled()) {
      setAuthError('World App no está instalado o MiniKit no está disponible.');
      setIsAuthLoading(false);
      alert('Por favor, asegúrate de tener World App instalado y configurado.');
      return;
    }

    try {
      // 1. Obtener el nonce de tu backend
      console.log("Dashboard: Solicitando nonce...");
      const nonceRes = await fetch('/api/nonce'); // Necesitas este endpoint
      if (!nonceRes.ok) {
        const errData = await nonceRes.json().catch(() => ({ message: 'Error al obtener nonce del servidor.' }));
        throw new Error(errData.message || 'No se pudo obtener el nonce.');
      }
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error('Nonce inválido recibido.');
      console.log("Dashboard: Nonce recibido:", nonce);

      // 2. Preparar y ejecutar el comando walletAuth de MiniKit
      const authRequest: WalletAuthInput = {
        nonce: nonce,
        statement: 'Inicia sesión en la plataforma con tu World ID.',
      };
      console.log("Dashboard: Enviando solicitud walletAuth a MiniKit...");
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth(authRequest);

      if (finalPayload.status === 'error') {
        const errorPayload = finalPayload as MiniAppWalletAuthErrorPayload;
        const errorMessage = (errorPayload as any)?.detail || (errorPayload as any)?.message || 
                             `Error de Autenticación (Código: ${(errorPayload as any)?.code || 'desconocido'})`;
        console.error("Dashboard: Error de MiniKit walletAuth:", errorPayload);
        throw new Error(errorMessage);
      }
      
      const successPayload = finalPayload as MiniAppWalletAuthSuccessPayload;
      console.log("Dashboard: Prueba de walletAuth obtenida:", successPayload);

      const addressFromPayload = successPayload.address;
      // MiniKit.user.username debería estar disponible después de un auth exitoso
      const usernameFromMiniKit = MiniKit.user?.username; 

      if (!addressFromPayload) {
          throw new Error("No se pudo obtener la dirección de la billetera desde el payload de éxito.");
      }

      // 3. Enviar el payload al backend para verificación SIWE
      console.log("Dashboard: Enviando prueba a /api/complete-siwe para verificación...");
      const verifyRes = await fetch('/api/complete-siwe', { // Necesitas este endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: successPayload, 
          nonce: nonce, 
          username: usernameFromMiniKit || null,
        }),
      });

      const verificationBackendResult = await verifyRes.json();
      if (!verifyRes.ok || !verificationBackendResult.isValid) {
        console.error("Dashboard: Error de verificación SIWE en backend:", verificationBackendResult);
        throw new Error(verificationBackendResult.message || 'La verificación de la firma SIWE falló en el backend.');
      }
      console.log("Dashboard: Verificación SIWE en backend exitosa.");

      // 4. Autenticación Exitosa
      const authenticatedUserInfo: UserInfo = {
        address: addressFromPayload,
        username: usernameFromMiniKit || null,
      };
      setUserInfo(authenticatedUserInfo);
      localStorage.setItem(USER_INFO_LOCALSTORAGE_KEY, JSON.stringify(authenticatedUserInfo));
      setAuthError(null);
      console.log("Dashboard: Usuario autenticado y sesión guardada:", authenticatedUserInfo);

    } catch (err: any) {
      console.error('Dashboard: Error detallado en handleSignInWithWorldID:', err);
      setAuthError(err.message || 'Ocurrió un error desconocido durante el inicio de sesión.');
      setUserInfo(null);
      localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    } finally {
      setIsAuthLoading(false);
    }
  };
  // --- FIN DE LA FUNCIÓN DE INICIO DE SESIÓN ---

  const handleSignOut = () => {
    localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    setUserInfo(null);
    // No reseteamos el poolContributionsCount aquí, ya que es "comunitario"
    // y persiste para el navegador del usuario independientemente de su sesión de login.
    router.push('/'); // O a tu página de login
  };
  
  const baseButtonClass = "w-full px-6 py-3 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:hover:scale-100";

  if (isLoadingUserInfo) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-100"><p className="text-slate-700 animate-pulse">Cargando Dashboard...</p></div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-200 via-sky-100 to-slate-200 text-slate-800 relative">
      
      {/* "Chispa" animada para la contribución individual del usuario */}
      {animateNewContribution && userInfo && (
        <div key={animationTriggerKey} className="flying-energy-spark">✨</div>
      )}

      <header className="mb-6 md:mb-8 text-center w-full max-w-md relative z-20">
        <h1 className="text-4xl md:text-5xl font-bold text-sky-700 [text-shadow:_0_2px_2px_rgb(255_255_255_/_70%)]">
          Dashboard Principal
        </h1>
        {authError && <p className="text-red-600 mt-2 text-sm bg-red-100 px-3 py-1 rounded-md shadow">{authError}</p>}
      </header>

      {/* Contenido principal: Tarjeta de usuario (o login) y luego el pool */}
      {userInfo ? (
        <>
          <div className="mb-6 md:mb-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/50 relative z-20">
            <UserAvatarPlaceholder className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 border-4 border-white shadow-lg" />
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate text-center">
              {userInfo.username || 'Usuario Verificado'}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 break-all mt-1 mb-5 text-center">
              {userInfo.address}
            </p>
            <button
              type="button" onClick={handleSignOut} disabled={isAuthLoading}
              className="w-full max-w-xs mx-auto px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-300 rounded-lg shadow-md"
            >
              {isAuthLoading && userInfo ? 'Cerrando...' : 'Cerrar Sesión'}
            </button>
          </div>

          {/* Sección Visible del Pool de "Energía" */}
          <section 
            id="energy-pool-section"
            className="w-full max-w-md my-6 md:my-8 p-6 bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl shadow-xl text-center relative overflow-hidden border-4 border-sky-400/50 z-10"
          >
            {/* Efecto de pulso al recibir contribución del usuario actual */}
            <div className={`absolute inset-0 bg-sky-300 transition-opacity duration-700 ease-out ${pulsePool ? 'opacity-20 animate-pulse-strong' : 'opacity-0'}`}></div>
            
            {/* Efecto de fondo ambiental (partículas) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              {Array.from({length: 15}).map((_,i) => (
                <div key={`particle-${i}`} className="pool-particle" style={{
                  left: `${Math.random()*100}%`,
                  animationDelay: `${Math.random()*5}s`,
                  animationDuration: `${Math.random()*10 + 10}s`, // Duraciones más largas para efecto sutil
                  width: `${Math.random()*3+1}px`,
                  height: `${Math.random()*3+1}px`,
                  opacity: Math.random() * 0.3 + 0.1, // Opacidad inicial baja
                }}></div>
              ))}
            </div>

            <div className="relative z-10"> {/* Contenido del pool encima de los efectos de fondo */}
              <h3 className="text-2xl font-semibold text-white mb-2 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">Fondo Comunitario</h3>
              <p className="text-sm text-sky-100 mb-5 [text-shadow:_0_1px_1px_rgb(0_0_0_/_30%)]">Creciendo con el apoyo de la comunidad.</p>
              
              <div className="energy-pool-container mx-auto"> {/* El "vaso" que se llena */}
                <div className="energy-pool-fill" style={{ height: `${poolFillPercentage}%` }}>
                  <div className="energy-pool-surface-glow"></div>
                </div>
                <div className="energy-pool-markings">
                  <span></span> {/* Para la marca de 0% implícita en la base */}
                  <span>MAX</span> {/* Para la marca del 100% arriba */}
                </div>
              </div>
              
              <p className="text-lg text-white mt-5 font-bold [text-shadow:_0_1px_1px_rgb(0_0_0_/_30%)]">
                {poolContributionsCount.toLocaleString()} Aportes Registrados
              </p>
              <p className="text-xs text-sky-200">(Tu participación directa ayuda a este fondo)</p>
            </div>
          </section>

          <main className="grid w-full max-w-md gap-4 md:gap-5 relative z-20">
             {/* ... Tus botones de acción ... */}
            <button type="button" onClick={() => router.push('/exchange')} 
                className={`${baseButtonClass} bg-green-600 hover:bg-green-500 focus:ring-green-300 text-white`}>
                Realizar Intercambio
            </button>
            <button type="button" onClick={() => router.push('/microloan/apply')} 
                className={`${baseButtonClass} bg-blue-600 hover:bg-blue-500 focus:ring-blue-300 text-white`}>
                Solicitar Microcrédito
            </button>
            <button type="button" onClick={() => router.push('/survey-savings')} 
                className={`${baseButtonClass} bg-purple-600 hover:bg-purple-500 focus:ring-purple-300 text-white`}>
                Encuestas y Ahorro
            </button>
          </main>
        </>
      ) : (
        // Sección de Iniciar Sesión si no hay usuario
        <div className="w-full max-w-xs mx-auto my-16 md:my-20 p-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/50 relative z-20">
           <p className="text-md text-slate-700 text-center mt-3 mb-6">
            Conéctate con World ID para participar.
          </p>
          <button
              type="button" onClick={handleSignInWithWorldID} disabled={isAuthLoading}
              className={`${baseButtonClass} bg-sky-600 hover:bg-sky-500 focus:ring-sky-300 text-white py-3`}
          >
              {isAuthLoading ? 'Conectando...' : 'Iniciar Sesión con World ID'}
          </button>
        </div>
      )}

      <footer className="mt-12 text-center text-sm text-slate-500 relative z-20">
        <p>&copy; {new Date().getFullYear()} MIcrocredito. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}