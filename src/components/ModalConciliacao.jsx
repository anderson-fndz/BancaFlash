import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

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

  // 🗑️ FUNÇÃO PARA LIMPAR VENDAS ÓRFÃS/FANTASMAS
  const excluirVendasOrfas = async (nomeProduto) => {
    const vendasDesteProduto = pendentesPorProduto[nomeProduto];
    if (window.confirm(`ATENÇÃO: O modelo "${nomeProduto}" foi apagado do estoque. Deseja cancelar as ${vendasDesteProduto.length} vendas rápidas registradas dele?`)) {
      const loadingId = toast.loading("Apagando vendas fantasmas...");
      const ids = vendasDesteProduto.map(v => v.id);
      await supabase.from('vendas').delete().in('id', ids);
      await buscarPendentes();
      toast.success("Vendas excluídas com sucesso!", { id: loadingId });
    }
  };

  const baterEstoque = async (nomeProduto) => {
    setProcessando(true);
    const loadingId = toast.loading(`Auditando ${nomeProduto}...`);

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
      toast.success(`${nomeProduto} auditado e fechado!`, { id: loadingId });

    } catch (error) {
      toast.error("Erro ao realizar auditoria", { id: loadingId });
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
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-gray-50 w-full max-w-3xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        <div className="bg-indigo-600 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-2">📋 Auditoria de Estoque</h2>
            <p className="text-indigo-200 text-xs font-bold mt-1 uppercase tracking-widest">Confira o que sobrou na banca física</p>
          </div>
          <button onClick={fechar} className="bg-indigo-700 hover:bg-indigo-800 w-10 h-10 rounded-full flex items-center justify-center font-black text-indigo-100 active:scale-95 transition-colors">X</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
          
          {produtosParaAuditar.length === 0 ? (
            <div className="text-center mt-20">
              <span className="text-5xl">📦</span>
              <p className="text-gray-400 font-black text-xl mt-4 uppercase">Estoque Zerado!</p>
              <p className="text-gray-400 font-bold text-sm mt-1">Nenhum produto em estoque para auditar.</p>
            </div>
          ) : (
            produtosParaAuditar.map(nomeProduto => {
              const variacoes = produtos.filter(p => p.nome === nomeProduto).sort(sortLogico);
              const vendasRappidas = pendentes.filter(v => v.produto_nome === nomeProduto);
              const qtdCobradaPeloSistema = vendasRappidas.reduce((acc, v) => acc + v.quantidade, 0);

              // 🚨 TRATATIVA PARA PRODUTO EXCLUÍDO (FANTASMA)
              if (variacoes.length === 0 && qtdCobradaPeloSistema > 0) {
                return (
                  <div key={nomeProduto} className="bg-red-50 border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm mb-4">
                    <div className="p-4 flex justify-between items-center flex-col md:flex-row gap-4">
                      <div>
                        <h3 className="font-black text-red-900 uppercase tracking-tight line-through">{nomeProduto}</h3>
                        <p className="text-xs font-bold text-red-600 mt-1">Este produto foi deletado, mas possui <strong className="bg-red-200 px-1 rounded">{qtdCobradaPeloSistema} vendas rápidas</strong> registradas hoje.</p>
                      </div>
                      <button 
                        onClick={() => excluirVendasOrfas(nomeProduto)}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest shadow-md active:scale-95 shrink-0"
                      >
                        🗑️ Descartar Vendas
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
                <div key={nomeProduto} className={`border-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${qtdCobradaPeloSistema > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
                  
                  <div className={`p-4 border-b flex justify-between items-center ${qtdCobradaPeloSistema > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-100 border-gray-200'}`}>
                    <div>
                      <h3 className={`font-black uppercase tracking-tight ${qtdCobradaPeloSistema > 0 ? 'text-amber-900' : 'text-gray-800'}`}>{nomeProduto}</h3>
                      {qtdCobradaPeloSistema > 0 && (
                        <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1">
                          <span className="bg-amber-200 px-1.5 py-0.5 rounded text-amber-900">⚡ {qtdCobradaPeloSistema} Vendas Rápidas</span> aguardando conferência
                        </p>
                      )}
                    </div>
                    
                    {qtdCobradaPeloSistema > 0 && (
                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm transition-colors ${liberadoParaFechar ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {totalBaixasDadas} / {qtdCobradaPeloSistema} Faltantes Identificadas
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-gray-100 bg-white">
                    {variacoes.map(v => {
                      const estoqueOriginal = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                      const valorAtual = contagem[v.id];
                      const diferenca = estoqueOriginal - (valorAtual === '' ? 0 : parseInt(valorAtual || 0));

                      return (
                        <div key={v.id} className={`p-3 md:p-4 flex flex-col md:flex-row justify-between md:items-center gap-3 transition-colors ${diferenca > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                          
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 text-sm">Tam: <span className="text-indigo-600 font-black">{v.tam}</span> <span className="text-gray-300 mx-1">|</span> {v.cor}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                              Sistema esperava: <span className="text-gray-600 font-black">{estoqueOriginal} un.</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="w-24 text-right">
                              {diferenca > 0 && (
                                <span className="text-[10px] font-black text-red-600 animate-fade-in uppercase bg-red-100 px-2 py-1 rounded shadow-sm border border-red-200">
                                  ⬇ {diferenca} Baixa(s)
                                </span>
                              )}
                              {diferenca < 0 && (
                                <span className="text-[10px] font-black text-blue-600 animate-fade-in uppercase bg-blue-100 px-2 py-1 rounded shadow-sm border border-blue-200">
                                  ⬆ {Math.abs(diferenca)} Sobra
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
                              <button 
                                onClick={() => alterarContagem(v.id, -1)} 
                                className="bg-white w-8 h-8 md:w-10 md:h-10 rounded-lg font-black text-red-500 shadow-sm active:scale-95 text-xl flex items-center justify-center border border-gray-200 hover:border-red-300 transition-colors"
                              >
                                -
                              </button>
                              
                              <input 
                                type="number" 
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                className="w-12 md:w-14 bg-transparent text-center font-black text-lg text-gray-800 outline-none"
                                value={valorAtual}
                                onChange={(e) => handleInputContagem(v.id, e.target.value)}
                              />
                              
                              <button 
                                onClick={() => alterarContagem(v.id, 1)} 
                                className="bg-white w-8 h-8 md:w-10 md:h-10 rounded-lg font-black text-blue-500 shadow-sm active:scale-95 text-xl flex items-center justify-center border border-gray-200 hover:border-blue-300 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <button 
                      disabled={!liberadoParaFechar || processando}
                      onClick={() => baterEstoque(nomeProduto)}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                        ${liberadoParaFechar 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-transparent'}`}
                    >
                      {liberadoParaFechar ? '✔️ Confirmar Auditoria e Ajustar Estoque' : 'Identifique as peças que faltam na banca'}
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