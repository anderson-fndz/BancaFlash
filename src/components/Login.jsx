import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function Login({ setSessao }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [modoCadastro, setModoCadastro] = useState(false); // Alterna entre Entrar e Criar Conta

  const handleAutenticacao = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const toastId = toast.loading(modoCadastro ? 'Criando sua conta...' : 'Entrando...');

    try {
      if (modoCadastro) {
        // Fluxo de criar nova conta
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: senha,
        });

        if (error) throw error;
        toast.success('Conta criada com sucesso! Bem-vindo ao BancaFlash.', { id: toastId });
        
      } else {
        // Fluxo de entrar na conta existente
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: senha,
        });

        if (error) throw error;
        toast.success('Login aprovado!', { id: toastId });
      }
    } catch (error) {
      toast.error(error.message || 'Erro na autenticação. Verifique os dados.', { id: toastId });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 animate-fade-in border border-gray-100">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform -rotate-3">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">BancaFlash</h1>
          <p className="text-gray-500 font-bold text-sm mt-1">O seu negócio na palma da mão</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAutenticacao} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Seu E-mail</label>
            <input 
              type="email" 
              required
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold text-gray-800"
              placeholder="exemplo@banca.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Sua Senha</label>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold text-gray-800"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {carregando ? 'Aguarde...' : (modoCadastro ? 'Criar minha conta' : 'Acessar Sistema')}
          </button>
        </form>

        {/* Alternar modo */}
        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm font-bold text-gray-500">
            {modoCadastro ? 'Já tem uma conta?' : 'Ainda não usa o BancaFlash?'}
          </p>
          <button 
            onClick={() => setModoCadastro(!modoCadastro)}
            className="text-blue-600 font-black hover:underline mt-1"
          >
            {modoCadastro ? 'Fazer Login' : 'Criar conta grátis'}
          </button>
        </div>

      </div>
    </div>
  );
}