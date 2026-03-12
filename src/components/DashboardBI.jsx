import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'; 
import { TrendingUp, Banknote, ShoppingBag, PieChart, Activity, CalendarDays, Zap, Calendar, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

export default function DashboardBI() {
  // ✨ NOVO ESTADO DE FILTRO INTELIGENTE ✨
  const [filtro, setFiltro] = useState({ tipo: 'hoje', mes: new Date().getMonth(), ano: new Date().getFullYear() }); 
  
  const [menuDatasAberto, setMenuDatasAberto] = useState(false);
  const [abaSuspensa, setAbaSuspensa] = useState('hoje'); // Controla qual aba está aparecendo no lado direito do menu
  const [anoNavegacao, setAnoNavegacao] = useState(new Date().getFullYear()); // Controla o ano na tela de seleção de meses

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

  // ✨ NOVA LÓGICA DE DATAS ADAPTADA PRO NOVO FILTRO ✨
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

  // GERADOR DE LABEL DINÂMICA
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

  const abrirMenu = () => {
    setAbaSuspensa(filtro.tipo === 'mes' || filtro.tipo === 'ano' ? filtro.tipo : 'hoje');
    setAnoNavegacao(filtro.ano || new Date().getFullYear());
    setMenuDatasAberto(true);
  };

  const aplicarFiltroRapido = (tipo) => {
    setFiltro({ tipo, mes: new Date().getMonth(), ano: new Date().getFullYear() });
    setMenuDatasAberto(false);
  };

  const aplicarFiltroMes = (indiceMes) => {
    setFiltro({ tipo: 'mes', mes: indiceMes, ano: anoNavegacao });
    setMenuDatasAberto(false);
  };

  const aplicarFiltroAno = (anoSelecionado) => {
    setFiltro({ tipo: 'ano', mes: 0, ano: anoSelecionado });
    setMenuDatasAberto(false);
  };

  const anosDisponiveis = [new Date().getFullYear() - 2, new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8 space-y-6">
      
      {/* ✨ HEADER COM O MENU DROPDOWN TIPO SHOPEE ✨ */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm relative">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <PieChart className="text-blue-600" size={32} /> Visão Financeira
          </h1>
          <p className="text-slate-500 font-bold mt-1 text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Acompanhe a saúde do seu caixa
          </p>
        </div>
        
        {/* DROPDOWN MASTER */}
        <div className="relative">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Período dos Dados</span>
            <button 
              onClick={abrirMenu}
              className="flex items-center justify-between gap-4 w-full md:w-64 bg-slate-50 border border-slate-200 hover:border-blue-400 px-4 py-3 rounded-xl shadow-sm transition-all active:scale-95 group"
            >
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className="text-blue-600" />
                <span className="text-xs md:text-sm font-black text-slate-800">{gerarLabelFiltro()}</span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${menuDatasAberto ? 'rotate-180 text-blue-500' : 'group-hover:text-blue-500'}`} />
            </button>
          </div>

          {menuDatasAberto && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuDatasAberto(false)}></div>
              
              {/* O Painel Duplo estilo Shopee */}
              <div className="absolute right-0 mt-2 w-[320px] md:w-[480px] bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden animate-slide-up flex flex-col md:flex-row">
                
                {/* Lado Esquerdo: Menu Lateral */}
                <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 py-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
                  
                  <div className="px-3 py-2 hidden md:block"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rápidos</span></div>
                  
                  {['hoje', 'ontem', '7dias', '30dias'].map(tipo => {
                    const labels = { 'hoje': 'Tempo Real', 'ontem': 'Ontem', '7dias': 'Últimos 7 Dias', '30dias': 'Últimos 30 Dias' };
                    const isActive = filtro.tipo === tipo;
                    return (
                      <button 
                        key={tipo}
                        onMouseEnter={() => setAbaSuspensa(tipo)}
                        onClick={() => aplicarFiltroRapido(tipo)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap md:whitespace-normal
                          ${isActive ? 'text-blue-600 bg-blue-50/50 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-r-2 border-transparent'}`}
                      >
                        {labels[tipo]}
                      </button>
                    )
                  })}

                  <div className="w-full h-px bg-slate-200 my-2 hidden md:block"></div>
                  
                  <button 
                    onMouseEnter={() => setAbaSuspensa('mes')}
                    onClick={() => setAbaSuspensa('mes')}
                    className={`w-full flex justify-between items-center px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap md:whitespace-normal
                      ${abaSuspensa === 'mes' ? 'text-blue-600 bg-blue-50/50 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-r-2 border-transparent'}`}
                  >
                    Por Mês <ChevronRight size={14} className="hidden md:block opacity-50" />
                  </button>

                  <button 
                    onMouseEnter={() => setAbaSuspensa('ano')}
                    onClick={() => setAbaSuspensa('ano')}
                    className={`w-full flex justify-between items-center px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap md:whitespace-normal
                      ${abaSuspensa === 'ano' ? 'text-blue-600 bg-blue-50/50 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-r-2 border-transparent'}`}
                  >
                    Por Ano <ChevronRight size={14} className="hidden md:block opacity-50" />
                  </button>
                </div>

                {/* Lado Direito: Conteúdo Dinâmico */}
                <div className="w-full md:w-2/3 p-5 bg-white min-h-[200px]">
                  
                  {['hoje', 'ontem', '7dias', '30dias'].includes(abaSuspensa) && (
                    <div className="h-full flex flex-col justify-center items-center text-center space-y-3 animate-fade-in text-slate-400">
                      <CalendarDays size={40} strokeWidth={1} className="opacity-50" />
                      <p className="text-sm font-bold">Clique para aplicar o filtro<br/><span className="text-blue-600">{abaSuspensa === 'hoje' ? 'Tempo Real' : abaSuspensa === 'ontem' ? 'Ontem' : abaSuspensa.replace('dias', ' Dias')}</span></p>
                    </div>
                  )}

                  {abaSuspensa === 'mes' && (
                    <div className="animate-fade-in h-full flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setAnoNavegacao(prev => prev - 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"><ChevronLeft size={18} /></button>
                        <span className="font-black text-slate-800">{anoNavegacao}</span>
                        <button onClick={() => setAnoNavegacao(prev => prev + 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"><ChevronRight size={18} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {mesesExtenso.map((m, idx) => {
                          const isSelected = filtro.tipo === 'mes' && filtro.mes === idx && filtro.ano === anoNavegacao;
                          return (
                            <button 
                              key={m} 
                              onClick={() => aplicarFiltroMes(idx)}
                              className={`py-3 text-xs font-bold rounded-lg transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white'}`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {abaSuspensa === 'ano' && (
                    <div className="animate-fade-in h-full flex flex-col justify-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Selecione o Ano</p>
                      <div className="grid grid-cols-2 gap-3">
                        {anosDisponiveis.map(ano => {
                          const isSelected = filtro.tipo === 'ano' && filtro.ano === ano;
                          return (
                            <button 
                              key={ano} 
                              onClick={() => aplicarFiltroAno(ano)}
                              className={`py-4 text-sm font-black rounded-xl transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-white'}`}
                            >
                              {ano}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex flex-col items-center justify-center font-bold text-blue-600 text-lg md:text-xl py-32 animate-pulse gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Processando Balanço Financeiro...
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* CARDS MACRO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] text-blue-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 relative z-10">Faturamento Bruto</p>
              <p className="text-xl md:text-3xl font-black text-slate-800 truncate relative z-10">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
              <ShoppingBag className="absolute right-[-10px] bottom-[-10px] text-slate-500 opacity-10 group-hover:scale-110 transition-transform" size={80} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">Volume de Peças</p>
              <p className="text-xl md:text-3xl font-black text-slate-800 relative z-10">{kpis.pecas} <span className="text-sm font-bold opacity-50">un.</span></p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
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

          {/* GRÁFICO PRINCIPAL DE LINHA */}
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6 text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
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

            <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-black text-slate-800 mb-6 text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
                <Banknote size={18} className="text-red-500" /> Custos e Despesas
              </h3>
              {dadosCategoriasDespesas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sem despesas no período</p></div>
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