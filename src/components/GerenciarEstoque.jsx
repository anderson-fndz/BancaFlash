import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { X, Settings, Plus, ChevronDown, ChevronRight, Pencil, Trash2, Zap, Save } from 'lucide-react';

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

  // ✨ ESTADOS PARA A EDIÇÃO RÁPIDA ("MODO PLANILHA") ✨
  const [modoAjusteRapido, setModoAjusteRapido] = useState(null); // Guarda o NOME do modelo que está sendo ajustado
  const [valoresAjuste, setValoresAjuste] = useState({}); // Guarda os valores digitados { id_produto: { banca: 10, saco: 5 } }

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
    // Se fechar a sanfona, cancela o modo de ajuste se estiver ativo nele
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

  // ✨ FUNÇÕES DO MODO AJUSTE RÁPIDO ✨
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
    setExpandidos(prev => ({ ...prev, [nomeProduto]: true })); // Garante que a sanfona abra
  };

  const handleValorAjuste = (id, campo, valor) => {
    const numero = parseInt(valor) || 0;
    setValoresAjuste(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: numero < 0 ? 0 : numero } // Não deixa ficar negativo
    }));
  };

  const salvarAjusteEmMassa = async (variacoes) => {
    const loadingId = toast.loading("Salvando estoque...");
    try {
      for (const variacao of variacoes) {
        const novosValores = valoresAjuste[variacao.id];
        // Só faz o update se os valores mudaram de verdade, pra economizar requisição
        if (novosValores && (novosValores.banca !== variacao.estoque_banca || novosValores.saco !== variacao.estoque_saco)) {
          await supabase
            .from('produtos')
            .update({ 
              estoque_banca: novosValores.banca, 
              estoque_saco: novosValores.saco 
            })
            .eq('id', variacao.id);
        }
      }
      await buscarProdutos();
      setModoAjusteRapido(null);
      toast.success("Estoque atualizado com sucesso!", { id: loadingId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar o estoque.", { id: loadingId });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex justify-end animate-fade-in backdrop-blur-sm" onClick={fechar}>
      <div className="bg-slate-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
        
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md z-10 shrink-0">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Settings className="text-blue-500" size={24} /> Gerenciar Produtos
          </h2>
          <button onClick={fechar} className="text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-white shrink-0">
          <input 
            type="text" placeholder="Buscar modelo..." 
            className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none font-bold uppercase transition-all shadow-sm"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
          <button 
            onClick={() => { setProdutoEditando(null); setModalPassosAberto(true); }} 
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-md shadow-blue-500/30 active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Plus size={20} strokeWidth={3} /> Cadastrar Novo Modelo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">
          {modelosFiltrados.length === 0 ? (
            <p className="text-center text-slate-400 font-bold mt-10">Nenhum produto encontrado.</p>
          ) : (
            modelosFiltrados.map(nome => {
              const variacoes = produtos.filter(p => p.nome === nome);
              const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
              const estaExpandido = expandidos[nome];
              const emAjuste = modoAjusteRapido === nome;
              
              return (
                <div key={nome} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${emAjuste ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'}`}>
                  
                  <div className={`p-3 md:p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b transition-colors ${emAjuste ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div 
                      onClick={() => !emAjuste && toggleSanfona(nome)}
                      className={`flex items-center gap-2 select-none flex-1 ${!emAjuste && 'cursor-pointer group'}`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${emAjuste ? 'text-amber-500' : 'text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                        {estaExpandido ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                      </div>
                      <h3 className={`font-black uppercase tracking-tight truncate flex-1 ${emAjuste ? 'text-amber-700' : 'text-slate-800'}`}>{nome}</h3>
                    </div>

                    <div className="flex items-center gap-2 pl-8 md:pl-0">
                      <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm whitespace-nowrap">Tot: {estoqueTotal} un.</span>
                      
                      {/* ✨ BOTÃO DE ATIVAR O MODO PLANILHA ✨ */}
                      {!emAjuste ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); iniciarAjusteRapido(nome, variacoes); }} 
                          className="flex items-center gap-1 text-[10px] md:text-xs font-black bg-slate-800 text-white px-2.5 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase hover:bg-black transition-colors"
                          title="Ajuste Rápido de Estoque"
                        >
                          <Zap size={14} className="text-amber-400" /> Ajuste Rápido
                        </button>
                      ) : (
                        <button 
                          onClick={() => setModoAjusteRapido(null)} 
                          className="text-[10px] md:text-xs font-black bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg active:scale-95 uppercase hover:bg-slate-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                      
                      {!emAjuste && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setProdutoRapidoSelecionado(variacoes[0]); setModalVariacaoRapidaAberto(true); }} className="w-8 h-8 md:w-auto md:px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors text-xs font-black uppercase gap-1" title="Adicionar Cor/Tamanho">
                            <Plus size={14} strokeWidth={3} /> <span className="hidden md:inline">Cor/Tam</span>
                          </button>
                          
                          <button onClick={(e) => { e.stopPropagation(); setProdutoMassaSelecionado(variacoes[0]); setModalEdicaoMassaAberto(true); }} className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors" title="Editar Preços e Dados do Modelo"><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); excluirProdutoMassa(nome); }} className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors" title="Excluir Modelo Inteiro"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="divide-y divide-slate-50 animate-fade-in bg-white">
                      {variacoes.sort(sortLogico).map(v => (
                        <div key={v.id} className={`p-3 md:p-4 flex justify-between items-center transition-colors ${emAjuste ? 'hover:bg-amber-50/30' : 'hover:bg-slate-50'}`}>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">Tam: <span className="text-blue-600 font-black">{v.tam}</span> <span className="text-slate-300 font-normal mx-1">|</span> {v.cor}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Saco: <span className="font-bold">{v.saco || '-'}</span></p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            
                            {/* ✨ MODO PLANILHA (INPUTS) VS MODO NORMAL (TEXTOS) ✨ */}
                            {emAjuste ? (
                              <div className="flex items-center gap-2">
                                <div className="text-center">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Banca</label>
                                  <input 
                                    type="number" min="0" 
                                    className="w-14 p-1.5 border-2 border-amber-200 rounded-md text-center font-black text-sm text-slate-800 outline-none focus:border-amber-500 bg-amber-50"
                                    value={valoresAjuste[v.id]?.banca ?? 0}
                                    onChange={(e) => handleValorAjuste(v.id, 'banca', e.target.value)}
                                  />
                                </div>
                                <div className="text-center">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Saco</label>
                                  <input 
                                    type="number" min="0" 
                                    className="w-14 p-1.5 border-2 border-amber-200 rounded-md text-center font-black text-sm text-slate-800 outline-none focus:border-amber-500 bg-amber-50"
                                    value={valoresAjuste[v.id]?.saco ?? 0}
                                    onChange={(e) => handleValorAjuste(v.id, 'saco', e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-right hidden sm:block">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banca / Saco</p>
                                  <p className="font-black text-slate-700 text-sm">{v.estoque_banca || 0} / {v.estoque_saco || 0}</p>
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => { setProdutoEditando(v); setModalPassosAberto(true); }} className="w-8 h-8 bg-white hover:bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center active:scale-95 border border-slate-200 hover:border-blue-200 transition-colors shadow-sm"><Pencil size={14}/></button>
                                  <button onClick={() => excluirVariacao(v.id)} className="w-8 h-8 bg-white hover:bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-95 border border-slate-200 hover:border-red-200 transition-colors shadow-sm"><Trash2 size={14}/></button>
                                </div>
                              </>
                            )}

                          </div>
                        </div>
                      ))}

                      {/* ✨ BOTÃO GIGANTE PARA SALVAR O AJUSTE RÁPIDO ✨ */}
                      {emAjuste && (
                        <div className="p-3 bg-amber-50 border-t border-amber-100 flex justify-end">
                          <button 
                            onClick={() => salvarAjusteEmMassa(variacoes)}
                            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-3 rounded-xl shadow-md active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Save size={18} /> Salvar Estoque do Modelo
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