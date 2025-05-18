// src/app/exchange/page.tsx
'use client';

import * as React from 'react';
import { useState } from 'react'; // No es necesario useEffect, useCallback, FormEvent aquí
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Definición de NativeArrowLeftIcon como la tenías...
const NativeArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const CLIENT_SIDE_FEE_PERCENTAGE = 1;
const CLIENT_SIDE_MOCK_EXCHANGE_RATE = 0.75;
const POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2"; // Asegúrate que sea la misma key
const CONTRIBUTION_FROM_EXCHANGE = 1; // O el monto de la comisión si quieres ser más específico

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
  const estimatedUSDC_client = wldAmount * CLIENT_SIDE_MOCK_EXCHANGE_RATE;
  const feeAmount_client = estimatedUSDC_client * (CLIENT_SIDE_FEE_PERCENTAGE / 100);
  const finalUSDC_client = estimatedUSDC_client - feeAmount_client;

  const handleSimulateExchange = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!amount || wldAmount <= 0) {
      setError('Por favor, ingresa una cantidad válida de WLD.');
      setSimulationResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    setSimulationResult(null);

    try {
      const response = await fetch('/api/convert', { // Asumiendo que esta API es la SIMULADA
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: wldAmount }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `La simulación falló (HTTP ${response.status})`);
      }
      
      setSimulationResult(responseData.data); // Mostrar resultado en esta página
      
      // NO actualices localStorage ni redirijas aquí directamente si tienes un botón de confirmación.

    } catch (err: any) {
      console.error('Error al procesar la simulación de intercambio:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
      setSimulationResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Esta función se llama cuando el usuario confirma el intercambio DESPUÉS de ver la simulación
  const handleConfirmAndContribute = () => {
    if (simulationResult) { // Asegurarse que hay una simulación exitosa
      try {
        const currentContributions = parseInt(localStorage.getItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
        const newTotalContributions = currentContributions + CONTRIBUTION_FROM_EXCHANGE;
        localStorage.setItem(POOL_CONTRIBUTIONS_LOCALSTORAGE_KEY, newTotalContributions.toString());
        console.log("ExchangePage (Confirmar): Contribución registrada en localStorage. Nuevo total:", newTotalContributions);
        
        router.push('/dashboard?contribution=true'); // Redirigir con el parámetro
      } catch (e) {
        console.error("Error al actualizar localStorage en ExchangePage:", e);
        // Igual intenta redirigir, el dashboard leerá lo que pueda
        router.push('/dashboard?contribution=true&storageError=true');
      }
    } else {
      setError("No hay una simulación válida para confirmar y aportar.");
    }
  };


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError(null);
    setSimulationResult(null);
  };

  const baseButtonClasses = "w-full px-6 py-3 text-lg font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-60 transform transition-all duration-150 ease-in-out hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-sky-600 hover:bg-sky-700 focus:ring-sky-400 text-white`;
  // const secondaryButtonClasses = `${baseButtonClasses} bg-slate-600 hover:bg-slate-700 focus:ring-slate-400 text-white`; // Si lo necesitas

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-900">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
        <Link href="/dashboard" className="inline-flex items-center text-sky-600 hover:text-sky-700 group text-sm font-medium bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <NativeArrowLeftIcon className="w-5 h-5 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Dashboard
        </Link>
      </div>

      {/* Card Principal (recreada con divs y Tailwind) */}
      <div className="w-full max-w-lg shadow-xl bg-white rounded-xl overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-sky-700 text-center">Simular Intercambio WLD a USDC</h1>
          <p className="text-slate-600 text-center mt-2">
            Calcula cuánto USDC recibirías por tus WLD.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <label htmlFor="wld-amount" className="block text-sm font-medium text-slate-700 mb-1.5">
              Cantidad de WLD a intercambiar
            </label>
            <input
              id="wld-amount" type="number" placeholder="0.00" value={amount}
              onChange={handleAmountChange} min="0" step="any"
              className="w-full text-lg p-3 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg shadow-sm outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500"
              disabled={loading}
            />
          </div>

          {/* Estimación del Cliente */}
          {wldAmount > 0 && !simulationResult && (
            <div className="bg-slate-50 p-4 rounded-lg space-y-2.5 border border-slate-200 shadow-sm text-sm">
              <h3 className="font-semibold text-slate-700 mb-2">Estimación (cliente):</h3>
              {/* ... (contenido de la estimación como antes) ... */}
              <div className="flex justify-between"><span className="text-slate-600">Tasa (aprox.):</span><span className="font-medium text-slate-700">1 WLD ≈ {CLIENT_SIDE_MOCK_EXCHANGE_RATE} USDC</span></div>
              <div className="flex justify-between"><span className="text-slate-600">USDC (antes de comisión):</span><span className="font-medium text-slate-700">{estimatedUSDC_client.toFixed(4)} USDC</span></div>
              <div className="flex justify-between text-sky-700"><span className="font-medium">Comisión ({CLIENT_SIDE_FEE_PERCENTAGE}%):</span><span className="font-medium">{feeAmount_client.toFixed(4)} USDC</span></div>
              <div className="flex justify-between font-bold text-slate-800 mt-3 pt-3 border-t border-slate-200"><span>Total Recibirías (aprox.):</span><span>{finalUSDC_client.toFixed(4)} USDC</span></div>
            </div>
          )}

          {/* Resultado de la Simulación del Backend */}
          {simulationResult && (
            <div className="bg-green-50 p-4 rounded-lg space-y-2.5 border border-green-300 shadow-md">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Resultado de la Simulación (Confirmado):</h3>
              {/* ... (mostrar datos de simulationResult como antes) ... */}
              <div className="flex justify-between text-sm"><span className="text-slate-700">Intercambiarías:</span><span className="font-medium text-green-700">{simulationResult.exchangedWLD.toLocaleString()} WLD</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-700">Tasa Aplicada:</span><span className="font-medium text-green-700">1 WLD = {simulationResult.exchangeRateUsed} USDC</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-700">Comisión Aplicada ({CLIENT_SIDE_FEE_PERCENTAGE}%):</span> <span className="font-medium text-green-700">{simulationResult.feePaid.toFixed(4)} USDC</span></div>
              <div className="flex justify-between text-base font-bold text-green-800 mt-3 pt-3 border-t border-green-300"><span>Recibirías (Simulado):</span><span>{simulationResult.receivedUSDC.toFixed(4)} USDC</span></div>
            </div>
          )}
        </div>

        {/* Footer de la Card */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 space-y-3">
          {!simulationResult ? ( // Si no hay resultado de simulación, mostrar botón para simular
            <button type="button" className={primaryButtonClasses} onClick={handleSimulateExchange} disabled={loading || !amount || wldAmount <= 0}>
              {loading ? 'Simulando...' : 'Simular Intercambio'}
            </button>
          ) : ( // Si YA hay resultado, mostrar botón para confirmar y aportar
            <button type="button" className={`${primaryButtonClasses} bg-green-600 hover:bg-green-700 focus:ring-green-400`} onClick={handleConfirmAndContribute} disabled={loading}>
              {loading ? 'Procesando...' : 'Confirmar y Aportar al Fondo'}
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div className="mt-4 max-w-lg w-full bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md" role="alert">
          <p className="font-bold">Error en la Simulación</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}