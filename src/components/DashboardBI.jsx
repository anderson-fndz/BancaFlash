import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function DashboardBI() {
  const [periodo, setPeriodo] = useState('7dias'); 
  const [carregando, setCarregando] = useState(false);
  
  const [kpis, setKpis] = useState({ faturamento: 0, pecas: 0, ticketMedio: 0, totalPedidos: 0 });
  
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([]); 
  const [dadosGraficoSemana, setDadosGraficoSemana] = useState([]); 
  const [dadosGraficoProdutos, setDadosGraficoProdutos] = useState([]); 

  const CORES = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2'];

  useEffect(() => {
    buscarDadosBI();
  }, [periodo]);

  const buscarDadosBI = async () => {
    setCarregando(true);
    let dataCorte = new Date();
    dataCorte.setHours(0, 0, 0, 0);

    if (periodo === 'hoje') {
      // Deixa dataCorte como hoje 00:00
    } else if (periodo === '7dias') {
      dataCorte.setDate(dataCorte.getDate() - 6);
    } else if (periodo === '30dias') {
      dataCorte.setDate(dataCorte.getDate() - 29);
    } else if (periodo === 'mes') {
      dataCorte.setDate(1); 
    }

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', dataCorte.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) processarDados(data, dataCorte);
    setCarregando(false);
  };

  const processarDados = (vendas, dataCorte) => {
    // KPIs
    const totalGrana = vendas.reduce((acc, v) => acc + parseFloat(v.total_item), 0);
    const totalPecas = vendas.reduce((acc, v) => acc + parseInt(v.quantidade), 0);
    const pedidosUnicos = new Set(vendas.map(v => v.transacao_id)).size;
    const ticketMedio = pedidosUnicos > 0 ? totalGrana / pedidosUnicos : 0;
    setKpis({ faturamento: totalGrana, pecas: totalPecas, ticketMedio, totalPedidos: pedidosUnicos });

    // GRÁFICO DE LINHA
    let baseLinha = {};
    if (periodo === 'hoje') {
      for(let i = 0; i <= 23; i++) {
        let h = i.toString().padStart(2, '0') + 'h';
        baseLinha[h] = 0;
      }
      vendas.forEach(v => {
        let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
        baseLinha[h] += parseFloat(v.total_item);
      });
    } else {
      let dataAtual = new Date(dataCorte);
      let dataFim = new Date();
      while (dataAtual <= dataFim) {
        let d = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        baseLinha[d] = 0;
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      vendas.forEach(v => {
        let d = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if(baseLinha[d] !== undefined) {
          baseLinha[d] += parseFloat(v.total_item);
        }
      });
    }
    const dadosLinha = Object.keys(baseLinha).map(chave => ({ tempo: chave, Vendas: parseFloat(baseLinha[chave].toFixed(2)) }));
    setDadosGraficoLinha(dadosLinha);

    // GRÁFICO DE BARRAS (SEMANA)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let baseBarra = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
    vendas.forEach(v => {
      let numeroDia = new Date(v.created_at).getDay(); 
      baseBarra[diasSemana[numeroDia]] += parseFloat(v.total_item);
    });
    const graficoSemana = diasSemana.map(dia => ({ dia: dia, Faturamento: parseFloat(baseBarra[dia].toFixed(2)) }));
    setDadosGraficoSemana(graficoSemana);

    // GRÁFICO DE PIZZA (PRODUTOS)
    const agrupadoPorProduto = vendas.reduce((acc, v) => {
      if (!acc[v.produto_nome]) acc[v.produto_nome] = 0;
      acc[v.produto_nome] += parseInt(v.quantidade);
      return acc;
    }, {});
    let graficoProdutos = Object.keys(agrupadoPorProduto)
      .map(name => ({ name, value: agrupadoPorProduto[name] }))
      .sort((a, b) => b.value - a.value);

    if (graficoProdutos.length > 5) {
      const top5 = graficoProdutos.slice(0, 5);
      const outros = graficoProdutos.slice(5).reduce((acc, curr) => acc + curr.value, 0);
      top5.push({ name: 'OUTROS', value: outros });
      graficoProdutos = top5;
    }
    setDadosGraficoProdutos(graficoProdutos);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 md:p-8 animate-fade-in pb-24 md:pb-8">
      
      <div className="flex justify-between items-center mb-5 md:mb-6 border-b border-gray-200 pb-3 md:pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800">Visão Geral</h2>
          <p className="text-sm md:text-base text-gray-500 font-bold mt-1">Acompanhe o desempenho da sua banca.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border overflow-x-auto">
        <button onClick={() => setPeriodo('hoje')} className={`flex-1 min-w-[70px] py-2 md:py-3 font-bold rounded-lg text-xs md:text-sm transition-colors ${periodo === 'hoje' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>Hoje</button>
        <button onClick={() => setPeriodo('7dias')} className={`flex-1 min-w-[70px] py-2 md:py-3 font-bold rounded-lg text-xs md:text-sm transition-colors ${periodo === '7dias' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>7 Dias</button>
        <button onClick={() => setPeriodo('mes')} className={`flex-1 min-w-[70px] py-2 md:py-3 font-bold rounded-lg text-xs md:text-sm transition-colors ${periodo === 'mes' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>Este Mês</button>
        <button onClick={() => setPeriodo('30dias')} className={`flex-1 min-w-[70px] py-2 md:py-3 font-bold rounded-lg text-xs md:text-sm transition-colors ${periodo === '30dias' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>30 Dias</button>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center font-bold text-purple-600 text-lg md:text-xl py-20">Processando métricas... ⏳</div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          
          {/* CARDS MACRO (Ajustado os textos para mobile) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Faturamento</p>
              <p className="text-xl md:text-3xl font-black text-green-600 truncate">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Médio</p>
              <p className="text-xl md:text-3xl font-black text-blue-600 truncate">R$ {kpis.ticketMedio.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Peças</p>
              <p className="text-xl md:text-3xl font-black text-gray-800">{kpis.pecas} un.</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pedidos</p>
              <p className="text-xl md:text-3xl font-black text-purple-600">{kpis.totalPedidos}</p>
            </div>
          </div>

          {/* GRÁFICO PRINCIPAL: LINHA DO TEMPO */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm">
            <h3 className="font-black text-gray-700 mb-4 md:mb-6 text-xs md:text-sm uppercase flex items-center gap-2">
              <span>⏱️</span> {periodo === 'hoje' ? 'Evolução de Vendas (Por Horário)' : 'Evolução de Vendas (Diário)'}
            </h3>
            <div className="h-52 md:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/* Adicionado margem superior e ajuste nas laterais para não cortar no celular */}
                <LineChart data={dadosGraficoLinha} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tempo" fontSize={10} md:fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`R$ ${value}`, 'Vendas']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="Vendas" stroke="#f97316" strokeWidth={4} dot={{ r: 3, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICOS SECUNDÁRIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm">
              <h3 className="font-black text-gray-700 mb-4 md:mb-6 text-xs md:text-sm uppercase">Melhores Dias da Semana</h3>
              <div className="h-48 md:h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoSemana} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="dia" fontSize={10} md:fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`R$ ${value}`, 'Faturamento']} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Faturamento" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm">
              <h3 className="font-black text-gray-700 mb-2 md:mb-4 text-xs md:text-sm uppercase">Top Modelos (Un.)</h3>
              {dadosGraficoProdutos.length === 0 ? (
                <p className="text-center text-gray-400 py-10 font-bold">Sem vendas no período.</p>
              ) : (
                <div className="flex flex-col">
                  {/* O Gráfico de Rosca menor pro celular pra sobrar espaço pra legenda */}
                  <div className="h-40 md:h-48 w-full flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dadosGraficoProdutos} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                          {dadosGraficoProdutos.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} un.`, 'Vendido']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* NOVA LEGENDA BONITONA AQUI */}
                  <div className="mt-2 md:mt-4 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {dadosGraficoProdutos.map((entry, index) => (
                      <div key={entry.name} className="flex justify-between items-center text-xs md:text-sm">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CORES[index % CORES.length] }}></div>
                          <span className="font-bold text-gray-700 truncate">{entry.name}</span>
                        </div>
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