import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'; 
import { TrendingUp, Banknote, ShoppingBag, PieChart, Activity, CalendarDays, Zap, Calendar, ChevronDown, ChevronRight, ChevronLeft, Filter, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function DashboardBI() {
  const hojeGlobal = new Date();
  const mesAtualReal = hojeGlobal.getMonth();
  const anoAtualReal = hojeGlobal.getFullYear();

  // --- ESTADOS ---
  const [filtro, setFiltro] = useState({ tipo: 'hoje', mes: mesAtualReal, ano: anoAtualReal }); 
  const [produtoSelecionado, setProdutoSelecionado] = useState('TODOS');
  const [menuDatasAberto, setMenuDatasAberto] = useState(false);
  const [abaSuspensa, setAbaSuspensa] = useState('hoje'); 
  const [anoNavegacao, setAnoNavegacao] = useState(anoAtualReal);
  const [carregando, setCarregando] = useState(false);

  const [kpis, setKpis] = useState({ faturamento: 0, deltaFat: 0, ticketMedio: 0, deltaTicket: 0, margemContribuicao: 0, lucroLiquido: 0 });
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([]); 
  const [topVariações, setTopVariações] = useState([]);
  const [dadosPareto, setDadosPareto] = useState([]);
  const [todasVendas, setTodasVendas] = useState([]);
  const [vendasPassadas, setVendasPassadas] = useState([]);
  const [produtosRef, setProdutosRef] = useState([]);

  const mesesExtenso = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Maio', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];

  // ✨ FUNÇÃO QUE ESTAVA FALTANDO (FIX) ✨
  const gerarLabelFiltro = () => {
    switch (filtro.tipo) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case '7dias': return '7 Dias';
      case '30dias': return '30 Dias';
      case 'mes': return `${mesesExtenso[filtro.mes]} ${filtro.ano}`;
      case 'ano': return `Ano ${filtro.ano}`;
      default: return 'Período';
    }
  };

  const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- LÓGICA DE DATAS ---
  const getRangeDatas = (f) => {
    let inicio = new Date(); let fim = new Date();
    switch (f.tipo) {
      case 'hoje': inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999); break;
      case 'ontem': inicio.setDate(hojeGlobal.getDate() - 1); inicio.setHours(0,0,0,0); fim.setDate(hojeGlobal.getDate() - 1); fim.setHours(23,59,59,999); break;
      case '7dias': inicio.setDate(hojeGlobal.getDate() - 6); inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999); break;
      case '30dias': inicio.setDate(hojeGlobal.getDate() - 29); inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999); break;
      case 'mes': inicio = new Date(f.ano, f.mes, 1); fim = new Date(f.ano, f.mes + 1, 0, 23, 59, 59, 999); break;
      default: inicio.setHours(0,0,0,0); fim.setHours(23,59,59,999);
    }
    return { inicio, fim };
  };

  const buscarDadosBI = async () => {
    setCarregando(true);
    const { inicio, fim } = getRangeDatas(filtro);
    
    // Cálculo do período anterior (semana passada)
    let inicioPassado = new Date(inicio);
    let fimPassado = new Date(fim);
    inicioPassado.setDate(inicioPassado.getDate() - 7);
    fimPassado.setDate(fimPassado.getDate() - 7);

    const [resAtual, resPassado, resProd] = await Promise.all([
      supabase.from('vendas').select('*').gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()),
      supabase.from('vendas').select('*').gte('created_at', inicioPassado.toISOString()).lte('created_at', fimPassado.toISOString()),
      supabase.from('produtos').select('nome, custo')
    ]);

    setTodasVendas(resAtual.data || []);
    setVendasPassadas(resPassado.data || []);
    setProdutosRef(resProd.data || []);
    setCarregando(false);
  };

  useEffect(() => { buscarDadosBI(); }, [filtro]);

  // --- PROCESSAMENTO ---
  useEffect(() => {
    const filtrar = (lista) => produtoSelecionado === 'TODOS' ? lista : lista.filter(v => v.produto_nome === produtoSelecionado);
    const vAtual = filtrar(todasVendas);
    const vPassado = filtrar(vendasPassadas);

    const calcKpis = (lista) => {
      let fat = 0; let custo = 0;
      lista.forEach(v => {
        fat += parseFloat(v.total_item);
        const p = produtosRef.find(pr => pr.nome === v.produto_nome);
        custo += (p?.custo || 0) * v.quantidade;
      });
      const ped = new Set(lista.map(v => v.transacao_id)).size;
      return { fat, ped, custo, ticket: ped > 0 ? fat / ped : 0 };
    };

    const atual = calcKpis(vAtual);
    const passado = calcKpis(vPassado);
    const delta = (a, b) => b === 0 ? 0 : ((a - b) / b) * 100;

    setKpis({
      faturamento: atual.fat,
      deltaFat: delta(atual.fat, passado.fat),
      ticketMedio: atual.ticket,
      deltaTicket: delta(atual.ticket, passado.ticket),
      margemContribuicao: atual.fat > 0 ? ((atual.fat - atual.custo) / atual.fat) * 100 : 0,
      lucroLiquido: atual.fat - atual.custo
    });

    // Gráfico de linha
    let baseLinha = {};
    for(let i = 0; i <= 23; i++) {
      let h = i.toString().padStart(2, '0') + 'h';
      baseLinha[h] = { tempo: h, Atual: 0, Passado: 0 };
    }
    vAtual.forEach(v => {
      let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
      if(baseLinha[h]) baseLinha[h].Atual += parseFloat(v.total_item);
    });
    vPassado.forEach(v => {
      let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
      if(baseLinha[h]) baseLinha[h].Passado += parseFloat(v.total_item);
    });
    setDadosGraficoLinha(Object.values(baseLinha));

    // Variações e Pareto
    const agrupadoVariação = vAtual.reduce((acc, v) => {
      const chave = `${v.produto_nome} (${v.produto_tam} - ${v.produto_cor})`;
      acc[chave] = (acc[chave] || 0) + parseInt(v.quantidade);
      return acc;
    }, {});
    setTopVariações(Object.entries(agrupadoVariação).map(([nome, qtd]) => ({ nome, qtd })).sort((a,b) => b.qtd - a.qtd).slice(0, 5));

    const agrupadoPareto = vAtual.reduce((acc, v) => {
      acc[v.produto_nome] = (acc[v.produto_nome] || 0) + parseFloat(v.total_item);
      return acc;
    }, {});
    setDadosPareto(Object.entries(agrupadoPareto).map(([nome, valor]) => ({ nome, valor })).sort((a,b) => b.valor - a.valor).slice(0, 5));

  }, [todasVendas, vendasPassadas, produtosRef, produtoSelecionado]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl"><PieChart className="text-indigo-600" size={28} /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">BI Center</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Zap size={12} className="text-amber-500" /> Inteligência de Dados</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-400 ml-1" />
            <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)} className="bg-transparent text-xs font-black text-slate-700 outline-none uppercase">
              <option value="TODOS">TODOS MODELOS</option>
              {[...new Set(produtosRef.map(p => p.nome))].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="relative">
            <button onClick={() => setMenuDatasAberto(!menuDatasAberto)} className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm font-black text-slate-800 text-xs transition-all hover:border-indigo-400">
              <Calendar size={16} className="text-indigo-600" /> {gerarLabelFiltro()}
              <ChevronDown size={14} className={menuDatasAberto ? 'rotate-180' : ''} />
            </button>

            {menuDatasAberto && (
              <div className="absolute right-0 mt-2 w-[480px] bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden flex animate-slide-up">
                <div className="w-1/3 bg-slate-50 border-r border-slate-100 py-2 flex flex-col">
                  {['hoje', 'ontem', '7dias', '30dias'].map(t => (
                    <button key={t} onClick={() => {setFiltro({tipo: t, mes: mesAtualReal, ano: anoAtualReal}); setMenuDatasAberto(false)}} className={`px-4 py-2.5 text-xs font-bold text-left ${filtro.tipo === t ? 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-500' : 'text-slate-600 hover:bg-slate-100'}`}>{t.replace('dias', ' Dias')}</button>
                  ))}
                  <div className="h-px bg-slate-200 my-2" />
                  <button onMouseEnter={() => setAbaSuspensa('mes')} className={`px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center ${abaSuspensa === 'mes' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}>Por Mês <ChevronRight size={14}/></button>
                </div>
                <div className="w-2/3 p-4 bg-white min-h-[280px]">
                  {abaSuspensa === 'mes' && (
                    <div className="h-full flex flex-col">
                      <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => setAnoNavegacao(a => a-1)}><ChevronLeft size={18}/></button>
                        <span className="font-black text-slate-800">{anoNavegacao}</span>
                        <button onClick={() => setAnoNavegacao(a => a+1)}><ChevronRight size={18}/></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {mesesExtenso.map((m, i) => (
                          <button key={m} onClick={() => {setFiltro({tipo: 'mes', mes: i, ano: anoNavegacao}); setMenuDatasAberto(false)}} className="py-2 text-[10px] font-black rounded-lg border bg-slate-50 text-slate-600 hover:border-blue-300">{m}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="py-32 text-center flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div><p className="font-black text-slate-400 uppercase text-sm">Cruzando Dados...</p></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
              <div className="flex items-center">
                <p className="text-2xl font-black text-slate-800">{formatarMoeda(kpis.faturamento)}</p>
                <span className={`flex items-center text-[10px] font-black ml-1 ${kpis.deltaFat >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{kpis.deltaFat >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{Math.abs(kpis.deltaFat).toFixed(0)}%</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ticket Médio</p>
              <p className="text-2xl font-black text-slate-800">{formatarMoeda(kpis.ticketMedio)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Margem %</p>
              <p className="text-2xl font-black text-indigo-600">{kpis.margemContribuicao.toFixed(1)}%</p>
            </div>
            <div className={`p-5 rounded-3xl border shadow-sm ${kpis.lucroLiquido >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-[10px] font-black uppercase mb-1 ${kpis.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Lucro Líquido</p>
              <p className={`text-2xl font-black ${kpis.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatarMoeda(kpis.lucroLiquido)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2"><Activity size={18} className="text-indigo-600" /> Curva vs. Semana Passada</h3>
              <div className="flex gap-4 text-[9px] font-bold uppercase">
                <div className="flex items-center gap-1"><div className="w-3 h-1 bg-indigo-600 rounded-full"/>Atual</div>
                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-slate-300 border-t border-dashed"/>Passado</div>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={dadosGraficoLinha}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tempo" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontWeight: 'bold' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'black' }} formatter={(v) => formatarMoeda(v)} />
                  <Line type="monotone" dataKey="Passado" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Atual" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase tracking-widest flex items-center gap-2"><ShoppingBag size={18} className="text-amber-500" /> Top 5 Variações (Qtd)</h3>
              <div className="space-y-4">
                {topVariações.map((item, i) => (
                  <div key={item.nome}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1.5"><span className="text-slate-600">{item.nome}</span><span className="text-slate-900">{item.qtd} un.</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${(item.qtd / topVariações[0].qtd) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase tracking-widest flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" /> Top 5 Modelos (Fat)</h3>
              <div className="space-y-4">
                {dadosPareto.map((item, i) => (
                  <div key={item.nome}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1.5"><span className="text-slate-600">{item.nome}</span><span className="text-slate-900">{formatarMoeda(item.valor)}</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${(item.valor / dadosPareto[0].valor) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}