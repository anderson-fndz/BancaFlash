import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import ModalEdicaoVenda from './ModalEdicaoVenda'; 

export default function ModalResumoDia({ aberto, fechar, produtos }) { 
  const [vendasHoje, setVendasHoje] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('GERAL'); 

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [vendaSendoEditada, setVendaSendoEditada] = useState(null);

  useEffect(() => {
    if (aberto) {
      buscarVendasDeHoje();
    }
  }, [aberto]);

  const buscarVendasDeHoje = async () => {
    setCarregando(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVendasHoje(data);
    }
    setCarregando(false);
  };

  // Cálculos de Resumo
  const faturamentoHoje = vendasHoje.reduce((acc, venda) => acc + parseFloat(venda.total_item), 0);
  const pecasVendidas = vendasHoje.reduce((acc, venda) => acc + parseInt(venda.quantidade), 0);
  const totalPix = vendasHoje.filter(v => v.forma_pagamento === 'PIX').reduce((acc, v) => acc + parseFloat(v.total_item), 0);
  const totalDinheiro = vendasHoje.filter(v => v.forma_pagamento === 'DINHEIRO').reduce((acc, v) => acc + parseFloat(v.total_item), 0);

  const itensVendidosAgrupados = vendasHoje.reduce((acc, venda) => {
    const nome = venda.produto_nome;
    if (!acc[nome]) acc[nome] = 0;
    acc[nome] += parseInt(venda.quantidade);
    return acc;
  }, {});

  const listaReposicao = vendasHoje.reduce((acc, venda) => {
    if (venda.produto_nome.startsWith('GEN-')) return acc;
    
    const nome = venda.produto_nome;
    const tam = venda.produto_tam || 'ÚNICO';
    const cor = venda.produto_cor || 'PADRÃO';
    
    if (!acc[nome]) acc[nome] = {};
    if (!acc[nome][tam]) acc[nome][tam] = {};
    
    acc[nome][tam][cor] = (acc[nome][tam][cor] || 0) + parseInt(venda.quantidade);
    return acc;
  }, {});

  // ✨ A ORDEM DE TAMANHOS DE CONFECÇÃO (O Segredo do Brás)
  const ordemTamanhos = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'EXG', 'G1', 'G2', 'G3', 'G4', 'U', 'ÚNICO', 'PADRÃO'];
  const ordenarTamanhos = (a, b) => {
    const indexA = ordemTamanhos.indexOf(a.toUpperCase());
    const indexB = ordemTamanhos.indexOf(b.toUpperCase());
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  };

  const dispararMensagemTelegram = async (mensagemTexto, mensagemCarregamento) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      toast.error("Configuração do Telegram ausente no arquivo .env!");
      return;
    }

    const toastId = toast.loading(mensagemCarregamento);

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensagemTexto, parse_mode: 'Markdown' })
      });

      if (response.ok) {
        toast.success("Mensagem enviada pro Telegram!", { id: toastId });
      } else {
        throw new Error("Erro na API do Telegram");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao enviar mensagem.", { id: toastId });
    }
  };

  const enviarResumoVendasTelegram = () => {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let mensagem = `📊 *RESUMO DE VENDAS DO DIA (${dataHoje})* 📊\n\n`;
    mensagem += `💰 *Faturamento:* R$ ${faturamentoHoje.toFixed(2)}\n`;
    mensagem += `👕 *Total de Peças:* ${pecasVendidas} un.\n\n`;
    mensagem += `💳 *PIX:* R$ ${totalPix.toFixed(2)}\n`;
    mensagem += `💵 *DINHEIRO:* R$ ${totalDinheiro.toFixed(2)}\n\n`;
    mensagem += `-------------------------------\n`;
    mensagem += `📋 *ITENS VENDIDOS:*\n\n`;

    const produtos = Object.keys(itensVendidosAgrupados);
    if (produtos.length === 0) {
      mensagem += `Nenhuma venda hoje.\n`;
    } else {
      produtos.forEach(prod => { mensagem += `🔸 ${prod}: *${itensVendidosAgrupados[prod]} un.*\n`; });
    }
    dispararMensagemTelegram(mensagem, "Enviando Resumo Financeiro...");
  };

  // ✨ REPOSIÇÃO (Tamanhos Ordenados e Ícones Limpos)
  const enviarReposicaoTelegram = () => {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let mensagem = `📦 *LISTA DE REPOSIÇÃO (${dataHoje})* 📦\n\n`;
    
    const produtosRepor = Object.keys(listaReposicao);
    if (produtosRepor.length === 0) {
      mensagem += `✅ Nenhuma reposição necessária.\n`;
    } else {
      produtosRepor.forEach(produto => {
        mensagem += `🔶 *${produto}*\n`;
        const tamanhos = listaReposicao[produto];
        
        // Ordena usando a lógica P, M, G, GG...
        Object.keys(tamanhos).sort(ordenarTamanhos).forEach(tam => {
          mensagem += `  ◾ *Tam: ${tam}*\n`;
          const cores = tamanhos[tam];
          
          Object.keys(cores).sort().forEach(cor => {
            mensagem += `    ▫️ ${cores[cor]}x ${cor}\n`;
          });
        });
        mensagem += `\n`;
      });
    }
    dispararMensagemTelegram(mensagem, "Enviando Lista de Reposição...");
  };

  const abrirEdicao = (venda) => {
    setVendaSendoEditada(venda);
    setModalEdicaoAberto(true);
  };

  const confirmarExclusao = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-gray-800 text-sm">Deseja excluir esta venda? O valor sairá do faturamento.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
          <button onClick={() => { toast.dismiss(t.id); executarExclusao(id); }} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors shadow-sm">Sim, Excluir</button>
        </div>
      </div>
    ), { duration: 6000, id: `confirm-${id}` }); 
  };

  const executarExclusao = async (id) => {
    const toastId = toast.loading("Apagando venda...");
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (!error) {
      toast.success("Venda apagada com sucesso!", { id: toastId });
      buscarVendasDeHoje(); 
    } else {
      toast.error("Erro ao apagar venda.", { id: toastId });
    }
  };

  if (!aberto) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-gray-100 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
              📊 Fechamento do Dia
            </h2>
            <button onClick={fechar} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
              X
            </button>
          </div>

          <div className="px-6 pt-4 bg-white shrink-0">
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 mb-4">
              <button onClick={() => setAbaAtiva('GERAL')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${abaAtiva === 'GERAL' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}>Visão Geral</button>
              <button onClick={() => setAbaAtiva('HISTORICO')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${abaAtiva === 'HISTORICO' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-100'}`}>Histórico por Cliente</button>
            </div>
          </div>

          <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
            {carregando ? (
              <div className="text-center py-10 font-bold text-gray-500">Calculando fechamento... ⏳</div>
            ) : abaAtiva === 'GERAL' ? (
              <div className="space-y-6 animate-fade-in">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-green-200 p-4 rounded-2xl bg-green-50 shadow-sm">
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Faturamento Total</p>
                    <p className="text-3xl font-black text-green-700 truncate">R$ {faturamentoHoje.toFixed(2)}</p>
                  </div>
                  <div className="border border-blue-200 p-4 rounded-2xl bg-blue-50 shadow-sm">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Peças Vendidas</p>
                    <p className="text-3xl font-black text-blue-700">{pecasVendidas} <span className="text-sm font-bold opacity-70">un.</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 p-4 rounded-2xl bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Em PIX</p>
                      <p className="text-lg font-black text-gray-800">R$ {totalPix.toFixed(2)}</p>
                    </div>
                    <span className="text-2xl">💳</span>
                  </div>
                  <div className="border border-gray-200 p-4 rounded-2xl bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Em Dinheiro</p>
                      <p className="text-lg font-black text-gray-800">R$ {totalDinheiro.toFixed(2)}</p>
                    </div>
                    <span className="text-2xl">💵</span>
                  </div>
                </div>

                <button onClick={enviarResumoVendasTelegram} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-500/30 uppercase tracking-widest flex items-center justify-center gap-2">
                  <span className="text-xl">📊</span> Enviar Resumo Financeiro
                </button>

                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
                  <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">📦 Precisa Repor na Banca:</h3>
                    <button onClick={enviarReposicaoTelegram} className="bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-colors active:scale-95 shadow-sm">
                      <span>✈️</span> Enviar Lista
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {Object.keys(listaReposicao).length === 0 ? (
                      <p className="text-center text-gray-400 font-bold text-sm py-4">Nenhuma venda de catálogo hoje.</p>
                    ) : (
                      Object.keys(listaReposicao).map(produto => {
                        const tamanhos = listaReposicao[produto];
                        
                        let totalProduto = 0;
                        Object.values(tamanhos).forEach(cores => {
                          totalProduto += Object.values(cores).reduce((a, b) => a + b, 0);
                        });
                        
                        return (
                          <div key={produto} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                              <h4 className="font-black text-gray-800 uppercase text-sm">▼ {produto}</h4>
                              <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{totalProduto} pçs p/ repor</span>
                            </div>
                            
                            {/* ✨ RENDERIZANDO COM A ORDEM CERTA DE ROUPA ✨ */}
                            <div className="space-y-3">
                              {Object.keys(tamanhos).sort(ordenarTamanhos).map(tam => (
                                <div key={tam} className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-100">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tamanho: <span className="text-gray-900">{tam}</span></span>
                                  </div>
                                  <div className="px-3 py-2 space-y-1">
                                    {Object.keys(tamanhos[tam]).sort().map(cor => (
                                      <div key={cor} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-700">{cor}</span>
                                        <span className="font-black text-red-600">{tamanhos[tam][cor]} un.</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {vendasHoje.length === 0 ? (
                  <p className="text-center text-gray-400 font-bold py-10">Nenhuma venda registrada hoje.</p>
                ) : (
                  vendasHoje.map((venda, index) => (
                    <div key={venda.id} className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                      
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-800 text-sm">Venda #{vendasHoje.length - index}</span>
                          <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {new Date(venda.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button onClick={() => abrirEdicao(venda)} className="flex-1 sm:flex-none bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1 border border-blue-100 hover:border-blue-600">
                            <span>✏️</span> EDITAR
                          </button>
                          <button onClick={() => confirmarExclusao(venda.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center border border-red-100 hover:border-red-600" title="Excluir Venda">
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="font-black text-gray-700 text-sm md:text-base">
                            {venda.quantidade}x {venda.produto_nome} 
                            <span className="font-bold text-gray-400 text-xs ml-1">(Tam: {venda.produto_tam} | {venda.produto_cor})</span>
                          </p>
                          <span className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-1 rounded ${venda.forma_pagamento === 'PIX' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                            PAGO EM: {venda.forma_pagamento}
                          </span>
                        </div>
                        <span className="font-black text-xl text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                          R$ {parseFloat(venda.total_item).toFixed(2)}
                        </span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {modalEdicaoAberto && (
        <ModalEdicaoVenda 
          venda={vendaSendoEditada}
          fechar={() => {
            setModalEdicaoAberto(false);
            setVendaSendoEditada(null);
          }} 
          produtos={produtos}
          atualizarVendas={buscarVendasDeHoje} 
        />
      )}
    </>
  );
}