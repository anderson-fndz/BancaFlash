import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function GerenciarEstoque({ aberto, fechar, produtos, buscarProdutos }) {
  const [aba, setAba] = useState('CATALOGO'); 
  
  const [modeloAberto, setModeloAberto] = useState(null); 
  const [novoNomeModelo, setNovoNomeModelo] = useState(''); 
  const [precoModelo, setPrecoModelo] = useState('');
  const [precoAtacadoModelo, setPrecoAtacadoModelo] = useState('');
  const [form, setForm] = useState(null); 
  const [formProduto, setFormProduto] = useState({ nome: '', preco: '', preco_atacado: '' });
  const [reporCart, setReporCart] = useState({});

  const [buscaCatalogo, setBuscaCatalogo] = useState('');
  const [buscaRepor, setBuscaRepor] = useState('');

  if (!aberto) return null;

  const coresUnicas = [...new Set(produtos.map(p => p.cor))];
  const tamanhosUnicos = [...new Set(produtos.map(p => p.tam))];

  const nomesUnicos = [...new Set(produtos.map(p => p.nome))];
  const nomesFiltradosCatalogo = nomesUnicos.filter(nome => 
    nome.toLowerCase().includes(buscaCatalogo.toLowerCase())
  );

  const produtosFiltradosRepor = produtos.filter(p => 
    p.nome.toLowerCase().includes(buscaRepor.toLowerCase()) || 
    p.cor.toLowerCase().includes(buscaRepor.toLowerCase())
  );
  
  const produtosAgrupados = produtosFiltradosRepor.reduce((acc, p) => {
    if (!acc[p.nome]) acc[p.nome] = [];
    acc[p.nome].push(p);
    return acc;
  }, {});

  const alterarQtdRepor = (id, delta) => {
    setReporCart(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = qtdAtual + delta;
      if (novaQtd <= 0) {
        const novoCarrinho = { ...prev };
        delete novoCarrinho[id];
        return novoCarrinho;
      }
      return { ...prev, [id]: novaQtd };
    });
  };

  const finalizarReposicao = async () => {
    const idsParaRepor = Object.keys(reporCart);
    if (idsParaRepor.length === 0) return;

    for (const id of idsParaRepor) {
      const qtdAdicional = reporCart[id];
      const produtoDb = produtos.find(p => p.id == parseInt(id));
      
      // A reposição de mercadoria nova vai sempre pro Saco (Estoque Guardado)
      const novoEstoqueSaco = produtoDb.estoque_saco + qtdAdicional;
      
      await supabase.from('produtos').update({ estoque_saco: novoEstoqueSaco }).eq('id', id);
    }
    setReporCart({});
    buscarProdutos();
    alert("✅ Mercadoria nova guardada no estoque (Saco) com sucesso!");
  };

  const abrirPainelProduto = (nome) => {
    const variacoes = produtos.filter(p => p.nome === nome);
    setModeloAberto(nome);
    setNovoNomeModelo(nome);
    setPrecoModelo(variacoes[0]?.preco || '');
    setPrecoAtacadoModelo(variacoes[0]?.preco_atacado || '');
    setForm(null); 
  };

  const atualizarProdutoPai = async () => {
    if (!novoNomeModelo.trim()) return;
    const dadosAtualizados = { nome: novoNomeModelo.trim(), preco: parseFloat(precoModelo || 0), preco_atacado: parseFloat(precoAtacadoModelo || 0) };
    const { error } = await supabase.from('produtos').update(dadosAtualizados).eq('nome', modeloAberto);
    if (error) alert("Erro ao atualizar!");
    else { alert("Produto atualizado!"); setModeloAberto(novoNomeModelo.trim()); buscarProdutos(); }
  };

  const excluirProdutoInteiro = async () => {
    if (!window.confirm(`⚠️ TEM CERTEZA? Isso vai apagar o produto "${modeloAberto}" e TODAS as cores dele!`)) return;
    await supabase.from('produtos').delete().eq('nome', modeloAberto);
    setModeloAberto(null);
    buscarProdutos();
  };

  const excluirVariacao = async (id) => {
    if (!window.confirm("Apagar variação definitivamente?")) return;
    await supabase.from('produtos').delete().eq('id', id);
    buscarProdutos();
  };

  const salvarVariacao = async (e) => {
    e.preventDefault();
    // Agora o banco de dados recebe as colunas novas
    const dados = {
      nome: modeloAberto, 
      cor: form.cor.trim(), 
      tam: form.tam.trim(), 
      estoque_banca: parseInt(form.estoque_banca || 0), 
      meta_banca: parseInt(form.meta_banca || 2),
      estoque_saco: parseInt(form.estoque_saco || 0), 
      meta_global: parseInt(form.meta_global || 6),
      preco: parseFloat(precoModelo || 0), 
      preco_atacado: parseFloat(precoAtacadoModelo || 0), 
      saco: form.saco.trim()
    };
    if (form.id) await supabase.from('produtos').update(dados).eq('id', form.id);
    else await supabase.from('produtos').insert([dados]);
    setForm(null); buscarProdutos();
  };

  const iniciarNovoProduto = () => {
    setFormProduto({ nome: '', preco: '', preco_atacado: '' });
    setAba('CRIAR_PRODUTO');
  };

  const avancarNovoProduto = (e) => {
    e.preventDefault();
    const nomeFormatado = formProduto.nome.toUpperCase().trim();
    setModeloAberto(nomeFormatado);
    setNovoNomeModelo(nomeFormatado);
    setPrecoModelo(formProduto.preco);
    setPrecoAtacadoModelo(formProduto.preco_atacado);
    setAba('CATALOGO');
    setForm(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={fechar}>
      <div className="bg-gray-100 w-full h-[95vh] rounded-t-3xl p-4 flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm">
          <h2 className="text-xl font-black text-gray-800">⚙️ Gestão de Estoque</h2>
          <button onClick={fechar} className="bg-red-100 text-red-600 w-10 h-10 rounded-full font-bold text-xl active:scale-95">X</button>
        </div>

        {!modeloAberto && !form && aba !== 'CRIAR_PRODUTO' && (
          <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-xl">
            <button onClick={() => setAba('CATALOGO')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'CATALOGO' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Catálogo</button>
            <button onClick={() => setAba('REPOR')} className={`flex-1 py-2 font-bold rounded-lg text-sm ${aba === 'REPOR' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Dar Entrada</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* TELA 1: LISTA DO CATÁLOGO COM BUSCA */}
          {!modeloAberto && !form && aba === 'CATALOGO' && (
            <div className="space-y-3">
              <button onClick={iniciarNovoProduto} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow mb-2 active:scale-95 transition-transform">
                + CADASTRAR PRODUTO NOVO
              </button>

              <input 
                type="text" 
                placeholder="🔍 Procurar no catálogo..." 
                className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 outline-none focus:border-blue-500"
                value={buscaCatalogo}
                onChange={e => setBuscaCatalogo(e.target.value)}
              />
              
              {nomesFiltradosCatalogo.length === 0 && <p className="text-center text-gray-400 mt-4">Nenhum produto achado.</p>}

              {nomesFiltradosCatalogo.map(nome => {
                const variacoes = produtos.filter(p => p.nome === nome);
                // Soma total agora é Banca + Saco
                const estoqueTotal = variacoes.reduce((acc, p) => acc + (p.estoque_banca || 0) + (p.estoque_saco || 0), 0);
                
                return (
                  <button key={nome} onClick={() => abrirPainelProduto(nome)} className="w-full bg-white p-4 rounded-xl shadow-sm border text-left flex justify-between items-center active:bg-gray-50">
                    <div>
                      <p className="font-bold text-lg text-gray-800 uppercase">{nome}</p>
                      <p className="text-sm text-gray-500">{variacoes.length} variações cadastradas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total (Banca+Saco)</p>
                      <p className="font-black text-blue-600 text-xl">{estoqueTotal}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* TELA 2: FLUXO DE CRIAR NOVO PRODUTO */}
          {!modeloAberto && !form && aba === 'CRIAR_PRODUTO' && (
            <form onSubmit={avancarNovoProduto} className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
              <h3 className="font-black text-gray-800 border-b pb-2 text-lg">1. Informações do Produto</h3>
              <div><label className="text-sm font-bold text-gray-600">NOME DO MODELO</label><input required className="w-full border-2 p-3 rounded-lg mt-1 font-bold uppercase" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} placeholder="Ex: CONJUNTO SAIA" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-sm font-bold text-gray-600">Preço Varejo</label><input required type="number" step="0.01" className="w-full border-2 p-3 rounded-lg mt-1" value={formProduto.preco} onChange={e => setFormProduto({...formProduto, preco: e.target.value})} /></div>
                <div className="flex-1"><label className="text-sm font-bold text-gray-600">Preço Atacado</label><input required type="number" step="0.01" className="w-full border-2 p-3 rounded-lg mt-1" value={formProduto.preco_atacado} onChange={e => setFormProduto({...formProduto, preco_atacado: e.target.value})} /></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button type="button" onClick={() => setAba('CATALOGO')} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold active:scale-95">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black shadow-md active:scale-95">Continuar ➔</button>
              </div>
            </form>
          )}

          {/* TELA 3: DAR ENTRADA (CARRINHO DE REPOSIÇÃO COM BUSCA) */}
          {!modeloAberto && !form && aba === 'REPOR' && (
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="🔍 Buscar produto ou cor pra repor..." 
                className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 outline-none focus:border-blue-500"
                value={buscaRepor}
                onChange={e => setBuscaRepor(e.target.value)}
              />
              
              {Object.entries(produtosAgrupados).map(([nomeProduto, itens]) => (
                <div key={nomeProduto} className="bg-white p-3 rounded-xl border shadow-sm">
                  <h3 className="font-black text-gray-800 uppercase border-b pb-2 mb-2 text-sm">{nomeProduto}</h3>
                  {itens.map(p => {
                    const qtdSendoReposta = reporCart[p.id] || 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                        <div>
                          <p className="font-bold text-gray-700">{p.cor} <span className="text-gray-400">|</span> Tam: {p.tam}</p>
                          <p className="text-xs text-gray-500">Na Banca: <span className="font-bold">{p.estoque_banca || 0}</span> | No Saco: <span className="font-bold">{p.estoque_saco || 0}</span></p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 border rounded-lg p-1">
                          <button onClick={() => alterarQtdRepor(p.id, -1)} className="bg-white w-8 h-8 rounded text-lg font-bold text-gray-700 shadow-sm active:scale-95">-</button>
                          <span className={`font-black text-md w-6 text-center ${qtdSendoReposta > 0 ? 'text-green-600' : 'text-gray-400'}`}>{qtdSendoReposta > 0 ? `+${qtdSendoReposta}` : '0'}</span>
                          <button onClick={() => alterarQtdRepor(p.id, 1)} className="bg-white w-8 h-8 rounded text-lg font-bold text-gray-700 shadow-sm active:scale-95">+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* TELA 4: PAINEL DO PRODUTO */}
          {modeloAberto && !form && (
            <div className="space-y-4">
              <button onClick={() => setModeloAberto(null)} className="text-blue-600 font-bold mb-2">⬅ Voltar ao Catálogo</button>
              <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Configurações Base</p>
                <div><label className="text-sm font-bold text-gray-600">NOME</label><input className="w-full border-2 p-2 rounded-lg font-bold uppercase mt-1" value={novoNomeModelo} onChange={e => setNovoNomeModelo(e.target.value)} /></div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="text-sm font-bold text-gray-600">Preço Varejo</label><input type="number" step="0.01" className="w-full border-2 p-2 rounded-lg mt-1" value={precoModelo} onChange={e => setPrecoModelo(e.target.value)} /></div>
                  <div className="flex-1"><label className="text-sm font-bold text-gray-600">Preço Atacado</label><input type="number" step="0.01" className="w-full border-2 p-2 rounded-lg mt-1" value={precoAtacadoModelo} onChange={e => setPrecoAtacadoModelo(e.target.value)} /></div>
                </div>
                <button onClick={atualizarProdutoPai} className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold mt-2">Aplicar em Todas</button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 mt-4">
                  <h3 className="font-black text-gray-700">Variações ({produtos.filter(p => p.nome === modeloAberto).length})</h3>
                  <button onClick={() => setForm({ id: null, cor: '', tam: '', estoque_banca: '', meta_banca: 2, estoque_saco: '', meta_global: 6, saco: '' })} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold text-sm">+ Nova</button>
                </div>
                {produtos.filter(p => p.nome === modeloAberto).length === 0 && <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-center text-sm text-yellow-700 mb-2">⚠️ Adicione a primeira variação!</div>}
                
                <div className="space-y-2">
                  {produtos.filter(p => p.nome === modeloAberto).map(p => (
                    <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{p.cor} | Tam: {p.tam}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="bg-blue-100 text-blue-800 px-1 rounded">Banca: {p.estoque_banca || 0}</span> 
                          <span className="bg-gray-200 text-gray-700 px-1 rounded ml-1">Saco {p.saco}: {p.estoque_saco || 0}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setForm(p)} className="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold">✏️</button>
                        <button onClick={() => excluirVariacao(p.id)} className="bg-red-100 text-red-600 p-2 rounded-lg font-bold">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={excluirProdutoInteiro} className="w-full bg-red-50 text-red-500 py-3 rounded-lg font-bold mt-6 border border-red-200 active:scale-95">
                  🗑️ Excluir Produto Inteiro
                </button>
              </div>
            </div>
          )}

          {/* TELA 5: FORMULÁRIO DE VARIAÇÃO (Com as novas divisões de Estoque) */}
          {form && (
            <form onSubmit={salvarVariacao} className="space-y-3 bg-white p-4 rounded-xl shadow-sm border relative mt-4">
              <button type="button" onClick={() => setForm(null)} className="absolute top-4 right-4 text-gray-400 font-bold">Cancelar</button>
              <h3 className="font-black text-gray-700 border-b pb-2 mb-2">{form.id ? '✏️ Editar Variação' : '➕ Nova Variação'}</h3>
              
              <div className="flex gap-3 mt-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-gray-600">Cor</label>
                  <input required list="lista-cores" className="w-full border-2 p-3 rounded-lg mt-1" value={form.cor} onChange={e=>setForm({...form, cor: e.target.value})} placeholder="Ex: Pink" />
                  <datalist id="lista-cores">{coresUnicas.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="w-1/3">
                  <label className="text-sm font-bold text-gray-600">Tam.</label>
                  <input required list="lista-tamanhos" className="w-full border-2 p-3 rounded-lg mt-1" value={form.tam} onChange={e=>setForm({...form, tam: e.target.value})} placeholder="Ex: M" />
                  <datalist id="lista-tamanhos">{tamanhosUnicos.map(t => <option key={t} value={t} />)}</datalist>
                </div>
              </div>

              {/* LINHA 1: BANCA */}
              <div className="flex gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-800">Qtd. na Banca (Arara)</label>
                  <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={form.estoque_banca} onChange={e=>setForm({...form, estoque_banca: e.target.value})} placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-800">Meta Banca (Exposta)</label>
                  <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={form.meta_banca} onChange={e=>setForm({...form, meta_banca: e.target.value})} placeholder="2" />
                </div>
              </div>

              {/* LINHA 2: SACO (ESTOQUE) */}
              <div className="flex gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 mt-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-700">Qtd. no Saco (Guardado)</label>
                  <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={form.estoque_saco} onChange={e=>setForm({...form, estoque_saco: e.target.value})} placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-700">Meta Total (Atacado)</label>
                  <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={form.meta_global} onChange={e=>setForm({...form, meta_global: e.target.value})} placeholder="6" />
                </div>
              </div>

              {/* LINHA 3: NOME DO SACO */}
              <div className="mt-2">
                <label className="text-sm font-bold text-gray-600">Nº do Saco / Local</label>
                <input required className="w-full border-2 p-3 rounded-lg mt-1" value={form.saco} onChange={e=>setForm({...form, saco: e.target.value})} placeholder="Ex: Saco 01" />
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg mt-4 shadow-lg active:scale-95">
                SALVAR VARIAÇÃO
              </button>
            </form>
          )}

        </div>

        {/* BOTÃO CONFIRMAR REPOSIÇÃO */}
        {!modeloAberto && !form && aba === 'REPOR' && Object.keys(reporCart).length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-100 border-t border-gray-200">
            <button onClick={finalizarReposicao} className="w-full bg-green-500 text-white text-xl py-4 rounded-2xl font-black shadow-lg active:scale-95 flex justify-center gap-2 items-center">
              <span>📦</span> CONFIRMAR REPOSIÇÃO
            </button>
          </div>
        )}

      </div>
    </div>
  );
}