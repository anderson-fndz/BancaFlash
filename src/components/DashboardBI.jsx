import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function DashboardBI() {
  const [periodo, setPeriodo] = useState('7dias'); 
  const [carregando, setCarregando] = useState(false);
  
  const [kpis, setKpis] = useState({ faturamento: 0, pecas: 0, ticketMedio: 0, totalPedidos: 0 });
  
  // Gráficos
  const [dadosGraficoLinha, setDadosGraficoLinha] = useState([]); // A Linha do Tempo (Horas ou Dias)
  const [dadosGraficoSemana, setDadosGraficoSemana] = useState([]); // O BarChart de Dias da Semana
  const [dadosGraficoProdutos, setDadosGraficoProdutos] = useState([]); // A Pizza

  const CORES = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2'];

  useEffect(() => {
    buscarDadosBI();
  }, [periodo]);

  const buscarDadosBI = async () => {
    setCarregando(true);
    let dataCorte = new Date();
    dataCorte.setHours(0, 0, 0, 0);

    if (periodo === '7dias') dataCorte.setDate(dataCorte.getDate() - 6);
    else if (periodo === '30dias') dataCorte.setDate(dataCorte.getDate() - 29);
    else if (periodo === 'mes') dataCorte.setDate(1); 

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', dataCorte.toISOString())
      .order('created_at', { ascending: true });

    if (!error && data) processarDados(data, dataCorte);
    setCarregando(false);
  };

  const processarDados = (vendas, dataCorte) => {
    // -----------------------------------------------------
    // 1. KPIs (MACRO)
    // -----------------------------------------------------
    const totalGrana = vendas.reduce((acc, v) => acc + parseFloat(v.total_item), 0);
    const totalPecas = vendas.reduce((acc, v) => acc + parseInt(v.quantidade), 0);
    const pedidosUnicos = new Set(vendas.map(v => v.transacao_id)).size;
    const ticketMedio = pedidosUnicos > 0 ? totalGrana / pedidosUnicos : 0;
    setKpis({ faturamento: totalGrana, pecas: totalPecas, ticketMedio, totalPedidos: pedidosUnicos });

    // -----------------------------------------------------
    // 2. GRÁFICO DE LINHA (SÉRIE TEMPORAL COM ZEROS)
    // -----------------------------------------------------
    let baseLinha = {};
    
    if (periodo === 'hoje') {
      // Cria a régua de 24 horas (ex: 00h, 01h ... 23h) com valor 0
      for(let i = 0; i <= 23; i++) {
        let h = i.toString().padStart(2, '0') + 'h';
        baseLinha[h] = 0;
      }
      // Preenche com as vendas reais
      vendas.forEach(v => {
        let h = new Date(v.created_at).getHours().toString().padStart(2, '0') + 'h';
        baseLinha[h] += parseFloat(v.total_item);
      });
    } else {
      // Cria a régua de DIAS desde a dataCorte até Hoje com valor 0
      let dataAtual = new Date(dataCorte);
      let dataFim = new Date();
      while (dataAtual <= dataFim) {
        let d = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        baseLinha[d] = 0;
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      // Preenche com as vendas reais
      vendas.forEach(v => {
        let d = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if(baseLinha[d] !== undefined) {
          baseLinha[d] += parseFloat(v.total_item);
        }
      });
    }

    const dadosLinha = Object.keys(baseLinha).map(chave => ({
      tempo: chave,
      Vendas: parseFloat(baseLinha[chave].toFixed(2))
    }));
    setDadosGraficoLinha(dadosLinha);

    // -----------------------------------------------------
    // 3. GRÁFICO DE BARRAS: DESEMPENHO POR DIA DA SEMANA
    // -----------------------------------------------------
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let baseBarra = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
    
    vendas.forEach(v => {
      let numeroDia = new Date(v.created_at).getDay(); // 0 é Domingo, 6 é Sábado
      baseBarra[diasSemana[numeroDia]] += parseFloat(v.total_item);
    });

    const graficoSemana = diasSemana.map(dia => ({
      dia: dia,
      Faturamento: parseFloat(baseBarra[dia].toFixed(2))
    }));
    setDadosGraficoSemana(graficoSemana);

    // -----------------------------------------------------
    // 4. GRÁFICO DE PIZZA: TOP MODELOS
    // -----------------------------------------------------
    const agrupadoPorProduto = vendas.reduce((acc, v) => {
      if (!acc[v.produto_nome]) acc[v.produto_nome] = 0;
      acc[v.produto_nome] += parseInt(v.quantidade);
      return acc;
    }, {});

    let graficoProdutos = Object.keys(agrupadoPorProduto)
      .map(name => ({ name, value: agrupadoPorProduto[name] }))
      .sort((a, b) => b.value - a.value);

    // Pega só os top 5 pra pizza não ficar uma bagunça
    if (graficoProdutos.length > 5) {
      const top5 = graficoProdutos.slice(0, 5);
      const outros = graficoProdutos.slice(5).reduce((acc, curr) => acc + curr.value, 0);
      top5.push({ name: 'OUTROS', value: outros });
      graficoProdutos = top5;
    }
    setDadosGraficoProdutos(graficoProdutos);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Visão Geral</h2>
          <p className="text-gray-500 font-bold mt-1">Acompanhe o desempenho da sua banca.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border overflow-x-auto">
        <button onClick={() => setPeriodo('hoje')} className={`flex-1 min-w-[80px] py-3 font-bold rounded-lg text-sm transition-colors ${periodo === 'hoje' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>Hoje</button>
        <button onClick={() => setPeriodo('7dias')} className={`flex-1 min-w-[80px] py-3 font-bold rounded-lg text-sm transition-colors ${periodo === '7dias' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>7 Dias</button>
        <button onClick={() => setPeriodo('mes')} className={`flex-1 min-w-[80px] py-3 font-bold rounded-lg text-sm transition-colors ${periodo === 'mes' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>Este Mês</button>
        <button onClick={() => setPeriodo('30dias')} className={`flex-1 min-w-[80px] py-3 font-bold rounded-lg text-sm transition-colors ${periodo === '30dias' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>30 Dias</button>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center font-bold text-purple-600 text-xl py-20">Processando métricas... ⏳</div>
      ) : (
        <div className="space-y-6">
          
          {/* CARDS MACRO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Faturamento</p>
              <p className="text-3xl font-black text-green-600">R$ {kpis.faturamento.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ticket Médio</p>
              <p className="text-3xl font-black text-blue-600">R$ {kpis.ticketMedio.toFixed(2)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Peças</p>
              <p className="text-3xl font-black text-gray-800">{kpis.pecas} un.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pedidos</p>
              <p className="text-3xl font-black text-purple-600">{kpis.totalPedidos}</p>
            </div>
          </div>

          {/* GRÁFICO PRINCIPAL: LINHA DO TEMPO */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h3 className="font-black text-gray-700 mb-6 text-sm uppercase flex items-center gap-2">
              <span>⏱️</span> {periodo === 'hoje' ? 'Evolução de Vendas (Por Horário)' : 'Evolução de Vendas (Diário)'}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGraficoLinha} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="tempo" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`R$ ${value}`, 'Vendas']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  {/* Essa linha cai pro zero quando não tem venda */}
                  <Line type="monotone" dataKey="Vendas" stroke="#f97316" strokeWidth={4} dot={{ r: 3, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICOS SECUNDÁRIOS: DIA DA SEMANA E PIZZA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <h3 className="font-black text-gray-700 mb-6 text-sm uppercase">Melhores Dias da Semana</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoSemana} margin={{ left: -20, right: 10 }}>
                    <XAxis dataKey="dia" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`R$ ${value}`, 'Faturamento']} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="Faturamento" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <h3 className="font-black text-gray-700 mb-6 text-sm uppercase">Top Modelos (Un.)</h3>
              {dadosGraficoProdutos.length === 0 ? (
                <p className="text-center text-gray-400 py-10 font-bold">Sem vendas no período.</p>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosGraficoProdutos} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dadosGraficoProdutos.map((entry, index) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} un.`, 'Vendido']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}