import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trophy, Target, Shirt, Palette, Scaling, ChevronRight, ChevronDown, ArrowLeft, Medal, X, Flame } from 'lucide-react';

export default function TelaRankings() {
  const [periodo, setPeriodo] = useState('30dias'); 
  const [carregando, setCarregando] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [sessoesExpandidas, setSessoesExpandidas] = useState({
    variacoes: true,
    cores: false,
    tamanhos: false
  });

  useEffect(() => {
    buscarDadosRanking();
  }, [periodo]);

  const getDataCorte = () => {
    let dataCorte = new Date();
    dataCorte.setHours(0, 0, 0, 0);
    if (periodo === '7dias') dataCorte.setDate(dataCorte.getDate() - 6);
    else if (periodo === '30dias') dataCorte.setDate(dataCorte.getDate() - 29);
    else if (periodo === 'mes') dataCorte.setDate(1); 
    return dataCorte;
  };

  const buscarDadosRanking = async () => {
    setCarregando(true);
    setProdutoSelecionado(null); 
    const dataCorte = getDataCorte();

    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', dataCorte.toISOString());

    if (!error && vendas) {
      const agrupado = vendas.reduce((acc, v) => {
        if (!v.produto_nome || v.produto_nome.startsWith('GEN-')) return acc;

        const nome = v.produto_nome;
        if (!acc[nome]) {
          acc[nome] = { nome, qtdTotal: 0, faturamento: 0, cores: {}, tamanhos: {}, variacoes: {} };
        }
        
        acc[nome].qtdTotal += parseInt(v.quantidade);
        acc[nome].faturamento += parseFloat(v.total_item);

        if (v.produto_cor && v.produto_cor !== 'PENDENTE') {
          acc[nome].cores[v.produto_cor] = (acc[nome].cores[v.produto_cor] || 0) + parseInt(v.quantidade);
        }
        
        if (v.produto_tam && v.produto_tam !== 'PENDENTE') {
          acc[nome].tamanhos[v.produto_tam] = (acc[nome].tamanhos[v.produto_tam] || 0) + parseInt(v.quantidade);
        }

        if (v.produto_tam && v.produto_cor && v.produto_tam !== 'PENDENTE' && v.produto_cor !== 'PENDENTE') {
          const combo = `${v.produto_tam} | ${v.produto_cor}`;
          acc[nome].variacoes[combo] = (acc[nome].variacoes[combo] || 0) + parseInt(v.quantidade);
        }

        return acc;
      }, {});

      const rankingArray = Object.values(agrupado).sort((a, b) => b.qtdTotal - a.qtdTotal);
      setRankings(rankingArray);
    }
    setCarregando(false);
  };

  const getTopCores = (coresObj) => Object.entries(coresObj).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);
  const getTopTamanhos = (tamObj) => Object.entries(tamObj).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);
  const getTopVariacoes = (varObj) => Object.entries(varObj).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);

  const handleSelecionarProduto = (item) => {
    setProdutoSelecionado(item);
    setSessoesExpandidas({
      variacoes: true, 
      cores: false,    
      tamanhos: false
    });
  };

  const toggleSessao = (sessao) => {
    setSessoesExpandidas(prev => ({ ...prev, [sessao]: !prev[sessao] }));
  };

  // ✨ NOVA FUNÇÃO: Retorna o estilo do pódio baseado na posição (1º, 2º, 3º ou comum) ✨
  const getEstiloPodio = (index) => {
    if (index === 0) return {
      colorClasses: "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/50",
      numColor: "bg-amber-500 text-amber-950",
      highlightText: "text-amber-400",
      barColor: "bg-amber-500/20"
    };
    if (index === 1) return {
      colorClasses: "bg-gradient-to-r from-slate-300/10 to-transparent border-slate-400/30 hover:border-slate-400/50",
      numColor: "bg-slate-300 text-slate-800",
      highlightText: "text-slate-300",
      barColor: "bg-slate-400/20"
    };
    if (index === 2) return {
      colorClasses: "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/30 hover:border-orange-500/50",
      numColor: "bg-orange-500 text-orange-950",
      highlightText: "text-orange-400",
      barColor: "bg-orange-500/20"
    };
    return {
      colorClasses: "bg-slate-800/40 border-slate-700/60 hover:border-slate-600",
      numColor: "bg-slate-700 text-slate-400",
      highlightText: "text-white",
      barColor: "bg-slate-700/50"
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8 flex flex-col h-full">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm shrink-0 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" size={32} /> Campeões de Venda
          </h1>
          <p className="text-slate-500 font-bold mt-1 text-sm flex items-center gap-1">
            <Target size={14} className="text-blue-500" /> Descubra os itens mais vendidos.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {['hoje', '7dias', 'mes', '30dias'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`flex-1 px-4 py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${periodo === p ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
              {p === 'mes' ? 'Este Mês' : p.replace('dias', ' Dias')}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex flex-col items-center justify-center font-bold text-blue-600 text-lg md:text-xl py-32 animate-pulse gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          Analisando histórico de vendas...
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-10">
          <Trophy size={60} className="text-slate-200 mb-4" />
          <p className="text-slate-500 font-black text-lg">Nenhuma venda registrada neste período.</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          
          <div className={`w-full md:w-1/2 lg:w-5/12 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all ${produtoSelecionado ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                <Shirt size={16} className="text-blue-500" /> Ranking de Modelos
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {rankings.map((item, index) => {
                const isSelected = produtoSelecionado?.nome === item.nome;
                return (
                  <button 
                    key={item.nome}
                    onClick={() => handleSelecionarProduto(item)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${isSelected ? 'bg-blue-600 border-blue-700 shadow-md text-white scale-[0.98]' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${isSelected ? 'bg-white/20 text-white' : (index === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : index === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' : index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-50 text-slate-400 border border-slate-100')}`}>
                        {index < 3 ? <Medal size={16} /> : `${index + 1}º`}
                      </div>
                      <div className="flex flex-col truncate pr-2">
                        <span className={`font-black text-sm uppercase truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-800 group-hover:text-blue-600'}`}>{item.nome}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>R$ {item.faturamento.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-black text-base ${isSelected ? 'text-white' : 'text-slate-900'}`}>{item.qtdTotal} <span className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>un.</span></span>
                      <ChevronRight size={18} className={isSelected ? 'text-white' : 'text-slate-300 group-hover:text-blue-500'} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`w-full md:w-1/2 lg:w-7/12 flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all ${!produtoSelecionado ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
            
            {!produtoSelecionado ? (
              <div className="text-center p-8 opacity-50">
                <Target size={64} className="text-slate-600 mx-auto mb-4" strokeWidth={1} />
                <p className="text-slate-400 font-bold text-lg">Selecione um modelo ao lado<br/>para ver a análise completa.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-fade-in">
                
                <div className="p-5 md:p-6 border-b border-slate-800 bg-slate-950/50 shrink-0 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-8">
                      <button onClick={() => setProdutoSelecionado(null)} className="md:hidden text-slate-400 hover:text-white mb-3 flex items-center gap-1 text-xs font-bold uppercase tracking-widest"><ArrowLeft size={14} /> Voltar</button>
                      <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight truncate">{produtoSelecionado.nome}</h2>
                      <p className="text-slate-400 font-bold text-sm mt-1">Responsável por <span className="text-emerald-400">R$ {produtoSelecionado.faturamento.toFixed(2)}</span> neste período.</p>
                    </div>
                    <button onClick={() => setProdutoSelecionado(null)} className="hidden md:flex text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-2 rounded-full transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 custom-scrollbar">
                  
                  {/* ✨ SANFONA 1: VARIAÇÕES EXATAS ✨ */}
                  <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                    <button 
                      onClick={() => toggleSessao('variacoes')}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                    >
                      <h3 className="font-black text-slate-200 text-xs md:text-sm uppercase flex items-center gap-2">
                        <Flame size={16} className="text-orange-500" /> Top Variações Exatas
                      </h3>
                      {sessoesExpandidas.variacoes ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    </button>
                    
                    {sessoesExpandidas.variacoes && (
                      <div className="p-4 pt-2 space-y-3 animate-fade-in">
                        {getTopVariacoes(produtoSelecionado.variacoes).length === 0 ? (
                           <p className="text-slate-600 text-xs font-bold uppercase">Sem dados cruzados.</p>
                        ) : (
                          getTopVariacoes(produtoSelecionado.variacoes).map((varExata, index) => {
                            const [tam, cor] = varExata.nome.split(' | ');
                            const pct = ((varExata.qtd / produtoSelecionado.qtdTotal) * 100).toFixed(0);
                            const podio = getEstiloPodio(index);

                            return (
                              <div key={varExata.nome} className={`relative p-3 md:p-4 rounded-xl border flex items-center justify-between group transition-colors overflow-hidden ${podio.colorClasses}`}>
                                <div className={`absolute left-0 top-0 bottom-0 z-0 transition-all ${podio.barColor}`} style={{ width: `${pct}%` }}></div>
                                
                                <div className="relative z-10 flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${podio.numColor}`}>
                                    {index + 1}º
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Tam: <span className={podio.highlightText}>{tam}</span></span>
                                    <span className={`font-black text-sm md:text-base uppercase truncate ${index < 3 ? podio.highlightText : 'text-white'}`}>{cor}</span>
                                  </div>
                                </div>
                                
                                <div className="relative z-10 flex flex-col items-end">
                                  <span className={`font-black text-xl md:text-2xl leading-none ${index < 3 ? podio.highlightText : 'text-slate-200'}`}>{varExata.qtd}</span>
                                  <span className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">vendidos</span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✨ SANFONA 2: CORES ISOLADAS COM PÓDIO ✨ */}
                  <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                    <button 
                      onClick={() => toggleSessao('cores')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <h3 className="font-black text-slate-300 text-xs uppercase flex items-center gap-2">
                        <Palette size={16} className="text-purple-400" /> Volume por Cor
                      </h3>
                      {sessoesExpandidas.cores ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    </button>
                    
                    {sessoesExpandidas.cores && (
                      <div className="p-4 pt-2 space-y-3 animate-fade-in border-t border-slate-800/50">
                        {getTopCores(produtoSelecionado.cores).length === 0 ? (
                           <p className="text-slate-600 text-xs font-bold uppercase">Sem dados de cor.</p>
                        ) : (
                          getTopCores(produtoSelecionado.cores).map((cor, index) => {
                            const pct = ((cor.qtd / produtoSelecionado.qtdTotal) * 100).toFixed(0);
                            const podio = getEstiloPodio(index);

                            return (
                              <div key={cor.nome} className={`relative p-3 md:p-4 rounded-xl border flex items-center justify-between group transition-colors overflow-hidden ${podio.colorClasses}`}>
                                <div className={`absolute left-0 top-0 bottom-0 z-0 transition-all ${podio.barColor}`} style={{ width: `${pct}%` }}></div>
                                
                                <div className="relative z-10 flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${podio.numColor}`}>
                                    {index + 1}º
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`font-black text-sm md:text-base uppercase truncate ${index < 3 ? podio.highlightText : 'text-white'}`}>{cor.nome}</span>
                                  </div>
                                </div>
                                
                                <div className="relative z-10 flex flex-col items-end">
                                  <span className={`font-black text-xl md:text-2xl leading-none ${index < 3 ? podio.highlightText : 'text-slate-200'}`}>{cor.qtd}</span>
                                  <span className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">vendidos</span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✨ SANFONA 3: TAMANHOS ISOLADOS COM PÓDIO ✨ */}
                  <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                    <button 
                      onClick={() => toggleSessao('tamanhos')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <h3 className="font-black text-slate-300 text-xs uppercase flex items-center gap-2">
                        <Scaling size={16} className="text-emerald-400" /> Volume por Tamanho
                      </h3>
                      {sessoesExpandidas.tamanhos ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    </button>

                    {sessoesExpandidas.tamanhos && (
                      <div className="p-4 pt-2 space-y-3 animate-fade-in border-t border-slate-800/50">
                        {getTopTamanhos(produtoSelecionado.tamanhos).length === 0 ? (
                           <p className="text-slate-600 text-xs font-bold uppercase">Sem dados de tamanho.</p>
                        ) : (
                          getTopTamanhos(produtoSelecionado.tamanhos).map((tam, index) => {
                            const pct = ((tam.qtd / produtoSelecionado.qtdTotal) * 100).toFixed(0);
                            const podio = getEstiloPodio(index);

                            return (
                              <div key={tam.nome} className={`relative p-3 md:p-4 rounded-xl border flex items-center justify-between group transition-colors overflow-hidden ${podio.colorClasses}`}>
                                <div className={`absolute left-0 top-0 bottom-0 z-0 transition-all ${podio.barColor}`} style={{ width: `${pct}%` }}></div>
                                
                                <div className="relative z-10 flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${podio.numColor}`}>
                                    {index + 1}º
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`font-black text-sm md:text-base uppercase truncate ${index < 3 ? podio.highlightText : 'text-white'}`}>{tam.nome}</span>
                                  </div>
                                </div>
                                
                                <div className="relative z-10 flex flex-col items-end">
                                  <span className={`font-black text-xl md:text-2xl leading-none ${index < 3 ? podio.highlightText : 'text-slate-200'}`}>{tam.qtd}</span>
                                  <span className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">vendidos</span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}