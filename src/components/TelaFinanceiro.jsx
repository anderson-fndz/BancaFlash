import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai'; 

export default function TelaFinanceiro() {
  const [carregando, setCarregando] = useState(false);
  const [despesas, setDespesas] = useState([]);
  const [filtroTempo, setFiltroTempo] = useState('hoje'); 
  
  const [descricao, setDescricao] = useState('');
  
  const [valorFormatado, setValorFormatado] = useState('');
  const [valorRaw, setValorRaw] = useState(0);

  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [categoria, setCategoria] = useState('OUTROS');
  const [editandoId, setEditandoId] = useState(null);

  const categoriasDisponiveis = ['OUTROS', 'MERCADORIA', 'ALIMENTACAO', 'TRANSPORTE', 'FUNCIONARIOS', 'TAXAS/IMPOSTOS'];

  useEffect(() => {
    buscarDespesas();
  }, [filtroTempo]);

  const buscarDespesas = async () => {
    setCarregando(true);
    const dataLimite = new Date();
    dataLimite.setHours(0, 0, 0, 0);

    if (filtroTempo === '7dias') dataLimite.setDate(dataLimite.getDate() - 7);
    else if (filtroTempo === '30dias') dataLimite.setDate(dataLimite.getDate() - 30);

    const { data } = await supabase
      .from('despesas')
      .select('*')
      .gte('created_at', dataLimite.toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setDespesas(data);
    setCarregando(false);
  };

  const handleValorChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (!value) {
      setValorFormatado('');
      setValorRaw(0);
      return;
    }
    const numberValue = parseInt(value) / 100;
    setValorRaw(numberValue);
    setValorFormatado(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const abrirEdicao = (despesa) => {
    setDescricao(despesa.descricao);
    setValorRaw(despesa.valor);
    setValorFormatado(despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormaPagamento(despesa.forma_pagamento);
    setCategoria(despesa.categoria || 'OUTROS');
    setEditandoId(despesa.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setDescricao(''); 
    setValorRaw(0);
    setValorFormatado('');
    setFormaPagamento('DINHEIRO'); 
    setCategoria('OUTROS'); 
    setEditandoId(null);
  };

  const salvarDespesa = async () => {
    if (!descricao.trim()) {
      toast.error("O que você gastou?"); 
      return;
    }

    setCarregando(true);
    const loadingId = toast.loading(editandoId ? "Atualizando..." : "Registrando...");

    let finalDescricao = descricao.trim().toUpperCase();
    let finalValor = valorRaw;
    let finalCategoria = categoria;

    if (!editandoId && (valorRaw === 0 || categoria === 'OUTROS')) {
      toast.loading("🪄 IA organizando sua despesa...", { id: loadingId });
      
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Chave API não encontrada no .env");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `
          Você é um assistente financeiro de uma loja de roupas no Brás.
          O usuário inseriu os seguintes dados:
          Descrição digitada: "${descricao}"
          Valor preenchido: R$ ${valorRaw}

          Sua tarefa:
          1. Extraia o nome do gasto de forma limpa, curta e em maiúsculo (Ex: BURGER KING, TECIDO).
          2. Defina o valor numérico. Se o "Valor preenchido" for maior que 0, use ele. Se for 0, procure o valor dentro da "Descrição digitada". Se não achar, retorne 0.
          3. Escolha APENAS UMA destas categorias que faz sentido: OUTROS, MERCADORIA, ALIMENTACAO, TRANSPORTE, FUNCIONARIOS, TAXAS/IMPOSTOS.
          
          Retorne APENAS um JSON válido e limpo, sem formatação markdown. Exemplo:
          {"descricao": "MARMITA", "valor": 25.50, "categoria": "ALIMENTACAO"}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonLimpo = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const dadosIA = JSON.parse(jsonLimpo);

        if (dadosIA.valor > 0 && valorRaw === 0) finalValor = dadosIA.valor;
        if (dadosIA.categoria && categoriasDisponiveis.includes(dadosIA.categoria) && categoria === 'OUTROS') {
          finalCategoria = dadosIA.categoria;
        }
        if (dadosIA.descricao) finalDescricao = dadosIA.descricao.toUpperCase();
        
      } catch (error) {
        console.error("Erro na IA Silenciosa:", error);
      }
    }

    if (finalValor <= 0) {
      toast.error("Por favor, digite um valor ou anote na descrição (Ex: Lanche 25).", { id: loadingId });
      setCarregando(false);
      return;
    }

    // ✨ AQUI ESTÁ A MÁGICA: Pegamos quem está logado antes de salvar
    const { data: { user } } = await supabase.auth.getUser();

    const dadosDespesa = {
      descricao: finalDescricao, 
      valor: finalValor, 
      forma_pagamento: formaPagamento, 
      categoria: finalCategoria,
      user_id: user.id // 🔒 A CHAVE SENDO ATRELADA AO GASTO AQUI!
    };

    if (editandoId) {
      const { error } = await supabase.from('despesas').update(dadosDespesa).eq('id', editandoId);
      if (error) toast.error("Erro ao atualizar.", { id: loadingId });
      else { toast.success("Despesa atualizada!", { id: loadingId }); cancelarEdicao(); buscarDespesas(); }
    } else {
      const { error } = await supabase.from('despesas').insert([dadosDespesa]);
      if (error) toast.error("Erro ao registrar.", { id: loadingId });
      else { toast.success("Despesa registrada com Sucesso!", { id: loadingId }); cancelarEdicao(); buscarDespesas(); }
    }
    setCarregando(false);
  };

  const excluirDespesa = async (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-gray-800 text-sm">Deseja excluir este gasto?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            const loadingId = toast.loading("Apagando...");
            const { error } = await supabase.from('despesas').delete().eq('id', id);
            if (!error) { toast.success("Gasto apagado!", { id: loadingId }); buscarDespesas(); } 
            else { toast.error("Erro ao apagar.", { id: loadingId }); }
          }} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors shadow-sm">Sim, Excluir</button>
        </div>
      </div>
    ), { duration: 5000, id: `confirm-despesa-${id}` });
  };

  const totalDespesas = despesas.reduce((acc, d) => acc + parseFloat(d.valor), 0);
  const despesasPorCategoria = despesas.reduce((acc, d) => {
    const cat = d.categoria || 'OUTROS';
    acc[cat] = (acc[cat] || 0) + parseFloat(d.valor);
    return acc;
  }, {});
  const categoriasOrdenadas = Object.entries(despesasPorCategoria).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto pb-32 md:pb-8">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">💸</span> Saídas e Sangrias
          </h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] md:text-xs tracking-widest hidden md:block">
            Registre os gastos com ajuda da Inteligência Artificial
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <button onClick={() => setFiltroTempo('hoje')} className={`flex-1 min-w-[70px] px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${filtroTempo === 'hoje' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Hoje</button>
          <button onClick={() => setFiltroTempo('7dias')} className={`flex-1 min-w-[70px] px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${filtroTempo === '7dias' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>7 Dias</button>
          <button onClick={() => setFiltroTempo('30dias')} className={`flex-1 min-w-[70px] px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${filtroTempo === '30dias' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>30 Dias</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-2 relative overflow-hidden transition-colors ${editandoId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${editandoId ? 'bg-orange-500' : 'bg-red-500'}`}></div>
            
            <div className="flex justify-between items-center mb-4 md:mb-5">
              <h2 className={`font-black text-base md:text-lg uppercase flex items-center gap-2 ${editandoId ? 'text-orange-800' : 'text-gray-800'}`}>
                {editandoId ? '✏️ Editando Saída' : '📝 Lançar Despesa'}
              </h2>
              {editandoId && (
                <button onClick={cancelarEdicao} className="text-[9px] md:text-[10px] font-black uppercase text-gray-500 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">Cancelar</button>
              )}
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className={`text-[9px] md:text-[10px] font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>O que você gastou?</label>
                <input 
                  type="text" 
                  placeholder="Ex: Marmita 25, comprei tecido 1500" 
                  className="w-full p-3 md:p-4 border-2 rounded-xl font-black uppercase mt-1 focus:outline-none transition-all text-xs md:text-sm border-gray-200 focus:border-red-400" 
                  value={descricao} 
                  onChange={e => setDescricao(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && salvarDespesa()} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[9px] md:text-[10px] font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>Valor (R$)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 font-black text-red-600">R$</span>
                    <input 
                      type="text" 
                      placeholder="0,00" 
                      className="w-full p-3 md:p-4 pl-9 md:pl-11 border-2 border-gray-200 rounded-xl font-black text-red-600 focus:border-red-400 outline-none text-base md:text-lg bg-white" 
                      value={valorFormatado} 
                      onChange={handleValorChange} 
                    />
                  </div>
                </div>
                <div>
                  <label className={`text-[9px] md:text-[10px] font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>Pagamento</label>
                  <select className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none bg-white text-xs md:text-sm text-gray-700" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[9px] md:text-[10px] font-bold uppercase flex justify-between ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>
                  <span>Categoria <span className="font-normal opacity-70">(Opcional)</span></span>
                </label>
                <select className="w-full p-3 md:p-4 border-2 border-gray-100 rounded-xl font-bold mt-1 focus:border-gray-300 outline-none bg-gray-50 text-gray-600 text-xs md:text-sm" value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {categoriasDisponiveis.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <button onClick={salvarDespesa} disabled={carregando} className={`w-full text-white font-black py-3 md:py-4 rounded-xl mt-2 active:scale-95 uppercase shadow-lg transition-all text-xs md:text-sm ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}>
                {editandoId ? 'ATUALIZAR DESPESA' : 'SALVAR DESPESA'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4 md:space-y-6 mt-4 md:mt-0">
          
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800 text-xs md:text-sm uppercase">📊 Para onde foi o dinheiro?</h3>
              <p className="text-sm md:text-lg font-black text-red-600">Total: R$ {totalDespesas.toFixed(2)}</p>
            </div>
            
            {categoriasOrdenadas.length === 0 ? (
              <p className="text-xs text-gray-400 font-bold text-center py-4">Sem dados no período.</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {categoriasOrdenadas.map(([cat, val]) => {
                  const porcentagem = ((val / totalDespesas) * 100).toFixed(0);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] md:text-xs font-black text-gray-600 uppercase">{cat}</span>
                        <div className="text-right flex items-center">
                          <span className="text-[9px] md:text-[10px] text-gray-400 font-bold mr-2">{porcentagem}%</span>
                          <span className="text-xs md:text-sm font-black text-gray-800">R$ {val.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 md:h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full" style={{ width: `${porcentagem}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-gray-800 text-xs md:text-sm uppercase">📋 Histórico do Período</h3>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{despesas.length} itens</span>
            </div>
            
            <div className="p-3 md:p-4 custom-scrollbar max-h-[300px] md:max-h-[400px] overflow-y-auto">
              {despesas.length === 0 ? (
                <div className="text-center text-gray-400 font-bold py-12">Nenhum gasto registrado! 🎉</div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {despesas.map(d => (
                    <div key={d.id} className={`border-2 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 md:gap-3 transition-colors ${editandoId === d.id ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-50 hover:border-red-100'}`}>
                      <div>
                        <p className="font-black text-gray-800 text-xs md:text-sm uppercase leading-tight">{d.descricao}</p>
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                          <span className="text-[8px] md:text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-1.5 md:px-2 py-0.5 rounded border border-purple-100">{d.categoria || 'OUTROS'}</span>
                          <span className={`text-[8px] md:text-[9px] font-black uppercase px-1.5 md:px-2 py-0.5 rounded ${d.forma_pagamento === 'PIX' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                            {d.forma_pagamento}
                          </span>
                          <span className="text-[9px] md:text-[10px] font-bold text-gray-400">
                            {new Date(d.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-2 sm:mt-0 border-t sm:border-0 pt-2 sm:pt-0 border-gray-100">
                        <span className="font-black text-red-600 text-base md:text-lg mr-1 md:mr-2 whitespace-nowrap">R$ {parseFloat(d.valor).toFixed(2)}</span>
                        <button onClick={() => abrirEdicao(d)} className="w-8 h-8 md:w-9 md:h-9 bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg flex items-center justify-center active:scale-95 transition-colors text-xs md:text-base" title="Editar">✏️</button>
                        <button onClick={() => excluirDespesa(d.id)} className="w-8 h-8 md:w-9 md:h-9 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-lg flex items-center justify-center active:scale-95 transition-colors text-xs md:text-base" title="Excluir">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}