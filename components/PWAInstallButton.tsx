import React, { useState } from 'react';
import { Download, Monitor, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  onOpenOfflineModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  onOpenOfflineModal 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, show offline package/installed status button
  if (isInstalled) {
    return (
      <button
        onClick={onOpenOfflineModal}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm ${className}`}
        title="App is running offline in standalone mode. Click for options."
      >
        <CheckCircle2 size={14} className="text-emerald-600" />
        <span>Offline Ready</span>
      </button>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition transform active:scale-95 animate-pulse ${className}`}
        title="Install as offline desktop/mobile application"
      >
        <Download size={14} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-sm ${className}`}
        >
          <Download size={14} />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Monitor size={18} className="text-blue-600" />
                  Install on iPhone / iPad
                </h3>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 text-xs text-slate-600 space-y-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button in the Safari toolbar (square with arrow up).</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-[11px] font-medium">
                  The app icon will appear on your home screen and run 100% offline!
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic fallback if not prompting yet: opens the Offline Package modal
  return (
    <button
      onClick={onOpenOfflineModal}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition shadow-sm ${className}`}
      title="Open Offline Package &amp; Install Options"
    >
      <Download size={14} />
      <span>Offline App</span>
    </button>
  );
};
