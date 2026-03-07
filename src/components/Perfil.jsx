import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function Perfil() {
  const [carregando, setCarregando] = useState(false);
  const [perfilId, setPerfilId] = useState(null);
  const [nomeLoja, setNomeLoja] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    buscarPerfil();
  }, []);

  const buscarPerfil = async () => {
    setCarregando(true);
    const { data } = await supabase.from('perfil').select('*').limit(1).single();
    if (data) {
      setPerfilId(data.id);
      setNomeLoja(data.nome_loja || '');
      setTelegramToken(data.telegram_token || '');
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
    const dados = {
      nome_loja: nomeLoja.toUpperCase(),
      telegram_token: telegramToken,
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
      toast.error("Erro ao salvar.", { id: loadingId });
    }
    setCarregando(false);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-4xl mx-auto pb-32 md:pb-8 text-left">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2 md:gap-3">
          <span className="text-3xl md:text-4xl">⚙️</span> Configurações da Loja
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
          <h2 className="font-black text-sm md:text-base text-gray-800 uppercase mb-4 border-b border-gray-100 pb-3">🏪 Dados do Negócio</h2>
          <label className="text-[10px] md:text-xs font-bold uppercase text-gray-500">Nome da Loja</label>
          <input 
            type="text" 
            className="w-full p-3 border-2 border-gray-200 rounded-xl font-black uppercase mt-1 focus:outline-none focus:border-red-400 text-sm"
            value={nomeLoja}
            onChange={e => setNomeLoja(e.target.value)}
          />
        </div>

        <div className="bg-blue-50 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-blue-100">
          <h2 className="font-black text-sm md:text-base text-blue-900 uppercase mb-2">✈️ Notificações no Telegram</h2>
          
          {/* ✨ TEXTO DE AJUDA PARA O CLIENTE ✨ */}
          <div className="bg-white/50 p-3 rounded-lg mb-4 text-[11px] text-blue-800 leading-relaxed border border-blue-200">
            <p><strong>Como configurar?</strong></p>
            <ol className="list-decimal ml-4 mt-1">
              <li>Chame o <a href="https://t.me/botfather" target="_blank" className="underline font-bold">@BotFather</a> no Telegram e crie um robô.</li>
              <li>Cole o <strong>Token</strong> recebido no campo abaixo.</li>
              <li>Crie um grupo, adicione seu robô e use o <a href="https://t.me/userinfobot" target="_blank" className="underline font-bold">@userinfobot</a> para pegar o <strong>Chat ID</strong> do grupo.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] md:text-xs font-bold uppercase text-blue-800">Bot Token</label>
              <input 
                type="password" 
                className="w-full p-3 border-2 border-blue-200 rounded-xl font-bold mt-1 bg-white text-sm"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] md:text-xs font-bold uppercase text-blue-800">Chat ID do Grupo</label>
              <input 
                type="text" 
                className="w-full p-3 border-2 border-blue-200 rounded-xl font-bold mt-1 bg-white text-sm"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button onClick={salvarPerfil} className="w-full bg-gray-800 hover:bg-black text-white font-black py-4 rounded-xl active:scale-95 shadow-lg uppercase text-sm">
          💾 SALVAR CONFIGURAÇÕES
        </button>
      </div>
    </div>
  );
}