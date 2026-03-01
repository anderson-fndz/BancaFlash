import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function Header({ setMenuMobileAberto }) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Busca os dados da sessão atual para pegar o e-mail real do dono
    const buscarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email);
    };
    buscarUsuario();
  }, []);

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    // A mágica: o App.jsx já está "escutando" as mudanças de login. 
    // Quando deslogar aqui, o App te joga pra tela de login automaticamente!
  };

  return (
    <header className="bg-white border-b border-gray-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 z-20 shrink-0 shadow-sm">
      
      {/* Esquerda: Botão Menu Mobile e Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuMobileAberto(true)}
          className="md:hidden text-gray-800 text-2xl focus:outline-none active:scale-95 hover:bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
        >
          ☰
        </button>
        <div className="md:hidden flex items-center gap-1">
          <span className="text-xl">⚡</span>
          <span className="font-black text-gray-900 italic tracking-tight">BancaFlash</span>
        </div>
      </div>

      {/* Direita: Perfil Real e Botão de Sair */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sessão Ativa</span>
          <span className="text-xs font-black text-blue-600">{email || 'Carregando...'}</span>
        </div>

        {/* Círculo com a primeira letra do e-mail */}
        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-sm md:text-base border-2 border-white shadow-sm uppercase">
          {email ? email.charAt(0) : '👤'}
        </div>

        <button
          onClick={fazerLogout}
          className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs shadow-sm transition-all border border-red-100 ml-1 active:scale-95"
        >
          Sair
        </button>
      </div>
      
    </header>
  );
}