import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Settings, Store, Send, Save, Info, ExternalLink } from 'lucide-react'; // ✨ Ícones Premium

export default function Perfil() {
  const [carregando, setCarregando] = useState(false);
  const [perfilId, setPerfilId] = useState(null);
  
  const [nomeLoja, setNomeLoja] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    buscarPerfil();
  }, []);

  const buscarPerfil = async () => {
    setCarregando(true);
    // 👇 AQUI A MÁGICA DE SEGURANÇA: Ele já vai puxar o perfil do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('perfil')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    if (data) {
      setPerfilId(data.id);
      setNomeLoja(data.nome_loja || '');
      setTelegramChatId(data.telegram_chat_id || '');
    }
    setCarregando(false);
  };

  const salvarPerfil = async () => {
    if (!nomeLoja.trim()) {
      toast.error("O nome da loja é obrigatório!");
      return;
    }

    setCarregando(true);
    const loadingId = toast.loading("Salvando configurações...", { style: { background: '#0f172a', color: '#fff' } });
    const { data: { user } } = await supabase.auth.getUser();

    const dados = {
      user_id: user.id, // 🔥 Salvando o dono do perfil
      nome_loja: nomeLoja.toUpperCase(),
      telegram_chat_id: telegramChatId
    };

    try {
      if (perfilId) {
        await supabase.from('perfil').update(dados).eq('id', perfilId);
      } else {
        const { data } = await supabase.from('perfil').insert([dados]).select().single();
        if (data) setPerfilId(data.id);
      }
      
      toast.success("Perfil atualizado!", { id: loadingId });
      window.dispatchEvent(new CustomEvent('perfilAtualizado', { detail: nomeLoja.toUpperCase() }));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar o perfil.", { id: loadingId });
    }
    setCarregando(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-32 md:pb-8 flex flex-col h-full">
      
      {/* ✨ HEADER PREMIUM ✨ */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
          <Settings className="text-blue-600" size={32} /> Configurações da Loja
        </h1>
        <p className="text-slate-500 font-bold mt-1 text-[10px] md:text-xs uppercase tracking-widest">
          Gerencie os dados e integrações da sua banca
        </p>
      </div>

      <div className="space-y-6">
        
        {/* ✨ CARD: DADOS DO NEGÓCIO ✨ */}
        <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="font-black text-sm md:text-base text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-5 border-b border-slate-100 pb-4">
            <Store className="text-slate-400" size={20} /> Dados do Negócio
          </h2>
          
          <div>
            <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">
              <span>Nome da Loja</span>
              <span className="font-normal opacity-70">Aparece no topo</span>
            </label>
            <input 
              type="text" 
              placeholder="Ex: BANCA FLASH" 
              className="w-full p-4 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl font-black uppercase mt-1.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm shadow-sm"
              value={nomeLoja}
              onChange={e => setNomeLoja(e.target.value)}
            />
          </div>
        </div>

        {/* ✨ CARD: INTEGRAÇÃO TELEGRAM ✨ */}
        <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-blue-100 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
            <h2 className="font-black text-sm md:text-base text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Send className="text-blue-500" size={20} /> Notificações via Telegram
            </h2>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-black uppercase px-2.5 py-1 rounded-md tracking-widest shadow-sm">
              Módulo Ativo
            </span>
          </div>
          
          <div className="bg-blue-50/50 p-5 rounded-2xl mb-6 border border-blue-100">
            <h3 className="font-black text-blue-900 text-[11px] md:text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Info size={14} className="text-blue-500" /> Como vincular seu bot de alertas:
            </h3>
            <ol className="list-decimal ml-5 space-y-2 text-xs md:text-sm font-bold text-blue-800/80">
              <li>Mande um "Oi" para o nosso robô oficial: <a href="https://t.me/BancaFlash_Bot" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 flex inline-flex items-center gap-1 transition-colors">@BancaFlash_Bot <ExternalLink size={12} /></a></li>
              <li>Acesse o <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 flex inline-flex items-center gap-1 transition-colors">@userinfobot <ExternalLink size={12} /></a> e pegue o seu <strong className="text-blue-900 bg-blue-100 px-1 rounded">Id</strong> (apenas os números).</li>
              <li>Cole o número aqui embaixo e salve para receber resumos do caixa!</li>
            </ol>
          </div>

          <div>
            <label className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">
              <span>Seu Chat ID</span>
              <span className="font-normal opacity-70">Somente números</span>
            </label>
            <input 
              type="text" 
              placeholder="Ex: 123456789" 
              className="w-full p-4 border border-blue-200 bg-blue-50/30 focus:bg-white rounded-xl font-black mt-1.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-sm shadow-sm text-slate-800"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
            />
          </div>
        </div>

        {/* ✨ BOTÃO DE SALVAR ✨ */}
        <div className="pt-2">
          <button 
            onClick={salvarPerfil} 
            disabled={carregando}
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 md:py-5 rounded-xl active:scale-95 transition-all shadow-xl shadow-slate-900/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {carregando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                SALVANDO...
              </>
            ) : (
              <>
                <Save size={18} /> SALVAR CONFIGURAÇÕES
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}