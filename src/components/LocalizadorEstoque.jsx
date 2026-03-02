import React, { useState } from 'react';

export default function LocalizadorEstoque({ aberto, fechar, produtos, transferirParaBanca }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});
  const [carrinhoTransferencia, setCarrinhoTransferencia] = useState({});

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

  const alterarQtdTransferencia = (id, delta, maxSaco) => {
    setCarrinhoTransferencia(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;
      if (novaQtd < 0) return prev; 
      if (novaQtd > maxSaco) return prev; 
      
      const novoCart = { ...prev };
      if (novaQtd === 0) delete novoCart[id];
      else novoCart[id] = novaQtd;
      
      return novoCart;
    });
  };

  const confirmarTransferencia = () => {
    transferirParaBanca(carrinhoTransferencia);
    setCarrinhoTransferencia({});
    fechar();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={fechar}>
      <div className="bg-gray-50 w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
        
        <div className="bg-blue-600 text-white p-5 flex justify-between items-center shadow-md z-10">
          <h2 className="text-xl font-black italic flex items-center gap-2">🔍 Localizador de Estoque</h2>
          <button onClick={fechar} className="bg-blue-700 hover:bg-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-blue-100 active:scale-95 transition-colors">X</button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-white">
          <input 
            type="text" 
            placeholder="Digite modelo, cor, tamanho ou nº do saco..." 
            className="w-full p-4 rounded-xl shadow-sm border-2 border-blue-200 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 bg-gray-50 focus:bg-white"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 pr-2 custom-scrollbar">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <div className="text-center mt-10">
              <span className="text-4xl">📭</span>
              <p className="text-gray-400 font-bold text-lg mt-2">Nenhum produto encontrado.</p>
            </div>
          ) : (
            Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => {
              const estaExpandido = expandidos[nomeProduto];
              
              // MÁGICA DA ORDENAÇÃO
              const itensOrdenados = [...itens].sort((a, b) => {
                let idxA = ordemTamanhos.indexOf(a.tam.toUpperCase());
                let idxB = ordemTamanhos.indexOf(b.tam.toUpperCase());
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                if (idxA !== idxB) return idxA - idxB;
                return a.cor.localeCompare(b.cor);
              });

              return (
                <div key={nomeProduto} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                  <div onClick={() => toggleSanfona(nomeProduto)} className="bg-gray-50 hover:bg-blue-50 p-4 flex justify-between items-center cursor-pointer select-none transition-colors border-b border-transparent">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold text-xs">{estaExpandido ? '▼' : '▶'}</span>
                      <h3 className="font-black text-gray-800 uppercase text-sm md:text-base tracking-tight">{nomeProduto}</h3>
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="p-3 space-y-2 bg-white animate-fade-in border-t border-gray-100">
                      {itensOrdenados.map(p => {
                        const qtdPuxando = carrinhoTransferencia[p.id] || 0;
                        const estoqueSacoReal = p.estoque_saco || 0;
                        const estoqueBancaReal = p.estoque_banca || 0;
                        const maxSacoDisponivel = estoqueSacoReal;

                        return (
                          <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                            <div className="flex-1">
                              {/* VISUAL INVERTIDO (Tamanho ➔ Cor) */}
                              <p className="font-bold text-gray-800 text-sm md:text-base">Tam: <span className="text-blue-600 font-black">{p.tam}</span> <span className="text-gray-300 font-normal mx-1">|</span> {p.cor}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs md:text-sm">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold border border-purple-200 shadow-sm">📍 Saco {p.saco || '?'}</span>
                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold flex items-center gap-1">📦 Saco: <span className={estoqueSacoReal > 0 ? 'text-gray-900' : 'text-red-500'}>{estoqueSacoReal} un.</span></span>
                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">🏪 Banca: {estoqueBancaReal} un.</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center ml-2">
                              <span className="text-[9px] font-black text-blue-600 uppercase mb-1">Puxar do Saco</span>
                              <div className={`flex items-center gap-1 md:gap-2 border rounded-lg p-1 shadow-inner ${estoqueSacoReal > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200 opacity-50'}`}>
                                <button onClick={() => alterarQtdTransferencia(p.id, -1, maxSacoDisponivel)} disabled={estoqueSacoReal <= 0} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-blue-700 shadow-sm active:scale-95 flex items-center justify-center disabled:cursor-not-allowed">-</button>
                                <span className={`font-black text-sm md:text-md w-6 text-center ${qtdPuxando > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{qtdPuxando}</span>
                                <button onClick={() => alterarQtdTransferencia(p.id, 1, maxSacoDisponivel)} disabled={estoqueSacoReal <= 0 || qtdPuxando >= maxSacoDisponivel} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-blue-700 shadow-sm active:scale-95 flex items-center justify-center disabled:cursor-not-allowed">+</button>
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
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] animate-slide-up">
            <button onClick={confirmarTransferencia} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-4 rounded-xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center transition-all">
              <span>✈️</span> TRANSFERIR PARA A BANCA AGORA
            </button>
          </div>
        )}

      </div>
    </div>
  );
}