import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function TelaFinanceiro() {
  const [despesasHoje, setDespesasHoje] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // Estados do Formulário
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  
  // ✨ NOVO: Controle de Edição
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    buscarDespesas();
  }, []);

  const buscarDespesas = async () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .gte('created_at', hoje.toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setDespesasHoje(data);
  };

  const abrirEdicao = (despesa) => {
    setDescricao(despesa.descricao);
    setValor(despesa.valor);
    setFormaPagamento(despesa.forma_pagamento);
    setEditandoId(despesa.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela suavemente pro formulário
  };

  const cancelarEdicao = () => {
    setDescricao('');
    setValor('');
    setFormaPagamento('DINHEIRO');
    setEditandoId(null);
  };

  const salvarDespesa = async () => {
    if (!descricao.trim() || !valor || parseFloat(valor) <= 0) {
      toast.error("Preencha a descrição e um valor válido!");
      return;
    }

    setCarregando(true);
    const loadingId = toast.loading(editandoId ? "Atualizando despesa..." : "Registrando saída...");

    const dadosDespesa = {
      descricao: descricao.trim().toUpperCase(),
      valor: parseFloat(valor),
      forma_pagamento: formaPagamento
    };

    if (editandoId) {
      // MODO EDIÇÃO
      const { error } = await supabase.from('despesas').update(dadosDespesa).eq('id', editandoId);
      if (error) {
        toast.error("Erro ao atualizar.", { id: loadingId });
        console.error(error);
      } else {
        toast.success("Despesa atualizada!", { id: loadingId });
        cancelarEdicao();
        await buscarDespesas();
      }
    } else {
      // MODO CRIAÇÃO
      const { error } = await supabase.from('despesas').insert([dadosDespesa]);
      if (error) {
        toast.error("Erro ao registrar despesa.", { id: loadingId });
        console.error(error);
      } else {
        toast.success("Despesa registrada!", { id: loadingId });
        cancelarEdicao();
        await buscarDespesas();
      }
    }
    setCarregando(false);
  };

  const excluirDespesa = async (id) => {
    if (window.confirm("Certeza que deseja apagar este registro de saída?")) {
      const loadingId = toast.loading("Apagando...");
      await supabase.from('despesas').delete().eq('id', id);
      await buscarDespesas();
      toast.success("Registro apagado!", { id: loadingId });
    }
  };

  const totalDespesas = despesasHoje.reduce((acc, d) => acc + parseFloat(d.valor), 0);

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-6xl mx-auto pb-32 md:pb-8">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <span className="text-4xl">💸</span> Controle Financeiro
        </h1>
        <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">
          Gestão de Saídas e Sangrias do Caixa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO: FORMULÁRIO */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className={`p-6 rounded-3xl shadow-sm border-2 relative overflow-hidden transition-colors ${editandoId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${editandoId ? 'bg-orange-500' : 'bg-red-500'}`}></div>
            
            <div className="flex justify-between items-center mb-5">
              <h2 className={`font-black text-lg uppercase flex items-center gap-2 ${editandoId ? 'text-orange-800' : 'text-gray-800'}`}>
                {editandoId ? '✏️ Editando Saída' : '📝 Registrar Nova Saída'}
              </h2>
              {editandoId && (
                <button onClick={cancelarEdicao} className="text-[10px] font-black uppercase text-gray-500 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-xs font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>Motivo / Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: CAFÉ, ROLOS DE TECIDO, MOTOBOY" 
                  className="w-full p-4 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:border-red-400 outline-none text-gray-700 bg-white transition-colors"
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>Valor (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-4 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none text-red-600 text-lg bg-white transition-colors"
                    value={valor} onChange={e => setValor(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase ${editandoId ? 'text-orange-700' : 'text-gray-500'}`}>Pagamento</label>
                  <select 
                    className="w-full p-4 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none bg-white transition-colors text-gray-700"
                    value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={salvarDespesa} disabled={carregando}
                className={`w-full text-white font-black py-4 rounded-xl mt-4 active:scale-95 transition-colors uppercase tracking-widest shadow-lg flex justify-center items-center gap-2
                  ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}
                `}
              >
                <span>{editandoId ? '🔄' : '➖'}</span> 
                {editandoId ? 'ATUALIZAR DESPESA' : 'SALVAR DESPESA'}
              </button>

              {/* LINHA DIVISÓRIA E BOTÃO DE IA (DESABILITADO PARA A PRÓXIMA FASE) */}
              {!editandoId && (
                <>
                  <div className="relative py-4 flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Ou facilite sua vida</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <button 
                    disabled
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-4 rounded-xl active:scale-95 transition-colors uppercase tracking-widest shadow-md flex justify-center items-center gap-2 opacity-60 cursor-not-allowed group relative"
                  >
                    <span className="text-xl">📸</span> 
                    LER RECIBO COM IA
                    <span className="absolute -top-3 -right-2 bg-yellow-400 text-yellow-900 text-[9px] px-2 py-1 rounded-full shadow-sm group-hover:scale-110 transition-transform">Em breve!</span>
                  </button>
                </>
              )}

            </div>
          </div>
        </div>

        {/* LADO DIREITO: HISTÓRICO E MÉTRICAS */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Gasto Hoje</p>
              <p className="text-3xl font-black text-red-600">R$ {totalDespesas.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lançamentos</p>
              <p className="text-3xl font-black text-gray-800">{despesasHoje.length} <span className="text-sm text-gray-400 font-bold">itens</span></p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800 text-sm uppercase">📋 Histórico de Hoje</h3>
            </div>
            
            <div className="p-4 custom-scrollbar max-h-[500px] overflow-y-auto">
              {despesasHoje.length === 0 ? (
                <div className="text-center text-gray-400 font-bold py-12 flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3 opacity-50">✨</span>
                  Nenhum gasto registrado hoje!
                </div>
              ) : (
                <div className="space-y-3">
                  {despesasHoje.map(d => (
                    <div key={d.id} className={`border-2 rounded-2xl p-4 shadow-sm flex justify-between items-center group transition-colors ${editandoId === d.id ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-50 hover:border-red-100'}`}>
                      <div>
                        <p className="font-black text-gray-800 text-sm uppercase leading-tight">{d.descricao}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${d.forma_pagamento === 'PIX' ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                            {d.forma_pagamento}
                          </span>
                          <span className="text-xs font-bold text-gray-400">{new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-red-600 text-lg mr-2">R$ {parseFloat(d.valor).toFixed(2)}</span>
                        
                        {/* BOTÕES DE AÇÃO */}
                        <button 
                          onClick={() => abrirEdicao(d)} 
                          className="w-10 h-10 bg-blue-50 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl flex items-center justify-center active:scale-95 transition-colors"
                          title="Editar Despesa"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => excluirDespesa(d.id)} 
                          className="w-10 h-10 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl flex items-center justify-center active:scale-95 transition-colors"
                          title="Apagar Despesa"
                        >
                          🗑️
                        </button>
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