import React from 'react';
import { 
  ShoppingCart, 
  BarChart3, 
  CircleDollarSign, 
  Search, 
  PackagePlus, 
  Settings, 
  Calculator, 
  ClipboardCheck,
  Zap,
  X,
  Trophy,
  CalendarRange,
  RefreshCw // ✨ ÍCONE IMPORTADO AQUI!
} from 'lucide-react';

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
  
  const menuPrincipal = [
    { id: 'PDV', nome: 'Ponto de Venda', icone: ShoppingCart },
    { id: 'BI', nome: 'Dashboard (BI)', icone: BarChart3 },
    { id: 'RANKING', nome: 'Ranking de Vendas', icone: Trophy },
    { id: 'HISTORICO', nome: 'Histórico de Vendas', icone: CalendarRange },
    { id: 'FINANCEIRO', nome: 'Financeiro', icone: CircleDollarSign }
  ];

  return (
    <>
      {menuMobileAberto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in" 
          onClick={() => setMenuMobileAberto(false)}
        ></div>
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-[#0B0F19] text-gray-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-gray-800 shadow-2xl md:shadow-none
        ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-800/50 shrink-0 bg-[#0B0F19] gap-2">
          <div 
            onClick={() => { setTelaAtiva('PDV'); setMenuMobileAberto(false); }}
            className="flex items-center gap-2 cursor-pointer group transition-transform active:scale-95 overflow-hidden"
            title="Ir para o Ponto de Venda"
          >
            <div className="bg-gradient-to-br from-orange-400 to-red-500 p-1.5 rounded-lg shadow-lg shadow-orange-500/20 shrink-0">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span className="font-black italic text-lg md:text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 truncate">
              BancaFlash
            </span>
          </div>

          <button 
            onClick={() => setMenuMobileAberto(false)}
            className="md:hidden text-gray-500 hover:text-white transition-colors shrink-0 p-1"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
          
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-3">Visão Geral</p>
            <div className="space-y-1">
              {menuPrincipal.map(item => {
                const Icone = item.icone;
                const isActive = telaAtiva === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => { setTelaAtiva(item.id); setMenuMobileAberto(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 group
                      ${isActive 
                        ? 'bg-blue-600/10 text-blue-500' 
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
                    `}
                  >
                    <Icone size={20} className={isActive ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-300'} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{item.nome}</span>
                    
                    {isActive && <div className="ml-auto w-1 h-5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-3">Estoque</p>
            <div className="space-y-1">
              <button
                onClick={() => { setModalLocalizadorAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all active:scale-95 group"
              >
                <Search size={20} className="text-gray-500 group-hover:text-gray-300" strokeWidth={2} />
                <span className="text-sm">Localizador</span>
              </button>
              
              <button
                onClick={() => { setModalReposicaoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all active:scale-95"
              >
                <PackagePlus size={20} className="text-emerald-500" strokeWidth={2.5} />
                <span className="text-sm">Entrada de Mercadoria</span>
              </button>
              
              {/* ✨ BOTÃO CORRIGIDO AQUI ✨ */}
              <button
                onClick={() => { setTelaAtiva('reposicao'); setMenuMobileAberto(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95 group
                  ${telaAtiva === 'reposicao' 
                    ? 'bg-blue-600/10 text-blue-500' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
                `}
              >
                <RefreshCw size={20} className={telaAtiva === 'reposicao' ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-300'} strokeWidth={telaAtiva === 'reposicao' ? 2.5 : 2} />
                <span className="text-sm">Reposição</span>
                {telaAtiva === 'reposicao' && <div className="ml-auto w-1 h-5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>}
              </button>

              <button
                onClick={() => { setModalAdminAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all active:scale-95 group"
              >
                <Settings size={20} className="text-gray-500 group-hover:text-gray-300" strokeWidth={2} />
                <span className="text-sm">Gerenciar Produtos</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-3">Fechamento</p>
            <div className="space-y-1">
              <button
                onClick={() => { setModalResumoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all active:scale-95 group"
              >
                <Calculator size={20} className="text-gray-500 group-hover:text-gray-300" strokeWidth={2} />
                <span className="text-sm">Fechar Caixa</span>
              </button>
              
              <button
                onClick={() => { setModalConciliacaoAberto(true); setMenuMobileAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 transition-all active:scale-95 group border border-transparent hover:border-amber-500/20"
              >
                <ClipboardCheck size={20} className="text-amber-600 group-hover:text-amber-500" strokeWidth={2} />
                <span className="text-sm">Bater Estoque</span>
              </button>
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-gray-800/50 bg-[#070A11] flex items-center justify-center">
          <div className="flex items-center gap-2 opacity-50">
            <Zap size={12} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">BancaFlash v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}