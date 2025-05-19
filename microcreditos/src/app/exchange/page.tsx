// src/app/exchange/page.tsx
'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Iconos Placeholder (Reemplaza con SVGs reales o una librería de iconos) ---
const NativeArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const WldCoinIcon = ({ className = "w-6 h-6" }: { className?: string }) => ( // Icono para WLD
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#E0E0E0"/>
    <path d="M12 5V19M12 5C9.23858 5 7 7.23858 7 10V14C7 16.7614 9.23858 19 12 19M12 5C14.7614 5 17 7.23858 17 10V14C17 16.7614 14.7614 19 12 19" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="#38BDF8"/>
  </svg>
);
const UsdcCoinIcon = ({ className = "w-6 h-6" }: { className?: string }) => ( // Icono para USDC
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#2775CA"/>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">USDC</text>
  </svg>
);
const InfoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);
const CheckCircleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
// --- Fin Iconos Placeholder ---


const CLIENT_SIDE_FEE_PERCENTAGE = 1; // 1%
const CLIENT_SIDE_MOCK_EXCHANGE_RATE = 0.75; // 1 WLD = 0.75 USDC (solo para estimación inicial)
const POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2";
const CONTRIBUTION_FROM_EXCHANGE = 1;

interface SimulationResultData {
  exchangedWLD: number;
  receivedUSDC: number;
  feePaid: number;
  exchangeRateUsed: number;
}

export default function ExchangePage() {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResultData | null>(null);
  const router = useRouter();

  const wldAmount = parseFloat(amount || '0');
  // Estimación sutil en el cliente (opcional, para mostrar bajo el input)
  const estimatedUSDC_client_subtle = wldAmount * CLIENT_SIDE_MOCK_EXCHANGE_RATE;
  const feeAmount_client_subtle = estimatedUSDC_client_subtle * (CLIENT_SIDE_FEE_PERCENTAGE / 100);
  const finalUSDC_client_subtle = estimatedUSDC_client_subtle - feeAmount_client_subtle;

  const handleSimulateExchange = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!amount || wldAmount <= 0) {
      setError('Por favor, ingresa una cantidad válida de WLD.');
      setSimulationResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    setSimulationResult(null); // Limpia resultados anteriores

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: wldAmount }),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `La simulación falló (HTTP ${response.status})`);
      }
      setSimulationResult(responseData.data);
    } catch (err: any) {
      console.error('Error al procesar la simulación de intercambio:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      setSimulationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndContribute = () => {
    if (simulationResult) {
      try {
        const currentContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
        const newTotalContributions = currentContributions + CONTRIBUTION_FROM_EXCHANGE;
        localStorage.setItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY, newTotalContributions.toString());
        router.push('/dashboard?contribution=true');
      } catch (e) {
        console.error("Error al actualizar localStorage en ExchangePage:", e);
        router.push('/dashboard?contribution=true&storageError=true');
      }
    } else {
      setError("No hay una simulación válida para confirmar.");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir solo números y un punto decimal
    if (/^\d*\.?\d*$/.test(value)) {
        setAmount(value);
    }
    setError(null);
    setSimulationResult(null); // Limpia simulación si cambia el monto
  };

  const baseButtonClasses = "w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-md";
  
  // --- MODIFICACIÓN DE COLORES DE BOTONES ---
  const primaryButtonClasses = `${baseButtonClasses} bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 focus:ring-sky-400 focus:ring-opacity-60 text-white`;
  const confirmButtonClasses = `${baseButtonClasses} bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-400 focus:ring-opacity-60 text-white`;
  // --- FIN DE MODIFICACIÓN DE COLORES ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-800 relative">
      <div className="absolute top-5 left-5 md:top-8 md:left-8 z-20">
        <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-600 group text-sm font-medium bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm hover:shadow-lg transition-all duration-150 hover:scale-105">
          <NativeArrowLeftIcon className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-0.5" />
          Volver al Dashboard
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/70">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 border-b border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-1.5">
              {/* Icono de intercambio elegante */}
              <svg className="w-10 h-10 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h18m-7.5-14L21 7.5m0 0L16.5 12M21 7.5H3" />
            </svg>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500">
                Intercambio WLD a USDC
            </h1>
          </div>
          <p className="text-slate-600 text-center text-sm sm:text-base">
            Obtén una cotización para convertir tus WLD a USDC de forma segura.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <label htmlFor="wld-amount" className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
              Cantidad en WLD
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <WldCoinIcon className="text-slate-400" />
              </div>
              <input
                id="wld-amount" type="text" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={handleAmountChange}
                className="w-full text-lg sm:text-xl p-3.5 pl-12 pr-4 border border-slate-300/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 rounded-xl shadow-sm outline-none transition-all duration-150 disabled:bg-slate-100 disabled:text-slate-500 placeholder-slate-400"
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {wldAmount > 0 && !simulationResult && !loading && finalUSDC_client_subtle > 0 && (
              <p className="text-xs text-slate-500 mt-2 text-right px-1">
                Recibirás aprox.: <span className="font-semibold text-slate-600">{finalUSDC_client_subtle.toFixed(3)} USDC</span>
              </p>
            )}
          </div>

          {/* Resultado de la Simulación del Backend (se muestra después de la simulación) */}
          {simulationResult && !loading && (
            <div className="bg-green-50 p-5 rounded-xl space-y-3 border-2 border-green-500/30 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-7 h-7 text-green-600"/>
                <h3 className="text-lg sm:text-xl font-semibold text-green-800">Cotización Confirmada:</h3>
              </div>
              
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between items-center py-1.5 border-b border-green-200/70">
                    <span className="text-slate-600">Intercambias:</span>
                    <span className="font-semibold text-green-700 flex items-center gap-1.5">{simulationResult.exchangedWLD.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} <WldCoinIcon className="w-5 h-5 opacity-80"/></span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-green-200/70">
                    <span className="text-slate-600">Tasa Aplicada:</span>
                    <span className="font-medium text-slate-700">1 WLD ≈ {simulationResult.exchangeRateUsed.toFixed(4)} USDC</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-green-200/70">
                    <span className="text-slate-600">Comisión ({CLIENT_SIDE_FEE_PERCENTAGE}%):</span> 
                    <span className="font-semibold text-red-600 flex items-center gap-1.5">{simulationResult.feePaid.toFixed(4)} <UsdcCoinIcon className="w-5 h-5 opacity-80"/></span>
                </div>
                <div className="flex justify-between items-center pt-2.5 text-base sm:text-lg">
                    <span className="font-bold text-green-800">Total a Recibir:</span>
                    <span className="font-extrabold text-green-700 text-xl flex items-center gap-1.5">{simulationResult.receivedUSDC.toFixed(4)} <UsdcCoinIcon className="w-5 h-5 opacity-90"/></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Indicador de carga durante la simulación */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sky-600 font-medium">Obteniendo cotización...</p>
            </div>
          )}

        </div>

        <div className="bg-slate-100/70 p-5 sm:p-6 border-t border-slate-200/80">
          {!simulationResult ? (
            <button type="button" className={primaryButtonClasses} onClick={handleSimulateExchange} disabled={loading || !amount || wldAmount <= 0}>
              <InfoIcon className="w-5 h-5 mr-1"/>
              {loading ? 'Obteniendo Cotización...' : 'Previsualizar Intercambio'}
            </button>
          ) : (
            <button type="button" className={confirmButtonClasses} onClick={handleConfirmAndContribute} disabled={loading}>
              <CheckCircleIcon className="w-5 h-5 mr-1"/> {/* Cambiado el icono aquí para ser más semántico */}
              {loading ? 'Procesando...' : 'Confirmar Intercambio y Aportar'}
            </button>
          )}
        </div>
      </div>

      {error && !loading && (
        <div className="mt-6 max-w-md w-full bg-red-50 border-l-4 border-red-600 text-red-700 p-4 rounded-md shadow-lg animate-fadeIn" role="alert">
          <p className="font-bold text-red-800">Error en la Operación</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
       {/* Estilo para la animación de fadeIn (opcional, puedes ponerlo en globals.css) */}
       <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}