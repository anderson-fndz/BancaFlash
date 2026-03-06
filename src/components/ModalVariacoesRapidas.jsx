import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalVariacoesRapidas({ aberto, fechar, produtoBase, produtos, buscarProdutos, setExpandidos }) {
  const [abaAtiva, setAbaAtiva] = useState('COR'); // 'COR' ou 'TAMANHO'

  // ✨ ESTADOS - ABA 1 (Nova Cor)
  const [novaCor, setNovaCor] = useState('');
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [sacoCor, setSacoCor] = useState('');

  // ✨ ESTADOS - ABA 2 (Novo Tamanho)
  const [novoTamanho, setNovoTamanho] = useState('');
  const [coresSelecionadas, setCoresSelecionadas] = useState([]);
  const [sacoTamanho, setSacoTamanho] = useState('');

  const tamanhosComuns = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  // Cores que o produto já possui cadastradas no banco
  const coresExistentes = produtoBase ? [...new Set(produtos.filter(p => p.nome === produtoBase.nome).map(p => p.cor))].sort() : [];

  useEffect(() => {
    if (aberto && produtoBase) {
      setAbaAtiva('COR');
      setNovaCor('');
      setTamanhosSelecionados([]);
      setSacoCor(produtoBase.saco || '');
      
      setNovoTamanho('');
      // Já pré-seleciona todas as cores existentes pra facilitar a vida!
      setCoresSelecionadas(coresExistentes); 
      setSacoTamanho(produtoBase.saco || '');
    }
  }, [aberto, produtoBase]);

  if (!aberto || !produtoBase) return null;

  // ==== LÓGICA DA ABA 1 (NOVA COR) ====
  const toggleTamanho = (tam) => {
    setTamanhosSelecionados(prev => prev.includes(tam) ? prev.filter(t => t !== tam) : [...prev, tam]);
  };

  const salvarNovaCor = async () => {
    if (!novaCor.trim() || tamanhosSelecionados.length === 0) {
      toast.error("Preencha a cor e selecione pelo menos 1 tamanho!"); return;
    }
    const loadingId = toast.loading(`Salvando ${tamanhosSelecionados.length} variações...`);
    const registros = tamanhosSelecionados.map(tam => ({
      nome: produtoBase.nome, preco: produtoBase.preco, preco_atacado: produtoBase.preco_atacado, custo: produtoBase.custo,
      cor: novaCor.trim().toUpperCase(), tam: tam.trim().toUpperCase(), saco: sacoCor.trim().toUpperCase(),
      estoque_banca: 0, estoque_saco: 0, meta_banca: produtoBase.meta_banca || 3, meta_global: produtoBase.meta_global || 6
    }));

    const { error } = await supabase.from('produtos').insert(registros);
    if (error) { toast.error("Erro!", { id: loadingId }); } else {
      await buscarProdutos();
      setExpandidos(prev => ({ ...prev, [produtoBase.nome]: true }));
      fechar();
      toast.success("Nova cor adicionada!", { id: loadingId });
    }
  };

  // ==== LÓGICA DA ABA 2 (NOVO TAMANHO) ====
  const toggleCor = (cor) => {
    setCoresSelecionadas(prev => prev.includes(cor) ? prev.filter(c => c !== cor) : [...prev, cor]);
  };

  const salvarNovoTamanho = async () => {
    if (!novoTamanho.trim() || coresSelecionadas.length === 0) {
      toast.error("Escolha um tamanho e pelo menos 1 cor!"); return;
    }
    const loadingId = toast.loading(`Criando tamanho ${novoTamanho}...`);
    const registros = coresSelecionadas.map(cor => ({
      nome: produtoBase.nome, preco: produtoBase.preco, preco_atacado: produtoBase.preco_atacado, custo: produtoBase.custo,
      cor: cor.trim().toUpperCase(), tam: novoTamanho.trim().toUpperCase(), saco: sacoTamanho.trim().toUpperCase(),
      estoque_banca: 0, estoque_saco: 0, meta_banca: produtoBase.meta_banca || 3, meta_global: produtoBase.meta_global || 6
    }));

    const { error } = await supabase.from('produtos').insert(registros);
    if (error) { toast.error("Erro!", { id: loadingId }); } else {
      await buscarProdutos();
      setExpandidos(prev => ({ ...prev, [produtoBase.nome]: true }));
      fechar();
      toast.success(`Tamanho ${novoTamanho} adicionado!`, { id: loadingId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-gray-50 p-4 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-gray-800 flex items-center gap-2">✨ Variação Rápida</h3>
            <p className="text-[10px] font-bold text-blue-600 uppercase truncate max-w-[200px]">{produtoBase.nome}</p>
          </div>
          <button onClick={fechar} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
        </div>

        {/* CHAVEADOR DE ABAS */}
        <div className="flex p-2 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setAbaAtiva('COR')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors uppercase ${abaAtiva === 'COR' ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'text-gray-500 hover:bg-gray-50'}`}>+ Nova Cor</button>
          <button onClick={() => setAbaAtiva('TAMANHO')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors uppercase ${abaAtiva === 'TAMANHO' ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>+ Novo Tam.</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {/* ================= ABA 1 ================= */}
          {abaAtiva === 'COR' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome da Nova Cor</label>
                <input 
                  type="text" list="lista-cores-rapidas-modal"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:border-green-500 outline-none" 
                  placeholder="Ex: AZUL MARINHO" value={novaCor} onChange={e => setNovaCor(e.target.value)} 
                />
                <datalist id="lista-cores-rapidas-modal">
                  {coresExistentes.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tamanhos que chegaram</label>
                <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  {tamanhosComuns.map(tam => (
                    <button 
                      key={tam} onClick={() => toggleTamanho(tam)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all border-2 active:scale-95 ${tamanhosSelecionados.includes(tam) ? 'bg-green-500 text-white border-green-600 shadow-md scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-green-300'}`}
                    >
                      {tam}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Saco / Local (Opcional)</label>
                <input type="text" className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-green-500 outline-none" value={sacoCor} onChange={e => setSacoCor(e.target.value)} />
              </div>

              <button onClick={salvarNovaCor} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl mt-2 active:scale-95 shadow-md uppercase tracking-widest">
                💾 Salvar Cores
              </button>
            </div>
          )}

          {/* ================= ABA 2 ================= */}
          {abaAtiva === 'TAMANHO' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Selecione o Novo Tamanho</label>
                <div className="flex flex-wrap gap-2">
                  {tamanhosComuns.map(tam => (
                    <button 
                      key={tam} onClick={() => setNovoTamanho(tam)}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all border-2 active:scale-95 ${novoTamanho === tam ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'}`}
                    >
                      {tam}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Ou digite:</span>
                  <input type="text" className="w-20 p-2 border-2 border-gray-200 rounded-lg font-black uppercase text-center focus:border-blue-500 outline-none text-sm" placeholder="G1" value={novoTamanho} onChange={e => setNovoTamanho(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Puxar quais cores?</label>
                {coresExistentes.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded border border-red-100">Nenhuma cor cadastrada ainda neste modelo.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {coresExistentes.map(cor => (
                      <button 
                        key={cor} onClick={() => toggleCor(cor)}
                        className={`w-full text-left p-2.5 rounded-lg font-bold text-sm border-2 transition-colors flex justify-between items-center ${coresSelecionadas.includes(cor) ? 'bg-blue-50 border-blue-400 text-blue-900' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}
                      >
                        {cor}
                        {coresSelecionadas.includes(cor) && <span className="text-blue-600">✔️</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Saco / Local (Opcional)</label>
                <input type="text" className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none" value={sacoTamanho} onChange={e => setSacoTamanho(e.target.value)} />
              </div>

              <button onClick={salvarNovoTamanho} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl mt-2 active:scale-95 shadow-md uppercase tracking-widest">
                💾 Salvar Tamanhos
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}