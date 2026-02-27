import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

import Header from './components/Header';
import Vitrine from './components/Vitrine';
import ModalVariacoes from './components/ModalVariacoes';
import CarrinhoFlutuante from './components/CarrinhoFlutuante';
import GerenciarEstoque from './components/GerenciarEstoque';
import ModalResumoDia from './components/ModalResumoDia';
import LocalizadorEstoque from './components/LocalizadorEstoque';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [carrinho, setCarrinho] = useState([]);
  const [produtoAberto, setProdutoAberto] = useState(null);
  
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);
  const [modalLocalizadorAberto, setModalLocalizadorAberto] = useState(false);

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
    if (!error) setProdutos(data);
    setCarregando(false);
  };

  // NOVA FUNÇÃO: TRANSFERE VÁRIAS PEÇAS DE UMA VEZ
  const transferirParaBanca = async (transferencias) => {
    const idsTransf = Object.keys(transferencias);
    if (idsTransf.length === 0) return;
    
    setCarregando(true);

    for (const id of idsTransf) {
      const qtd = transferencias[id];
      const produto = produtos.find(p => p.id === parseInt(id));
      
      // Trava de segurança: só transfere se tiver no saco
      if (!produto || produto.estoque_saco < qtd) continue;

      const novoEstoqueSaco = produto.estoque_saco - qtd;
      const novoEstoqueBanca = (produto.estoque_banca || 0) + qtd;

      await supabase.from('produtos').update({ 
        estoque_saco: novoEstoqueSaco, 
        estoque_banca: novoEstoqueBanca 
      }).eq('id', id);
    }

    await buscarProdutos();
    setCarregando(false);
    alert("✅ Peças transferidas para a Banca com sucesso!");
  };

  const adicionarAoCarrinho = (produto) => {
    const itemNoCarrinho = carrinho.find(item => item.produto.id === produto.id);
    const estoqueTotalDisponivel = (produto.estoque_banca || 0) + (produto.estoque_saco || 0);
    
    if (itemNoCarrinho && itemNoCarrinho.qtd >= estoqueTotalDisponivel) {
      alert("Estoque limite atingido (Banca + Estoque)!"); return;
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
        const estoqueTotalDisponivel = (item.produto.estoque_banca || 0) + (item.produto.estoque_saco || 0);
        const novaQtd = item.qtd + delta;
        if (novaQtd > estoqueTotalDisponivel) { alert("Estoque limite atingido!"); return item; }
        return { ...item, qtd: novaQtd };
      }
      return item;
    }).filter(item => item.qtd > 0));
  };

  const finalizarVenda = async (itensVendidos) => {
    if (itensVendidos.length === 0) return;
    setCarregando(true);

    const registrosVenda = []; 
    const idTransacao = Date.now().toString(); 

    for (const item of itensVendidos) {
      let qtdRestanteParaBaixar = item.quantidade;
      let novoEstoqueBanca = item.produtoCompleto.estoque_banca || 0;
      let novoEstoqueSaco = item.produtoCompleto.estoque_saco || 0;

      if (novoEstoqueBanca >= qtdRestanteParaBaixar) {
        novoEstoqueBanca -= qtdRestanteParaBaixar;
      } else {
        qtdRestanteParaBaixar -= novoEstoqueBanca;
        novoEstoqueBanca = 0;
        novoEstoqueSaco -= qtdRestanteParaBaixar;
      }
      
      await supabase.from('produtos').update({ 
        estoque_banca: novoEstoqueBanca, 
        estoque_saco: novoEstoqueSaco 
      }).eq('id', item.id);
      
      registrosVenda.push({
        transacao_id: idTransacao,
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
      <Header 
        setModalAdminAberto={setModalAdminAberto} 
        setModalResumoAberto={setModalResumoAberto} 
        setModalLocalizadorAberto={setModalLocalizadorAberto}
      />
      
      <Vitrine produtos={produtos} setProdutoAberto={setProdutoAberto} />
      
      <ModalVariacoes 
        produtoAberto={produtoAberto} setProdutoAberto={setProdutoAberto} 
        produtos={produtos} carrinho={carrinho} adicionarAoCarrinho={adicionarAoCarrinho} alterarQuantidadeCarrinho={alterarQuantidadeCarrinho}
      />
      
      <CarrinhoFlutuante 
        carrinho={carrinho} modalCarrinhoAberto={modalCarrinhoAberto} setModalCarrinhoAberto={setModalCarrinhoAberto} 
        alterarQuantidadeCarrinho={alterarQuantidadeCarrinho} finalizarVenda={finalizarVenda} 
      />

      <GerenciarEstoque 
        aberto={modalAdminAberto} fechar={() => setModalAdminAberto(false)} 
        produtos={produtos} buscarProdutos={buscarProdutos} 
      />

      <LocalizadorEstoque 
        aberto={modalLocalizadorAberto} fechar={() => setModalLocalizadorAberto(false)}
        produtos={produtos} transferirParaBanca={transferirParaBanca}
      />

      <ModalResumoDia 
        aberto={modalResumoAberto} fechar={() => setModalResumoAberto(false)}
        produtos={produtos} 
      />
    </div>
  );
}