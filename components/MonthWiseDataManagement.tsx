import React, { useState, useMemo } from 'react';
import { Trash2, Calendar, CheckSquare, Square, AlertCircle, Sparkles, Check, ChevronDown, Clock, FileText, Navigation } from 'lucide-react';
import { ActivityEntry, MovementEntry, ServiceCallReport } from '../types';
import { normalizeDateStr } from '../utils/dateUtils';

interface MonthWiseDataManagementProps {
  activities: ActivityEntry[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityEntry[]>>;
  movements: MovementEntry[];
  setMovements: React.Dispatch<React.SetStateAction<MovementEntry[]>>;
  serviceCalls: ServiceCallReport[];
  setServiceCalls: React.Dispatch<React.SetStateAction<ServiceCallReport[]>>;
  confirmedScrDays: Record<string, boolean>;
  setConfirmedScrDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  activeProfile: string;
  currentMonth: number; // 0-11
  currentYear: number;
  getProfileStorageKey: (profileName: string, suffixKey: string) => string;
  setConfirmModal: (modal: {
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    accentColor?: 'blue' | 'rose' | 'emerald';
  } | null) => void;
  onMonthDeleted?: (monthStr: string) => void;
}

export interface MonthDataSummary {
  mY: string; // "MM.YYYY", e.g. "06.2026"
  monthName: string; // e.g. "June 2026"
  month: number; // 0-11
  year: number;
  activitiesCount: number;
  movementsCount: number;
  serviceCallsCount: number;
  isCurrentMonth: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MonthWiseDataManagement: React.FC<MonthWiseDataManagementProps> = ({
  activities,
  setActivities,
  movements,
  setMovements,
  serviceCalls,
  setServiceCalls,
  confirmedScrDays,
  setConfirmedScrDays,
  activeProfile,
  currentMonth,
  currentYear,
  getProfileStorageKey,
  setConfirmModal,
  onMonthDeleted,
}) => {
  const currentMY = `${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;

  // Calculate all months containing entered data for active profile
  const allMonthsWithData = useMemo<MonthDataSummary[]>(() => {
    const map = new Map<string, MonthDataSummary>();

    const getOrInit = (mY: string): MonthDataSummary => {
      if (!map.has(mY)) {
        const parts = mY.split('.');
        const m = parseInt(parts[0], 10) - 1;
        const y = parseInt(parts[1], 10);
        const name = `${MONTH_NAMES[m] || 'Month'} ${y}`;
        map.set(mY, {
          mY,
          monthName: name,
          month: m,
          year: y,
          activitiesCount: 0,
          movementsCount: 0,
          serviceCallsCount: 0,
          isCurrentMonth: mY === currentMY,
        });
      }
      return map.get(mY)!;
    };

    activities.forEach(act => {
      if (!act?.date) return;
      const parts = act.date.split('.');
      if (parts.length === 3) {
        const mY = `${parts[1]}.${parts[2]}`;
        getOrInit(mY).activitiesCount++;
      }
    });

    movements.forEach(m => {
      if (!m?.date) return;
      const parts = m.date.split('.');
      if (parts.length === 3) {
        const mY = `${parts[1]}.${parts[2]}`;
        getOrInit(mY).movementsCount++;
      }
    });

    serviceCalls.forEach(sc => {
      if (!sc?.date) return;
      const norm = normalizeDateStr(sc.date);
      const parts = norm.split('.');
      if (parts.length === 3) {
        const mY = `${parts[1]}.${parts[2]}`;
        getOrInit(mY).serviceCallsCount++;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [activities, movements, serviceCalls, currentMY]);

  const previousMonthsWithData = useMemo(() => {
    return allMonthsWithData.filter(m => !m.isCurrentMonth);
  }, [allMonthsWithData]);

  // Selected month for deletion
  const [selectedMY, setSelectedMY] = useState<string>(() => {
    if (previousMonthsWithData.length > 0) {
      return previousMonthsWithData[0].mY;
    }
    // Fallback to previous calendar month
    let prevM = currentMonth - 1;
    let prevY = currentYear;
    if (prevM < 0) {
      prevM = 11;
      prevY -= 1;
    }
    return `${String(prevM + 1).padStart(2, '0')}.${prevY}`;
  });

  // Keep selectedMY valid if list updates
  React.useEffect(() => {
    if (previousMonthsWithData.length > 0 && !previousMonthsWithData.some(m => m.mY === selectedMY)) {
      setSelectedMY(previousMonthsWithData[0].mY);
    }
  }, [previousMonthsWithData, selectedMY]);

  // Custom picker state (for choosing any past or specific month/year)
  const [customMonth, setCustomMonth] = useState<number>(currentMonth === 0 ? 11 : currentMonth - 1);
  const [customYear, setCustomYear] = useState<number>(currentMonth === 0 ? currentYear - 1 : currentYear);

  // Scopes to delete
  const [scopeDiary, setScopeDiary] = useState(true);
  const [scopeMovements, setScopeMovements] = useState(true);
  const [scopeScr, setScopeScr] = useState(true);

  // Stats for currently selected month
  const selectedStats = useMemo(() => {
    const found = allMonthsWithData.find(m => m.mY === selectedMY);
    if (found) return found;

    const parts = selectedMY.split('.');
    const m = parts.length === 2 ? parseInt(parts[0], 10) - 1 : 0;
    const y = parts.length === 2 ? parseInt(parts[1], 10) : currentYear;
    return {
      mY: selectedMY,
      monthName: `${MONTH_NAMES[m] || 'Month'} ${y}`,
      month: m,
      year: y,
      activitiesCount: 0,
      movementsCount: 0,
      serviceCallsCount: 0,
      isCurrentMonth: selectedMY === currentMY,
    };
  }, [allMonthsWithData, selectedMY, currentMY, currentYear]);

  // Function to execute the deletion of a specific month
  const executeMonthDeletion = (targetMY: string, scope = { diary: true, movements: true, scr: true }) => {
    if (!targetMY) return;
    const parts = targetMY.split('.');
    if (parts.length !== 2) return;
    const [targetMStr, targetYStr] = parts;

    let removedActs = 0;
    let removedMoves = 0;
    let removedScs = 0;

    let nextActs = activities;
    let nextMoves = movements;
    let nextScs = serviceCalls;
    let nextConf = { ...confirmedScrDays };

    if (scope.diary) {
      nextActs = activities.filter(act => {
        if (!act?.date) return false;
        const p = act.date.split('.');
        const matches = p.length === 3 && p[1] === targetMStr && p[2] === targetYStr;
        if (matches) removedActs++;
        return !matches;
      });
      setActivities(nextActs);
      const keyActs = getProfileStorageKey(activeProfile, "activities");
      localStorage.setItem(keyActs, JSON.stringify(nextActs));
    }

    if (scope.movements) {
      nextMoves = movements.filter(m => {
        if (!m?.date) return false;
        const p = m.date.split('.');
        const matches = p.length === 3 && p[1] === targetMStr && p[2] === targetYStr;
        if (matches) removedMoves++;
        return !matches;
      });
      setMovements(nextMoves);
      const keyMoves = getProfileStorageKey(activeProfile, "movements");
      localStorage.setItem(keyMoves, JSON.stringify(nextMoves));
    }

    if (scope.scr) {
      nextScs = serviceCalls.filter(sc => {
        if (!sc?.date) return false;
        const norm = normalizeDateStr(sc.date);
        const p = norm.split('.');
        const matches = p.length === 3 && p[1] === targetMStr && p[2] === targetYStr;
        if (matches) removedScs++;
        return !matches;
      });
      setServiceCalls(nextScs);
      const keyScs = getProfileStorageKey(activeProfile, "service_calls");
      localStorage.setItem(keyScs, JSON.stringify(nextScs));

      Object.keys(nextConf).forEach(dateStr => {
        const p = dateStr.split('.');
        if (p.length === 3 && p[1] === targetMStr && p[2] === targetYStr) {
          delete nextConf[dateStr];
        }
      });
      setConfirmedScrDays(nextConf);
      const keyConf = getProfileStorageKey(activeProfile, "confirmed_scr_days");
      localStorage.setItem(keyConf, JSON.stringify(nextConf));
    }

    if (onMonthDeleted) {
      onMonthDeleted(targetMY);
    }

    const monthNum = parseInt(targetMStr, 10) - 1;
    const mName = `${MONTH_NAMES[monthNum] || 'Month'} ${targetYStr}`;

    setConfirmModal({
      title: "Data Cleared Successfully",
      message: `Removed ${removedActs} work diary entries, ${removedMoves} transit movements, and ${removedScs} service call reports for ${mName}.`,
      confirmText: "Done",
      accentColor: "emerald",
      onConfirm: () => setConfirmModal(null)
    });
  };

  // Prompt confirmation before deleting
  const promptDeleteMonth = (targetStats: MonthDataSummary) => {
    const totalCount = 
      (scopeDiary ? targetStats.activitiesCount : 0) +
      (scopeMovements ? targetStats.movementsCount : 0) +
      (scopeScr ? targetStats.serviceCallsCount : 0);

    const isCurrent = targetStats.isCurrentMonth;

    setConfirmModal({
      title: `Delete Entered Data for ${targetStats.monthName}?`,
      message: `Are you sure you want to permanently delete entered data for ${targetStats.monthName}?\n\nTarget Items:\n• ${scopeDiary ? `${targetStats.activitiesCount} Work Diary Entries` : 'Work Diary: (Skipped)'}\n• ${scopeMovements ? `${targetStats.movementsCount} Movement Rows` : 'Movements: (Skipped)'}\n• ${scopeScr ? `${targetStats.serviceCallsCount} Service Call Reports` : 'SCR: (Skipped)'}\n\n${isCurrent ? '⚠️ Note: This is your currently active month.' : 'This will not affect your office database or other months.'}`,
      confirmText: `Yes, Delete ${targetStats.monthName} Data`,
      cancelText: "Cancel",
      accentColor: "rose",
      onConfirm: () => {
        setConfirmModal(null);
        executeMonthDeletion(targetStats.mY, {
          diary: scopeDiary,
          movements: scopeMovements,
          scr: scopeScr
        });
      }
    });
  };

  return (
    <div id="month-wise-data-management-section" className="p-8 border-b border-slate-200/80 bg-slate-50/40">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5 text-left">
            <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-md shadow-rose-200 shrink-0">
              <Trash2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Month-Wise Entered Data Deletion
                </h3>
                <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-100">
                  Data Cleanup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Select and delete previous month entered data (work diary entries, transit movements, and SCR reports) month wise for profile <span className="text-slate-700 font-bold">"{activeProfile}"</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Panel: Select Month & Delete Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Selectors & Scopes */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                1. Select Target Previous Month:
              </label>
              
              {/* Previous Months Dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <select
                    id="select-previous-month-dropdown"
                    value={selectedMY}
                    onChange={(e) => setSelectedMY(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wide text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all cursor-pointer appearance-none"
                  >
                    {previousMonthsWithData.length > 0 ? (
                      previousMonthsWithData.map(m => (
                        <option key={m.mY} value={m.mY}>
                          📅 {m.monthName} ({m.activitiesCount} days, {m.movementsCount} moves, {m.serviceCallsCount} SCRs)
                        </option>
                      ))
                    ) : (
                      <option value={selectedMY}>
                        📅 {selectedStats.monthName} (No saved records)
                      </option>
                    )}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={15} />
                  </div>
                </div>

                {/* Explicit "Select Month" button */}
                <button
                  type="button"
                  id="btn-select-chosen-month"
                  onClick={() => {
                    // Confirmation/Focus feedback
                    const el = document.getElementById(`month-card-${selectedMY}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                  className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  title="Confirm selection of this month"
                >
                  <Check size={14} />
                  <span>Select Month</span>
                </button>
              </div>
            </div>

            {/* Custom Calendar Month Picker (if user wants any arbitrary month) */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Or pick custom month:</span>
              <div className="flex items-center gap-2">
                <select
                  id="custom-month-selector"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  id="custom-year-selector"
                  value={customYear}
                  onChange={(e) => setCustomYear(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  type="button"
                  id="btn-select-custom-month"
                  onClick={() => {
                    const myStr = `${String(customMonth + 1).padStart(2, '0')}.${customYear}`;
                    setSelectedMY(myStr);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Select & Load
                </button>
              </div>
            </div>

            {/* Granular Scope Checkboxes */}
            <div className="pt-2 space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                2. Select What to Delete:
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  id="toggle-scope-diary"
                  onClick={() => setScopeDiary(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    scopeDiary ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {scopeDiary ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>Work Diary Activities ({selectedStats.activitiesCount})</span>
                </button>

                <button
                  type="button"
                  id="toggle-scope-movements"
                  onClick={() => setScopeMovements(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    scopeMovements ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {scopeMovements ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>Travel Movements ({selectedStats.movementsCount})</span>
                </button>

                <button
                  type="button"
                  id="toggle-scope-scr"
                  onClick={() => setScopeScr(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    scopeScr ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {scopeScr ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>SCR Reports ({selectedStats.serviceCallsCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Selected Month Summary & Delete Button */}
          <div className="lg:col-span-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Selected Month Target
              </span>
              {selectedStats.isCurrentMonth ? (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-wide">
                  Active Month
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-wide">
                  Previous Month
                </span>
              )}
            </div>

            <div>
              <div className="text-lg font-black text-slate-800">
                {selectedStats.monthName}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                Key ID: {selectedStats.mY}
              </div>
            </div>

            {/* Counts breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-base font-black text-slate-700">{selectedStats.activitiesCount}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Diary Days</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-base font-black text-slate-700">{selectedStats.movementsCount}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Movements</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-base font-black text-slate-700">{selectedStats.serviceCallsCount}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SCRs</div>
              </div>
            </div>

            {/* Main Delete Button */}
            <button
              type="button"
              id="btn-delete-selected-month-data"
              onClick={() => promptDeleteMonth(selectedStats)}
              disabled={!scopeDiary && !scopeMovements && !scopeScr}
              className={`w-full py-3.5 px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-0 shadow-md ${
                (!scopeDiary && !scopeMovements && !scopeScr)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 cursor-pointer active:scale-98'
              }`}
              title={`Permanently delete entered data for ${selectedStats.monthName}`}
            >
              <Trash2 size={16} />
              <span>Delete {selectedStats.monthName} Entered Data</span>
            </button>
          </div>
        </div>

        {/* Previous Months With Entered Data Table / List */}
        <div className="pt-6 border-t border-slate-100 text-left space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span>All Detected Previous Months with Data ({previousMonthsWithData.length})</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              Select or Delete month wise directly below
            </span>
          </div>

          {previousMonthsWithData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {previousMonthsWithData.map(m => {
                const isSelected = m.mY === selectedMY;
                return (
                  <div
                    key={m.mY}
                    id={`month-card-${m.mY}`}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-400/20 shadow-sm'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          {m.monthName}
                          {isSelected && (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[9px] font-extrabold uppercase">
                              Active Target
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileText size={11} className="text-slate-400" /> {m.activitiesCount} Diary
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Navigation size={11} className="text-slate-400" /> {m.movementsCount} Moves
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" /> {m.serviceCallsCount} SCR
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Select & Delete */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        id={`btn-select-month-${m.mY}`}
                        onClick={() => setSelectedMY(m.mY)}
                        className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={`Select ${m.monthName}`}
                      >
                        <Check size={12} />
                        <span>{isSelected ? 'Selected' : 'Select'}</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-delete-month-${m.mY}`}
                        onClick={() => {
                          setSelectedMY(m.mY);
                          promptDeleteMonth(m);
                        }}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                        title={`Delete ${m.monthName} data immediately`}
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-semibold">
                No previous month entered data was detected for <span className="font-bold">"{activeProfile}"</span>.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Only the current month ({MONTH_NAMES[currentMonth]} {currentYear}) or new entries are currently present. You can select custom months above if needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
