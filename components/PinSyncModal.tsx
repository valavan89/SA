import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { DiaryMetadata } from '../types';

interface PinSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'upload' | 'download';
  metadata: DiaryMetadata;
  activeProfile: string;
  onApplyData: (data: any, mode?: 'overwrite' | 'merge') => void;
}

export const PinSyncModal: React.FC<PinSyncModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'upload',
  metadata,
  activeProfile,
  onApplyData,
}) => {
  const [mode, setMode] = useState<'upload' | 'download'>(initialMode);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPin, setUploadPin] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadedOnRemote, setIsDownloadedOnRemote] = useState(false);

  // Download states
  const [pinInput, setPinInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDownloadError(null);
      setDownloadSuccess(false);
      setIsCopied(false);
      
      if (initialMode === 'upload') {
        performUpload();
      } else {
        setPinInput('');
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, initialMode]);

  // Focus input when switching to download mode
  useEffect(() => {
    if (mode === 'download' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [mode, isOpen]);

  // Perform upload
  const performUpload = async () => {
    setIsUploading(true);
    setUploadError(null);
    setIsDownloadedOnRemote(false);
    
    try {
      // Gather all local storage keys
      const fullStorage: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('diary_')) {
          fullStorage[k] = localStorage.getItem(k) || '';
        }
      }

      const payload = {
        type: 'sa_diary_pin_transfer',
        version: '2.0',
        timestamp: Date.now(),
        activeProfile,
        metadata,
        fullStorage
      };

      const res = await fetch('/api/cloud-sync/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.pin) {
        setUploadPin(data.pin);
      } else {
        throw new Error(data.message || 'Failed to generate PIN.');
      }
    } catch (err: any) {
      console.error('Upload PIN error:', err);
      setUploadError(err.message || 'Failed to upload to cloud. Please check connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Poll for remote download status if PIN is active
  useEffect(() => {
    if (!isOpen || mode !== 'upload' || !uploadPin || isDownloadedOnRemote) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cloud-sync/status/${uploadPin}`);
        const data = await res.json();
        if (data.success && data.downloaded) {
          setIsDownloadedOnRemote(true);
        }
      } catch (e) {
        // status check error ignored
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, mode, uploadPin, isDownloadedOnRemote]);

  // Perform download
  const performDownload = async (pinToUse?: string) => {
    const rawPin = pinToUse || pinInput;
    const cleanPin = rawPin.replace(/\D/g, '').trim();

    if (cleanPin.length !== 6) {
      setDownloadError('Please enter a valid 6-digit PIN number.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/cloud-sync/download/${cleanPin}`);
      const result = await res.json();

      if (result.success && result.data) {
        setDownloadSuccess(true);
        setTimeout(() => {
          onApplyData(result.data, 'overwrite');
          onClose();
        }, 1000);
      } else {
        throw new Error(result.message || 'Invalid or expired 6-digit PIN.');
      }
    } catch (err: any) {
      console.error('Download PIN error:', err);
      setDownloadError(err.message || 'Failed to download data. Please verify the PIN and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPin = () => {
    if (!uploadPin) return;
    navigator.clipboard.writeText(uploadPin);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPinInput(val);
    setDownloadError(null);
    if (val.length === 6) {
      performDownload(val);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white">Cross-Device Sync</h2>
              <p className="text-xs text-slate-400 font-medium">Sync with 6-Digit PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer border-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              if (!uploadPin && !isUploading) performUpload();
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              mode === 'upload'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Upload size={14} />
            <span>Upload (Get PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('download')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border-0 ${
              mode === 'download'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Download size={14} />
            <span>Download (Enter PIN)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {mode === 'upload' ? (
            /* UPLOAD VIEW */
            <div className="space-y-5 text-center">
              {isUploading ? (
                <div className="py-10 space-y-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-black text-slate-800">Uploading Workspace to Cloud...</p>
                  <p className="text-xs text-slate-500 font-medium">Generating your secure 6-digit PIN</p>
                </div>
              ) : uploadError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-center gap-2 text-rose-700 font-bold text-xs">
                    <AlertCircle size={16} />
                    <span>Upload Failed</span>
                  </div>
                  <p className="text-xs text-rose-600">{uploadError}</p>
                  <button
                    onClick={performUpload}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow cursor-pointer border-0"
                  >
                    Retry Upload
                  </button>
                </div>
              ) : uploadPin ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider">
                      <ShieldCheck size={13} />
                      Cloud Upload Active
                    </span>
                    <h3 className="text-sm font-bold text-slate-700 pt-1">
                      Enter this PIN on your other device
                    </h3>
                  </div>

                  {/* 6-Digit Display */}
                  <div className="p-4 bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-inner flex items-center justify-center gap-2 sm:gap-3">
                    {uploadPin.split('').map((digit, idx) => (
                      <div
                        key={idx}
                        className="w-11 h-13 sm:w-12 sm:h-14 bg-slate-800 text-emerald-400 rounded-xl border border-slate-700 flex items-center justify-center text-2xl sm:text-3xl font-black font-mono shadow-sm tracking-wider"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPin}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer border-0"
                    >
                      {isCopied ? <Check size={15} /> : <Copy size={15} />}
                      <span>{isCopied ? 'PIN Copied!' : 'Copy 6-Digit PIN'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={performUpload}
                      title="Upload latest data & refresh PIN"
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer border border-slate-200"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>

                  {/* Remote Status Alert */}
                  {isDownloadedOnRemote ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-emerald-700 animate-fade-in">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Data Downloaded & Synced on other device!</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Open this app on your PC or Mobile, click <strong>Download</strong>, and type <strong>{uploadPin}</strong>.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* DOWNLOAD VIEW */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Enter the 6-digit PIN
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Type the PIN generated on your other device to download and sync your data.
                </p>
              </div>

              {/* PIN Input */}
              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={pinInput}
                  onChange={handlePinChange}
                  disabled={isDownloading || downloadSuccess}
                  className="w-full text-center tracking-[0.6em] text-3xl sm:text-4xl font-mono font-black py-3.5 px-4 bg-slate-50 border-2 border-indigo-300 focus:border-indigo-600 rounded-2xl outline-none transition-all placeholder:text-slate-300 text-slate-900 shadow-inner"
                />
              </div>

              {downloadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{downloadError}</span>
                </div>
              )}

              {downloadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-emerald-700 animate-fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Sync Successful! Applying data...</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => performDownload()}
                disabled={pinInput.length !== 6 || isDownloading || downloadSuccess}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Downloading Data...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Download & Sync</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Active: <strong>{activeProfile || 'Default'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer bg-transparent border-0"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
