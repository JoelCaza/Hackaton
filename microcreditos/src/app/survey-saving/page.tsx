// src/app/survey-savings/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// --- Iconos SVG Nativos Simples ---
const NativeArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const NativeCheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className || "w-10 h-10"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
const NativeXIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className || "w-10 h-10"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const NativeTrophyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-16 h-16"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3 3 0 0012 9.75A3 3 0 007.5 14.25v4.5m9 0h-9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5V12.75a4.505 4.505 0 01-4.5 4.5H7.5a4.505 4.505 0 01-4.5-4.5V10.5S4.5 6 12 6s7.5 4.5 7.5 4.5z" />
  </svg>
);
const NativeClockIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"} >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const NativeSparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 7.5l.813 2.846a4.5 4.5 0 012.14 2.14L24 13.5l-2.846.813a4.5 4.5 0 01-2.14 2.14L16.5 19.5l-.813-2.846a4.5 4.5 0 01-2.14-2.14L10.5 13.5l2.846-.813a4.5 4.5 0 012.14-2.14L18.25 7.5z" />
  </svg>
);
// --- Fin de Iconos SVG ---

type SurveyStep = 'deposit' | 'survey' | 'results';
interface SurveyOption { id: string; text: string; }
interface SurveyQuestion { id: number; text: string; options: SurveyOption[]; correctOptionId: string; timeLimitSeconds: number; points: number; }

const ALL_SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 1, text: "¿Qué es la 'inflación' en economía?", options: [ {id: 'a', text: 'Aumento del valor del dinero'}, {id: 'b', text: 'Disminución general de precios'}, {id: 'c', text: 'Aumento sostenido del nivel general de precios'}, {id: 'd', text: 'Estabilidad total de precios'} ], correctOptionId: 'c', timeLimitSeconds: 20, points: 100 },
  { id: 2, text: "¿Cuál es una característica clave de un 'activo líquido'?", options: [ {id: 'a', text: 'Difícil de vender rápidamente'}, {id: 'b', text: 'Se convierte fácilmente en efectivo sin perder valor'}, {id: 'c', text: 'Solo propiedades inmobiliarias'}, {id: 'd', text: 'Siempre genera altos retornos'} ], correctOptionId: 'b', timeLimitSeconds: 25, points: 120 },
  { id: 3, text: "El 'riesgo de mercado' en inversiones se refiere a:", options: [ {id: 'a', text: 'Riesgo de que una empresa quiebre'}, {id: 'b', text: 'Riesgo de perder dinero por no invertir'}, {id: 'c', text: 'Riesgo de pérdidas por factores que afectan a todo el mercado'}, {id: 'd', text: 'Garantía de no perder dinero'} ], correctOptionId: 'c', timeLimitSeconds: 25, points: 110 },
  // ... (añade más preguntas)
];

const QUESTIONS_PER_SURVEY = 3;
const MAX_INTEREST_RATE_PERCENT_SIMULATED = 2.5; // Tasa máxima de "interés" simulado (ej. 2.5%)
const CONTRIBUTION_TO_MAIN_POOL_ON_SUCCESS = 1; // Cuántos "puntos" se añaden al pool del dashboard
const USER_CONTRIBUTIONS_LOCALSTORAGE_KEY = "poolContributionsCountV2"; // Misma key que en el Dashboard


export default function SurveySavingsPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<SurveyStep>('deposit');
  const [participationAmount, setParticipationAmount] = useState<number>(0);
  const [participationInput, setParticipationInput] = useState<string>('20'); // Default de participación

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | 'pending' | 'timeout'>('pending');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [totalPossiblePointsInCurrentSurvey, setTotalPossiblePointsInCurrentSurvey] = useState<number>(0);
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState<boolean>(false);

  const [earnedInterestAmount, setEarnedInterestAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false); 

  const initializeSurvey = useCallback(() => {
    const shuffled = [...ALL_SURVEY_QUESTIONS].sort(() => 0.5 - Math.random());
    const currentSurveySet = shuffled.slice(0, QUESTIONS_PER_SURVEY);
    setQuestions(currentSurveySet);
    setTotalPossiblePointsInCurrentSurvey(currentSurveySet.reduce((sum, q) => sum + q.points, 0));
    setCurrentQuestionIndex(0);
    setScore(0);
    setEarnedInterestAmount(0); // Resetear interés ganado
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
    let isCorrectBase = false;
    let pointsThisRound = 0;

    if (!timeout && optionId && optionId === currentQuestion.correctOptionId) {
      pointsThisRound = currentQuestion.points;
      isCorrectBase = true;
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
        const performanceRatio = totalPossiblePointsInCurrentSurvey > 0 ? updatedScore / totalPossiblePointsInCurrentSurvey : 0;
        const calculatedInterest = participationAmount * performanceRatio * (MAX_INTEREST_RATE_PERCENT_SIMULATED / 100);
        setEarnedInterestAmount(parseFloat(calculatedInterest.toFixed(2)));
        
        if (performanceRatio >= 0.5) { 
            const currentContributions = parseInt(localStorage.getItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY) || '0', 10);
            localStorage.setItem(USER_CONTRIBUTIONS_LOCALSTORAGE_KEY, (currentContributions + CONTRIBUTION_TO_MAIN_POOL_ON_SUCCESS).toString());
        }
        setCurrentStep('results');
      }
    }, 2000); 
  }, [currentQuestionIndex, questions, score, participationAmount, totalPossiblePointsInCurrentSurvey, showFeedbackOverlay]);

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
    const amount = parseFloat(participationInput);
    if (isNaN(amount) || amount <= 0) { alert("Monto de participación inválido."); return; }
    if (amount > 5000) { alert("Para simulación, participa con menos de 5,000 USDC."); return; }
    setParticipationAmount(amount);
    setCurrentStep('survey');
  };

  const restartSurveyFlow = () => {
    setIsLoading(true);
    initializeSurvey();
    setParticipationInput('20'); // Reset al valor por defecto
    setParticipationAmount(0);
    setCurrentStep('deposit');
    setTimeout(() => setIsLoading(false), 200);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const baseButtonClasses = "w-full px-6 py-3 text-lg font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transform transition-all duration-150 ease-in-out hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-sky-600 hover:bg-sky-700 focus:ring-sky-400 text-white`;
  const outlineButtonClasses = `${baseButtonClasses} bg-transparent hover:bg-slate-100 border-2 border-slate-300 text-slate-700 hover:border-slate-400 focus:ring-sky-400 text-base py-2.5`;
  const kahootButtonBaseLayout = "p-4 md:p-6 rounded-lg text-lg md:text-xl font-bold shadow-lg hover:opacity-90 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  const kahootButtonStyles = [
    `bg-red-500 hover:bg-red-600 text-white focus:ring-red-300`,
    `bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300`,
    `bg-yellow-500 hover:bg-yellow-600 text-slate-800 focus:ring-yellow-300`, // Ajustado para mejor contraste de texto
    `bg-green-500 hover:bg-green-600 text-white focus:ring-green-300`,
  ];

  if (isLoading) return <div className="min-h-screen flex justify-center items-center bg-slate-100"><p className="text-slate-700 text-xl animate-pulse">Cargando...</p></div>;

  // --- VISTA DE DEPÓSITO ---
  if (currentStep === 'deposit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-200 to-sky-200 flex flex-col items-center justify-center p-4 text-slate-800">
        <div className="absolute top-6 left-6 z-10">
          <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-800 group text-sm font-medium bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg shadow hover:shadow-md transition-shadow">
            <NativeArrowLeftIcon className="w-5 h-5 mr-2"/> Dashboard
          </Link>
        </div>
        <div className="w-full max-w-lg bg-white p-8 md:p-10 rounded-2xl shadow-2xl text-center">
          <NativeSparklesIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-sky-700 mb-4">Encuestas de Conocimiento Financiero</h1>
          <p className="text-slate-600 mb-8 text-base md:text-lg">
            "Invierte" un monto simulado en tu conocimiento. ¡Responde correctamente y obtén un "interés" sobre tu participación!
          </p>
          <form onSubmit={handleParticipationSubmit} className="space-y-6">
            <div>
              <label htmlFor="participationAmount" className="block text-md font-medium text-slate-700 mb-2 text-left">
                Monto de Participación (USDC Simulado):
              </label>
              <input
                type="number" id="participationAmount" value={participationInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setParticipationInput(e.target.value)}
                placeholder="Ej: 20" min="1" step="any"
                className="w-full text-lg p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" required
              />
            </div>
            <button type="submit" className={primaryButtonClasses}>
              Participar con {participationInput || 0} USDC
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
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-stretch justify-between p-4 sm:p-6 transition-colors duration-500 overflow-hidden"> {/* overflow-hidden en lugar de y-auto para pantalla completa */}
        {showFeedbackOverlay && (
            <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 transition-opacity duration-300 
                            ${answerStatus === 'correct' ? 'bg-green-500/95' : 
                              answerStatus === 'incorrect' ? 'bg-red-500/95' : 
                              'bg-slate-700/95'}`}>
                {answerStatus === 'correct' && <NativeCheckIcon className="w-24 h-24 text-white mb-4" />}
                {answerStatus === 'incorrect' && <NativeXIcon className="w-24 h-24 text-white mb-4" />}
                {answerStatus === 'timeout' && <NativeClockIcon className="w-24 h-24 text-white mb-4" />}
                <p className="text-4xl font-bold">
                    {answerStatus === 'correct' ? '¡Correcto!' : 
                     answerStatus === 'incorrect' ? 'Incorrecto' : 
                     '¡Tiempo Agotado!'}
                </p>
                {answerStatus === 'correct' && <p className="text-xl mt-2">+{questions[currentQuestionIndex]?.points || 0} puntos</p>}
            </div>
        )}

        <header className="w-full max-w-4xl mx-auto pt-2 shrink-0"> {/* shrink-0 para que no se encoja */}
          <div className="flex justify-between items-center text-slate-300 mb-2">
            <span className="text-sm font-semibold">Pregunta {currentQuestionIndex + 1}/{questions.length}</span>
            <span className="text-lg font-bold">Puntos: {score}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 md:h-4 overflow-hidden">
            <div className="bg-yellow-400 h-full rounded-full transition-all duration-300 ease-linear" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-2 my-4"> {/* my-4 para dar espacio */}
          <div className="w-full bg-white text-slate-800 p-6 py-8 sm:p-8 md:p-12 rounded-xl shadow-2xl mb-6 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold">{currentQuestion.text}</h2>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={option.id} type="button"
                onClick={() => handleAnswer(option.id)}
                disabled={showFeedbackOverlay}
                className={`${kahootButtonBaseLayout} ${kahootButtonStyles[index % kahootButtonStyles.length]} 
                            ${showFeedbackOverlay && option.id === selectedAnswerId ? 
                                (answerStatus === 'correct' ? '!bg-green-400 ring-green-300' : '!bg-red-400 ring-red-300') 
                                : ''}
                            ${showFeedbackOverlay && option.id !== selectedAnswerId && option.id === currentQuestion.correctOptionId ? '!bg-green-400 ring-2 ring-green-200 opacity-60' : ''}
                            ${showFeedbackOverlay && option.id !== selectedAnswerId && option.id !== currentQuestion.correctOptionId ? 'opacity-40' : ''}
                          `}
              >
                <span className="block">{option.text}</span>
              </button>
            ))}
          </div>
        </main>

        <footer className="w-full max-w-3xl mx-auto pb-2 text-center shrink-0"> {/* shrink-0 */}
          <div className={`inline-block px-6 py-2 rounded-full text-2xl font-bold border-4 ${timeLeft <= 5 && timeLeft > 0 ? 'text-red-300 border-red-400 animate-pulse' : timeLeft === 0 ? 'text-slate-500 border-slate-700' : 'text-slate-200 border-slate-600'}`}>
            {timeLeft}
          </div>
        </footer>
      </div>
    );
  }

  // --- VISTA DE RESULTADOS ---
  if (currentStep === 'results') {
    let correctAnswersCountSimple = 0; // Este cálculo sigue siendo una aproximación simple
    if (questions.length > 0 && totalPossiblePointsInCurrentSurvey > 0) {
        const averagePointsPerQuestion = totalPossiblePointsInCurrentSurvey / questions.length;
        if (averagePointsPerQuestion > 0) {
            correctAnswersCountSimple = Math.round(score / averagePointsPerQuestion);
        }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center p-4">
         <div className="absolute top-6 left-6 z-10">
          <Link href="/dashboard" className="inline-flex items-center text-sky-700 hover:text-sky-800 group text-sm font-medium bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg shadow hover:shadow-md transition-shadow">
            <NativeArrowLeftIcon className="w-5 h-5 mr-2"/> Dashboard
          </Link>
        </div>
        <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-2xl text-center">
          <NativeTrophyIcon className="w-24 h-24 text-yellow-400 mx-auto mb-5 drop-shadow-lg"/>
          <h1 className="text-4xl font-bold text-sky-700 mb-4">¡Encuesta Finalizada!</h1>
          <p className="text-slate-700 text-lg mb-6">Puntuación Total: <span className="font-bold text-sky-600">{score}</span> / {totalPossiblePointsInCurrentSurvey} puntos.</p>
          
          <div className="bg-sky-50 p-6 rounded-lg border-2 border-sky-200 space-y-3 mb-8 text-left text-md shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Monto de Participación:</span> 
              <span className="font-semibold text-slate-800 text-lg">{participationAmount.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between items-center text-green-600">
              <span className="font-semibold">Interés Ganado (Simulado):</span> 
              <span className="font-bold text-xl">+{earnedInterestAmount.toFixed(2)} USDC</span>
            </div>
            <hr className="my-3 border-sky-200"/>
            <div className="flex justify-between items-center font-bold text-2xl text-sky-700">
              <span>Nuevo Saldo (Simulado):</span> 
              <span>{(participationAmount + earnedInterestAmount).toFixed(2)} USDC</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-6">Al volver al dashboard, se registrará un aporte simbólico al fondo comunitario por tu participación exitosa.</p>

          <div className="space-y-4">
            <button type="button" onClick={restartSurveyFlow} className={`${primaryButtonClasses} bg-green-600 hover:bg-green-700 focus:ring-green-400`}>
              Jugar Otra Encuesta
            </button>
            <button 
              type="button" 
              onClick={() => { router.push('/dashboard?contribution=true'); }} 
              className={outlineButtonClasses}
            > 
              Volver al Dashboard y Aportar al Fondo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex justify-center items-center bg-slate-100"><p className="text-slate-700 text-xl animate-pulse">Cargando encuesta...</p></div>;
}