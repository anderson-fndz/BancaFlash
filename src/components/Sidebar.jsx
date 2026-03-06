import React from 'react';

export default function Sidebar({ 
  telaAtiva, 
  setTelaAtiva, 
  setModalAdminAberto, 
  setModalResumoAberto, 
  setModalLocalizadorAberto, 
  setModalReposicaoAberto,
  setModalConciliacaoAberto,
  menuMobileAberto, 
  setMenuMobileAberto 
}) {
  
  // ✨ SUBIMOS O FINANCEIRO PRO MENU PRINCIPAL!
  const menuPrincipal = [
    { id: 'PDV', nome: 'Ponto de Venda', icone: '🛒' },
    { id: 'BI', nome: 'Dashboard (BI)', icone: '📈' },
    { id: 'FINANCEIRO', nome: 'Financeiro', icone: '💸' }
  ];

  return (
    <>
      {menuMobileAberto && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in" 
          onClick={() => setMenuMobileAberto(false)}
        ></div>
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        <div className="h-14 md:h-16 flex items-center justify-between px-6 border-b border-gray-800 shrink-0 bg-gray-950/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-md">⚡</span>
            <span className="font-black italic text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              BancaFlash
            </span>
          </div>
          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="md:hidden text-gray-400 hover:text-white text-xl p-2 active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
          
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Principal</p>
            <div className="space-y-1">
              {menuPrincipal.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setTelaAtiva(item.id); setMenuMobileAberto(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all active:scale-95
                    ${telaAtiva === item.id 
                      ? (item.id === 'FINANCEIRO' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20') 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}
                  `}
                >
                  <span className="text-lg">{item.icone}</span>
                  {item.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Mercadoria</p>
            <div className="space-y-1">
              <button
                onClick={() => { setModalLocalizadorAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-all active:scale-95"
              >
                <span className="text-lg">🔍</span> Localizador
              </button>
              <button
                onClick={() => { setModalReposicaoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-green-400 hover:bg-gray-800 hover:text-green-300 transition-all active:scale-95 border border-transparent hover:border-green-900/50 bg-green-900/10"
              >
                <span className="text-lg drop-shadow-md">📦</span> Reposição (Entrada)
              </button>
              <button
                onClick={() => { setModalAdminAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-all active:scale-95"
              >
                <span className="text-lg">⚙️</span> Gerenciar Produtos
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Final do Dia</p>
            <div className="space-y-1">
              <button
                onClick={() => { setModalResumoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-all active:scale-95"
              >
                <span className="text-lg">📊</span> Fechamento de Caixa
              </button>
              <button
                onClick={() => { setModalConciliacaoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-amber-400 hover:bg-gray-800 hover:text-amber-300 transition-all active:scale-95 border border-transparent hover:border-amber-900/50 bg-amber-900/10"
              >
                <span className="text-lg drop-shadow-md">⚡</span> Bater Estoque
              </button>
              {/* Apagamos o botão vermelho daqui! Ele subiu pro menu principal */}
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-gray-800 text-center bg-gray-950/30">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">BancaFlash v1.0</p>
        </div>
      </aside>
    </>
  );
}