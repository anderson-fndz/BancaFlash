import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function TelaFinanceiro() {
  const [carregando, setCarregando] = useState(false);
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [despesas, setDespesas] = useState([]);
  
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [categoria, setCategoria] = useState('OUTROS');
  const [editandoId, setEditandoId] = useState(null);

  const categoriasDisponiveis = ['OUTROS', 'MERCADORIA', 'ALIMENTACAO', 'TRANSPORTE', 'FUNCIONARIOS', 'TAXAS/IMPOSTOS'];

  useEffect(() => {
    buscarDespesasHoje();
  }, []);

  const buscarDespesasHoje = async () => {
    setCarregando(true);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('despesas')
      .select('*')
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setDespesas(data);
    setCarregando(false);
  };

  // ✨ IA SMART INPUT: Analisa o texto, extrai valor e categoriza ✨
  const analisarTextoComIA = async () => {
    if (!descricao.trim()) {
      toast.error("Digite o que você gastou primeiro!");
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Chave da IA (VITE_GEMINI_API_KEY) não encontrada no .env!");
      return;
    }

    setAnalisandoIA(true);
    const toastId = toast.loading("🪄 A IA está lendo...");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Você é um assistente financeiro de uma loja de roupas no Brás. 
        O lojista digitou a seguinte anotação na pressa: "${descricao}"
        Essa anotação pode estar em espanhol (portunhol), com erros de digitação ou gírias.
        
        Sua tarefa:
        1. Extraia o nome do gasto de forma limpa, curta e em português (Ex: "kfe" -> "CAFE", "almuerzo" -> "ALMOCO").
        2. Extraia o valor numérico (apenas os números). Se não tiver valor na frase, retorne 0.
        3. Escolha APENAS UMA destas categorias que melhor se encaixa: OUTROS, MERCADORIA, ALIMENTACAO, TRANSPORTE, FUNCIONARIOS, TAXAS/IMPOSTOS.
        
        Retorne estritamente um JSON neste formato, sem formatação markdown, sem crases, apenas o JSON puro:
        {"descricao": "string", "valor": 0.00, "categoria": "string"}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Limpeza de segurança caso a IA retorne markdown (```json ... ```)
      const jsonLimpo = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const dadosIA = JSON.parse(jsonLimpo);

      // Aplica os dados mágicos na tela
      if (dadosIA.descricao) setDescricao(dadosIA.descricao.toUpperCase());
      if (dadosIA.valor > 0) setValor(dadosIA.valor);
      if (dadosIA.categoria && categoriasDisponiveis.includes(dadosIA.categoria)) {
        setCategoria(dadosIA.categoria);
      }

      toast.success("Mágica feita! Confira e salve.", { id: toastId });
    } catch (error) {
      console.error("Erro na IA:", error);
      toast.error("A IA ficou confusa. Preencha manualmente.", { id: toastId });
    }
    setAnalisandoIA(false);
  };

  const abrirEdicao = (despesa) => {
    setDescricao(despesa.descricao);
    setValor(despesa.valor);
    setFormaPagamento(despesa.forma_pagamento);
    setCategoria(despesa.categoria || 'OUTROS');
    setEditandoId(despesa.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setDescricao(''); setValor(''); setFormaPagamento('DINHEIRO'); setCategoria('OUTROS'); setEditandoId(null);
  };

  const salvarDespesa = async () => {
    if (!descricao.trim() || !valor || parseFloat(valor) <= 0) {
      toast.error("Preencha a descrição e um valor válido!"); return;
    }
    setCarregando(true);
    const loadingId = toast.loading(editandoId ? "Atualizando..." : "Registrando...");

    const dadosDespesa = {
      descricao: descricao.trim().toUpperCase(), 
      valor: parseFloat(valor), 
      forma_pagamento: formaPagamento, 
      categoria: categoria
    };

    if (editandoId) {
      const { error } = await supabase.from('despesas').update(dadosDespesa).eq('id', editandoId);
      if (error) toast.error("Erro ao atualizar.", { id: loadingId });
      else { toast.success("Despesa atualizada!", { id: loadingId }); cancelarEdicao(); buscarDespesasHoje(); }
    } else {
      const { error } = await supabase.from('despesas').insert([dadosDespesa]);
      if (error) toast.error("Erro ao registrar.", { id: loadingId });
      else { toast.success("Despesa registrada!", { id: loadingId }); cancelarEdicao(); buscarDespesasHoje(); }
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
            if (!error) {
              toast.success("Gasto apagado!", { id: loadingId });
              buscarDespesasHoje();
            } else {
              toast.error("Erro ao apagar.", { id: loadingId });
            }
          }} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-colors shadow-sm">Sim, Excluir</button>
        </div>
      </div>
    ), { duration: 5000, id: `confirm-despesa-${id}` });
  };

  return (
    <div className="p-3 md:p-8 animate-fade-in max-w-4xl mx-auto pb-32 md:pb-8">
      
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2 md:gap-3">
          <span className="text-3xl md:text-4xl">💸</span> Lançar Saídas
        </h1>
        <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] md:text-xs tracking-widest hidden md:block">
          Registre os gastos com ajuda da Inteligência Artificial
        </p>
      </div>

      <div className="space-y-6">
        
        {/* FORMULÁRIO OPERACIONAL */}
        <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-2 relative overflow-hidden transition-colors ${editandoId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <div className={`absolute top-0 left-0 w-full h-1 ${editandoId ? 'bg-orange-500' : 'bg-red-500'}`}></div>
          
          <div className="flex justify-between items-center mb-4 md:mb-5">
            <h2 className={`font-black text-base md:text-lg uppercase flex items-center gap-2 ${editandoId ? 'text-orange-800' : 'text-gray-800'}`}>
              {editandoId ? '✏️ Editando Saída' : '📝 Nova Despesa'}
            </h2>
            {editandoId && (
              <button onClick={cancelarEdicao} className="text-[9px] md:text-[10px] font-black uppercase text-gray-500 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">Cancelar</button>
            )}
          </div>

          <div className="space-y-3 md:space-y-4">
            
            {/* ✨ CAMPO DE DESCRIÇÃO COM BOTÃO DA IA ✨ */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-[9px] md:text-[10px] font-bold uppercase text-gray-500">O que você gastou?</label>
                <button 
                  onClick={analisarTextoComIA}
                  disabled={analisandoIA || !descricao}
                  className={`text-[9px] md:text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${descricao ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95 cursor-pointer shadow-sm border border-purple-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent'}`}
                  title="A IA vai ler o texto, preencher o valor e escolher a categoria sozinha!"
                >
                  {analisandoIA ? '⏳ PENSANDO...' : '🪄 AUTO-PREENCHER (IA)'}
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Ex: kfe 5 contos, comprei linha por 1500" 
                className={`w-full p-3 md:p-4 border-2 rounded-xl font-black uppercase focus:outline-none transition-all text-xs md:text-sm ${analisandoIA ? 'border-purple-400 bg-purple-50 text-purple-900 animate-pulse' : 'border-gray-200 focus:border-red-400'}`} 
                value={descricao} 
                onChange={e => setDescricao(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && analisarTextoComIA()}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] md:text-[10px] font-bold uppercase text-gray-500">Valor (R$)</label>
                <input type="number" placeholder="0.00" className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl font-black mt-1 text-red-600 focus:border-red-400 outline-none text-base md:text-lg bg-white" value={valor} onChange={e => setValor(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-bold uppercase text-gray-500">Pagamento</label>
                <select className="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none bg-white text-xs md:text-sm text-gray-700" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] md:text-[10px] font-bold uppercase text-gray-400 flex justify-between">
                <span>Categoria <span className="font-normal opacity-70">(A IA preenche pra você)</span></span>
              </label>
              <select className="w-full p-3 md:p-4 border-2 border-gray-100 rounded-xl font-bold mt-1 focus:border-gray-300 outline-none bg-gray-50 text-gray-600 text-xs md:text-sm" value={categoria} onChange={e => setCategoria(e.target.value)}>
                {categoriasDisponiveis.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <button onClick={salvarDespesa} disabled={carregando || analisandoIA} className={`w-full text-white font-black py-3 md:py-4 rounded-xl mt-2 active:scale-95 uppercase shadow-lg transition-all text-xs md:text-sm ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}>
              {editandoId ? 'ATUALIZAR DESPESA' : 'SALVAR DESPESA'}
            </button>
          </div>
        </div>

        {/* HISTÓRICO RÁPIDO DO DIA */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-black text-gray-800 text-xs md:text-sm uppercase">📋 Histórico de Hoje</h3>
            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{despesas.length} itens</span>
          </div>
          
          <div className="p-3 md:p-5 custom-scrollbar max-h-[400px] overflow-y-auto">
            {despesas.length === 0 ? (
              <div className="text-center text-gray-400 font-bold py-10 opacity-70">Nenhum gasto anotado hoje. Tudo no azul! ✌️</div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {despesas.map(d => (
                  <div key={d.id} className={`border-2 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 transition-colors group ${editandoId === d.id ? 'bg-orange-50 border-orange-300' : 'bg-white hover:border-red-100'}`}>
                    <div>
                      <p className="font-black text-gray-800 text-xs md:text-sm uppercase leading-tight">{d.descricao}</p>
                      <div className="flex gap-2 mt-1.5 md:mt-2">
                        {d.categoria !== 'OUTROS' && (
                          <span className="text-[8px] md:text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{d.categoria}</span>
                        )}
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{d.forma_pagamento}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-2 sm:mt-0 border-t sm:border-0 pt-2 sm:pt-0 border-gray-50">
                      <span className="font-black text-red-600 text-base md:text-lg mr-2">R$ {parseFloat(d.valor).toFixed(2)}</span>
                      <button onClick={() => abrirEdicao(d)} className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg md:rounded-xl flex items-center justify-center transition-colors">✏️</button>
                      <button onClick={() => excluirDespesa(d.id)} className="w-8 h-8 md:w-10 md:h-10 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-lg md:rounded-xl flex items-center justify-center transition-colors">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}