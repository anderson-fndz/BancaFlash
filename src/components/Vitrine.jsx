import React, { useState } from 'react';
import { Search, ChevronRight, PackageSearch } from 'lucide-react';

export default function Vitrine({ produtos, setProdutoAberto }) {
  const [busca, setBusca] = useState('');
  
  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];

  const nomesFiltrados = nomesUnicos.filter(nome => 
    nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* BARRA DE BUSCA PREMIUM */}
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md pb-4 pt-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar modelo na banca..." 
            className="w-full pl-11 pr-4 py-4 rounded-2xl shadow-sm border border-slate-200 text-base md:text-lg font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-400 mb-4 uppercase tracking-widest text-xs ml-2">Catálogo Disponível</h2>
        
        {/* ESTADO VAZIO (EMPTY STATE) PROFISSIONAL */}
        {nomesFiltrados.length === 0 && (
          <div className="text-center mt-12 bg-white p-12 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <PackageSearch size={48} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-600 font-black text-lg">Nenhum modelo encontrado com "{busca}"</p>
            <p className="text-slate-400 text-sm mt-1 font-medium">Tente buscar por outro nome ou verifique a ortografia.</p>
          </div>
        )}

        {/* GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {nomesFiltrados.map(nome => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
            const precoBase = variacoes[0]?.preco || 0;

            return (
              <button 
                key={nome}
                onClick={() => {
                  setProdutoAberto(nome);
                  setBusca(''); 
                }}
                className="w-full bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 text-left hover:border-blue-500 hover:shadow-md hover:ring-1 hover:ring-blue-500 active:scale-[0.98] transition-all flex flex-col group"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-lg font-black text-slate-800 uppercase tracking-tight pr-4 group-hover:text-blue-700 transition-colors">{nome}</span>
                  <div className="bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shrink-0">
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="flex justify-between items-end w-full mt-6 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">A partir de</p>
                    <p className="font-black text-emerald-600 text-lg md:text-xl leading-none">R$ {precoBase.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estoque</p>
                    <p className={`font-black text-base md:text-lg leading-none ${estoqueTotal <= 5 ? 'text-red-500' : 'text-slate-700'}`}>
                      {estoqueTotal} <span className="text-xs font-bold opacity-70">un.</span>
                    </p>
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