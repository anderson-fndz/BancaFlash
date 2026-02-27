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
    <div className="fixed inset-0 bg-black/60 z-20 flex items-end" onClick={fecharModal}>
      <div className="bg-gray-50 w-full h-[80vh] rounded-t-3xl p-4 flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-black text-gray-800 uppercase">{produtoAberto}</h2>
          <button onClick={fecharModal} className="bg-red-100 text-red-600 w-10 h-10 rounded-full font-bold text-xl">X</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20">
          
          {/* PASSO 1: ESCOLHER TAMANHO */}
          {!tamanhoSelecionado && (
            <div>
              <p className="text-gray-500 font-bold mb-3 text-center">1. Escolha o Tamanho:</p>
              <div className="grid grid-cols-3 gap-3">
                {tamanhosUnicos.map(tam => (
                  <button 
                    key={tam} 
                    onClick={() => setTamanhoSelecionado(tam)}
                    className="bg-white border-2 border-blue-200 text-blue-700 py-6 rounded-2xl font-black text-2xl shadow-sm active:bg-blue-50"
                  >
                    {tam}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 2: ESCOLHER COR COM BOTÕES + E - */}
          {tamanhoSelecionado && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center mb-3 bg-blue-100 p-2 rounded-lg">
                <p className="text-blue-800 font-bold">Cores Tam. <span className="text-2xl">{tamanhoSelecionado}</span></p>
                <button onClick={() => setTamanhoSelecionado(null)} className="text-sm bg-white text-blue-600 px-3 py-2 rounded-lg font-bold shadow-sm">⬅ Outro Tamanho</button>
              </div>

              {variacoesDoTamanho.map(p => {
                // Checa quantas peças DESSA VARIAÇÃO exata já estão no carrinho
                const noCarrinho = carrinho.find(item => item.produto.id === p.id)?.qtd || 0;
                const disponivel = p.estoque - noCarrinho;

                return (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{p.cor}</p>
                      <p className="text-sm text-gray-500">
                        Disponível: <span className={disponivel <= p.meta ? "text-red-500 font-bold" : "text-green-500 font-bold"}>{disponivel}</span> 
                      </p>
                    </div>
                    
                    {/* LÓGICA DO BOTÃO iFOOD */}
                    {noCarrinho > 0 ? (
                      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-1 shadow-inner">
                        <button onClick={() => alterarQuantidadeCarrinho(p.id, -1)} className="bg-white w-10 h-10 rounded text-xl font-bold text-blue-600 shadow-sm active:scale-95">-</button>
                        <span className="font-black text-lg w-6 text-center text-blue-800">{noCarrinho}</span>
                        <button onClick={() => alterarQuantidadeCarrinho(p.id, 1)} className="bg-white w-10 h-10 rounded text-xl font-bold text-blue-600 shadow-sm active:scale-95">+</button>
                      </div>
                    ) : disponivel > 0 ? (
                      <button onClick={() => adicionarAoCarrinho(p)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold active:bg-blue-800 shadow-md">
                        + ADD
                      </button>
                    ) : (
                      <span className="text-red-500 font-bold bg-red-50 px-3 py-2 rounded-lg">ESGOTADO</span>
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