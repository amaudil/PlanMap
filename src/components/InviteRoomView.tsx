import React, { useState } from 'react';
import { X, Copy, Check, QrCode, MapPin, Users, Send, UserPlus, Sparkles, Navigation as NavIcon } from 'lucide-react';
import { PlanExperience, Participant } from '../types';
import { QRCodeModal } from './QRCodeModal';
import { soundManager } from '../utils/audio';

interface InviteRoomViewProps {
  plan: PlanExperience;
  onClose: () => void;
  onGoToMap: () => void;
  onAddParticipant: (participant: Participant) => void;
  userName: string;
}

export const InviteRoomView: React.FC<InviteRoomViewProps> = ({
  plan,
  onClose,
  onGoToMap,
  onAddParticipant,
  userName,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [quickPing, setQuickPing] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: 'Sofía R.', text: '¡Excelente punto de encuentro! Salgo en 5 min.', time: '16:04' },
    { sender: 'Mateo V.', text: 'Llevo apuntes y la laptop con batería completa 💻', time: '16:08' },
  ]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${plan.inviteCode}`);
    setCopied(true);
    soundManager.playChime();
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendPing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPing.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: userName || 'Tú',
        text: quickPing.trim(),
        time: 'Ahora',
      },
    ]);
    setQuickPing('');
  };

  const handleSimulateFriendJoin = () => {
    const friendNames = [
      { name: 'Lucía B.', avatar: '✨', signature: 'Lucía ☕', msg: '¡Me sumo al plan!' },
      { name: 'Daniel K.', avatar: '🚲', signature: 'Dani 🚲', msg: 'En camino pedaleando!' },
      { name: 'Camila P.', avatar: '🌸', signature: 'Cami 🍃', msg: 'Justo andaba cerca con los libros!' },
      { name: 'Andrés G.', avatar: '🕶️', signature: 'Andrés G.', msg: '¡Llegando con buena vibra!' },
    ];
    const picked = friendNames[Math.floor(Math.random() * friendNames.length)];
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;

    const newFriend: Participant = {
      id: `u-${Date.now()}`,
      name: picked.name,
      avatar: picked.avatar,
      role: 'member',
      status: 'on_the_way',
      eta: `${Math.floor(Math.random() * 8) + 3} min`,
      lat: plan.coordinates[0] + offsetLat,
      lng: plan.coordinates[1] + offsetLng,
      lastMessage: picked.msg,
      signature: picked.signature,
    };

    onAddParticipant(newFriend);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: picked.name,
        text: picked.msg,
        time: 'Ahora',
      },
    ]);
    soundManager.playChime();
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Salir</span>
        </button>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Próximo
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#3D405B] tracking-tight">¡Plan Armado! 🔥</h2>
        </div>
        <p className="text-xs text-slate-500 font-medium" id="invite-subtitle">
          Vibe: <span className="font-bold text-[#E07A5F]">{plan.vibe.emoji} {plan.vibe.name}</span> · {plan.time}
        </p>
      </div>

      {/* Shareable Link Card */}
      <div className="card bg-[#FFF5F2] border-2 border-dashed border-[#E07A5F] rounded-2xl p-4 text-center mb-4 shadow-xs">
        <p className="text-xs font-semibold text-slate-500 mb-1">Enlace para compartir con amigos</p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <h3 className="text-base font-bold text-[#E07A5F] font-mono select-all">
            {plan.inviteCode}
          </h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="btn btn-outline flex-1 py-2.5 bg-white border border-[#E07A5F]/40 hover:bg-[#FFF8F6] text-[#E07A5F] font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowQR(true)}
            title="Mostrar código QR"
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs flex items-center justify-center"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="card bg-white rounded-2xl p-4 border border-slate-200/80 mb-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-[#3D405B] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#81B29A]" />
            <span>Participantes confirmados ({plan.participants.length})</span>
          </h4>
          <button
            onClick={handleSimulateFriendJoin}
            title="Simular llegada de amigo"
            className="text-[11px] font-bold text-[#81B29A] hover:text-[#588B74] flex items-center gap-1 bg-[#81B29A]/10 px-2 py-1 rounded-lg transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            <span>+ Invitar amigo</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {plan.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="avatar-btn w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm shadow-xs">
                  {p.avatar}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#2D3748] flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {p.role === 'organizer' && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md">
                        Org
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {p.status === 'arrived' ? (
                      <span className="text-emerald-600 font-semibold">📍 En el punto</span>
                    ) : p.status === 'on_the_way' ? (
                      <span className="text-amber-600 font-medium">🚲 En camino ({p.eta || 'cerca'})</span>
                    ) : (
                      <span>Confirmado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini live pings / chat wall */}
      <div className="card bg-white rounded-2xl p-3.5 border border-slate-200/80 mb-4 shadow-xs">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Tablero de Mensajes Rápidos
        </h4>
        <div className="flex flex-col gap-1.5 mb-2.5 max-h-32 overflow-y-auto pr-1">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className="text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-0.5">
                <span className="font-bold text-slate-700">{msg.sender}</span>
                <span>{msg.time}</span>
              </div>
              <p className="text-slate-600 text-xs">{msg.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendPing} className="flex gap-1.5">
          <input
            type="text"
            value={quickPing}
            onChange={(e) => setQuickPing(e.target.value)}
            placeholder="Escribe un mensaje rápido... ej. Ya guardé mesa!"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#E07A5F]"
          />
          <button
            type="submit"
            className="p-2 bg-[#E07A5F] hover:bg-[#d66f54] text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Location reminder */}
      <div className="flex items-center gap-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl mb-4">
        <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
        <div className="text-xs text-amber-900 leading-tight">
          <span className="font-bold">{plan.locationName}</span> · {plan.address}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mt-auto pt-2 pb-2">
        <button
          onClick={onGoToMap}
          className="btn w-full py-3.5 bg-[#E07A5F] hover:bg-[#d66f54] text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-[#E07A5F]/25 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <NavIcon className="w-4 h-4" />
          <span>Entrar al Mapa Vivo</span>
        </button>
      </div>

      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        inviteCode={plan.inviteCode}
        title={plan.title}
        vibeEmoji={plan.vibe.emoji}
      />
    </div>
  );
};
