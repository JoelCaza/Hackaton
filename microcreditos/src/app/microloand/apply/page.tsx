// src/app/microloan/apply/page.tsx
'use client';

import { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// --- CONFIGURACIÓN DE NIVELES DE PRÉSTAMO ---
const CONTRIBUTION_LEVELS = {
  level0: { contributionsNeeded: 0, maxLoan: 2, interestRateModifier: 1.1 },
  level1: { contributionsNeeded: 3, maxLoan: 3.5, interestRateModifier: 1.0 },
  level2: { contributionsNeeded: 6, maxLoan: 5, interestRateModifier: 0.9 },
};
const BASE_INTEREST_RATES: { [key: string]: number } = { '7': 2, '14': 3.5, '30': 5 };
const MIN_LOAN_AMOUNT_DEFAULT = 0.5;
const USER_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2";

interface SimulatedLoanData {
  loanId: string;
  requestedAmount: number;
  termDays: number;
  interestRate: number;
  interestAmount: number;
  repaymentAmount: number;
  purpose: string;
  status: string; // e.g., 'SIMULATED_APPROVED', 'SIMULATED_PENDING_REVIEW'
  simulatedProcessingTime?: string;
  eligibilityNote?: string;
}

// --- Iconos SVG Nativos (ya definidos en tu código) ---
const NativeArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const NativeCheckCircleIcon = ({ className = "w-12 h-12" }: { className?: string }) => ( // Ajustado tamaño por defecto
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeClockIcon = ({ className = "w-12 h-12" }: { className?: string }) => ( // Ajustado tamaño por defecto
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeLockClosedIcon = ({ className = "w-12 h-12" }: { className?: string }) => ( // Ajustado tamaño por defecto
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const LoanApplicationIcon = ({ className = "w-8 h-8" }: { className?: string }) => ( // Icono para el título del formulario
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);


export default function MicroloanApplyPage() {
  const [amount, setAmount] = useState<number>(MIN_LOAN_AMOUNT_DEFAULT);
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
  
  const user = { id: "simulated_user_123", name: "Usuario Simulado" }; // REEMPLAZA con autenticación real

  useEffect(() => {
    const calculateEligibility = () => {
      const savedContributions = parseInt(localStorage.getItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
      setUserContributions(savedContributions);

      let currentLevel = CONTRIBUTION_LEVELS.level0;
      if (savedContributions >= CONTRIBUTION_LEVELS.level2.contributionsNeeded) {
        currentLevel = CONTRIBUTION_LEVELS.level2;
      } else if (savedContributions >= CONTRIBUTION_LEVELS.level1.contributionsNeeded) {
        currentLevel = CONTRIBUTION_LEVELS.level1;
      }
      
      const maxLoanForLevel = currentLevel.maxLoan;
      setCurrentMaxLoanAmount(maxLoanForLevel);
      
      // Ajustar el monto inicial si el máximo es menor que el estado actual o el default mínimo
      setAmount(prevAmount => Math.max(MIN_LOAN_AMOUNT_DEFAULT, Math.min(prevAmount, maxLoanForLevel)));


      if (savedContributions >= CONTRIBUTION_LEVELS.level0.contributionsNeeded) { 
        setIsEligible(true);
        const adjustedRates: { [key: string]: number } = {};
        for (const termKey in BASE_INTEREST_RATES) {
          adjustedRates[termKey] = parseFloat((BASE_INTEREST_RATES[termKey] * currentLevel.interestRateModifier).toFixed(1));
        }
        setCurrentInterestRates(adjustedRates);
        setEligibilityMessage(`Con ${savedContributions} aportes, tu límite es ${maxLoanForLevel.toFixed(1)} USDC con tasas preferenciales.`);
      } else {
        setIsEligible(false);
        setEligibilityMessage(`Necesitas ${CONTRIBUTION_LEVELS.level0.contributionsNeeded} aportes para solicitar. Tienes ${savedContributions}.`);
      }
    };

    calculateEligibility(); // Ejecutar al montar

    if (searchParams.get('reset')) {
      setSimulatedLoanOutcome(null);
      calculateEligibility(); // Recalcular elegibilidad y montos
      setTerm('7');
      setPurpose('');
      setError(null);
      router.replace('/microloan/apply', undefined); // Limpiar URL (usar 'microloan' consistentemente)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]); // No añadir más dependencias para evitar bucles si setAmount está dentro.

  const currentInterestRate = currentInterestRates[term] || 0;
  const interestAmountClient = amount * (currentInterestRate / 100);
  const repaymentAmountClient = amount + interestAmountClient;

  const handleApplySimulated = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!user || !isEligible || amount < MIN_LOAN_AMOUNT_DEFAULT || amount > currentMaxLoanAmount || !purpose.trim() || purpose.trim().length < 5) {
      setError('Por favor, completa todos los campos correctamente y asegúrate de cumplir los requisitos.');
      return;
    }
    setError(null); setLoading(true); setSimulatedLoanOutcome(null);

    try {
      const response = await fetch('/api/loans/request', {
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

  const baseInputClasses = "w-full text-base sm:text-lg p-3.5 border border-slate-300/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 rounded-xl shadow-sm outline-none transition-all duration-150 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed placeholder-slate-400";
  const baseButtonClasses = "w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-md";
  const primaryButtonClasses = `${baseButtonClasses} bg-sky-600 hover:bg-sky-500 focus:ring-sky-300 text-white`;
  const outlineButtonClasses = `${baseButtonClasses} bg-white hover:bg-slate-100 border-2 border-slate-300 hover:border-slate-400 text-slate-700 focus:ring-slate-300 focus:border-slate-400`;

  if (simulatedLoanOutcome) {
    const isApproved = simulatedLoanOutcome.status === 'SIMULATED_APPROVED';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-800 animate-fadeIn">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/70">
          <div className={`p-6 sm:p-8 text-center border-b ${isApproved ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            {isApproved ? (
              <NativeCheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
            ) : (
              <NativeClockIcon className="w-16 h-16 text-amber-500 mx-auto mb-3" />
            )}
            <h2 className={`text-2xl sm:text-3xl font-bold ${isApproved ? 'text-green-700' : 'text-amber-700'}`}>Resultado de la Simulación</h2>
            <p className={`mt-1.5 text-sm sm:text-base ${isApproved ? 'text-green-600' : 'text-amber-600'}`}>
              {isApproved ? "¡Tu solicitud simulada ha sido APROBADA!" : "Tu solicitud simulada está EN REVISIÓN."}
            </p>
            {simulatedLoanOutcome.simulatedProcessingTime && (
                <p className="text-xs text-slate-500 mt-2">Tiempo estimado de procesamiento: {simulatedLoanOutcome.simulatedProcessingTime}</p>
            )}
          </div>
          
          <div className="p-6 sm:p-7 space-y-3 text-sm sm:text-base">
            {[
                { label: "ID de Solicitud (Simulado):", value: simulatedLoanOutcome.loanId },
                { label: "Monto Solicitado:", value: `${simulatedLoanOutcome.requestedAmount.toFixed(2)} USDC` },
                { label: "Plazo:", value: `${simulatedLoanOutcome.termDays} días` },
                { label: "Tasa de Interés (Simulada):", value: `${simulatedLoanOutcome.interestRate.toFixed(1)}%` },
                { label: "Monto de Interés (Simulado):", value: `${simulatedLoanOutcome.interestAmount.toFixed(2)} USDC` },
                { label: "Propósito:", value: simulatedLoanOutcome.purpose, fullWidth: true },
            ].map(item => (
                <div key={item.label} className={`flex justify-between py-2 border-b border-slate-200/70 ${item.fullWidth ? 'flex-col items-start' : 'items-center'}`}>
                    <strong className="font-medium text-slate-600">{item.label}</strong>
                    <span className={`text-slate-800 ${item.fullWidth ? 'mt-0.5 text-left' : 'text-right'}`}>{item.value}</span>
                </div>
            ))}
             <div className="flex justify-between items-center pt-3 text-base sm:text-lg">
                <strong className="font-semibold text-slate-700">Total a Repagar (Simulado):</strong> 
                <span className="font-extrabold text-sky-700 text-xl">{simulatedLoanOutcome.repaymentAmount.toFixed(2)} USDC</span>
            </div>
            {simulatedLoanOutcome.eligibilityNote && <p className="mt-3 text-xs text-sky-700 bg-sky-50 p-3 rounded-lg border border-sky-200/80">{simulatedLoanOutcome.eligibilityNote}</p>}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 p-5 sm:p-6 bg-slate-100/70 border-t border-slate-200/80">
            <button type="button" className={`${primaryButtonClasses} py-3`} onClick={() => router.push('/dashboard')}>Volver al Dashboard</button>
            <button type="button" className={`${outlineButtonClasses} py-3`} onClick={() => router.push('/microloan/apply?reset=true')}>Realizar otra Simulación</button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) { // Reemplazar con lógica de autenticación real
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 p-6 text-center animate-fadeIn">
        <NativeLockClosedIcon className="w-16 h-16 text-sky-500 mx-auto mb-5" />
        <h2 className="text-2xl font-semibold text-slate-700 mb-3">Acceso Restringido</h2>
        <p className="text-slate-600 mb-6 max-w-sm">Por favor, inicia sesión para acceder a la simulación de microcréditos.</p>
        <button type="button" className={`${primaryButtonClasses} max-w-xs`} onClick={() => router.push('/dashboard?login=true')}>
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-800 animate-fadeIn">
      <div className="absolute top-5 left-5 md:top-8 md:left-8 z-20">
        <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-600 group text-sm font-medium bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm hover:shadow-lg transition-all duration-150 hover:scale-105">
          <NativeArrowLeftIcon className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-0.5" />
          Volver al Dashboard
        </Link>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/70">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 border-b border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-1.5">
            <LoanApplicationIcon className="w-10 h-10 text-sky-600"/>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-500">
              Solicitar Microcrédito
            </h1>
          </div>
          <p className="text-slate-600 text-center text-sm sm:text-base">
            Aportes actuales: <strong className="text-sky-700">{userContributions}</strong>. Esto define tus condiciones.
          </p>
        </div>
        
        {!isEligible ? (
          <div className="p-8 text-center space-y-4">
            <NativeLockClosedIcon className="text-amber-500 mx-auto" />
            <h3 className="text-xl font-semibold text-slate-700">No Elegible Actualmente</h3>
            <p className="text-slate-600 text-sm">{eligibilityMessage}</p>
            <p className="text-xs text-slate-500">Sigue participando en la comunidad para mejorar tus condiciones y acceder a préstamos.</p>
          </div>
        ) : (
          <>
            <div className="p-6 sm:p-8 space-y-6">
              {eligibilityMessage && (
                <div className="bg-sky-50 text-sky-800 p-3.5 rounded-lg border border-sky-200/80 shadow-sm text-sm flex items-start gap-2.5">
                    <LoanApplicationIcon className="w-5 h-5 text-sky-600 mt-0.5 shrink-0"/> 
                    <span>{eligibilityMessage}</span>
                </div>
              )}
              
              <div>
                <label htmlFor="amount-slider" className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Monto del Préstamo: <span className="font-bold text-sky-700">{amount.toFixed(1)} USDC</span></label>
                <div className="flex items-center gap-4">
                  <input type="range" id="amount-slider" min={MIN_LOAN_AMOUNT_DEFAULT} max={currentMaxLoanAmount} step={0.1} value={amount} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(parseFloat(e.target.value))}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:bg-slate-300 disabled:accent-slate-400 disabled:cursor-not-allowed" 
                    disabled={loading || !isEligible}
                  />
                  <input id="amount-input" type="number" value={amount.toFixed(1)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setAmount(Math.max(MIN_LOAN_AMOUNT_DEFAULT, Math.min(currentMaxLoanAmount, val)));
                      else if (e.target.value === '') setAmount(MIN_LOAN_AMOUNT_DEFAULT); // o manejar input vacío
                    }}
                    min={MIN_LOAN_AMOUNT_DEFAULT} max={currentMaxLoanAmount} step={0.1}
                    className={`${baseInputClasses} w-28 text-center py-2.5 text-base`} disabled={loading || !isEligible}
                  />
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2 ml-1">Plazo del Préstamo (días)</span>
                <div role="radiogroup" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(currentInterestRates).map(termKey => (
                    <div key={termKey}>
                      <input type="radio" name="loanTerm" value={termKey} id={`term-${termKey}`} checked={term === termKey}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTerm(e.target.value)}
                        disabled={loading || !isEligible}
                        className="sr-only peer" // Oculta el radio original
                      />
                      <label htmlFor={`term-${termKey}`} 
                        className={`block w-full p-3 text-center rounded-lg border-2 transition-all duration-150
                                    ${loading || !isEligible ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                                             : 'border-slate-300 text-slate-700 cursor-pointer hover:border-sky-500 hover:bg-sky-50/50 peer-checked:bg-sky-500 peer-checked:text-white peer-checked:border-sky-500 peer-checked:shadow-md'}`}>
                        <span className="font-semibold text-sm sm:text-base">{termKey} días</span>
                        <span className="block text-xs mt-0.5">({currentInterestRates[termKey]}% interés)</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Propósito del Préstamo <span className="text-slate-500 text-xs">(mín. 5 caracteres)</span></label>
                <textarea id="purpose" placeholder="Ej: Capital de trabajo para mi negocio..." value={purpose}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPurpose(e.target.value)}
                  rows={3} className={`${baseInputClasses} resize-none`} disabled={loading || !isEligible} maxLength={300}
                />
              </div>

              {amount > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 border border-slate-200/80 text-sm shadow">
                  <h3 className="font-semibold text-slate-700 mb-2 text-base">Resumen Estimado:</h3>
                  <div className="flex justify-between"><span className="text-slate-600">Monto Solicitado:</span> <span className="font-medium text-slate-800">{amount.toFixed(2)} USDC</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Tasa Aplicable:</span> <span className="font-medium text-slate-800">{currentInterestRate.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Plazo:</span> <span className="font-medium text-slate-800">{term} días</span></div>
                  <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-300/70 mt-2 text-base"><span className="text-slate-700">Total a Repagar (aprox.):</span> <span>{repaymentAmountClient.toFixed(2)} USDC</span></div>
                </div>
              )}
            </div>

            <div className="bg-slate-100/70 p-5 sm:p-6 border-t border-slate-200/80">
              <button type="button" className={primaryButtonClasses} onClick={handleApplySimulated}
                disabled={loading || !isEligible || amount < MIN_LOAN_AMOUNT_DEFAULT || amount > currentMaxLoanAmount || !purpose.trim() || purpose.trim().length < 5}>
                {loading ? 'Procesando...' : 'Simular Solicitud'}
              </button>
            </div>
          </>
        )}
      </div>

      {error && !loading && (
        <div className="mt-6 max-w-lg w-full bg-red-50 border-l-4 border-red-600 text-red-700 p-4 rounded-md shadow-lg animate-fadeIn" role="alert">
          <p className="font-bold text-red-800">Error en la Solicitud</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
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