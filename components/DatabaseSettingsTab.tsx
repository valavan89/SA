import React, { useState, useMemo, useCallback } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight,
  MapPin,
  Sliders,
  Sparkles,
  Layers
} from 'lucide-react';
import { OfficeDatabaseEntry } from '../types';

interface DatabaseSettingsTabProps {
  officesDb: OfficeDatabaseEntry[];
  setOfficesDb: React.Dispatch<React.SetStateAction<OfficeDatabaseEntry[]>>;
  activeProfile: string;
  onSaveToLocalStorage?: (updated: OfficeDatabaseEntry[]) => void;
}

// Memoized single row component to prevent full table re-renders during inline edits
const OfficeTableRow = React.memo(({
  entry,
  index,
  onUpdateField,
  onDeleteRow
}: {
  entry: OfficeDatabaseEntry;
  index: number;
  onUpdateField: (index: number, field: keyof OfficeDatabaseEntry, value: any) => void;
  onDeleteRow: (index: number) => void;
}) => {
  return (
    <tr className="hover:bg-slate-50/70 transition-all border-b border-slate-100/80">
      <td className="px-4 py-2.5 font-bold text-xs text-slate-800 text-left whitespace-nowrap">
        {entry.fromOffice}
      </td>
      <td className="px-4 py-2.5 font-bold text-xs text-slate-800 text-left whitespace-nowrap">
        {entry.toOffice}
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          step="0.1"
          value={entry.distanceBus}
          onChange={e => onUpdateField(index, 'distanceBus', parseFloat(e.target.value) || 0)}
          className="w-16 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          placeholder="auto"
          value={entry.fareBus !== undefined ? entry.fareBus : ''}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdateField(index, 'fareBus', isNaN(val) ? undefined : val);
          }}
          className="w-16 bg-amber-50/30 border border-amber-200 rounded-lg py-1.5 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          step="0.1"
          value={entry.distanceBike}
          onChange={e => onUpdateField(index, 'distanceBike', parseFloat(e.target.value) || 0)}
          className="w-16 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          value={entry.durationBus}
          onChange={e => onUpdateField(index, 'durationBus', parseInt(e.target.value) || 0)}
          className="w-16 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          value={entry.durationBike}
          onChange={e => onUpdateField(index, 'durationBike', parseInt(e.target.value) || 0)}
          className="w-16 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="text"
          placeholder="None"
          value={entry.viaBusStand || ''}
          onChange={e => onUpdateField(index, 'viaBusStand', e.target.value.trim() || undefined)}
          className="w-28 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 px-1 text-center text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          step="0.1"
          placeholder="0"
          value={entry.fromOfficeToBsKm !== undefined ? entry.fromOfficeToBsKm : ''}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdateField(index, 'fromOfficeToBsKm', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          placeholder="auto"
          value={entry.fromOfficeToBsFare !== undefined ? entry.fromOfficeToBsFare : ''}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdateField(index, 'fromOfficeToBsFare', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-amber-50/30 border border-amber-200 rounded-lg py-1.5 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          placeholder="0"
          value={entry.fromOfficeToBsMins !== undefined ? entry.fromOfficeToBsMins : ''}
          onChange={e => {
            const val = parseInt(e.target.value);
            onUpdateField(index, 'fromOfficeToBsMins', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          step="0.1"
          placeholder="0"
          value={entry.toOfficeToBsKm !== undefined ? entry.toOfficeToBsKm : ''}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdateField(index, 'toOfficeToBsKm', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          placeholder="auto"
          value={entry.toOfficeToBsFare !== undefined ? entry.toOfficeToBsFare : ''}
          onChange={e => {
            const val = parseFloat(e.target.value);
            onUpdateField(index, 'toOfficeToBsFare', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-amber-50/30 border border-amber-200 rounded-lg py-1.5 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-400 outline-none transition-all"
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          placeholder="0"
          value={entry.toOfficeToBsMins !== undefined ? entry.toOfficeToBsMins : ''}
          onChange={e => {
            const val = parseInt(e.target.value);
            onUpdateField(index, 'toOfficeToBsMins', isNaN(val) ? undefined : val);
          }}
          className="w-14 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-400 outline-none transition-all"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={() => onDeleteRow(index)}
          className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 border-0 bg-transparent cursor-pointer"
          title="Delete route"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
});

export const DatabaseSettingsTab: React.FC<DatabaseSettingsTabProps> = React.memo(({
  officesDb,
  setOfficesDb,
  activeProfile,
  onSaveToLocalStorage
}) => {
  // New office form state
  const [newFromOffice, setNewFromOffice] = useState('');
  const [newToOffice, setNewToOffice] = useState('');
  const [newDistBus, setNewDistBus] = useState('');
  const [newDistBike, setNewDistBike] = useState('');
  const [newDurBus, setNewDurBus] = useState('');
  const [newDurBike, setNewDurBike] = useState('');
  const [newViaBusStand, setNewViaBusStand] = useState('');
  const [newFromBsKm, setNewFromBsKm] = useState('');
  const [newFromBsMins, setNewFromBsMins] = useState('');
  const [newToBsKm, setNewToBsKm] = useState('');
  const [newToBsMins, setNewToBsMins] = useState('');
  const [newFareBus, setNewFareBus] = useState('');
  const [newFromBsFare, setNewFromBsFare] = useState('');
  const [newToBsFare, setNewToBsFare] = useState('');

  // UI state
  const [dbError, setDbError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importError, setImportError] = useState('');
  const [parsedEntries, setParsedEntries] = useState<OfficeDatabaseEntry[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  // Memoized unique dropdown options
  const uniqueFromOffices = useMemo(() => {
    return Array.from(new Set(officesDb.map(o => o.fromOffice).filter(Boolean))).sort();
  }, [officesDb]);

  const uniqueToOffices = useMemo(() => {
    return Array.from(new Set(officesDb.map(o => o.toOffice).filter(Boolean))).sort();
  }, [officesDb]);

  // Memoized filtered office routes
  const filteredOffices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return officesDb
      .map((o, originalIdx) => ({ o, originalIdx }))
      .filter(({ o }) => {
        if (filterFrom && o.fromOffice !== filterFrom) return false;
        if (filterTo && o.toOffice !== filterTo) return false;
        if (q) {
          const matchFrom = o.fromOffice?.toLowerCase().includes(q);
          const matchTo = o.toOffice?.toLowerCase().includes(q);
          const matchVia = o.viaBusStand?.toLowerCase().includes(q);
          return matchFrom || matchTo || matchVia;
        }
        return true;
      });
  }, [officesDb, searchQuery, filterFrom, filterTo]);

  // Memoized pagination calculations
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredOffices.length / pageSize));
  }, [filteredOffices.length, pageSize]);

  const paginatedOffices = useMemo(() => {
    if (pageSize === 'all') return filteredOffices;
    const start = (currentPage - 1) * pageSize;
    return filteredOffices.slice(start, start + pageSize);
  }, [filteredOffices, currentPage, pageSize]);

  // Fast row update callback
  const handleUpdateField = useCallback((index: number, field: keyof OfficeDatabaseEntry, value: any) => {
    setOfficesDb(prev => {
      const updated = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
      if (onSaveToLocalStorage) onSaveToLocalStorage(updated);
      return updated;
    });
  }, [setOfficesDb, onSaveToLocalStorage]);

  // Row delete callback
  const handleDeleteRow = useCallback((index: number) => {
    setOfficesDb(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (onSaveToLocalStorage) onSaveToLocalStorage(updated);
      return updated;
    });
  }, [setOfficesDb, onSaveToLocalStorage]);

  // Export database as CSV
  const exportDatabaseAsCSV = () => {
    try {
      const headers = [
        "From Office", "To Office", "Bus Distance (KM)", "Bus Fare (Rs.)", "Bike Distance (KM)", "Bus Duration (Mins)", "Bike Duration (Mins)", "Override Mode",
        "Via Bus Stand", "From Office to BS (KM)", "(From office to BS) Fare", "From Office to BS (Mins)", "BS to To Office (KM)", "(BS to To office ) Fare", "BS to To Office (Mins)"
      ];
      const rows = officesDb.map(o => [
        `"${(o.fromOffice || 'Kurinjipadi SO').replace(/"/g, '""')}"`,
        `"${(o.toOffice || '').replace(/"/g, '""')}"`,
        o.distanceBus,
        o.fareBus ?? "",
        o.distanceBike,
        o.durationBus,
        o.durationBike,
        `"${(o.transportModeOverriding || '').replace(/"/g, '""')}"`,
        `"${(o.viaBusStand || '').replace(/"/g, '""')}"`,
        o.fromOfficeToBsKm || 0,
        o.fromOfficeToBsFare ?? "",
        o.fromOfficeToBsMins || 0,
        o.toOfficeToBsKm || 0,
        o.toOfficeToBsFare ?? "",
        o.toOfficeToBsMins || 0
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `office_matrix_${activeProfile.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportSuccess('Database exported successfully as CSV!');
      setImportError('');
    } catch {
      setImportError('Failed to export database as CSV.');
    }
  };

  // Export database as JSON
  const exportDatabaseAsJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(officesDb, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `office_matrix_${activeProfile.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportSuccess('Database exported successfully as JSON!');
      setImportError('');
    } catch {
      setImportError('Failed to export database as JSON.');
    }
  };

  // Download sample proforma CSV
  const downloadSampleProforma = () => {
    try {
      const headers = [
        "From Office", "To Office", "Bus Distance (KM)", "Bus Fare (Rs.)", "Bike Distance (KM)", "Bus Duration (Mins)", "Bike Duration (Mins)", "Override Mode",
        "Via Bus Stand", "From Office to BS (KM)", "(From office to BS) Fare", "From Office to BS (Mins)", "BS to To Office (KM)", "(BS to To office ) Fare", "BS to To Office (Mins)"
      ];
      const sampleRows = [
        ["Kurinjipadi SO", "Vadalur SO", 5, 10, 5, 20, 10, "", "", 0, "", 0, 0, "", 0],
        ["Kurinjipadi SO", "Nellikkuppam SO", 30, 35, 32, 55, 55, "", "CUDDALORE BUS STAND", 35, 35, 60, 15, 20, 30],
        ["Kurinjipadi SO", "Chidambaram HO", 31, 35, 27, 55, 45, "", "CUDDALORE BUS STAND", 35, 35, 60, 3, 5, 10],
        ["Kurinjipadi SO", "Cuddalore HO", 35, 40, 32, 60, 55, "", "CUDDALORE BUS STAND", 35, 35, 60, 2, 5, 10]
      ];
      const csvContent = [headers.join(','), ...sampleRows.map(e => e.join(','))].join('\n');
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "office_database_sample_proforma.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportSuccess('Sample proforma downloaded!');
      setImportError('');
    } catch {
      setImportError('Failed to download sample proforma.');
    }
  };

  // Handle file upload (CSV or JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setImportError('Empty file selected.');
        return;
      }

      try {
        if (fileType === 'json') {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const validated: OfficeDatabaseEntry[] = [];
            for (const item of parsed) {
              if (item && typeof item === 'object') {
                const legacyName = ('name' in item) ? String((item as any).name).trim() : '';
                const fromOffice = 'fromOffice' in item ? String(item.fromOffice).trim() : (legacyName ? 'Kurinjipadi SO' : '');
                const toOffice = 'toOffice' in item ? String(item.toOffice).trim() : legacyName;

                if (fromOffice && toOffice) {
                  validated.push({
                    fromOffice,
                    toOffice,
                    distanceBus: parseFloat((item as any).distanceBus) || 0,
                    distanceBike: parseFloat((item as any).distanceBike) || 0,
                    durationBus: parseInt((item as any).durationBus) || 0,
                    durationBike: parseInt((item as any).durationBike) || 0,
                    viaBusStand: 'viaBusStand' in item && (item as any).viaBusStand ? String((item as any).viaBusStand).trim() : undefined,
                    fromOfficeToBsKm: 'fromOfficeToBsKm' in item ? parseFloat((item as any).fromOfficeToBsKm) || 0 : undefined,
                    fromOfficeToBsMins: 'fromOfficeToBsMins' in item ? parseInt((item as any).fromOfficeToBsMins) || 0 : undefined,
                    toOfficeToBsKm: 'toOfficeToBsKm' in item ? parseFloat((item as any).toOfficeToBsKm) || 0 : undefined,
                    toOfficeToBsMins: 'toOfficeToBsMins' in item ? parseInt((item as any).toOfficeToBsMins) || 0 : undefined,
                    fareBus: 'fareBus' in item && !isNaN(parseFloat((item as any).fareBus)) ? parseFloat((item as any).fareBus) : undefined,
                    fromOfficeToBsFare: 'fromOfficeToBsFare' in item && !isNaN(parseFloat((item as any).fromOfficeToBsFare)) ? parseFloat((item as any).fromOfficeToBsFare) : undefined,
                    toOfficeToBsFare: 'toOfficeToBsFare' in item && !isNaN(parseFloat((item as any).toOfficeToBsFare)) ? parseFloat((item as any).toOfficeToBsFare) : undefined,
                    transportModeOverriding: 'transportModeOverriding' in item && (item as any).transportModeOverriding ? String((item as any).transportModeOverriding).trim() : undefined
                  });
                }
              }
            }
            if (validated.length === 0) {
              setImportError('No valid office definitions found in JSON database template.');
            } else {
              setParsedEntries(validated);
              setImportError('');
              setImportSuccess(`Loaded file successfully! Ready to import ${validated.length} routes.`);
            }
          } else {
            setImportError('JSON template must contain an array of office entries.');
          }
        } else if (fileType === 'csv') {
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) {
            setImportError('Invalid CSV template. No matrix records found.');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
          const getIdx = (exacts: string[], contains: string[], negatives: string[] = []) => {
            for (const exact of exacts) {
              const exactClean = exact.toLowerCase().replace(/\s+/g, ' ').trim();
              const found = headers.indexOf(exactClean);
              if (found !== -1) return found;
            }
            return headers.findIndex(h => {
              const hClean = h.toLowerCase().replace(/\s+/g, ' ').trim();
              const hasAllContains = contains.every(c => hClean.includes(c.toLowerCase()));
              const hasNoNegatives = negatives.every(n => !hClean.includes(n.toLowerCase()));
              return hasAllContains && hasNoNegatives;
            });
          };

          const fromIdx = getIdx(["from office", "from_office"], ["from", "office"]);
          const toIdx = getIdx(["to office", "to_office"], ["to", "office"], ["from"]);
          const nameIdx = getIdx(["office", "name"], ["office"]);
          const distBusIdx = getIdx(["bus distance (km)", "bus distance", "bus_distance"], ["bus", "km"], ["stand", "bs"]);
          const distBikeIdx = getIdx(["bike distance (km)", "bike distance", "bike_distance"], ["bike", "km"]);
          const durBusIdx = getIdx(["bus duration (mins)", "bus duration", "duration_bus"], ["bus", "min"], ["stand", "bs"]);
          const durBikeIdx = getIdx(["bike duration (mins)", "bike duration", "duration_bike"], ["bike", "min"]);
          const overrideIdx = getIdx(["override mode", "override_mode"], ["override"]);
          const viaBsIdx = getIdx(["via bus stand", "via bs", "via_bus_stand"], ["via"], ["km", "dist", "min", "dur", "fare", "time"]);
          const fromBsKmIdx = getIdx(["from office to bs (km)", "from office to bs distance", "from bs km"], ["from", "bs", "km"]);
          const fromBsDurIdx = getIdx(["from office to bs (mins)", "from office to bs mins", "from bs mins"], ["from", "bs", "min"]);
          const toBsKmIdx = getIdx(["bs to to office (km)", "to office to bs (km)", "to bs km", "bs to to office km"], ["bs", "km"], ["from"]);
          const toBsDurIdx = getIdx(["bs to to office (mins)", "to office to bs (mins)", "to bs mins", "bs to to office mins"], ["bs", "min"], ["from"]);
          const shareBusFareIdx = getIdx(["bus fare (rs.)", "bus fare", "fare_bus"], ["bus", "fare"], ["from", "to", "stand", "bs"]);
          const fromBsFareIdx = getIdx(["(from office to bs) fare", "from office to bs fare", "from bs fare"], ["from", "bs", "fare"]);
          const toBsFareIdx = getIdx(["(bs to to office ) fare", "(bs to to office) fare", "to bs fare", "bs to to office fare"], ["bs", "fare"], ["from"]);

          if (fromIdx === -1 && toIdx === -1 && nameIdx === -1) {
            setImportError('Headers missing. Required columns: "From Office" and "To Office".');
            return;
          }

          const entries: OfficeDatabaseEntry[] = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells: string[] = [];
            let insideQuote = false;
            let currentCell = '';
            for (let c = 0; c < line.length; c++) {
              const char = line[c];
              if (char === '"') {
                insideQuote = !insideQuote;
              } else if (char === ',' && !insideQuote) {
                cells.push(currentCell.trim());
                currentCell = '';
              } else {
                currentCell += char;
              }
            }
            cells.push(currentCell.trim());

            if (cells.length === 0) continue;

            let fromOffice = fromIdx !== -1 && cells[fromIdx] ? cells[fromIdx].replace(/"/g, '').trim() : '';
            let toOffice = toIdx !== -1 && cells[toIdx] ? cells[toIdx].replace(/"/g, '').trim() : '';

            if (!fromOffice && !toOffice && nameIdx !== -1 && cells[nameIdx]) {
              fromOffice = "Kurinjipadi SO";
              toOffice = cells[nameIdx].replace(/"/g, '').trim();
            }

            if (!fromOffice || !toOffice) continue;

            const distBus = parseFloat(cells[distBusIdx]) || 0;
            const distBike = parseFloat(cells[distBikeIdx]) || 0;
            const durBus = parseInt(cells[durBusIdx]) || 0;
            const durBike = parseInt(cells[durBikeIdx]) || 0;
            const overrideMode = overrideIdx !== -1 && cells[overrideIdx] ? cells[overrideIdx].replace(/"/g, '').trim().toUpperCase() : '';
            const viaBusStand = viaBsIdx !== -1 && cells[viaBsIdx] ? cells[viaBsIdx].replace(/"/g, '').trim() : '';
            const fromOfficeToBsKm = fromBsKmIdx !== -1 && cells[fromBsKmIdx] ? parseFloat(cells[fromBsKmIdx]) || 0 : 0;
            const fromOfficeToBsMins = fromBsDurIdx !== -1 && cells[fromBsDurIdx] ? parseInt(cells[fromBsDurIdx]) || 0 : 0;
            const toOfficeToBsKm = toBsKmIdx !== -1 && cells[toBsKmIdx] ? parseFloat(cells[toBsKmIdx]) || 0 : 0;
            const toOfficeToBsMins = toBsDurIdx !== -1 && cells[toBsDurIdx] ? parseInt(cells[toBsDurIdx]) || 0 : 0;

            const fareBusFn = (idx: number) => {
              if (idx === -1 || cells[idx] === undefined) return undefined;
              const val = parseFloat(cells[idx]);
              return isNaN(val) ? undefined : val;
            };

            entries.push({
              fromOffice,
              toOffice,
              distanceBus: distBus,
              distanceBike: distBike,
              durationBus: durBus,
              durationBike: durBike,
              transportModeOverriding: overrideMode || undefined,
              viaBusStand: viaBusStand || undefined,
              fromOfficeToBsKm: viaBusStand ? fromOfficeToBsKm : undefined,
              fromOfficeToBsMins: viaBusStand ? fromOfficeToBsMins : undefined,
              toOfficeToBsKm: viaBusStand ? toOfficeToBsKm : undefined,
              toOfficeToBsMins: viaBusStand ? toOfficeToBsMins : undefined,
              fareBus: fareBusFn(shareBusFareIdx),
              fromOfficeToBsFare: fareBusFn(fromBsFareIdx),
              toOfficeToBsFare: fareBusFn(toBsFareIdx)
            });
          }

          if (entries.length === 0) {
            setImportError('No valid records found in CSV file.');
          } else {
            setParsedEntries(entries);
            setImportError('');
            setImportSuccess(`Loaded CSV successfully! Ready to import ${entries.length} routes.`);
          }
        }
      } catch {
        setImportError('Error parsing directory file records. Verify integrity of file.');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute import
  const handleExecuteImport = () => {
    if (parsedEntries.length === 0) return;

    let finalOffices: OfficeDatabaseEntry[] = [];
    if (importMode === 'overwrite') {
      finalOffices = parsedEntries.sort((a, b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
    } else {
      const mergedMap = new Map<string, OfficeDatabaseEntry>();
      officesDb.forEach(item => {
        const key = `${item.fromOffice.toLowerCase().replace(/\s+/g,'')}-${item.toOffice.toLowerCase().replace(/\s+/g,'')}`;
        mergedMap.set(key, item);
      });
      parsedEntries.forEach(item => {
        const key = `${item.fromOffice.toLowerCase().replace(/\s+/g,'')}-${item.toOffice.toLowerCase().replace(/\s+/g,'')}`;
        mergedMap.set(key, item);
      });
      finalOffices = Array.from(mergedMap.values()).sort((a, b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
    }

    setOfficesDb(finalOffices);
    if (onSaveToLocalStorage) onSaveToLocalStorage(finalOffices);

    setImportSuccess(`Successfully imported ${parsedEntries.length} routes!`);
    setParsedEntries([]);
    setTimeout(() => setImportSuccess(''), 4000);
  };

  // Add new office route
  const handleAddOffice = () => {
    if (!newFromOffice.trim()) {
      setDbError('Please enter From Office');
      return;
    }
    if (!newToOffice.trim()) {
      setDbError('Please enter To Office');
      return;
    }

    const normFrom = newFromOffice.toLowerCase().replace(/\s+/g, '').trim();
    const normTo = newToOffice.toLowerCase().replace(/\s+/g, '').trim();

    if (officesDb.some(o => {
      const itemFrom = o.fromOffice.toLowerCase().replace(/\s+/g, '').trim();
      const itemTo = o.toOffice.toLowerCase().replace(/\s+/g, '').trim();
      return (itemFrom === normFrom && itemTo === normTo) || (itemFrom === normTo && itemTo === normFrom);
    })) {
      setDbError('A route relationship between these two offices already exists');
      return;
    }

    const valDistBus = parseFloat(newDistBus) || 0;
    const valDistBike = parseFloat(newDistBike) || 0;
    const valDurBus = parseInt(newDurBus) || 0;
    const valDurBike = parseInt(newDurBike) || 0;
    const valViaBusStand = newViaBusStand.trim();
    const valFromBsKm = parseFloat(newFromBsKm);
    const valFromBsMins = parseInt(newFromBsMins);
    const valToBsKm = parseFloat(newToBsKm);
    const valToBsMins = parseInt(newToBsMins);
    const valFareBus = parseFloat(newFareBus);
    const valFromBsFare = parseFloat(newFromBsFare);
    const valToBsFare = parseFloat(newToBsFare);

    const newEntry: OfficeDatabaseEntry = {
      fromOffice: newFromOffice.trim(),
      toOffice: newToOffice.trim(),
      distanceBus: valDistBus,
      distanceBike: valDistBike,
      durationBus: valDurBus,
      durationBike: valDurBike,
      viaBusStand: valViaBusStand || undefined,
      fromOfficeToBsKm: isNaN(valFromBsKm) ? undefined : valFromBsKm,
      fromOfficeToBsMins: isNaN(valFromBsMins) ? undefined : valFromBsMins,
      toOfficeToBsKm: isNaN(valToBsKm) ? undefined : valToBsKm,
      toOfficeToBsMins: isNaN(valToBsMins) ? undefined : valToBsMins,
      fareBus: isNaN(valFareBus) ? undefined : valFareBus,
      fromOfficeToBsFare: isNaN(valFromBsFare) ? undefined : valFromBsFare,
      toOfficeToBsFare: isNaN(valToBsFare) ? undefined : valToBsFare
    };

    const updated = [...officesDb, newEntry].sort((a, b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
    setOfficesDb(updated);
    if (onSaveToLocalStorage) onSaveToLocalStorage(updated);

    // Reset inputs
    setNewFromOffice('');
    setNewToOffice('');
    setNewDistBus('');
    setNewDistBike('');
    setNewDurBus('');
    setNewDurBike('');
    setNewViaBusStand('');
    setNewFromBsKm('');
    setNewFromBsMins('');
    setNewToBsKm('');
    setNewToBsMins('');
    setNewFareBus('');
    setNewFromBsFare('');
    setNewToBsFare('');
    setDbError('');
  };

  return (
    <div id="database-settings-tab-view" className="space-y-6 animate-fade-in text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase">
              <Database size={14} /> Official Matrix Registry
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Office Distance & Route Database
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Configure distances, travel durations, bus stand transit junctions, and fare rates for all inter-office pairs in your workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportDatabaseAsCSV}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Export routes as CSV"
            >
              <FileSpreadsheet size={14} /> CSV Export
            </button>
            <button
              onClick={exportDatabaseAsJSON}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="Export routes as JSON"
            >
              <Download size={14} /> JSON Backup
            </button>
            <button
              onClick={downloadSampleProforma}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
              title="Download empty CSV proforma template"
            >
              <FileSpreadsheet size={14} /> Sample Template
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {importError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Import / Batch Upload Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Upload size={16} className="text-indigo-600" />
              Batch Import Office Routes (CSV / JSON)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload a customized office distance matrix to instantly populate or update route benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm">
              <Upload size={14} /> Select File
              <input
                type="file"
                accept=".csv, .json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Staged entries preview */}
        {parsedEntries.length > 0 && (
          <div className="p-4 bg-indigo-50/60 border border-indigo-200/70 rounded-xl space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <span>{parsedEntries.length} routes staged for import</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="accent-indigo-600"
                  />
                  <span>Merge with existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="accent-indigo-600"
                  />
                  <span>Replace entire database</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setParsedEntries([])}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Confirm & Import {parsedEntries.length} Routes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Route Form */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Plus size={16} className="text-indigo-600" />
          Add Single Route Pair
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">From Office *</label>
            <input
              type="text"
              placeholder="e.g. Kurinjipadi SO"
              value={newFromOffice}
              onChange={e => { setNewFromOffice(e.target.value); setDbError(''); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">To Office *</label>
            <input
              type="text"
              placeholder="e.g. Cuddalore HO"
              value={newToOffice}
              onChange={e => { setNewToOffice(e.target.value); setDbError(''); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bus (KM)</label>
            <input
              type="number"
              step="0.1"
              placeholder="0"
              value={newDistBus}
              onChange={e => setNewDistBus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-amber-600 mb-1">Bus Fare (₹)</label>
            <input
              type="number"
              placeholder="opt"
              value={newFareBus}
              onChange={e => setNewFareBus(e.target.value)}
              className="w-full px-3 py-2 bg-amber-50/30 border border-amber-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-amber-400 transition-all text-center text-amber-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bike (KM)</label>
            <input
              type="number"
              step="0.1"
              placeholder="0"
              value={newDistBike}
              onChange={e => setNewDistBike(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bus (Mins)</label>
            <input
              type="number"
              placeholder="0"
              value={newDurBus}
              onChange={e => setNewDurBus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bike (Mins)</label>
            <input
              type="number"
              placeholder="0"
              value={newDurBike}
              onChange={e => setNewDurBike(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Via Bus Stand (opt)</label>
            <input
              type="text"
              placeholder="e.g. CUDDALORE BUS STAND"
              value={newViaBusStand}
              onChange={e => setNewViaBusStand(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">From-BS KM</label>
            <input
              type="number"
              step="0.1"
              placeholder="opt"
              value={newFromBsKm}
              onChange={e => setNewFromBsKm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">From-BS Mins</label>
            <input
              type="number"
              placeholder="opt"
              value={newFromBsMins}
              onChange={e => setNewFromBsMins(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">BS-To KM</label>
            <input
              type="number"
              step="0.1"
              placeholder="opt"
              value={newToBsKm}
              onChange={e => setNewToBsKm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">BS-To Mins</label>
            <input
              type="number"
              placeholder="opt"
              value={newToBsMins}
              onChange={e => setNewToBsMins(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all text-center"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <button
              onClick={handleAddOffice}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer h-[38px]"
            >
              Add Route
            </button>
          </div>
        </div>

        {dbError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>{dbError}</span>
            <button onClick={() => setDbError('')} className="text-rose-400 hover:text-rose-600 bg-transparent border-0 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Filter & Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden space-y-0">
        {/* Filter Controls */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Filter Office Routes ({filteredOffices.length} matching of {officesDb.length})
              </h4>
            </div>

            {/* Search Box */}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search office or bus stand..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all shadow-xs"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <select
              value={filterFrom}
              onChange={e => { setFilterFrom(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all shadow-xs cursor-pointer"
            >
              <option value="">All From Offices</option>
              {uniqueFromOffices.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <select
              value={filterTo}
              onChange={e => { setFilterTo(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all shadow-xs cursor-pointer"
            >
              <option value="">All To Offices</option>
              {uniqueToOffices.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            {(filterFrom || filterTo || searchQuery) && (
              <button
                onClick={() => {
                  setFilterFrom('');
                  setFilterTo('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All ({filteredOffices.length})</option>
              </select>
              <span className="text-slate-400 ml-1">
                Showing {filteredOffices.length > 0 ? (pageSize === 'all' ? 1 : (currentPage - 1) * (typeof pageSize === 'number' ? pageSize : 25) + 1) : 0} - {pageSize === 'all' ? filteredOffices.length : Math.min(currentPage * (typeof pageSize === 'number' ? pageSize : 25), filteredOffices.length)} of {filteredOffices.length}
              </span>
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-black text-indigo-600 text-xs shadow-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] bg-slate-50 border-b border-slate-200 font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10 text-center">
                <th className="px-4 py-3 text-left">From Office</th>
                <th className="px-4 py-3 text-left">To Office</th>
                <th className="px-2 py-3">Bus (KM)</th>
                <th className="px-2 py-3 text-amber-600">Bus Fare (₹)</th>
                <th className="px-2 py-3">Bike (KM)</th>
                <th className="px-2 py-3">Bus (Mins)</th>
                <th className="px-2 py-3">Bike (Mins)</th>
                <th className="px-2 py-3">Via Bus Stand</th>
                <th className="px-2 py-3 text-[9px]">From-BS KM</th>
                <th className="px-2 py-3 text-[9px] text-amber-600">From-BS ₹</th>
                <th className="px-2 py-3 text-[9px]">From-BS Min</th>
                <th className="px-2 py-3 text-[9px]">BS-To KM</th>
                <th className="px-2 py-3 text-[9px] text-amber-600">BS-To ₹</th>
                <th className="px-2 py-3 text-[9px]">BS-To Min</th>
                <th className="px-2 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOffices.map(({ o, originalIdx }) => (
                <OfficeTableRow
                  key={`${o.fromOffice}-${o.toOffice}-${originalIdx}`}
                  entry={o}
                  index={originalIdx}
                  onUpdateField={handleUpdateField}
                  onDeleteRow={handleDeleteRow}
                />
              ))}

              {filteredOffices.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">
                    No matching office route records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
