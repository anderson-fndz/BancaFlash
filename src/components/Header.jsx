import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Menu, Zap, Settings, LogOut, ChevronDown, User } from 'lucide-react';

export default function Header({ setMenuMobileAberto, setTelaAtiva }) {
  const [email, setEmail] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const buscarDados = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email);

      const { data } = await supabase.from('perfil').select('nome_loja').limit(1).single();
      if (data && data.nome_loja) {
        setNomeLoja(data.nome_loja);
      } else {
        setNomeLoja('MINHA BANCA');
      }
    };
    
    buscarDados();

    const escutarAtualizacao = (evento) => {
      if (evento.detail) {
        setNomeLoja(evento.detail);
      } else {
        buscarDados();
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
    <header className="bg-white border-b border-gray-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 z-20 shrink-0 shadow-sm relative transition-colors duration-300">
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuMobileAberto(true)}
          className="md:hidden text-gray-500 focus:outline-none active:scale-95 hover:bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
        >
          <Menu size={24} strokeWidth={2.5} />
        </button>
        
        <div 
          onClick={() => setTelaAtiva('PDV')}
          className="md:hidden flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity active:scale-95"
        >
          <div className="bg-gradient-to-br from-orange-400 to-red-500 p-1 rounded-md shadow-sm">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="font-black text-slate-900 italic tracking-tight text-lg">BancaFlash</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto" ref={menuRef}>
        <button 
          onClick={() => setMenuAberto(!menuAberto)}
          className="flex items-center gap-2 group hover:bg-slate-50 p-1.5 pr-2 rounded-xl transition-all active:scale-95 text-left relative border border-transparent hover:border-slate-200"
        >
          <div className="hidden md:flex flex-col items-end mr-1">
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest leading-tight">{nomeLoja}</span>
            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px] leading-tight mt-0.5">{email || 'Carregando...'}</span>
          </div>

          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full flex items-center justify-center font-black text-sm md:text-base shadow-md shadow-blue-900/20 uppercase transition-transform group-hover:scale-105">
            {nomeLoja ? nomeLoja.charAt(0) : (email ? email.charAt(0) : <User size={18} />)}
          </div>
          
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 hidden md:block ${menuAberto ? 'rotate-180' : ''}`} />
        </button>

        {menuAberto && (
          <div className="absolute top-14 right-4 md:right-6 w-60 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-fade-in z-50">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 md:hidden text-left">
               <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{nomeLoja}</p>
               <p className="text-[10px] font-bold text-slate-500 mt-0.5">{email}</p>
            </div>
            
            <div className="p-2">
              <button 
                onClick={abrirPerfil}
                className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors flex items-center gap-3"
              >
                <Settings size={18} className="text-slate-400" />
                Configurações da Loja
              </button>
              
              <div className="w-full h-px bg-slate-100 my-1"></div>
              
              <button 
                onClick={fazerLogout}
                className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
              >
                <LogOut size={18} className="text-red-400" />
                Sair do Sistema
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}