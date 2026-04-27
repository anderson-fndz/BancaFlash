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

  const [modoAjusteRapido, setModoAjusteRapido] = useState(null); // Para Estoque
  const [modoAjusteMeta, setModoAjusteMeta] = useState(null);     // Para Alertas
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
    if (expandidos[nomeProduto] && (modoAjusteRapido === nomeProduto || modoAjusteMeta === nomeProduto)) {
      setModoAjusteRapido(null);
      setModoAjusteMeta(null);
    }
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

  const excluirVariacao = async (id) => {
    if (window.confirm("Certeza que quer excluir essa variação?")) {
      const loadingId = toast.loading("Excluindo...");
      await supabase.from('produtos').delete().eq('id', id);
      await buscarProdutos();
      toast.success("Variação excluída!", { id: loadingId });
    }
  };

  // ✨ INICIA O MODO DE AJUSTE DE ESTOQUE ✨
  const iniciarAjusteRapido = (nomeProduto, variacoes) => {
    const valoresIniciais = {};
    variacoes.forEach(v => {
      valoresIniciais[v.id] = {
        banca: v.estoque_banca || 0,
        saco: v.estoque_saco || 0
      };
    });
    setValoresAjuste(valoresIniciais);
    setModoAjusteRapido(nomeProduto);
    setModoAjusteMeta(null); // Fecha o de meta se estiver aberto
    setExpandidos(prev => ({ ...prev, [nomeProduto]: true })); 
  };

  // ✨ INICIA O NOVO MODO DE AJUSTE DE METAS ✨
  const iniciarAjusteMeta = (nomeProduto, variacoes) => {
    const valoresIniciais = {};
    variacoes.forEach(v => {
      valoresIniciais[v.id] = {
        meta: v.meta_global > 0 ? v.meta_global : 1 
      };
    });
    setValoresAjuste(valoresIniciais);
    setModoAjusteMeta(nomeProduto);
    setModoAjusteRapido(null); // Fecha o de estoque se estiver aberto
    setExpandidos(prev => ({ ...prev, [nomeProduto]: true })); 
  };

  const handleValorAjuste = (id, campo, valor) => {
    const numero = parseInt(valor) || 0;
    setValoresAjuste(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: Math.max(0, numero) } 
    }));
  };

  // ✨ SALVA O ESTOQUE ✨
  const salvarAjusteEstoque = async (variacoes) => {
    const loadingId = toast.loading("Salvando estoque...");
    try {
      for (const variacao of variacoes) {
        const novosValores = valoresAjuste[variacao.id];
        if (novosValores && (novosValores.banca !== undefined || novosValores.saco !== undefined)) {
          await supabase.from('produtos').update({ 
            estoque_banca: novosValores.banca, 
            estoque_saco: novosValores.saco
          }).eq('id', variacao.id);
        }
      }
      await buscarProdutos();
      setModoAjusteRapido(null);
      toast.success("Estoque atualizado!", { id: loadingId });
    } catch (error) {
      toast.error("Erro ao salvar.", { id: loadingId });
    }
  };

  // ✨ SALVA AS METAS ✨
  const salvarAjusteMeta = async (variacoes) => {
    const loadingId = toast.loading("Salvando alertas...");
    try {
      for (const variacao of variacoes) {
        const novosValores = valoresAjuste[variacao.id];
        if (novosValores && novosValores.meta !== undefined) {
          await supabase.from('produtos').update({ 
            meta_global: novosValores.meta 
          }).eq('id', variacao.id);
        }
      }
      await buscarProdutos();
      setModoAjusteMeta(null);
      toast.success("Metas atualizadas!", { id: loadingId });
    } catch (error) {
      toast.error("Erro ao salvar.", { id: loadingId });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex justify-end animate-fade-in backdrop-blur-sm" onClick={fechar}>
      <div className="bg-slate-50 w-full md:w-[650px] h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-700/30" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
              <Settings className="text-blue-500" size={22} /> Gerenciar Produtos
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Estoque, Metas e Ativos</p>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* BUSCA E NOVO MODELO */}
        <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Filtrar modelos..." 
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
              value={busca} 
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <button onClick={() => { setProdutoEditando(null); setModalPassosAberto(true); }} className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
            <Plus size={18} strokeWidth={3} className="text-blue-400" /> Cadastrar Novo Conjunto
          </button>
        </div>

        {/* LISTA DE MODELOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {modelosFiltrados.map(nome => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
            const estaAtivo = variacoes[0]?.ativo !== false;
            const estaExpandido = expandidos[nome];
            const emAjusteEstoque = modoAjusteRapido === nome;
            const emAjusteMeta = modoAjusteMeta === nome;
            const qualquerAjuste = emAjusteEstoque || emAjusteMeta;
            
            return (
              <div key={nome} className={`bg-white rounded-2xl shadow-sm border transition-all ${!estaAtivo ? 'opacity-60 grayscale-[0.5] border-dashed' : 'border-slate-200'} ${emAjusteEstoque ? 'border-amber-300 ring-2 ring-amber-50' : emAjusteMeta ? 'border-purple-300 ring-2 ring-purple-50' : ''}`}>
                
                <div className={`p-3 md:p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b ${emAjusteEstoque ? 'bg-amber-50/50' : emAjusteMeta ? 'bg-purple-50/50' : 'bg-slate-50/30'}`}>
                  
                  <div onClick={() => !qualquerAjuste && toggleSanfona(nome)} className="flex items-center gap-2 select-none flex-1 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${estaAtivo ? 'text-slate-400' : 'text-slate-300'}`}>
                      {estaExpandido ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                    </div>
                    <h3 className={`font-black uppercase tracking-tight truncate flex-1 ${!estaAtivo ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{nome}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 pl-8 md:pl-0">
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1.5 rounded-lg mr-1">{estoqueTotal} un.</span>
                    {!qualquerAjuste ? (
                      <>
                        {/* 1. ADICIONAR VARIAÇÃO (+) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setProdutoRapidoSelecionado(variacoes[0]); setModalVariacaoRapidaAberto(true); }} 
                          className="w-9 h-9 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          title="Adicionar Cor/Tamanho"
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>

                        {/* ✨ 2. NOVO: AJUSTE DE METAS (SINO ROXO) ✨ */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); iniciarAjusteMeta(nome, variacoes); }} 
                          className="w-9 h-9 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex items-center justify-center hover:bg-purple-100 transition-all shadow-sm"
                          title="Ajustar Alerta Mínimo"
                        >
                          <BellRing size={16} strokeWidth={2.5} />
                        </button>

                        {/* 3. AJUSTE RÁPIDO DE ESTOQUE (RAIO) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); iniciarAjusteRapido(nome, variacoes); }} 
                          className="w-9 h-9 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-all shadow-sm"
                          title="Ajuste Rápido de Estoque"
                        >
                          <Zap size={18} className="fill-amber-500" />
                        </button>

                        {/* 4. EDITAR COMPLETO (LÁPIS) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setProdutoMassaSelecionado(variacoes[0]); setModalEdicaoMassaAberto(true); }} 
                          className="w-9 h-9 bg-blue-600 text-white border border-blue-700 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                          title="Configurações do Modelo"
                        >
                          <Edit3 size={18} strokeWidth={2.5} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setModoAjusteRapido(null); setModoAjusteMeta(null); }} className="text-[10px] font-black bg-white border border-slate-300 text-slate-500 px-3 py-1.5 rounded-lg uppercase">Cancelar</button>
                    )}
                  </div>
                </div>

                {estaExpandido && (
                  <div className="divide-y divide-slate-100 animate-fade-in bg-white">
                    {variacoes.sort(sortLogico).map(v => {
                      const totalAtual = (v.estoque_banca || 0) + (v.estoque_saco || 0);
                      const emAlerta = v.meta_global > 0 && totalAtual <= v.meta_global;
                      return (
                        <div key={v.id} className="p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                          <div>
                            <p className={`font-bold text-xs md:text-sm uppercase tracking-tight ${!estaAtivo ? 'text-slate-300' : 'text-slate-800'}`}>
                              <span className={estaAtivo ? "text-blue-600 font-black" : "text-slate-400"}>{v.tam}</span> | {v.cor}
                            </p>
                            {v.meta_global > 0 && !emAjusteMeta && (
                              <p className={`text-[9px] font-black mt-1 uppercase tracking-widest flex items-center gap-1 ${emAlerta ? 'text-red-500' : 'text-slate-400'}`}>
                                {emAlerta && <BellRing size={10} />} Alerta atual: {v.meta_global} un.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            
                            {/* CAIXAS DE ESTOQUE */}
                            {emAjusteEstoque && (
                              <div className="flex items-center gap-2 bg-amber-50 p-1.5 rounded-xl border border-amber-100">
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Banca</span>
                                  <input type="number" className="w-12 text-center text-xs font-black py-1 border border-slate-200 rounded-md focus:border-amber-400 outline-none" value={valoresAjuste[v.id]?.banca ?? 0} onChange={(e) => handleValorAjuste(v.id, 'banca', e.target.value)} />
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Saco</span>
                                  <input type="number" className="w-12 text-center text-xs font-black py-1 border border-slate-200 rounded-md focus:border-amber-400 outline-none" value={valoresAjuste[v.id]?.saco ?? 0} onChange={(e) => handleValorAjuste(v.id, 'saco', e.target.value)} />
                                </div>
                              </div>
                            )}

                            {/* ✨ CAIXAS DE META ✨ */}
                            {emAjusteMeta && (
                              <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-xl border border-purple-100">
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-black text-purple-700 uppercase tracking-widest mb-0.5 flex items-center gap-1"><BellRing size={8}/> Alerta Mín.</span>
                                  <input type="number" className="w-16 text-center text-sm font-black py-1 border border-slate-200 rounded-md text-purple-700 focus:border-purple-400 outline-none" value={valoresAjuste[v.id]?.meta ?? 0} onChange={(e) => handleValorAjuste(v.id, 'meta', e.target.value)} />
                                </div>
                              </div>
                            )}

                            {/* BOTOES PADRAO */}
                            {!qualquerAjuste && (
                              <div className="flex gap-1.5">
                                <button onClick={() => { setProdutoEditando(v); setModalPassosAberto(true); }} className="w-7 h-7 bg-slate-50 text-slate-400 rounded flex items-center justify-center hover:text-blue-600"><Pencil size={12}/></button>
                                <button onClick={() => excluirVariacao(v.id)} className="w-7 h-7 bg-slate-50 text-slate-400 rounded flex items-center justify-center hover:text-red-600"><Trash2 size={12}/></button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* BOTAO SALVAR ESTOQUE */}
                    {emAjusteEstoque && (
                      <div className="p-3 bg-amber-50">
                        <button onClick={() => salvarAjusteEstoque(variacoes)} className="w-full bg-amber-500 text-amber-950 font-black py-3 rounded-xl uppercase text-[10px] flex items-center justify-center gap-2 shadow-md">
                          <Save size={14} /> Salvar Estoque
                        </button>
                      </div>
                    )}

                    {/* ✨ BOTAO SALVAR METAS ✨ */}
                    {emAjusteMeta && (
                      <div className="p-3 bg-purple-50">
                        <button onClick={() => salvarAjusteMeta(variacoes)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl uppercase text-[10px] flex items-center justify-center gap-2 shadow-md transition-colors">
                          <Save size={14} /> Salvar Alertas
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ModalCadastroCompleto aberto={modalPassosAberto} fechar={() => setModalPassosAberto(false)} produtoEditando={produtoEditando} buscarProdutos={buscarProdutos} setExpandidos={setExpandidos} />
      <ModalEdicaoMassa aberto={modalEdicaoMassaAberto} fechar={() => setModalEdicaoMassaAberto(false)} produtoBase={produtoMassaSelecionado} buscarProdutos={buscarProdutos} />
      <ModalVariacoesRapidas aberto={modalVariacaoRapidaAberto} fechar={() => setModalVariacaoRapidaAberto(false)} produtoBase={produtoRapidoSelecionado} produtos={produtos} buscarProdutos={buscarProdutos} setExpandidos={setExpandidos} />
    </div>
  );
}