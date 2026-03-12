import React, { useState } from 'react';
import { Search, ChevronRight, PackageSearch, AlertTriangle } from 'lucide-react';

export default function Vitrine({ produtos, setProdutoAberto }) {
  const [busca, setBusca] = useState('');
  
  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];

  const nomesFiltrados = nomesUnicos.filter(nome => 
    nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="px-4 pb-4 pt-2 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* BARRA DE BUSCA */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md pb-3 pt-1 md:pt-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="relative group mt-1 md:mt-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar modelo na banca..." 
            className="w-full pl-11 pr-4 py-3.5 md:py-4 rounded-2xl shadow-sm border border-slate-200 text-base md:text-lg font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-400 mb-3 md:mb-4 uppercase tracking-widest text-[10px] md:text-xs ml-1">Catálogo Disponível</h2>
        
        {nomesFiltrados.length === 0 && (
          <div className="text-center mt-8 bg-white p-10 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <PackageSearch size={40} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-600 font-black text-base md:text-lg">Nenhum modelo encontrado.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {nomesFiltrados.map(nome => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueBanca = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0), 0);
            const estoqueSaco = variacoes.reduce((acc, p) => acc + (p.estoque_saco || 0), 0);
            const precoBase = variacoes[0]?.preco || 0;
            const bancaZerada = estoqueBanca === 0;

            return (
              <button 
                key={nome}
                onClick={() => {
                  setProdutoAberto(nome);
                  setBusca(''); 
                }}
                className={`w-full bg-white p-4 md:p-6 rounded-2xl shadow-sm border text-left hover:shadow-md active:scale-[0.98] transition-all flex flex-col group relative overflow-hidden ${bancaZerada ? 'border-red-300 hover:border-red-500 ring-1 ring-red-100' : 'border-slate-200 hover:border-blue-500 hover:ring-1 hover:ring-blue-500'}`}
              >
                {/* Faixa vermelha de alerta se a banca zerar */}
                {bancaZerada && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}

                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex-1">
                    <span className={`text-base md:text-lg font-black uppercase tracking-tight transition-colors leading-tight block truncate ${bancaZerada ? 'text-red-700' : 'text-slate-800 group-hover:text-blue-700'}`}>{nome}</span>
                    {bancaZerada && <span className="text-[9px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Banca Zerada</span>}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${bancaZerada ? 'bg-red-50 text-red-400 group-hover:bg-red-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="flex justify-between items-end w-full mt-4 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Preço Base</p>
                    <p className="font-black text-emerald-600 text-sm md:text-base leading-none">R$ {precoBase.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex gap-2 text-right">
                    <div className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Saco</p>
                      <p className="font-black text-slate-700 text-xs md:text-sm leading-none">{estoqueSaco}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-md border ${bancaZerada ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${bancaZerada ? 'text-red-400' : 'text-blue-400'}`}>Banca</p>
                      <p className={`font-black text-xs md:text-sm leading-none ${bancaZerada ? 'text-red-600' : 'text-blue-700'}`}>{estoqueBanca}</p>
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