import React, { useState } from 'react';

export default function LocalizadorEstoque({ aberto, fechar, produtos, transferirParaBanca }) {
  const [busca, setBusca] = useState('');
  
  // O carrinho temporário de transferência (Saco -> Banca)
  const [transferCart, setTransferCart] = useState({});

  if (!aberto) return null;

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.cor.toLowerCase().includes(busca.toLowerCase()) ||
    p.tam.toLowerCase().includes(busca.toLowerCase())
  );
  
  const produtosAgrupados = produtosFiltrados.reduce((acc, p) => {
    if (!acc[p.nome]) acc[p.nome] = [];
    acc[p.nome].push(p);
    return acc;
  }, {});

  // Função para controlar o + e - limitando ao que tem no saco
  const alterarQtdTransferencia = (id, delta, maxSaco) => {
    setTransferCart(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;

      if (novaQtd <= 0) {
        const novoCart = { ...prev };
        delete novoCart[id];
        return novoCart;
      }

      // Trava para não mover mais do que tem no estoque guardado
      if (novaQtd > maxSaco) return prev;

      return { ...prev, [id]: novaQtd };
    });
  };

  const confirmarTransferencias = async () => {
    await transferirParaBanca(transferCart);
    setTransferCart({});
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={fechar}>
      <div className="bg-gray-100 w-full h-[90vh] rounded-t-3xl p-5 shadow-2xl flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <span>🔍</span> Localizador
          </h2>
          <button onClick={fechar} className="bg-gray-300 w-8 h-8 rounded-full font-bold text-gray-600 active:scale-95">X</button>
        </div>

        <input 
          type="text" 
          placeholder="Digite o modelo, cor ou tamanho..." 
          className="w-full p-4 rounded-xl shadow-sm border-2 border-blue-200 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 mb-4"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          autoFocus
        />

        <div className="flex-1 overflow-y-auto space-y-4 pb-20">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <p className="text-center text-gray-400 mt-10 font-bold text-lg">Nenhum produto encontrado.</p>
          ) : (
            Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => (
              <div key={nomeProduto} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-black text-gray-800 uppercase border-b pb-2 mb-3 text-lg">{nomeProduto}</h3>
                
                <div className="space-y-3">
                  {itens.map(p => {
                    const precisaReporBanca = (p.estoque_banca || 0) < (p.meta_banca || 2);
                    const qtdSendoMovida = transferCart[p.id] || 0;
                    
                    return (
                      <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{p.cor} <span className="text-gray-400">|</span> Tam: {p.tam}</p>
                          
                          <div className="flex gap-2 mt-1 text-sm">
                            <span className={`px-2 py-1 rounded font-bold ${precisaReporBanca ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              Banca: {p.estoque_banca || 0}
                            </span>
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">
                              Estoque: {p.estoque_saco || 0} <span className="text-xs font-normal ml-1">(Saco {p.saco})</span>
                            </span>
                          </div>
                        </div>

                        {/* CONTROLE DE TRANSFERÊNCIA (Mover p/ Banca) */}
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-blue-600 uppercase mb-1">Mover p/ Banca</span>
                          {p.estoque_saco > 0 ? (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-1 shadow-inner">
                              <button onClick={() => alterarQtdTransferencia(p.id, -1, p.estoque_saco)} className="bg-white w-8 h-8 rounded text-lg font-bold text-blue-700 shadow-sm active:scale-95">-</button>
                              <span className={`font-black text-md w-4 text-center ${qtdSendoMovida > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                                {qtdSendoMovida > 0 ? qtdSendoMovida : '0'}
                              </span>
                              <button onClick={() => alterarQtdTransferencia(p.id, 1, p.estoque_saco)} className="bg-white w-8 h-8 rounded text-lg font-bold text-blue-700 shadow-sm active:scale-95">+</button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-lg border">ESTOQUE ZERO</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* BOTÃO FIXO DE CONFIRMAR TRANSFERÊNCIA */}
        {Object.keys(transferCart).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-100 border-t border-gray-200 z-10">
            <button 
              onClick={confirmarTransferencias} 
              className="w-full bg-blue-600 text-white text-xl py-4 rounded-2xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center"
            >
              <span>✅</span> CONFIRMAR TRANSFERÊNCIA
            </button>
          </div>
        )}

      </div>
    </div>
  );
}