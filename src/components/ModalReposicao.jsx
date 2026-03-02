import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalReposicao({ aberto, fechar, produtos, buscarProdutos }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});
  const [carrinhoReposicao, setCarrinhoReposicao] = useState({});
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  // Régua oficial de tamanhos para forçar a ordenação lógica (não alfabética)
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

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

  const toggleSanfona = (nomeProduto) => {
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

  const alterarQtdReposicao = (id, delta) => {
    setCarrinhoReposicao(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;

      if (novaQtd <= 0) {
        const novoCart = { ...prev };
        delete novoCart[id];
        return novoCart;
      }
      return { ...prev, [id]: novaQtd };
    });
  };

  const confirmarReposicao = async () => {
    const ids = Object.keys(carrinhoReposicao);
    if (ids.length === 0) return;

    setSalvando(true);
    const loadingId = toast.loading('Salvando reposição...');

    try {
      for (const id of ids) {
        const qtdAdicional = carrinhoReposicao[id];
        const produto = produtos.find(p => p.id === parseInt(id));
        if (!produto) continue;

        // A reposição de fábrica sempre entra no Estoque Saco primeiro!
        const novoEstoqueSaco = (produto.estoque_saco || 0) + qtdAdicional;
        
        await supabase.from('produtos').update({ estoque_saco: novoEstoqueSaco }).eq('id', id);
      }

      await buscarProdutos();
      setCarrinhoReposicao({});
      toast.success('Estoque atualizado com sucesso!', { id: loadingId });
      fechar();
    } catch (error) {
      toast.error('Erro ao repor estoque.', { id: loadingId });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={fechar}>
      <div className="bg-gray-50 w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
        
        <div className="bg-green-600 text-white p-5 flex justify-between items-center shadow-md z-10">
          <h2 className="text-xl font-black italic flex items-center gap-2">📦 Entrada de Mercadoria (Reposição)</h2>
          <button onClick={fechar} className="bg-green-700 hover:bg-green-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-green-100 active:scale-95 transition-colors">X</button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-white">
          <input 
            type="text" 
            placeholder="Digite o modelo, cor ou tamanho..." 
            className="w-full p-4 rounded-xl shadow-sm border-2 border-green-200 text-lg font-bold text-gray-700 outline-none focus:border-green-500 bg-gray-50 focus:bg-white"
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
              
              // 🧠 MÁGICA DA ORDENAÇÃO: Primeiro por Tamanho Lógico, depois por Cor
              const itensOrdenados = [...itens].sort((a, b) => {
                let indexA = ordemTamanhos.indexOf(a.tam.toUpperCase());
                let indexB = ordemTamanhos.indexOf(b.tam.toUpperCase());
                
                // Se o tamanho não estiver na nossa régua (ex: numeração), joga pro final
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;

                if (indexA !== indexB) {
                  return indexA - indexB; // Ordena por Tamanho (P, M, G, GG...)
                } else {
                  return a.cor.localeCompare(b.cor); // Se for o mesmo tamanho, ordena por Cor (A-Z)
                }
              });

              return (
                <div key={nomeProduto} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                  
                  <div 
                    onClick={() => toggleSanfona(nomeProduto)}
                    className="bg-gray-50 hover:bg-green-50 p-4 flex justify-between items-center cursor-pointer select-none transition-colors border-b border-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-bold text-xs">{estaExpandido ? '▼' : '▶'}</span>
                      <h3 className="font-black text-gray-800 uppercase text-sm md:text-base tracking-tight">{nomeProduto}</h3>
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="p-3 space-y-2 bg-white animate-fade-in border-t border-gray-100">
                      {itensOrdenados.map(p => {
                        const qtdSendoAdicionada = carrinhoReposicao[p.id] || 0;
                        
                        return (
                          <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-green-200 transition-colors">
                            <div className="flex-1">
                              {/* 🔄 VISUAL INVERTIDO: Destaca o Tamanho primeiro, depois a Cor */}
                              <p className="font-bold text-gray-800 text-sm md:text-base">
                                Tam: <span className="text-blue-600 font-black">{p.tam}</span> <span className="text-gray-400 font-normal mx-1">|</span> {p.cor}
                              </p>
                              <div className="flex gap-2 mt-1 text-xs md:text-sm">
                                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                                  Estoque Atual: {(p.estoque_saco || 0) + (p.estoque_banca || 0)} un.
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center ml-2">
                              <span className="text-[9px] font-black text-green-600 uppercase mb-1">Adicionar (+ Qtd)</span>
                              <div className="flex items-center gap-1 md:gap-2 bg-green-50 border border-green-200 rounded-lg p-1 shadow-inner">
                                <button onClick={() => alterarQtdReposicao(p.id, -1)} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-green-700 shadow-sm active:scale-95 flex items-center justify-center">-</button>
                                <span className={`font-black text-sm md:text-md w-6 text-center ${qtdSendoAdicionada > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                  {qtdSendoAdicionada > 0 ? `+${qtdSendoAdicionada}` : '0'}
                                </span>
                                <button onClick={() => alterarQtdReposicao(p.id, 1)} className="bg-white w-7 h-7 md:w-8 md:h-8 rounded text-lg font-black text-green-700 shadow-sm active:scale-95 flex items-center justify-center">+</button>
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

        {Object.keys(carrinhoReposicao).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] animate-slide-up">
            <button 
              onClick={confirmarReposicao} 
              disabled={salvando}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-4 rounded-xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center transition-all disabled:opacity-70"
            >
              <span>📥</span> {salvando ? 'SALVANDO...' : 'CONFIRMAR ENTRADA DE ESTOQUE'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}