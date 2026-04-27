import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Settings, X, Trash2, Eye, EyeOff } from 'lucide-react';

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

  // ✨ FUNÇÃO: SALVAR EDIÇÕES DE TEXTO E VALORES ✨
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
    
    const { error } = await supabase.from('produtos').update(dadosMassa).eq('nome', formEdicaoMassa.nomeAntigo);

    if (error) {
      toast.error("Erro ao atualizar o modelo.", { id: loadingId });
      return;
    }

    await buscarProdutos();
    fechar();
    toast.success("Produto atualizado por completo!", { id: loadingId });
  };

  // ✨ FUNÇÃO: ATIVAR/DESATIVAR MODELO ✨
  const handleToggleAtivo = async () => {
    // Se for explicitamente false, passa pra true. Senão, vira false.
    const novoStatus = produtoBase.ativo === false ? true : false; 
    const loadingId = toast.loading(`${novoStatus ? 'Ativando' : 'Escondendo'} modelo...`);
    
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: novoStatus })
        .eq('nome', produtoBase.nome);

      if (error) throw error;
      
      await buscarProdutos();
      toast.success(`Modelo ${novoStatus ? 'visível na vitrine' : 'escondido'}!`, { id: loadingId });
      fechar();
    } catch (error) {
      toast.error("Erro ao mudar status do modelo.", { id: loadingId });
    }
  };

  // ✨ FUNÇÃO: EXCLUIR MODELO INTEIRO ✨
  const handleExcluirModelo = async () => {
    const confirmacao = window.confirm(`⚠️ PERIGO: Você vai excluir TODAS as cores e tamanhos do modelo "${produtoBase.nome}". Esta ação não tem volta. Confirmar?`);
    
    if (confirmacao) {
      const loadingId = toast.loading("Excluindo modelo inteiro...");
      try {
        const { error } = await supabase
          .from('produtos')
          .delete()
          .eq('nome', produtoBase.nome);

        if (error) throw error;

        await buscarProdutos();
        toast.success("Modelo removido com sucesso!", { id: loadingId });
        fechar();
      } catch (error) {
        toast.error("Erro ao excluir modelo.", { id: loadingId });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[70] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={fechar}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-600" size={20} /> Editar Modelo
          </h3>
          <button onClick={fechar} className="bg-slate-100 hover:bg-slate-200 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* NOME */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nome do Modelo</label>
            <input 
              type="text" 
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none transition-all" 
              value={formEdicaoMassa.nomeNovo} 
              onChange={e => setFormEdicaoMassa({...formEdicaoMassa, nomeNovo: e.target.value})} 
            />
          </div>
          
          {/* PREÇOS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Preço Varejo</label>
              <input 
                type="number" 
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none transition-all" 
                value={formEdicaoMassa.preco} 
                onChange={e => setFormEdicaoMassa({...formEdicaoMassa, preco: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Preço Atacado</label>
              <input 
                type="number" 
                className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none transition-all" 
                value={formEdicaoMassa.preco_atacado} 
                onChange={e => setFormEdicaoMassa({...formEdicaoMassa, preco_atacado: e.target.value})} 
              />
            </div>
          </div>

          {/* CUSTO */}
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

          <button 
            onClick={salvarEdicaoMassa} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl mt-2 active:scale-95 transition-all uppercase tracking-widest shadow-md flex justify-center items-center gap-2"
          >
            Salvar Alterações
          </button>

          {/* ✨ NOVA SEÇÃO: AÇÕES DO MODELO ✨ */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Configurações Críticas</p>
            
            <div className="flex gap-3">
              {/* Botão de Ativar/Desativar */}
              <button 
                onClick={handleToggleAtivo} 
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 border transition-all ${
                  produtoBase.ativo === false 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {produtoBase.ativo === false ? <Eye size={16}/> : <EyeOff size={16}/>}
                {produtoBase.ativo === false ? 'Mostrar' : 'Esconder'}
              </button>

              {/* Botão de Excluir */}
              <button 
                onClick={handleExcluirModelo} 
                className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 bg-red-50 border border-red-100 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={16}/>
                Excluir Tudo
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}