'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
// Importaciones de MiniKit para el flujo de login SIWE en esta página
import {
  MiniKit,
  WalletAuthInput,
  MiniAppWalletAuthSuccessPayload,
  MiniAppWalletAuthErrorPayload,
} from '@worldcoin/minikit-js';

// Interfaz para la información del usuario
interface UserInfo {
  address: string;
  username: string | null;
}

// Componente Placeholder para el Avatar
const UserAvatarPlaceholder = ({ className }: { className?: string }) => (
  <div className={`bg-slate-300 rounded-full flex items-center justify-center overflow-hidden ${className || "w-24 h-24"}`}>
    <svg className="w-3/4 h-3/4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
    </svg>
  </div>
);

// Constantes para la visualización y animación del pool
const TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL = 50;
const CONTRIBUTION_ANIMATION_DURATION = 2200; // ms - Duración animación chispa principal
const USER_INFO_LOCALSTORAGE_KEY = "worldIdUserInfo"; // Key de tu código
const POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2"; // Key de tu código

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = React.useState(true);
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [animateNewContribution, setAnimateNewContribution] = React.useState(false);
  const [animationTriggerKey, setAnimationTriggerKey] = React.useState(0);
  const [poolContributionsCount, setPoolContributionsCount] = React.useState(0);
  const [pulsePool, setPulsePool] = React.useState(false);

  // Estados para el flip del pool de energía
  const [isPoolFlipped, setIsPoolFlipped] = React.useState(false);
  const [simulatedPoolTotalValue, setSimulatedPoolTotalValue] = React.useState<number>(12345.67);


  React.useEffect(() => {
    console.log("Dashboard [Mount]: Leyendo de localStorage con clave:", POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY);
    const savedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
    setPoolContributionsCount(savedContributions);
    console.log("Dashboard [Mount]: Contribuciones iniciales cargadas:", savedContributions);

    const storedUser = localStorage.getItem(USER_INFO_LOCALSTORAGE_KEY);
    if (storedUser) {
      try { setUserInfo(JSON.parse(storedUser)); }
      catch (e) { localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY); }
    }
    setIsLoadingUserInfo(false);
  }, []);

  React.useEffect(() => {
    const contributionParam = searchParams.get('contribution');
    if (contributionParam === 'true') {
      setAnimateNewContribution(true); 
      setAnimationTriggerKey(prevKey => prevKey + 1);
      const updatedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
      setPoolContributionsCount(updatedContributions);
      setPulsePool(true); 
      const currentPath = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: currentPath, url: currentPath }, '', currentPath);
      
      const animationClearTimer = setTimeout(() => setAnimateNewContribution(false), CONTRIBUTION_ANIMATION_DURATION);
      const pulseTimer = setTimeout(() => setPulsePool(false), 1200); 
      return () => { clearTimeout(animationClearTimer); clearTimeout(pulseTimer); };
    }
  }, [searchParams]);

  const poolFillPercentage = Math.min((poolContributionsCount / TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL) * 100, 100);

  // --- FUNCIÓN DE INICIO DE SESIÓN CON WORLD ID MINIKIT (SIWE) ---
  // ** DEBES COMPLETAR ESTA FUNCIÓN CON TU LÓGICA REAL DE MINIKIT Y LLAMADAS A TUS ENDPOINTS /api/nonce y /api/complete-siwe **
  const handleSignInWithWorldID = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    if (typeof window !== 'undefined' && !MiniKit.isInstalled()) {
      setAuthError('World App no está instalado o MiniKit no está disponible.');
      setIsAuthLoading(false); alert('Asegúrate de tener World App instalado.'); return;
    }
    try {
      console.log("Dashboard: Solicitando nonce para SIWE...");
      const nonceRes = await fetch('/api/nonce'); // TU ENDPOINT
      if (!nonceRes.ok) { throw new Error((await nonceRes.json().catch(()=>({}))).message || 'Error al obtener nonce.'); }
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error('Nonce inválido.');
      
      const authRequest: WalletAuthInput = { nonce, statement: 'Inicia sesión en la plataforma.' };
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth(authRequest);

      if (finalPayload.status === 'error') {
        const errP = finalPayload as MiniAppWalletAuthErrorPayload;
        throw new Error((errP as any)?.detail || (errP as any)?.message || `Error de Autenticación (Código: ${(errP as any)?.code})`);
      }
      const successPayload = finalPayload as MiniAppWalletAuthSuccessPayload;
      
      const verifyRes = await fetch('/api/complete-siwe', { // TU ENDPOINT
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: successPayload, nonce, username: MiniKit.user?.username || null }),
      });
      const verificationResult = await verifyRes.json();
      if (!verifyRes.ok || !verificationResult.isValid) { throw new Error(verificationResult.message || 'Verificación SIWE fallida.'); }

      const authenticatedUserInfo: UserInfo = { address: successPayload.address, username: MiniKit.user?.username || null };
      setUserInfo(authenticatedUserInfo);
      localStorage.setItem(USER_INFO_LOCALSTORAGE_KEY, JSON.stringify(authenticatedUserInfo));
      setAuthError(null);
      console.log("Dashboard: Usuario autenticado (SIWE) y sesión guardada en localStorage:", authenticatedUserInfo);
      // Si usas NextAuth, aquí llamarías a signIn()
    } catch (err: any) {
      setAuthError(err.message || 'Error en inicio de sesión.');
      setUserInfo(null); localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    setUserInfo(null);
    router.push('/'); 
  };
  
  const handlePoolClick = () => {
    setIsPoolFlipped(!isPoolFlipped);
    if (!isPoolFlipped) { 
        setSimulatedPoolTotalValue(parseFloat((poolContributionsCount * 12.34 + 4321 + Math.random() * 600).toFixed(2)));
    }
  };

  const baseButtonClass = "w-full px-6 py-3 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-md disabled:hover:scale-100";

  if (isLoadingUserInfo) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-100"><p className="text-slate-700 animate-pulse">Cargando Dashboard...</p></div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-100 via-sky-50 to-slate-100 text-slate-800 relative overflow-hidden">
      
      {/* Chispa de energía del APORTE DEL USUARIO ACTUAL (más grande y centrada al inicio) */}
      {animateNewContribution && userInfo && (
        <div 
            key={animationTriggerKey} 
            // Este div es el contenedor para posicionar la animación inicial de la chispa
            className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none" 
        >
          <div className="flying-energy-spark">✨</div> {/* La chispa que se anima */}
        </div>
      )}

      <header className="mb-6 md:mb-8 text-center w-full max-w-md relative z-20">
        <h1 className="text-4xl md:text-5xl font-bold text-sky-700 [text-shadow:_0_2px_2px_rgb(255_255_255_/_70%)]">
          Dashboard Principal
        </h1>
        {authError && <p className="text-red-600 mt-2 text-sm bg-red-100 px-3 py-1 rounded-md shadow">{authError}</p>}
      </header>

      {userInfo ? (
        <>
          {/* Tarjeta de Usuario */}
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
              {isAuthLoading && userInfo ? 'Cerrando Sesión...' : 'Cerrar Sesión'}
            </button>
          </div>

          {/* Sección Visible del Pool de "Energía" (Vertical) - INTERACTIVO (FLIP) */}
          <section 
            id="energy-pool-section"
            onClick={handlePoolClick}
            className={`w-full max-w-xs sm:max-w-sm my-4 md:my-6 rounded-2xl shadow-xl text-center relative overflow-hidden border-4 border-sky-400/50 z-10 cursor-pointer group energy-pool-card-container ${isPoolFlipped ? 'is-flipped' : ''}`}
            // El fondo se aplica a las caras para permitir el flip
          >
            <div className="energy-pool-flip-inner"> {/* Para la animación de flip */}
              {/* CARA FRONTAL DEL POOL (Nivel de llenado) */}
              <div className="energy-pool-card-face energy-pool-card-front p-6 bg-gradient-to-br from-sky-500 to-sky-700">
                <div className={`absolute inset-0 bg-white/20 transition-all duration-500 ease-out ${pulsePool ? 'opacity-100 scale-110 animate-pulse-strong' : 'opacity-0 scale-100'}`}></div>
                
                {/* Pequeñas cargas ambientales */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-xl">
                    {Array.from({length: 7}).map((_,i) =>( // Pequeñas chispas ambientales
                        <div key={`other-user-charge-${i}`} className="other-user-ambient-charge" style={{
                            left: `${5 + Math.random()*90}%`, 
                            animationDelay: `${Math.random() * 6 + i * 0.3}s`, 
                            animationDuration: `${Math.random() * 5 + 5}s` 
                        }}></div>
                    ))}
                </div>

                <div className="relative z-10"> {/* Contenido del pool */}
                  <h3 className="text-2xl font-semibold text-white mb-2 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">Fondo Comunitario</h3>
                  <p className="text-sm text-sky-100 mb-5 [text-shadow:_0_1px_1px_rgb(0_0_0_/_30%)]">Energía Colectiva</p>
                  <div className="energy-pool-visual-container mx-auto">
                    <div className="energy-pool-fill" style={{ 
                      height: `${poolFillPercentage}%`,
                      backgroundColor: `hsl(${180 + poolFillPercentage * 0.6}, 70%, ${50 + poolFillPercentage * 0.1}%)` 
                    }}>
                      <div className="energy-pool-surface-glow"></div>
                    </div>
                    <div className="energy-pool-markings">
                        <span>0%</span> {/* Texto directo para 0% */}
                        <span>MAX</span>
                    </div>
                  </div>
                  <p className="text-lg text-white mt-5 font-bold [text-shadow:_0_1px_1px_rgb(0_0_0_/_30%)]">
                    {poolContributionsCount.toLocaleString()} Aportes del Usuario
                  </p>
                  <p className="text-xs text-sky-200">(Clic para ver valor total)</p>
                </div>
              </div>

              {/* CARA TRASERA DEL POOL (Total Acumulado Simulado) */}
              <div className="energy-pool-card-face energy-pool-card-back p-6 bg-gradient-to-br from-slate-700 to-slate-900">
                 <h3 className="text-xl font-semibold text-sky-300 mb-2 [text-shadow:_0_1px_1px_rgb(0_0_0_/_30%)]">Valor Estimado del Fondo</h3>
                 <p className="text-4xl font-bold text-yellow-300 my-4 md:my-6 [text-shadow:_0_2px_4px_rgb(0_0_0_/_50%)]">
                    ${simulatedPoolTotalValue.toLocaleString()}
                 </p>
                 <p className="text-xs text-slate-300 mb-3">(Valor Total Simulado de la Comunidad)</p>
                 <p className="text-sm text-slate-100">Este fondo representa el esfuerzo colectivo.</p>
                 <p className="text-xs text-slate-400 mt-4">(Clic para ver tus aportes)</p>
              </div>
            </div>
          </section>

          <main className="grid w-full max-w-md gap-4 md:gap-5 relative z-20 mt-6 md:mt-8">
            <button type="button" onClick={() => router.push('/exchange')} 
                className={`${baseButtonClass} bg-green-600 hover:bg-green-500 focus:ring-green-300 text-white`}>
                Intercambio WLD/USDC
            </button>
            <button type="button" onClick={() => router.push('/microloand/apply')}
                className={`${baseButtonClass} bg-blue-600 hover:bg-blue-500 focus:ring-blue-300 text-white`}>
                Solicitar Microcrédito
            </button>
            <button type="button" onClick={() => router.push('/survey-saving')} 
                className={`${baseButtonClass} bg-purple-600 hover:bg-purple-500 focus:ring-purple-300 text-white`}>
                Encuestas Interactivas
            </button>
          </main>
        </>
      ) : (
        <div className="w-full max-w-xs mx-auto my-16 md:my-20 p-8 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/50 relative z-20">
           <p className="text-md text-slate-700 text-center mt-3 mb-6">Conéctate con World ID para participar.</p>
          <button
              type="button" onClick={handleSignInWithWorldID} disabled={isAuthLoading}
              className={`${baseButtonClass} bg-sky-600 hover:bg-sky-500 focus:ring-sky-300 text-white py-3`}
          >
              {isAuthLoading ? 'Conectando...' : 'Iniciar Sesión con World ID'}
          </button>
        </div>
      )}

      <footer className="mt-12 text-center text-sm text-slate-500 relative z-20">
        <p>&copy; {new Date().getFullYear()} Tu App. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}