// src/app/survey-savings/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Iconos SVG (Ajustados para mayor impacto visual) ---
const NativeArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const NativeCheckCircleIcon = ({ className = "w-24 h-24" }: { className?: string }) => ( // Más grande
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeXCircleIcon = ({ className = "w-24 h-24" }: { className?: string }) => ( // Más grande
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const NativeTrophyIcon = ({ className = "w-28 h-28" }: { className?: string }) => ( // Más grande
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3 3 0 0012 9.75A3 3 0 007.5 14.25v4.5m9 0h-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5V12.75a4.505 4.505 0 01-4.5 4.5H7.5a4.505 4.505 0 01-4.5-4.5V10.5S4.5 6 12 6s7.5 4.5 7.5 4.5z" />
  </svg>
);
const NativeClockIcon = ({ className = "w-24 h-24" }: { className?: string }) => ( // Más grande
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const NativeSparklesIcon = ({ className = "w-16 h-16" }: { className?: string }) => ( // Ajustado
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5l.813 2.846a4.5 4.5 0 012.14 2.14L24 13.5l-2.846.813a4.5 4.5 0 01-2.14 2.14L16.5 19.5l-.813-2.846a4.5 4.5 0 01-2.14-2.14L10.5 13.5l2.846-.813a4.5 4.5 0 012.14-2.14L18.25 7.5z" />
  </svg>
);
const WalletIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6.75A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V12m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m12 3V9" />
    </svg>
);


type SurveyStep = 'deposit' | 'survey' | 'results';
interface SurveyOption { id: string; text: string; }
interface SurveyQuestion { id: number; text: string; options: SurveyOption[]; correctOptionId: string; timeLimitSeconds: number; points: number; }

const ALL_SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 1, text: "¿Qué es la 'inflación' en economía?", options: [ {id: 'a', text: 'Aumento del valor del dinero'}, {id: 'b', text: 'Disminución general de precios'}, {id: 'c', text: 'Aumento sostenido del nivel general de precios'}, {id: 'd', text: 'Estabilidad total de precios'} ], correctOptionId: 'c', timeLimitSeconds: 20, points: 100 },
  { id: 2, text: "¿Una característica clave de un 'activo líquido' es?", options: [ {id: 'a', text: 'Difícil de vender'}, {id: 'b', text: 'Se convierte fácil en efectivo sin perder valor'}, {id: 'c', text: 'Solo propiedades'}, {id: 'd', text: 'Siempre da altos retornos'} ], correctOptionId: 'b', timeLimitSeconds: 25, points: 120 },
  { id: 3, text: "El 'riesgo de mercado' en inversiones se refiere a:", options: [ {id: 'a', text: 'Riesgo de quiebra empresarial'}, {id: 'b', text: 'Riesgo por no invertir'}, {id: 'c', text: 'Riesgo de pérdidas por factores que afectan a todo el mercado'}, {id: 'd', text: 'Garantía de no perder'} ], correctOptionId: 'c', timeLimitSeconds: 25, points: 110 },
];

const QUESTIONS_PER_SURVEY = 3;
const MAX_INTEREST_RATE_PERCENT = 2.5; // Tasa máxima de "interés" (ej. 2.5%)
const CONTRIBUTION_TO_MAIN_POOL_ON_SUCCESS = 1; 
const USER_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2";
const PREDEFINED_PARTICIPATION_AMOUNTS = [10, 25, 50, 100];


export default function SurveySavingsPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<SurveyStep>('deposit');
  const [participationAmount, setParticipationAmount] = useState<number>(PREDEFINED_PARTICIPATION_AMOUNTS[1]); // Default al segundo monto

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | 'pending' | 'timeout'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState<number>(0);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState<boolean>(false);

  const [earnedInterestAmount, setEarnedInterestAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false); 

  const initializeSurvey = useCallback(() => {
    const shuffled = [...ALL_SURVEY_QUESTIONS].sort(() => 0.5 - Math.random());
    const currentSurveySet = shuffled.slice(0, QUESTIONS_PER_SURVEY);
    setQuestions(currentSurveySet);
    setTotalPossiblePoints(currentSurveySet.reduce((sum, q) => sum + q.points, 0));
    setCurrentQuestionIndex(0);
    setScore(0);
    setEarnedInterestAmount(0); 
    setSelectedAnswerId(null);
    setAnswerStatus('pending');
    setShowFeedbackOverlay(false);
  }, []);

  useEffect(() => {
    initializeSurvey();
  }, [initializeSurvey]);
  
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleAnswer = useCallback((optionId: string | null, timeout: boolean = false) => {
    if (showFeedbackOverlay || !questions[currentQuestionIndex]) return;
    clearTimer(); 

    const currentQuestion = questions[currentQuestionIndex];
    let pointsThisRound = 0;

    if (!timeout && optionId && optionId === currentQuestion.correctOptionId) {
      pointsThisRound = currentQuestion.points;
      setAnswerStatus('correct');
    } else if (timeout) {
      setAnswerStatus('timeout');
    } else {
      setAnswerStatus('incorrect');
    }
    
    const updatedScore = score + pointsThisRound; 
    setScore(updatedScore);
    setSelectedAnswerId(optionId); 
    setShowFeedbackOverlay(true); 

    setTimeout(() => {
      setShowFeedbackOverlay(false); 
      setSelectedAnswerId(null); 
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      } else {
        const performanceRatio = totalPossiblePoints > 0 ? updatedScore / totalPossiblePoints : 0;
        const calculatedInterest = participationAmount * performanceRatio * (MAX_INTEREST_RATE_PERCENT / 100);
        setEarnedInterestAmount(parseFloat(calculatedInterest.toFixed(2)));
        
        if (performanceRatio >= 0.5) { 
            const currentContributions = parseInt(localStorage.getItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
            localStorage.setItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY, (currentContributions + CONTRIBUTION_TO_MAIN_POOL_ON_SUCCESS).toString());
        }
        setCurrentStep('results');
      }
    }, 2500); // Aumentado ligeramente el tiempo del feedback
  }, [currentQuestionIndex, questions, score, participationAmount, totalPossiblePoints, showFeedbackOverlay]); // Asegúrate que totalPossiblePoints esté aquí

  useEffect(() => {
    if (currentStep === 'survey' && currentQuestionIndex < questions.length && questions.length > 0) {
      setTimeLeft(questions[currentQuestionIndex].timeLimitSeconds);
      setAnswerStatus('pending');
      setShowFeedbackOverlay(false);

      clearTimer(); 
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearTimer();
            handleAnswer(null, true); 
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearTimer();
    }
  }, [currentStep, currentQuestionIndex, questions, handleAnswer]);
  
  const handleParticipationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (participationAmount <= 0) { alert("Por favor, selecciona un monto de participación válido."); return; }
    if (participationAmount > 5000) { alert("Participa con menos de 5,000 USDC."); return; }
    setCurrentStep('survey');
  };

  const restartSurveyFlow = () => {
    setIsLoading(true);
    initializeSurvey();
    setParticipationAmount(PREDEFINED_PARTICIPATION_AMOUNTS[1]); // Reset al valor por defecto
    setCurrentStep('deposit');
    setTimeout(() => setIsLoading(false), 300);
  };

  const currentQuestion = questions[currentQuestionIndex];

  // --- Clases de Botones Refinadas ---
  const baseButtonClasses = "w-full flex items-center justify-center gap-2.5 px-6 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 transform transition-all duration-200 ease-in-out hover:-translate-y-1 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-md";
  const primaryButtonClasses = `${baseButtonClasses} bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 focus:ring-blue-400/70 text-white disabled:from-slate-400 disabled:to-slate-500`;
  const outlineButtonClasses = `${baseButtonClasses} bg-white hover:bg-slate-100 border-2 border-slate-400 text-slate-700 hover:border-slate-500 focus:ring-slate-300/70 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400`;
  const kahootButtonBaseLayout = "p-5 md:p-6 rounded-xl text-xl md:text-2xl font-bold shadow-xl hover:opacity-95 transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center";
  const kahootButtonStyles = [ 
    `bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/70`,
    `bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500/70`,
    `bg-yellow-500 hover:bg-yellow-600 text-slate-900 focus:ring-yellow-500/70`,
    `bg-green-600 hover:bg-green-700 text-white focus:ring-green-500/70`,
  ];
  const feedbackOverlayBase = "fixed inset-0 flex flex-col items-center justify-center z-50 p-6 transition-all duration-500 ease-out"; // Transición más larga

  if (isLoading) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 p-4">
        <div className="w-14 h-14 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 text-lg">Cargando...</p>
    </div>
  );

  // --- VISTA DE DEPÓSITO ---
  if (currentStep === 'deposit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-800 animate-fadeIn">
        <div className="absolute top-5 left-5 md:top-8 md:left-8 z-10">
          <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-600 group text-sm font-medium bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105">
            <NativeArrowLeftIcon className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-0.5" /> Volver al Dashboard
          </Link>
        </div>
        <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center border border-slate-200/70">
          <NativeSparklesIcon className="w-20 h-20 text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 mb-5">
            Encuestas de Conocimiento
          </h1>
          <p className="text-slate-600 mb-8 text-md md:text-lg leading-relaxed">
            Participa con un monto, pon a prueba tus conocimientos financieros y ¡gana un interés atractivo sobre tu participación!
          </p>
          <form onSubmit={handleParticipationSubmit} className="space-y-8">
            <div>
              <label className="block text-lg font-semibold text-slate-700 mb-4 text-center">
                Selecciona tu Monto de Participación (USDC):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {PREDEFINED_PARTICIPATION_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setParticipationAmount(val)}
                    className={`py-3.5 px-2 rounded-xl border-2 font-semibold text-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-4
                                ${participationAmount === val 
                                    ? 'bg-sky-600 text-white border-sky-700 shadow-lg scale-105 focus:ring-sky-300/80' 
                                    : 'bg-white text-sky-700 border-slate-300 hover:bg-sky-50 hover:border-sky-500 focus:ring-sky-300/50'}`}
                  >
                    {val} <span className="font-normal text-xs">USDC</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className={`${primaryButtonClasses} mt-4`}>
              <WalletIcon className="mr-2"/> Participar con {participationAmount} USDC
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA DE ENCUESTA ---
  if (currentStep === 'survey' && currentQuestion) {
    const progressPercent = ((currentQuestionIndex) / questions.length) * 100;
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-stretch justify-between p-4 sm:p-6 transition-colors duration-300 overflow-y-auto"> {/* overflow-y-auto para contenido largo */}
        {showFeedbackOverlay && (
            <div className={`${feedbackOverlayBase} 
                            ${answerStatus === 'correct' ? 'bg-green-600/95' : 
                              answerStatus === 'incorrect' ? 'bg-red-700/95' : 
                              'bg-orange-600/95'} // Naranja para timeout
                            ${showFeedbackOverlay ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                {answerStatus === 'correct' && <NativeCheckCircleIcon className="text-white mb-4 drop-shadow-2xl" />}
                {answerStatus === 'incorrect' && <NativeXCircleIcon className="text-white mb-4 drop-shadow-2xl" />}
                {answerStatus === 'timeout' && <NativeClockIcon className="text-white mb-4 drop-shadow-2xl" />}
                <p className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-2 [text-shadow:0_3px_6px_rgba(0,0,0,0.4)]">
                    {answerStatus === 'correct' ? '¡Correcto!' : 
                     answerStatus === 'incorrect' ? '¡Incorrecto!' : 
                     '¡Tiempo Agotado!'}
                </p>
                {answerStatus === 'correct' && <p className="text-2xl sm:text-3xl font-semibold opacity-90 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">+{questions[currentQuestionIndex]?.points || 0} puntos</p>}
                {answerStatus === 'incorrect' && questions[currentQuestionIndex] && (
                    <p className="text-lg sm:text-xl mt-4 opacity-80 max-w-md text-center px-4">
                        La respuesta correcta era: <strong className="font-bold text-yellow-300">{questions[currentQuestionIndex].options.find(o => o.id === questions[currentQuestionIndex].correctOptionId)?.text}</strong>
                    </p>
                )}
                 {answerStatus === 'timeout' && (
                    <p className="text-lg sm:text-xl mt-4 opacity-80">Se acabó el tiempo para esta pregunta.</p>
                )}
            </div>
        )}

        <header className="w-full max-w-4xl mx-auto pt-2 sm:pt-4 shrink-0">
          <div className="flex justify-between items-center text-slate-300 mb-2.5">
            <span className="text-sm font-semibold tracking-wide">Pregunta {currentQuestionIndex + 1} <span className="opacity-70">de</span> {questions.length}</span>
            <span className="text-lg font-bold rounded-lg bg-slate-700/60 px-4 py-1.5 shadow-sm">Puntos: {score}</span>
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-4 md:h-5 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-2 my-5 sm:my-8">
          <div className="w-full bg-white/95 backdrop-blur-md text-slate-800 p-8 sm:p-10 md:p-14 rounded-2xl shadow-2xl mb-8 text-center border border-slate-200/50">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">{currentQuestion.text}</h2>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {currentQuestion.options.map((option, index) => (
              <button
                key={option.id} type="button"
                onClick={() => handleAnswer(option.id)}
                disabled={showFeedbackOverlay}
                className={`${kahootButtonBaseLayout} ${kahootButtonStyles[index % kahootButtonStyles.length]} 
                            ${showFeedbackOverlay && option.id === selectedAnswerId ? 
                                (answerStatus === 'correct' ? '!bg-green-500 ring-green-400 !opacity-100 scale-105 shadow-2xl' : 
                                 answerStatus === 'incorrect' ? '!bg-red-500 ring-red-400 !opacity-100 scale-105 shadow-2xl' : 
                                 '!bg-orange-500 ring-orange-400 !opacity-100 scale-105 shadow-2xl'
                                ) 
                                : ''}
                            ${showFeedbackOverlay && option.id !== selectedAnswerId && option.id === currentQuestion.correctOptionId ? '!bg-green-500 !opacity-60 ring-2 ring-white/50' : ''}
                            ${showFeedbackOverlay && option.id !== selectedAnswerId && option.id !== currentQuestion.correctOptionId ? 'opacity-30 hover:opacity-30 scale-95' : ''}
                          `}
              >
                <span className="block truncate">{option.text}</span> {/* truncate para textos largos */}
              </button>
            ))}
          </div>
        </main>

        <footer className="w-full max-w-3xl mx-auto pb-2 sm:pb-4 text-center shrink-0">
          <div className={`inline-block px-10 py-4 rounded-full text-4xl font-bold border-4 shadow-xl transition-all duration-300
                        ${timeLeft <= 5 && timeLeft > 0 ? 'text-red-300 border-red-500/80 bg-red-900/40 animate-pulse' : 
                          timeLeft === 0 ? 'text-slate-500 border-slate-700 bg-slate-800/40' : 
                          'text-slate-100 border-slate-500/80 bg-slate-700/60'}`}>
            {timeLeft}
          </div>
        </footer>
      </div>
    );
  }

  // --- VISTA DE RESULTADOS ---
  if (currentStep === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 flex flex-col items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-800 animate-fadeIn">
          <div className="absolute top-5 left-5 md:top-8 md:left-8 z-10">
            <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-600 group text-sm font-medium bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 hover:scale-105">
                <NativeArrowLeftIcon className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-0.5"/> Volver al Dashboard
            </Link>
        </div>
        <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center border border-slate-200/70">
          <NativeTrophyIcon className="text-yellow-400 mx-auto mb-6 drop-shadow-xl"/>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 mb-4">
            ¡Encuesta Completada!
          </h1>
          <p className="text-slate-700 text-lg sm:text-xl mb-8">Puntuación Final: <span className="font-bold text-sky-600 text-xl sm:text-2xl">{score}</span> / {totalPossiblePoints} puntos.</p>
          
          <div className="bg-sky-50/80 p-6 rounded-xl border-2 border-sky-200/90 space-y-4 mb-8 text-left text-md shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Monto de Participación:</span> 
              <span className="font-semibold text-slate-800 text-lg">{participationAmount.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between items-center text-green-600">
              <span className="font-semibold">Interés Ganado:</span> 
              <span className="font-bold text-xl">+{earnedInterestAmount.toFixed(2)} USDC</span>
            </div>
            <hr className="my-3 border-sky-300/70"/>
            <div className="flex justify-between items-center font-bold text-2xl text-sky-700">
              <span>Saldo Final con Interés:</span> 
              <span>{(participationAmount + earnedInterestAmount).toFixed(2)} USDC</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-8 px-4 leading-relaxed">Al volver al dashboard, se registrará tu aporte simbólico al fondo comunitario por tu excelente desempeño.</p>

          <div className="space-y-4">
            <button type="button" onClick={restartSurveyFlow} className={`${primaryButtonClasses} bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-400/80`}>
              <NativeSparklesIcon className="w-5 h-5 mr-2"/> Jugar Otra Vez
            </button>
            <button 
              type="button" 
              onClick={() => { router.push('/dashboard?contribution=true'); }} 
              className={outlineButtonClasses}
            > 
              Volver al Dashboard y Aportar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 p-4">
        <div className="w-14 h-14 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 text-lg">Cargando encuesta...</p>
    </div>
  );
}