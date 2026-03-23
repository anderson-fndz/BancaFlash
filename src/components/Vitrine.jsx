import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, PackageSearch, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Vitrine({ produtos, setProdutoAberto, vendas = [] }) {
  const [busca, setBusca] = useState('');
  
  // ✨ LÓGICA DE INTELIGÊNCIA: RANKING E FILTRO ✨
  const nomesOrdenados = useMemo(() => {
    // 1. Só mostra o que está ATIVO (ou que ainda não tem o campo definido como false)
    const produtosAtivos = produtos.filter(p => p.ativo !== false);
    
    const nomesUnicos = [...new Set(produtosAtivos.map(p => p.nome))];

    // 2. Conta as vendas de cada modelo para o ranking
    const contagemVendas = vendas.reduce((acc, v) => {
      acc[v.produto_nome] = (acc[v.produto_nome] || 0) + 1;
      return acc;
    }, {});

    // 3. Ordena: campeões de venda no topo, depois ordem alfabética
    return nomesUnicos.sort((a, b) => {
      const vA = contagemVendas[a] || 0;
      const vB = contagemVendas[b] || 0;
      if (vB !== vA) return vB - vA;
      return a.localeCompare(b);
    });
  }, [produtos, vendas]);

  const nomesFiltrados = nomesOrdenados.filter(nome => 
    nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="px-4 pb-4 pt-2 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* BARRA DE BUSCA STICKY */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md pb-3 pt-1 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="relative group mt-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400 group-focus-within:text-blue-500" />
          </div>
          <input 
            type="text" 
            placeholder="O que vamos vender agora?..." 
            className="w-full pl-11 pr-4 py-3.5 md:py-4 rounded-2xl shadow-sm border border-slate-200 text-base font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 px-1">
           <h2 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Catálogo Inteligente</h2>
           <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase flex items-center gap-1">
             <TrendingUp size={10} /> Os que mais saem primeiro
           </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {nomesFiltrados.map((nome, index) => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueBanca = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0), 0);
            const estoqueSaco = variacoes.reduce((acc, p) => acc + (p.estoque_saco || 0), 0);
            const precoBase = variacoes[0]?.preco || 0;
            const bancaZerada = estoqueBanca === 0;

            return (
              <button 
                key={nome}
                onClick={() => { setProdutoAberto(nome); setBusca(''); }}
                className={`w-full bg-white p-4 rounded-2xl shadow-sm border text-left transition-all flex flex-col group relative overflow-hidden ${bancaZerada ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}
              >
                {/* Badge de TOP 3 */}
                {index < 3 && busca === '' && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase">Mais Vendido</div>
                )}

                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex-1">
                    <span className={`text-base font-black uppercase tracking-tight block truncate ${bancaZerada ? 'text-red-700' : 'text-slate-800'}`}>{nome}</span>
                    {bancaZerada && <span className="text-[9px] font-black uppercase text-red-500 flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Repor na Banca</span>}
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                </div>
                
                <div className="flex justify-between items-end w-full mt-4 pt-3 border-t border-slate-100">
                  <p className="font-black text-emerald-600 text-sm">R$ {precoBase.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <div className="bg-slate-50 px-2 py-1 rounded text-center">
                      <p className="text-[7px] font-bold text-slate-400 uppercase">Saco</p>
                      <p className="font-black text-slate-700 text-xs">{estoqueSaco}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-center border ${bancaZerada ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                      <p className={`text-[7px] font-bold uppercase ${bancaZerada ? 'text-red-400' : 'text-blue-400'}`}>Banca</p>
                      <p className={`font-black text-xs ${bancaZerada ? 'text-red-600' : 'text-blue-700'}`}>{estoqueBanca}</p>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}