import React, { useState, useEffect } from 'react';

export default function CarrinhoFlutuante({ carrinho, modalCarrinhoAberto, setModalCarrinhoAberto, alterarQuantidadeCarrinho, finalizarVenda }) {
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO'); 
  const [tipoVenda, setTipoVenda] = useState('VAREJO'); 

  // ✨ ESTADO DO PREÇO ESPECIAL POR PRODUTO
  const [precosCustomizados, setPrecosCustomizados] = useState({});
  const [precoGrupoAberto, setPrecoGrupoAberto] = useState(null);
  const [precoTemp, setPrecoTemp] = useState('');

  useEffect(() => {
    if (modalCarrinhoAberto) {
      setFormaPagamento('DINHEIRO');
      setTipoVenda('VAREJO'); 
      setPrecosCustomizados({});
      setPrecoGrupoAberto(null);
    }
  }, [modalCarrinhoAberto]);

  // ✨ RECALCULA O TOTAL RESPEITANDO O PREÇO ESPECIAL
  const totalCarrinho = carrinho.reduce((acc, item) => {
    const nome = item.produto.nome;
    let preco = tipoVenda === 'ATACADO' ? (item.produto.preco_atacado || item.produto.preco) : item.produto.preco;
    
    if (precosCustomizados[nome] !== undefined) {
      preco = precosCustomizados[nome];
    }
    
    return acc + (preco * item.qtd);
  }, 0);
  
  const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);

  if (carrinho.length === 0 && !modalCarrinhoAberto) return null;

  const carrinhoAgrupado = carrinho.reduce((acc, item) => {
    const nome = item.produto.nome;
    if (!acc[nome]) acc[nome] = [];
    acc[nome].push(item);
    return acc;
  }, {});

  const salvarPrecoCustomizado = (nomeProduto) => {
    if (precoTemp === '' || parseFloat(precoTemp) === 0) {
      const novos = { ...precosCustomizados };
      delete novos[nomeProduto];
      setPrecosCustomizados(novos);
    } else {
      setPrecosCustomizados({ ...precosCustomizados, [nomeProduto]: parseFloat(precoTemp) });
    }
    setPrecoGrupoAberto(null);
  };

  return (
    <>
      {!modalCarrinhoAberto && carrinho.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-0 flex justify-center z-30 animate-slide-up">
          <button 
            onClick={() => setModalCarrinhoAberto(true)}
            className="w-full md:w-auto bg-gray-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between gap-6 hover:bg-black transition-all active:scale-95 border border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
              <span className="font-bold text-sm uppercase tracking-wider">{totalItens} peças no carrinho</span>
            </div>
            <span className="font-black text-xl text-green-400">R$ {totalCarrinho.toFixed(2)}</span>
          </button>
        </div>
      )}

      {modalCarrinhoAberto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-end" onClick={() => setModalCarrinhoAberto(false)}>
          <div className="bg-gray-50 w-full md:w-96 h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
            
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
              <h2 className="text-xl font-black italic flex items-center gap-2">🛒 Finalizar Venda</h2>
              <button onClick={() => setModalCarrinhoAberto(false)} className="text-gray-400 hover:text-white font-bold text-xl active:scale-95 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">X</button>
            </div>

            <div className="flex p-3 bg-white border-b border-gray-200 shrink-0 gap-2">
              <button 
                onClick={() => setTipoVenda('VAREJO')}
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest border-2 ${tipoVenda === 'VAREJO' ? 'bg-blue-100 text-blue-700 border-blue-500 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
              >
                Varejo
              </button>
              <button 
                onClick={() => setTipoVenda('ATACADO')}
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all uppercase tracking-widest border-2 ${tipoVenda === 'ATACADO' ? 'bg-amber-100 text-amber-700 border-amber-500 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
              >
                Atacado
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {carrinho.length === 0 ? (
                <div className="text-center text-gray-400 font-bold mt-10">O carrinho está vazio.</div>
              ) : (
                Object.entries(carrinhoAgrupado).map(([nomeProduto, itens]) => {
                  const temPrecoCustom = precosCustomizados[nomeProduto] !== undefined;

                  return (
                    <div key={nomeProduto} className={`bg-white border-2 rounded-2xl overflow-hidden shadow-sm transition-colors ${temPrecoCustom ? 'border-amber-300' : 'border-gray-200'}`}>
                      
                      {/* CABEÇALHO DO PRODUTO + BOTÃO PREÇO ESPECIAL */}
                      <div className={`px-3 py-2 border-b flex justify-between items-center gap-2 ${temPrecoCustom ? 'bg-amber-50 border-amber-200' : 'bg-gray-100 border-gray-200'}`}>
                        <h3 className="font-black text-gray-800 text-sm uppercase tracking-tight truncate flex-1">{nomeProduto}</h3>
                        
                        {precoGrupoAberto === nomeProduto ? (
                          <div className="flex items-center gap-1 animate-fade-in bg-white p-1 rounded-lg border border-amber-300 shadow-sm">
                            <input 
                              type="number" autoFocus 
                              value={precoTemp} onChange={e => setPrecoTemp(e.target.value)} 
                              className="w-16 p-1 text-sm font-black rounded outline-none text-center text-amber-900" placeholder="R$"
                            />
                            <button onClick={() => salvarPrecoCustomizado(nomeProduto)} className="bg-green-500 hover:bg-green-600 text-white w-7 h-7 rounded font-black active:scale-95">✔️</button>
                            <button onClick={() => setPrecoGrupoAberto(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-7 h-7 rounded font-black active:scale-95">X</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setPrecoGrupoAberto(nomeProduto);
                              let precoPadrao = tipoVenda === 'ATACADO' ? (itens[0].produto.preco_atacado || itens[0].produto.preco) : itens[0].produto.preco;
                              setPrecoTemp(precosCustomizados[nomeProduto] || precoPadrao);
                            }} 
                            className={`text-[10px] font-black uppercase px-2 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 shrink-0 border ${temPrecoCustom ? 'bg-amber-400 text-amber-950 border-amber-500' : 'bg-white text-gray-500 border-gray-300 hover:border-amber-400 hover:text-amber-600'}`}
                          >
                            {temPrecoCustom ? `R$ ${precosCustomizados[nomeProduto].toFixed(2)}` : '💲 Preço Único'}
                          </button>
                        )}
                      </div>
                      
                      {/* VARIAÇÕES */}
                      <div className="divide-y divide-gray-50">
                        {itens.map((item) => {
                          const isGenerico = String(item.produto.id).startsWith('GEN-');
                          let precoDoItem = tipoVenda === 'ATACADO' ? (item.produto.preco_atacado || item.produto.preco) : item.produto.preco;
                          if (temPrecoCustom) precoDoItem = precosCustomizados[nomeProduto];
                          
                          return (
                            <div key={item.produto.id} className={`p-3 flex justify-between items-center transition-colors hover:bg-blue-50/30 ${isGenerico ? 'bg-amber-50/50' : ''}`}>
                              <div className="flex-1 pr-2">
                                {isGenerico ? (
                                  <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded uppercase flex items-center gap-1 w-max shadow-sm border border-amber-300">
                                    ⚡ VENDA RÁPIDA (S/ COR)
                                  </span>
                                ) : (
                                  <p className="text-xs font-bold text-gray-600 uppercase">
                                    Tam: <span className="text-blue-600 font-black">{item.produto.tam}</span> <span className="text-gray-300 mx-1">|</span> {item.produto.cor}
                                  </p>
                                )}
                                <p className={`font-black text-sm mt-1 ${temPrecoCustom ? 'text-amber-600' : 'text-gray-900'}`}>R$ {precoDoItem.toFixed(2)}</p>
                              </div>

                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-xl shadow-inner">
                                <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, -1)} className="bg-white w-7 h-7 rounded-lg font-black text-red-500 shadow-sm active:scale-95 border border-gray-100 hover:border-red-200">-</button>
                                <span className="font-black w-6 text-center text-blue-600 text-sm">{item.qtd}</span>
                                <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, 1)} className="bg-white w-7 h-7 rounded-lg font-black text-green-500 shadow-sm active:scale-95 border border-gray-100 hover:border-green-200">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-5 bg-white border-t border-gray-200 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] shrink-0">
              <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Total a cobrar</span>
                <span className="text-3xl font-black text-gray-900">R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {['DINHEIRO', 'PIX', 'CARTÃO'].map(metodo => (
                  <button 
                    key={metodo}
                    onClick={() => setFormaPagamento(metodo)}
                    className={`py-3 rounded-xl font-black text-xs transition-all active:scale-95 uppercase border-2 shadow-sm
                      ${formaPagamento === metodo 
                        ? (metodo === 'PIX' ? 'bg-teal-100 text-teal-800 border-teal-500 scale-105' : metodo === 'DINHEIRO' ? 'bg-green-100 text-green-800 border-green-500 scale-105' : 'bg-blue-100 text-blue-800 border-blue-500 scale-105') 
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>

              <button 
                disabled={carrinho.length === 0}
                onClick={() => {
                  const itensParaBanco = carrinho.map(item => {
                    const nome = item.produto.nome;
                    let preco = tipoVenda === 'ATACADO' ? (item.produto.preco_atacado || item.produto.preco) : item.produto.preco;
                    if (precosCustomizados[nome] !== undefined) preco = precosCustomizados[nome];
                    return { ...item.produto, quantidade: item.qtd, precoVendido: preco, produtoCompleto: item.produto };
                  });
                  finalizarVenda(itensParaBanco, formaPagamento);
                }}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-green-500/30 active:scale-95 transition-all uppercase tracking-widest flex justify-center gap-2 items-center"
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