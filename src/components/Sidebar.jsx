import React from 'react';

export default function Sidebar({ telaAtiva, setTelaAtiva, setModalAdminAberto, setModalResumoAberto, setModalLocalizadorAberto, menuMobileAberto, setMenuMobileAberto }) {
  
  const fecharMenuNoMobile = () => setMenuMobileAberto(false);

  return (
    <>
      {/* OVERLAY ESCURO NO MOBILE (Fundo preto transparente quando o menu abre) */}
      {menuMobileAberto && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={fecharMenuNoMobile}
        ></div>
      )}

      {/* A BARRA LATERAL */}
      <aside className={`
        bg-gray-900 text-white w-64 h-full shadow-2xl z-50 flex flex-col 
        fixed md:relative top-0 left-0 transition-transform duration-300 ease-in-out
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* LOGO NO MENU MOBILE (Pra não ficar vazio em cima) */}
        <div className="md:hidden flex justify-between items-center p-5 border-b border-gray-800">
          <span className="font-black italic text-xl text-blue-400">⚡ BancaFlash</span>
          <button onClick={fecharMenuNoMobile} className="text-gray-400 font-bold text-xl">X</button>
        </div>

        <div className="p-4 space-y-2 mt-4">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2 tracking-wider">Principal</p>
          
          <button 
            onClick={() => { setTelaAtiva('PDV'); fecharMenuNoMobile(); }} 
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${telaAtiva === 'PDV' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            <span className="text-xl">🛒</span> Ponto de Venda
          </button>
          
          <button 
            onClick={() => { setTelaAtiva('BI'); fecharMenuNoMobile(); }} 
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-colors ${telaAtiva === 'BI' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            <span className="text-xl">📈</span> Dashboard (BI)
          </button>
        </div>

        <div className="p-4 space-y-2 border-t border-gray-800 mt-auto">
          <p className="text-gray-500 text-xs font-bold uppercase mb-2 tracking-wider">Ferramentas</p>
          
          <button 
            onClick={() => { setModalLocalizadorAberto(true); fecharMenuNoMobile(); }} 
            className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="text-xl text-blue-400">🔍</span> Localizador
          </button>
          
          <button 
            onClick={() => { setModalResumoAberto(true); fecharMenuNoMobile(); }} 
            className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="text-xl text-green-400">📊</span> Fechamento
          </button>
          
          <button 
            onClick={() => { setModalAdminAberto(true); fecharMenuNoMobile(); }} 
            className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="text-xl text-gray-300">⚙️</span> Estoque
          </button>
        </div>
      </aside>
    </>
  );
}