import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts'; 
import { TrendingUp, ShoppingBag, PieChart, Activity, Zap, Calendar, ChevronDown, ChevronRight, ChevronLeft, Filter, Target, ArrowUpRight, ArrowDownRight, Clock, X } from 'lucide-react';

export default function DashboardBI() {
  const hojeGlobal = new Date();
  const mesAtualReal = hojeGlobal.getMonth();
  const anoAtualReal = hojeGlobal.getFullYear();

  const [filtro, setFiltro] = useState({ tipo: 'hoje', mes: mesAtualReal, ano: anoAtualReal, semana: null }); 
  const [produtoSelecionado, setProdutoSelecionado] = useState('TODOS');
  const [menuDatasAberto, setMenuDatasAberto] = useState(false);
  const [abaSuspensa, setAbaSuspensa] = useState(null); // null, 'mes', 'ano', 'semana'
  const [anoNavegacao, setAnoNavegacao] = useState(anoAtualReal);

  const [carregando, setCarregando] = useState(false);
  const [kpis, setKpis] = useState({ faturamento: 0, deltaFat: 0, ticketMedio: 0, lucroLiquido: 0, margemContribuicao: 0 });
  const [dadosGraficoPrincipal, setDadosGraficoPrincipal] = useState([]); 
  const [dadosComparativoMini, setDadosComparativoMini] = useState([]);
  const [topVariações, setTopVariações] = useState([]);
  const [dadosPareto, setDadosPareto] = useState([]);

  const [todasVendas, setTodasVendas] = useState([]);
  const [vendasPassadas, setVendasPassadas] = useState([]);
  const [produtosRef, setProdutosRef] = useState([]);

  const mesesExtenso = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Maio', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];
  const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- LÓGICA DE DATAS (ESTILO ORIGINAL RESTAURADO) ---
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
    
    // Comparação Semanal (Sempre -7 dias do filtro atual)
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

  // --- PROCESSAMENTO DOS GRÁFICOS (HÍBRIDO) ---
  useEffect(() => {
    const filtrar = (lista) => produtoSelecionado === 'TODOS' ? lista : lista.filter(v => v.produto_nome === produtoSelecionado);
    const vAtual = filtrar(todasVendas);
    const vPassado = filtrar(vendasPassadas);

    // KPIs
    let fat = 0; let custo = 0;
    vAtual.forEach(v => {
      fat += parseFloat(v.total_item);
      const p = produtosRef.find(pr => pr.nome === v.produto_nome);
      custo += (p?.custo || 0) * v.quantidade;
    });
    const ped = new Set(vAtual.map(v => v.transacao_id)).size;
    const fatAnterior = vPassado.reduce((acc, v) => acc + parseFloat(v.total_item), 0);

    setKpis({
      faturamento: fat,
      deltaFat: fatAnterior === 0 ? 0 : ((fat - fatAnterior) / fatAnterior) * 100,
      ticketMedio: ped > 0 ? fat / ped : 0,
      lucroLiquido: fat - custo,
      margemContribuicao: fat > 0 ? ((fat - custo) / fat) * 100 : 0
    });

    // ✨ GRÁFICO PRINCIPAL: POR HORA OU POR DIA ✨
    let basePrincipal = {};
    if (filtro.tipo === 'hoje' || filtro.tipo === 'ontem') {
      for(let i = 0; i <= 23; i++) basePrincipal[i.toString().padStart(2, '0') + 'h'] = { label: i.toString().padStart(2, '0') + 'h', Valor: 0 };
      vAtual.forEach(v => {
        let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
        if(basePrincipal[h]) basePrincipal[h].Valor += parseFloat(v.total_item);
      });
    } else {
      const { inicio, fim } = getRangeDatas(filtro);
      let dAtual = new Date(inicio);
      while (dAtual <= fim) {
        let d = dAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        basePrincipal[d] = { label: d, Valor: 0 };
        dAtual.setDate(dAtual.getDate() + 1);
      }
      vAtual.forEach(v => {
        let d = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if(basePrincipal[d]) basePrincipal[d].Valor += parseFloat(v.total_item);
      });
    }
    setDadosGraficoPrincipal(Object.values(basePrincipal));

    // ✨ COMPARATIVO MINI: DIA VS SEMANA PASSADA ✨
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let baseComp = dias.map(d => ({ label: d, Atual: 0, Passado: 0 }));
    vAtual.forEach(v => baseComp[new Date(v.created_at).getDay()].Atual += parseFloat(v.total_item));
    vPassado.forEach(v => baseComp[new Date(v.created_at).getDay()].Passado += parseFloat(v.total_item));
    setDadosComparativoMini(baseComp);

    // RANKINGS
    const agrupadoVar = vAtual.reduce((acc, v) => {
      const chave = `${v.produto_nome} (${v.produto_tam})`;
      acc[chave] = (acc[chave] || 0) + parseInt(v.quantidade);
      return acc;
    }, {});
    setTopVariações(Object.entries(agrupadoVar).map(([nome, qtd]) => ({ nome, qtd })).sort((a,b) => b.qtd - a.qtd).slice(0, 5));

    const agrupadoPareto = vAtual.reduce((acc, v) => {
      acc[v.produto_nome] = (acc[v.produto_nome] || 0) + parseFloat(v.total_item);
      return acc;
    }, {});
    setDadosPareto(Object.entries(agrupadoPareto).map(([nome, valor]) => ({ nome, valor })).sort((a,b) => b.valor - a.valor).slice(0, 5));

  }, [todasVendas, vendasPassadas, produtosRef, produtoSelecionado, filtro]);

  const gerarLabelFiltro = () => {
    switch (filtro.tipo) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case '7dias': return '7 Dias';
      case '30dias': return '30 Dias';
      case 'mes': return `${mesesExtenso[filtro.mes]} ${filtro.ano}`;
      default: return 'Período';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 space-y-6">
      
      {/* HEADER INTEGRADO */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
            <PieChart size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">BI Center</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" /> Inteligência de Vendas
            </p>
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

          {/* ✨ FILTRO ESTILO SHOPEE RESTAURADO ✨ */}
          <div className="relative">
            <button 
              onClick={() => setMenuDatasAberto(!menuDatasAberto)} 
              className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm font-black text-slate-800 text-xs hover:border-blue-400 transition-all"
            >
              <Calendar size={16} className="text-blue-600" /> {gerarLabelFiltro()}
              <ChevronDown size={14} className={menuDatasAberto ? 'rotate-180' : ''} />
            </button>

            {menuDatasAberto && (
              <div className="absolute right-0 mt-2 w-[450px] bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden flex animate-slide-up">
                {/* Lado Esquerdo: Atalhos Rápidos */}
                <div className="w-1/3 bg-slate-50 border-r border-slate-100 py-2 flex flex-col">
                  {['hoje', 'ontem', '7dias', '30dias'].map(t => (
                    <button key={t} onClick={() => {setFiltro({tipo: t, mes: mesAtualReal, ano: anoAtualReal}); setMenuDatasAberto(false)}} className={`px-4 py-2.5 text-xs font-bold text-left ${filtro.tipo === t ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {t === 'hoje' ? 'Tempo Real' : t === 'ontem' ? 'Ontem' : t === '7dias' ? '7 Dias' : '30 Dias'}
                    </button>
                  ))}
                  <div className="h-px bg-slate-200 my-2" />
                  <button onMouseEnter={() => setAbaSuspensa('mes')} className={`px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center ${abaSuspensa === 'mes' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>Por Mês <ChevronRight size={14}/></button>
                  <button onMouseEnter={() => setAbaSuspensa('ano')} className={`px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center ${abaSuspensa === 'ano' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>Por Ano <ChevronRight size={14}/></button>
                </div>

                {/* Lado Direito: Seletores Dinâmicos */}
                <div className="w-2/3 p-4 bg-white min-h-[250px]">
                  {abaSuspensa === 'mes' && (
                    <div className="grid grid-cols-3 gap-2">
                      {mesesExtenso.map((m, i) => (
                        <button key={m} onClick={() => {setFiltro({tipo: 'mes', mes: i, ano: anoAtualReal}); setMenuDatasAberto(false)}} className="py-2 text-[10px] font-black rounded-lg border bg-slate-50 text-slate-600 hover:border-blue-300">{m}</button>
                      ))}
                    </div>
                  )}
                  {abaSuspensa === 'ano' && (
                    <div className="flex flex-col gap-2">
                      {[anoAtualReal, anoAtualReal - 1].map(a => (
                         <button key={a} onClick={() => {setFiltro({tipo: 'ano', ano: a}); setMenuDatasAberto(false)}} className="py-3 font-black text-slate-700 bg-slate-50 border rounded-xl">{a}</button>
                      ))}
                    </div>
                  )}
                  {!abaSuspensa && (
                    <div className="h-full flex items-center justify-center text-slate-300 opacity-50"><Calendar size={48}/></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Faturamento</p>
            <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-slate-800">{formatarMoeda(kpis.faturamento)}</p>
                <span className={`flex items-center text-[10px] font-black ${kpis.deltaFat >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {kpis.deltaFat >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                    {Math.abs(kpis.deltaFat).toFixed(0)}%
                </span>
            </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ticket Médio</p>
            <p className="text-2xl font-black text-slate-800">{formatarMoeda(kpis.ticketMedio)}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Margem Contr. %</p>
            <p className="text-2xl font-black text-blue-600">{kpis.margemContribuicao.toFixed(1)}%</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Lucro Líquido</p>
            <p className="text-2xl font-black text-emerald-600">{formatarMoeda(kpis.lucroLiquido)}</p>
        </div>
      </div>

      {/* ✨ GRÁFICO PRINCIPAL: FATURAMENTO REAL ✨ */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-800 text-sm uppercase mb-6 flex items-center gap-2">
          <Activity size={18} className="text-blue-600" /> Fluxo de Faturamento
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <AreaChart data={dadosGraficoPrincipal}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontWeight: 'bold' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(v) => formatarMoeda(v)} />
              <Area type="monotone" dataKey="Valor" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorValor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MINI GRÁFICO: COMPARATIVO SEMANAL (COADJUVANTE) */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" /> vs. Semana Passada
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <BarChart data={dadosComparativoMini}>
                <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ fontSize: '10px' }} formatter={(v) => formatarMoeda(v)} />
                <Bar dataKey="Passado" fill="#e2e8f0" radius={[2, 2, 0, 0]} barSize={8} />
                <Bar dataKey="Atual" fill="#4f46e5" radius={[2, 2, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP 5 VARIAÇÕES */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2">
            <ShoppingBag size={16} className="text-amber-500" /> Giro de Variações
          </h3>
          <div className="space-y-4">
            {topVariações.map((item, i) => (
              <div key={item.nome}>
                <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                  <span className="text-slate-500 truncate mr-2">{item.nome}</span>
                  <span className="text-slate-800">{item.qtd} un.</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(item.qtd / (topVariações[0]?.qtd || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 5 MODELOS */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="font-black text-slate-800 text-xs uppercase mb-6 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" /> Receita p/ Modelo
          </h3>
          <div className="space-y-4">
            {dadosPareto.map((item, i) => (
              <div key={item.nome}>
                <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                  <span className="text-slate-500 truncate mr-2">{item.nome}</span>
                  <span className="text-slate-800">{formatarMoeda(item.valor)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(item.valor / (dadosPareto[0]?.valor || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}