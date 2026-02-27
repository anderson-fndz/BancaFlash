import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

import Header from './components/Header';
import Vitrine from './components/Vitrine';
import ModalVariacoes from './components/ModalVariacoes';
import CarrinhoFlutuante from './components/CarrinhoFlutuante';
import GerenciarEstoque from './components/GerenciarEstoque';
import ModalResumoDia from './components/ModalResumoDia';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [carrinho, setCarrinho] = useState([]);
  const [produtoAberto, setProdutoAberto] = useState(null);
  
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
    if (!error) setProdutos(data);
    setCarregando(false);
  };

  const adicionarAoCarrinho = (produto) => {
    const itemNoCarrinho = carrinho.find(item => item.produto.id === produto.id);
    if (itemNoCarrinho && itemNoCarrinho.qtd >= produto.estoque) {
      alert("Estoque limite atingido!"); return;
    }
    if (itemNoCarrinho) {
      setCarrinho(carrinho.map(item => item.produto.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
    } else {
      setCarrinho([...carrinho, { produto, qtd: 1 }]);
    }
  };

  const alterarQuantidadeCarrinho = (produtoId, delta) => {
    setCarrinho(prev => prev.map(item => {
      if (item.produto.id === produtoId) {
        const novaQtd = item.qtd + delta;
        if (novaQtd > item.produto.estoque) { alert("Estoque limite atingido!"); return item; }
        return { ...item, qtd: novaQtd };
      }
      return item;
    }).filter(item => item.qtd > 0));
  };

  const finalizarVenda = async (itensVendidos) => {
    if (itensVendidos.length === 0) return;
    setCarregando(true);

    const registrosVenda = []; 
    // GERA O "NÚMERO DO RECIBO" ÚNICO PARA ESSA COMPRA
    const idTransacao = Date.now().toString(); 

    for (const item of itensVendidos) {
      const novoEstoque = item.estoqueAtual - item.quantidade;
      
      await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
      
      registrosVenda.push({
        transacao_id: idTransacao, // <-- Adiciona o número do recibo aqui!
        produto_id: item.id,
        produto_nome: item.nome,
        produto_cor: item.cor,
        produto_tam: item.tam,
        quantidade: item.quantidade,
        preco_unitario: item.precoVendido,
        total_item: item.quantidade * item.precoVendido
      });
    }

    await supabase.from('vendas').insert(registrosVenda);

    setCarrinho([]);
    setModalCarrinhoAberto(false);
    await buscarProdutos(); 
    setCarregando(false);
    alert("✅ Venda finalizada com sucesso!");
  };

  if (carregando) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Sincronizando Banca... ⏳</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <Header setModalAdminAberto={setModalAdminAberto} setModalResumoAberto={setModalResumoAberto} />
      
      <Vitrine produtos={produtos} setProdutoAberto={setProdutoAberto} />
      
      <ModalVariacoes 
        produtoAberto={produtoAberto} 
        setProdutoAberto={setProdutoAberto} 
        produtos={produtos} 
        carrinho={carrinho} 
        adicionarAoCarrinho={adicionarAoCarrinho} 
        alterarQuantidadeCarrinho={alterarQuantidadeCarrinho} /* <-- Passando a função nova pra cá! */
      />
      
      <CarrinhoFlutuante 
        carrinho={carrinho} 
        modalCarrinhoAberto={modalCarrinhoAberto} 
        setModalCarrinhoAberto={setModalCarrinhoAberto} 
        alterarQuantidadeCarrinho={alterarQuantidadeCarrinho} 
        finalizarVenda={finalizarVenda} 
      />

      <GerenciarEstoque 
        aberto={modalAdminAberto} fechar={() => setModalAdminAberto(false)} 
        produtos={produtos} buscarProdutos={buscarProdutos} 
      />

      <ModalResumoDia 
        aberto={modalResumoAberto} fechar={() => setModalResumoAberto(false)}
        produtos={produtos} 
      />
    </div>
  );
}