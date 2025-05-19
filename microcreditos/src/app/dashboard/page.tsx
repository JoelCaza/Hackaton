// src/app/dashboard/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react'; // React completo para hooks
import {
  MiniKit,
  WalletAuthInput,
  MiniAppWalletAuthSuccessPayload,
  MiniAppWalletAuthErrorPayload,
} from '@worldcoin/minikit-js';
import Image from 'next/image';

// --- Interfaz de Usuario ---
interface UserInfo {
  address: string;
  username: string | null;
}

// --- Placeholder de Avatar de Usuario Mejorado ---
const UserAvatarPlaceholder = ({ className, initial }: { className?: string, initial?: string }) => (
  <div className={`bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden ${className || "w-24 h-24"} shadow-md`}>
    {initial ? (
      // Eliminada la clase [text-shadow:...] que causaba errores de TypeScript
      <span className="text-3xl md:text-4xl font-semibold text-white">{initial}</span>
    ) : (
      <svg className="w-3/4 h-3/4 text-sky-100/80" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
      </svg>
    )}
  </div>
);

// --- Constantes ---
const TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL = 50;
const CONTRIBUTION_ANIMATION_DURATION = 1800;
const USER_INFO_LOCALSTORAGE_KEY = "worldIdUserInfo";
const POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2";

// --- Iconos Placeholder ---
const ExchangeIcon = ({ className = "w-10 h-10 sm:w-12 sm:h-12 text-current" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18m-7.5-14L21 7.5m0 0L16.5 12M21 7.5H3" />
  </svg>
);
const MicroloanIcon = ({ className = "w-10 h-10 sm:w-12 sm:h-12 text-current" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m0 0H21m-9 12.75h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V10.5zm0 2.25h.008v.008h-.008v-.008zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const SurveyIcon = ({ className = "w-10 h-10 sm:w-12 sm:h-12 text-current" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125v-3.375c0-.621.504-1.125 1.125-1.125h1.5zM17.25 10.5h.008v.008h-.008V10.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.875 2.25c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h1.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM10.5 15h.008v.008H10.5V15Zm0 2.25h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Z" />
  </svg>
);
const WorldIdIcon = ({className = "w-6 h-6"} : {className?: string}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
);

// --- Definición de Acciones para el Carrusel (Rutas Corregidas) ---
const actions = [
  { id: 'exchange', title: 'Intercambios', description: 'Gestiona activos y explora nuevas oportunidades.', icon: <ExchangeIcon />, gradientFrom: 'from-green-500', gradientTo: 'to-green-700', hoverGradientFrom: 'hover:from-green-600', hoverGradientTo: 'hover:to-green-800', ringColor: 'focus:ring-green-400', path: '/exchange', textColor: 'text-white'},
  { id: 'microloan', title: 'Microcréditos', description: 'Accede a financiación rápida para tus proyectos.', icon: <MicroloanIcon />, gradientFrom: 'from-blue-500', gradientTo: 'to-blue-700', hoverGradientFrom: 'hover:from-blue-600', hoverGradientTo: 'hover:to-blue-800', ringColor: 'focus:ring-blue-400', path: '/microloand/apply', textColor: 'text-white'},
  { id: 'survey', title: 'Encuestas y Ahorro', description: 'Participa y obtén recompensas.', icon: <SurveyIcon />, gradientFrom: 'from-purple-500', gradientTo: 'to-purple-700', hoverGradientFrom: 'hover:from-purple-600', hoverGradientTo: 'hover:to-purple-800', ringColor: 'focus:ring-purple-400', path: '/survey-saving', textColor: 'text-white'},
];

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
  const [isPoolCardFlipped, setIsPoolCardFlipped] = React.useState(false);

  React.useEffect(() => {
    const savedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
    setPoolContributionsCount(savedContributions);
    const storedUser = localStorage.getItem(USER_INFO_LOCALSTORAGE_KEY);
    if (storedUser) {
      try { setUserInfo(JSON.parse(storedUser)); }
      catch (e) { console.error("Error parsing user info", e); localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY); }
    }
    setIsLoadingUserInfo(false);
  }, []);

  React.useEffect(() => {
    if (searchParams.get('contribution') === 'true') {
      setAnimateNewContribution(true);
      setAnimationTriggerKey(prevKey => prevKey + 1);
      const updatedContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
      setPoolContributionsCount(updatedContributions);
      setPulsePool(true);
      setIsPoolCardFlipped(false); 

      const currentPath = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: currentPath, url: currentPath }, '', currentPath);
      const animationTimer = setTimeout(() => setAnimateNewContribution(false), CONTRIBUTION_ANIMATION_DURATION);
      const pulseTimer = setTimeout(() => setPulsePool(false), 800);
      return () => { clearTimeout(animationTimer); clearTimeout(pulseTimer); };
    }
  }, [searchParams]);

  const poolFillPercentage = Math.min((poolContributionsCount / TARGET_CONTRIBUTIONS_FOR_FULL_VISUAL) * 100, 100);

  const handleSignInWithWorldID = async () => {
    setIsAuthLoading(true); setAuthError(null);
    if (typeof window !== 'undefined' && !MiniKit.isInstalled()) {
      setAuthError('World App no está instalado o MiniKit no está disponible.');
      setIsAuthLoading(false); alert('Por favor, asegúrate de tener World App instalado.'); return;
    }
    try {
      const nonceRes = await fetch('/api/nonce');
      if (!nonceRes.ok) { const errD = await nonceRes.json().catch(()=>({message: 'Error al obtener nonce.'})); throw new Error(errD.message);}
      const { nonce } = await nonceRes.json(); if (!nonce) throw new Error('Nonce inválido.');
      const authRequest: WalletAuthInput = { nonce, statement: 'Inicia sesión en la plataforma con tu World ID.' };
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth(authRequest);
      if (finalPayload.status === 'error') { const eP = finalPayload as MiniAppWalletAuthErrorPayload; throw new Error((eP as any)?.detail || (eP as any)?.message || 'Error de Autenticación.');}
      const sP = finalPayload as MiniAppWalletAuthSuccessPayload;
      if (!sP.address) throw new Error("No se pudo obtener la dirección.");
      const verifyRes = await fetch('/api/complete-siwe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: sP, nonce, username: MiniKit.user?.username || null })});
      const vBR = await verifyRes.json(); if (!verifyRes.ok || !vBR.isValid) { throw new Error(vBR.message || 'Verificación SIWE falló.');}
      const authUserInfo: UserInfo = { address: sP.address, username: MiniKit.user?.username || null };
      setUserInfo(authUserInfo); localStorage.setItem(USER_INFO_LOCALSTORAGE_KEY, JSON.stringify(authUserInfo)); setAuthError(null);
    } catch (err: any) { console.error('Error en SignIn:', err); setAuthError(err.message || 'Error desconocido.'); setUserInfo(null); localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    } finally { setIsAuthLoading(false); }
  };

  const handleSignOut = () => {
    localStorage.removeItem(USER_INFO_LOCALSTORAGE_KEY);
    setUserInfo(null);
    router.push('/');
  };

  const togglePoolCardFlip = () => setIsPoolCardFlipped(!isPoolCardFlipped);

  if (isLoadingUserInfo) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-slate-100 p-4 animate-fadeIn">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-700 mt-5 text-lg font-medium">Cargando tu espacio...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen pt-8 pb-12 md:pt-12 md:pb-16 px-4 bg-gradient-to-br from-slate-100 via-sky-50 to-slate-100 text-slate-800 relative selection:bg-sky-200 selection:text-sky-800">
      {/* Los estilos para .flip-card-* y animaciones deben estar en globals.css */}

      {animateNewContribution && userInfo && (
        <div key={animationTriggerKey} className="flying-energy-spark">✨</div>
      )}

      {userInfo ? (
        <>
          <div className="mb-8 md:mb-10 bg-white/80 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/60 relative z-20 animate-fadeIn">
            <UserAvatarPlaceholder 
                className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-5 border-4 border-white shadow-lg" 
                initial={(userInfo.username || (userInfo.address ? userInfo.address[2] : '') || 'U').toUpperCase()} 
            />
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500 text-center mb-1">{userInfo.username || 'Usuario Verificado'}</h2>
            <p className="text-xs md:text-sm text-slate-500/90 break-all mt-0 mb-6 text-center px-2">{userInfo.address}</p>
            <button type="button" onClick={handleSignOut} disabled={isAuthLoading}
              className="w-full max-w-xs mx-auto px-4 py-2.5 text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:ring-4 focus:ring-red-300/50 rounded-lg shadow-md hover:shadow-lg transition-all duration-150">
              {isAuthLoading ? 'Cerrando...' : 'Cerrar Sesión'}
            </button>
          </div>

          {/* --- TARJETA GIRATORIA FONDO COMUNITARIO --- */}
          <div 
            className="flip-card-container my-6 md:my-8" 
            onClick={togglePoolCardFlip} 
            role="button" 
            tabIndex={0} 
            onKeyPress={(e) => {if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePoolCardFlip();}}}
            aria-pressed={isPoolCardFlipped}
            aria-label="Tarjeta del Fondo Comunitario, tocar para ver detalles del total de aportes"
          >
            <div className={`flip-card ${isPoolCardFlipped ? 'is-flipped' : ''}`}>
              {/* Cara Frontal: Visualización del Pool */}
              <div className="flip-card-face flip-card-front bg-gradient-to-br from-sky-600 to-blue-700 p-6 sm:p-8 text-center relative border-2 border-sky-400/30">
                <div className={`absolute inset-0 bg-sky-300 transition-opacity duration-700 ease-out ${pulsePool ? 'opacity-20 animate-pulse-strong' : 'opacity-0'}`}></div>
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  {Array.from({length: 15}).map((_,i) => (
                    <div key={`particle-${i}`} className="pool-particle" style={{left: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s`, animationDuration: `${Math.random()*10 + 10}s`, width: `${Math.random()*3+1}px`, height: `${Math.random()*3+1}px`, opacity: Math.random() * 0.3 + 0.1 }}></div>
                  ))}
                </div>
                <div className="relative z-10 flex flex-col justify-around h-full">
                    <div className="pt-2">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">Fondo Comunitario</h3>
                        <p className="text-sm sm:text-base text-sky-100 mt-1 mb-4">Creciendo con cada aporte.</p>
                    </div>
                    <div className="energy-pool-container mx-auto my-2">
                        <div className="energy-pool-fill" style={{ height: `${poolFillPercentage}%` }}>
                            <div className="energy-pool-surface-glow"></div>
                        </div>
                        <div className="energy-pool-markings"><span></span><span>MAX</span></div>
                    </div>
                    <p className="text-lg sm:text-xl text-white mt-4 font-bold">{poolContributionsCount.toLocaleString()} Aportes Actuales</p>
                    <p className="text-xs text-sky-200/90 mt-2 pb-2">(Toca la tarjeta para ver el total)</p>
                </div>
              </div>

              {/* Cara Trasera: Detalles del Pool */}
              <div className="flip-card-face flip-card-back bg-gradient-to-br from-blue-700 to-sky-500 p-6 sm:p-8 text-center flex flex-col justify-center items-center">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Total del Fondo</h3>
                <div className="my-4">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-yellow-300" style={{textShadow: '0 0 15px rgba(253, 224, 71, 0.7), 0 0 5px rgba(253, 224, 71, 0.5)'}}>
                    {poolContributionsCount.toLocaleString()}
                  </span>
                  <span className="block text-xl sm:text-2xl text-sky-100 mt-2">Aportes Comunitarios</span>
                </div>
                <p className="text-sm text-sky-200/80 mt-4">(Toca para volver a la visualización)</p>
              </div>
            </div>
          </div>
          {/* --- FIN TARJETA GIRATORIA --- */}

          <main className="w-full max-w-md mx-auto relative z-20 mt-10 md:mt-12 animate-fadeIn">
            <h3 className="text-2xl sm:text-3xl font-semibold text-slate-700 mb-4 md:mb-6 px-1 text-left">Acciones Rápidas</h3>
            <div className="flex overflow-x-auto py-2 pb-6 space-x-4 sm:space-x-5 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-sky-400/60 scrollbar-track-sky-100 scrollbar-thumb-rounded-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="snap-start shrink-0 w-1 h-1 md:w-0"></div>
              {actions.map((action) => (
                <div key={action.id} onClick={() => router.push(action.path)} onKeyPress={(e) => {if (e.key === 'Enter' || e.key === ' ') router.push(action.path);}} tabIndex={0} role="button"
                  className={`group ${action.textColor} bg-gradient-to-br ${action.gradientFrom} ${action.gradientTo} ${action.hoverGradientFrom} ${action.hoverGradientTo} snap-center shrink-0 w-[70vw] xs:w-[65vw] sm:w-[250px] md:w-[230px] h-60 sm:h-64 md:h-[270px] rounded-2xl shadow-xl hover:shadow-2xl p-5 sm:p-6 flex flex-col items-center justify-between text-center transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 focus:outline-none focus:ring-4 ${action.ringColor} focus:ring-opacity-70 cursor-pointer`}>
                  <div className="flex flex-col items-center">
                    <div className="mb-3 sm:mb-4 p-3 sm:p-3.5 rounded-full bg-white/15 shadow">{action.icon}</div>
                    <h4 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-1.5">{action.title}</h4>
                    <p className="text-xs sm:text-sm opacity-90 leading-snug px-1">{action.description}</p>
                  </div>
                  <div className="mt-3 sm:mt-4 p-1.5 bg-white/20 rounded-full self-center transition-transform duration-200 group-hover:scale-110 group-hover:bg-white/30">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 opacity-90"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                  </div>
                </div>
              ))}
              <div className="snap-end shrink-0 w-1 h-1 md:w-0"></div>
            </div>
          </main>
        </>
      ) : (
        <div className="w-full max-w-md mx-auto my-10 p-8 sm:p-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 relative z-20 text-center animate-fadeIn">
            <div className="flex justify-center mb-6">
                <Image src="/CapitalWup.png" alt="Logo World ID" width={72} height={72} className="opacity-90 drop-shadow-lg" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500 mb-3">
                Bienvenido a Tu Espacio
            </h1>
            <p className="text-slate-600 mb-8 px-2 sm:text-lg leading-relaxed">
                Conéctate de forma segura con tu World ID para acceder a todas las funcionalidades y ser parte de nuestra comunidad.
            </p>

            {authError && (
              <div className="mb-6 p-3.5 bg-red-100 border border-red-300 text-red-700 rounded-xl text-sm text-left shadow-sm">
                  <p className="font-semibold">Error de Autenticación:</p>
                  <p>{authError}</p>
              </div>
            )}

            <button type="button" onClick={handleSignInWithWorldID} disabled={isAuthLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:scale-[1.03] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 focus:ring-sky-400/50 text-white">
              <WorldIdIcon className="w-7 h-7" />
              {isAuthLoading ? 'Conectando con World ID...' : 'Iniciar Sesión con World ID'}
            </button>
            <p className="text-xs text-slate-500 mt-8">Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.</p>
        </div>
      )}

      <footer className="mt-16 md:mt-20 text-center text-sm text-slate-500/90 relative z-20">
        <p>&copy; {new Date().getFullYear()} CapitaWu. Todos los derechos reservados.</p>
        <p className="text-xs text-slate-400/80 mt-1">Innovación financiera para todos.</p>
      </footer>
    </div>
  );
}