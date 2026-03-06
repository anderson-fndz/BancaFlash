import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

// Importando os modais recém-criados!
import ModalVariacoesRapidas from './ModalVariacoesRapidas';
import ModalEdicaoMassa from './ModalEdicaoMassa';
import ModalCadastroCompleto from './ModalCadastroCompleto';

export default function GerenciarEstoque({ aberto, fechar, produtos, buscarProdutos }) {
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});

  // Estados de Controle dos Modais
  const [modalPassosAberto, setModalPassosAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null); // null = Criando do Zero

  const [modalEdicaoMassaAberto, setModalEdicaoMassaAberto] = useState(false);
  const [produtoMassaSelecionado, setProdutoMassaSelecionado] = useState(null);

  const [modalVariacaoRapidaAberto, setModalVariacaoRapidaAberto] = useState(false);
  const [produtoRapidoSelecionado, setProdutoRapidoSelecionado] = useState(null);

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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-end animate-fade-in" onClick={fechar}>
      <div className="bg-gray-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
        
        <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-md z-10">
          <h2 className="text-xl font-black italic flex items-center gap-2">⚙️ Gerenciar Produtos</h2>
          <button onClick={fechar} className="text-gray-400 hover:text-white font-bold text-xl active:scale-95 w-8 h-8 rounded-full flex items-center justify-center">X</button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-white">
          <input 
            type="text" placeholder="Buscar modelo..." 
            className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold uppercase"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
          <button 
            onClick={() => { setProdutoEditando(null); setModalPassosAberto(true); }} 
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-all uppercase tracking-wide"
          >
            + Cadastrar Novo Modelo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">
          {modelosFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 font-bold mt-10">Nenhum produto encontrado.</p>
          ) : (
            modelosFiltrados.map(nome => {
              const variacoes = produtos.filter(p => p.nome === nome);
              const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
              const estaExpandido = expandidos[nome];
              
              return (
                <div key={nome} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                  
                  <div className="bg-gray-100 hover:bg-gray-200 p-3 flex justify-between items-center border-b border-gray-200 transition-colors">
                    <div 
                      onClick={() => toggleSanfona(nome)}
                      className="flex items-center gap-2 cursor-pointer select-none flex-1"
                    >
                      <span className="text-gray-400 font-bold text-xs">{estaExpandido ? '▼' : '▶'}</span>
                      <h3 className="font-black text-gray-800 uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{nome}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="text-xs font-bold text-gray-500 bg-white border px-2 py-1.5 rounded-lg shadow-sm hidden md:inline-block">Total: {estoqueTotal} un.</span>
                      
                      {/* BOTÃO DA NOSSA FEATURE NOVA (MODAL RÁPIDO) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setProdutoRapidoSelecionado(variacoes[0]); setModalVariacaoRapidaAberto(true); }} 
                        className="text-[10px] md:text-xs font-black bg-green-100 text-green-700 px-2 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase border border-green-200 hover:bg-green-200 transition-colors"
                      >
                        + Cor/Tam
                      </button>
                      
                      <button onClick={(e) => { e.stopPropagation(); setProdutoMassaSelecionado(variacoes[0]); setModalEdicaoMassaAberto(true); }} className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); excluirProdutoMassa(nome); }} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-colors">🗑️</button>
                    </div>
                  </div>
                  
                  {estaExpandido && (
                    <div className="divide-y divide-gray-100 animate-fade-in bg-white">
                      {variacoes.sort(sortLogico).map(v => (
                        <div key={v.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">Tam: <span className="text-blue-600 font-black">{v.tam}</span> <span className="text-gray-300 font-normal mx-1">|</span> {v.cor}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Saco: <span className="font-bold">{v.saco || '-'}</span></p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Banca / Saco</p>
                              <p className="font-black text-gray-700 text-sm">{v.estoque_banca || 0} / {v.estoque_saco || 0}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setProdutoEditando(v); setModalPassosAberto(true); }} className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded flex items-center justify-center active:scale-95 border border-blue-100 transition-colors">✏️</button>
                              <button onClick={() => excluirVariacao(v.id)} className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded flex items-center justify-center active:scale-95 border border-red-100 transition-colors">🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RENDERIZANDO OS MODAIS FILHOS QUE ACABAMOS DE CRIAR */}
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