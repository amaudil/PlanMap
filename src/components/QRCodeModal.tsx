import React from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  title: string;
  vibeEmoji: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  inviteCode,
  title,
  vibeEmoji,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wider font-bold text-[#E07A5F] bg-[#FFF5F2] px-2.5 py-1 rounded-full">
            Invitación Instantánea
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-3xl mb-1">{vibeEmoji}</div>
        <h3 className="font-bold text-[#3D405B] text-lg mb-1 leading-snug">{title}</h3>
        <p className="text-xs text-slate-500 mb-5">
          Tus amigos pueden escanear este código con su cámara para sumarse a la Fogata en vivo.
        </p>

        {/* Dynamic Simulated Stylized QR Code SVG */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border-2 border-dashed border-[#E07A5F]/40 inline-block mb-4 shadow-inner">
          <div className="bg-white p-3 rounded-xl shadow-xs">
            <svg className="w-44 h-44" viewBox="0 0 100 100" fill="currentColor">
              {/* Corner position markers */}
              <rect x="5" y="5" width="25" height="25" rx="3" fill="#3D405B" />
              <rect x="9" y="9" width="17" height="17" rx="2" fill="#FFFFFF" />
              <rect x="13" y="13" width="9" height="9" fill="#E07A5F" />

              <rect x="70" y="5" width="25" height="25" rx="3" fill="#3D405B" />
              <rect x="74" y="9" width="17" height="17" rx="2" fill="#FFFFFF" />
              <rect x="78" y="13" width="9" height="9" fill="#E07A5F" />

              <rect x="5" y="70" width="25" height="25" rx="3" fill="#3D405B" />
              <rect x="9" y="74" width="17" height="17" rx="2" fill="#FFFFFF" />
              <rect x="13" y="78" width="9" height="9" fill="#E07A5F" />

              {/* Data dots pattern */}
              <rect x="35" y="10" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="45" y="10" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="55" y="10" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="35" y="20" width="6" height="6" rx="1.5" fill="#E07A5F" />
              <rect x="48" y="22" width="10" height="5" rx="1.5" fill="#3D405B" />

              <rect x="10" y="38" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="20" y="42" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="35" y="38" width="8" height="8" rx="2" fill="#81B29A" />
              <rect x="48" y="38" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="60" y="38" width="8" height="8" rx="2" fill="#E07A5F" />
              <rect x="75" y="38" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="85" y="42" width="6" height="6" rx="1.5" fill="#3D405B" />

              <rect x="15" y="52" width="10" height="6" rx="1.5" fill="#3D405B" />
              <rect x="35" y="52" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="45" y="50" width="12" height="12" rx="3" fill="#E07A5F" />
              <rect x="65" y="52" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="80" y="52" width="8" height="6" rx="1.5" fill="#81B29A" />

              <rect x="38" y="70" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="48" y="70" width="8" height="6" rx="1.5" fill="#3D405B" />
              <rect x="60" y="70" width="6" height="6" rx="1.5" fill="#3D405B" />
              <rect x="75" y="70" width="8" height="8" rx="2" fill="#E07A5F" />
              <rect x="88" y="75" width="5" height="5" rx="1.5" fill="#3D405B" />

              <rect x="38" y="82" width="12" height="6" rx="1.5" fill="#3D405B" />
              <rect x="55" y="82" width="6" height="6" rx="1.5" fill="#81B29A" />
              <rect x="68" y="82" width="10" height="6" rx="1.5" fill="#3D405B" />
              <rect x="85" y="88" width="8" height="5" rx="1.5" fill="#3D405B" />
            </svg>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-slate-700 truncate mr-2">
            {inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-semibold text-[#E07A5F] hover:text-[#c46147] transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2.5 bg-[#3D405B] hover:bg-[#2e3146] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          {copied ? 'Enlace en portapapeles' : 'Compartir con amigos'}
        </button>
      </div>
    </div>
  );
};
