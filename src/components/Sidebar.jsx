import React from 'react';

export default function Sidebar({ telaAtiva, setTelaAtiva, setModalAdminAberto, setModalResumoAberto, setModalLocalizadorAberto }) {
  return (
    <aside className="bg-gray-900 text-white w-16 md:w-64 flex flex-col h-full shadow-2xl z-20 transition-all duration-300">
      
      {/* NAVEGAÇÃO PRINCIPAL (Telas Inteiras) */}
      <div className="p-2 md:p-4 space-y-2 mt-4">
        <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase hidden md:block mb-2 tracking-wider">Principal</p>
        
        <button 
          onClick={() => setTelaAtiva('PDV')} 
          className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl font-bold transition-colors ${telaAtiva === 'PDV' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
          title="Ponto de Venda"
        >
          <span className="text-xl">🛒</span> <span className="hidden md:block">Ponto de Venda</span>
        </button>
        
        <button 
          onClick={() => setTelaAtiva('BI')} 
          className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl font-bold transition-colors ${telaAtiva === 'BI' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
          title="Inteligência (BI)"
        >
          <span className="text-xl">📈</span> <span className="hidden md:block">Dashboard (BI)</span>
        </button>
      </div>

      {/* FERRAMENTAS (Modais) */}
      <div className="p-2 md:p-4 space-y-2 border-t border-gray-800 mt-auto">
        <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase hidden md:block mb-2 tracking-wider">Ferramentas</p>
        
        <button 
          onClick={() => setModalLocalizadorAberto(true)} 
          className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title="Localizador"
        >
          <span className="text-xl text-blue-400">🔍</span> <span className="hidden md:block">Localizador</span>
        </button>
        
        <button 
          onClick={() => setModalResumoAberto(true)} 
          className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title="Fechamento de Caixa"
        >
          <span className="text-xl text-green-400">📊</span> <span className="hidden md:block">Fechamento</span>
        </button>
        
        <button 
          onClick={() => setModalAdminAberto(true)} 
          className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title="Gestão de Estoque"
        >
          <span className="text-xl text-gray-300">⚙️</span> <span className="hidden md:block">Estoque</span>
        </button>
      </div>

    </aside>
  );
}