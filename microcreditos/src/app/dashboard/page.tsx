// src/app/dashboard/page.tsx
'use client';

import { useRouter } from 'next/navigation';
// CAMBIO IMPORTANTE: Importar React de esta manera
import * as React from 'react'; 
// Los hooks como useState, si los usaras aquí, vendrían de React.useState

export default function DashboardPage() {
  const router = useRouter();

  // Si necesitaras estado aquí, lo harías así:
  // const [someState, setSomeState] = React.useState('');

  return (
    // Todo este JSX debería ser entendido correctamente por TypeScript ahora
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 bg-gray-100">
      <header className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Dashboard Principal</h1>
        <p className="text-md md:text-lg text-gray-600 mt-2">Selecciona una operación.</p>
      </header>

      <main className="grid w-full max-w-md gap-6">
        <button
          onClick={() => router.push('/microloand/apply')}
          className="px-6 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
        >
          Solicitar Microcrédito
        </button>

        <button
          onClick={() => router.push('/exchange')} 
          className="px-6 py-4 text-lg font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
        >
          Intercambio WLD/USDC
        </button>

        <button
          onClick={() => router.push('/survey-savings')} 
          className="px-6 py-4 text-lg font-medium text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors"
        >
          Encuesta (Ahorro Flexible)
        </button>
      </main>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>Microcréditos App &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}