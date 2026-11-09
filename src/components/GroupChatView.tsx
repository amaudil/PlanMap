import React, { useState, useRef, useEffect } from 'react';
import { PlanExperience, ChatMessage } from '../types';
import { soundManager } from '../utils/audio';

interface GroupChatViewProps {
  plan: PlanExperience;
  messages: ChatMessage[];
  onSendMessage: (text: string, type?: 'text' | 'status' | 'coordination') => void;
  onBackToDetails?: () => void;
  onCloseRoom: () => void;
}

const QUICK_COORDINATION_TAGS = [
  { label: '📍 Ya llegué al punto', text: '📍 Ya llegué al punto de encuentro. ¡Aquí estoy!' },
  { label: '🚲 En camino (5 min)', text: '🚲 Voy en camino, calculo llegar en unos 5 minutos.' },
  { label: '☕ Mesa reservada', text: '☕ Reservé una buena mesa con enchufes cerca.' },
  { label: '🔌 Traigo multicontacto', text: '🔌 Traigo cargador y regleta por si alguien necesita batería.' },
  { label: '🙋 ¿Alguien falta?', text: '🙋 ¿Quién falta por llegar? Avísennos por acá.' },
];

const EMOJI_REACTIONS = ['📍', '☕', '⚡', '🚲', '👍', '🔥'];

export const GroupChatView: React.FC<GroupChatViewProps> = ({
  plan,
  messages,
  onSendMessage,
  onBackToDetails,
  onCloseRoom,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'text');
    setInputText('');
    soundManager.playChime();
  };

  const handleQuickTagClick = (tagText: string) => {
    onSendMessage(tagText, 'coordination');
    soundManager.playChime();
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none animate-in fade-in duration-200">
      {/* Chat Presence & Context Bar */}
      <div className="bg-[#161A18] rounded-[22px] p-3 mb-3 border border-white/[0.08] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {plan.participants.slice(0, 4).map((p) => (
              <div
                key={p.id}
                title={`${p.name} (${p.status === 'arrived' ? 'En el punto' : 'En camino'})`}
                className="w-7 h-7 rounded-full bg-[#222825] border-2 border-[#161A18] flex items-center justify-center text-xs shadow-xs"
              >
                {p.avatar}
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse"></span>
              <span className="text-xs font-bold text-white truncate">
                {plan.participants.length} participantes coordinando
              </span>
            </div>
            <p className="text-[10px] text-[#8A9590] truncate font-medium">
              📍 {plan.locationName}
            </p>
          </div>
        </div>

        {onBackToDetails && (
          <button
            onClick={onBackToDetails}
            className="text-[11px] font-bold text-[#CCFF00] bg-[#CCFF00]/10 hover:bg-[#CCFF00]/20 px-2.5 py-1 rounded-xl border border-[#CCFF00]/25 transition-colors shrink-0"
          >
            📋 Ver Enlace
          </button>
        )}
      </div>

      {/* Quick Coordination Chips Horizontal Scroller */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
        {QUICK_COORDINATION_TAGS.map((tag, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickTagClick(tag.text)}
            className="text-[11px] font-bold whitespace-nowrap bg-[#161A18] hover:bg-[#202623] hover:border-[#CCFF00]/50 text-[#8A9590] hover:text-white px-3 py-1.5 rounded-full border border-white/[0.08] transition-all active:scale-95 shrink-0"
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px] max-h-[360px] md:max-h-[420px] my-1 rounded-2xl">
        <div className="text-center my-2">
          <span className="text-[10px] font-mono tracking-wider text-[#8A9590] bg-[#161A18] px-3 py-1 rounded-full border border-white/[0.06]">
            HOY · CHAT EN TIEMPO REAL
          </span>
        </div>

        {messages.map((msg) => {
          const isSelf = msg.isSelf || msg.senderName === 'Tú';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} transition-all`}
            >
              <div className="flex items-end gap-1.5 max-w-[85%]">
                {!isSelf && (
                  <div className="w-7 h-7 rounded-full bg-[#222825] border border-white/[0.08] flex items-center justify-center text-xs shrink-0 mb-0.5">
                    {msg.senderAvatar}
                  </div>
                )}

                <div
                  className={`rounded-[20px] p-3 text-xs leading-relaxed shadow-sm transition-all ${
                    isSelf
                      ? 'bg-[#161A18] text-white border border-[#CCFF00]/50 rounded-br-xs'
                      : 'bg-[#161A18] text-[#E8F5E9] border border-white/[0.08] rounded-bl-xs'
                  }`}
                >
                  {!isSelf && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-[11px] text-[#CCFF00]">
                        {msg.senderName}
                      </span>
                    </div>
                  )}

                  <p className="font-medium text-[0.88rem] leading-[1.35] whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8A9590]">
                    <span>{msg.timestamp}</span>
                    {isSelf && <span className="text-[#CCFF00]">✓✓</span>}
                  </div>
                </div>
              </div>

              {msg.reaction && (
                <div
                  className={`text-xs px-2 py-0.5 rounded-full bg-[#0A0C0B] border border-white/[0.1] -mt-1.5 z-10 shadow-xs ${
                    isSelf ? 'mr-3' : 'ml-9'
                  }`}
                >
                  {msg.reaction}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Reactions Toolbar */}
      {showEmojiBar && (
        <div className="flex items-center justify-around bg-[#161A18] p-2 rounded-2xl border border-white/[0.08] mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar Form */}
      <form
        onSubmit={handleSend}
        className="mt-auto pt-2 flex items-center gap-2 shrink-0 bg-[#0A0C0B]"
      >
        <button
          type="button"
          onClick={() => setShowEmojiBar(!showEmojiBar)}
          className={`w-11 h-11 rounded-[16px] flex items-center justify-center text-base border transition-all ${
            showEmojiBar
              ? 'bg-[#CCFF00] text-[#0A0C0B] border-[#CCFF00]'
              : 'bg-[#161A18] text-[#8A9590] hover:text-white border-white/[0.08]'
          }`}
          title="Insertar emoji o reacción rápida"
        >
          ⚡
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe al grupo de coordinación..."
          className="flex-1 p-3.5 rounded-[18px] border border-white/[0.08] bg-[#161A18] text-white text-xs md:text-sm font-semibold outline-none focus:border-[#CCFF00] placeholder:text-[#8A9590] transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`w-11 h-11 rounded-[16px] flex items-center justify-center font-black text-sm border-none cursor-pointer transition-all ${
            inputText.trim()
              ? 'bg-[#CCFF00] hover:bg-[#B5E600] text-[#0A0C0B] shadow-[0_4px_14px_rgba(204,255,0,0.35)] active:scale-95'
              : 'bg-[#161A18] text-[#8A9590] cursor-not-allowed opacity-60'
          }`}
          title="Enviar mensaje"
        >
          →
        </button>
      </form>
    </div>
  );
};
