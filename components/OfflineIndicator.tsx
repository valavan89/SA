import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  operatingMode?: 'online' | 'offline';
  onSwitchMode?: (mode: 'online' | 'offline') => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = () => {
  const isNetworkOnline = useOnlineStatus();

  // If the device is connected to the network, no redundant banner needed
  if (isNetworkOnline) {
    return null;
  }

  return (
    <div 
      id="offline-status-banner"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 px-4 py-2 text-xs font-bold text-white shadow-2xl animate-fade-in border border-amber-500/60 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 text-amber-400">
        <WifiOff size={15} className="animate-pulse" />
        <span>No Internet Connection • Operating locally</span>
      </div>
    </div>
  );
};
