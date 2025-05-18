// src/app/microloand/apply/page.tsx
'use client';

import { useState, useEffect, ChangeEvent, MouseEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'; // Componente Link de Next.js

// --- CONFIGURACIÓN DE NIVELES DE PRÉSTAMO BASADOS EN CONTRIBUCIONES ---
const CONTRIBUTION_LEVELS = {
  level0: { contributionsNeeded: 0, maxLoan: 2, interestRateModifier: 1.1 },
  level1: { contributionsNeeded: 3, maxLoan: 3.5, interestRateModifier: 1.0 },
  level2: { contributionsNeeded: 6, maxLoan: 5, interestRateModifier: 0.9 },
};
const BASE_INTEREST_RATES: { [key: string]: number } = { '7': 2, '14': 3.5, '30': 5 };
const MIN_LOAN_AMOUNT_DEFAULT = 0.5;
const USER_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2"; // Misma key que el dashboard

interface SimulatedLoanData {
  loanId: string;
  requestedAmount: number;
  termDays: number;
  interestRate: number;
  interestAmount: number;
  repaymentAmount: number;
  purpose: string;
  status: string;
  simulatedProcessingTime?: string;
  eligibilityNote?: string;
}

// Icono SVG Nativo simple para "Volver"
const NativeArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// Iconos SVG Nativos para estados (simples)
const NativeCheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-16 h-16"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-16 h-16"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeLockClosedIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-16 h-16"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function MicroloanApplyPage() {
  const [amount, setAmount] = useState<number>(1);
  const [term, setTerm] = useState<string>('7');
  const [purpose, setPurpose] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatedLoanOutcome, setSimulatedLoanOutcome] = useState<SimulatedLoanData | null>(null);

  const [userContributions, setUserContributions] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string>('');
  const [currentMaxLoanAmount, setCurrentMaxLoanAmount] = useState<number>(CONTRIBUTION_LEVELS.level0.maxLoan);
  const [currentInterestRates, setCurrentInterestRates] = useState(BASE_INTEREST_RATES);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Simulación de objeto user, REEMPLAZA con tu lógica real de sesión/autenticación
  const user = { id: "simulated_user_123", name: "Usuario Simulado" }; 

  useEffect(() => {
    const savedContributions = parseInt(localStorage.getItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
    setUserContributions(savedContributions);

    let currentLevel = CONTRIBUTION_LEVELS.level0;
    if (savedContributions >= CONTRIBUTION_LEVELS.level2.contributionsNeeded) {
      currentLevel = CONTRIBUTION_LEVELS.level2;
    } else if (savedContributions >= CONTRIBUTION_LEVELS.level1.contributionsNeeded) {
      currentLevel = CONTRIBUTION_LEVELS.level1;
    }
    
    const initialAmount = Math.min(1, currentLevel.maxLoan);
    setAmount(Math.max(MIN_LOAN_AMOUNT_DEFAULT, initialAmount));
    setCurrentMaxLoanAmount(currentLevel.maxLoan);

    if (savedContributions >= CONTRIBUTION_LEVELS.level0.contributionsNeeded) { 
      setIsEligible(true);
      const adjustedRates: { [key: string]: number } = {};
      for (const termKey in BASE_INTEREST_RATES) {
        adjustedRates[termKey] = parseFloat((BASE_INTEREST_RATES[termKey] * currentLevel.interestRateModifier).toFixed(1));
      }
      setCurrentInterestRates(adjustedRates);
      setEligibilityMessage(`Con ${savedContributions} aportes, puedes solicitar hasta ${currentLevel.maxLoan.toFixed(1)} USDC.`);
    } else {
      setIsEligible(false);
      setEligibilityMessage(`Necesitas al menos ${CONTRIBUTION_LEVELS.level0.contributionsNeeded} aportes para solicitar un préstamo. Actualmente tienes ${savedContributions}.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (searchParams.get('reset')) {
      setSimulatedLoanOutcome(null);
      const savedContributions = parseInt(localStorage.getItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
      setUserContributions(savedContributions);

      let currentLevel = CONTRIBUTION_LEVELS.level0;
      if (savedContributions >= CONTRIBUTION_LEVELS.level2.contributionsNeeded) currentLevel = CONTRIBUTION_LEVELS.level2;
      else if (savedContributions >= CONTRIBUTION_LEVELS.level1.contributionsNeeded) currentLevel = CONTRIBUTION_LEVELS.level1;
      
      const initialAmount = Math.min(1, currentLevel.maxLoan);
      setAmount(Math.max(MIN_LOAN_AMOUNT_DEFAULT, initialAmount));
      setCurrentMaxLoanAmount(currentLevel.maxLoan);
      setTerm('7');
      setPurpose('');
      setError(null);
      
      if (savedContributions >= CONTRIBUTION_LEVELS.level0.contributionsNeeded) {
        setIsEligible(true);
        const adjustedRates: { [key: string]: number } = {};
        for (const termKey in BASE_INTEREST_RATES) {
          adjustedRates[termKey] = parseFloat((BASE_INTEREST_RATES[termKey] * currentLevel.interestRateModifier).toFixed(1));
        }
        setCurrentInterestRates(adjustedRates);
        setEligibilityMessage(`Con ${savedContributions} aportes, puedes solicitar hasta ${currentLevel.maxLoan.toFixed(1)} USDC.`);
      } else {
        setIsEligible(false);
        setEligibilityMessage(`Necesitas al menos ${CONTRIBUTION_LEVELS.level0.contributionsNeeded} aportes. Tienes ${savedContributions}.`);
      }
      const currentPathname = window.location.pathname; // Usar window.location.pathname
      router.replace(currentPathname, undefined); 
    }
  }, [searchParams, router]);


  const currentInterestRate = currentInterestRates[term] || 0;
  const interestAmountClient = amount * (currentInterestRate / 100);
  const repaymentAmountClient = amount + interestAmountClient;

  const handleApplySimulated = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!user || !isEligible || amount < MIN_LOAN_AMOUNT_DEFAULT || amount > currentMaxLoanAmount || !purpose.trim() || purpose.trim().length < 5) {
      setError('Completa todos los campos correctamente y asegúrate de ser elegible.');
      return;
    }
    setError(null); setLoading(true); setSimulatedLoanOutcome(null);

    try {
      const response = await fetch('/api/loans/request', { // Llama a tu API simulada
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, termDays: parseInt(term), purpose, contributionsCount: userContributions }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Falló la simulación de la solicitud.');
      setSimulatedLoanOutcome(responseData.simulationData);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar la simulación.');
    } finally {
      setLoading(false);
    }
  };

  const baseInputClasses = "w-full text-base md:text-lg p-3 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg shadow-sm outline-none transition-colors disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
  const baseButtonClasses = "w-full px-6 py-3 text-lg font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-150 ease-in-out hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-sky-600 hover:bg-sky-700 focus:ring-sky-400 text-white`;
  const outlineButtonClasses = `${baseButtonClasses} bg-transparent hover:bg-slate-50 border-2 border-slate-300 text-slate-700 hover:border-slate-400 focus:ring-sky-400`;


  // --- VISTA DE RESULTADO DE SIMULACIÓN ---
  if (simulatedLoanOutcome) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        {/* Card Simulada */}
        <div className="w-full max-w-lg shadow-xl bg-white rounded-xl overflow-hidden">
          {/* CardHeader Simulado */}
          <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
            {simulatedLoanOutcome.status === 'SIMULATED_APPROVED' ? (
              <NativeCheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
            ) : (
              <NativeClockIcon className="w-16 h-16 text-amber-500 mx-auto mb-3" />
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Resultado de la Simulación</h2> {/* CardTitle */}
            <p className="text-slate-600 mt-1"> {/* CardDescription */}
              {simulatedLoanOutcome.status === 'SIMULATED_APPROVED' 
                ? "¡Tu solicitud simulada ha sido APROBADA!" 
                : "Tu solicitud simulada está EN REVISIÓN."}
            </p>
          </div>
          {/* CardContent Simulado */}
          <div className="p-6 space-y-3 text-sm">
            <p><strong className="font-medium text-slate-600">ID (Simulado):</strong> <span className="text-slate-800">{simulatedLoanOutcome.loanId}</span></p>
            <p><strong className="font-medium text-slate-600">Monto Solicitado:</strong> <span className="text-slate-800">{simulatedLoanOutcome.requestedAmount.toFixed(2)} USDC</span></p>
            <p><strong className="font-medium text-slate-600">Plazo:</strong> <span className="text-slate-800">{simulatedLoanOutcome.termDays} días</span></p>
            <p><strong className="font-medium text-slate-600">Tasa de Interés (Simulada):</strong> <span className="text-slate-800">{simulatedLoanOutcome.interestRate}%</span></p>
            <p><strong className="font-medium text-slate-600">Monto de Interés (Simulado):</strong> <span className="text-slate-800">{simulatedLoanOutcome.interestAmount.toFixed(2)} USDC</span></p>
            <p className="font-semibold text-base"><strong className="text-slate-700">Total a Repagar (Simulado):</strong> <span className="text-slate-900">{simulatedLoanOutcome.repaymentAmount.toFixed(2)} USDC</span></p>
            <p><strong className="font-medium text-slate-600">Propósito:</strong> <span className="text-slate-800">{simulatedLoanOutcome.purpose}</span></p>
            {simulatedLoanOutcome.eligibilityNote && <p className="mt-2 text-xs text-sky-600 bg-sky-50 p-2 rounded-md border border-sky-100">{simulatedLoanOutcome.eligibilityNote}</p>}
          </div>
          {/* CardFooter Simulado */}
          <div className="flex flex-col sm:flex-row gap-3 p-6 bg-slate-50 border-t border-slate-200">
            <button type="button" className={`${primaryButtonClasses} text-base py-2.5`} onClick={() => router.push('/dashboard')}>Volver al Dashboard</button>
            <button type="button" className={`${outlineButtonClasses} text-base py-2.5`} onClick={() => router.push((window.location.pathname.startsWith('/microloand') ? '/microloand/apply?reset=true' : '/microloan/apply?reset=true'))}>Realizar otra simulación</button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA DE "NO AUTENTICADO" O "NO ELEGIBLE" O FORMULARIO ---
  if (!user) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 text-center">
          <NativeLockClosedIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-700 text-lg mb-4">Por favor, inicia sesión para simular un microcrédito.</p>
          {/* Aquí deberías tener un botón/link a tu página de login real o al dashboard para que inicie sesión */}
          <button type="button" className={`${primaryButtonClasses} max-w-xs`} onClick={() => router.push('/dashboard?login=true') /* O tu ruta de login */}>
            Ir a Iniciar Sesión
          </button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
        <Link href="/dashboard" className="inline-flex items-center text-sky-600 hover:text-sky-700 group text-sm font-medium bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <NativeArrowLeftIcon className="mr-1.5 transition-transform group-hover:-translate-x-1" />
          Dashboard
        </Link>
      </div>
      {/* Card Principal (Simulada con divs) */}
      <div className="w-full max-w-lg shadow-xl bg-white rounded-xl overflow-hidden">
        {/* CardHeader Simulado */}
        <div className="bg-slate-50 p-6 border-b border-slate-200">
          <h1 className="text-2xl md:text-3xl font-bold text-sky-700 text-center">Simular Solicitud de Microcrédito</h1>
          <p className="text-slate-600 text-center mt-1">
            Los términos pueden variar según tus aportes. Tienes: <strong className="text-sky-600">{userContributions}</strong> aportes.
          </p>
        </div>
        
        {!isEligible ? (
            // CardContent Simulado para "No elegible"
            <div className="p-6 sm:p-8 text-center">
                <NativeLockClosedIcon className="text-amber-500 mx-auto mb-4" />
                <p className="text-slate-700 font-semibold">{eligibilityMessage}</p>
                <p className="text-xs text-slate-500 mt-2">Sigue participando en la comunidad para mejorar tus condiciones.</p>
            </div>
        ) : (
          // Fragmento para agrupar "CardContent" y "CardFooter" cuando es elegible
          <>
            {/* CardContent Simulado para el formulario */}
            <div className="p-6 sm:p-8 space-y-6">
                {eligibilityMessage && <p className="text-sm text-sky-600 bg-sky-50 p-3 rounded-md border border-sky-200 shadow-sm">{eligibilityMessage}</p>}
              
              {/* Sección Monto del Préstamo */}
              <div className="space-y-2">
                <label htmlFor="amount-input" className="block text-sm font-medium text-slate-700">Monto del Préstamo (USDC): <span className="font-bold text-sky-600">{amount.toFixed(1)}</span></label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" // Slider Nativo
                    id="amount-slider"
                    min={MIN_LOAN_AMOUNT_DEFAULT}
                    max={currentMaxLoanAmount} // Máximo dinámico
                    step={0.5}
                    value={amount} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(parseFloat(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:bg-slate-200 disabled:accent-slate-400 disabled:cursor-not-allowed" 
                    disabled={loading || !isEligible}
                  />
                  <input
                    id="amount-input"
                    type="number" value={amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setAmount(Math.max(MIN_LOAN_AMOUNT_DEFAULT, Math.min(currentMaxLoanAmount, val)));
                    }}
                    min={MIN_LOAN_AMOUNT_DEFAULT} max={currentMaxLoanAmount} step={0.5}
                    className={`${baseInputClasses} w-28 text-center`} disabled={loading || !isEligible}
                  />
                </div>
              </div>

              {/* Sección Plazo del Préstamo */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Plazo del Préstamo</span> {/* Cambiado a span ya que no es para un solo input */}
                <div role="radiogroup" className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                  {Object.keys(currentInterestRates).map(termKey => (
                    <div className="flex items-center space-x-2" key={termKey}>
                      <input
                        type="radio"
                        name="loanTerm" // Mismo nombre para agruparlos
                        value={termKey}
                        id={`term-${termKey}`}
                        checked={term === termKey}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTerm(e.target.value)}
                        disabled={loading || !isEligible}
                        className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor={`term-${termKey}`} className={`text-sm font-normal text-slate-700 ${loading || !isEligible ? 'text-slate-400 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {termKey} días <span className="text-xs text-sky-600">({currentInterestRates[termKey]}%)</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección Propósito del Préstamo */}
              <div className="space-y-2">
                <label htmlFor="purpose" className="block text-sm font-medium text-slate-700">Propósito del Préstamo (mín. 5 caracteres)</label>
                <textarea
                  id="purpose" placeholder="Ej: Comprar materiales para mi emprendimiento..." value={purpose}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPurpose(e.target.value)}
                  rows={3}
                  className={`${baseInputClasses} resize-none`} disabled={loading || !isEligible} maxLength={300}
                />
              </div>

              {/* Resumen Estimado (Cliente) */}
              <div className="bg-sky-50 p-4 rounded-lg space-y-1.5 border border-sky-200 text-sm shadow-sm">
                <h3 className="font-semibold text-sky-700 mb-2">Resumen Estimado:</h3>
                <div className="flex justify-between"><span className="text-slate-600">Monto Solicitado:</span> <span className="font-medium text-slate-800">{amount.toFixed(2)} USDC</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Tasa de Interés Aplicable:</span> <span className="font-medium text-slate-800">{currentInterestRate}%</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Plazo Seleccionado:</span> <span className="font-medium text-slate-800">{term} días</span></div>
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-sky-100 mt-2 text-base"><span className="text-slate-700">Total a Repagar (aprox.):</span> <span>{repaymentAmountClient.toFixed(2)} USDC</span></div>
              </div>
            </div> {/* Cierre del div que simula CardContent del formulario */}

            {/* CardFooter Simulado */}
            <div className="bg-slate-50 p-6 border-t border-slate-200">
              <button
                type="button"
                className={primaryButtonClasses}
                onClick={handleApplySimulated}
                disabled={loading || !isEligible || amount < MIN_LOAN_AMOUNT_DEFAULT || amount > currentMaxLoanAmount || !purpose.trim() || purpose.trim().length < 5}
              >
                {loading ? 'Procesando Simulación...' : 'Simular Solicitud de Préstamo'}
              </button>
            </div>
          </>
        )}
      </div> {/* Cierre del div que simula Card */}

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