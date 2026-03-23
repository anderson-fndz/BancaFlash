import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import ModalEdicaoVenda from './ModalEdicaoVenda'; 
import { X, TrendingUp, ShoppingBag, CreditCard, Banknote, Send, PackageSearch, Pencil, Trash2, Clock, BarChart2, ReceiptText, ChevronDown, AlertTriangle } from 'lucide-react';

export default function ModalResumoDia({ aberto, fechar, produtos }) { 
  const [vendasHoje, setVendasHoje] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('GERAL'); 

  // ✨ CONTROLES DE SANFONA ✨
  const [gruposExpandidos, setGruposExpandidos] = useState({}); // Para o histórico
  const [reposicaoExpandida, setReposicaoExpandida] = useState({}); // Para a reposição

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

  const vendasAgrupadas = Object.values(vendasHoje.reduce((acc, venda) => {
    const chave = venda.created_at ? venda.created_at.substring(0, 16) : venda.id; 
    
    if (!acc[chave]) {
      acc[chave] = {
        id_grupo: chave,
        data: venda.created_at,
        itens: [],
        total: 0,
        pagamentos: new Set()
      };
    }
    acc[chave].itens.push(venda);
    acc[chave].total += parseFloat(venda.total_item);
    acc[chave].pagamentos.add(venda.forma_pagamento);
    return acc;
  }, {})).sort((a, b) => new Date(b.data) - new Date(a.data));

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
    const toastId = toast.loading(mensagemCarregamento);
    try {
      const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: perfil } = await supabase.from('perfil').select('telegram_chat_id').eq('user_id', user.id).single();
      const chatId = perfil?.telegram_chat_id;

      if (!token) { toast.error("Erro: Bot não configurado.", { id: toastId }); return; }
      if (!chatId) { toast.error("Vincule seu Telegram nas Configurações!", { id: toastId }); return; }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensagemTexto, parse_mode: 'Markdown' })
      });

      if (response.ok) toast.success("Mensagem enviada pro Telegram!", { id: toastId });
      else throw new Error("Erro na API do Telegram");
    } catch (error) {
      toast.error("Falha ao enviar mensagem.", { id: toastId });
    }
  };

  const enviarResumoVendasTelegram = () => {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let mensagem = `📊 *RESUMO DO DIA (${dataHoje})* 📊\n\n`;
    mensagem += `💰 *Faturamento:* R$ ${faturamentoHoje.toFixed(2)}\n`;
    mensagem += `👕 *Peças Vendidas:* ${pecasVendidas} un.\n\n`;
    mensagem += `💳 *PIX:* R$ ${totalPix.toFixed(2)}\n`;
    mensagem += `💵 *DINHEIRO:* R$ ${totalDinheiro.toFixed(2)}\n\n`;
    mensagem += `-------------------------------\n📋 *ITENS VENDIDOS:*\n\n`;

    const produtosList = Object.keys(itensVendidosAgrupados);
    if (produtosList.length === 0) mensagem += `Nenhuma venda hoje.\n`;
    else produtosList.forEach(prod => { mensagem += `🔸 ${prod}: *${itensVendidosAgrupados[prod]} un.*\n`; });
    
    dispararMensagemTelegram(mensagem, "Enviando Resumo Financeiro...");
  };

  const enviarReposicaoTelegram = () => {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let mensagem = `📦 *LISTA DE REPOSIÇÃO (${dataHoje})* 📦\n\n`;
    
    const produtosRepor = Object.keys(listaReposicao);
    if (produtosRepor.length === 0) mensagem += `✅ Nenhuma reposição necessária.\n`;
    else {
      produtosRepor.forEach(produto => {
        mensagem += `🔶 *${produto}*\n`;
        const tamanhos = listaReposicao[produto];
        Object.keys(tamanhos).sort(ordenarTamanhos).forEach(tam => {
          mensagem += `  ◾ *Tam: ${tam}*\n`;
          Object.keys(tamanhos[tam]).sort().forEach(cor => {
            const pOriginal = produtos.find(p => p.nome === produto && p.tam === tam && p.cor === cor);
            const zerou = (pOriginal?.estoque_banca || 0) <= 0;
            mensagem += `    ▫️ ${tamanhos[tam][cor]}x ${cor} ${zerou ? '⚠️ *ZEROU NA BANCA*' : ''}\n`;
          });
        });
        mensagem += `\n`;
      });
    }
    dispararMensagemTelegram(mensagem, "Enviando Lista de Reposição...");
  };

  const abrirEdicaoGrupo = (itensDoGrupo) => {
    setVendaSendoEditada(itensDoGrupo); 
    setModalEdicaoAberto(true);
  };

  const confirmarExclusaoGrupo = (grupo) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Deseja excluir a Transação Inteira (R$ {grupo.total.toFixed(2)})?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
          <button onClick={() => { toast.dismiss(t.id); executarExclusaoEmMassa(grupo.itens); }} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors shadow-sm">Sim, Excluir Tudo</button>
        </div>
      </div>
    ), { duration: 6000, id: `confirm-grupo-${grupo.id_grupo}` }); 
  };

  const executarExclusaoEmMassa = async (itens) => {
    const toastId = toast.loading("Apagando transação...");
    const ids = itens.map(item => item.id);
    
    const { error } = await supabase.from('vendas').delete().in('id', ids);
    
    if (!error) {
      toast.success("Transação apagada com sucesso!", { id: toastId });
      buscarVendasDeHoje(); 
    } else {
      toast.error("Erro ao apagar transação.", { id: toastId });
    }
  };

  const toggleSanfona = (id) => {
    setGruposExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ✨ NOVA FUNÇÃO PARA SANFONA DE REPOSIÇÃO ✨
  const toggleSanfonaReposicao = (nome) => {
    setReposicaoExpandida(prev => ({ ...prev, [nome]: !prev[nome] }));
  };

  if (!aberto) return null;

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity ${modalEdicaoAberto ? 'hidden' : 'animate-fade-in'}`}>
        <div className="bg-slate-50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-blue-600" size={24} />
              Fechamento do Dia
            </h2>
            <button onClick={fechar} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pt-4 bg-white shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4">
              <button onClick={() => setAbaAtiva('GERAL')} className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${abaAtiva === 'GERAL' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
                <TrendingUp size={16} /> Visão Geral
              </button>
              <button onClick={() => setAbaAtiva('HISTORICO')} className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${abaAtiva === 'HISTORICO' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
                <ReceiptText size={16} /> Histórico de Vendas
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
            {carregando ? (
              <div className="text-center py-10 font-bold text-slate-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Calculando fechamento...
              </div>
            ) : abaAtiva === 'GERAL' ? (
              <div className="space-y-6 animate-fade-in">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-emerald-200 p-4 rounded-2xl bg-emerald-50 shadow-sm relative overflow-hidden">
                    <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-emerald-500 opacity-10" size={80} />
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 relative z-10">Faturamento Total</p>
                    <p className="text-2xl md:text-3xl font-black text-emerald-700 truncate relative z-10">R$ {faturamentoHoje.toFixed(2)}</p>
                  </div>
                  <div className="border border-blue-200 p-4 rounded-2xl bg-blue-50 shadow-sm relative overflow-hidden">
                    <ShoppingBag className="absolute right-[-10px] bottom-[-10px] text-blue-500 opacity-10" size={80} />
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 relative z-10">Peças Vendidas</p>
                    <p className="text-2xl md:text-3xl font-black text-blue-700 relative z-10">{pecasVendidas} <span className="text-sm font-bold opacity-70">un.</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 rounded-2xl bg-white shadow-sm flex justify-between items-center group hover:border-teal-300 transition-colors">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-teal-600">Em PIX</p>
                      <p className="text-lg font-black text-slate-800">R$ {totalPix.toFixed(2)}</p>
                    </div>
                    <CreditCard className="text-slate-300 group-hover:text-teal-500 transition-colors" size={28} />
                  </div>
                  <div className="border border-slate-200 p-4 rounded-2xl bg-white shadow-sm flex justify-between items-center group hover:border-emerald-300 transition-colors">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600">Em Dinheiro</p>
                      <p className="text-lg font-black text-slate-800">R$ {totalDinheiro.toFixed(2)}</p>
                    </div>
                    <Banknote className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={28} />
                  </div>
                </div>

                <button onClick={enviarResumoVendasTelegram} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-500/30 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Send size={20} /> Enviar Resumo Financeiro
                </button>

                {/* ✨ REPOSIÇÃO COM SANFONA E FILTRO DE BANCA ✨ */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                      <PackageSearch size={18} className="text-amber-500" /> Reposição Inteligente
                    </h3>
                    <button onClick={enviarReposicaoTelegram} className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-colors active:scale-95 shadow-sm">
                      <Send size={14} /> Enviar Lista
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {Object.keys(listaReposicao).length === 0 ? (
                      <p className="text-center text-slate-400 font-bold text-sm py-4">Nenhuma venda de catálogo hoje.</p>
                    ) : (
                      Object.keys(listaReposicao).map(produto => {
                        const isExpandido = reposicaoExpandida[produto];
                        const tamanhos = listaReposicao[produto];
                        
                        let totalProduto = 0;
                        let temCritico = false;

                        Object.keys(tamanhos).forEach(tam => {
                          Object.keys(tamanhos[tam]).forEach(cor => {
                            totalProduto += tamanhos[tam][cor];
                            const pOrig = produtos.find(p => p.nome === produto && p.tam === tam && p.cor === cor);
                            if ((pOrig?.estoque_banca || 0) <= 0) temCritico = true;
                          });
                        });

                        return (
                          <div key={produto} className={`border rounded-xl overflow-hidden transition-all ${temCritico ? 'border-red-200' : 'border-slate-100'}`}>
                            {/* HEADER DA SANFONA REPOSIÇÃO */}
                            <button 
                              onClick={() => toggleSanfonaReposicao(produto)}
                              className={`w-full p-3 flex justify-between items-center transition-colors ${temCritico ? 'bg-red-50/50 hover:bg-red-100/50' : 'bg-slate-50/50 hover:bg-slate-100/50'}`}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isExpandido ? 'rotate-180' : ''}`} />
                                <span className={`font-black uppercase text-xs ${temCritico ? 'text-red-700' : 'text-slate-800'}`}>{produto}</span>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-md ${temCritico ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                {totalProduto} pçs p/ repor
                              </span>
                            </button>

                            {/* CONTEÚDO DA SANFONA REPOSIÇÃO */}
                            {isExpandido && (
                              <div className="p-3 space-y-3 bg-white animate-fade-in">
                                {Object.keys(tamanhos).sort(ordenarTamanhos).map(tam => (
                                  <div key={tam} className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shadow-sm">
                                    <div className="bg-slate-100/50 px-3 py-1.5 border-b border-slate-100">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamanho: <span className="text-slate-800">{tam}</span></span>
                                    </div>
                                    <div className="px-3 py-2 space-y-1">
                                      {Object.keys(tamanhos[tam]).sort().map(cor => {
                                        const pOriginal = produtos.find(p => p.nome === produto && p.tam === tam && p.cor === cor);
                                        const zerou = (pOriginal?.estoque_banca || 0) <= 0;
                                        return (
                                          <div key={cor} className="flex justify-between items-center text-xs">
                                            <span className={`font-bold ${zerou ? 'text-red-600' : 'text-slate-600'}`}>{cor}</span>
                                            <div className="flex items-center gap-2">
                                              {zerou && <AlertTriangle size={12} className="text-red-500" />}
                                              <span className={`font-black ${zerou ? 'text-red-600' : 'text-slate-800'}`}>{tamanhos[tam][cor]} un.</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* HISTÓRICO ORIGINAL MANTIDO */
              <div className="space-y-4 animate-fade-in pb-4">
                {vendasAgrupadas.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-10">Nenhuma venda registrada hoje.</p>
                ) : (
                  vendasAgrupadas.map((grupo, index) => {
                    const isExpandido = gruposExpandidos[grupo.id_grupo];
                    return (
                      <div key={grupo.id_grupo} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center flex-wrap gap-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleSanfona(grupo.id_grupo)}>
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                              #{vendasAgrupadas.length - index}
                            </div>
                            <div>
                              <span className="font-black text-slate-800 text-sm block leading-none mb-1">Venda Completa</span>
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Clock size={10} /> {new Date(grupo.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-auto">
                            <div className="text-right">
                              <span className="font-black text-emerald-600 text-lg block leading-none mb-1">R$ {grupo.total.toFixed(2)}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{Array.from(grupo.pagamentos).join(' + ')}</span>
                            </div>
                            <div className="flex gap-1.5 border-l border-slate-200 pl-4" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => abrirEdicaoGrupo(grupo.itens)} className="flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-8 h-8 rounded-lg transition-colors border border-blue-100 hover:border-blue-600"><Pencil size={14} strokeWidth={2.5} /></button>
                              <button onClick={() => confirmarExclusaoGrupo(grupo)} className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white w-8 h-8 rounded-lg transition-colors border border-red-100 hover:border-red-600"><Trash2 size={14} strokeWidth={2.5} /></button>
                            </div>
                            <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isExpandido ? 'rotate-180' : ''}`} size={20} />
                          </div>
                        </div>
                        {isExpandido && (
                          <div className="p-0 border-t border-slate-100 animate-fade-in">
                            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span className="flex-1">Produto</span><span className="w-20 text-right">Total</span></div>
                            {grupo.itens.map(venda => (
                              <div key={venda.id} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <div className="flex-1">
                                  <p className="font-black text-slate-700 text-sm leading-tight flex items-center gap-1.5"><span className="text-blue-600">{venda.quantidade}x</span> {venda.produto_nome}</p>
                                  <p className="font-bold text-slate-400 text-[10px] mt-0.5 uppercase tracking-wide">Tam: {venda.produto_tam} | Cor: {venda.produto_cor}</p>
                                </div>
                                <div className="w-20 text-right font-black text-slate-700 text-sm">R$ {parseFloat(venda.total_item).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalEdicaoAberto && (
        <ModalEdicaoVenda 
          venda={vendaSendoEditada}
          fechar={() => { setModalEdicaoAberto(false); setVendaSendoEditada(null); buscarVendasDeHoje(); }} 
          produtos={produtos}
          atualizarVendas={buscarVendasDeHoje} 
        />
      )}
    </>
  );
}