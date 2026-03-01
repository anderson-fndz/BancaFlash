import React, { useState } from 'react';
import toast from 'react-hot-toast'; // Adicionado para manter o padrão profissional

export default function LocalizadorEstoque({ aberto, fechar, produtos, transferirParaBanca }) {
  const [busca, setBusca] = useState('');
  
  // O carrinho temporário de transferência (Saco -> Banca)
  const [transferCart, setTransferCart] = useState({});

  // 🪄 O ESTADO MÁGICO DA SANFONA
  const [expandidos, setExpandidos] = useState({});

  if (!aberto) return null;

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.cor.toLowerCase().includes(busca.toLowerCase()) ||
    p.tam.toLowerCase().includes(busca.toLowerCase()) ||
    (p.saco && p.saco.toLowerCase().includes(busca.toLowerCase())) // Adicionei busca por Saco também!
  );
  
  const produtosAgrupados = produtosFiltrados.reduce((acc, p) => {
    if (!acc[p.nome]) acc[p.nome] = [];
    acc[p.nome].push(p);
    return acc;
  }, {});

  // Função para abrir e fechar a sanfona
  const toggleSanfona = (nomeProduto) => {
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

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
      if (novaQtd > maxSaco) {
        toast.error(`Estoque limite atingido! Só tem ${maxSaco} no saco.`);
        return prev;
      }

      return { ...prev, [id]: novaQtd };
    });
  };

  const confirmarTransferencias = async () => {
    await transferirParaBanca(transferCart);
    setTransferCart({});
    // O toast.success já tá sendo chamado lá no App.jsx dentro da função transferirParaBanca!
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={fechar}>
      <div className="bg-gray-100 w-full md:w-[600px] h-[90vh] md:h-[85vh] md:mb-10 rounded-t-3xl md:rounded-3xl p-5 shadow-2xl flex flex-col animate-slide-up relative overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <span>🔍</span> Localizador
          </h2>
          <button onClick={fechar} className="bg-gray-300 w-8 h-8 rounded-full font-bold text-gray-600 hover:bg-red-100 hover:text-red-500 active:scale-95 transition-colors">X</button>
        </div>

        <input 
          type="text" 
          placeholder="Digite o modelo, cor, tamanho ou saco..." 
          className="w-full p-4 rounded-xl shadow-sm border-2 border-blue-200 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 mb-4 bg-white"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />

        <div className="flex-1 overflow-y-auto space-y-3 pb-24 pr-2">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <div className="text-center mt-10">
              <span className="text-4xl">📭</span>
              <p className="text-gray-400 font-bold text-lg mt-2">Nenhum produto encontrado.</p>
            </div>
          ) : (
            Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => {
              const estaExpandido = expandidos[nomeProduto];
              
              return (
                <div key={nomeProduto} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                  
                  {/* CABEÇALHO CLICÁVEL DA SANFONA */}
                  <div 
                    onClick={() => toggleSanfona(nomeProduto)}
                    className="bg-gray-50 hover:bg-gray-100 p-4 flex justify-between items-center cursor-pointer select-none transition-colors border-b border-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold text-xs">{estaExpandido ? '▼' : '▶'}</span>
                      <h3 className="font-black text-gray-800 uppercase text-sm md:text-base tracking-tight">{nomeProduto}</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-white border px-2 py-1 rounded-lg shadow-sm">
                      {itens.length} opções
                    </span>
                  </div>
                  
                  {/* CONTEÚDO DA SANFONA (SÓ MOSTRA SE ABERTO) */}
                  {estaExpandido && (
                    <div className="p-3 space-y-2 bg-white animate-fade-in border-t border-gray-100">
                      {itens.map(p => {
                        const precisaReporBanca = (p.estoque_banca || 0) < (p.meta_banca || 3);
                        const qtdSendoMovida = transferCart[p.id] || 0;
                        
                        return (
                          <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                            <div className="flex-1">
                              <p className="font-bold text-gray-800 text-sm md:text-base">{p.cor} <span className="text-gray-400">|</span> Tam: <span className="text-blue-600">{p.tam}</span></p>
                              
                              <div className="flex gap-2 mt-1 text-xs md:text-sm">
                                <span className={`px-2 py-1 rounded font-bold ${precisaReporBanca ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  Banca: {p.estoque_banca || 0}
                                </span>
                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                  Estoque: {p.estoque_saco || 0} <span className="text-[10px] font-normal uppercase text-gray-500 bg-gray-300 px-1 rounded">Saco {p.saco || '-'}</span>
                                </span>
                              </div>
                            </div>

                            {/* CONTROLE DE TRANSFERÊNCIA */}
                            <div className="flex flex-col items-center justify-center ml-2">
                              <span className="text-[9px] font-black text-blue-600 uppercase mb-1">Descer p/ Banca</span>
                              {p.estoque_saco > 0 ? (
                                <div className="flex items-center gap-1 md:gap-2 bg-blue-50 border border-blue-200 rounded-lg p-1 shadow-inner">
                                  <button onClick={() => alterarQtdTransferencia(p.id, -1, p.estoque_saco)} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-blue-700 shadow-sm active:scale-95 flex items-center justify-center">-</button>
                                  <span className={`font-black text-sm md:text-md w-4 text-center ${qtdSendoMovida > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                                    {qtdSendoMovida > 0 ? qtdSendoMovida : '0'}
                                  </span>
                                  <button onClick={() => alterarQtdTransferencia(p.id, 1, p.estoque_saco)} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-blue-700 shadow-sm active:scale-95 flex items-center justify-center">+</button>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-gray-400 bg-gray-200 px-3 py-2 rounded-lg border border-gray-300 shadow-inner">ESTOQUE ZERO</span>
                              )}
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

        {/* BOTÃO FIXO DE CONFIRMAR TRANSFERÊNCIA (Só aparece se tiver algo no carrinho) */}
        {Object.keys(transferCart).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] animate-slide-up">
            <button 
              onClick={confirmarTransferencias} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-4 rounded-xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center transition-all"
            >
              <span>✅</span> CONFIRMAR TRANSFERÊNCIA
            </button>
          </div>
        )}

      </div>
    </div>
  );
}