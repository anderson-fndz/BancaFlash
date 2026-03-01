import React, { useState } from 'react';

export default function Vitrine({ produtos, setProdutoAberto }) {
  const [busca, setBusca] = useState('');
  
  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];

  const nomesFiltrados = nomesUnicos.filter(nome => 
    nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      <div className="sticky top-0 z-10 bg-gray-50 pb-4 pt-2">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar modelo na banca..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-sm border border-gray-200 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="font-bold text-gray-400 mb-4 uppercase tracking-widest text-xs ml-2">Catálogo Disponível</h2>
        
        {nomesFiltrados.length === 0 && (
          <div className="text-center mt-16 bg-white p-10 rounded-3xl border border-dashed border-gray-300">
            <span className="text-5xl">🕵️‍♂️</span>
            <p className="text-gray-500 font-bold mt-4 text-lg">Nenhum modelo encontrado com "{busca}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nomesFiltrados.map(nome => {
            // Calcula informações extras do produto para mostrar no Card
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
                className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all flex flex-col group"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-lg font-black text-gray-800 uppercase tracking-tight pr-4">{nome}</span>
                  <div className="bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-black transition-colors shrink-0">
                    ➔
                  </div>
                </div>
                
                <div className="flex justify-between items-end w-full mt-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">A partir de</p>
                    <p className="font-black text-green-600 text-lg">R$ {precoBase.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estoque</p>
                    <p className="font-bold text-gray-600">{estoqueTotal} un.</p>
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