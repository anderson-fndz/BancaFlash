import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

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
    const loadingId = toast.loading("Salvando configurações...");
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
    <div className="p-4 md:p-8 animate-fade-in max-w-4xl mx-auto pb-32 md:pb-8 text-left">
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center justify-center md:justify-start gap-2 md:gap-3">
          <span className="text-3xl md:text-4xl">⚙️</span> Configurações da Loja
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <h2 className="font-black text-sm md:text-base text-gray-800 uppercase flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            🏪 Dados do Negócio
          </h2>
          <div>
            <label className="text-[10px] md:text-xs font-bold uppercase text-gray-500">Nome da Loja (Aparece no topo)</label>
            <input 
              type="text" 
              placeholder="Ex: BANCA FLASH" 
              className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:outline-none focus:border-red-400 transition-colors text-sm"
              value={nomeLoja}
              onChange={e => setNomeLoja(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-blue-50 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-blue-100">
          <div className="flex justify-between items-center mb-4 border-b border-blue-200 pb-3">
            <h2 className="font-black text-sm md:text-base text-blue-900 uppercase flex items-center gap-2">
              ✈️ Notificações no Telegram
            </h2>
            <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full">Ativo</span>
          </div>
          
          <div className="bg-white/50 p-4 rounded-xl mb-5 text-[11px] md:text-xs text-blue-800 leading-relaxed border border-blue-200">
            <p className="font-black mb-2 uppercase tracking-wide">Como vincular seu Telegram:</p>
            <ol className="list-decimal ml-4 space-y-1 font-bold">
              <li>Mande um "Oi" para o nosso robô oficial: <a href="https://t.me/BancaFlash_Bot" target="_blank" rel="noreferrer" className="text-blue-600 underline">@BancaFlash_Bot</a></li>
              <li>Acesse o <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-600 underline">@userinfobot</a> e pegue o seu <strong>Id</strong> (apenas os números).</li>
              <li>Cole o número aqui embaixo e salve!</li>
            </ol>
          </div>

          <div>
            <label className="text-[10px] md:text-xs font-bold uppercase text-blue-800">Seu Chat ID (Somente números)</label>
            <input 
              type="text" 
              placeholder="Ex: 123456789" 
              className="w-full p-3 border-2 border-blue-200 rounded-xl font-bold mt-1 focus:outline-none focus:border-blue-500 transition-colors text-sm bg-white"
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={salvarPerfil} 
          disabled={carregando}
          className="w-full bg-gray-800 hover:bg-black text-white font-black py-4 rounded-xl active:scale-95 transition-all shadow-lg uppercase tracking-widest text-sm"
        >
          {carregando ? '⏳ SALVANDO...' : '💾 SALVAR CONFIGURAÇÕES'}
        </button>
      </div>
    </div>
  );
}