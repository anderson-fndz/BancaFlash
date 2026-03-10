import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import toast, { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Vitrine from './components/Vitrine';
import ModalVariacoes from './components/ModalVariacoes';
import CarrinhoFlutuante from './components/CarrinhoFlutuante';
import GerenciarEstoque from './components/GerenciarEstoque';
import ModalResumoDia from './components/ModalResumoDia';
import LocalizadorEstoque from './components/LocalizadorEstoque';
import ModalReposicao from './components/ModalReposicao';
import ModalConciliacao from './components/ModalConciliacao'; 
import DashboardBI from './components/DashboardBI';
import TelaFinanceiro from './components/TelaFinanceiro';
import Perfil from './components/Perfil';
// ✨ IMPORT DA NOVA TELA AQUI
import TelaRankings from './components/TelaRankings'; 

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [telaAtiva, setTelaAtiva] = useState('PDV'); 
  
  const [carrinho, setCarrinho] = useState([]);
  const [produtoAberto, setProdutoAberto] = useState(null);
  
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);
  const [modalLocalizadorAberto, setModalLocalizadorAberto] = useState(false);
  const [modalReposicaoAberto, setModalReposicaoAberto] = useState(false);
  const [modalConciliacaoAberto, setModalConciliacaoAberto] = useState(false); 
  
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setVerificandoSessao(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessao?.user?.id) {
      setProdutos([]);
      setCarrinho([]);
      buscarProdutos();
    } else {
      setProdutos([]);
      setCarrinho([]);
      setTelaAtiva('PDV');
    }
  }, [sessao?.user?.id]);

  const buscarProdutos = async () => {
    setCarregando(true);
    const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
    if (!error) setProdutos(data);
    setCarregando(false);
  };

  const transferirParaBanca = async (transferencias, direcao = 'SACO_PARA_BANCA') => {
    const idsTransf = Object.keys(transferencias);
    if (idsTransf.length === 0) return;
    setCarregando(true);
    const loadingId = toast.loading("Transferindo...");
    
    try {
      for (const id of idsTransf) {
        const qtd = transferencias[id];
        const produto = produtos.find(p => p.id === parseInt(id) || p.id === id);
        
        if (produto) {
          let novaBanca, novoSaco;
          
          if (direcao === 'SACO_PARA_BANCA') {
            if (produto.estoque_saco < qtd) continue; 
            novaBanca = (produto.estoque_banca || 0) + qtd;
            novoSaco = (produto.estoque_saco || 0) - qtd;
          } else {
            if (produto.estoque_banca < qtd) continue; 
            novaBanca = (produto.estoque_banca || 0) - qtd;
            novoSaco = (produto.estoque_saco || 0) + qtd;
          }

          await supabase.from('produtos').update({ estoque_saco: novoSaco, estoque_banca: novaBanca }).eq('id', id);
        }
      }
      await buscarProdutos();
      setCarregando(false);
      toast.success("Transferência concluída!", { id: loadingId });
    } catch (error) {
      console.error(error);
      toast.error("Erro na transferência.", { id: loadingId });
      setCarregando(false);
    }
  };

  const adicionarAoCarrinho = (produto) => {
    const itemNoCarrinho = carrinho.find(item => item.produto.id === produto.id);
    
    const isGenerico = String(produto.id).startsWith('GEN-');
    const estoqueTotalDisponivel = isGenerico ? 9999 : ((produto.estoque_banca || 0) + (produto.estoque_saco || 0));
    
    if (itemNoCarrinho && itemNoCarrinho.qtd >= estoqueTotalDisponivel) {
      toast.error("Estoque limite atingido (Banca + Estoque)!"); return;
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
        const isGenerico = String(produtoId).startsWith('GEN-');
        const estoqueTotalDisponivel = isGenerico ? 9999 : ((item.produto.estoque_banca || 0) + (item.produto.estoque_saco || 0));
        
        const novaQtd = item.qtd + delta;
        if (novaQtd > estoqueTotalDisponivel) { toast.error("Estoque limite atingido!"); return item; }
        return { ...item, qtd: novaQtd };
      }
      return item;
    }).filter(item => item.qtd > 0));
  };

  const finalizarVenda = async (itensVendidos, formaPagamento) => {
    if (itensVendidos.length === 0) return;
    setCarregando(true);
    const registrosVenda = []; 
    const idTransacao = Date.now().toString(); 
    
    for (const item of itensVendidos) {
      const isGenerico = String(item.id).startsWith('GEN-');

      if (!isGenerico) {
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
        await supabase.from('produtos').update({ estoque_banca: novoEstoqueBanca, estoque_saco: novoEstoqueSaco }).eq('id', item.id);
      }
      
      const registro = { 
        transacao_id: idTransacao, 
        produto_nome: item.nome, 
        produto_cor: isGenerico ? 'PENDENTE' : item.cor, 
        produto_tam: isGenerico ? 'PENDENTE' : item.tam, 
        quantidade: item.quantidade, 
        preco_unitario: item.precoVendido, 
        total_item: item.quantidade * item.precoVendido,
        forma_pagamento: formaPagamento,
        user_id: sessao.user.id
      };

      if (!isGenerico) {
        registro.produto_id = item.id;
      }

      registrosVenda.push(registro);
    }
    
    await supabase.from('vendas').insert(registrosVenda);
    setCarrinho([]);
    setModalCarrinhoAberto(false);
    await buscarProdutos(); 
    setCarregando(false);
    toast.success("Venda finalizada com sucesso!");
  };

  if (verificandoSessao) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600 bg-slate-50">Iniciando BancaFlash... ⚡</div>;

  if (!sessao) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <Login setSessao={setSessao} />
      </>
    );
  }

  if (carregando && produtos.length === 0) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600 bg-slate-50">Sincronizando sua Banca... ⏳</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      <Toaster position="top-center" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />

      <Sidebar 
        telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva}
        setModalAdminAberto={setModalAdminAberto} 
        setModalResumoAberto={setModalResumoAberto} 
        setModalLocalizadorAberto={setModalLocalizadorAberto}
        setModalReposicaoAberto={setModalReposicaoAberto}
        setModalConciliacaoAberto={setModalConciliacaoAberto}
        menuMobileAberto={menuMobileAberto} setMenuMobileAberto={setMenuMobileAberto}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header setMenuMobileAberto={setMenuMobileAberto} setTelaAtiva={setTelaAtiva} />        
        
        <main className="flex-1 overflow-y-auto relative bg-slate-50">
          {/* ✨ ROTEAMENTO DA NOVA TELA AQUI ✨ */}
          {telaAtiva === 'PDV' ? (
            <Vitrine produtos={produtos} setProdutoAberto={setProdutoAberto} />
          ) : telaAtiva === 'BI' ? (
            <DashboardBI />
          ) : telaAtiva === 'RANKING' ? (
            <TelaRankings />
          ) : telaAtiva === 'FINANCEIRO' ? (
            <TelaFinanceiro />
          ) : telaAtiva === 'PERFIL' ? (
            <Perfil />
          ) : null}
        </main>

        {telaAtiva === 'PDV' && (
          <CarrinhoFlutuante 
            carrinho={carrinho} modalCarrinhoAberto={modalCarrinhoAberto} setModalCarrinhoAberto={setModalCarrinhoAberto} 
            alterarQuantidadeCarrinho={alterarQuantidadeCarrinho} finalizarVenda={finalizarVenda} 
          />
        )}
      </div>

      <ModalVariacoes 
        produtoAberto={produtoAberto} setProdutoAberto={setProdutoAberto} 
        produtos={produtos} carrinho={carrinho} adicionarAoCarrinho={adicionarAoCarrinho} alterarQuantidadeCarrinho={alterarQuantidadeCarrinho}
      />
      
      <GerenciarEstoque 
        aberto={modalAdminAberto} fechar={() => setModalAdminAberto(false)} 
        produtos={produtos} buscarProdutos={buscarProdutos} 
      />

      <LocalizadorEstoque 
        aberto={modalLocalizadorAberto} fechar={() => setModalLocalizadorAberto(false)}
        produtos={produtos} transferirParaBanca={transferirParaBanca}
      />

      <ModalReposicao
        aberto={modalReposicaoAberto} fechar={() => setModalReposicaoAberto(false)}
        produtos={produtos} buscarProdutos={buscarProdutos}
      />

      <ModalConciliacao 
        aberto={modalConciliacaoAberto} fechar={() => setModalConciliacaoAberto(false)}
        produtos={produtos} buscarProdutos={buscarProdutos}
      />

      <ModalResumoDia 
        aberto={modalResumoAberto} fechar={() => setModalResumoAberto(false)}
        produtos={produtos} 
      />
      
    </div>
  );
}