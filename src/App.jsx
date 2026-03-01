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
import DashboardBI from './components/DashboardBI';

export default function App() {
  // 🔐 ESTADOS DE AUTENTICAÇÃO
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
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  // 🔐 VERIFICAR LOGIN QUANDO O APP ABRE E ESCUTAR MUDANÇAS
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

  // 🛡️ CORREÇÃO ANTI-PISCA: Só busca produtos quando o ID do usuário de fato mudar
  useEffect(() => {
    if (sessao?.user?.id) {
      buscarProdutos();
    }
  }, [sessao?.user?.id]);

  const buscarProdutos = async () => {
    setCarregando(true);
    const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
    if (!error) setProdutos(data);
    setCarregando(false);
  };

  const transferirParaBanca = async (transferencias) => {
    const idsTransf = Object.keys(transferencias);
    if (idsTransf.length === 0) return;
    setCarregando(true);
    for (const id of idsTransf) {
      const qtd = transferencias[id];
      const produto = produtos.find(p => p.id === parseInt(id));
      if (!produto || produto.estoque_saco < qtd) continue;
      const novoEstoqueSaco = produto.estoque_saco - qtd;
      const novoEstoqueBanca = (produto.estoque_banca || 0) + qtd;
      await supabase.from('produtos').update({ estoque_saco: novoEstoqueSaco, estoque_banca: novoEstoqueBanca }).eq('id', id);
    }
    await buscarProdutos();
    setCarregando(false);
    toast.success("Peças transferidas para a Banca com sucesso!");
  };

  const adicionarAoCarrinho = (produto) => {
    const itemNoCarrinho = carrinho.find(item => item.produto.id === produto.id);
    const estoqueTotalDisponivel = (produto.estoque_banca || 0) + (produto.estoque_saco || 0);
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
        const estoqueTotalDisponivel = (item.produto.estoque_banca || 0) + (item.produto.estoque_saco || 0);
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
      
      registrosVenda.push({ 
        transacao_id: idTransacao, 
        produto_id: item.id, 
        produto_nome: item.nome, 
        produto_cor: item.cor, 
        produto_tam: item.tam, 
        quantidade: item.quantidade, 
        preco_unitario: item.precoVendido, 
        total_item: item.quantidade * item.precoVendido,
        forma_pagamento: formaPagamento
      });
    }
    
    await supabase.from('vendas').insert(registrosVenda);
    setCarrinho([]);
    setModalCarrinhoAberto(false);
    await buscarProdutos(); 
    setCarregando(false);
    toast.success("Venda finalizada com sucesso!");
  };

  // 🔐 SE ESTIVER CHECANDO SESSÃO, MOSTRA TELA DE CARREGAMENTO
  if (verificandoSessao) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600 bg-gray-50">Iniciando BancaFlash... ⚡</div>;

  // 🔐 SE NÃO TIVER LOGADO, RENDERIZA SÓ A TELA DE LOGIN
  if (!sessao) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />
        <Login setSessao={setSessao} />
      </>
    );
  }

  // TELA DE CARREGAMENTO DOS PRODUTOS
  if (carregando && produtos.length === 0) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600 bg-gray-50">Sincronizando sua Banca... ⏳</div>;

  // ==========================================
  // O APLICATIVO REAL COMEÇA AQUI
  // ==========================================
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      
      <Toaster position="top-center" reverseOrder={false} containerStyle={{ zIndex: 999999 }} />

      <Sidebar 
        telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva}
        setModalAdminAberto={setModalAdminAberto} setModalResumoAberto={setModalResumoAberto} setModalLocalizadorAberto={setModalLocalizadorAberto}
        menuMobileAberto={menuMobileAberto} setMenuMobileAberto={setMenuMobileAberto}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 md:pt-0">
        
        {/* Header recebe as funções ou estados que precisa (o logout já está lá dentro agora) */}
        <Header setMenuMobileAberto={setMenuMobileAberto} />        
        
        <main className="flex-1 overflow-y-auto relative">
          {telaAtiva === 'PDV' ? (
            <Vitrine produtos={produtos} setProdutoAberto={setProdutoAberto} />
          ) : (
            <DashboardBI />
          )}
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

      <ModalResumoDia 
        aberto={modalResumoAberto} fechar={() => setModalResumoAberto(false)}
        produtos={produtos} 
      />
      
    </div>
  );
}