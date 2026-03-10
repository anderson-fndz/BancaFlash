import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, ClipboardCheck, Trash2, AlertTriangle, Zap, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react';

export default function ModalConciliacao({ aberto, fechar, produtos, buscarProdutos }) {
  const [pendentes, setPendentes] = useState([]);
  const [contagem, setContagem] = useState({});
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (aberto) {
      buscarPendentes();
      
      const contagemInicial = {};
      produtos.forEach(p => {
        contagemInicial[p.id] = (p.estoque_banca || 0) + (p.estoque_saco || 0);
      });
      setContagem(contagemInicial);
    }
  }, [aberto, produtos]);

  if (!aberto) return null;

  const buscarPendentes = async () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('vendas')
      .select('*')
      .eq('produto_cor', 'PENDENTE')
      .gte('created_at', hoje.toISOString());
    setPendentes(data || []);
  };

  const pendentesPorProduto = pendentes.reduce((acc, v) => {
    if (!acc[v.produto_nome]) acc[v.produto_nome] = [];
    acc[v.produto_nome].push(v);
    return acc;
  }, {});

  const alterarContagem = (idVariacao, delta) => {
    setContagem(prev => {
      const atual = parseInt(prev[idVariacao] || 0);
      const novo = atual + delta;
      if (novo < 0) return prev; 
      return { ...prev, [idVariacao]: novo };
    });
  };

  const handleInputContagem = (idVariacao, valor) => {
    if (valor === '') {
      setContagem(prev => ({ ...prev, [idVariacao]: '' }));
    } else {
      setContagem(prev => ({ ...prev, [idVariacao]: parseInt(valor) }));
    }
  };

  const limparTamanho = (t) => String(t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];
  
  const sortLogico = (a, b) => {
    let idxA = ordemTamanhos.indexOf(limparTamanho(a.tam));
    let idxB = ordemTamanhos.indexOf(limparTamanho(b.tam));
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return String(a.cor || '').trim().localeCompare(String(b.cor || '').trim());
  };

  const excluirVendasOrfas = async (nomeProduto) => {
    const vendasDesteProduto = pendentesPorProduto[nomeProduto];
    if (window.confirm(`ATENÇÃO: O modelo "${nomeProduto}" foi apagado do estoque. Deseja cancelar as ${vendasDesteProduto.length} vendas rápidas registradas dele?`)) {
      const loadingId = toast.loading("Apagando vendas fantasmas...", { style: { background: '#0f172a', color: '#fff' } });
      const ids = vendasDesteProduto.map(v => v.id);
      await supabase.from('vendas').delete().in('id', ids);
      await buscarPendentes();
      toast.success("Vendas excluídas com sucesso!", { id: loadingId });
    }
  };

  const baterEstoque = async (nomeProduto) => {
    setProcessando(true);
    const loadingId = toast.loading(`Conferindo ${nomeProduto}...`, { style: { background: '#0f172a', color: '#fff' } });

    try {
      const variacoes = produtos.filter(p => p.nome === nomeProduto);
      const pendentesDoProduto = pendentes.filter(v => v.produto_nome === nomeProduto);

      let pecasFaltantes = []; 

      for (const v of variacoes) {
        const estoqueAntigo = (v.estoque_banca || 0) + (v.estoque_saco || 0);
        const estoqueNovo = contagem[v.id] === '' ? 0 : parseInt(contagem[v.id]);
        
        const diferenca = estoqueAntigo - estoqueNovo; 

        if (diferenca > 0) {
          for (let i = 0; i < diferenca; i++) pecasFaltantes.push(v);
        }

        if (diferenca !== 0) {
          let novoBanca = v.estoque_banca || 0;
          let novoSaco = v.estoque_saco || 0;

          if (diferenca > 0) {
            if (novoBanca >= diferenca) {
              novoBanca -= diferenca;
            } else {
              const sobra = diferenca - novoBanca;
              novoBanca = 0;
              novoSaco -= sobra;
            }
          } else {
            novoBanca += Math.abs(diferenca);
          }

          await supabase.from('produtos').update({ estoque_banca: novoBanca, estoque_saco: novoSaco }).eq('id', v.id);
        }
      }

      let pendentesFlat = [];
      for (const p of pendentesDoProduto) {
        for(let i=0; i<p.quantidade; i++) pendentesFlat.push({...p, quantidade: 1});
      }

      const novosRegistros = [];
      const maxIterations = Math.max(pecasFaltantes.length, pendentesFlat.length);

      for (let i = 0; i < maxIterations; i++) {
        const pendente = pendentesFlat[i];
        const variacao = pecasFaltantes[i];

        if (pendente && variacao) {
          novosRegistros.push({
            transacao_id: pendente.transacao_id,
            produto_id: variacao.id,
            produto_nome: variacao.nome,
            produto_cor: variacao.cor,
            produto_tam: variacao.tam,
            quantidade: 1,
            preco_unitario: pendente.preco_unitario,
            total_item: pendente.preco_unitario,
            forma_pagamento: pendente.forma_pagamento,
            created_at: pendente.created_at,
            user_id: pendente.user_id
          });
        }
      }

      if (pendentesDoProduto.length > 0) {
        const idsPendentes = pendentesDoProduto.map(p => p.id);
        await supabase.from('vendas').delete().in('id', idsPendentes);
      }
      
      if (novosRegistros.length > 0) {
        await supabase.from('vendas').insert(novosRegistros);
      }

      await buscarProdutos();
      await buscarPendentes();
      toast.success(`${nomeProduto} conferido e atualizado!`, { id: loadingId });

    } catch (error) {
      toast.error("Erro ao bater o estoque", { id: loadingId });
      console.error(error);
    } finally {
      setProcessando(false);
    }
  };

  const produtosParaAuditar = [...new Set([
    ...produtos.filter(p => ((p.estoque_banca || 0) + (p.estoque_saco || 0)) > 0).map(p => p.nome),
    ...pendentes.map(v => v.produto_nome)
  ])].sort();

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-slate-50 w-full max-w-3xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden relative border border-slate-200/50" onClick={e => e.stopPropagation()}>
        
        {/* ✨ HEADER PREMIUM ✨ */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
              <ClipboardCheck className="text-amber-500" size={28} /> Bater Estoque
            </h2>
            <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
              Informe o que sobrou para o sistema descobrir as cores das Vendas Rápidas
            </p>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-10">
          
          {produtosParaAuditar.length === 0 ? (
            <div className="text-center mt-20 bg-white p-10 rounded-3xl border border-dashed border-slate-300">
              <ClipboardCheck size={48} className="text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-slate-500 font-black text-xl uppercase tracking-tight">Tudo Certo!</p>
              <p className="text-slate-400 font-bold text-sm mt-1">Nenhum produto pendente para bater o estoque.</p>
            </div>
          ) : (
            produtosParaAuditar.map(nomeProduto => {
              const variacoes = produtos.filter(p => p.nome === nomeProduto).sort(sortLogico);
              const vendasRappidas = pendentes.filter(v => v.produto_nome === nomeProduto);
              const qtdCobradaPeloSistema = vendasRappidas.reduce((acc, v) => acc + v.quantidade, 0);

              // 🚨 PRODUTO FANTASMA
              if (variacoes.length === 0 && qtdCobradaPeloSistema > 0) {
                return (
                  <div key={nomeProduto} className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden shadow-sm mb-4 group hover:border-red-300 transition-colors">
                    <div className="p-4 flex justify-between items-center flex-col md:flex-row gap-4">
                      <div>
                        <h3 className="font-black text-red-900 uppercase tracking-tight flex items-center gap-2">
                          <AlertTriangle size={18} className="text-red-500" /> {nomeProduto}
                        </h3>
                        <p className="text-[10px] md:text-xs font-bold text-red-600 mt-1 uppercase tracking-wider">
                          Produto excluído, mas possui <strong className="bg-red-200 px-1.5 py-0.5 rounded-md text-red-800">{qtdCobradaPeloSistema} vendas rápidas</strong>.
                        </p>
                      </div>
                      <button 
                        onClick={() => excluirVendasOrfas(nomeProduto)}
                        className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <Trash2 size={16} /> Descartar Vendas
                      </button>
                    </div>
                  </div>
                )
              }

              const totalBaixasDadas = variacoes.reduce((acc, v) => {
                const estoqueReal = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                const digitado = contagem[v.id] === '' ? 0 : parseInt(contagem[v.id] || 0);
                return digitado < estoqueReal ? acc + (estoqueReal - digitado) : acc;
              }, 0);

              const liberadoParaFechar = totalBaixasDadas >= qtdCobradaPeloSistema;

              return (
                <div key={nomeProduto} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${qtdCobradaPeloSistema > 0 ? 'border-amber-300 shadow-amber-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
                  
                  <div className={`p-4 md:p-5 border-b flex flex-col md:flex-row md:justify-between md:items-center gap-3 ${qtdCobradaPeloSistema > 0 ? 'bg-amber-50/50' : 'bg-slate-50/50'}`}>
                    <div>
                      <h3 className={`font-black uppercase tracking-tight text-lg ${qtdCobradaPeloSistema > 0 ? 'text-amber-900' : 'text-slate-800'}`}>{nomeProduto}</h3>
                      {qtdCobradaPeloSistema > 0 && (
                        <p className="text-[10px] font-bold text-amber-700 mt-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1"><Zap size={10} className="fill-amber-950" /> {qtdCobradaPeloSistema} Vendas Rápidas</span> 
                          esperando você achar as peças
                        </p>
                      )}
                    </div>
                    
                    {qtdCobradaPeloSistema > 0 && (
                      <div className="text-left md:text-right">
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border shadow-sm transition-all flex md:inline-flex items-center justify-center gap-1.5 ${liberadoParaFechar ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-amber-600 border-amber-200'}`}>
                          {liberadoParaFechar && <CheckCircle2 size={14} />}
                          {totalBaixasDadas} / {qtdCobradaPeloSistema} Peças Vendidas Achadas
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {variacoes.map(v => {
                      const estoqueOriginal = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                      const valorAtual = contagem[v.id];
                      const diferenca = estoqueOriginal - (valorAtual === '' ? 0 : parseInt(valorAtual || 0));

                      return (
                        <div key={v.id} className={`p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors ${diferenca > 0 ? 'bg-red-50/30' : 'hover:bg-slate-50/80'}`}>
                          
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-sm md:text-base uppercase">Tam: <span className="text-blue-600 font-black">{v.tam}</span> <span className="text-slate-300 mx-1 font-normal">|</span> {v.cor}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                              Tinha na banca: <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black">{estoqueOriginal} un.</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="w-24 text-right">
                              {diferenca > 0 && (
                                <span className="text-[10px] font-black text-red-600 animate-fade-in uppercase bg-red-100 px-2 py-1 rounded-md shadow-sm border border-red-200 flex items-center justify-end gap-1">
                                  <ArrowDown size={12} strokeWidth={3} /> {diferenca} Baixa(s)
                                </span>
                              )}
                              {diferenca < 0 && (
                                <span className="text-[10px] font-black text-blue-600 animate-fade-in uppercase bg-blue-100 px-2 py-1 rounded-md shadow-sm border border-blue-200 flex items-center justify-end gap-1">
                                  <ArrowUp size={12} strokeWidth={3} /> {Math.abs(diferenca)} Sobra
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                              <button 
                                onClick={() => alterarContagem(v.id, -1)} 
                                className="bg-white w-9 h-9 md:w-10 md:h-10 rounded-lg font-black text-slate-400 hover:text-red-600 shadow-sm active:scale-95 text-lg flex items-center justify-center transition-colors"
                              >
                                -
                              </button>
                              
                              <input 
                                type="number" 
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                className="w-12 md:w-14 bg-transparent text-center font-black text-lg text-slate-800 outline-none"
                                value={valorAtual}
                                onChange={(e) => handleInputContagem(v.id, e.target.value)}
                              />
                              
                              <button 
                                onClick={() => alterarContagem(v.id, 1)} 
                                className="bg-white w-9 h-9 md:w-10 md:h-10 rounded-lg font-black text-slate-400 hover:text-blue-600 shadow-sm active:scale-95 text-lg flex items-center justify-center transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ✨ BOTÃO DE CONFIRMAÇÃO ✨ */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button 
                      disabled={!liberadoParaFechar || processando}
                      onClick={() => baterEstoque(nomeProduto)}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm shadow-sm
                        ${liberadoParaFechar 
                          ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-amber-500/30 active:scale-95 border border-amber-400' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-transparent'}`}
                    >
                      {liberadoParaFechar ? (
                        <>
                          <CheckCircle2 size={18} /> Confirmar e Atualizar Vendas
                        </>
                      ) : (
                        'Identifique as peças vendidas'
                      )}
                    </button>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}