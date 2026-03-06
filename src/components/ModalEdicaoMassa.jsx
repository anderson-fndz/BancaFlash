import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalEdicaoMassa({ aberto, fechar, produtoBase, buscarProdutos }) {
  const [formEdicaoMassa, setFormEdicaoMassa] = useState({ 
    nomeAntigo: '', 
    nomeNovo: '', 
    preco: '', 
    preco_atacado: '', 
    custo: '' 
  });

  useEffect(() => {
    if (aberto && produtoBase) {
      setFormEdicaoMassa({
        nomeAntigo: produtoBase.nome,
        nomeNovo: produtoBase.nome,
        preco: produtoBase.preco,
        preco_atacado: produtoBase.preco_atacado || produtoBase.preco,
        custo: produtoBase.custo || ''
      });
    }
  }, [aberto, produtoBase]);

  if (!aberto || !produtoBase) return null;

  const salvarEdicaoMassa = async () => {
    if (!formEdicaoMassa.nomeNovo.trim()) {
      toast.error("O nome não pode ficar vazio!");
      return;
    }

    const dadosMassa = {
      nome: formEdicaoMassa.nomeNovo.trim().toUpperCase(),
      preco: parseFloat(formEdicaoMassa.preco || 0),
      preco_atacado: parseFloat(formEdicaoMassa.preco_atacado || 0),
      custo: parseFloat(formEdicaoMassa.custo || 0)
    };

    const loadingId = toast.loading("Atualizando todas as variações...");
    
    // Atualiza TODOS os produtos que tem o nome antigo
    await supabase.from('produtos').update(dadosMassa).eq('nome', formEdicaoMassa.nomeAntigo);

    await buscarProdutos();
    fechar();
    toast.success("Produto atualizado por completo!", { id: loadingId });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="font-black text-gray-800 flex items-center gap-2">✏️ Editar Modelo Base</h3>
          <button onClick={fechar} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nome do Modelo</label>
            <input 
              type="text" 
              className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none" 
              value={formEdicaoMassa.nomeNovo} 
              onChange={e => setFormEdicaoMassa({...formEdicaoMassa, nomeNovo: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Preço Varejo</label>
              <input 
                type="number" 
                className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none" 
                value={formEdicaoMassa.preco} 
                onChange={e => setFormEdicaoMassa({...formEdicaoMassa, preco: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Preço Atacado</label>
              <input 
                type="number" 
                className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none" 
                value={formEdicaoMassa.preco_atacado} 
                onChange={e => setFormEdicaoMassa({...formEdicaoMassa, preco_atacado: e.target.value})} 
              />
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
            <label className="text-xs font-bold text-yellow-700 uppercase block mb-1">Custo de Produção</label>
            <input 
              type="number" 
              className="w-full p-2 bg-transparent border-b-2 border-yellow-300 text-yellow-900 outline-none font-bold placeholder-yellow-400" 
              placeholder="R$ 0.00"
              value={formEdicaoMassa.custo} 
              onChange={e => setFormEdicaoMassa({...formEdicaoMassa, custo: e.target.value})} 
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-[10px] font-bold text-blue-800 mt-2 text-center uppercase tracking-widest border border-blue-100">
            Isso altera todas as cores e tamanhos
          </div>

          <button 
            onClick={salvarEdicaoMassa} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl mt-2 active:scale-95 transition-colors uppercase tracking-widest shadow-md"
          >
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
}