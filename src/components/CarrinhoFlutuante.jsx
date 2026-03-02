import React, { useState, useEffect } from 'react';

export default function CarrinhoFlutuante({ carrinho, modalCarrinhoAberto, setModalCarrinhoAberto, alterarQuantidadeCarrinho, finalizarVenda }) {
  // 💵 DINHEIRO AGORA É O PADRÃO!
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO'); 

  // Toda vez que o carrinho abrir, garante que o pagamento reseta pra Dinheiro
  useEffect(() => {
    if (modalCarrinhoAberto) setFormaPagamento('DINHEIRO');
  }, [modalCarrinhoAberto]);

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.produto.preco * item.qtd), 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);

  if (carrinho.length === 0 && !modalCarrinhoAberto) return null;

  return (
    <>
      {/* Botão Flutuante (Fechado) */}
      {!modalCarrinhoAberto && carrinho.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-0 flex justify-center z-30 animate-slide-up">
          <button 
            onClick={() => setModalCarrinhoAberto(true)}
            className="w-full md:w-auto bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between gap-6 hover:bg-black transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <span className="font-bold text-sm uppercase tracking-wider">{totalItens} itens no carrinho</span>
            </div>
            <span className="font-black text-xl text-green-400">R$ {totalCarrinho.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Modal do Carrinho Aberto */}
      {modalCarrinhoAberto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-end" onClick={() => setModalCarrinhoAberto(false)}>
          <div className="bg-gray-50 w-full md:w-96 h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
            
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-md z-10">
              <h2 className="text-xl font-black italic">🛒 Finalizar Venda</h2>
              <button onClick={() => setModalCarrinhoAberto(false)} className="text-gray-400 hover:text-white font-bold text-xl active:scale-95">X</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {carrinho.length === 0 ? (
                <div className="text-center text-gray-400 font-bold mt-10">O carrinho está vazio.</div>
              ) : (
                carrinho.map((item) => {
                  const isGenerico = String(item.produto.id).startsWith('GEN-');
                  
                  return (
                    <div key={item.produto.id} className={`p-3 rounded-2xl border flex justify-between items-center shadow-sm ${isGenerico ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                      <div className="flex-1 pr-2">
                        <p className="font-black text-gray-800 text-sm leading-tight">{item.produto.nome}</p>
                        
                        {isGenerico ? (
                          <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded uppercase mt-1 inline-block">⚡ PENDENTE</span>
                        ) : (
                          <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">Tam: <span className="text-blue-600">{item.produto.tam}</span> | {item.produto.cor}</p>
                        )}
                        
                        <p className="font-black text-gray-900 text-sm mt-1">R$ {item.produto.preco.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1 rounded-xl">
                        <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, -1)} className="bg-white w-8 h-8 rounded-lg font-black text-gray-600 shadow-sm active:scale-95">-</button>
                        <span className="font-black w-6 text-center text-blue-600 text-sm">{item.qtd}</span>
                        <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, 1)} className="bg-white w-8 h-8 rounded-lg font-black text-gray-600 shadow-sm active:scale-95">+</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-5 bg-white border-t border-gray-200 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total a cobrar</span>
                <span className="text-3xl font-black text-gray-900">R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {['DINHEIRO', 'PIX', 'CARTÃO'].map(metodo => (
                  <button 
                    key={metodo}
                    onClick={() => setFormaPagamento(metodo)}
                    className={`py-3 rounded-xl font-black text-xs transition-all active:scale-95 uppercase border-2
                      ${formaPagamento === metodo 
                        ? (metodo === 'PIX' ? 'bg-teal-100 text-teal-700 border-teal-500' : metodo === 'DINHEIRO' ? 'bg-green-100 text-green-700 border-green-500' : 'bg-blue-100 text-blue-700 border-blue-500') 
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>

              <button 
                disabled={carrinho.length === 0}
                onClick={() => finalizarVenda(carrinho.map(item => ({ ...item.produto, quantidade: item.qtd, precoVendido: item.produto.preco, produtoCompleto: item.produto })), formaPagamento)}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-black text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest flex justify-center gap-2 items-center"
              >
                <span>✔️</span> CONFIRMAR PAGAMENTO
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}