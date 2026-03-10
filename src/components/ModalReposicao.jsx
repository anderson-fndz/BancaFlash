import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, Search, PackagePlus, ChevronDown, ChevronRight, Check } from 'lucide-react'; // ✨ Ícones Premium Adicionados

export default function ModalReposicao({ aberto, fechar, produtos, buscarProdutos }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});
  const [carrinhoReposicao, setCarrinhoReposicao] = useState({});
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

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
    const loadingId = toast.loading('Salvando reposição...', { style: { background: '#0f172a', color: '#fff' } });

    try {
      for (const id of ids) {
        const qtdAdicional = carrinhoReposicao[id];
        const produto = produtos.find(p => p.id === parseInt(id));
        if (!produto) continue;

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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up relative border border-slate-200/50" onClick={e => e.stopPropagation()}>
        
        {/* ✨ HEADER PREMIUM (Fundo Escuro) ✨ */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
            <PackagePlus className="text-emerald-500" size={24} /> 
            Entrada de Mercadoria
          </h2>
          <button onClick={fechar} className="text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* ✨ BARRA DE PESQUISA CLEAN ✨ */}
        <div className="bg-white pt-4 px-4 shrink-0 border-b border-slate-200">
          <div className="relative group pb-4">
            <div className="absolute inset-y-0 left-0 pl-4 pb-4 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Digite o modelo, cor ou tamanho..." 
              className="w-full pl-11 pr-4 py-3.5 rounded-xl shadow-sm border border-slate-200 text-base font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 bg-slate-50 focus:bg-white transition-all"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* ✨ LISTA DE PRODUTOS (ESTILO SANFONA MODERNA) ✨ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28 custom-scrollbar">
          {Object.keys(produtosAgrupados).length === 0 ? (
            <div className="text-center mt-12 bg-white p-12 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center mx-4">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Search size={48} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-slate-500 font-black text-lg">Nenhum produto encontrado.</p>
              <p className="text-slate-400 text-sm font-bold mt-1">Tente buscar por outro termo.</p>
            </div>
          ) : (
            Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => {
              const estaExpandido = expandidos[nomeProduto];
              
              const itensOrdenados = [...itens].sort((a, b) => {
                let indexA = ordemTamanhos.indexOf(a.tam.toUpperCase());
                let indexB = ordemTamanhos.indexOf(b.tam.toUpperCase());
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                if (indexA !== indexB) return indexA - indexB;
                return a.cor.localeCompare(b.cor);
              });

              return (
                <div key={nomeProduto} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300">
                  
                  <div 
                    onClick={() => toggleSanfona(nomeProduto)}
                    className="bg-slate-50 hover:bg-emerald-50/50 p-4 flex justify-between items-center cursor-pointer select-none transition-colors border-b border-transparent"
                  >
                    <div className="flex items-center gap-2 group">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                        {estaExpandido ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                      </div>
                      <h3 className="font-black text-slate-800 uppercase text-sm md:text-base tracking-tight">{nomeProduto}</h3>
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="p-3 md:p-4 space-y-3 bg-white animate-fade-in border-t border-slate-100">
                      {itensOrdenados.map(p => {
                        const qtdSendoAdicionada = carrinhoReposicao[p.id] || 0;
                        const temAdicao = qtdSendoAdicionada > 0;
                        
                        return (
                          <div key={p.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 md:p-4 rounded-xl border transition-all gap-3 ${temAdicao ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                            
                            <div className="flex-1 w-full">
                              <p className="font-bold text-slate-800 text-sm md:text-base mb-1.5 uppercase">
                                Tam: <span className="text-blue-600 font-black">{p.tam}</span> <span className="text-slate-300 font-normal mx-1">|</span> {p.cor}
                              </p>
                              <div className="flex gap-2 text-[10px] md:text-xs">
                                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 uppercase tracking-wider">
                                  Estoque Atual: {(p.estoque_saco || 0) + (p.estoque_banca || 0)} un.
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                              <span className={`text-[9px] font-black uppercase mb-0 sm:mb-1.5 ${temAdicao ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {temAdicao ? 'Peças a adicionar' : 'Adicionar (+)'}
                              </span>
                              <div className={`flex items-center gap-1 md:gap-2 border-2 rounded-xl p-1 transition-colors ${temAdicao ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-100 border-transparent'}`}>
                                <button onClick={() => alterarQtdReposicao(p.id, -1)} disabled={!temAdicao} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-lg font-black active:scale-95 flex items-center justify-center transition-colors disabled:opacity-50 ${temAdicao ? 'bg-slate-50 hover:bg-slate-100 text-emerald-700' : 'text-slate-400 cursor-not-allowed'}`}>-</button>
                                <span className={`font-black text-base w-8 text-center ${temAdicao ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {temAdicao ? `+${qtdSendoAdicionada}` : '0'}
                                </span>
                                <button onClick={() => alterarQtdReposicao(p.id, 1)} className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-lg font-black active:scale-95 flex items-center justify-center transition-colors ${temAdicao ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'bg-white hover:bg-slate-200 text-slate-600 shadow-sm'}`}>+</button>
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

        {/* ✨ BOTÃO DE CONFIRMAÇÃO FLUTUANTE ✨ */}
        {Object.keys(carrinhoReposicao).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-20 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] animate-slide-up">
            <button 
              onClick={confirmarReposicao} 
              disabled={salvando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm md:text-base py-4 rounded-xl font-black shadow-lg shadow-emerald-500/30 active:scale-95 flex justify-center gap-2 items-center transition-all disabled:opacity-70 tracking-widest uppercase"
            >
              {salvando ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check strokeWidth={3} size={20} />
              )}
              {salvando ? 'SALVANDO...' : 'CONFIRMAR ENTRADA DE ESTOQUE'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}