import React, { useState, useEffect } from 'react';

export default function CarrinhoFlutuante({ carrinho, modalCarrinhoAberto, setModalCarrinhoAberto, alterarQuantidadeCarrinho, finalizarVenda }) {
  const [tipoVenda, setTipoVenda] = useState('VAREJO'); 
  const [precosCustomizados, setPrecosCustomizados] = useState({}); 

  // Quando o modal abrir, reseta os preços customizados
  useEffect(() => {
    if (modalCarrinhoAberto) {
      setPrecosCustomizados({});
    }
  }, [modalCarrinhoAberto]);

  if (carrinho.length === 0) return null;

  // AGRUPA OS ITENS PELO NOME DO PRODUTO PAI
  const carrinhoAgrupado = carrinho.reduce((acc, item) => {
    const nome = item.produto.nome;
    if (!acc[nome]) acc[nome] = [];
    acc[nome].push(item);
    return acc;
  }, {});

  const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);

  // CALCULA O VALOR FINAL JÁ CONSIDERANDO OS PREÇOS EDITADOS
  const totalFinal = Object.entries(carrinhoAgrupado).reduce((accGeral, [nomeProduto, itens]) => {
    const precoBase = tipoVenda === 'ATACADO' ? (itens[0].produto.preco_atacado || itens[0].produto.preco) : itens[0].produto.preco;
    
    let precoAtual = precoBase;
    if (precosCustomizados[nomeProduto] !== undefined && precosCustomizados[nomeProduto] !== '') {
      precoAtual = parseFloat(precosCustomizados[nomeProduto]) || 0;
    }

    const totalDoGrupo = itens.reduce((accItem, item) => accItem + (precoAtual * item.qtd), 0);
    return accGeral + totalDoGrupo;
  }, 0);

  // PREPARA O RECIBO DA VENDA
  const processarCheckout = () => {
    const itensParaVenda = [];
    
    Object.entries(carrinhoAgrupado).forEach(([nomeProduto, itens]) => {
      const precoBase = tipoVenda === 'ATACADO' ? (itens[0].produto.preco_atacado || itens[0].produto.preco) : itens[0].produto.preco;
      let precoAtual = precoBase;
      if (precosCustomizados[nomeProduto] !== undefined && precosCustomizados[nomeProduto] !== '') {
        precoAtual = parseFloat(precosCustomizados[nomeProduto]) || 0;
      }

      itens.forEach(item => {
        itensParaVenda.push({
          id: item.produto.id,
          nome: item.produto.nome,
          cor: item.produto.cor,
          tam: item.produto.tam,
          quantidade: item.qtd,
          estoqueAtual: item.produto.estoque,
          precoVendido: precoAtual
        });
      });
    });

    finalizarVenda(itensParaVenda);
  };

  return (
    <>
      {modalCarrinhoAberto && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 flex items-end" 
          onClick={() => setModalCarrinhoAberto(false)}
        >
          <div 
            className="bg-gray-100 w-full rounded-t-3xl p-5 shadow-2xl flex flex-col max-h-[95vh]" 
            onClick={e => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-2xl font-black text-gray-800">Sacola ({totalItens} un.)</h2>
              <button onClick={() => setModalCarrinhoAberto(false)} className="text-gray-400 bg-gray-200 w-8 h-8 rounded-full font-bold text-xl flex justify-center items-center pb-1">x</button>
            </div>
            
            <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border">
              <button onClick={() => setTipoVenda('VAREJO')} className={`flex-1 py-3 font-bold rounded-lg text-sm ${tipoVenda === 'VAREJO' ? 'bg-blue-600 text-white shadow' : 'text-gray-500'}`}>Varejo</button>
              <button onClick={() => setTipoVenda('ATACADO')} className={`flex-1 py-3 font-bold rounded-lg text-sm ${tipoVenda === 'ATACADO' ? 'bg-purple-600 text-white shadow' : 'text-gray-500'}`}>Atacado</button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {Object.entries(carrinhoAgrupado).map(([nomeProduto, itens]) => {
                const qtdGrupo = itens.reduce((acc, item) => acc + item.qtd, 0);
                const precoBaseGrupo = tipoVenda === 'ATACADO' ? (itens[0].produto.preco_atacado || itens[0].produto.preco) : itens[0].produto.preco;
                
                const valorInput = precosCustomizados[nomeProduto] !== undefined ? precosCustomizados[nomeProduto] : precoBaseGrupo;

                return (
                  <div key={nomeProduto} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    
                    <div className="flex justify-between items-center border-b pb-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-black text-gray-800 uppercase text-lg leading-tight">{nomeProduto}</h3>
                        <p className="text-sm font-bold text-blue-600 mt-1">{qtdGrupo} un. no total</p>
                      </div>
                      
                      <div className="flex flex-col items-end pl-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Preço Un. (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-20 border-2 border-blue-200 rounded-lg p-1 text-center font-black text-gray-800 bg-blue-50 focus:bg-white focus:border-blue-500 outline-none transition-colors"
                          value={valorInput}
                          onChange={(e) => setPrecosCustomizados({...precosCustomizados, [nomeProduto]: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {itens.map(item => (
                        <div key={item.produto.id} className="flex justify-between items-center py-2">
                          <div>
                            <p className="font-bold text-gray-700">{item.produto.cor}</p>
                            <p className="text-xs text-gray-500">Tam: {item.produto.tam}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-gray-50 border rounded-lg p-1">
                            <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, -1)} className="bg-white w-8 h-8 rounded text-lg font-bold text-gray-700 shadow-sm active:scale-95">-</button>
                            <span className="font-black text-md w-4 text-center">{item.qtd}</span>
                            <button onClick={() => alterarQuantidadeCarrinho(item.produto.id, 1)} className="bg-white w-8 h-8 rounded text-lg font-bold text-gray-700 shadow-sm active:scale-95">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <button 
              onClick={processarCheckout} 
              className="w-full bg-green-500 text-white text-xl py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform"
            >
              💸 FECHAR: R$ {totalFinal.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {!modalCarrinhoAberto && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30">
          <button 
            onClick={() => setModalCarrinhoAberto(true)} 
            className="w-full bg-gray-900 text-white py-4 rounded-2xl shadow-2xl font-bold flex justify-between px-6 items-center border-t-4 border-blue-500 active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-inner">{totalItens}</span>
              Ver Sacola
            </span>
            <span className="text-lg tracking-wide">R$ {totalFinal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </>
  );
}