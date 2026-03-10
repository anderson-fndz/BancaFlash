import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import { ArrowDownRight, Sparkles, Receipt, Trash2, Edit3, PieChart, CalendarDays } from 'lucide-react'; // ✨ Ícones Premium

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
      toast.error("Conta pra gente o que você gastou!"); 
      return;
    }

    setCarregando(true);
    const loadingId = toast.loading(editandoId ? "Atualizando..." : "Registrando...", { style: { background: '#0f172a', color: '#fff' } });

    let finalDescricao = descricao.trim().toUpperCase();
    let finalValor = valorRaw;
    let finalCategoria = categoria;

    // ✨ A Mágica da IA entra em ação aqui
    if (!editandoId && (valorRaw === 0 || categoria === 'OUTROS')) {
      toast.loading("🪄 IA lendo sua despesa...", { id: loadingId });
      
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
      toast.error("Coloca um valor aí, ou digita ele na descrição (Ex: Lanche 25).", { id: loadingId });
      setCarregando(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const dadosDespesa = {
      descricao: finalDescricao, 
      valor: finalValor, 
      forma_pagamento: formaPagamento, 
      categoria: finalCategoria,
      user_id: user.id 
    };

    if (editandoId) {
      const { error } = await supabase.from('despesas').update(dadosDespesa).eq('id', editandoId);
      if (error) toast.error("Erro ao atualizar.", { id: loadingId });
      else { toast.success("Gasto atualizado!", { id: loadingId }); cancelarEdicao(); buscarDespesas(); }
    } else {
      const { error } = await supabase.from('despesas').insert([dadosDespesa]);
      if (error) toast.error("Erro ao registrar.", { id: loadingId });
      else { toast.success("Gasto registrado!", { id: loadingId }); cancelarEdicao(); buscarDespesas(); }
    }
    setCarregando(false);
  };

  const excluirDespesa = async (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-bold text-slate-800 text-sm">Apagar esse gasto?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
          <button onClick={async () => {
            toast.dismiss(t.id);
            const loadingId = toast.loading("Apagando...");
            const { error } = await supabase.from('despesas').delete().eq('id', id);
            if (!error) { toast.success("Gasto apagado!", { id: loadingId }); buscarDespesas(); } 
            else { toast.error("Erro ao apagar.", { id: loadingId }); }
          }} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors shadow-sm">Sim, Apagar</button>
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-32 md:pb-8 flex flex-col h-full">
      
      {/* ✨ HEADER COMPACTO ✨ */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ArrowDownRight className="text-red-500" size={32} /> Saídas e Gastos
          </h1>
          <p className="text-slate-500 font-bold mt-1 text-xs tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" /> A IA organiza tudo pra você
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          {['hoje', '7dias', '30dias'].map(p => (
            <button 
              key={p} 
              onClick={() => setFiltroTempo(p)} 
              className={`flex-1 px-4 py-2 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${filtroTempo === p ? 'bg-white text-red-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              {p === 'hoje' ? 'Hoje' : p.replace('dias', ' Dias')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ✨ FORMULÁRIO DE LANÇAMENTO ✨ */}
        <div className="lg:col-span-5 space-y-6 sticky top-6">
          <div className={`p-5 md:p-6 rounded-3xl shadow-sm border transition-colors ${editandoId ? 'bg-orange-50/50 border-orange-300' : 'bg-white border-slate-200'}`}>
            
            <div className="flex justify-between items-center mb-5">
              <h2 className={`font-black text-sm md:text-base uppercase tracking-widest flex items-center gap-2 ${editandoId ? 'text-orange-700' : 'text-slate-800'}`}>
                {editandoId ? <><Edit3 size={18} /> Editando Gasto</> : <><Receipt size={18} /> Lançar Nova Despesa</>}
              </h2>
              {editandoId && (
                <button onClick={cancelarEdicao} className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors">Cancelar</button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest ${editandoId ? 'text-orange-600/80' : 'text-slate-400'}`}>O que você gastou?</label>
                <input 
                  type="text" 
                  placeholder="Ex: Marmita 25, Comprei Tecido 1500..." 
                  className={`w-full p-3.5 rounded-xl font-bold mt-1.5 outline-none transition-all text-sm md:text-base border bg-slate-50 focus:bg-white focus:ring-4 ${editandoId ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-100' : 'border-slate-200 focus:border-red-500 focus:ring-red-50 text-slate-700'}`}
                  value={descricao} 
                  onChange={e => setDescricao(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && salvarDespesa()} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest ${editandoId ? 'text-orange-600/80' : 'text-slate-400'}`}>Valor (R$)</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                    <input 
                      type="text" 
                      placeholder="0,00" 
                      className={`w-full p-3.5 pl-10 rounded-xl font-black outline-none text-base border bg-slate-50 focus:bg-white focus:ring-4 transition-all ${editandoId ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-100 text-orange-700' : 'border-slate-200 focus:border-red-500 focus:ring-red-50 text-red-600'}`}
                      value={valorFormatado} 
                      onChange={handleValorChange} 
                    />
                  </div>
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest ${editandoId ? 'text-orange-600/80' : 'text-slate-400'}`}>Como pagou?</label>
                  <select 
                    className={`w-full p-3.5 rounded-xl font-bold mt-1.5 outline-none border bg-slate-50 text-sm transition-all ${editandoId ? 'border-orange-300 focus:border-orange-500 text-orange-800' : 'border-slate-200 focus:border-red-500 text-slate-700'}`}
                    value={formaPagamento} 
                    onChange={e => setFormaPagamento(e.target.value)}
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest flex justify-between ${editandoId ? 'text-orange-600/80' : 'text-slate-400'}`}>
                  <span>Categoria</span>
                  <span className="font-normal opacity-70">Opcional</span>
                </label>
                <select 
                  className={`w-full p-3.5 rounded-xl font-bold mt-1.5 outline-none border bg-slate-50 text-sm transition-all ${editandoId ? 'border-orange-300 focus:border-orange-500 text-orange-800' : 'border-slate-200 focus:border-red-500 text-slate-700'}`}
                  value={categoria} 
                  onChange={e => setCategoria(e.target.value)}
                >
                  {categoriasDisponiveis.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {!editandoId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2">
                  <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-bold leading-tight">
                    Com preguiça de preencher tudo? Digita só "Lanche 25" lá em cima e clica em salvar. A Mágica faz o resto.
                  </p>
                </div>
              )}

              <button 
                onClick={salvarDespesa} 
                disabled={carregando} 
                className={`w-full text-white font-black py-4 rounded-xl mt-4 active:scale-95 uppercase tracking-widest text-xs shadow-md transition-all flex items-center justify-center gap-2 ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
              >
                {editandoId ? 'ATUALIZAR GASTO' : 'SALVAR GASTO'}
              </button>
            </div>
          </div>
        </div>

        {/* ✨ RESUMO E HISTÓRICO ✨ */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden p-5 md:p-6">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                <PieChart size={16} className="text-red-500" /> Resumo dos Gastos
              </h3>
              <p className="text-sm md:text-lg font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg">R$ {totalDespesas.toFixed(2)}</p>
            </div>
            
            {categoriasOrdenadas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold text-sm">Tudo limpo por aqui! Nenhum gasto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoriasOrdenadas.map(([cat, val]) => {
                  const porcentagem = ((val / totalDespesas) * 100).toFixed(0);
                  return (
                    <div key={cat} className="group">
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-red-600 transition-colors">{cat}</span>
                        <div className="text-right flex items-center">
                          <span className="text-[10px] text-slate-400 font-bold mr-2">{porcentagem}%</span>
                          <span className="text-sm font-black text-slate-800">R$ {val.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all duration-500" style={{ width: `${porcentagem}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-5 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                <CalendarDays size={16} className="text-blue-500" /> Histórico de Saídas
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">{despesas.length} itens</span>
            </div>
            
            <div className="p-4 custom-scrollbar max-h-[400px] overflow-y-auto">
              {despesas.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-bold">Nenhum registro para mostrar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {despesas.map(d => (
                    <div key={d.id} className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition-all border hover:shadow-sm ${editandoId === d.id ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      
                      <div className="flex-1">
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight truncate">{d.descricao}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{d.categoria || 'OUTROS'}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${d.forma_pagamento === 'PIX' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                            {d.forma_pagamento}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">
                            {new Date(d.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                        <span className="font-black text-red-600 text-base md:text-lg whitespace-nowrap">R$ {parseFloat(d.valor).toFixed(2)}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => abrirEdicao(d)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 flex items-center justify-center transition-colors active:scale-95" title="Editar">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => excluirDespesa(d.id)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors active:scale-95" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
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