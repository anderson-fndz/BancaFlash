import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, ArrowLeft, ArrowRight, Save, Plus, Target, Info } from 'lucide-react';

export default function ModalCadastroCompleto({ aberto, fechar, produtoEditando, buscarProdutos, setExpandidos }) {
  const [passoAtual, setPassoAtual] = useState(1);

  const [formBase, setFormBase] = useState({ nome: '', preco: '', preco_atacado: '', custo: '' });
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [coresLista, setCoresLista] = useState([]);
  const [formCor, setFormCor] = useState({ cor: '', saco: '', meta_global: 6 }); // ✨ Meta Global aqui
  const [estoques, setEstoques] = useState({});

  const tamanhosComuns = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  useEffect(() => {
    if (aberto) {
      if (produtoEditando) {
        setFormBase({ 
          nome: produtoEditando.nome, 
          preco: produtoEditando.preco, 
          preco_atacado: produtoEditando.preco_atacado || produtoEditando.preco,
          custo: produtoEditando.custo || ''
        });
        setTamanhosSelecionados([produtoEditando.tam]);
        setFormCor({ 
            cor: produtoEditando.cor, 
            saco: produtoEditando.saco || '', 
            meta_global: produtoEditando.meta_global || 6 
        });
        setEstoques({
          [produtoEditando.tam]: { banca: produtoEditando.estoque_banca || 0, saco: produtoEditando.estoque_saco || 0 }
        });
        setPassoAtual(3); 
      } else {
        setFormBase({ nome: '', preco: '', preco_atacado: '', custo: '' });
        setTamanhosSelecionados([]);
        setCoresLista([]);
        setFormCor({ cor: '', saco: '', meta_global: 6 });
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

    try {
        if (produtoEditando) {
          const dadosEdicao = {
            ...dadosBase,
            tam: tamanhosSelecionados[0],
            cor: formCor.cor.trim().toUpperCase(),
            estoque_banca: parseInt(estoques[tamanhosSelecionados[0]]?.banca || 0),
            estoque_saco: parseInt(estoques[tamanhosSelecionados[0]]?.saco || 0),
            saco: formCor.saco.trim().toUpperCase(),
            meta_global: parseInt(formCor.meta_global || 0) // ✨ Salvando meta na edição
          };
          await supabase.from('produtos').update(dadosEdicao).eq('id', produtoEditando.id);
    
        } else {
          let coresFinais = [...coresLista];
          if (formCor.cor.trim() && !coresLista.includes(formCor.cor.trim().toUpperCase())) {
            coresFinais.push(formCor.cor.trim().toUpperCase());
          }
          if (coresFinais.length === 0) {
            toast.error("Adicione pelo menos uma cor!", { id: loadingId });
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
                meta_global: parseInt(formCor.meta_global || 0) // ✨ Salvando meta no cadastro novo
              });
            });
          });
    
          await supabase.from('produtos').insert(registrosParaSalvar);
          setExpandidos(prev => ({ ...prev, [formBase.nome.trim().toUpperCase()]: true }));
        }
    
        await buscarProdutos();
        
        if (fecharModalAposSalvar) {
          fechar();
          toast.success("Salvo com sucesso!", { id: loadingId });
        } else {
          setFormCor({ ...formCor, cor: '' });
          setEstoques({});
          toast.success("Variações salvas! Próxima cor...", { id: loadingId });
          document.getElementById('input-cor').focus();
        }
    } catch (err) {
        toast.error("Erro ao salvar dados.", { id: loadingId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={fechar}>
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="bg-gray-50 p-5 border-b flex justify-between items-center">
          <div>
            <h3 className="font-black text-gray-800 text-lg">{produtoEditando ? 'Ajustar Variação' : 'Novo Cadastro'}</h3>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Passo {passoAtual} de 3</p>
          </div>
          <button onClick={fechar} className="bg-white border border-gray-200 text-gray-400 hover:text-red-500 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex h-1.5 bg-gray-100">
          <div className={`h-full bg-blue-600 transition-all duration-500 ${passoAtual === 1 ? 'w-1/3' : passoAtual === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {passoAtual === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center py-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                <span className="text-3xl">🏷️</span>
                <h4 className="font-black text-blue-800 uppercase text-xs mt-2 tracking-widest">Identificação do Modelo</h4>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Modelo</label>
                <input disabled={produtoEditando !== null} type="text" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold uppercase mt-1 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50" placeholder="Ex: CONJUNTO LINHO" value={formBase.nome} onChange={e => setFormBase({...formBase, nome: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Varejo</label>
                  <input type="number" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black mt-1 focus:border-blue-500 outline-none" placeholder="R$ 00" value={formBase.preco} onChange={e => setFormBase({...formBase, preco: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Atacado</label>
                  <input type="number" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black mt-1 focus:border-blue-500 outline-none" placeholder="R$ 00" value={formBase.preco_atacado} onChange={e => setFormBase({...formBase, preco_atacado: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Custo unitário</label>
                <input type="number" className="w-full p-4 border-2 border-amber-100 bg-amber-50/30 rounded-2xl font-black mt-1 focus:border-amber-500 outline-none" placeholder="R$ 0.00" value={formBase.custo} onChange={e => setFormBase({...formBase, custo: e.target.value})} />
              </div>
              <button onClick={() => formBase.nome ? setPassoAtual(2) : toast.error('Dê um nome ao modelo!')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl mt-4 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 uppercase text-sm tracking-widest">Avançar <ArrowRight size={18}/></button>
            </div>
          )}

          {passoAtual === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center py-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                <span className="text-3xl">📏</span>
                <h4 className="font-black text-blue-800 uppercase text-xs mt-2 tracking-widest">Grade de Tamanhos</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {tamanhosComuns.map(tam => (
                  <button key={tam} disabled={produtoEditando !== null} onClick={() => toggleTamanho(tam)} className={`h-16 rounded-2xl font-black text-lg transition-all border-2 ${tamanhosSelecionados.includes(tam) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200 opacity-60'}`}>
                    {tam}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setPassoAtual(1)} className="w-1/3 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-xs">Voltar</button>
                <button onClick={() => tamanhosSelecionados.length > 0 ? setPassoAtual(3) : toast.error('Escolha um tamanho!')} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 uppercase text-sm tracking-widest">Avançar</button>
              </div>
            </div>
          )}

          {passoAtual === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 p-4 rounded-2xl text-white relative overflow-hidden">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Modelo Selecionado</p>
                <p className="font-black text-lg uppercase truncate">{formBase.nome}</p>
                <div className="flex gap-2 mt-2">
                    {tamanhosSelecionados.map(t => <span key={t} className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-black">{t}</span>)}
                </div>
              </div>

              {!produtoEditando ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adicionar Cores</label>
                    <div className="flex gap-2 mt-1">
                      <input id="input-cor" type="text" className="flex-1 p-4 border-2 border-blue-100 bg-blue-50/30 rounded-2xl font-black text-blue-900 uppercase focus:border-blue-500 outline-none" placeholder="Ex: PRETO" value={formCor.cor} onChange={e => setFormCor({...formCor, cor: e.target.value})} onKeyDown={e => e.key === 'Enter' && adicionarCorNaLista()} />
                      <button onClick={adicionarCorNaLista} className="bg-blue-600 text-white font-black px-5 rounded-2xl shadow-md"><Plus size={20}/></button>
                    </div>
                  </div>
                  {coresLista.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      {coresLista.map(c => (
                        <span key={c} className="bg-white border border-gray-200 text-gray-800 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm uppercase">
                          {c} <X size={14} className="text-red-400 cursor-pointer" onClick={() => removerCorDaLista(c)}/>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cor da Variação</label>
                  <input type="text" className="w-full p-4 border-2 border-blue-100 bg-blue-50/30 rounded-2xl font-black text-blue-900 uppercase mt-1" value={formCor.cor} onChange={e => setFormCor({...formCor, cor: e.target.value})} />
                </div>
              )}

              {/* ✨ NOVO CAMPO: ESTOQUE MÍNIMO (META GLOBAL) ✨ */}
              <div className="bg-fuchsia-50/50 p-5 rounded-3xl border border-fuchsia-100">
                <label className="text-[10px] font-black text-fuchsia-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Target size={14}/> Meta de Estoque Global (Alerta)
                </label>
                <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white border-2 border-fuchsia-100 rounded-2xl font-black text-center text-lg text-fuchsia-900 outline-none focus:border-fuchsia-500 transition-all"
                      placeholder="Ex: 5"
                      value={formCor.meta_global}
                      onChange={e => setFormCor({...formCor, meta_global: e.target.value})}
                    />
                    <div className="bg-white p-3 rounded-2xl border border-fuchsia-100">
                        <Info size={16} className="text-fuchsia-400" />
                    </div>
                </div>
                <p className="text-[9px] font-bold text-fuchsia-400 uppercase mt-3 tracking-wide text-center">
                    Avisar quando (Banca + Saco) atingir este número
                </p>
              </div>

              {produtoEditando && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd na Banca</label>
                    <input type="number" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black text-center" value={estoques[tamanhosSelecionados[0]]?.banca || ''} onChange={(e) => handleEstoque(tamanhosSelecionados[0], 'banca', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd no Saco</label>
                    <input type="number" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black text-center" value={estoques[tamanhosSelecionados[0]]?.saco || ''} onChange={(e) => handleEstoque(tamanhosSelecionados[0], 'saco', e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identificação Saco / Local</label>
                <input type="text" className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black uppercase mt-1" placeholder="Ex: SACO 12" value={formCor.saco} onChange={e => setFormCor({...formCor, saco: e.target.value})} />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button onClick={() => salvarVariacao(true)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[20px] shadow-lg shadow-emerald-100 uppercase text-sm tracking-widest flex items-center justify-center gap-2">
                  <Save size={20}/> Salvar e Finalizar
                </button>
                {!produtoEditando && (
                  <button onClick={() => salvarVariacao(false)} className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-black py-4 rounded-[20px] uppercase text-[10px] tracking-widest">
                    + Salvar e Adicionar Outra Cor
                  </button>
                )}
                {!produtoEditando && <button onClick={() => setPassoAtual(2)} className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] py-2">Voltar Grade</button>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}