import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, Settings, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Zap, Save, Search, Edit3, BellRing } from 'lucide-react';

import ModalVariacoesRapidas from './ModalVariacoesRapidas';
import ModalEdicaoMassa from './ModalEdicaoMassa';
import ModalCadastroCompleto from './ModalCadastroCompleto';

export default function GerenciarEstoque({ aberto, fechar, produtos, buscarProdutos }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});

  const [modalPassosAberto, setModalPassosAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null); 

  const [modalEdicaoMassaAberto, setModalEdicaoMassaAberto] = useState(false);
  const [produtoMassaSelecionado, setProdutoMassaSelecionado] = useState(null);

  const [modalVariacaoRapidaAberto, setModalVariacaoRapidaAberto] = useState(false);
  const [produtoRapidoSelecionado, setProdutoRapidoSelecionado] = useState(null);

  const [modoAjusteRapido, setModoAjusteRapido] = useState(null); 
  const [valoresAjuste, setValoresAjuste] = useState({}); 

  if (!aberto) return null;

  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];
  const modelosFiltrados = nomesUnicos.filter(nome => nome.toLowerCase().includes(busca.toLowerCase()));

  const limparTamanho = (t) => String(t || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const ordemTamanhos = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];
  
  const sortLogico = (a, b) => {
    let idxA = ordemTamanhos.indexOf(limparTamanho(a.tam));
    let idxB = ordemTamanhos.indexOf(limparTamanho(b.tam));
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return String(a.cor || '').trim().localeCompare(String(b.cor || '').trim());
  };

  const toggleSanfona = (nomeProduto) => {
    if (expandidos[nomeProduto] && modoAjusteRapido === nomeProduto) {
      setModoAjusteRapido(null);
    }
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

  const excluirProdutoMassa = async (nomeProduto) => {
    if (window.confirm(`ATENÇÃO: Você tem certeza que deseja excluir o modelo "${nomeProduto}" INTEIRO? Todas as cores e tamanhos serão apagados!`)) {
      const loadingId = toast.loading("Excluindo modelo...");
      await supabase.from('produtos').delete().eq('nome', nomeProduto);
      await buscarProdutos();
      toast.success("Modelo inteiro excluído com sucesso!", { id: loadingId });
    }
  };

  const excluirVariacao = async (id) => {
    if (window.confirm("Certeza que quer excluir essa variação única?")) {
      const loadingId = toast.loading("Excluindo...");
      await supabase.from('produtos').delete().eq('id', id);
      await buscarProdutos();
      toast.success("Variação excluída com sucesso!", { id: loadingId });
    }
  };

  const iniciarAjusteRapido = (nomeProduto, variacoes) => {
    const valoresIniciais = {};
    variacoes.forEach(v => {
      valoresIniciais[v.id] = {
        banca: v.estoque_banca || 0,
        saco: v.estoque_saco || 0,
        // ✨ MÁGICA AQUI: Se a meta for 0 ou null, ele já puxa o 1 como padrão
        meta: v.meta_global > 0 ? v.meta_global : 1 
      };
    });
    setValoresAjuste(valoresIniciais);
    setModoAjusteRapido(nomeProduto);
    setExpandidos(prev => ({ ...prev, [nomeProduto]: true })); 
  };

  const handleValorAjuste = (id, campo, valor) => {
    const numero = parseInt(valor) || 0;
    // ✨ TRAVA AQUI: Se for a "meta", o mínimo é 1. Se for banca/saco, o mínimo é 0.
    const valorMinimo = campo === 'meta' ? 1 : 0;
    
    setValoresAjuste(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: Math.max(valorMinimo, numero) } 
    }));
  };

  const salvarAjusteEmMassa = async (variacoes) => {
    const loadingId = toast.loading("Salvando ajustes...");
    try {
      for (const variacao of variacoes) {
        const novosValores = valoresAjuste[variacao.id];
        if (novosValores && (novosValores.banca !== variacao.estoque_banca || novosValores.saco !== variacao.estoque_saco || novosValores.meta !== variacao.meta_global)) {
          await supabase
            .from('produtos')
            .update({ 
              estoque_banca: novosValores.banca, 
              estoque_saco: novosValores.saco,
              meta_global: novosValores.meta 
            })
            .eq('id', variacao.id);
        }
      }
      await buscarProdutos();
      setModoAjusteRapido(null);
      toast.success("Estoque e Metas atualizados!", { id: loadingId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar os ajustes.", { id: loadingId });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex justify-end animate-fade-in backdrop-blur-sm" onClick={fechar}>
      <div className="bg-slate-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-700/30" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
              <Settings className="text-blue-500" size={22} /> Gerenciar Produtos
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Catálogo, Estoque e Metas</p>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* BUSCA E NOVO MODELO */}
        <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar modelo..." 
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-sm font-bold text-slate-700 uppercase tracking-wide transition-all shadow-sm"
              value={busca} 
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => { setProdutoEditando(null); setModalPassosAberto(true); }} 
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-3.5 rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} className="text-blue-400" /> Cadastrar Novo Modelo
          </button>
        </div>

        {/* LISTA DE MODELOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 custom-scrollbar">
          {modelosFiltrados.length === 0 ? (
            <div className="text-center mt-12 bg-white p-10 rounded-3xl border border-dashed border-slate-300">
              <Search size={40} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-500 font-black text-base uppercase tracking-tight">Nenhum modelo achado</p>
            </div>
          ) : (
            modelosFiltrados.map(nome => {
              const variacoes = produtos.filter(p => p.nome === nome);
              const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
              const estaExpandido = expandidos[nome];
              const emAjuste = modoAjusteRapido === nome;
              
              return (
                <div key={nome} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${emAjuste ? 'border-amber-300 shadow-amber-500/10 ring-2 ring-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  
                  {/* CABEÇALHO DO MODELO */}
                  <div className={`p-3 md:p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b transition-colors ${emAjuste ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    
                    <div 
                      onClick={() => !emAjuste && toggleSanfona(nome)}
                      className={`flex items-center gap-2 select-none flex-1 ${!emAjuste && 'cursor-pointer group'}`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${emAjuste ? 'text-amber-500' : 'text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                        {estaExpandido ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                      </div>
                      <h3 className={`font-black uppercase tracking-tight truncate flex-1 ${emAjuste ? 'text-amber-800' : 'text-slate-800'}`}>{nome}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 pl-8 md:pl-0 flex-wrap">
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg uppercase tracking-widest whitespace-nowrap">
                        {estoqueTotal} un.
                      </span>
                      
                      {!emAjuste ? (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); iniciarAjusteRapido(nome, variacoes); }} 
                            className="flex items-center gap-1 text-[9px] md:text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1.5 rounded-lg active:scale-95 uppercase tracking-widest hover:bg-amber-100 transition-colors shadow-sm"
                            title="Ajuste Rápido de Estoque e Metas"
                          >
                            <Zap size={12} className="fill-amber-600" /> <span className="hidden md:inline">Ajuste Rápido</span>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProdutoRapidoSelecionado(variacoes[0]); setModalVariacaoRapidaAberto(true); }} 
                            className="flex items-center gap-1 text-[9px] md:text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1.5 rounded-lg active:scale-95 uppercase tracking-widest hover:bg-emerald-100 transition-colors shadow-sm" 
                            title="Adicionar Cor/Tamanho"
                          >
                            <Plus size={12} strokeWidth={3} /> <span className="hidden md:inline">Cor/Tam</span>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProdutoMassaSelecionado(variacoes[0]); setModalEdicaoMassaAberto(true); }} 
                            className="w-7 h-7 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors" 
                            title="Editar Preços e Dados"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button 
                            onClick={(e) => { e.stopPropagation(); excluirProdutoMassa(nome); }} 
                            className="w-7 h-7 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors" 
                            title="Excluir Modelo Inteiro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => setModoAjusteRapido(null)} 
                          className="text-[10px] font-black bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 uppercase tracking-widest transition-colors shadow-sm"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* LISTA DE VARIAÇÕES E INPUTS MÁGICOS */}
                  {estaExpandido && (
                    <div className="divide-y divide-slate-100 animate-fade-in bg-white">
                      {variacoes.sort(sortLogico).map(v => {
                        const totalAtual = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                        const meta = v.meta_global || 0;
                        const emAlerta = meta > 0 && totalAtual <= meta;

                        return (
                          <div key={v.id} className={`p-3 md:p-4 flex justify-between items-center transition-colors ${emAjuste ? 'hover:bg-amber-50/30' : 'hover:bg-slate-50'}`}>
                            
                            <div>
                              <p className="font-bold text-slate-800 text-xs md:text-sm uppercase tracking-tight">
                                <span className="text-blue-600 font-black">{v.tam}</span> <span className="text-slate-300 font-normal mx-1">|</span> {v.cor}
                              </p>
                              {!emAjuste && meta > 0 && (
                                <p className={`text-[9px] font-black mt-1 uppercase tracking-widest flex items-center gap-1 ${emAlerta ? 'text-red-500' : 'text-slate-400'}`}>
                                  {emAlerta && <BellRing size={10} />}
                                  Alerta configurado: {meta} un.
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 md:gap-4">
                              
                              {emAjuste ? (
                                <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-xl border border-amber-100">
                                  <div className="text-center">
                                    <label className="text-[8px] font-black text-amber-700 uppercase tracking-widest block mb-0.5">Banca</label>
                                    <input 
                                      type="number" min="0" onWheel={(e) => e.target.blur()}
                                      className="w-12 py-1 border border-amber-200 rounded-lg text-center font-black text-xs text-amber-950 outline-none focus:border-amber-500 bg-white shadow-inner"
                                      value={valoresAjuste[v.id]?.banca ?? 0}
                                      onChange={(e) => handleValorAjuste(v.id, 'banca', e.target.value)}
                                    />
                                  </div>
                                  <div className="text-center">
                                    <label className="text-[8px] font-black text-amber-700 uppercase tracking-widest block mb-0.5">Saco</label>
                                    <input 
                                      type="number" min="0" onWheel={(e) => e.target.blur()}
                                      className="w-12 py-1 border border-amber-200 rounded-lg text-center font-black text-xs text-amber-950 outline-none focus:border-amber-500 bg-white shadow-inner"
                                      value={valoresAjuste[v.id]?.saco ?? 0}
                                      onChange={(e) => handleValorAjuste(v.id, 'saco', e.target.value)}
                                    />
                                  </div>
                                  <div className="w-px h-8 bg-amber-200 mx-1"></div>
                                  <div className="text-center">
                                    <label className="text-[8px] font-black text-fuchsia-700 uppercase tracking-widest block mb-0.5" title="Quando o total chegar nesse número, o sistema avisa pra pedir fábrica">Alerta</label>
                                    {/* ✨ AQUI ESTÁ O MIN="1" NA PRÁTICA ✨ */}
                                    <input 
                                      type="number" min="1" onWheel={(e) => e.target.blur()}
                                      className="w-12 py-1 border border-fuchsia-300 rounded-lg text-center font-black text-xs text-fuchsia-900 outline-none focus:border-fuchsia-500 bg-fuchsia-50 shadow-inner"
                                      value={valoresAjuste[v.id]?.meta ?? 1}
                                      onChange={(e) => handleValorAjuste(v.id, 'meta', e.target.value)}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-right hidden sm:block">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banca / Saco</p>
                                    <p className="font-black text-slate-700 text-sm mt-0.5">{v.estoque_banca || 0} <span className="text-slate-300 font-normal">/</span> {v.estoque_saco || 0}</p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => { setProdutoEditando(v); setModalPassosAberto(true); }} className="w-8 h-8 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-lg flex items-center justify-center active:scale-95 transition-colors"><Pencil size={14}/></button>
                                    <button onClick={() => excluirVariacao(v.id)} className="w-8 h-8 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg flex items-center justify-center active:scale-95 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                </>
                              )}

                            </div>
                          </div>
                        )
                      })}

                      {emAjuste && (
                        <div className="p-4 bg-amber-50/50 border-t border-amber-100 flex justify-end">
                          <button 
                            onClick={() => salvarAjusteEmMassa(variacoes)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black px-6 py-3.5 rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> Confirmar Estoque e Metas
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <ModalCadastroCompleto 
        aberto={modalPassosAberto} 
        fechar={() => setModalPassosAberto(false)} 
        produtoEditando={produtoEditando} 
        buscarProdutos={buscarProdutos} 
        setExpandidos={setExpandidos} 
      />
      
      <ModalEdicaoMassa 
        aberto={modalEdicaoMassaAberto} 
        fechar={() => setModalEdicaoMassaAberto(false)} 
        produtoBase={produtoMassaSelecionado} 
        buscarProdutos={buscarProdutos} 
      />

      <ModalVariacoesRapidas 
        aberto={modalVariacaoRapidaAberto} 
        fechar={() => setModalVariacaoRapidaAberto(false)} 
        produtoBase={produtoRapidoSelecionado} 
        produtos={produtos}
        buscarProdutos={buscarProdutos} 
        setExpandidos={setExpandidos} 
      />

    </div>
  );
}