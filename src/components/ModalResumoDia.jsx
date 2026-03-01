import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ModalResumoDia({ aberto, fechar, produtos }) {
  // === 🤖 SEUS DADOS DO TELEGRAM JÁ ESTÃO AQUI ===
  const TELEGRAM_TOKEN = '8694609661:AAHMZ0K1_JFhc3OwS1RxsWIzc3ry3Tb5wVI'; 
  const CHAT_ID = '7129035616';
  // ===============================================

  const [aba, setAba] = useState('RESUMO'); 
  const [faturamento, setFaturamento] = useState(0);
  const [faturamentoPix, setFaturamentoPix] = useState(0);
  const [faturamentoDinheiro, setFaturamentoDinheiro] = useState(0);
  const [pecasVendidas, setPecasVendidas] = useState(0);
  const [todasAsVendas, setTodasAsVendas] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [enviandoMsg, setEnviandoMsg] = useState(false);

  useEffect(() => {
    if (aberto) buscarVendasDeHoje();
  }, [aberto]);

  const buscarVendasDeHoje = async () => {
    setCarregandoDados(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      const totalGrana = data.reduce((acc, v) => acc + parseFloat(v.total_item), 0);
      const totalPecas = data.reduce((acc, v) => acc + parseInt(v.quantidade), 0);
      let granaPix = 0;
      let granaDinheiro = 0;

      data.forEach(v => {
        const valor = parseFloat(v.total_item);
        if (v.forma_pagamento === 'PIX') granaPix += valor;
        else if (v.forma_pagamento === 'DINHEIRO') granaDinheiro += valor;
        else granaPix += valor; 
      });

      setFaturamento(totalGrana);
      setFaturamentoPix(granaPix);
      setFaturamentoDinheiro(granaDinheiro);
      setPecasVendidas(totalPecas);
      setTodasAsVendas(data); 
    }
    setCarregandoDados(false);
  };

  const reposicao = produtos.filter(p => (p.estoque_banca || 0) < (p.meta_banca || 2));

// ==========================================
  // 🤖 FUNÇÃO QUE MANDA MENSAGEM PRO TELEGRAM
  // ==========================================
  const enviarProTelegram = async (tipo) => {
    setEnviandoMsg(true);
    let textoMensagem = '';
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    if (tipo === 'FECHAMENTO') {
      textoMensagem = `📊 *FECHAMENTO DE CAIXA* (${dataHoje})\n\n`;
      textoMensagem += `💰 *Faturamento Total:* R$ ${faturamento.toFixed(2)}\n`;
      textoMensagem += `💸 *PIX:* R$ ${faturamentoPix.toFixed(2)}\n`;
      textoMensagem += `💵 *Dinheiro:* R$ ${faturamentoDinheiro.toFixed(2)}\n`;
      textoMensagem += `👕 *Peças Vendidas:* ${pecasVendidas} un.\n\n`;
      textoMensagem += `⚡ _BancaFlash System_`;
    } 
    else if (tipo === 'REPOSICAO') {
      textoMensagem = `📦 *LISTA DE REPOSIÇÃO* (${dataHoje})\n`;
      
      if (reposicao.length === 0) {
        textoMensagem += `\n✅ A banca está 100% abastecida! Nenhuma reposição necessária.\n`;
      } else {
        // DUPLO AGRUPAMENTO: Primeiro por Produto, depois por Cor!
        const reposicaoAgrupada = reposicao.reduce((acc, p) => {
          if (!acc[p.nome]) acc[p.nome] = {};
          if (!acc[p.nome][p.cor]) acc[p.nome][p.cor] = [];
          acc[p.nome][p.cor].push(p);
          return acc;
        }, {});

        Object.entries(reposicaoAgrupada).forEach(([nomeProduto, coresDesteProduto]) => {
          textoMensagem += `\n👕 *${nomeProduto}*\n`; // Título do produto
          
          Object.entries(coresDesteProduto).forEach(([corProduto, itens]) => {
            textoMensagem += `  🔹 _${corProduto}_\n`; // Subtítulo da cor
            
            itens.forEach(p => {
              const qtdTrazer = (p.meta_banca || 2) - (p.estoque_banca || 0);
              const textoSaco = (p.saco && p.saco !== '-' && p.saco.trim() !== '') ? ` ➔ Saco ${p.saco}` : '';
              
              textoMensagem += `    ▪️ ${qtdTrazer}x (Tam: ${p.tam})${textoSaco}\n`;
            });
          });
        });
      }
      textoMensagem += `\n⚡ _BancaFlash System_`;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: textoMensagem,
          parse_mode: 'Markdown' 
        })
      });
      alert(`✅ ${tipo === 'FECHAMENTO' ? 'Fechamento' : 'Lista'} enviado pro seu Telegram!`);
    } catch (error) {
      alert("❌ Erro ao enviar pro Telegram. Verifica a internet.");
    }
    setEnviandoMsg(false);
  };

  if (!aberto) return null;

  const vendasAgrupadas = todasAsVendas.reduce((acc, venda) => {
    const id = venda.transacao_id || venda.created_at; 
    if (!acc[id]) acc[id] = [];
    acc[id].push(venda);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={fechar}>
      <div className="bg-gray-100 w-full md:w-[600px] h-[90vh] md:h-[85vh] rounded-t-3xl md:rounded-3xl md:mb-10 p-5 shadow-2xl flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            📊 Painel Diário {carregandoDados && <span className="text-xs text-blue-500 font-normal">Sincronizando...</span>}
          </h2>
          <button onClick={fechar} className="bg-gray-300 hover:bg-red-100 hover:text-red-500 transition-colors w-8 h-8 rounded-full font-bold text-gray-600 active:scale-95">X</button>
        </div>

        <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
          <button onClick={() => setAba('RESUMO')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'RESUMO' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Visão Geral</button>
          <button onClick={() => setAba('VENDAS')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'VENDAS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Histórico por Cliente</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-10 pr-2">
          
          {aba === 'RESUMO' && (
            <div className="animate-fade-in">
              <div className="bg-green-100 p-4 rounded-xl border border-green-200 text-center shadow-sm mb-2 relative">
                <p className="text-xs font-bold text-green-800 uppercase mb-1">Caixa Total Hoje</p>
                <p className="text-3xl font-black text-green-600">R$ {faturamento.toFixed(2)}</p>
              </div>
              
              {/* BOTÃO MÁGICO DO TELEGRAM - FECHAMENTO */}
              <button 
                onClick={() => enviarProTelegram('FECHAMENTO')}
                disabled={enviandoMsg}
                className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow active:scale-95 flex justify-center items-center gap-2 transition-all"
              >
                <span className="text-xl">✈️</span> {enviandoMsg ? 'Enviando...' : 'Enviar Fechamento p/ Telegram'}
              </button>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">PIX</p>
                  <p className="font-black text-2xl text-teal-600">R$ {faturamentoPix.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase">Dinheiro</p>
                  <p className="font-black text-2xl text-green-600">R$ {faturamentoDinheiro.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-3 border-b pb-2 mt-6">
                <h3 className="font-black text-gray-700">📦 Precisa Repor na Banca:</h3>
                {/* BOTÃO MÁGICO DO TELEGRAM - REPOSIÇÃO */}
                <button 
                  onClick={() => enviarProTelegram('REPOSICAO')}
                  disabled={enviandoMsg}
                  className="bg-gray-800 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition-colors flex items-center gap-1"
                >
                  <span>✈️</span> Enviar Lista
                </button>
              </div>

              <div className="space-y-2">
                {reposicao.length === 0 ? (
                  <div className="text-center mt-6">
                    <span className="text-4xl">🎉</span>
                    <p className="text-gray-500 font-bold mt-2">Banca 100% abastecida!</p>
                  </div>
                ) : (
                  reposicao.map(p => {
                    const qtdTrazer = (p.meta_banca || 2) - (p.estoque_banca || 0);
                    return (
                      <div key={p.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-800 uppercase text-sm">{p.nome}</p>
                          <p className="text-xs text-gray-500">{p.cor} | Tam: <span className="font-bold">{p.tam}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Saco {p.saco || '-'}</p>
                          <p className="font-black text-red-500 text-lg">Puxar {qtdTrazer}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {aba === 'VENDAS' && (
             <div className="space-y-4 animate-fade-in">
              {Object.keys(vendasAgrupadas).length === 0 ? (
                <p className="text-center text-gray-500 mt-10 font-bold">Nenhuma venda registrada hoje.</p>
              ) : (
                Object.entries(vendasAgrupadas).map(([transacao_id, itensDessaVenda], index) => {
                  const totalDesseCliente = itensDessaVenda.reduce((acc, item) => acc + parseFloat(item.total_item), 0);
                  const dataFormatada = new Date(itensDessaVenda[0].created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const metodoPagamento = itensDessaVenda[0].forma_pagamento || 'PIX';

                  return (
                    <div key={transacao_id} className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${metodoPagamento === 'PIX' ? 'bg-teal-500' : 'bg-green-500'}`}></div>
                      
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
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${metodoPagamento === 'PIX' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'}`}>
                          Pago em: {metodoPagamento}
                        </span>
                        <span className="font-black text-gray-800 text-lg">R$ {totalDesseCliente.toFixed(2)}</span>
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