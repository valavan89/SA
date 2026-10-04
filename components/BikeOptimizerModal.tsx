import React, { useState, useMemo } from 'react';
import { 
  Bike, 
  X, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Search,
  Check,
  Zap
} from 'lucide-react';

export interface CandidateDay {
  id: string;
  date: string;
  dayName: string;
  officesVisited: string;
  bikeKM: number;
  busKM: number;
  gain: number;
  currentMode: string;
  originalAct: any;
}

interface BikeOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateDay[];
  initialSelectedIds: string[];
  recommendedUnderIds: string[];
  recommendedOverIds: string[];
  baselineBusBikeKM: number;
  nonCandidateBikeKM: number;
  targetKM: number;
  monthName: string;
  year: number | string;
  activeProfile: string;
  onApply: (selectedIds: string[], candidates: CandidateDay[]) => void;
  hasBackup: boolean;
  onRestoreBackup: () => void;
}

export const BikeOptimizerModal: React.FC<BikeOptimizerModalProps> = ({
  isOpen,
  onClose,
  candidates,
  initialSelectedIds,
  recommendedUnderIds,
  recommendedOverIds,
  baselineBusBikeKM,
  nonCandidateBikeKM,
  targetKM = 200,
  monthName,
  year,
  activeProfile,
  onApply,
  hasBackup,
  onRestoreBackup
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds || []);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Selected Set for O(1) lookups
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Calculate live total Bike KM based on current user selection
  const liveTotalBikeKM = useMemo(() => {
    const candidateBikeAdditions = candidates.reduce((sum, c) => {
      if (selectedSet.has(c.id)) {
        return sum + c.gain;
      }
      return sum;
    }, 0);
    return Math.round((baselineBusBikeKM + candidateBikeAdditions) * 10) / 10;
  }, [candidates, selectedSet, baselineBusBikeKM]);

  const bikeCount = selectedIds.length;
  const busCount = candidates.length - bikeCount;
  const diffFromTarget = Math.round((liveTotalBikeKM - targetKM) * 10) / 10;
  const isOver = liveTotalBikeKM > targetKM;
  const isExact = liveTotalBikeKM === targetKM;

  const toggleDay = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const setAllBike = () => {
    setSelectedIds(candidates.map(c => c.id));
  };

  const setAllBus = () => {
    setSelectedIds([]);
  };

  const setOptimalUnder = () => {
    setSelectedIds(recommendedUnderIds);
  };

  const setOptimalOver = () => {
    if (recommendedOverIds && recommendedOverIds.length > 0) {
      setSelectedIds(recommendedOverIds);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(c => 
      c.date.includes(q) || 
      c.dayName.toLowerCase().includes(q) || 
      c.officesVisited.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  return (
    <div 
      id="bike-optimizer-modal" 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[92dvh] sm:h-auto sm:max-h-[90dvh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Bike size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  Bike Distance Optimizer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                  Target {targetKM} km
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {monthName} {year} &bull; <strong className="text-slate-700">{activeProfile}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Apply in header for fast mobile tap */}
            <button
              type="button"
              onClick={() => onApply(selectedIds, candidates)}
              className={`sm:hidden px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1 border-0 ${
                isOver 
                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Apply</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Distance Meter & Stats */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                Total Monthly Bike Distance
              </span>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isOver ? 'text-rose-600' : isExact ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {liveTotalBikeKM.toFixed(1)} <span className="text-xs sm:text-sm font-bold text-slate-400">/ {targetKM} km</span>
                </span>
                <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  isOver 
                    ? 'bg-rose-100 text-rose-700' 
                    : isExact 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {isOver 
                    ? `⚠️ Exceeds +${diffFromTarget.toFixed(1)} km` 
                    : isExact 
                      ? '🎯 Exact 200 km Target!' 
                      : `✅ ${(targetKM - liveTotalBikeKM).toFixed(1)} km remaining`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-center">
                <span className="text-[8px] uppercase font-black text-slate-400 block leading-none">Bike Days</span>
                <span className="text-xs sm:text-sm font-black text-blue-600">{bikeCount}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-center">
                <span className="text-[8px] uppercase font-black text-slate-400 block leading-none">Bus Days</span>
                <span className="text-xs sm:text-sm font-black text-slate-600">{busCount}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-300 ${
                isOver ? 'bg-rose-500' : isExact ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (liveTotalBikeKM / targetKM) * 100)}%` }}
            />
          </div>

          {/* Strategy Presets */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-0.5 flex items-center gap-0.5">
              <Zap size={10} className="text-amber-500" /> Presets:
            </span>
            <button
              type="button"
              onClick={setOptimalUnder}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Sparkles size={11} className="text-blue-600" />
              <span>Recommended (≤ 200 km)</span>
            </button>

            {recommendedOverIds && recommendedOverIds.length > 0 && (
              <button
                type="button"
                onClick={setOptimalOver}
                className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <span>Closest Match</span>
              </button>
            )}

            <button
              type="button"
              onClick={setAllBike}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              All Bike
            </button>

            <button
              type="button"
              onClick={setAllBus}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              All Bus
            </button>
          </div>
        </div>

        {/* Candidates Section (Scrollable Middle Area) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 text-left space-y-2 overscroll-contain">
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700">
                Tour Days ({filteredCandidates.length})
              </span>
              <span className="text-[10px] text-slate-400">
                &bull; Click toggle to change mode
              </span>
            </div>

            {candidates.length > 6 && (
              <div className="relative w-36 sm:w-48">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter days..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {filteredCandidates.map(c => {
              const isSelected = selectedSet.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleDay(c.id)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected 
                      ? 'bg-blue-50/60 border-blue-200 shadow-2xs ring-1 ring-blue-500/20' 
                      : 'bg-white border-slate-200/80 hover:bg-slate-50 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isSelected ? <Check size={15} strokeWidth={3} /> : <span className="text-[9px]">BUS</span>}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                          {c.date}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {c.dayName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5 max-w-[200px] sm:max-w-xs">
                        {c.officesVisited || 'Office Visits'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-800 block leading-tight">
                        {c.bikeKM} km
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">
                        {isSelected ? 'Bike Added' : 'Bus Mode'}
                      </span>
                    </div>

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDay(c.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all select-none ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isSelected ? '🚴 Bike' : '🚌 Bus'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {nonCandidateBikeKM > 0 && (
            <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Manual / Baseline Bike:</span>
              <strong className="text-slate-700">{nonCandidateBikeKM.toFixed(1)} km</strong>
            </div>
          )}
        </div>

        {/* Footer Actions - ALWAYS VISIBLE STICKY FOOTER */}
        <div className="shrink-0 sticky bottom-0 z-30 bg-white border-t border-slate-200 p-3 sm:p-4 shadow-xl flex items-center justify-between gap-2.5">
          <div className="shrink-0">
            {hasBackup && (
              <button
                type="button"
                onClick={onRestoreBackup}
                className="px-2.5 sm:px-3.5 py-2 text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Restore days to modes prior to last optimization"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Revert Previous</span>
                <span className="sm:hidden">Revert</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer border-0"
            >
              Cancel
            </button>

            <button
              type="button"
              id="apply-bike-optimization-btn"
              onClick={() => onApply(selectedIds, candidates)}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 border-0 active:scale-95 ${
                isOver 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Apply Plan ({liveTotalBikeKM.toFixed(1)} km)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
