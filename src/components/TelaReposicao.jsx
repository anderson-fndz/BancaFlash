import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Send, RefreshCw, ClipboardList, CheckCircle2, ArrowRight, AlertCircle, Box } from 'lucide-react';

export default function TelaReposicao() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [checksDeposito, setChecksDeposito] = useState({});

  useEffect(() => {
    buscarDados();
  }, []);

  const buscarDados = async () => {
    setCarregando(true);
    // Buscamos apenas os ativos para não poluir a logística
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });
      
    if (data) setProdutos(data);
    setCarregando(false);
  };

  const handleReporUm = async (produto) => {
    if (produto.estoque_saco <= 0) {
      toast.error("Sem estoque no saco");
      return;
    }
    const { error } = await supabase
      .from('produtos')
      .update({ 
        estoque_banca: (produto.estoque_banca || 0) + 1,
        estoque_saco: (produto.estoque_saco || 0) - 1 
      })
      .eq('id', produto.id);

    if (error) toast.error("Erro na sincronização");
    else {
      toast.success(`${produto.nome} na banca!`, { duration: 1000 });
      buscarDados();
    }
  };

  const toggleCheck = (id) => {
    setChecksDeposito(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ✨ LÓGICA DE FILTROS MANTENDO AS COLUNAS ORIGINAIS ✨
  
  // 1. FURO NA VITRINE: O que zerou na banca mas ainda tem no saco (Para puxar na hora)
  const reporBanca = produtos.filter(p => 
    (p.estoque_banca || 0) === 0 && (p.estoque_saco || 0) > 0
  );

  // 2. CARGA DE DEPÓSITO: O que está abaixo da meta global (Para pedir produção/comprar)
  // Se você preferir manter o filtro de "zerado total", basta mudar para: (p.estoque_banca === 0 && p.estoque_saco === 0)
  const reporDeposito = produtos.filter(p => {
    const estoqueTotal = (p.estoque_banca || 0) + (p.estoque_saco || 0);
    const meta = p.meta_global || 0;
    return meta > 0 && estoqueTotal <= meta;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-32 md:pb-8 flex flex-col h-full space-y-8 bg-slate-50/50">
      
      {/* HEADER (IGUAL AO SEU) */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="text-indigo-600" size={32} /> 
            Logística de Reposição
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-wider">
            Status: {produtos.length} variações monitoradas
          </p>
        </div>
        
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
          <Send size={18} /> Exportar para Telegram
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* COLUNA 1: REPOR NA BANCA (IGUAL AO SEU) */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-red-500 animate-spin-slow" />
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Furo na Vitrine</h2>
            </div>
            <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">
              {reporBanca.length}
            </span>
          </div>
          
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {reporBanca.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                   <CheckCircle2 size={40} className="mb-2" />
                   <p className="font-black uppercase text-xs">Nenhum furo!</p>
                </div>
              ) : (
                reporBanca.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border-l-8 border-l-red-500 border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-800 text-base uppercase leading-tight">{p.nome}</p>
                        <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">Urgente</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{p.tam} | {p.cor}</span>
                        <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          No Saco: {p.estoque_saco}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleReporUm(p)}
                      className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-5 rounded-xl text-[10px] uppercase shadow-lg shadow-red-100 active:scale-90 transition-all flex items-center gap-2"
                    >
                      Repor <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUNA 2: REPOSIÇÃO DE DEPÓSITO (IGUAL AO SEU) */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Box size={18} className="text-amber-500" />
              <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Carga de Depósito</h2>
            </div>
            <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full">
              {reporDeposito.length}
            </span>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {reporDeposito.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                   <CheckCircle2 size={40} className="mb-2" />
                   <p className="font-black uppercase text-xs">Estoque ok!</p>
                </div>
              ) : (
                reporDeposito.map(p => {
                  const falta = (p.meta_global || 0) - ((p.estoque_banca || 0) + (p.estoque_saco || 0));
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => toggleCheck(p.id)}
                      className={`w-full text-left p-4 rounded-2xl border-l-8 transition-all flex justify-between items-center group ${
                        checksDeposito[p.id] 
                        ? 'bg-slate-50 border-l-emerald-500 border-slate-200 opacity-50' 
                        : 'bg-white border-l-amber-400 border-slate-100 shadow-sm hover:border-l-indigo-400'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {checksDeposito[p.id] ? (
                          <CheckCircle2 className="text-emerald-500" size={26} />
                        ) : (
                          <AlertCircle className="text-amber-500 animate-pulse" size={26} />
                        )}
                        <div>
                          <p className={`font-black text-base uppercase leading-tight ${checksDeposito[p.id] ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {p.nome}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            {p.tam} | {p.cor} <span className="ml-2 text-indigo-500 font-black">(Mín: {p.meta_global})</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-tighter ${checksDeposito[p.id] ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {falta > 0 ? `Faltam ${falta}` : 'Abaixo da Meta'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}