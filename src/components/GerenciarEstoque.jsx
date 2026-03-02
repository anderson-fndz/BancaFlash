import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast'; 

export default function GerenciarEstoque({ aberto, fechar, produtos, buscarProdutos }) {
  const [busca, setBusca] = useState('');
  
  // WIZARD DE CRIAÇÃO/EDIÇÃO DE PRODUTO
  const [modalPassosAberto, setModalPassosAberto] = useState(false);
  const [passoAtual, setPassoAtual] = useState(1);
  const [editandoId, setEditandoId] = useState(null);

  const [formBase, setFormBase] = useState({ nome: '', preco: '', preco_atacado: '', custo: '' });
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  
  const [coresLista, setCoresLista] = useState([]);
  const [formCor, setFormCor] = useState({ cor: '', saco: '', meta_banca: 3, meta_global: 6 });
  const [estoques, setEstoques] = useState({});

  // ESTADO DA SANFONA
  const [expandidos, setExpandidos] = useState({});

  // EDIÇÃO EM MASSA DO PRODUTO (NOME, PREÇOS, CUSTO)
  const [modalEdicaoMassaAberto, setModalEdicaoMassaAberto] = useState(false);
  const [formEdicaoMassa, setFormEdicaoMassa] = useState({ nomeAntigo: '', nomeNovo: '', preco: '', preco_atacado: '', custo: '' });

  // ✨ NOVO: ADICIONAR VARIAÇÃO RÁPIDA (Cor/Tam) A UM PRODUTO EXISTENTE
  const [modalVariacaoRapidaAberto, setModalVariacaoRapidaAberto] = useState(false);
  const [formVariacaoRapida, setFormVariacaoRapida] = useState({
    nome: '', preco: 0, preco_atacado: 0, custo: 0, cor: '', tam: '', saco: '', meta_banca: 3, meta_global: 6
  });

  if (!aberto) return null;

  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];
  const modelosFiltrados = nomesUnicos.filter(nome => nome.toLowerCase().includes(busca.toLowerCase()));

  const tamanhosComuns = ['P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'U'];

  const toggleSanfona = (nomeProduto) => {
    setExpandidos(prev => ({ ...prev, [nomeProduto]: !prev[nomeProduto] }));
  };

  const abrirCriacaoNova = () => {
    setEditandoId(null);
    setFormBase({ nome: '', preco: '', preco_atacado: '', custo: '' });
    setTamanhosSelecionados([]);
    setCoresLista([]);
    setFormCor({ cor: '', saco: '', meta_banca: 3, meta_global: 6 });
    setEstoques({});
    setPassoAtual(1);
    setModalPassosAberto(true);
  };

  const abrirEdicaoExistente = (produto) => {
    setEditandoId(produto.id);
    setFormBase({ 
      nome: produto.nome, 
      preco: produto.preco, 
      preco_atacado: produto.preco_atacado || produto.preco,
      custo: produto.custo || ''
    });
    setTamanhosSelecionados([produto.tam]);
    setFormCor({ cor: produto.cor, saco: produto.saco || '', meta_banca: produto.meta_banca || 3, meta_global: produto.meta_global || 6 });
    setEstoques({
      [produto.tam]: { banca: produto.estoque_banca || 0, saco: produto.estoque_saco || 0 }
    });
    setPassoAtual(3); 
    setModalPassosAberto(true);
  };

  const abrirEdicaoMassa = (nomeProduto) => {
    const variacoes = produtos.filter(p => p.nome === nomeProduto);
    if (variacoes.length > 0) {
      setFormEdicaoMassa({
        nomeAntigo: variacoes[0].nome,
        nomeNovo: variacoes[0].nome,
        preco: variacoes[0].preco,
        preco_atacado: variacoes[0].preco_atacado || variacoes[0].preco,
        custo: variacoes[0].custo || ''
      });
      setModalEdicaoMassaAberto(true);
    }
  };

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
    await supabase.from('produtos').update(dadosMassa).eq('nome', formEdicaoMassa.nomeAntigo);

    await buscarProdutos();
    setModalEdicaoMassaAberto(false);
    toast.success("Produto atualizado por completo!", { id: loadingId });
  };

  const excluirProdutoMassa = async (nomeProduto) => {
    if (window.confirm(`ATENÇÃO: Você tem certeza que deseja excluir o modelo "${nomeProduto}" INTEIRO? Todas as cores e tamanhos serão apagados!`)) {
      const loadingId = toast.loading("Excluindo modelo...");
      await supabase.from('produtos').delete().eq('nome', nomeProduto);
      await buscarProdutos();
      toast.success("Modelo inteiro excluído com sucesso!", { id: loadingId });
    }
  };

  // ✨ FUNÇÕES DA NOVA VARIAÇÃO RÁPIDA
  const abrirNovaVariacaoRapida = (produtoBase) => {
    setFormVariacaoRapida({
      nome: produtoBase.nome,
      preco: produtoBase.preco,
      preco_atacado: produtoBase.preco_atacado || produtoBase.preco,
      custo: produtoBase.custo || 0,
      cor: '',
      tam: '',
      saco: produtoBase.saco || '',
      meta_banca: produtoBase.meta_banca || 3,
      meta_global: produtoBase.meta_global || 6
    });
    setModalVariacaoRapidaAberto(true);
  };

  const salvarVariacaoRapida = async () => {
    if (!formVariacaoRapida.cor.trim() || !formVariacaoRapida.tam.trim()) {
      toast.error("Preencha a cor e o tamanho!");
      return;
    }

    const loadingId = toast.loading("Adicionando nova variação...");

    const registro = {
      nome: formVariacaoRapida.nome,
      preco: formVariacaoRapida.preco,
      preco_atacado: formVariacaoRapida.preco_atacado,
      custo: formVariacaoRapida.custo,
      cor: formVariacaoRapida.cor.trim().toUpperCase(),
      tam: formVariacaoRapida.tam.trim().toUpperCase(),
      saco: formVariacaoRapida.saco.trim().toUpperCase(),
      estoque_banca: 0,
      estoque_saco: 0,
      meta_banca: formVariacaoRapida.meta_banca,
      meta_global: formVariacaoRapida.meta_global
      // user_id é pego automaticamente pelo banco (DEFAULT auth.uid())
    };

    const { error } = await supabase.from('produtos').insert([registro]);

    if (error) {
      toast.error("Erro ao salvar variação!", { id: loadingId });
      console.error(error);
    } else {
      await buscarProdutos();
      setModalVariacaoRapidaAberto(false);
      setExpandidos(prev => ({ ...prev, [formVariacaoRapida.nome]: true })); // Expande a sanfona pra mostrar
      toast.success("Nova variação adicionada!", { id: loadingId });
    }
  };

  // WIZARD NORMAL...
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

    if (editandoId) {
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
      await supabase.from('produtos').update(dadosEdicao).eq('id', editandoId);

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
      setModalPassosAberto(false);
      toast.success("Produto salvo com sucesso!", { id: loadingId });
    } else {
      setFormCor({ cor: '', saco: formCor.saco, meta_banca: 3, meta_global: 6 });
      setEstoques({});
      toast.success("Variações salvas! Pode digitar a próxima cor.", { id: loadingId });
      document.getElementById('input-cor').focus();
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
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-end" onClick={fechar}>
      <div className="bg-gray-50 w-full md:w-[600px] h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
        
        <div className="bg-gray-900 text-white p-5 flex justify-between items-center shadow-md z-10">
          <h2 className="text-xl font-black italic flex items-center gap-2">⚙️ Gerenciar Produtos</h2>
          <button onClick={fechar} className="text-gray-400 hover:text-white font-bold text-xl active:scale-95">X</button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-white">
          <input 
            type="text" placeholder="Buscar modelo..." 
            className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
          <button 
            onClick={abrirCriacaoNova} 
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-all uppercase tracking-wide"
          >
            + Cadastrar Novo Modelo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {modelosFiltrados.map(nome => {
            const variacoes = produtos.filter(p => p.nome === nome);
            const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
            const estaExpandido = expandidos[nome];
            
            return (
              <div key={nome} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                
                {/* CABEÇALHO CLICÁVEL (SANFONA + BOTÕES DE AÇÃO) */}
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
                    
                    {/* NOVO BOTÃO DE VARIAÇÃO RÁPIDA */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); abrirNovaVariacaoRapida(variacoes[0]); }} 
                      className="text-[10px] md:text-xs font-black bg-green-100 text-green-700 px-2 py-1.5 rounded-lg active:scale-95 shadow-sm uppercase border border-green-200 hover:bg-green-200 transition-colors"
                    >
                      + Cor/Tam
                    </button>
                    
                    <button onClick={(e) => { e.stopPropagation(); abrirEdicaoMassa(nome); }} className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-sm active:scale-95">✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); excluirProdutoMassa(nome); }} className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shadow-sm active:scale-95">🗑️</button>
                  </div>
                </div>
                
                {/* LISTA DE VARIAÇÕES (ORDENADAS POR COR) */}
                {estaExpandido && (
                  <div className="divide-y divide-gray-100 animate-fade-in bg-white">
                    {variacoes.sort((a,b) => a.cor.localeCompare(b.cor)).map(v => (
                      <div key={v.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{v.cor}</p>
                          <p className="text-xs text-gray-500">Tam: <span className="font-bold text-blue-600">{v.tam}</span> | Saco: {v.saco || '-'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Banca / Saco</p>
                            <p className="font-black text-gray-700 text-sm">{v.estoque_banca || 0} / {v.estoque_saco || 0}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => abrirEdicaoExistente(v)} className="w-8 h-8 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded flex items-center justify-center active:scale-95 border border-blue-100">✏️</button>
                            <button onClick={() => excluirVariacao(v.id)} className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-100 rounded flex items-center justify-center active:scale-95 border border-red-100">🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 MODAL DE VARIAÇÃO RÁPIDA (O NOVO MODAL) */}
      {/* ========================================================= */}
      {modalVariacaoRapidaAberto && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4" onClick={() => setModalVariacaoRapidaAberto(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-black text-gray-800 flex items-center gap-2">✨ Adicionar Variação</h3>
              <button onClick={() => setModalVariacaoRapidaAberto(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-500 uppercase">Produto Base</p>
                <p className="font-black text-blue-900 uppercase truncate">{formVariacaoRapida.nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nova Cor</label>
                    <input type="text" className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:border-green-500 outline-none" placeholder="Ex: CRU" value={formVariacaoRapida.cor} onChange={e => setFormVariacaoRapida({...formVariacaoRapida, cor: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Tamanho</label>
                    <input type="text" className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:border-green-500 outline-none text-center" placeholder="Ex: M" value={formVariacaoRapida.tam} onChange={e => setFormVariacaoRapida({...formVariacaoRapida, tam: e.target.value})} />
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Saco / Local (Opcional)</label>
                <input type="text" className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-green-500 outline-none" placeholder="Ex: SACO 4" value={formVariacaoRapida.saco} onChange={e => setFormVariacaoRapida({...formVariacaoRapida, saco: e.target.value})} />
              </div>

              <button onClick={salvarVariacaoRapida} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl mt-2 active:scale-95 transition-colors uppercase tracking-widest shadow-md">
                Salvar Variação
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* MODAL WIZARD (CRIAR / EDITAR VARIAÇÃO EXISTENTE) */}
      {/* ========================================================= */}
      {modalPassosAberto && (
         <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setModalPassosAberto(false)}>
         <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
           
           <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
             <div>
               <h3 className="font-black text-gray-800">{editandoId ? 'Editando Variação' : 'Novo Produto'}</h3>
               <p className="text-xs font-bold text-blue-600">Passo {passoAtual} de 3</p>
             </div>
             <button onClick={() => setModalPassosAberto(false)} className="bg-gray-200 text-gray-600 w-8 h-8 rounded-full font-bold">X</button>
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
                   <input disabled={editandoId !== null} type="text" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold uppercase mt-1 focus:border-blue-500 outline-none ${editandoId ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="Ex: CONJUNTO COTELE" value={formBase.nome} onChange={e => setFormBase({...formBase, nome: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Preço Varejo</label>
                     <input disabled={editandoId !== null} type="number" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none ${editandoId ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="R$" value={formBase.preco} onChange={e => setFormBase({...formBase, preco: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Preço Atacado</label>
                     <input disabled={editandoId !== null} type="number" className={`w-full p-3 border-2 border-gray-200 rounded-xl font-bold mt-1 focus:border-blue-500 outline-none ${editandoId ? 'bg-gray-100 text-gray-500' : ''}`} placeholder="R$" value={formBase.preco_atacado} onChange={e => setFormBase({...formBase, preco_atacado: e.target.value})} />
                   </div>
                 </div>

                 {/* CAMPO DE CUSTO */}
                 <div className={`p-3 rounded-xl border mt-2 ${editandoId ? 'bg-gray-100 border-gray-200' : 'bg-yellow-50 border-yellow-200'}`}>
                   <label className={`text-xs font-bold uppercase block mb-1 ${editandoId ? 'text-gray-400' : 'text-yellow-700'}`}>Custo de Produção</label>
                   <input disabled={editandoId !== null} type="number" className="w-full p-2 bg-transparent border-b-2 border-gray-300 outline-none font-bold" placeholder="R$ 0.00" value={formBase.custo} onChange={e => setFormBase({...formBase, custo: e.target.value})} />
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
                   <h4 className="font-black text-gray-700 mt-2">{editandoId ? 'Tamanho da Variação' : 'Quais tamanhos essa peça tem?'}</h4>
                 </div>
                 
                 <div className="flex flex-wrap gap-2 justify-center">
                   {tamanhosComuns.map(tam => (
                     <button 
                       key={tam} 
                       disabled={editandoId !== null}
                       onClick={() => toggleTamanho(tam)}
                       className={`w-14 h-14 rounded-2xl font-black text-lg transition-all border-2 ${editandoId ? 'cursor-not-allowed opacity-80' : 'active:scale-95'} ${tamanhosSelecionados.includes(tam) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
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
                   <p className="text-xs text-blue-500 font-bold uppercase">{editandoId ? 'Editando:' : 'Cadastrando para:'}</p>
                   <p className="font-black text-blue-800 leading-tight uppercase">{formBase.nome}</p>
                   <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Tamanhos: {tamanhosSelecionados.join(', ')}</p>
                 </div>

                 {!editandoId ? (
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
                   {!editandoId && <button onClick={() => setPassoAtual(2)} className="w-1/4 bg-gray-200 text-gray-600 font-black py-4 rounded-xl active:scale-95 text-xs">⬅ VOLTAR</button>}
                   <button onClick={() => salvarVariacao(true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl active:scale-95 text-sm uppercase shadow-md transition-colors">💾 Salvar Tudo e Fechar</button>
                 </div>
                 
                 {!editandoId && (
                   <button onClick={() => salvarVariacao(false)} className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-black py-3 rounded-xl active:scale-95 text-sm uppercase transition-colors mt-2">
                     + Salvar e Lançar Outra Cor
                   </button>
                 )}

               </div>
             )}

           </div>
         </div>
       </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PARA EDITAR DADOS GERAIS DO PRODUTO (NOME, PREÇOS E CUSTO) */}
      {/* ========================================================= */}
      {modalEdicaoMassaAberto && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setModalEdicaoMassaAberto(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-black text-gray-800 flex items-center gap-2">✏️ Editar Modelo Base</h3>
              <button onClick={() => setModalEdicaoMassaAberto(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
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
      )}
      
    </div>
  );
}