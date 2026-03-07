import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';

export default function Header({ setMenuMobileAberto, setTelaAtiva }) {
  const [email, setEmail] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const buscarDados = async () => {
      // Pega o e-mail do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email);

      // Pega o nome da loja no banco de dados
      const { data } = await supabase.from('perfil').select('nome_loja').limit(1).single();
      if (data && data.nome_loja) {
        setNomeLoja(data.nome_loja);
      } else {
        setNomeLoja('MINHA BANCA');
      }
    };
    
    buscarDados();

    // ✨ ESCUTADOR MÁGICO: Atualiza o nome no topo assim que o Perfil salva
    const escutarAtualizacao = (evento) => {
      if (evento.detail) {
        setNomeLoja(evento.detail); // Atualiza o estado local com o valor vindo do evento
      } else {
        buscarDados(); // Fallback caso o evento venha vazio
      }
    };

    window.addEventListener('perfilAtualizado', escutarAtualizacao);

    const handleClickFora = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      window.removeEventListener('perfilAtualizado', escutarAtualizacao);
    };
  }, []);

  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

  const abrirPerfil = () => {
    setTelaAtiva('PERFIL');
    setMenuAberto(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 z-20 shrink-0 shadow-sm relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuMobileAberto(true)}
          className="md:hidden text-gray-800 text-2xl focus:outline-none active:scale-95 hover:bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
        >
          ☰
        </button>
        
        {/* LOGO HOME MOBILE */}
        <div 
          onClick={() => setTelaAtiva('PDV')}
          className="md:hidden flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity active:scale-95"
        >
          <span className="text-xl">⚡</span>
          <span className="font-black text-gray-900 italic tracking-tight">BancaFlash</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto" ref={menuRef}>
        <button 
          onClick={() => setMenuAberto(!menuAberto)}
          className="flex items-center gap-3 group hover:bg-gray-50 px-2 py-1.5 rounded-xl transition-colors active:scale-95 text-left relative"
        >
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{nomeLoja}</span>
            <span className="text-[10px] font-bold text-blue-600 truncate max-w-[150px]">{email || 'Carregando...'}</span>
          </div>

          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-sm md:text-base border-2 border-white shadow-sm uppercase group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {nomeLoja ? nomeLoja.charAt(0) : (email ? email.charAt(0) : '👤')}
          </div>
        </button>

        {menuAberto && (
          <div className="absolute top-14 right-4 md:right-6 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
            <div className="p-3 border-b border-gray-50 bg-gray-50 md:hidden text-left">
               <p className="text-xs font-black text-gray-800">{nomeLoja}</p>
               <p className="text-[10px] font-bold text-gray-500">{email}</p>
            </div>
            
            <button 
              onClick={abrirPerfil}
              className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
            >
              <span>⚙️</span> Configurações da Loja
            </button>
            
            <div className="w-full h-px bg-gray-100"></div>
            
            <button 
              onClick={fazerLogout}
              className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <span>🚪</span> Sair do Sistema
            </button>
          </div>
        )}
      </div>
    </header>
  );
}