import React from 'react';

export default function Vitrine({ produtos, setProdutoAberto }) {
  // Pega só os nomes sem repetir
  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-gray-500 mb-2">SELECIONE O MODELO:</h2>
      {nomesUnicos.map(nome => (
        <button 
          key={nome}
          onClick={() => setProdutoAberto(nome)}
          className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-left active:scale-95 transition-transform flex justify-between items-center"
        >
          <span className="text-xl font-bold text-gray-800">{nome}</span>
          <span className="text-blue-500 font-bold text-2xl">➔</span>
        </button>
      ))}
    </div>
  );
}