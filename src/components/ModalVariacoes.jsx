import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Zap, ChevronRight, Check } from 'lucide-react'; // ✨ Adicionado lucide-react para ícones premium

export default function ModalVariacoes({ produtoAberto, setProdutoAberto, produtos, carrinho, adicionarAoCarrinho, alterarQuantidadeCarrinho }) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);

  useEffect(() => {
    setTamanhoSelecionado(null);
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
    toast.success(`1x ${produtoAberto} (Rápido) no carrinho!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setProdutoAberto(null)}>
      <div className="bg-slate-50 w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border-t sm:border border-slate-200/50 relative" onClick={e => e.stopPropagation()}>
        
        {/* ✨ HEADER PREMIUM ✨ */}
        <div className="bg-white p-5 flex justify-between items-start z-10 border-b border-slate-100">
          <div className="pr-4">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{produtoAberto}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
              <ChevronRight size={12} className="text-blue-500" /> Selecione o tamanho
            </p>
          </div>
          <button onClick={() => setProdutoAberto(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-95 transition-colors shrink-0">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-8">
          
          {/* ✨ BOTÃO DE VENDA RÁPIDA REESTILIZADO ✨ */}
          <div className="mb-6 flex flex-col items-center">
            <button 
              onClick={adicionarVendaRapida}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide border border-slate-700 text-xs md:text-sm group"
            >
              <Zap size={18} className="text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" /> 
              <span>Venda Rápida</span>
            </button>
          </div>

          {/* ✨ TECLAS DE TAMANHO ✨ */}
          <div className="flex flex-wrap gap-2.5 justify-center mb-6">
            {tamanhosDisponiveis.map(tam => (
              <button 
                key={tam} 
                onClick={() => setTamanhoSelecionado(tam)}
                className={`min-w-[56px] h-14 px-2 rounded-2xl font-black text-lg transition-all border-2 active:scale-95 shadow-sm
                  ${tamanhoSelecionado === tam 
                    ? 'bg-blue-600 text-white border-blue-600 scale-[1.02] shadow-blue-500/30 ring-4 ring-blue-600/10' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {tam}
              </button>
            ))}
          </div>

          {/* ✨ LISTA DE CORES ✨ */}
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
                const estoqueTotal = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                const esgotado = estoqueTotal <= 0;

                return (
                  <div key={v.id} className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${esgotado ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'}`}>
                    <div>
                      <p className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight">{v.cor}</p>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-1 uppercase tracking-wider">
                        <span className={`w-2 h-2 rounded-full ${esgotado ? 'bg-slate-300' : 'bg-emerald-500'} inline-block`}></span>
                        Estoque: <span className={esgotado ? 'text-slate-400' : 'text-slate-700 font-black'}>{estoqueTotal}</span> un.
                      </p>
                    </div>

                    {esgotado ? (
                      <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">Esgotado</span>
                    ) : qtdNoCarrinho === 0 ? (
                      <button onClick={() => adicionarAoCarrinho(v)} className="bg-slate-100 hover:bg-slate-200 text-blue-600 px-5 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all flex items-center gap-1 uppercase tracking-widest">
                        Adicionar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl shadow-inner">
                        <button onClick={() => alterarQuantidadeCarrinho(v.id, -1)} className="bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-lg font-black text-white active:scale-95 transition-colors flex items-center justify-center">-</button>
                        <span className="font-black w-7 text-center text-white text-sm">{qtdNoCarrinho}</span>
                        <button onClick={() => alterarQuantidadeCarrinho(v.id, 1)} className="bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-lg font-black text-white active:scale-95 transition-colors flex items-center justify-center">+</button>
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