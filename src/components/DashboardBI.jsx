import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
// ✨ YAxis importado aqui para travar o eixo do gráfico!
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'; 

export default function DashboardBI() {
  const [periodo, setPeriodo] = useState('7dias'); 
  const [carregando, setCarregando] = useState(false);
  
  const [kpis, setKpis] = useState({ faturamento: 0, pecas: 0, ticketMedio: 0, totalPedidos: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 });
  
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([]); 
  const [dadosGraficoSemana, setDadosGraficoSemana] = useState([]); 
  const [dadosGraficoProdutos, setDadosGraficoProdutos] = useState([]); 
  const [dadosCategoriasDespesas, setDadosCategoriasDespesas] = useState([]);

  // Estados dos Filtros Operacionais
  const [todasVendas, setTodasVendas] = useState([]);
  const [todasDespesas, setTodasDespesas] = useState([]);
  const [produtosRef, setProdutosRef] = useState([]);
  const [nomesVendidos, setNomesVendidos] = useState([]);
  const [filtroProdutos, setFiltroProdutos] = useState([]); 

  // Estados para os toggles do gráfico (Ligar/Desligar linhas)
  const [mostrarFaturamento, setMostrarFaturamento] = useState(true);
  const [mostrarLucro, setMostrarLucro] = useState(true);
  const [mostrarDespesas, setMostrarDespesas] = useState(false);

  const CORES = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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
  }, [todasVendas, todasDespesas, produtosRef, filtroProdutos, periodo]);

  const buscarDadosBI = async () => {
    setCarregando(true);
    const dataCorte = getDataCorte();

    // Busca Vendas, Produtos E Despesas tudo de uma vez
    const [resVendas, resProd, resDespesas] = await Promise.all([
      supabase.from('vendas').select('*').gte('created_at', dataCorte.toISOString()).order('created_at', { ascending: true }),
      supabase.from('produtos').select('nome, custo'),
      supabase.from('despesas').select('*').gte('created_at', dataCorte.toISOString())
    ]);

    if (!resVendas.error && resVendas.data) {
      setTodasVendas(resVendas.data);
      setNomesVendidos([...new Set(resVendas.data.map(v => v.produto_nome))]);
    }
    if (!resProd.error && resProd.data) setProdutosRef(resProd.data);
    if (!resDespesas.error && resDespesas.data) setTodasDespesas(resDespesas.data);

    setCarregando(false);
  };

  const processarDados = (vendasIniciais, despesas, produtosBase) => {
    const dataCorte = getDataCorte();

    const vendas = filtroProdutos.length === 0 ? vendasIniciais : vendasIniciais.filter(v => filtroProdutos.includes(v.produto_nome));

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

    // 2. PREPARAÇÃO DA LINHA DO TEMPO (Cruzando Vendas e Despesas)
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

    // Calcula o Lucro Líquido para cada ponto no gráfico
    const dadosLinha = Object.values(baseLinha).map(ponto => ({
      tempo: ponto.tempo,
      Faturamento: parseFloat(ponto.Faturamento.toFixed(2)),
      Despesas: parseFloat(ponto.Despesas.toFixed(2)),
      Lucro: parseFloat((ponto.Faturamento - ponto.Custo - ponto.Despesas).toFixed(2))
    }));
    setDadosGraficoLinha(dadosLinha);

    // 3. DIAS DA SEMANA
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let baseBarra = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
    vendas.forEach(v => baseBarra[diasSemana[new Date(v.created_at).getDay()]] += parseFloat(v.total_item));
    setDadosGraficoSemana(diasSemana.map(dia => ({ dia: dia, Faturamento: parseFloat(baseBarra[dia].toFixed(2)) })));

    // 4. TOP PRODUTOS
    const agrupadoProd = vendas.reduce((acc, v) => {
      acc[v.produto_nome] = (acc[v.produto_nome] || 0) + parseInt(v.quantidade); return acc;
    }, {});
    setDadosGraficoProdutos(Object.keys(agrupadoProd).map(name => ({ name, value: agrupadoProd[name] })).sort((a, b) => b.value - a.value).slice(0, 5));

    // 5. DESPESAS POR CATEGORIA
    const agrupadoCat = despesas.reduce((acc, d) => {
      const cat = d.categoria || 'OUTROS';
      acc[cat] = (acc[cat] || 0) + parseFloat(d.valor); return acc;
    }, {});
    setDadosCategoriasDespesas(Object.entries(agrupadoCat).sort((a, b) => b[1] - a[1]));
  };

  const toggleFiltroProduto = (nome) => {
    setFiltroProdutos(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]);
  };

  // ✨ TRAVA DO GRÁFICO (EIXO Y): Pega o maior Faturamento + 10% pra dar uma folga
  const maxEixoY = dadosGraficoLinha.length > 0 
    ? Math.max(...dadosGraficoLinha.map(d => d.Faturamento)) * 1.1 
    : 'auto';

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <span className="text-3xl">📈</span> Dashboard (BI)
          </h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">
            Inteligência Financeira da Banca
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          {['hoje', '7dias', 'mes', '30dias'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`flex-1 px-4 py-2.5 text-[10px] md:text-xs font-black rounded-lg transition-colors uppercase whitespace-nowrap ${periodo === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
              {p === 'mes' ? 'Este Mês' : p.replace('dias', ' Dias')}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center font-bold text-blue-600 text-lg md:text-xl py-20 animate-pulse">Calculando métricas... ⏳</div>
      ) : (
        <div className="space-y-6">
          
          {/* CARDS MACRO COM LUCRO LÍQUIDO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-5 rounded-3xl border-2 border-blue-100 shadow-sm flex flex-col justify-center">
              <p className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Entradas (Faturamento)</p>
              <p className="text-xl md:text-2xl font-black text-gray-800 truncate">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-3xl border-2 border-red-100 shadow-sm flex flex-col justify-center">
              <p className="text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Saídas (Despesas)</p>
              <p className="text-xl md:text-2xl font-black text-gray-800 truncate">R$ {kpis.despesas.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-3xl border-2 border-gray-200 shadow-sm flex flex-col justify-center">
              <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Lucro Bruto (Apenas Peças)</p>
              <p className="text-xl md:text-2xl font-black text-gray-800 truncate">R$ {kpis.lucroBruto.toFixed(2)}</p>
            </div>
            <div className={`p-4 md:p-5 rounded-3xl border-2 shadow-sm flex flex-col justify-center col-span-2 lg:col-span-1 ${kpis.lucroLiquido >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${kpis.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>Lucro Líquido Real</p>
              <p className={`text-2xl md:text-3xl font-black truncate ${kpis.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>R$ {kpis.lucroLiquido.toFixed(2)}</p>
            </div>
          </div>

          {/* GRÁFICO PRINCIPAL COM TOGGLES E EIXO Y TRAVADO */}
          <div className="bg-white p-4 md:p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h3 className="font-black text-gray-800 text-xs md:text-sm uppercase flex items-center gap-2">
                <span>⏱️</span> Evolução do Negócio
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMostrarFaturamento(!mostrarFaturamento)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${mostrarFaturamento ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarFaturamento ? 'bg-blue-600' : 'bg-gray-300'}`}></div> Faturamento
                </button>
                <button onClick={() => setMostrarLucro(!mostrarLucro)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${mostrarLucro ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarLucro ? 'bg-green-500' : 'bg-gray-300'}`}></div> Lucro Líquido
                </button>
                <button onClick={() => setMostrarDespesas(!mostrarDespesas)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${mostrarDespesas ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${mostrarDespesas ? 'bg-red-500' : 'bg-gray-300'}`}></div> Despesas
                </button>
              </div>
            </div>

            <div className="h-52 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGraficoLinha} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tempo" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                  
                  {/* ✨ Eixo Y escondido mas travando o teto do gráfico! */}
                  <YAxis hide domain={[0, maxEixoY]} />
                  
                  <Tooltip formatter={(value, name) => [`R$ ${value}`, name]} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  {mostrarFaturamento && <Line type="monotone" dataKey="Faturamento" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />}
                  {mostrarLucro && <Line type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 7 }} />}
                  {mostrarDespesas && <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* GRÁFICO DE CATEGORIAS DE DESPESAS */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border-2 border-gray-100 shadow-sm flex flex-col">
              <h3 className="font-black text-gray-800 mb-4 text-xs md:text-sm uppercase">💸 Para onde foi o dinheiro?</h3>
              {dadosCategoriasDespesas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center"><p className="text-gray-400 font-bold text-xs">Sem despesas registradas.</p></div>
              ) : (
                <div className="space-y-4">
                  {dadosCategoriasDespesas.map(([cat, val]) => {
                    const pct = ((val / kpis.despesas) * 100).toFixed(0);
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-gray-600 uppercase">{cat}</span>
                          <div className="text-right flex items-center"><span className="text-[9px] text-gray-400 font-bold mr-2">{pct}%</span><span className="text-xs font-black text-gray-800">R$ {val.toFixed(2)}</span></div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-red-500 h-full rounded-full" style={{ width: `${pct}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* GRÁFICO DE TOP MODELOS */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-800 mb-2 text-xs md:text-sm uppercase">📦 Top Modelos Vendidos</h3>
              {dadosGraficoProdutos.length === 0 ? (
                <div className="h-40 flex items-center justify-center"><p className="text-gray-400 font-bold text-xs">Sem vendas registradas.</p></div>
              ) : (
                <div className="flex flex-col justify-between h-full pb-4">
                  <div className="h-32 md:h-40 w-full flex justify-center items-center mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={dadosGraficoProdutos} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">{dadosGraficoProdutos.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}</Pie><Tooltip formatter={(val) => [`${val} un.`]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {dadosGraficoProdutos.map((entry, index) => (
                      <div key={entry.name} className="flex justify-between items-center text-[10px] md:text-xs bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1.5 overflow-hidden pr-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CORES[index % CORES.length] }}></div><span className="font-black text-gray-700 truncate uppercase">{entry.name}</span></div>
                        <span className="font-black text-gray-900 shrink-0">{entry.value} un.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>

        </div>
      )}
    </div>
  );
}