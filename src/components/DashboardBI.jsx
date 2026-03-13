import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'; 
import { TrendingUp, Banknote, ShoppingBag, PieChart, Activity, CalendarDays, Zap, Calendar, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

export default function DashboardBI() {
  const hojeGlobal = new Date();
  const mesAtualReal = hojeGlobal.getMonth();
  const anoAtualReal = hojeGlobal.getFullYear();

  // ✨ ESTADOS ORIGINAIS MANTIDOS ✨
  const [filtro, setFiltro] = useState({ tipo: 'hoje', mes: mesAtualReal, ano: anoAtualReal }); 
  const [menuDatasAberto, setMenuDatasAberto] = useState(false);
  const [abaSuspensa, setAbaSuspensa] = useState('hoje'); 
  const [anoNavegacao, setAnoNavegacao] = useState(anoAtualReal);

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

  const mesesExtenso = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Maio', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];

  // ✨ LÓGICA DE BLOQUEIO SHOPEE ✨
  const isFuturo = (mesIndex, ano) => {
    if (ano > anoAtualReal) return true;
    if (ano === anoAtualReal && mesIndex > mesAtualReal) return true;
    return false;
  };

  // ✨ LÓGICA DE DATAS (ORIGINAL) ✨
  const getRangeDatas = () => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    switch (filtro.tipo) {
      case 'hoje':
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'ontem':
        inicio.setDate(hoje.getDate() - 1);
        inicio.setHours(0, 0, 0, 0);
        fim.setDate(hoje.getDate() - 1);
        fim.setHours(23, 59, 59, 999);
        break;
      case '7dias':
        inicio.setDate(hoje.getDate() - 6);
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case '30dias':
        inicio.setDate(hoje.getDate() - 29);
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'mes':
        inicio = new Date(filtro.ano, filtro.mes, 1);
        fim = new Date(filtro.ano, filtro.mes + 1, 0, 23, 59, 59, 999);
        break;
      case 'ano':
        inicio = new Date(filtro.ano, 0, 1);
        fim = new Date(filtro.ano, 11, 31, 23, 59, 59, 999);
        break;
      default:
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
    }
    return { inicio, fim };
  };

  useEffect(() => {
    buscarDadosBI();
  }, [filtro]);

  useEffect(() => {
    if (todasVendas.length >= 0) {
      processarDados(todasVendas, todasDespesas, produtosRef);
    }
  }, [todasVendas, todasDespesas, produtosRef, filtro]);

  const buscarDadosBI = async () => {
    setCarregando(true);
    const { inicio, fim } = getRangeDatas();

    const [resVendas, resProd, resDespesas] = await Promise.all([
      supabase.from('vendas').select('*').gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()).order('created_at', { ascending: true }),
      supabase.from('produtos').select('nome, custo'),
      supabase.from('despesas').select('*').gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString())
    ]);

    if (!resVendas.error && resVendas.data) setTodasVendas(resVendas.data);
    if (!resProd.error && resProd.data) setProdutosRef(resProd.data);
    if (!resDespesas.error && resDespesas.data) setTodasDespesas(resDespesas.data);

    setCarregando(false);
  };

  // ✨ LÓGICA DE PROCESSAMENTO (COMPLETA RESTAURADA) ✨
  const processarDados = (vendas, despesas, produtosBase) => {
    const { inicio, fim } = getRangeDatas();

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

    let baseLinha = {};
    if (filtro.tipo === 'hoje' || filtro.tipo === 'ontem') {
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
    } else if (filtro.tipo === 'ano') {
      const mesesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      mesesCurtos.forEach(m => baseLinha[m] = { tempo: m, Faturamento: 0, Custo: 0, Despesas: 0 });
      vendas.forEach(v => {
        let m = mesesCurtos[new Date(v.created_at).getMonth()];
        baseLinha[m].Faturamento += parseFloat(v.total_item);
        const prod = produtosBase.find(p => p.nome === v.produto_nome);
        baseLinha[m].Custo += (prod && prod.custo ? parseFloat(prod.custo) : 0) * parseInt(v.quantidade);
      });
      despesas.forEach(d => {
        let m = mesesCurtos[new Date(d.created_at).getMonth()];
        baseLinha[m].Despesas += parseFloat(d.valor);
      });
    } else {
      let dataAtual = new Date(inicio);
      while (dataAtual <= fim) {
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

    const agrupadoCat = despesas.reduce((acc, d) => {
      const cat = d.categoria || 'OUTROS';
      acc[cat] = (acc[cat] || 0) + parseFloat(d.valor); return acc;
    }, {});
    setDadosCategoriasDespesas(Object.entries(agrupadoCat).sort((a, b) => b[1] - a[1]));
  };

  const maxEixoY = dadosGraficoLinha.length > 0 ? Math.max(...dadosGraficoLinha.map(d => d.Faturamento)) * 1.1 : 'auto';

  const gerarLabelFiltro = () => {
    switch (filtro.tipo) {
      case 'hoje': return 'Hoje (Tempo Real)';
      case 'ontem': return 'Ontem';
      case '7dias': return 'Últimos 7 Dias';
      case '30dias': return 'Últimos 30 Dias';
      case 'mes': return `${mesesExtenso[filtro.mes]} ${filtro.ano}`;
      case 'ano': return `Ano de ${filtro.ano}`;
      default: return 'Período';
    }
  };

  const anosDisponiveis = [anoAtualReal - 1, anoAtualReal, anoAtualReal + 1];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8 space-y-6">
      
      {/* ✨ HEADER COM MENU SHOPEE ✨ */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm relative">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <PieChart className="text-blue-600" size={32} /> Visão Financeira
          </h1>
          <p className="text-slate-500 font-bold mt-1 text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Acompanhe a saúde do seu caixa
          </p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setMenuDatasAberto(!menuDatasAberto)}
            className="flex items-center justify-between gap-4 w-full md:w-64 bg-slate-50 border border-slate-200 hover:border-blue-400 px-4 py-3 rounded-xl shadow-sm transition-all font-black text-slate-800 text-sm"
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-blue-600" />
              <span>{gerarLabelFiltro()}</span>
            </div>
            <ChevronDown size={16} className={`transition-transform ${menuDatasAberto ? 'rotate-180' : ''}`} />
          </button>

          {menuDatasAberto && (
            <div className="absolute right-0 mt-2 w-full md:w-[480px] bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col md:flex-row animate-slide-up">
              {/* Menu Lateral */}
              <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 py-2 flex flex-col">
                {['hoje', 'ontem', '7dias', '30dias'].map(t => (
                  <button key={t} onClick={() => {setFiltro({tipo: t, mes: mesAtualReal, ano: anoAtualReal}); setMenuDatasAberto(false)}} className={`px-4 py-2.5 text-xs font-bold text-left ${filtro.tipo === t ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {t === 'hoje' ? 'Tempo Real' : t === 'ontem' ? 'Ontem' : t === '7dias' ? '7 Dias' : '30 Dias'}
                  </button>
                ))}
                <div className="h-px bg-slate-200 my-2" />
                <button onMouseEnter={() => setAbaSuspensa('mes')} className={`px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center ${abaSuspensa === 'mes' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>Por Mês <ChevronRight size={14}/></button>
                <button onMouseEnter={() => setAbaSuspensa('ano')} className={`px-4 py-2.5 text-xs font-bold text-left flex justify-between items-center ${abaSuspensa === 'ano' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>Por Ano <ChevronRight size={14}/></button>
              </div>

              {/* Painel de Conteúdo (Bloqueio Futuro) */}
              <div className="w-full md:w-2/3 p-4 bg-white min-h-[280px]">
                {abaSuspensa === 'mes' && (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setAnoNavegacao(a => a-1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={18}/></button>
                      <span className={`font-black ${anoNavegacao === anoAtualReal ? 'text-blue-600' : 'text-slate-800'}`}>{anoNavegacao}</span>
                      <button disabled={anoNavegacao >= anoAtualReal} onClick={() => setAnoNavegacao(a => a+1)} className="p-1 hover:bg-slate-100 rounded disabled:opacity-20"><ChevronRight size={18}/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {mesesExtenso.map((m, i) => {
                        const futuro = isFuturo(i, anoNavegacao);
                        const atual = i === mesAtualReal && anoNavegacao === anoAtualReal;
                        return (
                          <button 
                            key={m} 
                            disabled={futuro} 
                            onClick={() => {setFiltro({tipo: 'mes', mes: i, ano: anoNavegacao}); setMenuDatasAberto(false)}}
                            className={`py-2 text-[10px] font-black rounded-lg border transition-all 
                              ${atual ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 
                                futuro ? 'text-slate-100 border-transparent cursor-not-allowed opacity-20' : 
                                'bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-300'}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {abaSuspensa === 'ano' && (
                   <div className="grid grid-cols-2 gap-2 h-full items-center">
                     {anosDisponiveis.map(ano => {
                        const futuro = ano > anoAtualReal;
                        return (
                          <button key={ano} disabled={futuro} onClick={() => {setFiltro({tipo: 'ano', ano: ano}); setMenuDatasAberto(false)}}
                            className={`py-4 font-black rounded-xl border transition-all ${ano === anoAtualReal ? 'bg-blue-50 text-blue-600 border-blue-200' : futuro ? 'text-slate-100 border-transparent opacity-20' : 'bg-slate-50 text-slate-600'}`}
                          >
                            {ano}
                          </button>
                        );
                     })}
                   </div>
                )}
                {['hoje', 'ontem', '7dias', '30dias'].includes(abaSuspensa) && (
                  <div className="h-full flex flex-col justify-center items-center text-slate-300 text-center">
                    <CalendarDays size={48} strokeWidth={1} className="mb-2 opacity-50" />
                    <p className="text-xs font-bold">Clique para aplicar<br/>o período rápido</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="py-32 text-center animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-blue-600 uppercase tracking-widest text-sm">Calculando resultados...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ✨ KPI CARDS (RESTAURADOS) ✨ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-blue-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 relative z-10">Faturamento Bruto</p>
              <p className="text-xl md:text-3xl font-black text-slate-800 truncate relative z-10">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <ShoppingBag className="absolute right-[-10px] bottom-[-10px] text-slate-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Volume de Peças</p>
              <p className="text-xl md:text-3xl font-black text-slate-800 relative z-10">{kpis.pecas} <span className="text-sm font-bold opacity-50">un.</span></p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group">
              <Banknote className="absolute right-[-10px] bottom-[-10px] text-red-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 relative z-10">Total de Despesas</p>
              <p className="text-xl md:text-3xl font-black text-slate-800 truncate relative z-10">R$ {kpis.despesas.toFixed(2)}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition-colors col-span-2 lg:col-span-1 ${kpis.lucroLiquido >= 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'}`}>
              <Activity className={`absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform ${kpis.lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`} size={80} />
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 ${kpis.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Lucro Líquido Real</p>
              <p className={`text-3xl font-black truncate relative z-10 ${kpis.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {kpis.lucroLiquido.toFixed(2)}</p>
            </div>
          </div>

          {/* ✨ GRÁFICO PRINCIPAL (RESTAURADO) ✨ */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
                <Activity size={18} className="text-blue-600" /> Curva Financeira
              </h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMostrarFaturamento(!mostrarFaturamento)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${mostrarFaturamento ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Faturamento</button>
                <button onClick={() => setMostrarLucro(!mostrarLucro)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${mostrarLucro ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Lucro Líquido</button>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGraficoLinha}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="tempo" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                  <YAxis hide domain={[0, maxEixoY]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  {mostrarFaturamento && <Line type="monotone" dataKey="Faturamento" stroke="#2563eb" strokeWidth={3} dot={false} />}
                  {mostrarLucro && <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={4} dot={false} />}
                  {mostrarDespesas && <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ✨ GIRO SEMANAL ✨ */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase tracking-widest flex items-center gap-2">
                <CalendarDays size={18} className="text-amber-500" /> Força por Dia
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoSemana}>
                    <XAxis dataKey="dia" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                    <Bar dataKey="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ✨ CATEGORIAS DESPESAS ✨ */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-sm uppercase tracking-widest flex items-center gap-2">
                <Banknote size={18} className="text-red-500" /> Distribuição de Custos
              </h3>
              <div className="space-y-4">
                {dadosCategoriasDespesas.map(([cat, val]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className="text-slate-600">{cat}</span>
                      <span className="text-slate-800">R$ {val.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${(val / kpis.despesas * 100).toFixed(0)}%` }}></div>
                    </div>
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