import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'; 
import { TrendingUp, Banknote, ShoppingBag, PieChart, Activity, CalendarDays, Zap } from 'lucide-react';

export default function DashboardBI() {
  const [periodo, setPeriodo] = useState('7dias'); 
  const [carregando, setCarregando] = useState(false);
  
  const [kpis, setKpis] = useState({ faturamento: 0, pecas: 0, ticketMedio: 0, totalPedidos: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 });
  
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([]); 
  const [dadosGraficoSemana, setDadosGraficoSemana] = useState([]); 
  const [dadosCategoriasDespesas, setDadosCategoriasDespesas] = useState([]);

  const [todasVendas, setTodasVendas] = useState([]);
  const [todasDespesas, setTodasDespesas] = useState([]);
  const [produtosRef, setProdutosRef] = useState([]);

  const [mostrarFaturamento, setMostrarFaturamento] = useState(true);
  const [mostrarLucro, setMostrarLucro] = useState(true);
  const [mostrarDespesas, setMostrarDespesas] = useState(false);

  const getDataCorte = () => {
    let dataCorte = new Date();
    dataCorte.setHours(0, 0, 0, 0);
    if (periodo === '7dias') dataCorte.setDate(dataCorte.getDate() - 6);
    else if (periodo === '30dias') dataCorte.setDate(dataCorte.getDate() - 29);
    else if (periodo === 'mes') dataCorte.setDate(1); 
    return dataCorte;
  };

  useEffect(() => {
    buscarDadosBI();
  }, [periodo]);

  useEffect(() => {
    if (todasVendas.length >= 0) {
      processarDados(todasVendas, todasDespesas, produtosRef);
    }
  }, [todasVendas, todasDespesas, produtosRef, periodo]);

  const buscarDadosBI = async () => {
    setCarregando(true);
    const dataCorte = getDataCorte();

    const [resVendas, resProd, resDespesas] = await Promise.all([
      supabase.from('vendas').select('*').gte('created_at', dataCorte.toISOString()).order('created_at', { ascending: true }),
      supabase.from('produtos').select('nome, custo'),
      supabase.from('despesas').select('*').gte('created_at', dataCorte.toISOString())
    ]);

    if (!resVendas.error && resVendas.data) setTodasVendas(resVendas.data);
    if (!resProd.error && resProd.data) setProdutosRef(resProd.data);
    if (!resDespesas.error && resDespesas.data) setTodasDespesas(resDespesas.data);

    setCarregando(false);
  };

  const processarDados = (vendas, despesas, produtosBase) => {
    const dataCorte = getDataCorte();

    // 1. MACRO KPIS
    let faturamento = 0;
    let totalPecas = 0;
    let custoTotalMercadoria = 0;

    vendas.forEach(v => {
      faturamento += parseFloat(v.total_item);
      totalPecas += parseInt(v.quantidade);
      const prod = produtosBase.find(p => p.nome === v.produto_nome);
      custoTotalMercadoria += (prod && prod.custo ? parseFloat(prod.custo) : 0) * parseInt(v.quantidade);
    });

    const lucroBruto = faturamento - custoTotalMercadoria;
    const pedidosUnicos = new Set(vendas.map(v => v.transacao_id)).size;
    const ticketMedio = pedidosUnicos > 0 ? faturamento / pedidosUnicos : 0;
    const totalDespesas = despesas.reduce((acc, d) => acc + parseFloat(d.valor), 0);
    const lucroLiquido = lucroBruto - totalDespesas;
    
    setKpis({ faturamento, pecas: totalPecas, ticketMedio, totalPedidos: pedidosUnicos, lucroBruto, despesas: totalDespesas, lucroLiquido });

    // 2. PREPARAÇÃO DA LINHA DO TEMPO
    let baseLinha = {};
    if (periodo === 'hoje') {
      for(let i = 0; i <= 23; i++) {
        let h = i.toString().padStart(2, '0') + 'h';
        baseLinha[h] = { tempo: h, Faturamento: 0, Custo: 0, Despesas: 0 };
      }
      vendas.forEach(v => {
        let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
        baseLinha[h].Faturamento += parseFloat(v.total_item);
        const prod = produtosBase.find(p => p.nome === v.produto_nome);
        baseLinha[h].Custo += (prod && prod.custo ? parseFloat(prod.custo) : 0) * parseInt(v.quantidade);
      });
      despesas.forEach(d => {
        let h = new Date(d.created_at).getHours().toString().padStart(2, '0') + 'h';
        baseLinha[h].Despesas += parseFloat(d.valor);
      });
    } else {
      let dataAtual = new Date(dataCorte);
      let dataFim = new Date();
      while (dataAtual <= dataFim) {
        let d = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        baseLinha[d] = { tempo: d, Faturamento: 0, Custo: 0, Despesas: 0 };
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      vendas.forEach(v => {
        let d = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if(baseLinha[d]) {
          baseLinha[d].Faturamento += parseFloat(v.total_item);
          const prod = produtosBase.find(p => p.nome === v.produto_nome);
          baseLinha[d].Custo += (prod && prod.custo ? parseFloat(prod.custo) : 0) * parseInt(v.quantidade);
        }
      });
      despesas.forEach(d => {
        let dData = new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if(baseLinha[dData]) {
          baseLinha[dData].Despesas += parseFloat(d.valor);
        }
      });
    }

    const dadosLinha = Object.values(baseLinha).map(ponto => ({
      tempo: ponto.tempo,
      Faturamento: parseFloat(ponto.Faturamento.toFixed(2)),
      Despesas: parseFloat(ponto.Despesas.toFixed(2)),
      Lucro: parseFloat((ponto.Faturamento - ponto.Custo - ponto.Despesas).toFixed(2))
    }));
    setDadosGraficoLinha(dadosLinha);

    // 3. DIAS DA SEMANA (Gráfico de Barras)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let baseBarra = { 'Dom': { fat: 0, qtd: 0 }, 'Seg': { fat: 0, qtd: 0 }, 'Ter': { fat: 0, qtd: 0 }, 'Qua': { fat: 0, qtd: 0 }, 'Qui': { fat: 0, qtd: 0 }, 'Sex': { fat: 0, qtd: 0 }, 'Sáb': { fat: 0, qtd: 0 } };
    vendas.forEach(v => {
      const dia = diasSemana[new Date(v.created_at).getDay()];
      baseBarra[dia].fat += parseFloat(v.total_item);
      baseBarra[dia].qtd += parseInt(v.quantidade);
    });
    setDadosGraficoSemana(diasSemana.map(dia => ({ 
      dia: dia, 
      Faturamento: parseFloat(baseBarra[dia].fat.toFixed(2)),
      Peças: baseBarra[dia].qtd
    })));

    // 4. DESPESAS POR CATEGORIA
    const agrupadoCat = despesas.reduce((acc, d) => {
      const cat = d.categoria || 'OUTROS';
      acc[cat] = (acc[cat] || 0) + parseFloat(d.valor); return acc;
    }, {});
    setDadosCategoriasDespesas(Object.entries(agrupadoCat).sort((a, b) => b[1] - a[1]));
  };

  const maxEixoY = dadosGraficoLinha.length > 0 ? Math.max(...dadosGraficoLinha.map(d => d.Faturamento)) * 1.1 : 'auto';

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8 space-y-6">
      
      {/* HEADER DO DASHBOARD */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <PieChart className="text-blue-600" size={32} /> Visão Financeira
          </h1>
          <p className="text-slate-500 font-bold mt-1 text-sm flex items-center gap-1">
            <Zap size={14} className="text-amber-500" /> Acompanhe a saúde do seu caixa.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {['hoje', '7dias', 'mes', '30dias'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`flex-1 px-4 py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${periodo === p ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
              {p === 'mes' ? 'Este Mês' : p.replace('dias', ' Dias')}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex flex-col items-center justify-center font-bold text-blue-600 text-lg md:text-xl py-32 animate-pulse gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Processando Balanço Financeiro...
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* CARDS MACRO (Os 4 Pilares Financeiros) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-blue-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 relative z-10">Faturamento Bruto</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800 truncate relative z-10">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
              <ShoppingBag className="absolute right-[-10px] bottom-[-10px] text-slate-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Volume de Peças</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800 relative z-10">{kpis.pecas} <span className="text-sm font-bold opacity-50">un.</span></p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
              <Banknote className="absolute right-[-10px] bottom-[-10px] text-red-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 relative z-10">Total de Despesas</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800 truncate relative z-10">R$ {kpis.despesas.toFixed(2)}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition-colors col-span-2 lg:col-span-1 ${kpis.lucroLiquido >= 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'}`}>
              <Activity className={`absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform ${kpis.lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`} size={80} />
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 ${kpis.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Lucro Líquido Real</p>
              <p className={`text-3xl font-black truncate relative z-10 ${kpis.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {kpis.lucroLiquido.toFixed(2)}</p>
            </div>
          </div>

          {/* GRÁFICO PRINCIPAL DE LINHA (Financeiro) */}
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                <Activity size={18} className="text-blue-600" /> Curva Financeira
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMostrarFaturamento(!mostrarFaturamento)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center gap-2 ${mostrarFaturamento ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarFaturamento ? 'bg-blue-600' : 'bg-slate-300'}`}></div> Faturamento
                </button>
                <button onClick={() => setMostrarLucro(!mostrarLucro)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center gap-2 ${mostrarLucro ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarLucro ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> Lucro Líquido
                </button>
                <button onClick={() => setMostrarDespesas(!mostrarDespesas)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center gap-2 ${mostrarDespesas ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarDespesas ? 'bg-red-500' : 'bg-slate-300'}`}></div> Despesas
                </button>
              </div>
            </div>

            <div className="h-52 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGraficoLinha} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="tempo" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                  <YAxis hide domain={[0, maxEixoY]} />
                  <Tooltip formatter={(value, name) => [`R$ ${value}`, name]} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#1e293b' }} />
                  {mostrarFaturamento && <Line type="monotone" dataKey="Faturamento" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />}
                  {mostrarLucro && <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7 }} />}
                  {mostrarDespesas && <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RODAPÉ DO DASHBOARD: DIAS DA SEMANA & DESPESAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            
            {/* GRÁFICO DE BARRAS: DIAS DA SEMANA */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase flex items-center gap-2">
                <CalendarDays size={18} className="text-amber-500" /> Força por Dia da Semana
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoSemana} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="dia" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} dy={5} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' }} />
                    <Bar dataKey="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICO: PARA ONDE VAI O DINHEIRO */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase flex items-center gap-2">
                <Banknote size={18} className="text-red-500" /> Custos e Despesas
              </h3>
              {dadosCategoriasDespesas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sem despesas no período</p></div>
              ) : (
                <div className="space-y-4">
                  {dadosCategoriasDespesas.map(([cat, val]) => {
                    const pct = ((val / kpis.despesas) * 100).toFixed(0);
                    return (
                      <div key={cat} className="group">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide group-hover:text-red-600 transition-colors">{cat}</span>
                          <div className="text-right flex items-center">
                            <span className="text-[9px] text-slate-400 font-bold mr-2">{pct}%</span>
                            <span className="text-xs font-black text-slate-800">R$ {val.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-red-400 to-red-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}