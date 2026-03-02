import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalResumoDia({ aberto, fechar, produtos }) {
  const [vendasHoje, setVendasHoje] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('resumo');

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [vendaEditando, setVendaEditando] = useState(null);
  const [itensDeletados, setItensDeletados] = useState([]); 

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

  const reposicaoNecessaria = produtos.map(p => {
    const repor = p.meta_banca - (p.estoque_banca || 0);
    return { ...p, repor: repor > 0 ? repor : 0 };
  }).filter(p => p.repor > 0).sort(sortLogico);

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
        texto += `▫️ Tam: ${p.tam} | ${p.cor} ➔ Puxar: ${p.repor}\n`;
      });
      texto += "\n";
    });
    navigator.clipboard.writeText(texto);
    toast.success("Lista copiada para o WhatsApp!");
  };

  const abrirEdicaoVenda = (transacao) => {
    const dataTransacao = new Date(transacao.hora);
    const horas = String(dataTransacao.getHours()).padStart(2, '0');
    const minutos = String(dataTransacao.getMinutes()).padStart(2, '0');

    setVendaEditando({
      transacao_id: transacao.id,
      hora: `${horas}:${minutos}`,
      data_original: transacao.hora,
      forma_pagamento: transacao.forma_pagamento,
      itens: JSON.parse(JSON.stringify(transacao.itens)) 
    });
    setItensDeletados([]); 
    setModalEdicaoAberto(true);
  };

  const atualizarItemVenda = (index, campo, valor) => {
    const novosItens = [...vendaEditando.itens];
    
    if (campo === 'preco_unitario') {
      const precoNumerico = parseFloat(valor) || 0;
      novosItens[index][campo] = precoNumerico;
      novosItens[index].total_item = novosItens[index].quantidade * precoNumerico;
    } else {
      novosItens[index][campo] = valor.toUpperCase();
    }
    
    setVendaEditando({ ...vendaEditando, itens: novosItens });
  };

  // ✨ 1. RECALCULAR A VENDA INTEIRA (Puxa do Banco)
  const recalcularPrecosEditando = (tipo) => {
    const novosItens = vendaEditando.itens.map(item => {
       const prodOriginal = produtos.find(p => p.nome === item.produto_nome) || {};
       const precoBase = prodOriginal.preco || item.preco_unitario; 
       const precoAtacado = prodOriginal.preco_atacado || precoBase;
       
       const novoPreco = tipo === 'ATACADO' ? precoAtacado : precoBase;
       return { ...item, preco_unitario: novoPreco, total_item: novoPreco * item.quantidade };
    });
    setVendaEditando({ ...vendaEditando, itens: novosItens });
    toast.success(`Tudo recalculado para ${tipo}!`);
  };

  // ✨ 2. APLICAR PREÇO A TODOS DO MESMO MODELO
  const aplicarPrecoATodos = (nomeProduto, preco) => {
    const novosItens = vendaEditando.itens.map(item => {
      if (item.produto_nome === nomeProduto) {
        const precoNum = parseFloat(preco) || 0;
        return { ...item, preco_unitario: precoNum, total_item: precoNum * item.quantidade };
      }
      return item;
    });
    setVendaEditando({ ...vendaEditando, itens: novosItens });
    toast.success(`R$ ${parseFloat(preco).toFixed(2)} aplicado em todos os ${nomeProduto}!`);
  };

  const alterarQtdItem = (index, delta) => {
    const novosItens = [...vendaEditando.itens];
    const novaQtd = novosItens[index].quantidade + delta;
    if (novaQtd > 0) {
      novosItens[index].quantidade = novaQtd;
      novosItens[index].total_item = novaQtd * novosItens[index].preco_unitario;
      setVendaEditando({ ...vendaEditando, itens: novosItens });
    }
  };

  const removerItem = (index) => {
    const novosItens = [...vendaEditando.itens];
    const removido = novosItens.splice(index, 1)[0];
    
    if (!String(removido.id).startsWith('NOVO_')) {
      setItensDeletados([...itensDeletados, removido.id]);
    }
    
    setVendaEditando({ ...vendaEditando, itens: novosItens });
  };

  const adicionarNovaPeca = () => {
    const baseProduto = vendaEditando.itens[0] || { produto_nome: '', preco_unitario: 0 };
    const novoItem = {
      id: `NOVO_${Date.now()}`, 
      produto_nome: baseProduto.produto_nome,
      produto_cor: '',
      produto_tam: '',
      quantidade: 1,
      preco_unitario: baseProduto.preco_unitario,
      total_item: baseProduto.preco_unitario,
      forma_pagamento: vendaEditando.forma_pagamento
    };
    setVendaEditando({ ...vendaEditando, itens: [...vendaEditando.itens, novoItem] });
  };

  const salvarEdicaoVenda = async () => {
    if (vendaEditando.itens.length === 0) {
      toast.error('A venda não pode ficar vazia. Exclua a transação se necessário.');
      return;
    }

    const loadingId = toast.loading('Atualizando venda...');

    try {
      const novaData = new Date(vendaEditando.data_original);
      const [horas, minutos] = vendaEditando.hora.split(':');
      novaData.setHours(horas, minutos);

      if (itensDeletados.length > 0) {
        await supabase.from('vendas').delete().in('id', itensDeletados);
      }

      for (const item of vendaEditando.itens) {
        if (String(item.id).startsWith('NOVO_')) {
          const novoRegistro = {
            transacao_id: vendaEditando.transacao_id,
            produto_nome: item.produto_nome.trim().toUpperCase(),
            produto_cor: item.produto_cor.trim().toUpperCase() || 'PENDENTE',
            produto_tam: item.produto_tam.trim().toUpperCase(),
            quantidade: item.quantidade,
            preco_unitario: parseFloat(item.preco_unitario) || 0,
            total_item: item.quantidade * (parseFloat(item.preco_unitario) || 0),
            forma_pagamento: vendaEditando.forma_pagamento,
            created_at: novaData.toISOString()
          };
          await supabase.from('vendas').insert([novoRegistro]);
        } else {
          await supabase.from('vendas')
            .update({
              produto_nome: item.produto_nome.trim().toUpperCase(),
              produto_cor: item.produto_cor.trim().toUpperCase(),
              produto_tam: item.produto_tam.trim().toUpperCase(),
              quantidade: item.quantidade,
              preco_unitario: parseFloat(item.preco_unitario) || 0,
              total_item: item.quantidade * (parseFloat(item.preco_unitario) || 0)
            })
            .eq('id', item.id);
        }
      }

      await supabase.from('vendas')
        .update({ 
          created_at: novaData.toISOString(),
          forma_pagamento: vendaEditando.forma_pagamento 
        })
        .eq('transacao_id', vendaEditando.transacao_id);

      await buscarVendasDoDia();
      setModalEdicaoAberto(false);
      toast.success('Venda corrigida com sucesso!', { id: loadingId });

    } catch (error) {
      toast.error('Erro ao editar venda.', { id: loadingId });
      console.error(error);
    }
  };

  const nomesProdutosCadastrados = [...new Set(produtos.map(p => p.nome))].sort();

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
                  <div key={t.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-colors group relative">
                    
                    <button 
                      onClick={() => abrirEdicaoVenda(t)}
                      className="absolute -top-3 -right-3 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white border-2 border-white shadow-md p-2 rounded-xl transition-all font-black text-xs active:scale-95"
                    >
                      ✏️ EDITAR
                    </button>

                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 pr-8">
                      <span className="font-black text-gray-800">Venda #{Object.values(transacoes).length - index}</span>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{new Date(t.hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="space-y-1.5 mb-4">
                      {t.itens.map(item => (
                        <div key={item.id} className="flex justify-between text-xs md:text-sm border-l-2 border-transparent hover:border-blue-300 pl-2 transition-all">
                          <span className="text-gray-600"><span className="font-bold text-gray-900">{item.quantidade}x</span> {item.produto_nome} (Tam: {item.produto_tam} | {item.produto_cor})</span>
                          <span className="font-bold text-gray-800">R$ {parseFloat(item.total_item).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
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

      {modalEdicaoAberto && vendaEditando && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setModalEdicaoAberto(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 animate-fade-in flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
              <h3 className="font-black text-gray-800 flex items-center gap-2">✏️ Corrigir Venda</h3>
              <button onClick={() => setModalEdicaoAberto(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
            </div>

            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-4">
              
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 shrink-0">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Horário</label>
                  <input 
                    type="time" 
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold mt-1 focus:border-blue-500 outline-none text-center" 
                    value={vendaEditando.hora} 
                    onChange={e => setVendaEditando({...vendaEditando, hora: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Pagamento</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg font-bold mt-1 focus:border-blue-500 outline-none text-center bg-white"
                    value={vendaEditando.forma_pagamento}
                    onChange={e => setVendaEditando({...vendaEditando, forma_pagamento: e.target.value})}
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTÃO">Cartão</option>
                  </select>
                </div>
              </div>

              <div>
                {/* ✨ BOTÕES GLOBAIS DE VAREJO E ATACADO */}
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                  <p className="text-xs font-black text-gray-800 uppercase">Itens da Venda:</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Recalcular:</span>
                    <button onClick={() => recalcularPrecosEditando('VAREJO')} className="text-[9px] bg-blue-100 text-blue-800 px-2 py-1 rounded shadow-sm font-black active:scale-95">VAREJO</button>
                    <button onClick={() => recalcularPrecosEditando('ATACADO')} className="text-[9px] bg-amber-100 text-amber-800 px-2 py-1 rounded shadow-sm font-black active:scale-95">ATACADO</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {vendaEditando.itens.map((item, index) => {
                    const variacoesDesteProduto = produtos.filter(p => p.nome === item.produto_nome);
                    const coresDoProduto = [...new Set(variacoesDesteProduto.map(p => p.cor))].sort();
                    const tamanhosDoProduto = [...new Set(variacoesDesteProduto.map(p => p.tam))];

                    return (
                      <div key={item.id} className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm relative">
                        
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-1 bg-white border border-blue-200 p-1 rounded-lg">
                            <button onClick={() => alterarQtdItem(index, -1)} className="w-6 h-6 rounded flex items-center justify-center text-blue-600 font-black hover:bg-blue-50 active:scale-95">-</button>
                            <span className="font-black text-sm w-5 text-center">{item.quantidade}</span>
                            <button onClick={() => alterarQtdItem(index, 1)} className="w-6 h-6 rounded flex items-center justify-center text-blue-600 font-black hover:bg-blue-50 active:scale-95">+</button>
                          </div>
                          <button onClick={() => removerItem(index)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                            🗑️ Remover
                          </button>
                        </div>

                        <div className="mb-2">
                          <label className="text-[9px] font-bold text-blue-600 uppercase">Produto</label>
                          <input 
                            type="text" 
                            list={`lista-nomes-${index}`}
                            className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none bg-white" 
                            value={item.produto_nome} 
                            onChange={e => atualizarItemVenda(index, 'produto_nome', e.target.value)} 
                          />
                          <datalist id={`lista-nomes-${index}`}>
                            {nomesProdutosCadastrados.map(n => <option key={n} value={n} />)}
                          </datalist>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="text-[9px] font-bold text-blue-600 uppercase">Cor</label>
                            <input 
                              type="text" 
                              list={`lista-cores-${index}`}
                              placeholder="Ex: AZUL"
                              className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none bg-white" 
                              value={item.produto_cor} 
                              onChange={e => atualizarItemVenda(index, 'produto_cor', e.target.value)} 
                            />
                            <datalist id={`lista-cores-${index}`}>
                              {coresDoProduto.map(c => <option key={c} value={c} />)}
                            </datalist>
                          </div>
                          
                          <div>
                            <label className="text-[9px] font-bold text-blue-600 uppercase">Tamanho</label>
                            <input 
                              type="text" 
                              list={`lista-tamanhos-${index}`}
                              className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none text-center bg-white" 
                              value={item.produto_tam} 
                              onChange={e => atualizarItemVenda(index, 'produto_tam', e.target.value)} 
                            />
                            <datalist id={`lista-tamanhos-${index}`}>
                              {tamanhosDoProduto.map(t => <option key={t} value={t} />)}
                            </datalist>
                          </div>
                        </div>

                        {/* ✨ PREÇO UNITÁRIO COM BOTÃO "APLICAR A TODOS" */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100">
                          <div>
                            <label className="text-[9px] font-bold text-blue-600 uppercase">Preço Unit. (R$)</label>
                            <div className="flex gap-1 mt-0.5">
                              <input 
                                type="number" 
                                className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs focus:border-blue-500 outline-none bg-white text-center" 
                                value={item.preco_unitario} 
                                onChange={e => atualizarItemVenda(index, 'preco_unitario', e.target.value)} 
                              />
                              <button 
                                onClick={() => aplicarPrecoATodos(item.produto_nome, item.preco_unitario)}
                                className="bg-blue-600 text-white w-8 rounded-lg flex items-center justify-center active:scale-95 shadow-sm"
                                title="Aplicar este preço a todos os itens iguais"
                              >
                                🔄
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-blue-600 uppercase">Subtotal</label>
                            <div className="w-full p-2 rounded-lg font-black text-xs mt-0.5 bg-blue-100 text-blue-900 flex items-center justify-between border border-transparent">
                              <span>R$</span>
                              <span>{parseFloat(item.total_item || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={adicionarNovaPeca}
                  className="w-full mt-3 border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 flex justify-center items-center gap-1"
                >
                  ➕ Adicionar Peça a esta venda
                </button>

              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 shrink-0">
              <button 
                onClick={salvarEdicaoVenda} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl active:scale-95 transition-colors uppercase tracking-widest shadow-md"
              >
                Salvar Correções
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}