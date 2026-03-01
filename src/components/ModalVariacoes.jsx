import React, { useState } from 'react';

export default function ModalVariacoes({ produtoAberto, setProdutoAberto, produtos, carrinho, adicionarAoCarrinho, alterarQuantidadeCarrinho }) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);

  if (!produtoAberto) return null;

  const fecharModal = () => {
    setProdutoAberto(null);
    setTamanhoSelecionado(null); 
  };

  const variacoesProduto = produtos.filter(p => p.nome === produtoAberto);
  const tamanhosUnicos = [...new Set(variacoesProduto.map(p => p.tam))];
  const variacoesDoTamanho = variacoesProduto.filter(p => p.tam === tamanhoSelecionado);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={fecharModal}>
      {/* TIREI A TRAVA AQUI: w-full e arredondamento mais suave */}
      <div className="bg-gray-50 w-full h-[85vh] rounded-t-3xl p-5 flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-5 border-b border-gray-200 pb-3">
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{produtoAberto}</h2>
          <button onClick={fecharModal} className="text-gray-400 bg-gray-200 hover:bg-red-100 hover:text-red-500 w-8 h-8 rounded-full font-bold text-xl flex justify-center items-center pb-1 transition-colors">x</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20 pr-2">
          
          {/* PASSO 1: ESCOLHER TAMANHO */}
          {!tamanhoSelecionado && (
            <div>
              <p className="text-gray-400 font-bold mb-4 text-center uppercase tracking-widest text-xs">1. Escolha o Tamanho</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tamanhosUnicos.map(tam => (
                  <button 
                    key={tam} 
                    onClick={() => setTamanhoSelecionado(tam)}
                    className="bg-white border border-gray-200 hover:border-blue-400 text-blue-700 py-8 rounded-2xl font-black text-3xl shadow-sm hover:shadow-md active:bg-blue-50 transition-all"
                  >
                    {tam}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 2: ESCOLHER COR COM BOTÕES + E - */}
          {tamanhoSelecionado && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-4 bg-white border border-blue-100 p-3 rounded-xl shadow-sm">
                <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Cores Tam. <span className="text-blue-600 text-xl font-black ml-1">{tamanhoSelecionado}</span></p>
                <button onClick={() => setTamanhoSelecionado(null)} className="text-xs bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors">⬅ Voltar</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {variacoesDoTamanho.map(p => {
                  const noCarrinho = carrinho.find(item => item.produto.id === p.id)?.qtd || 0;
                  const estoqueTotal = (p.estoque_banca || 0) + (p.estoque_saco || 0);
                  const disponivel = estoqueTotal - noCarrinho;

                  return (
                    <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-200 transition-colors">
                      <div className="flex-1">
                        <p className="font-black text-lg text-gray-800">{p.cor}</p>
                        <p className="text-xs text-gray-400 mt-1 font-bold">
                          ESTOQUE: <span className={disponivel <= (p.meta_banca || 2) ? "text-red-500" : "text-green-500"}>{disponivel} un.</span> 
                        </p>
                      </div>
                      
                      {noCarrinho > 0 ? (
                        <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl p-1.5 shadow-inner">
                          <button onClick={() => alterarQuantidadeCarrinho(p.id, -1)} className="bg-white w-10 h-10 rounded-lg text-2xl font-black text-blue-600 shadow-sm active:scale-95 transition-transform">-</button>
                          <span className="font-black text-xl w-6 text-center text-blue-800">{noCarrinho}</span>
                          <button onClick={() => alterarQuantidadeCarrinho(p.id, 1)} className="bg-white w-10 h-10 rounded-lg text-2xl font-black text-blue-600 shadow-sm active:scale-95 transition-transform">+</button>
                        </div>
                      ) : disponivel > 0 ? (
                        <button onClick={() => adicionarAoCarrinho(p)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black active:scale-95 transition-all shadow-md">
                          ADD +
                        </button>
                      ) : (
                        <span className="text-red-500 font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-sm tracking-wider">ESGOTADO</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}