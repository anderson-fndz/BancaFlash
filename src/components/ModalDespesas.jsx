import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalDespesas({ aberto, fechar }) {
  const [despesasHoje, setDespesasHoje] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // Estados do Formulário
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');

  useEffect(() => {
    if (aberto) buscarDespesas();
  }, [aberto]);

  if (!aberto) return null;

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

  const salvarDespesa = async () => {
    if (!descricao.trim() || !valor || parseFloat(valor) <= 0) {
      toast.error("Preencha a descrição e um valor válido!");
      return;
    }

    setCarregando(true);
    const loadingId = toast.loading("Registrando saída...");

    const novaDespesa = {
      descricao: descricao.trim().toUpperCase(),
      valor: parseFloat(valor),
      forma_pagamento: formaPagamento
    };

    const { error } = await supabase.from('despesas').insert([novaDespesa]);

    if (error) {
      toast.error("Erro ao registrar despesa.", { id: loadingId });
      console.error(error);
    } else {
      toast.success("Despesa registrada!", { id: loadingId });
      setDescricao('');
      setValor('');
      await buscarDespesas();
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
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-gray-50 w-full max-w-md h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-red-600 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <div>
            <h2 className="text-xl font-black italic flex items-center gap-2">💸 Saídas e Sangrias</h2>
            <p className="text-red-200 text-xs font-bold mt-1 uppercase tracking-widest">Registre os gastos do dia</p>
          </div>
          <button onClick={fechar} className="bg-red-700 hover:bg-red-800 w-10 h-10 rounded-full flex items-center justify-center font-black text-red-100 active:scale-95 transition-colors">X</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-8 flex flex-col gap-6">
          
          {/* FORMULÁRIO DE NOVA DESPESA */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-red-100">
            <h3 className="font-black text-gray-800 text-sm uppercase mb-3 border-b border-gray-100 pb-2">Nova Despesa</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Motivo / Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: CAFÉ, 3 ROLOS TECIDO, TAXA FEIRA" 
                  className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:border-red-400 outline-none text-sm"
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Valor (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full p-3 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none text-red-600"
                    value={valor} onChange={e => setValor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Pagamento</label>
                  <select 
                    className="w-full p-3 border-2 border-gray-200 rounded-xl font-black mt-1 focus:border-red-400 outline-none bg-white text-sm"
                    value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                  >
                    <option value="DINHEIRO">Gaveta (Dinheiro)</option>
                    <option value="PIX">Conta (Pix)</option>
                  </select>
                </div>
              </div>

              {/* AQUI ENTRARÁ O BOTÃO DA IA FUTURAMENTE */}
              {/* <button className="w-full bg-purple-100 text-purple-700 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-purple-200">📸 Ler Recibo com IA</button> */}

              <button 
                onClick={salvarDespesa} disabled={carregando}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl mt-2 active:scale-95 transition-colors uppercase tracking-widest shadow-md flex justify-center items-center gap-2"
              >
                <span>➖</span> REGISTRAR SAÍDA
              </button>
            </div>
          </div>

          {/* LISTA DE DESPESAS DO DIA */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-gray-700 text-sm uppercase">Histórico de Hoje</h3>
              <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-1 rounded-md">Total: R$ {totalDespesas.toFixed(2)}</span>
            </div>

            {despesasHoje.length === 0 ? (
              <div className="text-center text-gray-400 font-bold py-8 bg-white rounded-2xl border border-gray-200 border-dashed">Nenhum gasto registrado hoje. 🎉</div>
            ) : (
              <div className="space-y-3">
                {despesasHoje.map(d => (
                  <div key={d.id} className="bg-white border-2 border-gray-100 rounded-xl p-3 shadow-sm flex justify-between items-center group hover:border-red-200 transition-colors">
                    <div>
                      <p className="font-black text-gray-800 text-sm uppercase leading-tight">{d.descricao}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${d.forma_pagamento === 'PIX' ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.forma_pagamento}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">{new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-red-600">R$ {parseFloat(d.valor).toFixed(2)}</span>
                      <button onClick={() => excluirDespesa(d.id)} className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center active:scale-95 transition-colors">🗑️</button>
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