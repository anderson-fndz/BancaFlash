import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Zap, ChevronRight, Lock, Unlock, AlertTriangle, Package } from 'lucide-react';

export default function ModalVariacoes({ produtoAberto, setProdutoAberto, produtos, carrinho, adicionarAoCarrinho, alterarQuantidadeCarrinho }) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);
  const [modoAtacado, setModoAtacado] = useState(false); 

  useEffect(() => {
    setTamanhoSelecionado(null);
    setModoAtacado(false); 
  }, [produtoAberto]);

  if (!produtoAberto) return null;

  const variacoes = produtos.filter(p => p.nome === produtoAberto);
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  const tamanhosDisponiveis = [...new Set(variacoes.map(v => v.tam))].sort((a, b) => {
    let idxA = ordemTamanhos.indexOf(String(a || '').trim().toUpperCase());
    let idxB = ordemTamanhos.indexOf(String(b || '').trim().toUpperCase());
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  const variacoesDoTamanho = tamanhoSelecionado 
    ? variacoes.filter(v => v.tam === tamanhoSelecionado).sort((a, b) => String(a.cor || '').localeCompare(String(b.cor || '')))
    : [];

  const adicionarVendaRapida = () => {
    const precoBase = variacoes.length > 0 ? variacoes[0].preco : 0;
    const produtoGenerico = {
      id: `GEN-${produtoAberto}`, 
      nome: produtoAberto,
      cor: 'PENDENTE',
      tam: 'PENDENTE',
      preco: precoBase,
      estoque_banca: 999, 
      estoque_saco: 0
    };
    adicionarAoCarrinho(produtoGenerico);
    toast.success(`1x ${produtoAberto} (Rápido) adicionado!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setProdutoAberto(null)}>
      <div className="bg-slate-50 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border-t sm:border border-slate-200/50 relative" onClick={e => e.stopPropagation()}>
        
        {/* ✨ HEADER COM O NOVO BOTÃO ÍNDIGO PROFUNDO ✨ */}
        <div className="bg-white p-5 flex flex-col z-10 border-b border-slate-100">
          <div className="flex justify-between items-start w-full">
            <div className="pr-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{produtoAberto}</h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                <ChevronRight size={12} className={`transition-colors ${modoAtacado ? 'text-indigo-500' : 'text-blue-500'}`} /> Selecione o tamanho
              </p>
            </div>
            <button onClick={() => setProdutoAberto(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-95 transition-colors shrink-0">
              <X size={16} strokeWidth={3} />
            </button>
          </div>
          
          <div className="mt-4 flex">
            <button 
              onClick={() => setModoAtacado(!modoAtacado)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border
                ${modoAtacado 
                  ? 'bg-indigo-900 text-indigo-50 border-indigo-800 shadow-md shadow-indigo-900/20' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
            >
              {modoAtacado ? (
                <><Unlock size={14} className="text-indigo-400"/> Atacado Liberado (Banca + Saco)</>
              ) : (
                <><Lock size={14} /> Modo Varejo (Trava na Banca)</>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-8">
          
          <div className="mb-6 flex flex-col items-center">
            <button 
              onClick={adicionarVendaRapida}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide border border-slate-700 text-xs md:text-sm group"
            >
              <Zap size={18} className="text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" /> 
              <span>Venda Rápida (S/ Cor)</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center mb-6">
            {tamanhosDisponiveis.map(tam => (
              <button 
                key={tam} 
                onClick={() => setTamanhoSelecionado(tam)}
                className={`min-w-[56px] h-14 px-2 rounded-2xl font-black text-lg transition-all border-2 active:scale-95 shadow-sm
                  ${tamanhoSelecionado === tam 
                    ? (modoAtacado ? 'bg-indigo-700 text-white border-indigo-700 scale-[1.02] shadow-indigo-900/30 ring-4 ring-indigo-900/10' : 'bg-blue-600 text-white border-blue-600 scale-[1.02] shadow-blue-500/30 ring-4 ring-blue-600/10') 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {tam}
              </button>
            ))}
          </div>

          {tamanhoSelecionado && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-2">
                  Cores Tam. {tamanhoSelecionado}
                </h3>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              
              {variacoesDoTamanho.map(v => {
                const qtdNoCarrinho = carrinho.find(item => item.produto.id === v.id)?.qtd || 0;
                
                const banca = v.estoque_banca || 0;
                const saco = v.estoque_saco || 0;
                const total = banca + saco;
                
                const limiteDisponivel = modoAtacado ? total : banca;
                const esgotadoGeral = total <= 0;
                const bloqueadoPelaBanca = !modoAtacado && banca <= 0 && saco > 0;
                const atingiuLimite = qtdNoCarrinho >= limiteDisponivel;

                return (
                  <div key={v.id} className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all 
                    ${esgotadoGeral ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' 
                    : bloqueadoPelaBanca ? 'bg-red-50/40 border-red-200 hover:border-red-300' 
                    : `bg-white shadow-sm ${modoAtacado ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'}`}`}>
                    
                    <div>
                      <p className={`font-black text-sm md:text-base uppercase tracking-tight ${bloqueadoPelaBanca ? 'text-red-900' : 'text-slate-800'}`}>
                        <span className={`font-black transition-colors ${modoAtacado ? 'text-indigo-700' : 'text-blue-600'}`}>{v.tam}</span> <span className="text-slate-300 font-normal mx-1">|</span> {v.cor}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-colors ${bloqueadoPelaBanca ? 'bg-red-100 text-red-600 border-red-200' : (modoAtacado ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-blue-50 text-blue-600 border-blue-100')}`}>
                          Banca: {banca}
                        </span>
                        
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-colors ${bloqueadoPelaBanca ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                          Saco: {saco}
                        </span>
                      </div>

                      {bloqueadoPelaBanca && (
                        <p className="text-[10px] font-black text-red-600 mt-2.5 uppercase tracking-widest flex items-center gap-1.5 bg-red-100/70 inline-flex px-2 py-1 rounded-md border border-red-200/50">
                          <Package size={12} className="text-red-500" /> Pegar no saco! ({saco} Disp.)
                        </p>
                      )}
                    </div>

                    {esgotadoGeral ? (
                      <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">Esgotado</span>
                    ) : bloqueadoPelaBanca ? (
                      <span className="text-[9px] font-black bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg uppercase tracking-widest text-center leading-tight">Banca<br/>Zerada</span>
                    ) : qtdNoCarrinho === 0 ? (
                      <button 
                        onClick={() => adicionarAoCarrinho(v)} 
                        className={`px-5 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all flex items-center gap-1 uppercase tracking-widest ${modoAtacado ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}
                      >
                        Adicionar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl shadow-inner">
                        <button 
                          onClick={() => alterarQuantidadeCarrinho(v.id, -1)} 
                          className="bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-lg font-black text-white active:scale-95 transition-colors flex items-center justify-center"
                        >-</button>
                        <span className="font-black w-7 text-center text-white text-sm">{qtdNoCarrinho}</span>
                        <button 
                          onClick={() => !atingiuLimite && alterarQuantidadeCarrinho(v.id, 1)} 
                          className={`w-8 h-8 rounded-lg font-black flex items-center justify-center transition-colors 
                            ${atingiuLimite ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white active:scale-95'}`}
                        >+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}