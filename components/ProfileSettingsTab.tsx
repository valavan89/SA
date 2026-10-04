import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  Database, 
  Check, 
  Shield, 
  Layers, 
  Sparkles,
  RefreshCw,
  Cloud,
  ArrowLeftRight,
  KeyRound,
  QrCode,
  Smartphone
} from 'lucide-react';
import { getProfileStorageKey } from '../utils/officeHelpers';

interface ProfileSettingsTabProps {
  activeProfile: string;
  profiles: string[];
  onSelectProfile: (profile: string) => void;
  onCreateProfile: (profileName: string) => void;
  onDeleteProfile: (profileName: string) => void;
  onExportAllData: () => void;
  onImportBackupFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPinSync?: (mode?: 'upload' | 'download') => void;
  cloudSyncStatus?: { hasData: boolean; updatedAt: number; device: string | null; profileName: string | null };
  isCloudSyncing?: boolean;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = React.memo(({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onExportAllData,
  onImportBackupFile,
  onOpenPinSync,
  cloudSyncStatus,
  isCloudSyncing = false,
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a profile name');
      return;
    }
    if (profiles.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('A profile with this name already exists');
      return;
    }

    onCreateProfile(trimmed);
    setNewProfileName('');
    setErrorMsg('');
    setSuccessMsg(`Profile "${trimmed}" created and activated successfully!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = (profile: string) => {
    if (profile === 'Default Profile' || profile === 'Karikalvalavan R') {
      setErrorMsg('Default system profile cannot be deleted.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (window.confirm(`Are you sure you want to delete profile "${profile}"? All associated diary, movements, and route records will be permanently removed.`)) {
      onDeleteProfile(profile);
      setSuccessMsg(`Profile "${profile}" removed.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div id="profile-settings-container" className="space-y-8 animate-fade-in text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase">
              <Layers size={14} /> Profile & Multi-User Manager
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              System Profiles & Local Storage
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Manage multiple user workspaces, switch seamlessly between individual official records, and perform complete offline backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPinSync && (
              <>
                <button
                  onClick={() => onOpenPinSync('upload')}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-950/30 cursor-pointer border-0"
                  title="Upload this device's data and get a 6-digit PIN"
                >
                  <Upload size={15} />
                  <span>Upload (PIN)</span>
                </button>

                <button
                  onClick={() => onOpenPinSync('download')}
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-950/30 cursor-pointer border-0"
                  title="Download data using 6-digit PIN"
                >
                  <KeyRound size={15} />
                  <span>Download (PIN)</span>
                </button>
              </>
            )}

            <button
              onClick={onExportAllData}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Download full JSON backup of all profiles and settings"
            >
              <Download size={15} />
              <span>Export File Backup</span>
            </button>

            <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md border border-slate-700">
              <Upload size={15} />
              <span>Restore File</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportBackupFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Profiles List & Create New */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profiles Card List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <User size={18} className="text-indigo-600" />
              Available Workspaces ({profiles.length})
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Active: <span className="text-indigo-600 font-black">{activeProfile}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map(profile => {
              const isActive = profile === activeProfile;
              const isDefault = profile === 'Default Profile' || profile === 'Karikalvalavan R';

              return (
                <div
                  key={profile}
                  className={`p-5 rounded-2xl border transition-all relative ${
                    isActive 
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-md' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm">{profile}</h4>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-wide">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {isDefault ? 'Primary System Workspace' : 'Custom Workspace Profile'}
                      </p>
                    </div>

                    {!isDefault && (
                      <button
                        onClick={() => handleDelete(profile)}
                        className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 border-0 bg-transparent cursor-pointer"
                        title={`Delete profile ${profile}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      Storage Key: <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">{getProfileStorageKey(profile, 'metadata')}</code>
                    </span>
                    {!isActive && (
                      <button
                        onClick={() => onSelectProfile(profile)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        Switch Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Create New Profile */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Plus size={18} className="text-indigo-600" />
              <h3 className="text-base font-black tracking-tight">Create New Profile</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Add a new staff profile to create an independent workspace with separate diaries, tour entries, and route configurations.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Profile / Employee Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand K or Sivaraj S"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all shadow-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Create & Activate
              </button>
            </form>
          </div>

          {/* Mobile ⇄ PC 6-Digit PIN Sync Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-emerald-50/90 border border-indigo-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <KeyRound size={14} />
                </div>
                <span>6-Digit PIN & QR Sync Hub</span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Fast & Private
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Upload your diaries, TA movements, and office distances to get a 6-digit PIN, then enter the PIN on your other device to download instantly.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {onOpenPinSync && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenPinSync('upload')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border-0"
                  >
                    <Upload size={13} />
                    <span>Upload (Get PIN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPinSync('download')}
                    className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border-0"
                  >
                    <Download size={13} />
                    <span>Download (Enter PIN)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Offline Security Card */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
              <Shield size={16} className="text-indigo-500" />
              <span>100% Offline & Private</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              All records, movements, and route matrix distances are stored directly in your browser's local sandbox. No data is ever transmitted to external cloud servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
