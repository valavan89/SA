import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Smartphone, 
  Monitor, 
  ArrowRight, 
  Check, 
  Copy, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Camera, 
  KeyRound, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Layers,
  Database,
  Calendar,
  Truck,
  FileSpreadsheet,
  Download,
  Upload,
  Cloud,
  ArrowUpDown,
  Lock,
  History,
  Zap,
  ArrowLeftRight
} from 'lucide-react';

interface QRTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'send' | 'receive' | 'paired';
  initialPin?: string | null;
  activeProfile: string;
  profiles: string[];
  metadata: any;
  activities: any;
  movements: any;
  officesDb: any[];
  attachedOffice: string;
  serviceCalls: any[];
  confirmedScrDays?: any;
  scrDefaults?: any;
  onApplyImportedData: (payload: any, mode: 'overwrite' | 'merge') => void;
}

export const QRTransferModal: React.FC<QRTransferModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'send',
  initialPin = null,
  activeProfile,
  profiles,
  metadata,
  activities,
  movements,
  officesDb,
  attachedOffice,
  serviceCalls,
  confirmedScrDays,
  scrDefaults,
  onApplyImportedData
}) => {
  // Navigation tabs: 'send' (Upload), 'receive' (Download), 'paired' (1-Click Cloud Sync Room)
  const [tab, setTab] = useState<'send' | 'receive' | 'paired'>(initialMode);
  const [transferScope, setTransferScope] = useState<'full' | 'active'>('full');
  
  // Detect if current browser is mobile
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMob = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 768;
    setIsMobileDevice(isMob);
  }, []);

  // Send / Upload state
  const [pin, setPin] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopiedPin, setIsCopiedPin] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isDownloadedByClient, setIsDownloadedByClient] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // Receive / Download state
  const [receiveMethod, setReceiveMethod] = useState<'pin' | 'scan' | 'upload'>('pin');
  const [manualPin, setManualPin] = useState(initialPin || '');
  const [isFetchingPin, setIsFetchingPin] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receivedPayload, setReceivedPayload] = useState<any | null>(null);
  const [applyMode, setApplyMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isAppliedSuccess, setIsAppliedSuccess] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [lastUsedPin, setLastUsedPin] = useState<string>('');

  // Camera scanner state
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const pollIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Paired Cloud Sync Room state
  const [pairedEmail, setPairedEmail] = useState<string>(() => localStorage.getItem('sa_paired_sync_email') || '');
  const [pairedPasscode, setPairedPasscode] = useState<string>(() => localStorage.getItem('sa_paired_sync_passcode') || '');
  const [isPairedLoading, setIsPairedLoading] = useState(false);
  const [pairedStatusMsg, setPairedStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cloudAccountData, setCloudAccountData] = useState<{ updatedAt?: number; device?: string; count?: number } | null>(null);

  // Read saved last PIN on mount
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem('sa_last_sync_pin');
      if (savedPin) setLastUsedPin(savedPin);
    } catch (e) {}
  }, []);

  // Reset tab if initialMode changes when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialMode);
      setIsAppliedSuccess(false);
      setReceiveError(null);
      setPairedStatusMsg(null);
      if (initialPin) {
        setTab('receive');
        setReceiveMethod('pin');
        setManualPin(initialPin);
        handleFetchByPin(initialPin);
      } else if (initialMode === 'send' && !pin) {
        generateTransferCode();
      }
    } else {
      stopCamera();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [isOpen, initialMode, initialPin]);

  // Construct current payload based on scope
  const buildPayload = () => {
    const fullStorage: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('diary_')) {
        fullStorage[key] = localStorage.getItem(key) || '';
      }
    }

    return {
      type: "sa_diary_qr_sync",
      version: "2.0",
      scope: transferScope,
      device: isMobileDevice ? "Mobile" : "PC / Desktop",
      createdAt: new Date().toISOString(),
      activeProfile,
      profiles,
      metadata,
      activities,
      movements,
      officesDb,
      attachedOffice,
      serviceCalls,
      confirmedScrDays,
      scrDefaults,
      fullStorage
    };
  };

  // Generate QR & Pin for Upload
  const generateTransferCode = async () => {
    try {
      setIsGenerating(true);
      setIsDownloadedByClient(false);
      const payload = buildPayload();

      const res = await fetch("/api/cloud-sync/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success || !data.pin) {
        throw new Error(data.message || "Failed to generate sync code.");
      }

      const generatedPin = data.pin;
      setPin(generatedPin);
      setLastUsedPin(generatedPin);
      try {
        localStorage.setItem('sa_last_sync_pin', generatedPin);
      } catch (e) {}

      if (data.expiresAt) setExpiresAt(data.expiresAt);

      // Build target sync URL
      const baseUrl = window.location.origin + window.location.pathname;
      const syncUrl = `${baseUrl}?qrPin=${generatedPin}`;

      // Render crisp QR code
      const url = await QRCode.toDataURL(syncUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      setQrDataUrl(url);

      // Start polling for receiver confirmation
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/cloud-sync/status/${generatedPin}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.downloaded) {
              setIsDownloadedByClient(true);
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          }
        } catch (e) {
          // silent error in polling
        }
      }, 2000);

    } catch (err: any) {
      alert("Error uploading data to sync relay: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-generate if scope changes while on send tab
  useEffect(() => {
    if (isOpen && tab === 'send' && pin) {
      generateTransferCode();
    }
  }, [transferScope]);

  // Copy helper
  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setIsCopiedPin(true);
    setTimeout(() => setIsCopiedPin(false), 2500);
  };

  const handleCopyLink = () => {
    if (!pin) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const syncUrl = `${baseUrl}?qrPin=${pin}`;
    navigator.clipboard.writeText(syncUrl);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2500);
  };

  // Fetch payload by PIN
  const handleFetchByPin = async (pinToFetch: string) => {
    const cleanPin = pinToFetch.trim().replace(/\s+/g, "");
    if (!cleanPin || cleanPin.length < 4) {
      setReceiveError("Please enter a valid 6-digit sync PIN.");
      return;
    }

    try {
      setIsFetchingPin(true);
      setReceiveError(null);
      stopCamera();

      const res = await fetch(`/api/cloud-sync/download/${cleanPin}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.message || "Invalid or expired Sync Code.");
      }

      setReceivedPayload(data.data);
      setLastUsedPin(cleanPin);
      try {
        localStorage.setItem('sa_last_sync_pin', cleanPin);
      } catch (e) {}
    } catch (err: any) {
      setReceiveError(err.message || "Failed to download data package.");
    } finally {
      setIsFetchingPin(false);
    }
  };

  // Scanned / decoded text handler (from camera or image file)
  const handleScannedText = (decodedText: string) => {
    if (!decodedText) return;
    try {
      // 1. Check if it's a URL with qrPin parameter
      if (decodedText.includes("qrPin=") || decodedText.includes("importPin=") || decodedText.includes("transferPin=")) {
        const url = new URL(decodedText);
        const pinFromUrl = url.searchParams.get("qrPin") || url.searchParams.get("importPin") || url.searchParams.get("transferPin");
        if (pinFromUrl) {
          setManualPin(pinFromUrl);
          handleFetchByPin(pinFromUrl);
          return;
        }
      }

      // 2. Check if it's a direct 6-digit code
      const clean = decodedText.trim();
      if (/^\d{4,8}$/.test(clean)) {
        setManualPin(clean);
        handleFetchByPin(clean);
        return;
      }

      // 3. Check if it's a raw JSON payload
      const parsed = JSON.parse(decodedText);
      if (parsed && (parsed.type === "sa_diary_qr_sync" || parsed.metadata || parsed.fullStorage)) {
        setReceivedPayload(parsed);
        return;
      }

      setReceiveError("Unrecognized QR Code format. Please scan a valid SA Diary transfer QR code or enter the 6-digit PIN.");
    } catch (e) {
      setReceiveError("Invalid QR Code content. Please enter the 6-digit PIN manually.");
    }
  };

  // File image QR decoder
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDecodingFile(true);
    setReceiveError(null);
    try {
      const html5Qr = new Html5Qrcode("qr-file-decoder-temp");
      const decodedText = await html5Qr.scanFile(file, true);
      handleScannedText(decodedText);
    } catch (err: any) {
      console.warn("File scan error:", err);
      setReceiveError("Could not detect a readable QR code in this image. Please try another photo or enter the 6-digit PIN.");
    } finally {
      setIsDecodingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Camera scanner handling
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5Qr = new Html5Qrcode("qr-reader-container");
      html5QrCodeRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedText(decodedText);
        },
        (_errorMessage) => {
          // ignore transient frame parse errors
        }
      );
      setIsScannerRunning(true);
      try {
        localStorage.setItem("sa_camera_permission_granted", "true");
      } catch (e) {}
    } catch (err: any) {
      console.warn("Camera start warning:", err);
      setCameraError(
        err?.name === "NotAllowedError" || String(err).includes("Permission")
          ? "Camera permission was not granted. You can enter the 6-digit PIN manually or upload a QR image/screenshot."
          : "Unable to access camera. Please enter the 6-digit PIN manually or upload a QR image."
      );
      setIsScannerRunning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Camera stop error:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScannerRunning(false);
  };

  // Apply received data
  const handleApply = () => {
    if (!receivedPayload) return;
    onApplyImportedData(receivedPayload, applyMode);
    setIsAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  // Paired Cloud Sync: 1-Click Upload
  const handlePairedUpload = async () => {
    const email = pairedEmail.trim();
    const passcode = pairedPasscode.trim();
    if (!email || !passcode) {
      setPairedStatusMsg({ type: 'error', text: 'Please enter a Sync Room ID and Passcode to link your devices.' });
      return;
    }

    try {
      setIsPairedLoading(true);
      setPairedStatusMsg(null);

      // Save credentials locally for instant subsequent 1-click sync
      localStorage.setItem('sa_paired_sync_email', email);
      localStorage.setItem('sa_paired_sync_passcode', passcode);

      // First register or login to ensure room exists
      await fetch('/api/web-storage/register-or-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passcode, device: isMobileDevice ? 'Mobile' : 'PC' })
      });

      const payload = buildPayload();
      const saveRes = await fetch('/api/web-storage/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          passcode,
          payload,
          device: isMobileDevice ? 'Mobile' : 'PC',
          force: true
        })
      });

      const saveData = await saveRes.json();
      if (!saveData.success) {
        throw new Error(saveData.message || 'Failed to upload to paired cloud room.');
      }

      setPairedStatusMsg({
        type: 'success',
        text: `⚡ Successfully uploaded from ${isMobileDevice ? 'Mobile' : 'PC'}! Your other device can now download this instantly.`
      });
      setCloudAccountData({
        updatedAt: saveData.updatedAt || Date.now(),
        device: isMobileDevice ? 'Mobile' : 'PC'
      });
    } catch (err: any) {
      setPairedStatusMsg({ type: 'error', text: err.message || 'Upload failed. Check your room credentials.' });
    } finally {
      setIsPairedLoading(false);
    }
  };

  // Paired Cloud Sync: 1-Click Download
  const handlePairedDownload = async () => {
    const email = pairedEmail.trim();
    const passcode = pairedPasscode.trim();
    if (!email || !passcode) {
      setPairedStatusMsg({ type: 'error', text: 'Please enter your Sync Room ID and Passcode.' });
      return;
    }

    try {
      setIsPairedLoading(true);
      setPairedStatusMsg(null);

      localStorage.setItem('sa_paired_sync_email', email);
      localStorage.setItem('sa_paired_sync_passcode', passcode);

      const res = await fetch('/api/web-storage/register-or-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passcode, device: isMobileDevice ? 'Mobile' : 'PC' })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Could not access sync room. Check passcode.');
      }

      if (!data.payload) {
        throw new Error('This sync room is empty. Please upload data from your other device first.');
      }

      setReceivedPayload(data.payload);
      setTab('receive');
      setPairedStatusMsg({
        type: 'success',
        text: `Data package found from ${data.payload.device || 'Other Device'}! Review and tap Apply.`
      });
    } catch (err: any) {
      setPairedStatusMsg({ type: 'error', text: err.message || 'Download failed.' });
    } finally {
      setIsPairedLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Mobile ⇄ PC Sync Hub
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  {isMobileDevice ? <Smartphone size={11} /> : <Monitor size={11} />}
                  <span>This Device: {isMobileDevice ? 'Mobile' : 'PC'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Work simultaneously on Mobile & PC — Upload from one, download onto the other in seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border-0 cursor-pointer"
            title="Close Sync Hub"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Navigation Tabs */}
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200/80 flex items-center justify-center gap-2 shrink-0">
          <button
            onClick={() => {
              setTab('send');
              setReceivedPayload(null);
              if (!pin) generateTransferCode();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              tab === 'send'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Upload size={14} />
            <span>1. Upload ({isMobileDevice ? 'Mobile ➔ Cloud' : 'PC ➔ Cloud'})</span>
          </button>

          <button
            onClick={() => {
              setTab('receive');
              stopCamera();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              tab === 'receive'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Download size={14} />
            <span>2. Download ({isMobileDevice ? 'Cloud ➔ Mobile' : 'Cloud ➔ PC'})</span>
          </button>

          <button
            onClick={() => {
              setTab('paired');
              stopCamera();
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              tab === 'paired'
                ? 'bg-slate-900 text-amber-300 shadow-md'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
            title="1-Click Linked Sync Room"
          >
            <Zap size={14} className={tab === 'paired' ? 'text-amber-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">3. 1-Click Sync Room</span>
            <span className="sm:hidden">1-Click</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-left">
          
          {/* TAB 1: UPLOAD DATA FROM THIS DEVICE */}
          {tab === 'send' && (
            <div className="space-y-6">
              
              {/* Instructions banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Upload size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Ready to Transfer: Upload from {isMobileDevice ? 'Mobile 📱' : 'PC 💻'}
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    Your current diary, travel logs, and office routes are packaged. Use the <strong>6-digit PIN</strong> or <strong>QR Code</strong> below on your {isMobileDevice ? 'PC' : 'Mobile'} to download everything in 1 click.
                  </p>
                </div>
              </div>

              {/* Transfer Scope Selector */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="text-xs font-black text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                    <Layers size={14} className="text-indigo-600" />
                    <span>Package Scope</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    What data to include in this cloud upload
                  </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-200/70 p-1">
                  <button
                    onClick={() => setTransferScope('full')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      transferScope === 'full'
                        ? 'bg-white text-indigo-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Backup (All Profiles & DB)
                  </button>
                  <button
                    onClick={() => setTransferScope('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      transferScope === 'active'
                        ? 'bg-white text-indigo-900 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active Profile Only
                  </button>
                </div>
              </div>

              {/* QR Code & PIN Display Card */}
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                
                {/* Downloaded status notification */}
                {isDownloadedByClient && (
                  <div className="w-full bg-emerald-100 border-2 border-emerald-400 text-emerald-950 p-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black animate-fade-in shadow-md">
                    <CheckCircle2 size={22} className="text-emerald-700 animate-bounce shrink-0" />
                    <span>⚡ Connected! Your {isMobileDevice ? 'PC' : 'Mobile'} has successfully downloaded this data package!</span>
                  </div>
                )}

                {/* 6-Digit PIN Code Box (Primary on all devices) */}
                {pin && (
                  <div className="w-full max-w-md bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-indigo-300">
                        <KeyRound size={14} /> 6-Digit Transfer PIN
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                        Valid for 48 hrs
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-800/90 rounded-2xl p-3 px-5 border border-slate-700 shadow-inner">
                      <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-300 select-all">
                        {pin.slice(0, 3)} {pin.slice(3)}
                      </div>
                      <button
                        onClick={handleCopyPin}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md border-0"
                      >
                        {isCopiedPin ? <Check size={14} /> : <Copy size={14} />}
                        <span>{isCopiedPin ? "Copied!" : "Copy PIN"}</span>
                      </button>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                      <span>Direct Web Sync Link:</span>
                      <button
                        onClick={handleCopyLink}
                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        {isCopiedLink ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopiedLink ? "Link Copied!" : "Copy Full Link"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* QR Canvas Box */}
                <div className="p-4 bg-white rounded-3xl border-2 border-indigo-100 shadow-lg relative group">
                  {isGenerating ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-2xl">
                      <RefreshCw size={28} className="animate-spin text-emerald-600" />
                      <span className="text-xs font-bold text-slate-500">Creating Sync Code...</span>
                    </div>
                  ) : qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="Transfer QR Code" 
                      className="w-56 h-56 rounded-2xl object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                      No QR Generated
                    </div>
                  )}

                  {!isGenerating && qrDataUrl && (
                    <div className="absolute inset-x-0 -bottom-3 flex justify-center">
                      <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1">
                        <Sparkles size={10} className="text-amber-400" /> Scan QR with {isMobileDevice ? 'PC Camera' : 'Phone Camera'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-slate-800">
                  <div className="font-extrabold flex items-center gap-1.5 text-indigo-900">
                    <ArrowRight size={15} className="text-emerald-600" />
                    <span>How to download onto your other device ({isMobileDevice ? 'PC' : 'Mobile'}):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-medium pl-1 text-left text-[11px]">
                    <li>Open SA Diary on your <strong>{isMobileDevice ? 'PC' : 'Mobile Phone'}</strong>.</li>
                    <li>Click <strong>"Mobile ⇄ PC Sync"</strong> at the top and select <strong>"2. Download"</strong>.</li>
                    <li>Type PIN <strong className="font-mono text-indigo-700 text-xs">{pin || '......'}</strong> (or scan the QR code above).</li>
                    <li>Click <strong>"Apply to This Device"</strong> — all your entries will appear immediately!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOWNLOAD DATA INTO THIS DEVICE */}
          {tab === 'receive' && (
            <div className="space-y-6">
              
              {/* If payload is not fetched yet */}
              {!receivedPayload && !isAppliedSuccess && (
                <div className="space-y-5">
                  
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Download size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                        Download into {isMobileDevice ? 'Mobile 📱' : 'PC 💻'}
                      </h4>
                      <p className="text-xs text-indigo-800 font-medium mt-0.5">
                        Enter the 6-digit PIN generated from your {isMobileDevice ? 'PC' : 'Mobile'} to fetch and sync your workspace.
                      </p>
                    </div>
                  </div>

                  {/* Receive Mode Selector */}
                  <div className="flex rounded-2xl bg-slate-100 p-1">
                    <button
                      onClick={() => {
                        stopCamera();
                        setReceiveMethod('pin');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        receiveMethod === 'pin'
                          ? 'bg-white text-indigo-900 shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <KeyRound size={14} /> 6-Digit PIN (Fastest)
                    </button>
                    <button
                      onClick={() => setReceiveMethod('scan')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        receiveMethod === 'scan'
                          ? 'bg-white text-indigo-900 shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Camera size={14} /> Scan Camera
                    </button>
                    <button
                      onClick={() => {
                        stopCamera();
                        setReceiveMethod('upload');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        receiveMethod === 'upload'
                          ? 'bg-white text-indigo-900 shadow-sm font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload size={14} /> QR Image / Photo
                    </button>
                  </div>

                  {/* Hidden file decoder and file input */}
                  <div id="qr-file-decoder-temp" className="hidden" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleScanImageFile}
                    className="hidden"
                  />

                  {/* Manual 6-Digit PIN View (Primary) */}
                  {receiveMethod === 'pin' && (
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                          <KeyRound size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Enter Transfer PIN</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Type the 6 digits displayed on your {isMobileDevice ? 'PC screen' : 'mobile phone'}
                          </p>
                        </div>

                        <div>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 582914"
                            value={manualPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setManualPin(val);
                              if (val.length === 6) {
                                handleFetchByPin(val);
                              }
                            }}
                            className="w-full py-3.5 text-center text-3xl sm:text-4xl font-mono font-black tracking-widest bg-slate-50 border-2 border-indigo-300 rounded-2xl text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
                          />
                        </div>

                        {lastUsedPin && lastUsedPin !== manualPin && (
                          <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
                            <span>Recent Code:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setManualPin(lastUsedPin);
                                handleFetchByPin(lastUsedPin);
                              }}
                              className="font-mono font-bold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 cursor-pointer"
                            >
                              {lastUsedPin}
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleFetchByPin(manualPin)}
                          disabled={isFetchingPin || manualPin.length < 4}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-0"
                        >
                          {isFetchingPin ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" /> Downloading from Cloud...
                            </>
                          ) : (
                            <>
                              <Download size={16} /> Download & Sync Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camera Scanner View */}
                  {receiveMethod === 'scan' && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-indigo-200 flex flex-col items-center justify-center">
                        <div id="qr-reader-container" className="w-full h-full" />
                        
                        {isScannerRunning && (
                          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-pulse pointer-events-none" />
                        )}

                        {!isScannerRunning && !cameraError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center space-y-3 bg-slate-900/95">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                              <Camera size={30} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-100">
                                Real-Time Camera Scanner
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium max-w-xs mt-1">
                                Click below to start scanning the QR code on your PC screen.
                              </p>
                            </div>
                            <button
                              onClick={startCamera}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-all active:scale-95 border-0"
                            >
                              <Camera size={14} />
                              <span>Start Camera Scanner</span>
                            </button>
                          </div>
                        )}

                        {cameraError && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center space-y-3 bg-slate-900/95">
                            <AlertCircle size={36} className="text-rose-400" />
                            <p className="text-xs font-medium text-slate-200 max-w-xs">
                              {cameraError}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setReceiveMethod('pin')}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer border-0"
                              >
                                Enter 6-Digit PIN
                              </button>
                              <button
                                onClick={() => setReceiveMethod('upload')}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer border-0"
                              >
                                Upload Photo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 font-medium text-center max-w-xs">
                        Align the QR code shown on your screen within the frame to sync automatically.
                      </p>
                    </div>
                  )}

                  {/* QR Image File / Photo Upload View */}
                  {receiveMethod === 'upload' && (
                    <div className="space-y-4 max-w-sm mx-auto">
                      <div className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-6 shadow-sm space-y-4 text-center transition-all bg-slate-50/50">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                          <Upload size={26} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Upload QR Image / Photo</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Select a screenshot, photo, or scan from your gallery without needing browser camera permission.
                          </p>
                        </div>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isDecodingFile}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-0"
                        >
                          {isDecodingFile ? (
                            <>
                              <RefreshCw size={15} className="animate-spin" /> Reading QR Photo...
                            </>
                          ) : (
                            <>
                              <Upload size={15} /> Choose Photo from Gallery
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {receiveError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold animate-fade-in shadow-sm">
                      <AlertCircle size={18} className="text-rose-600 shrink-0" />
                      <span>{receiveError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payload Preview & Apply Confirmation */}
              {receivedPayload && !isAppliedSuccess && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900">
                    <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black">Data Package Ready to Apply!</h4>
                      <p className="text-xs text-emerald-700 font-medium">
                        Successfully retrieved workspace payload from {receivedPayload.device || "Other Device"}. Review summary below:
                      </p>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Contents</span>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {receivedPayload.scope === 'active' ? 'Active Profile' : 'Full Backup (All Profiles & DB)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Source Device</span>
                        <span className="font-extrabold text-slate-900 truncate block">
                          {receivedPayload.device || "PC / Mobile"}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Profile / User</span>
                        <span className="font-extrabold text-slate-900 truncate block">
                          {receivedPayload.metadata?.name || receivedPayload.activeProfile || "Staff Member"}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Office Routes</span>
                        <span className="font-extrabold text-slate-900 block">
                          {receivedPayload.officesDb ? receivedPayload.officesDb.length : 0} Benchmark Routes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Apply Mode Option */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Sync Strategy
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setApplyMode('overwrite')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          applyMode === 'overwrite'
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                          <RefreshCw size={14} className="text-emerald-600" />
                          <span>Complete Sync (Recommended)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                          Replaces existing local records with the fresh data from your other device.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setApplyMode('merge')}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          applyMode === 'merge'
                            ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                          <Layers size={14} className="text-indigo-600" />
                          <span>Merge & Combine</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                          Combines records from both devices without deleting unmatched profiles.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReceivedPayload(null)}
                      className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleApply}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-0"
                    >
                      <Check size={16} />
                      <span>Apply & Load Data into This Device</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Success Notification State */}
              {isAppliedSuccess && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-scale-up">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <Check size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Workspace Synced Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium max-w-sm">
                    All diaries, movement logs, and official records have been updated on this device.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 1-CLICK PAIRED CLOUD SYNC ROOM */}
          {tab === 'paired' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <Zap size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">1-Click Continuous Sync Room</h4>
                    <p className="text-xs text-slate-300 font-medium">
                      Set a permanent Room ID and Passcode on both your PC and Mobile. Then simply tap <strong>Upload</strong> or <strong>Download</strong> anytime with zero PINs!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Sync Room ID / Staff Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. valavan-cuddalore"
                      value={pairedEmail}
                      onChange={(e) => setPairedEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Private Room Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. 1234"
                      value={pairedPasscode}
                      onChange={(e) => setPairedPasscode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {pairedStatusMsg && (
                  <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                    pairedStatusMsg.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200'
                      : 'bg-rose-950/80 border border-rose-500 text-rose-200'
                  }`}>
                    {pairedStatusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{pairedStatusMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handlePairedUpload}
                    disabled={isPairedLoading || !pairedEmail || !pairedPasscode}
                    className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-all active:scale-95 border-0"
                  >
                    {isPairedLoading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
                    <span>📤 1-Click Upload ({isMobileDevice ? 'Mobile' : 'PC'})</span>
                  </button>

                  <button
                    onClick={handlePairedDownload}
                    disabled={isPairedLoading || !pairedEmail || !pairedPasscode}
                    className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950 transition-all active:scale-95 border-0"
                  >
                    {isPairedLoading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                    <span>📥 1-Click Download to {isMobileDevice ? 'Mobile' : 'PC'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-slate-700">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>How Continuous Sync works:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  1. Enter the same <strong>Room ID</strong> and <strong>Passcode</strong> on your PC and your Mobile phone once.<br/>
                  2. Whenever you finish working in the field on your Mobile, tap <strong>"1-Click Upload (Mobile)"</strong>.<br/>
                  3. When you open your PC, tap <strong>"1-Click Download to PC"</strong> — you get all your updates instantly without scanning any codes!
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Bi-Directional Mobile ⇄ PC Synchronization</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer border-0"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
