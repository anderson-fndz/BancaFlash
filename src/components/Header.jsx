import React from 'react';

export default function Header({ setModalAdminAberto, setModalResumoAberto }) {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
      <h1 className="text-xl font-black italic">BancaFlash ⚡</h1>
      
      <div className="flex gap-2">
        <button 
          onClick={() => setModalAdminAberto(true)} 
          className="bg-gray-800 text-white px-3 py-2 rounded-lg font-bold text-sm shadow active:scale-95 transition-transform"
        >
          ⚙️
        </button>
        <button 
          onClick={() => setModalResumoAberto(true)} 
          className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span>📊</span> Resumo
        </button>
      </div>
    </header>
  );
}