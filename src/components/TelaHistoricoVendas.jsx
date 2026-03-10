import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { CalendarRange, Search, Download, ChevronDown, ChevronRight, Clock, Banknote, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TelaHistoricoVendas() {
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  
  const [periodoRapido, setPeriodoRapido] = useState('7dias'); 
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [busca, setBusca] = useState('');
  
  const [gruposExpandidos, setGruposExpandidos] = useState({});

  useEffect(() => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    if (periodoRapido === 'hoje') {
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodoRapido === '7dias') {
      inicio.setDate(hoje.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodoRapido === '30dias') {
      inicio.setDate(hoje.getDate() - 29);
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodoRapido === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (periodoRapido !== 'personalizado') {
      const formatarDataInput = (data) => {
        const offset = data.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(data - offset)).toISOString().slice(0, 10);
        return localISOTime;
      };
      
      setDataInicial(formatarDataInput(inicio));
      setDataFinal(formatarDataInput(fim));
    }
  }, [periodoRapido]);

  useEffect(() => {
    if (dataInicial && dataFinal) {
      buscarVendas();
    }
  }, [dataInicial, dataFinal]);

  const buscarVendas = async () => {
    setCarregando(true);
    const inicioISO = new Date(`${dataInicial}T00:00:00`).toISOString();
    const fimISO = new Date(`${dataFinal}T23:59:59.999`).toISOString();

    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVendas(data);
    } else {
      toast.error('Erro ao buscar histórico.');
    }
    setCarregando(false);
  };

  const vendasFiltradas = vendas.filter(v => 
    v.produto_nome.toLowerCase().includes(busca.toLowerCase()) || 
    (v.transacao_id && v.transacao_id.includes(busca))
  );

  const vendasAgrupadas = Object.values(vendasFiltradas.reduce((acc, venda) => {
    const chave = venda.transacao_id || (venda.created_at ? venda.created_at.substring(0, 16) : venda.id); 
    if (!acc[chave]) {
      acc[chave] = { id_grupo: chave, data: venda.created_at, itens: [], total: 0, pagamentos: new Set() };
    }
    acc[chave].itens.push(venda);
    acc[chave].total += parseFloat(venda.total_item);
    acc[chave].pagamentos.add(venda.forma_pagamento);
    return acc;
  }, {})).sort((a, b) => new Date(b.data) - new Date(a.data));

  const faturamentoPeriodo = vendasAgrupadas.reduce((acc, g) => acc + g.total, 0);
  const pecasPeriodo = vendasFiltradas.reduce((acc, v) => acc + parseInt(v.quantidade), 0);

  const toggleSanfona = (id) => {
    setGruposExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportarCSV = () => {
    if (vendasFiltradas.length === 0) {
      toast.error("Não há dados para exportar nesse período.");
      return;
    }
    let csv = 'Data;Hora;Cod. Transacao;Produto;Cor;Tamanho;Quantidade;Valor Unitario;Total;Forma Pagamento\n';
    vendasAgrupadas.forEach(grupo => {
      grupo.itens.forEach(item => {
        const dataObj = new Date(item.created_at);
        csv += `${dataObj.toLocaleDateString('pt-BR')};${dataObj.toLocaleTimeString('pt-BR')};${grupo.id_grupo};${item.produto_nome};${item.produto_cor};${item.produto_tam};${item.quantidade};${item.preco_unitario};${item.total_item};${item.forma_pagamento}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Historico_Vendas_${dataInicial}_a_${dataFinal}.csv`;
    link.click();
    toast.success("Planilha exportada com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-24 md:pb-8 flex flex-col h-full">
      
      {/* ✨ HEADER & FILTROS SUPER COMPACTOS ✨ */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-4 flex flex-col gap-4">
        
        {/* TOPO: Título, Resumo e Exportar na mesma linha (se couber) */}
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="text-blue-600 shrink-0" size={28} /> 
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">Histórico de Vendas</h1>
              <p className="text-slate-500 font-bold mt-1 text-[10px] uppercase tracking-widest">Auditoria e Exportação</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* O Resumo Gigante virou essa "etiqueta" elegante */}
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Banknote size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total:</span>
                <span className="text-sm font-black text-slate-800">R$ {faturamentoPeriodo.toFixed(2)}</span>
              </div>
              <div className="w-px h-4 bg-slate-300"></div>
              <div className="flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-emerald-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Peças:</span>
                <span className="text-sm font-black text-slate-800">{pecasPeriodo}</span>
              </div>
            </div>
            
            <button 
              onClick={exportarCSV}
              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-colors active:scale-95 shadow-sm"
            >
              <Download size={16} /> Exportar
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* CONTROLES: Filtros e Busca compactados */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto shrink-0">
              {['hoje', '7dias', 'mes', '30dias', 'personalizado'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setPeriodoRapido(p)} 
                  className={`px-3 py-1.5 text-[10px] font-black rounded-md transition-colors uppercase whitespace-nowrap ${periodoRapido === p ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {p === 'mes' ? 'Este Mês' : p === 'personalizado' ? 'Data Exata' : p.replace('dias', ' Dias')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <input 
                type="date" 
                value={dataInicial}
                onChange={(e) => { setDataInicial(e.target.value); setPeriodoRapido('personalizado'); }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-slate-400 font-black text-[10px] uppercase">até</span>
              <input 
                type="date" 
                value={dataFinal}
                onChange={(e) => { setDataFinal(e.target.value); setPeriodoRapido('personalizado'); }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="w-full lg:w-64 relative group shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por modelo..." 
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ✨ LISTA DE VENDAS (AGORA É A ESTRELA DA TELA) ✨ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Puxando transações...</p>
          </div>
        ) : vendasAgrupadas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Search size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-black text-base">Nenhuma venda encontrada.</p>
            <p className="text-slate-400 text-xs font-bold mt-1">Ajuste o filtro de datas acima.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {vendasAgrupadas.map((grupo) => {
              const isExpandido = gruposExpandidos[grupo.id_grupo];
              const dataVenda = new Date(grupo.data);

              return (
                <div key={grupo.id_grupo} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300">
                  
                  <div 
                    className="bg-slate-50/50 px-4 py-2.5 flex justify-between items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSanfona(grupo.id_grupo)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-slate-200 text-slate-600 w-9 h-9 rounded-lg flex items-center justify-center font-black text-[11px] shadow-sm shrink-0">
                        {dataVenda.getDate()}/{dataVenda.getMonth()+1}
                      </div>
                      <div>
                        <span className="font-black text-slate-800 text-xs uppercase tracking-tight block leading-none mb-1">Cód: {grupo.id_grupo.slice(-6)}</span>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                          <Clock size={10} /> {dataVenda.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right">
                        <span className="font-black text-emerald-600 text-base block leading-none mb-1">R$ {grupo.total.toFixed(2)}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {Array.from(grupo.pagamentos).join(' + ')}
                        </span>
                      </div>
                      <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isExpandido ? 'bg-slate-200 text-slate-600' : 'text-slate-400'}`}>
                        <ChevronDown className={`transition-transform duration-300 ${isExpandido ? 'rotate-180' : ''}`} size={16} />
                      </div>
                    </div>
                  </div>

                  {isExpandido && (
                    <div className="p-0 border-t border-slate-100 animate-fade-in">
                      <div className="px-4 py-1.5 bg-slate-50/80 border-b border-slate-100 flex text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex-1">Produto</span>
                        <span className="w-20 text-right">Preço</span>
                        <span className="w-20 text-right">Total</span>
                      </div>
                      
                      {grupo.itens.map(venda => (
                        <div key={venda.id} className="flex items-center px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                          <div className="flex-1">
                            <p className="font-black text-slate-700 text-xs leading-tight flex items-center gap-1.5 uppercase">
                              <span className="text-blue-600 bg-blue-100 px-1 rounded">{venda.quantidade}x</span> {venda.produto_nome}
                            </p>
                            <p className="font-bold text-slate-400 text-[9px] mt-1 uppercase tracking-wide">
                              Tam: <span className="text-slate-600">{venda.produto_tam}</span> <span className="mx-1">|</span> Cor: <span className="text-slate-600">{venda.produto_cor}</span>
                            </p>
                          </div>
                          <div className="w-20 text-right font-bold text-slate-400 text-[11px]">
                            R$ {parseFloat(venda.preco_unitario).toFixed(2)}
                          </div>
                          <div className="w-20 text-right font-black text-slate-700 text-xs">
                            R$ {parseFloat(venda.total_item).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}