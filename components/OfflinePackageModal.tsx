import React, { useState } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  Package, 
  HardDrive, 
  Copy, 
  Check, 
  X, 
  Wifi, 
  WifiOff, 
  Zap, 
  ShieldCheck,
  FolderArchive,
  RefreshCw
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ModeSelector } from './ModeSelector';

interface OfflinePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportAllData?: () => void;
  onImportData?: () => void;
  operatingMode?: 'online' | 'offline';
  onSetOperatingMode?: (mode: 'online' | 'offline') => void;
}

export const OfflinePackageModal: React.FC<OfflinePackageModalProps> = ({
  isOpen,
  onClose,
  onExportAllData,
  onImportData,
  operatingMode = 'online',
  onSetOperatingMode
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwa' | 'desktop' | 'data'>('pwa');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Package size={24} className="text-blue-100" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Offline Package &amp; Standalone App</h2>
              <p className="text-xs text-blue-100 opacity-90">Run 100% offline without internet on PC, Mac, or Mobile</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Network & Operating Mode Selection Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
              operatingMode === 'online' && isOnline 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {operatingMode === 'online' && isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {operatingMode === 'online' ? (isOnline ? 'Online Mode' : 'Online (Offline Detected)') : 'Offline Mode (Local Only)'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-800">
              <ShieldCheck size={14} /> Offline Cache Active
            </span>
          </div>
          {onSetOperatingMode && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-bold text-[11px]">Select Mode:</span>
              <ModeSelector 
                mode={operatingMode} 
                onChange={onSetOperatingMode} 
                size="sm" 
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'pwa'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Monitor size={15} />
            <span>1-Click App Install (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'desktop'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HardDrive size={15} />
            <span>Windows .EXE Package</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'data'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderArchive size={15} />
            <span>Offline Backup File</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg mt-0.5 shadow-sm">
                    <Zap size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-blue-900 text-base">Instant Standalone Installation</h3>
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      Install this web app directly onto your Windows PC, Mac, Android, or iPhone. Once installed, it behaves like a native desktop app: opens in its own window, has its own app icon, works completely offline, and doesn&apos;t require browser address bars.
                    </p>
                  </div>
                </div>
              </div>

              {/* Install Action Card */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    PWA Offline Status: Fully Cached &amp; Ready
                  </div>
                  <p className="text-xs text-slate-500">
                    {isInstalled 
                      ? "You are already using this app in standalone offline mode!" 
                      : isInstallable 
                        ? "Browser supports 1-click installation right now." 
                        : isIOS 
                          ? "Follow iOS Safari installation steps below."
                          : "Installable via Chrome/Edge address bar icon or menu."}
                  </p>
                </div>

                {isInstalled ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs">
                    <CheckCircle2 size={16} /> Installed
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={async () => {
                      const success = await install();
                      if (success) {
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition transform active:scale-95"
                  >
                    <Download size={16} />
                    Install App on Desktop
                  </button>
                ) : (
                  <div className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 px-3 py-2 rounded-xl">
                    Use Browser &ldquo;Install&rdquo; or &ldquo;Add to Home Screen&rdquo;
                  </div>
                )}
              </div>

              {/* Steps for iOS / Chrome / Edge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Monitor size={15} className="text-blue-600" />
                    <span>Chrome / Edge (Windows/Mac)</span>
                  </div>
                  <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
                    <li>Click the <strong>Install</strong> icon in the address bar (top right).</li>
                    <li>Or click <strong>⋮ (Menu) &rarr; Save and share &rarr; Install app</strong>.</li>
                    <li>Launches directly from your Desktop / Start Menu!</li>
                  </ol>
                </div>

                <div className="p-3.5 border border-slate-200 rounded-xl bg-white space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <Smartphone size={15} className="text-emerald-600" />
                    <span>Android / iOS Mobile</span>
                  </div>
                  <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
                    <li><strong>Android:</strong> Tap <strong>⋮ &rarr; Add to Home screen</strong> or &ldquo;Install app&rdquo;.</li>
                    <li><strong>iPhone (Safari):</strong> Tap <strong>Share</strong> button &rarr; <strong>Add to Home Screen</strong>.</li>
                    <li>Works offline anytime on your mobile device.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-400">
                    <HardDrive size={15} />
                    <span>Pre-Configured Electron Executable (.exe)</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Windows 10/11</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This project includes pre-configured Electron packaging scripts and a ready-to-run batch builder (<code className="text-emerald-300 font-mono">DOUBLE_CLICK_TO_CREATE_OFFLINE_EXE.bat</code>) that outputs a single standalone <code className="text-emerald-300 font-mono">.exe</code> file requiring zero internet.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">How to create the standalone .exe file:</h4>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900">Export or Download the project</p>
                      <p className="text-slate-500">In AI Studio, use the Settings menu &rarr; <strong>Export to ZIP</strong> (or clone repo).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <div className="text-xs flex-1">
                      <p className="font-semibold text-slate-900">Double click the builder script</p>
                      <p className="text-slate-500 mb-2">Simply double click this batch file in the exported folder:</p>
                      <div className="bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs flex items-center justify-between">
                        <span>DOUBLE_CLICK_TO_CREATE_OFFLINE_EXE.bat</span>
                        <button
                          onClick={() => copyToClipboard('DOUBLE_CLICK_TO_CREATE_OFFLINE_EXE.bat', 'bat')}
                          className="text-slate-400 hover:text-white p-1"
                          title="Copy filename"
                        >
                          {copiedCmd === 'bat' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                    <div className="text-xs flex-1">
                      <p className="font-semibold text-slate-900">Grab your portable .exe in &ldquo;dist_electron&rdquo;</p>
                      <p className="text-slate-500">
                        Outputs: <strong className="text-slate-800">SA_Diary_Tracker-1.0.0-portable.exe</strong>. Copy it to any USB pendrive or PC!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Zap size={14} /> Quick terminal command:
                  </div>
                  <div className="bg-slate-900 text-amber-200 p-2 rounded-lg font-mono text-xs flex items-center justify-between">
                    <span>npm run make-exe</span>
                    <button
                      onClick={() => copyToClipboard('npm run make-exe', 'cmd')}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy command"
                    >
                      {copiedCmd === 'cmd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <h3 className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                  <FolderArchive size={16} /> Complete Offline Data Backup (.JSON)
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Export all your diary records, TA movements, route matrix, service call reports, and profiles into a portable offline JSON file. You can import this file onto any other computer or browser without internet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <Download size={15} className="text-blue-600" />
                    <span>Export Everything</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Download a single self-contained JSON backup file with all your local data.
                  </p>
                  {onExportAllData && (
                    <button
                      onClick={onExportAllData}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Download size={14} /> Download Backup (.json)
                    </button>
                  )}
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    <RefreshCw size={15} className="text-indigo-600" />
                    <span>Restore / Import Data</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Restore your records from a previously exported offline backup file.
                  </p>
                  {onImportData && (
                    <button
                      onClick={onImportData}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <FolderArchive size={14} /> Restore from File
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Local Storage &amp; IndexedDB caching active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
