import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ModalVariacoes({ produtoAberto, setProdutoAberto, produtos, carrinho, adicionarAoCarrinho, alterarQuantidadeCarrinho }) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);

  useEffect(() => {
    setTamanhoSelecionado(null);
  }, [produtoAberto]);

  if (!produtoAberto) return null;

  const variacoes = produtos.filter(p => p.nome === produtoAberto);
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  // 🧠 A VACINA DA ORDENAÇÃO AQUI (COM O .TRIM())
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setProdutoAberto(null)}>
      <div className="bg-gray-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="bg-white p-5 flex justify-between items-center shadow-sm z-10 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{produtoAberto}</h2>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Selecione o tamanho</p>
          </div>
          <button onClick={() => setProdutoAberto(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-95 transition-colors">X</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-8">
          
          <div className="mb-6 flex flex-col items-center">
            <button 
              onClick={adicionarVendaRapida}
              className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide border border-amber-300 text-sm"
            >
              <span className="text-lg">⚡</span> + 1 Venda Rápida (S/ Cor)
            </button>
            <p className="text-center text-[9px] text-gray-400 font-bold mt-1.5 uppercase tracking-widest">Clique várias vezes para mais itens</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {tamanhosDisponiveis.map(tam => (
              <button 
                key={tam} 
                onClick={() => setTamanhoSelecionado(tam)}
                className={`w-14 h-14 rounded-2xl font-black text-lg transition-all border-2 active:scale-95 shadow-sm
                  ${tamanhoSelecionado === tam 
                    ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-blue-500/30' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
              >
                {tam}
              </button>
            ))}
          </div>

          {tamanhoSelecionado && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 text-center border-b border-gray-200 pb-2">
                Cores do Tamanho {tamanhoSelecionado}
              </h3>
              
              {variacoesDoTamanho.map(v => {
                const qtdNoCarrinho = carrinho.find(item => item.produto.id === v.id)?.qtd || 0;
                const estoqueTotal = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                const esgotado = estoqueTotal <= 0;

                return (
                  <div key={v.id} className={`flex justify-between items-center p-3 rounded-2xl border-2 transition-all ${esgotado ? 'bg-gray-100 border-gray-200 opacity-60 grayscale' : 'bg-white border-transparent shadow-sm hover:border-blue-200 hover:shadow-md'}`}>
                    <div>
                      <p className="font-black text-gray-800 text-sm md:text-base">{v.cor}</p>
                      <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        Estoque: {estoqueTotal} un.
                      </p>
                    </div>

                    {esgotado ? (
                      <span className="text-[10px] font-black bg-red-100 text-red-600 px-3 py-1.5 rounded-lg uppercase tracking-wider">Esgotado</span>
                    ) : qtdNoCarrinho === 0 ? (
                      <button onClick={() => adicionarAoCarrinho(v)} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all shadow-sm">+ ADD</button>
                    ) : (
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => alterarQuantidadeCarrinho(v.id, -1)} className="bg-white w-8 h-8 rounded-lg font-black text-gray-600 shadow-sm active:scale-95">-</button>
                        <span className="font-black w-6 text-center text-blue-600 text-sm">{qtdNoCarrinho}</span>
                        <button onClick={() => alterarQuantidadeCarrinho(v.id, 1)} className="bg-white w-8 h-8 rounded-lg font-black text-gray-600 shadow-sm active:scale-95">+</button>
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