import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ModeSelectorProps {
  mode: 'online' | 'offline';
  onChange: (mode: 'online' | 'offline') => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onChange,
  className = '',
  size = 'md'
}) => {
  const isSm = size === 'sm';

  return (
    <div 
      className={`inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-inner ${className}`}
      role="group"
      aria-label="Operating Mode Selection"
    >
      <button
        type="button"
        id="mode-selector-online"
        onClick={() => onChange('online')}
        title="Online Mode: Cloud PIN Sync & cross-device transfer active"
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer select-none ${
          isSm ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          mode === 'online'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {mode === 'online' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${mode === 'online' ? 'bg-white' : 'bg-emerald-500'}`}></span>
        </span>
        <Wifi size={isSm ? 12 : 14} />
        <span>Online</span>
      </button>

      <button
        type="button"
        id="mode-selector-offline"
        onClick={() => onChange('offline')}
        title="Offline Mode: 100% Local storage, zero internet needed, no cloud calls"
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer select-none ${
          isSm ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          mode === 'offline'
            ? 'bg-amber-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <WifiOff size={isSm ? 12 : 14} />
        <span>Offline</span>
      </button>
    </div>
  );
};
