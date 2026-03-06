import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalCadastroCompleto({ aberto, fechar, produtoEditando, buscarProdutos, setExpandidos }) {
  const [passoAtual, setPassoAtual] = useState(1);

  const [formBase, setFormBase] = useState({ nome: '', preco: '', preco_atacado: '', custo: '' });
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [coresLista, setCoresLista] = useState([]);
  const [formCor, setFormCor] = useState({ cor: '', saco: '', meta_banca: 3, meta_global: 6 });
  const [estoques, setEstoques] = useState({});

  const tamanhosComuns = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  useEffect(() => {
    if (aberto) {
      if (produtoEditando) {
        // MODO EDIÇÃO
        setFormBase({ 
          nome: produtoEditando.nome, 
          preco: produtoEditando.preco, 
          preco_atacado: produtoEditando.preco_atacado || produtoEditando.preco,
          custo: produtoEditando.custo || ''
        });
        setTamanhosSelecionados([produtoEditando.tam]);
        setFormCor({ cor: produtoEditando.cor, saco: produtoEditando.saco || '', meta_banca: produtoEditando.meta_banca || 3, meta_global: produtoEditando.meta_global || 6 });
        setEstoques({
          [produtoEditando.tam]: { banca: produtoEditando.estoque_banca || 0, saco: produtoEditando.estoque_saco || 0 }
        });
        setPassoAtual(3); 
      } else {
        // MODO CRIAÇÃO NOVO PRODUTO
        setFormBase({ nome: '', preco: '', preco_atacado: '', custo: '' });
        setTamanhosSelecionados([]);
        setCoresLista([]);
        setFormCor({ cor: '', saco: '', meta_banca: 3, meta_global: 6 });
        setEstoques({});
        setPassoAtual(1);
      }
    }
  }, [aberto, produtoEditando]);

  if (!aberto) return null;

  const toggleTamanho = (tam) => {
    if (tamanhosSelecionados.includes(tam)) {
      setTamanhosSelecionados(tamanhosSelecionados.filter(t => t !== tam));
    } else {
      setTamanhosSelecionados([...tamanhosSelecionados, tam]);
    }
  };

  const handleEstoque = (tam, campo, valor) => {
    setEstoques(prev => ({ ...prev, [tam]: { ...prev[tam], [campo]: valor } }));
  };

  const adicionarCorNaLista = () => {
    if (formCor.cor.trim()) {
      const novaCor = formCor.cor.trim().toUpperCase();
      if (!coresLista.includes(novaCor)) {
        setCoresLista([...coresLista, novaCor]);
      }
      setFormCor({ ...formCor, cor: '' }); 
      document.getElementById('input-cor').focus();
    }
  };

  const removerCorDaLista = (corRemover) => {
    setCoresLista(coresLista.filter(c => c !== corRemover));
  };

  const salvarVariacao = async (fecharModalAposSalvar = true) => {
    const dadosBase = {
      nome: formBase.nome.trim().toUpperCase(),
      preco: parseFloat(formBase.preco || 0),
      preco_atacado: parseFloat(formBase.preco_atacado || 0),
      custo: parseFloat(formBase.custo || 0)
    };

    const loadingId = toast.loading("Salvando...");

    if (produtoEditando) {
      if (!formCor.cor.trim()) {
        toast.error("A cor não pode ficar vazia!", { id: loadingId });
        return;
      }
      
      const dadosEdicao = {
        ...dadosBase,
        tam: tamanhosSelecionados[0],
        cor: formCor.cor.trim().toUpperCase(),
        estoque_banca: parseInt(estoques[tamanhosSelecionados[0]]?.banca || 0),
        estoque_saco: parseInt(estoques[tamanhosSelecionados[0]]?.saco || 0),
        saco: formCor.saco.trim().toUpperCase()
      };
      await supabase.from('produtos').update(dadosEdicao).eq('id', produtoEditando.id);

    } else {
      let coresFinais = [...coresLista];
      
      if (formCor.cor.trim() && !coresLista.includes(formCor.cor.trim().toUpperCase())) {
        coresFinais.push(formCor.cor.trim().toUpperCase());
      }

      if (coresFinais.length === 0) {
        toast.error("Adicione pelo menos uma cor na lista!", { id: loadingId });
        return;
      }

      const registrosParaSalvar = [];
      
      coresFinais.forEach(cor => {
        tamanhosSelecionados.forEach(tam => {
          registrosParaSalvar.push({
            ...dadosBase,
            tam: tam.trim().toUpperCase(),
            cor: cor,
            estoque_banca: 0, 
            estoque_saco: 0,  
            saco: formCor.saco.trim().toUpperCase(),
            meta_banca: parseInt(formCor.meta_banca || 3), 
            meta_global: parseInt(formCor.meta_global || 6)
          });
        });
      });

      await supabase.from('produtos').insert(registrosParaSalvar);
      setExpandidos(prev => ({ ...prev, [formBase.nome.trim().toUpperCase()]: true }));
    }

    await buscarProdutos();
    
    if (fecharModalAposSalvar) {
      fechar();
      toast.success("Produto salvo com sucesso!", { id: loadingId });
    } else {
      setFormCor({ cor: '', saco: formCor.saco, meta_banca: 3, meta_global: 6 });
      setEstoques({});
      toast.success("Variações salvas! Pode digitar a próxima cor.", { id: loadingId });
      document.getElementById('input-cor').focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-black text-gray-800">{produtoEditando ? 'Editando Variação' : 'Novo Produto'}</h3>
            <p className="text-xs font-bold text-blue-600">Passo {passoAtual} de 3</p>
          </div>
          <button onClick={fechar} className="bg-gray-200 text-gray-600 w-8 h-8 rounded-full font-bold">X</button>
        </div>

        <div className="flex h-1 bg-gray-200">
          <div className={`h-full bg-blue-600 transition-all duration-300 ${passoAtual === 1 ? 'w-1/3' : passoAtual === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          
          {passoAtual === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                <span className="text-4xl">🏷️</span>
                <h4 className="font-black text-gray-700 mt-2">Dados do Produto</h4>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nome do Modelo</label>
                <input disabled={produtoEditando !== null} type="text" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none ${produtoEditando ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="Ex: CONJUNTO COTELE" value={formBase.nome} onChange={e => setFormBase({...formBase, nome: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Preço Varejo</label>
                  <input disabled={produtoEditando !== null} type="number" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none ${produtoEditando ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="R$" value={formBase.preco} onChange={e => setFormBase({...formBase, preco: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Preço Atacado</label>
                  <input disabled={produtoEditando !== null} type="number" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none ${produtoEditando ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="R$" value={formBase.preco_atacado} onChange={e => setFormBase({...formBase, preco_atacado: e.target.value})} />
                </div>
              </div>

              <div className={`p-3 rounded-xl border mt-2 ${produtoEditando ? 'bg-gray-100 border-gray-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <label className={`text-xs font-bold uppercase block mb-1 ${produtoEditando ? 'text-gray-400' : 'text-yellow-700'}`}>Custo de Produção</label>
                <input disabled={produtoEditando !== null} type="number" className="w-full p-2 bg-transparent border-b-2 border-gray-300 outline-none font-bold" placeholder="R$ 0.00" value={formBase.custo} onChange={e => setFormBase({...formBase, custo: e.target.value})} />
              </div>

              <button 
                onClick={() => { 
                  if(!formBase.nome) { toast.error('Preencha o nome do modelo!'); return; }
                  setPassoAtual(2); 
                }} 
                className="w-full bg-blue-600 text-white font-black py-4 rounded-xl mt-4 active:scale-95"
              >
                AVANÇAR ➔
              </button>
            </div>
          )}

          {passoAtual === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-4">
                <span className="text-4xl">📏</span>
                <h4 className="font-black text-gray-700 mt-2">{produtoEditando ? 'Tamanho da Variação' : 'Quais tamanhos essa peça tem?'}</h4>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {tamanhosComuns.map(tam => (
                  <button 
                    key={tam} 
                    disabled={produtoEditando !== null}
                    onClick={() => toggleTamanho(tam)}
                    className={`w-14 h-14 rounded-2xl font-black text-lg transition-all border-2 ${produtoEditando ? 'cursor-not-allowed opacity-80' : 'active:scale-95'} ${tamanhosSelecionados.includes(tam) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                  >
                    {tam}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-8">
                <button onClick={() => setPassoAtual(1)} className="w-1/3 bg-gray-200 text-gray-600 font-black py-4 rounded-xl active:scale-95">⬅ VOLTAR</button>
                <button 
                  onClick={() => { 
                    if(tamanhosSelecionados.length === 0) { toast.error('Selecione pelo menos 1 tamanho!'); return; }
                    setPassoAtual(3); 
                  }} 
                  className="w-2/3 bg-blue-600 text-white font-black py-4 rounded-xl active:scale-95"
                >
                  AVANÇAR ➔
                </button>
              </div>
            </div>
          )}

          {passoAtual === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center mb-4">
                <p className="text-xs text-blue-500 font-bold uppercase">{produtoEditando ? 'Editando:' : 'Cadastrando para:'}</p>
                <p className="font-black text-blue-800 leading-tight uppercase">{formBase.nome}</p>
                <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Tamanhos: {tamanhosSelecionados.join(', ')}</p>
              </div>

              {!produtoEditando ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Adicionar Cores</label>
                    <div className="flex gap-2 mt-1">
                      <input 
                        id="input-cor" type="text" 
                        className="flex-1 p-3 border-2 border-blue-300 bg-blue-50 rounded-xl font-black text-blue-900 uppercase focus:border-blue-500 outline-none" 
                        placeholder="Ex: PRETO" value={formCor.cor} onChange={e => setFormCor({...formCor, cor: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && adicionarCorNaLista()}
                      />
                      <button onClick={adicionarCorNaLista} className="bg-blue-600 text-white font-black px-6 rounded-xl active:scale-95 shadow-sm">+ ADD</button>
                    </div>
                  </div>

                  {coresLista.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      {coresLista.map(c => (
                        <span key={c} className="bg-white border border-gray-300 text-gray-800 font-bold text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                          {c}
                          <button onClick={() => removerCorDaLista(c)} className="text-red-500 font-black hover:text-red-700">X</button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Editando a Cor</label>
                    <input id="input-cor" type="text" className="w-full p-3 border-2 border-blue-300 bg-blue-50 rounded-xl font-black text-blue-900 uppercase mt-1 focus:border-blue-500 outline-none" value={formCor.cor} onChange={e => setFormCor({...formCor, cor: e.target.value})} />
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Ajustar Estoque Atual:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {tamanhosSelecionados.map(tam => (
                        <div key={tam} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                          <div className="w-12 font-black text-blue-600 text-xl text-center">{tam}</div>
                          <div className="flex gap-2">
                            <div className="flex flex-col items-center">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Banca</label>
                              <input type="number" className="w-16 p-2 border border-gray-300 rounded-lg text-center font-bold outline-none focus:border-blue-500" placeholder="0" value={estoques[tam]?.banca || ''} onChange={(e) => handleEstoque(tam, 'banca', e.target.value)} />
                            </div>
                            <div className="flex flex-col items-center">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Saco</label>
                              <input type="number" className="w-16 p-2 border border-gray-300 rounded-lg text-center font-bold outline-none focus:border-blue-500" placeholder="0" value={estoques[tam]?.saco || ''} onChange={(e) => handleEstoque(tam, 'saco', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mt-2">Saco / Local</label>
                <input type="text" className="w-full p-2 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none" placeholder="Ex: SACO 4" value={formCor.saco} onChange={e => setFormCor({...formCor, saco: e.target.value})} />
              </div>

              <div className="flex gap-2 mt-4 border-t pt-4">
                {!produtoEditando && <button onClick={() => setPassoAtual(2)} className="w-1/4 bg-gray-200 text-gray-600 font-black py-4 rounded-xl active:scale-95 text-xs">⬅ VOLTAR</button>}
                <button onClick={() => salvarVariacao(true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl active:scale-95 text-sm uppercase shadow-md transition-colors">💾 Salvar Tudo e Fechar</button>
              </div>
              
              {!produtoEditando && (
                <button onClick={() => salvarVariacao(false)} className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-black py-3 rounded-xl active:scale-95 text-sm uppercase transition-colors mt-2">
                  + Salvar e Lançar Outra Cor
                </button>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}