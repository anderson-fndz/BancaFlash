import React from 'react';

export default function Header({ setMenuMobileAberto }) {
  return (
    <header className="bg-white text-gray-800 p-4 shadow-sm z-10 flex justify-between items-center border-b border-gray-200">
      <div className="flex items-center gap-3">
        {/* BOTÃO HAMBURGUER (Só aparece no Mobile) */}
        <button 
          onClick={() => setMenuMobileAberto(true)}
          className="md:hidden text-gray-600 hover:text-blue-600 focus:outline-none"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <div className="flex items-center gap-1">
          <span className="text-2xl hidden sm:block">⚡</span>
          <h1 className="text-xl font-black italic tracking-tight text-blue-600">BancaFlash</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-700">Administrador</p>
          <p className="text-xs text-green-500 font-bold">● Online</p>
        </div>
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black border-2 border-blue-200">
          AD
        </div>
      </div>
    </header>
  );
}