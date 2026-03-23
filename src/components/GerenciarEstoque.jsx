import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, Settings, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Zap, Save, Search, Edit3, BellRing, Eye, EyeOff } from 'lucide-react';

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

  // ✨ NOVA FUNÇÃO: DESATIVAR/ATIVAR MODELO INTEIRO ✨
  const toggleAtivoModelo = async (nomeProduto, statusAtual) => {
    const novoStatus = !statusAtual;
    const acao = novoStatus ? "reativado" : "desativado";
    
    const loadingId = toast.loading(`${novoStatus ? 'Ativando' : 'Escondendo'} modelo...`);
    
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: novoStatus })
        .eq('nome', nomeProduto);

      if (error) throw error;

      await buscarProdutos();
      toast.success(`Modelo ${nomeProduto} ${acao}!`, { id: loadingId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao mudar status.", { id: loadingId });
    }
  };

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
    if (window.confirm(`ATENÇÃO: Você tem certeza que deseja excluir o modelo "${nomeProduto}" INTEIRO? Isso apaga o histórico de estoque!`)) {
      const loadingId = toast.loading("Excluindo modelo...");
      await supabase.from('produtos').delete().eq('nome', nomeProduto);
      await buscarProdutos();
      toast.success("Modelo excluído!", { id: loadingId });
    }
  };

  const excluirVariacao = async (id) => {
    if (window.confirm("Certeza que quer excluir essa variação?")) {
      const loadingId = toast.loading("Excluindo...");
      await supabase.from('produtos').delete().eq('id', id);
      await buscarProdutos();
      toast.success("Variação excluída!", { id: loadingId });
    }
  };

  const iniciarAjusteRapido = (nomeProduto, variacoes) => {
    const valoresIniciais = {};
    variacoes.forEach(v => {
      valoresIniciais[v.id] = {
        banca: v.estoque_banca || 0,
        saco: v.estoque_saco || 0,
        meta: v.meta_global > 0 ? v.meta_global : 1 
      };
    });
    setValoresAjuste(valoresIniciais);
    setModoAjusteRapido(nomeProduto);
    setExpandidos(prev => ({ ...prev, [nomeProduto]: true })); 
  };

  const handleValorAjuste = (id, campo, valor) => {
    const numero = parseInt(valor) || 0;
    const valorMinimo = campo === 'meta' ? 1 : 0;
    setValoresAjuste(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: Math.max(valorMinimo, numero) } 
    }));
  };

  const salvarAjusteEmMassa = async (variacoes) => {
    const loadingId = toast.loading("Salvando...");
    try {
      for (const variacao of variacoes) {
        const novosValores = valoresAjuste[variacao.id];
        if (novosValores) {
          await supabase.from('produtos').update({ 
            estoque_banca: novosValores.banca, 
            estoque_saco: novosValores.saco,
            meta_global: novosValores.meta 
          }).eq('id', variacao.id);
        }
      }
      await buscarProdutos();
      setModoAjusteRapido(null);
      toast.success("Atualizado!", { id: loadingId });
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
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Controle de Catálogo e Ativos</p>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* BUSCA */}
        <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Filtrar modelos no gerenciador..." 
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm font-bold text-slate-700 uppercase transition-all shadow-sm"
              value={busca} 
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => { setProdutoEditando(null); setModalPassosAberto(true); }} 
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} className="text-blue-400" /> Cadastrar Novo Conjunto
          </button>
        </div>

        {/* LISTA DE MODELOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 custom-scrollbar">
          {modelosFiltrados.map(nome => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
            const estaAtivo = variacoes[0]?.ativo !== false; // ✨ Verifica se o modelo está ativo
            const estaExpandido = expandidos[nome];
            const emAjuste = modoAjusteRapido === nome;
            
            return (
              <div key={nome} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${!estaAtivo ? 'opacity-60 bg-slate-50 border-dashed' : 'border-slate-200'} ${emAjuste ? 'border-amber-300 ring-2 ring-amber-50' : ''}`}>
                
                <div className={`p-3 md:p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b transition-colors ${emAjuste ? 'bg-amber-50/50' : 'bg-slate-50/30'}`}>
                  
                  <div 
                    onClick={() => !emAjuste && toggleSanfona(nome)}
                    className="flex items-center gap-2 select-none flex-1 cursor-pointer group"
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${estaAtivo ? 'text-slate-400' : 'text-slate-300'}`}>
                      {estaExpandido ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                    </div>
                    <h3 className={`font-black uppercase tracking-tight truncate flex-1 ${!estaAtivo ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {nome}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 pl-8 md:pl-0">
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1.5 rounded-lg mr-1">
                      {estoqueTotal} un.
                    </span>
                    
                    {!emAjuste ? (
                      <>
                        {/* ✨ NOVO BOTÃO: ATIVAR/DESATIVAR (OLHO) ✨ */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleAtivoModelo(nome, estaAtivo); }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${estaAtivo ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300'}`}
                          title={estaAtivo ? "Desativar (Esconder da Vitrine)" : "Ativar (Mostrar na Vitrine)"}
                        >
                          {estaAtivo ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); iniciarAjusteRapido(nome, variacoes); }} 
                          className="w-8 h-8 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors"
                          title="Ajuste de Estoque"
                        >
                          <Zap size={16} className="fill-amber-500" />
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setProdutoMassaSelecionado(variacoes[0]); setModalEdicaoMassaAberto(true); }} 
                          className="w-8 h-8 bg-white text-slate-400 border border-slate-200 rounded-lg flex items-center justify-center hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title="Editar Preços"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); excluirProdutoMassa(nome); }} 
                          className="w-8 h-8 bg-white text-slate-400 border border-slate-200 rounded-lg flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-colors"
                          title="Excluir Tudo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setModoAjusteRapido(null)} className="text-[10px] font-black bg-white border border-slate-300 text-slate-500 px-3 py-1.5 rounded-lg uppercase">Cancelar</button>
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
                            {v.meta_global > 0 && (
                              <p className={`text-[9px] font-black mt-1 uppercase tracking-widest flex items-center gap-1 ${emAlerta ? 'text-red-500' : 'text-slate-400'}`}>
                                {emAlerta && <BellRing size={10} />} Alerta: {v.meta_global} un.
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {emAjuste ? (
                              <div className="flex items-center gap-2 bg-amber-50 p-1 rounded-lg">
                                <input type="number" className="w-10 text-center text-xs font-black p-1 border rounded" value={valoresAjuste[v.id]?.banca ?? 0} onChange={(e) => handleValorAjuste(v.id, 'banca', e.target.value)} />
                                <input type="number" className="w-10 text-center text-xs font-black p-1 border rounded" value={valoresAjuste[v.id]?.saco ?? 0} onChange={(e) => handleValorAjuste(v.id, 'saco', e.target.value)} />
                              </div>
                            ) : (
                              <div className="flex gap-1.5">
                                <button onClick={() => { setProdutoEditando(v); setModalPassosAberto(true); }} className="w-7 h-7 bg-slate-50 text-slate-400 rounded flex items-center justify-center"><Pencil size={12}/></button>
                                <button onClick={() => excluirVariacao(v.id)} className="w-7 h-7 bg-slate-50 text-slate-400 rounded flex items-center justify-center"><Trash2 size={12}/></button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {emAjuste && (
                      <div className="p-3 bg-amber-50">
                        <button onClick={() => salvarAjusteEmMassa(variacoes)} className="w-full bg-amber-500 text-amber-950 font-black py-3 rounded-xl uppercase text-[10px] flex items-center justify-center gap-2">
                          <Save size={14} /> Salvar Alterações
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