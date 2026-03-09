import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronRight, PackageSearch, MapPin, Store, ArrowRightLeft, Send, ArchiveRestore } from 'lucide-react';

export default function LocalizadorEstoque({ aberto, fechar, produtos, transferirParaBanca }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});
  const [carrinhoTransferencia, setCarrinhoTransferencia] = useState({});
  
  // ✨ NOVA FUNCIONALIDADE: Direção da Transferência
  const [direcao, setDirecao] = useState('SACO_PARA_BANCA'); // ou 'BANCA_PARA_SACO'

  if (!aberto) return null;

  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.cor.toLowerCase().includes(busca.toLowerCase()) ||
    p.tam.toLowerCase().includes(busca.toLowerCase()) ||
    (p.saco && p.saco.toLowerCase().includes(busca.toLowerCase()))
  );
  
  const produtosAgrupados = produtosFiltrados.reduce((acc, p) => {
    if (!acc[p.nome]) acc[p.nome] = [];
    acc[p.nome].push(p);
    return acc;
  }, {});

  const toggleSanfona = (nomeProduto) => {
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

  const alterarQtdTransferencia = (id, delta, maxDisponivel) => {
    setCarrinhoTransferencia(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;
      if (novaQtd < 0) return prev; 
      if (novaQtd > maxDisponivel) return prev; 
      
      const novoCart = { ...prev };
      if (novaQtd === 0) delete novoCart[id];
      else novoCart[id] = novaQtd;
      
      return novoCart;
    });
  };

  const trocarDirecao = (novaDirecao) => {
    setDirecao(novaDirecao);
    setCarrinhoTransferencia({}); // Zera o carrinho ao inverter a direção pra não dar bug matemático
  };

  const confirmarTransferencia = () => {
    // Agora passamos a direção pro App.jsx saber o que somar e o que subtrair
    transferirParaBanca(carrinhoTransferencia, direcao);
    setCarrinhoTransferencia({});
    fechar();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={fechar}>
      <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
        
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Search className="text-blue-500" size={24} /> Movimentar Estoque
          </h2>
          <button onClick={fechar} className="text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* ✨ ABAS DE DIREÇÃO DA TRANSFERÊNCIA ✨ */}
        <div className="bg-white pt-4 px-4 shrink-0 border-b border-slate-200">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4">
            <button onClick={() => trocarDirecao('SACO_PARA_BANCA')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${direcao === 'SACO_PARA_BANCA' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
              <ArrowRightLeft size={16} /> Repor na Banca
            </button>
            <button onClick={() => trocarDirecao('BANCA_PARA_SACO')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${direcao === 'BANCA_PARA_SACO' ? 'bg-white text-purple-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
              <ArchiveRestore size={16} /> Guardar no Saco
            </button>
          </div>

          <div className="relative group pb-4">
            <div className="absolute inset-y-0 left-0 pl-4 pb-4 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Digite modelo, cor, tamanho ou nº do saco..." 
              className="w-full pl-11 pr-4 py-3 md:py-4 rounded-xl shadow-sm border border-slate-200 text-base font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28 custom-scrollbar">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <div className="text-center mt-12 bg-white p-12 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center mx-4">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <PackageSearch size={48} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-slate-600 font-black text-lg">Nenhum produto encontrado.</p>
            </div>
          ) : (
            Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => {
              const estaExpandido = expandidos[nomeProduto];
              const itensOrdenados = [...itens].sort((a, b) => {
                let idxA = ordemTamanhos.indexOf(a.tam.toUpperCase());
                let idxB = ordemTamanhos.indexOf(b.tam.toUpperCase());
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                if (idxA !== idxB) return idxA - idxB;
                return a.cor.localeCompare(b.cor);
              });

              return (
                <div key={nomeProduto} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300">
                  <div onClick={() => toggleSanfona(nomeProduto)} className="bg-slate-50 hover:bg-blue-50/50 p-4 flex justify-between items-center cursor-pointer select-none transition-colors border-b border-transparent">
                    <div className="flex items-center gap-2 group">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                        {estaExpandido ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                      </div>
                      <h3 className="font-black text-slate-800 uppercase text-sm md:text-base tracking-tight">{nomeProduto}</h3>
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="p-3 md:p-4 space-y-3 bg-white animate-fade-in border-t border-slate-100">
                      {itensOrdenados.map(p => {
                        const qtdPuxando = carrinhoTransferencia[p.id] || 0;
                        const estoqueSacoReal = p.estoque_saco || 0;
                        const estoqueBancaReal = p.estoque_banca || 0;
                        
                        // Lógica de limite dependendo da direção
                        const isSacoParaBanca = direcao === 'SACO_PARA_BANCA';
                        const maxDisponivel = isSacoParaBanca ? estoqueSacoReal : estoqueBancaReal;

                        return (
                          <div key={p.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 md:p-4 rounded-xl border transition-all gap-3 ${qtdPuxando > 0 ? (isSacoParaBanca ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-purple-50 border-purple-200 shadow-sm') : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                            <div className="flex-1 w-full">
                              <p className="font-bold text-slate-800 text-sm md:text-base mb-2">Tam: <span className="text-blue-600 font-black">{p.tam}</span> <span className="text-slate-300 font-normal mx-1">|</span> {p.cor}</p>
                              
                              <div className="flex flex-wrap gap-2 text-[10px] md:text-xs">
                                <span className="bg-purple-50 text-purple-700 px-2 py-1.5 rounded-lg font-bold border border-purple-100 flex items-center gap-1">
                                  <MapPin size={12} className="text-purple-500" /> Saco {p.saco || '?'}
                                </span>
                                <span className={`px-2 py-1.5 rounded-lg font-bold flex items-center gap-1 border ${isSacoParaBanca && qtdPuxando > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                  <PackageSearch size={12} className="text-slate-500" /> No Saco: <span className={estoqueSacoReal > 0 ? 'text-slate-900' : 'text-red-500'}>{estoqueSacoReal} un.</span>
                                </span>
                                <span className={`px-2 py-1.5 rounded-lg font-bold flex items-center gap-1 border ${!isSacoParaBanca && qtdPuxando > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                  <Store size={12} className="text-emerald-500" /> Na Banca: {estoqueBancaReal} un.
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                              <span className={`text-[9px] font-black uppercase mb-0 sm:mb-1.5 flex items-center gap-1 ${isSacoParaBanca ? 'text-blue-600' : 'text-purple-600'}`}>
                                {isSacoParaBanca ? 'Qtd P/ Banca' : 'Qtd P/ Saco'}
                              </span>
                              <div className={`flex items-center gap-1 md:gap-2 border-2 rounded-xl p-1 ${maxDisponivel > 0 ? 'bg-white shadow-sm ' + (isSacoParaBanca ? 'border-blue-100' : 'border-purple-100') : 'bg-slate-100 border-slate-200 opacity-50'}`}>
                                <button onClick={() => alterarQtdTransferencia(p.id, -1, maxDisponivel)} disabled={maxDisponivel <= 0} className={`bg-slate-50 hover:bg-slate-100 w-8 h-8 md:w-9 md:h-9 rounded-lg text-lg font-black active:scale-95 flex items-center justify-center disabled:cursor-not-allowed transition-colors ${isSacoParaBanca ? 'text-blue-700' : 'text-purple-700'}`}>-</button>
                                <span className={`font-black text-base w-8 text-center ${qtdPuxando > 0 ? (isSacoParaBanca ? 'text-blue-700' : 'text-purple-700') : 'text-slate-400'}`}>{qtdPuxando}</span>
                                <button onClick={() => alterarQtdTransferencia(p.id, 1, maxDisponivel)} disabled={maxDisponivel <= 0 || qtdPuxando >= maxDisponivel} className={`bg-slate-50 hover:bg-slate-100 w-8 h-8 md:w-9 md:h-9 rounded-lg text-lg font-black active:scale-95 flex items-center justify-center disabled:cursor-not-allowed transition-colors ${isSacoParaBanca ? 'text-blue-700' : 'text-purple-700'}`}>+</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {Object.keys(carrinhoTransferencia).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-20 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] animate-slide-up">
            <button onClick={confirmarTransferencia} className={`w-full text-white text-sm md:text-base py-4 rounded-xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center transition-all tracking-widest uppercase ${direcao === 'SACO_PARA_BANCA' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30'}`}>
              {direcao === 'SACO_PARA_BANCA' ? <Send size={20} /> : <ArchiveRestore size={20} />}
              {direcao === 'SACO_PARA_BANCA' ? 'CONFIRMAR IDA PARA BANCA' : 'CONFIRMAR VOLTA PARA SACO'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}