import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function ModalEdicaoVenda({ vendaSelecionada, fechar, produtos, buscarVendasDoDia }) {
  const [vendaEditando, setVendaEditando] = useState(null);
  const [itensDeletados, setItensDeletados] = useState([]);

  useEffect(() => {
    if (vendaSelecionada) {
      const dataTransacao = new Date(vendaSelecionada.hora);
      const horas = String(dataTransacao.getHours()).padStart(2, '0');
      const minutos = String(dataTransacao.getMinutes()).padStart(2, '0');

      setVendaEditando({
        transacao_id: vendaSelecionada.id,
        hora: `${horas}:${minutos}`,
        data_original: vendaSelecionada.hora,
        forma_pagamento: vendaSelecionada.forma_pagamento,
        itens: JSON.parse(JSON.stringify(vendaSelecionada.itens)) 
      });
      setItensDeletados([]);
    } else {
      setVendaEditando(null);
    }
  }, [vendaSelecionada]);

  if (!vendaSelecionada || !vendaEditando) return null;

  const confirmarExclusaoVenda = (transacao_id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-black text-gray-800 text-sm text-center">Excluir esta venda INTEIRA?</p>
        <div className="flex gap-2 mt-1">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-black py-2 rounded-lg active:scale-95 transition-colors text-xs uppercase"
          >
            Cancelar
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const loadingId = toast.loading("Apagando venda...");
              try {
                await supabase.from('vendas').delete().eq('transacao_id', transacao_id);
                await buscarVendasDoDia();
                fechar();
                toast.success("Venda excluída com sucesso!", { id: loadingId });
              } catch (error) {
                toast.error("Erro ao excluir venda.", { id: loadingId });
                console.error(error);
              }
            }} 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-lg active:scale-95 transition-colors text-xs uppercase"
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  };

  const atualizarItemVenda = (index, campo, valor) => {
    const novosItens = [...vendaEditando.itens];
    if (campo === 'preco_unitario') {
      const precoNumerico = parseFloat(valor) || 0;
      novosItens[index][campo] = precoNumerico;
      novosItens[index].total_item = novosItens[index].quantidade * precoNumerico;
    } else {
      novosItens[index][campo] = valor.toUpperCase();
    }
    setVendaEditando({ ...vendaEditando, itens: novosItens });
  };

  const recalcularPrecosEditando = (tipo) => {
    const novosItens = vendaEditando.itens.map(item => {
       const prodOriginal = produtos.find(p => p.nome === item.produto_nome) || {};
       const precoBase = prodOriginal.preco || item.preco_unitario; 
       const precoAtacado = prodOriginal.preco_atacado || precoBase;
       
       const novoPreco = tipo === 'ATACADO' ? precoAtacado : precoBase;
       return { ...item, preco_unitario: novoPreco, total_item: novoPreco * item.quantidade };
    });
    setVendaEditando({ ...vendaEditando, itens: novosItens });
    toast.success(`Tudo recalculado para ${tipo}!`);
  };

  const aplicarPrecoATodos = (nomeProduto, preco) => {
    const novosItens = vendaEditando.itens.map(item => {
      if (item.produto_nome === nomeProduto) {
        const precoNum = parseFloat(preco) || 0;
        return { ...item, preco_unitario: precoNum, total_item: precoNum * item.quantidade };
      }
      return item;
    });
    setVendaEditando({ ...vendaEditando, itens: novosItens });
    toast.success(`R$ ${parseFloat(preco).toFixed(2)} aplicado em todos os ${nomeProduto}!`);
  };

  const alterarQtdItem = (index, delta) => {
    const novosItens = [...vendaEditando.itens];
    const novaQtd = novosItens[index].quantidade + delta;
    if (novaQtd > 0) {
      novosItens[index].quantidade = novaQtd;
      novosItens[index].total_item = novaQtd * novosItens[index].preco_unitario;
      setVendaEditando({ ...vendaEditando, itens: novosItens });
    }
  };

  const removerItem = (index) => {
    const novosItens = [...vendaEditando.itens];
    const removido = novosItens.splice(index, 1)[0];
    
    if (!String(removido.id).startsWith('NOVO_')) {
      setItensDeletados([...itensDeletados, removido.id]);
    }
    setVendaEditando({ ...vendaEditando, itens: novosItens });
  };

  const adicionarNovaPeca = () => {
    const baseProduto = vendaEditando.itens[0] || { produto_nome: '', preco_unitario: 0 };
    const novoItem = {
      id: `NOVO_${Date.now()}`, 
      produto_nome: baseProduto.produto_nome,
      produto_cor: '',
      produto_tam: '',
      quantidade: 1,
      preco_unitario: baseProduto.preco_unitario,
      total_item: baseProduto.preco_unitario,
      forma_pagamento: vendaEditando.forma_pagamento
    };
    setVendaEditando({ ...vendaEditando, itens: [...vendaEditando.itens, novoItem] });
  };

  const salvarEdicaoVenda = async () => {
    if (vendaEditando.itens.length === 0) {
      toast.error('A venda não pode ficar vazia. Feche e use o botão de excluir a transação.');
      return;
    }

    const loadingId = toast.loading('Atualizando venda...');

    try {
      const novaData = new Date(vendaEditando.data_original);
      const [horas, minutos] = vendaEditando.hora.split(':');
      novaData.setHours(horas, minutos);

      if (itensDeletados.length > 0) {
        await supabase.from('vendas').delete().in('id', itensDeletados);
      }

      for (const item of vendaEditando.itens) {
        if (String(item.id).startsWith('NOVO_')) {
          const novoRegistro = {
            transacao_id: vendaEditando.transacao_id,
            produto_nome: item.produto_nome.trim().toUpperCase(),
            produto_cor: item.produto_cor.trim().toUpperCase() || 'PENDENTE',
            produto_tam: item.produto_tam.trim().toUpperCase(),
            quantidade: item.quantidade,
            preco_unitario: parseFloat(item.preco_unitario) || 0,
            total_item: item.quantidade * (parseFloat(item.preco_unitario) || 0),
            forma_pagamento: vendaEditando.forma_pagamento,
            created_at: novaData.toISOString()
          };
          await supabase.from('vendas').insert([novoRegistro]);
        } else {
          await supabase.from('vendas')
            .update({
              produto_nome: item.produto_nome.trim().toUpperCase(),
              produto_cor: item.produto_cor.trim().toUpperCase(),
              produto_tam: item.produto_tam.trim().toUpperCase(),
              quantidade: item.quantidade,
              preco_unitario: parseFloat(item.preco_unitario) || 0,
              total_item: item.quantidade * (parseFloat(item.preco_unitario) || 0)
            })
            .eq('id', item.id);
        }
      }

      await supabase.from('vendas')
        .update({ 
          created_at: novaData.toISOString(),
          forma_pagamento: vendaEditando.forma_pagamento 
        })
        .eq('transacao_id', vendaEditando.transacao_id);

      await buscarVendasDoDia();
      fechar();
      toast.success('Venda corrigida com sucesso!', { id: loadingId });

    } catch (error) {
      toast.error('Erro ao editar venda.', { id: loadingId });
      console.error(error);
    }
  };

  const nomesProdutosCadastrados = [...new Set(produtos.map(p => p.nome))].sort();

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 animate-fade-in" onClick={fechar}>
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5 flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0">
          <h3 className="font-black text-gray-800 flex items-center gap-2">✏️ Corrigir Venda</h3>
          <button onClick={fechar} className="bg-gray-200 hover:bg-gray-300 text-gray-600 w-8 h-8 rounded-full font-bold transition-colors">X</button>
        </div>

        <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 shrink-0">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Horário</label>
              <input type="time" className="w-full p-2 border border-gray-300 rounded-lg font-bold mt-1 focus:border-blue-500 outline-none text-center" value={vendaEditando.hora} onChange={e => setVendaEditando({...vendaEditando, hora: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Pagamento</label>
              <select className="w-full p-2 border border-gray-300 rounded-lg font-bold mt-1 focus:border-blue-500 outline-none text-center bg-white" value={vendaEditando.forma_pagamento} onChange={e => setVendaEditando({...vendaEditando, forma_pagamento: e.target.value})}>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARTÃO">Cartão</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 border-b pb-2">
              <p className="text-xs font-black text-gray-800 uppercase">Itens da Venda:</p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase">Recalcular:</span>
                <button onClick={() => recalcularPrecosEditando('VAREJO')} className="text-[9px] bg-blue-100 text-blue-800 px-2 py-1 rounded shadow-sm font-black active:scale-95">VAREJO</button>
                <button onClick={() => recalcularPrecosEditando('ATACADO')} className="text-[9px] bg-amber-100 text-amber-800 px-2 py-1 rounded shadow-sm font-black active:scale-95">ATACADO</button>
              </div>
            </div>

            <div className="space-y-4">
              {vendaEditando.itens.map((item, index) => {
                const variacoesDesteProduto = produtos.filter(p => p.nome === item.produto_nome);
                const coresDoProduto = [...new Set(variacoesDesteProduto.map(p => p.cor))].sort();
                const tamanhosDoProduto = [...new Set(variacoesDesteProduto.map(p => p.tam))];

                return (
                  <div key={item.id} className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm relative">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1 bg-white border border-blue-200 p-1 rounded-lg">
                        <button onClick={() => alterarQtdItem(index, -1)} className="w-6 h-6 rounded flex items-center justify-center text-blue-600 font-black hover:bg-blue-50 active:scale-95">-</button>
                        <span className="font-black text-sm w-5 text-center">{item.quantidade}</span>
                        <button onClick={() => alterarQtdItem(index, 1)} className="w-6 h-6 rounded flex items-center justify-center text-blue-600 font-black hover:bg-blue-50 active:scale-95">+</button>
                      </div>
                      <button onClick={() => removerItem(index)} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest flex items-center gap-1 bg-red-50 px-2 py-1 rounded">🗑️ Remover</button>
                    </div>

                    <div className="mb-2">
                      <label className="text-[9px] font-bold text-blue-600 uppercase">Produto</label>
                      <input type="text" list={`lista-nomes-${index}`} className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none bg-white" value={item.produto_nome} onChange={e => atualizarItemVenda(index, 'produto_nome', e.target.value)} />
                      <datalist id={`lista-nomes-${index}`}>{nomesProdutosCadastrados.map(n => <option key={n} value={n} />)}</datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[9px] font-bold text-blue-600 uppercase">Cor</label>
                        <input type="text" list={`lista-cores-${index}`} placeholder="Ex: AZUL" className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none bg-white" value={item.produto_cor} onChange={e => atualizarItemVenda(index, 'produto_cor', e.target.value)} />
                        <datalist id={`lista-cores-${index}`}>{coresDoProduto.map(c => <option key={c} value={c} />)}</datalist>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-blue-600 uppercase">Tamanho</label>
                        <input type="text" list={`lista-tamanhos-${index}`} className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs uppercase mt-0.5 focus:border-blue-500 outline-none text-center bg-white" value={item.produto_tam} onChange={e => atualizarItemVenda(index, 'produto_tam', e.target.value)} />
                        <datalist id={`lista-tamanhos-${index}`}>{tamanhosDoProduto.map(t => <option key={t} value={t} />)}</datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-blue-100">
                      <div>
                        <label className="text-[9px] font-bold text-blue-600 uppercase">Preço Unit. (R$)</label>
                        <div className="flex gap-1 mt-0.5">
                          <input type="number" className="w-full p-2 border border-blue-200 rounded-lg font-black text-xs focus:border-blue-500 outline-none bg-white text-center" value={item.preco_unitario} onChange={e => atualizarItemVenda(index, 'preco_unitario', e.target.value)} />
                          <button onClick={() => aplicarPrecoATodos(item.produto_nome, item.preco_unitario)} className="bg-blue-600 text-white w-8 rounded-lg flex items-center justify-center active:scale-95 shadow-sm" title="Aplicar este preço a todos os itens iguais">🔄</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-blue-600 uppercase">Subtotal</label>
                        <div className="w-full p-2 rounded-lg font-black text-xs mt-0.5 bg-blue-100 text-blue-900 flex items-center justify-between border border-transparent">
                          <span>R$</span><span>{parseFloat(item.total_item || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={adicionarNovaPeca} className="w-full mt-3 border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 flex justify-center items-center gap-1">➕ Adicionar Peça a esta venda</button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 shrink-0 flex gap-2">
          <button onClick={() => confirmarExclusaoVenda(vendaEditando.transacao_id)} className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-2 border-red-100 w-16 rounded-xl flex items-center justify-center active:scale-95 transition-colors shadow-sm" title="Apagar a Venda Inteira"><span className="text-xl">🗑️</span></button>
          <button onClick={salvarEdicaoVenda} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl active:scale-95 transition-colors uppercase tracking-widest shadow-md">Salvar Correções</button>
        </div>
      </div>
    </div>
  );
}