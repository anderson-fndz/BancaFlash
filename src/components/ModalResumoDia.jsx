import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ModalResumoDia({ aberto, fechar, produtos }) {
  const [vendasHoje, setVendasHoje] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('resumo');

  useEffect(() => {
    if (aberto) buscarVendasDoDia();
  }, [aberto]);

  if (!aberto) return null;

  const buscarVendasDoDia = async () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('vendas').select('*').gte('created_at', hoje.toISOString()).order('created_at', { ascending: false });
    if (data) setVendasHoje(data);
  };

  const faturamentoDinheiro = vendasHoje.filter(v => v.forma_pagamento === 'DINHEIRO').reduce((acc, v) => acc + parseFloat(v.total_item), 0);
  const faturamentoPix = vendasHoje.filter(v => v.forma_pagamento === 'PIX').reduce((acc, v) => acc + parseFloat(v.total_item), 0);
  const faturamentoTotal = faturamentoDinheiro + faturamentoPix;
  const pecasVendidas = vendasHoje.reduce((acc, v) => acc + v.quantidade, 0);

  // 🧠 RÉGUA DE TAMANHOS E ORDENAÇÃO
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];
  
  const sortLogico = (a, b) => {
    let idxA = ordemTamanhos.indexOf(a.tam.toUpperCase());
    let idxB = ordemTamanhos.indexOf(b.tam.toUpperCase());
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return a.cor.localeCompare(b.cor);
  };

  const reposicaoNecessaria = produtos.map(p => {
    const repor = p.meta_banca - (p.estoque_banca || 0);
    return { ...p, repor: repor > 0 ? repor : 0 };
  }).filter(p => p.repor > 0).sort(sortLogico); // <- ORDENAÇÃO APLICADA AQUI

  const reposicaoAgrupada = reposicaoNecessaria.reduce((acc, p) => {
    if (!acc[p.nome]) acc[p.nome] = [];
    acc[p.nome].push(p);
    return acc;
  }, {});

  const transacoes = vendasHoje.reduce((acc, v) => {
    if (!acc[v.transacao_id]) acc[v.transacao_id] = { id: v.transacao_id, hora: v.created_at, total: 0, forma_pagamento: v.forma_pagamento, itens: [] };
    acc[v.transacao_id].total += parseFloat(v.total_item);
    acc[v.transacao_id].itens.push(v);
    return acc;
  }, {});

  const copiarListaReposicao = () => {
    let texto = "*📦 LISTA DE REPOSIÇÃO (BANCA)*\n\n";
    Object.entries(reposicaoAgrupada).forEach(([nome, itens]) => {
      texto += `*${nome}*\n`;
      itens.forEach(p => {
        // Visual Invertido pro WhatsApp também!
        texto += `▫️ Tam: ${p.tam} | ${p.cor} ➔ Puxar: ${p.repor}\n`;
      });
      texto += "\n";
    });
    navigator.clipboard.writeText(texto);
    alert("Lista copiada para o WhatsApp!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-gray-50 w-full max-w-xl h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        <div className="bg-white border-b border-gray-200 p-5 flex justify-between items-center z-10 shrink-0">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">📊 Painel Diário</h2>
          <button onClick={fechar} className="bg-gray-100 hover:bg-gray-200 text-gray-600 w-8 h-8 rounded-full font-bold active:scale-95 transition-colors">X</button>
        </div>

        <div className="flex p-2 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setAbaAtiva('resumo')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-colors ${abaAtiva === 'resumo' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Visão Geral</button>
          <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-colors ${abaAtiva === 'historico' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Histórico por Cliente</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-8">
          
          {abaAtiva === 'resumo' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Faturamento Hoje</p>
                  <p className="text-2xl font-black text-green-600">R$ {faturamentoTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Peças Vendidas</p>
                  <p className="text-2xl font-black text-blue-600">{pecasVendidas} un.</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-gray-700 flex items-center gap-2">📦 Precisa Repor na Banca:</h3>
                  {reposicaoNecessaria.length > 0 && (
                    <button onClick={copiarListaReposicao} className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 shadow-sm flex items-center gap-1">✈️ Enviar Lista</button>
                  )}
                </div>

                {reposicaoNecessaria.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl text-center font-bold">A banca está 100% abastecida! ✨</div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(reposicaoAgrupada).map(([nome, itens]) => (
                      <div key={nome} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                          <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight">▼ {nome}</h4>
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100">{itens.reduce((sum, i) => sum + i.repor, 0)} pçs p/ repor</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {itens.map(p => (
                            <div key={p.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                              <div>
                                {/* 🔄 VISUAL INVERTIDO (Tamanho ➔ Cor) */}
                                <p className="font-bold text-gray-800 text-sm">Tam: <span className="text-blue-600 font-black">{p.tam}</span> <span className="text-gray-300 font-normal mx-1">|</span> {p.cor}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Saco {p.saco || '-'}</p>
                                <p className="font-black text-red-600 text-sm">Puxar {p.repor}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {abaAtiva === 'historico' && (
            <div className="space-y-4 animate-fade-in">
              {Object.values(transacoes).length === 0 ? (
                <div className="text-center text-gray-400 font-bold p-10">Nenhuma venda registrada hoje.</div>
              ) : (
                Object.values(transacoes).sort((a,b) => new Date(b.hora) - new Date(a.hora)).map((t, index) => (
                  <div key={t.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                      <span className="font-black text-gray-800">Venda #{Object.values(transacoes).length - index}</span>
                      <span className="text-xs font-bold text-gray-400">{new Date(t.hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {t.itens.map(item => (
                        <div key={item.id} className="flex justify-between text-xs md:text-sm">
                          {/* Histórico também padronizado Tam | Cor */}
                          <span className="text-gray-600"><span className="font-bold text-gray-900">{item.quantidade}x</span> {item.produto_nome} (Tam: {item.produto_tam} | {item.produto_cor})</span>
                          <span className="font-bold text-gray-800">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${t.forma_pagamento === 'PIX' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'}`}>
                        PAGO EM: {t.forma_pagamento}
                      </span>
                      <span className="font-black text-lg text-gray-900">R$ {t.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}