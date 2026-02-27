import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ModalResumoDia({ aberto, fechar, produtos }) {
  const [aba, setAba] = useState('RESUMO'); // 'RESUMO' ou 'VENDAS'
  
  const [faturamento, setFaturamento] = useState(0);
  const [pecasVendidas, setPecasVendidas] = useState(0);
  const [todasAsVendas, setTodasAsVendas] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  useEffect(() => {
    if (aberto) {
      buscarVendasDeHoje();
    }
  }, [aberto]);

  const buscarVendasDeHoje = async () => {
    setCarregandoDados(true);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false }); // Puxa do mais recente pro mais antigo

    if (!error && data) {
      const totalGrana = data.reduce((acc, v) => acc + parseFloat(v.total_item), 0);
      const totalPecas = data.reduce((acc, v) => acc + parseInt(v.quantidade), 0);
      setFaturamento(totalGrana);
      setPecasVendidas(totalPecas);
      setTodasAsVendas(data); // Guarda os dados puros pra gente agrupar na outra aba
    }
    setCarregandoDados(false);
  };

  if (!aberto) return null;

  const reposicao = produtos.filter(p => p.estoque <= p.meta);

  // AGRUPA AS VENDAS POR CLIENTE (USANDO O TRANSACAO_ID QUE CRIAMOS)
  const vendasAgrupadas = todasAsVendas.reduce((acc, venda) => {
    // Se for venda velha (antes de ter transacao_id), usa a data pra agrupar pra não quebrar
    const id = venda.transacao_id || venda.created_at; 
    if (!acc[id]) acc[id] = [];
    acc[id].push(venda);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={fechar}>
      <div className="bg-gray-100 w-full h-[90vh] rounded-t-3xl p-5 shadow-2xl flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            📊 Painel Diário {carregandoDados && <span className="text-xs text-blue-500 font-normal">Sincronizando...</span>}
          </h2>
          <button onClick={fechar} className="bg-gray-300 w-8 h-8 rounded-full font-bold text-gray-600 active:scale-95">X</button>
        </div>

        {/* ABAS DO RELATÓRIO */}
        <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
          <button onClick={() => setAba('RESUMO')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'RESUMO' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Visão Geral</button>
          <button onClick={() => setAba('VENDAS')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'VENDAS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Histórico por Cliente</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-10">
          
          {/* =========================================
              ABA 1: RESUMO E REPOSIÇÃO
              ========================================= */}
          {aba === 'RESUMO' && (
            <div>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-green-100 p-4 rounded-xl border border-green-200 text-center shadow-sm">
                  <p className="text-xs font-bold text-green-700 uppercase mb-1">Caixa de Hoje</p>
                  <p className="text-2xl font-black text-green-600">R$ {faturamento.toFixed(2)}</p>
                </div>
                <div className="flex-1 bg-blue-100 p-4 rounded-xl border border-blue-200 text-center shadow-sm">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-1">Peças Saíram</p>
                  <p className="text-2xl font-black text-blue-600">{pecasVendidas} un.</p>
                </div>
              </div>

              <h3 className="font-black text-gray-700 mb-3 border-b pb-2">📦 Precisa Repor Amanhã:</h3>
              
              <div className="space-y-2">
                {reposicao.length === 0 ? (
                  <div className="text-center mt-10">
                    <span className="text-4xl">🎉</span>
                    <p className="text-gray-500 font-bold mt-2">A banca está 100% cheia!</p>
                  </div>
                ) : (
                  reposicao.map(p => {
                    const qtdTrazer = p.meta - p.estoque;
                    return (
                      <div key={p.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-800 uppercase text-sm">{p.nome}</p>
                          <p className="text-xs text-gray-500">{p.cor} | Tam: {p.tam}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Saco {p.saco}</p>
                          <p className="font-black text-red-500 text-lg">Trazer {qtdTrazer}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* =========================================
              ABA 2: HISTÓRICO DE VENDAS (RECIBOS)
              ========================================= */}
          {aba === 'VENDAS' && (
            <div className="space-y-4">
              {Object.keys(vendasAgrupadas).length === 0 ? (
                <p className="text-center text-gray-500 mt-10 font-bold">Nenhuma venda registrada hoje ainda.</p>
              ) : (
                Object.entries(vendasAgrupadas).map(([transacao_id, itensDessaVenda], index) => {
                  
                  // Calcula o total desse cliente específico
                  const totalDesseCliente = itensDessaVenda.reduce((acc, item) => acc + parseFloat(item.total_item), 0);
                  const dataFormatada = new Date(itensDessaVenda[0].created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={transacao_id} className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden">
                      {/* Faixa decorativa do "Recibo" */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      
                      <div className="flex justify-between items-center border-b pb-2 mb-2 pl-2">
                        <p className="font-black text-gray-800">Venda #{Object.keys(vendasAgrupadas).length - index}</p>
                        <p className="text-xs font-bold text-gray-400">Hoje às {dataFormatada}</p>
                      </div>

                      <div className="space-y-1 pl-2 mb-3">
                        {itensDessaVenda.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              <span className="font-bold">{item.quantidade}x</span> {item.produto_nome} ({item.produto_cor} | {item.produto_tam})
                            </span>
                            <span className="font-bold text-gray-500">R$ {parseFloat(item.total_item).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-gray-50 p-2 rounded-lg flex justify-between items-center pl-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Cobrado</span>
                        <span className="font-black text-green-600 text-lg">R$ {totalDesseCliente.toFixed(2)}</span>
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
  );
}