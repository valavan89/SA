import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Download, 
  Upload,
  FileSpreadsheet,
  Trash2, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  PlusCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Settings,
  Database,
  ChevronDown,
  X,
  Copy,
  Cloud,
  CloudDownload,
  Lock,
  CalendarRange,
  Filter,
  Sliders,
  Settings2,
  Zap,
  Sparkles,
  Bike,
  Search,
  Bell,
  Clock,
  RotateCcw,
  RefreshCw,
  QrCode,
  Smartphone,
  Laptop,
  ArrowLeftRight,
  CloudUpload,
  KeyRound,
  Package,
  Wifi,
  WifiOff,
  HardDrive
} from 'lucide-react';
import { DiaryMetadata, ActivityEntry, MovementEntry, OfficeVisit, OfficeDatabaseEntry, InterOfficeRouteEntry, ServiceCallReport } from './types';
import { getFortnightDays, formatDate, formatDay, to24hDot, isMonthCompleted, normalizeDateStr } from './utils/dateUtils';
import { generateWordDoc, generateTACalculationsDoc, generateTACalculationsExcel, generateServiceCallReportDoc, generateMultipleServiceCallReportsDoc, generateTABillDoc } from './services/docGenerator';
import { ServiceCallReportGenerator } from './components/ServiceCallReportGenerator';
import { DatabaseSettingsTab } from './components/DatabaseSettingsTab';
import { ProfileSettingsTab } from './components/ProfileSettingsTab';
import { MonthWiseDataManagement } from './components/MonthWiseDataManagement';
import { PinSyncModal } from './components/PinSyncModal';
import { OfflinePackageModal } from './components/OfflinePackageModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ModeSelector } from './components/ModeSelector';
import { BikeOptimizerModal, CandidateDay } from './components/BikeOptimizerModal';
import logo from './src/assets/images/logo-sa-diary.png';


const PROFILE_1_OFFICES = [
  "Alapakkam SO", "CN Palayam SO", "Cuddalore DO", "Cuddalore HO", 
  "Cuddalore OT Bazaar SO", "Cuddalore OT SO", "Cuddalore Public Offices SO", 
  "Fort St David SO", "Kilkavarapattu SO", "Kondur SO", "Kullanchavadi SO", 
  "Kurinjipadi SO", "Manjakuppam SO", "Melpattambakkam SO", "Nellikkuppam SO", 
  "Sipcot SO", "Tirupadiripuliyur SO", "Tirupadiripuliyur West SO", "Tiruvendhipuram SO", 
  "Vadalur SO", "Vandipalayam SO", "Varakkalpattu SO"
];

const PROFILE_2_OFFICES = [
  "Anathur S.O", "Block 1 Neyveli S.O", "Block 18 Neyveli S.O", "Block 26 Neyveli S.O", 
  "Block 29 Neyveli S.O", "Gandhinagar S.O", "Kadambuliyur S.O", "Neyveli 1 S.O", 
  "Neyveli 2 S.O", "Neyveli Second MineS.O", "Neyveli TBS S.O", "Neyveli TS 2 S.O", 
  "Panruti East S.O", "Panruti S.O", "Panruti West S.O", "Perperiyankuppam S.O", 
  "Puthupet (CDL) S.O", "Tiruthuraiyur S.O", "Block 10,neyveli S.O", "Block 5, Neyveli S.O", 
  "Neyveli 3 S.O"
];

const PROFILE_3_OFFICES = [
  "Annamalainagar SO", "Ayangudi SO", "B.Mutlur SO", "Bhuvanagiri SO", "Annamalai University SO", 
  "Kattumannarkoil SO", "Keerapalayam SO", "Killai SO", "Komaratchi SO", "Lalpet SO", "Orathur SO", 
  "Palayamkottai(CDL) SO", "Parangipettai SO", "Pinnalur SO", "Reddiyur SO", "Sethiathope SO", 
  "Srimushnam SO", "T.Nedunjeri SO", "Vallampadugai SO", "Chidambaram HO", "Chidambaram Cutcherry SO", "C. Mutlur SO",
  "Shemford School", "CDM West S.O"
];

const getProfileBaseOffices = (profileName: string): string[] => {
  return [];
};

const getProfileAttachedOffice = (profileName: string): string => {
  const norm = profileName === "Default Profile" ? "Karikalvalavan R" : profileName;
  if (norm === "Karikalvalavan R") return "Kurinjipadi SO";
  if (norm === "Muthvel R") return "Neyveli 3 S.O";
  if (norm === "Sivaraj S") return "Annamalainagar SO";
  return "";
};

const getDeviceType = (): "Mobile" | "PC" => {
  if (typeof window === 'undefined' || !window.navigator) return "PC";
  const ua = window.navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "Mobile";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
    return "Mobile";
  }
  return "PC";
};

const CORRECTIONS: Record<string, string> = {
  "Cuddalore Court Building SO": "Cuddalore Court Buildings SO",
  "Cuddalore Court Buildings SO- ok": "Cuddalore Court Buildings SO",
  "Cuddalore Court Buildings SO-ok": "Cuddalore Court Buildings SO",
  "Cuddalore OT Bazaar SO - ok": "Cuddalore OT Bazaar SO",
  "Cuddalore OT Bazaar SO- ok": "Cuddalore OT Bazaar SO",
  "Cuddalore OT Bazaar SO-ok": "Cuddalore OT Bazaar SO",
  "Cuddalore OT Bazzar SO": "Cuddalore OT Bazaar SO",
  "Cuddalore Public offices SO": "Cuddalore Public Offices SO",
  "Cuddalore Public Offices SO - ok": "Cuddalore Public Offices SO",
  "Cuddalore Public Offices SO- ok": "Cuddalore Public Offices SO",
  "Cuddalore Public Offices SO-ok": "Cuddalore Public Offices SO",
  "Tirupadiripuliyur west SO": "Tirupadiripuliyur West SO",
  "Tirupadiripuliyur West SO- ok": "Tirupadiripuliyur West SO",
  "Tirupadiripuliyur West SO-ok": "Tirupadiripuliyur West SO",
};

export const cleanOfficeSpelling = (name: string): string => {
  if (!name) return name;
  const trimmed = name.trim();
  if (CORRECTIONS[trimmed]) return CORRECTIONS[trimmed];

  let clean = trimmed;
  if (clean.endsWith("- ok")) {
    clean = clean.substring(0, clean.length - 4).trim();
  } else if (clean.endsWith("-ok")) {
    clean = clean.substring(0, clean.length - 3).trim();
  } else if (clean.endsWith(" - ok")) {
    clean = clean.substring(0, clean.length - 5).trim();
  }

  if (CORRECTIONS[clean]) return CORRECTIONS[clean];
  return clean;
};

export const isNeyveliClusterOffice = (officeName: string): boolean => {
  if (!officeName) return false;
  const clean = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
  const keywords = [
    "neyveli 3", "neyveli 1", "neyveli tbs", "perperiyankuppam",
    "block 1", "block 10", "block 18", "block 26", "block 29", "block 5"
  ];
  return keywords.some(kw => clean.includes(kw));
};

export const isNeyveliClusterRoute = (fromLoc: string, toLoc: string): boolean => {
  return isNeyveliClusterOffice(fromLoc) && isNeyveliClusterOffice(toLoc);
};

const cleanOfficeVisitObj = (v: OfficeVisit): OfficeVisit => {
  return {
    ...v,
    officeName: cleanOfficeSpelling(v.officeName)
  };
};

const cleanActivityEntryObj = (act: ActivityEntry): ActivityEntry => {
  return {
    ...act,
    visits: (act.visits || []).map(cleanOfficeVisitObj)
  };
};

const cleanMovementEntryObj = (mov: MovementEntry): MovementEntry => {
  return {
    ...mov,
    fromLocation: cleanOfficeSpelling(mov.fromLocation),
    toLocation: cleanOfficeSpelling(mov.toLocation)
  };
};

const cleanServiceCallReportObj = (scr: ServiceCallReport): ServiceCallReport => {
  return {
    ...scr,
    date: normalizeDateStr(scr.date),
    callGivenBy: (scr.callGivenBy ?? '').trim().toUpperCase(),
    officeAttended: cleanOfficeSpelling(scr.officeAttended)
  };
};

const cleanMetadataObj = (meta: DiaryMetadata): DiaryMetadata => {
  return {
    ...meta,
    office: cleanOfficeSpelling(meta.office),
    submissionPlace: cleanOfficeSpelling(meta.submissionPlace)
  };
};

const mergeAndDeduplicateOffices = (list: OfficeDatabaseEntry[]): OfficeDatabaseEntry[] => {
  const seen = new Map<string, OfficeDatabaseEntry>();
  list.forEach(item => {
    const from = cleanOfficeSpelling(item.fromOffice);
    const to = cleanOfficeSpelling(item.toOffice);
    const key = `${from.toLowerCase()} -> ${to.toLowerCase()}`;
    
    const existing = seen.get(key);
    const cleanedItem = {
      ...item,
      fromOffice: from,
      toOffice: to,
    };
    
    if (!existing) {
      seen.set(key, cleanedItem);
    } else {
      seen.set(key, {
        ...existing,
        distanceBus: cleanedItem.distanceBus || existing.distanceBus,
        distanceBike: cleanedItem.distanceBike || existing.distanceBike,
        durationBus: cleanedItem.durationBus || existing.durationBus,
        durationBike: cleanedItem.durationBike || existing.durationBike,
        viaBusStand: cleanedItem.viaBusStand || existing.viaBusStand,
        fromOfficeToBsKm: cleanedItem.fromOfficeToBsKm || existing.fromOfficeToBsKm,
        fromOfficeToBsMins: cleanedItem.fromOfficeToBsMins || existing.fromOfficeToBsMins,
        toOfficeToBsKm: cleanedItem.toOfficeToBsKm || existing.toOfficeToBsKm,
        toOfficeToBsMins: cleanedItem.toOfficeToBsMins || existing.toOfficeToBsMins,
        fareBus: cleanedItem.fareBus || existing.fareBus,
        fromOfficeToBsFare: cleanedItem.fromOfficeToBsFare || existing.fromOfficeToBsFare,
        toOfficeToBsFare: cleanedItem.toOfficeToBsFare || existing.toOfficeToBsFare,
        transportModeOverriding: cleanedItem.transportModeOverriding || existing.transportModeOverriding,
      });
    }
  });
  return Array.from(seen.values());
};

// Startup LocalStorage migration to remove misspelled office names
(() => {
  try {
    const profilesToMigrate = ["Karikalvalavan R", "Muthvel R", "Sivaraj S"];
    
    profilesToMigrate.forEach(profile => {
      const prefix = profile === "Karikalvalavan R" ? "diary_" : `diary_profile_${profile}_`;
      
      // Metadata
      const metaKey = `${prefix}metadata`;
      const metaSaved = localStorage.getItem(metaKey);
      if (metaSaved) {
        try {
          const parsed = JSON.parse(metaSaved);
          const cleaned = cleanMetadataObj(parsed);
          localStorage.setItem(metaKey, JSON.stringify(cleaned));
        } catch (e) {}
      }
      
      // Activities
      const actKey = `${prefix}activities`;
      const actSaved = localStorage.getItem(actKey);
      if (actSaved) {
        try {
          const parsed = JSON.parse(actSaved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map(cleanActivityEntryObj);
            localStorage.setItem(actKey, JSON.stringify(cleaned));
          }
        } catch (e) {}
      }
      
      // Movements
      const movKey = `${prefix}movements`;
      const movSaved = localStorage.getItem(movKey);
      if (movSaved) {
        try {
          const parsed = JSON.parse(movSaved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map(cleanMovementEntryObj);
            localStorage.setItem(movKey, JSON.stringify(cleaned));
          }
        } catch (e) {}
      }
      
      // Offices DB
      const dbKey = `${prefix}offices_db`;
      const dbSaved = localStorage.getItem(dbKey);
      if (dbSaved) {
        try {
          const parsed = JSON.parse(dbSaved);
          if (Array.isArray(parsed)) {
            const cleaned = mergeAndDeduplicateOffices(parsed);
            localStorage.setItem(dbKey, JSON.stringify(cleaned));
          }
        } catch (e) {}
      }
      
      // Service Calls
      const scKey = `${prefix}service_calls`;
      const scSaved = localStorage.getItem(scKey);
      if (scSaved) {
        try {
          const parsed = JSON.parse(scSaved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map(cleanServiceCallReportObj);
            localStorage.setItem(scKey, JSON.stringify(cleaned));
          }
        } catch (e) {}
      }
    });
  } catch (err) {
    console.error("Local storage startup migration failed", err);
  }
})();

const getDefaultOfficeSpecs = (fromOffice: string, toOffice: string) => {
  const f = fromOffice.toLowerCase().replace(/\./g, "").trim();
  const t = toOffice.toLowerCase().replace(/\./g, "").trim();

  if (f === t) {
    return { distanceBus: 0, distanceBike: 0, durationBus: 0, durationBike: 0 };
  }

  // Specific inter-office paths extracted from the image
  const normOffice = (name: string) => name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const fNorm = normOffice(fromOffice);
  const tNorm = normOffice(toOffice);

  const key1 = `${fNorm} -> ${tNorm}`;
  const key2 = `${tNorm} -> ${fNorm}`;

  const specPairs: Record<string, { distanceBus: number, distanceBike: number, durationBus: number, durationBike: number }> = {
    "annamalainagar so -> chidambaram ho": { distanceBus: 8, distanceBike: 8, durationBus: 30, durationBike: 30 },
    "annamalainagar so -> bmutlur so": { distanceBus: 24, distanceBike: 24, durationBus: 90, durationBike: 90 },
    "annamalainagar so -> b mutlur so": { distanceBus: 24, distanceBike: 24, durationBus: 90, durationBike: 90 },
    "annamalainagar so -> reddiyur so": { distanceBus: 50, distanceBike: 50, durationBus: 150, durationBike: 150 },
    "annamalainagar so -> shemford school": { distanceBus: 11, distanceBike: 11, durationBus: 30, durationBike: 30 },
    "shemford school -> chidambaram ho": { distanceBus: 4, distanceBike: 4, durationBus: 45, durationBike: 45 },
    "annamalainagar so -> annamalai university so": { distanceBus: 3, distanceBike: 3, durationBus: 15, durationBike: 15 },
    "annamalai university so -> bmutlur so": { distanceBus: 18, distanceBike: 18, durationBus: 60, durationBike: 60 },
    "annamalai university so -> b mutlur so": { distanceBus: 18, distanceBike: 18, durationBus: 60, durationBike: 60 },
    "bmutlur so -> annamalainagar so": { distanceBus: 23, distanceBike: 23, durationBus: 90, durationBike: 90 },
    "b mutlur so -> annamalainagar so": { distanceBus: 23, distanceBike: 23, durationBus: 90, durationBike: 90 },
    "annamalai university so -> cdm west so": { distanceBus: 6, distanceBike: 6, durationBus: 15, durationBike: 15 },
    "cdm west so -> chidambaram ho": { distanceBus: 3, distanceBike: 3, durationBus: 15, durationBike: 15 },
    "annamalainagar so -> palayamkottai so": { distanceBus: 45, distanceBike: 45, durationBus: 120, durationBike: 120 },
    "annamalainagar so -> palayamkottai(cdl) so": { distanceBus: 45, distanceBike: 45, durationBus: 120, durationBike: 120 },
  };

  if (specPairs[key1]) return specPairs[key1];
  if (specPairs[key2]) return specPairs[key2];

  // Sivaraj S (Annamalainagar SO as fromOffice)
  if (f.startsWith("annamalainagar")) {
    if (t.startsWith("annamalai university")) return { distanceBus: 3, distanceBike: 3, durationBus: 15, durationBike: 15 };
    if (t.startsWith("chidambaram ho") || t.startsWith("chidambaram h.o")) return { distanceBus: 8, distanceBike: 8, durationBus: 30, durationBike: 30 };
    if (t.startsWith("chidambaram cutcherry") || t.startsWith("cdm west")) return { distanceBus: 5, distanceBike: 5, durationBus: 15, durationBike: 15 };
    if (t.startsWith("ayangudi")) return { distanceBus: 18, distanceBike: 18, durationBus: 30, durationBike: 25 };
    if (t.startsWith("b.mutlur") || t.startsWith("b. mutlur")) return { distanceBus: 24, distanceBike: 24, durationBus: 90, durationBike: 90 };
    if (t.startsWith("c.mutlur") || t.startsWith("c. mutlur")) return { distanceBus: 23, distanceBike: 23, durationBus: 90, durationBike: 90 };
    if (t.startsWith("bhuvanagiri")) return { distanceBus: 10, distanceBike: 10, durationBus: 18, durationBike: 15 };
    if (t.startsWith("kattumannarkoil")) return { distanceBus: 27, distanceBike: 27, durationBus: 45, durationBike: 40 };
    if (t.startsWith("keerapalayam")) return { distanceBus: 13, distanceBike: 13, durationBus: 25, durationBike: 20 };
    if (t.startsWith("killai")) return { distanceBus: 15, distanceBike: 15, durationBus: 25, durationBike: 22 };
    if (t.startsWith("komaratchi")) return { distanceBus: 18, distanceBike: 18, durationBus: 30, durationBike: 25 };
    if (t.startsWith("lalpet")) return { distanceBus: 32, distanceBike: 32, durationBus: 50, durationBike: 45 };
    if (t.startsWith("orathur")) return { distanceBus: 15, distanceBike: 15, durationBus: 25, durationBike: 22 };
    if (t.startsWith("palayamkottai")) return { distanceBus: 45, distanceBike: 45, durationBus: 120, durationBike: 120 };
    if (t.startsWith("parangipettai")) return { distanceBus: 12, distanceBike: 12, durationBus: 22, durationBike: 18 };
    if (t.startsWith("pinnalur")) return { distanceBus: 15, distanceBike: 15, durationBus: 25, durationBike: 22 };
    if (t.startsWith("reddiyur")) return { distanceBus: 50, distanceBike: 50, durationBus: 150, durationBike: 150 };
    if (t.startsWith("sethiathope")) return { distanceBus: 22, distanceBike: 22, durationBus: 35, durationBike: 30 };
    if (t.startsWith("srimushnam")) return { distanceBus: 40, distanceBike: 40, durationBus: 55, durationBike: 50 };
    if (t.startsWith("t.nedunjeri") || t.startsWith("t. nedunjeri")) return { distanceBus: 20, distanceBike: 20, durationBus: 35, durationBike: 30 };
    if (t.startsWith("vallampadugai")) return { distanceBus: 8, distanceBike: 8, durationBus: 15, durationBike: 12 };
  }

  // Muthvel R (Neyveli 3 SO as fromOffice)
  if (f.startsWith("neyveli 3") || f.startsWith("neyveli 3 so")) {
    const specs: Record<string, { distanceBus: number, distanceBike: number, durationBus: number, durationBike: number, fareBus?: number }> = {
      "neyveli 2": { distanceBus: 17, distanceBike: 17, durationBus: 30, durationBike: 30, fareBus: 15 },
      "neyveli ts 2": { distanceBus: 10, distanceBike: 10, durationBus: 20, durationBike: 20, fareBus: 12 },
      "gandhinagar": { distanceBus: 12, distanceBike: 12, durationBus: 30, durationBike: 30, fareBus: 15 },
      "gandhi nagar": { distanceBus: 12, distanceBike: 12, durationBus: 30, durationBike: 30, fareBus: 15 },
      "neyveli second mine": { distanceBus: 14, distanceBike: 14, durationBus: 20, durationBike: 20, fareBus: 12 },
      "neyveli second mines": { distanceBus: 16, distanceBike: 16, durationBus: 25, durationBike: 25, fareBus: 15 },
      "neyveli ii thermal": { distanceBus: 10, distanceBike: 10, durationBus: 25, durationBike: 20, fareBus: 12 },
      "block 10": { distanceBus: 4, distanceBike: 4, durationBus: 15, durationBike: 15, fareBus: 5 },
      "neyveli 1": { distanceBus: 4, distanceBike: 4, durationBus: 15, durationBike: 15, fareBus: 5 },
      "panruti west": { distanceBus: 28, distanceBike: 28, durationBus: 75, durationBike: 60, fareBus: 35 },
      "anathur": { distanceBus: 38, distanceBike: 38, durationBus: 90, durationBike: 75, fareBus: 42 },
      "panruti so": { distanceBus: 26, distanceBike: 26, durationBus: 70, durationBike: 55, fareBus: 30 },
      "block 18": { distanceBus: 1.5, distanceBike: 1.5, durationBus: 15, durationBike: 15, fareBus: 5 },
      "neyveli thermal bs": { distanceBus: 2, distanceBike: 2, durationBus: 10, durationBike: 10, fareBus: 5 },
      "neyveli thermal bus": { distanceBus: 5, distanceBike: 5, durationBus: 12, durationBike: 10, fareBus: 5 },
      "block 26": { distanceBus: 2, distanceBike: 2, durationBus: 15, durationBike: 15, fareBus: 5 },
      "tiruthuraiyur": { distanceBus: 35, distanceBike: 35, durationBus: 90, durationBike: 75, fareBus: 32 },
      "puthupet": { distanceBus: 31, distanceBike: 31, durationBus: 75, durationBike: 60, fareBus: 35 },
      "block 1": { distanceBus: 6, distanceBike: 6, durationBus: 15, durationBike: 15, fareBus: 5 },
      "cuddalore ho": { distanceBus: 45, distanceBike: 45, durationBus: 80, durationBike: 70, fareBus: 40 },
      "panruti east": { distanceBus: 31, distanceBike: 31, durationBus: 75, durationBike: 65, fareBus: 35 },
      "cluny school": { distanceBus: 3, distanceBike: 3, durationBus: 10, durationBike: 10, fareBus: 5 },
      "maharishi school": { distanceBus: 2, distanceBike: 2, durationBus: 10, durationBike: 10, fareBus: 5 },
      "kadambuliyur": { distanceBus: 18, distanceBike: 18, durationBus: 30, durationBike: 30, fareBus: 20 },
      "block 24": { distanceBus: 4, distanceBike: 4, durationBus: 15, durationBike: 15, fareBus: 5 },
      "kurinjipadi": { distanceBus: 20, distanceBike: 20, durationBus: 25, durationBike: 25, fareBus: 25 },
      "nlch sec school": { distanceBus: 15, distanceBike: 15, durationBus: 30, durationBike: 30, fareBus: 15 },
      "nlc h sec school": { distanceBus: 15, distanceBike: 15, durationBus: 30, durationBike: 30, fareBus: 15 },
      "neyveli thermabus stand": { distanceBus: 2, distanceBike: 2, durationBus: 10, durationBike: 10, fareBus: 5 },
      "jawahar school": { distanceBus: 3, distanceBike: 3, durationBus: 15, durationBike: 15, fareBus: 5 },
      "neyveli tbs": { distanceBus: 1.5, distanceBike: 1.5, durationBus: 15, durationBike: 15, fareBus: 5 },
      "kullanchavadi": { distanceBus: 34, distanceBike: 34, durationBus: 75, durationBike: 60, fareBus: 35 },
      "alapakkam": { distanceBus: 45, distanceBike: 45, durationBus: 75, durationBike: 65, fareBus: 45 },
      "block 5": { distanceBus: 2.5, distanceBike: 2.5, durationBus: 15, durationBike: 15, fareBus: 5 },
      "perperiyankuppam": { distanceBus: 6, distanceBike: 6, durationBus: 15, durationBike: 15, fareBus: 9 },
      "panruti bus stand": { distanceBus: 26, distanceBike: 26, durationBus: 70, durationBike: 55, fareBus: 30 },
      "o/o supdt of pos": { distanceBus: 45, distanceBike: 45, durationBus: 90, durationBike: 80, fareBus: 40 },
      "block 29": { distanceBus: 3, distanceBike: 3, durationBus: 15, durationBike: 15, fareBus: 5 }
    };

    for (const [key, val] of Object.entries(specs)) {
      if (t.includes(key)) {
        return val;
      }
    }

    return { distanceBus: 15, distanceBike: 15, durationBus: 25, durationBike: 20, fareBus: 15 };
  }

  // Fallback / standard
  const searchT = t;
  const isDirectStart = ["vadalur so", "kullanchavadi so", "alapakkam so", "cn palayam so", "cuddalore ot so", "cuddalore ot bazaar so"].includes(searchT);
  let dur = 30;
  const listToSearch = PROFILE_1_OFFICES;
  const matchedOriginalName = listToSearch.find(o => o.toLowerCase() === searchT) || toOffice;
  
  if (isDirectStart) {
    dur = DIRECT_DURATIONS[matchedOriginalName] || 30;
  } else {
    const mapping = HUB_MAPPING[matchedOriginalName];
    const hubName = mapping?.bsName || 'CUDDALORE BUS STAND';
    const spokeTime = SPOKE_DURATIONS[matchedOriginalName] || 15;
    dur = (HUB_DURATIONS[hubName] || 60) + spokeTime;
  }
  const durBus = Math.max(5, dur - 10);
  const baseDistance = DIRECT_DISTANCES[matchedOriginalName] || 35;
  const distBus = Math.max(0, baseDistance - 5);

  return {
    distanceBus: distBus,
    distanceBike: distBus,
    durationBus: durBus,
    durationBike: durBus,
  };
};

const OFFICE_DATABASE = PROFILE_1_OFFICES;

const HOLIDAYS: Record<string, string> = {
  "01.01.2025": "NEW YEAR",
  "14.01.2025": "PONGAL",
  "15.01.2025": "THIRUVALLUVAR DAY",
  "16.01.2025": "UZHAVAR THIRUNAL",
  "26.01.2025": "REPUBLIC DAY",
  "31.03.2025": "TELUGU NEW YEAR",
  "14.04.2025": "TAMIL NEW YEAR",
  "01.05.2025": "MAY DAY",
  "15.08.2025": "INDEPENDENCE DAY",
  "02.10.2025": "GANDHI JAYANTHI",
  "20.10.2025": "AYUTHA POOJA",
  "21.10.2025": "VIJAYA DASAMI",
  "25.12.2025": "CHRISTMAS",
  // 2026 Holidays as specified in the user's image
  "26.01.2026": "REPUBLIC DAY",
  "21.03.2026": "ID-UL-FITR",
  "31.03.2026": "MAHAVIR JAYANTI",
  "03.04.2026": "GOOD FRIDAY",
  "01.05.2026": "BUDDHA PURNIMA",
  "27.05.2026": "ID-UL-ZUHA",
  "26.06.2026": "MUHARRAM",
  "15.08.2026": "INDEPENDENCE DAY",
  "26.08.2026": "PROPHET MOHAMMAD'S BIRTHDAY (ID-E-MILAD)",
  "02.10.2026": "MAHATMA GANDHI'S BIRTHDAY",
  "20.10.2026": "DUSSEHRA (VIJAY DASHMI)",
  "08.11.2026": "DIWALI (DEEPAVALI)",
  "24.11.2026": "GURU NANAK'S BIRTHDAY",
  "25.12.2026": "CHRISTMAS DAY"
};

const CUDDALORE_CLUSTER = [
  "Cuddalore DO", 
  "Manjakuppam SO", 
  "Fort St David SO", 
  "Cuddalore Public Offices SO", 
  "Cuddalore HO", 
  "Tirupadiripuliyur SO", 
  "Tirupadiripuliyur West SO",
  "Vandipalayam SO",
  "Tiruvendhipuram SO"
];

const DIRECT_DISTANCES: Record<string, number> = {
  "Vadalur SO": 5, "Kurinjipadi SO": 0, "Kullanchavadi SO": 15, "Alapakkam SO": 22, "CN Palayam SO": 20,
  "Sipcot SO": 29, "Cuddalore OT SO": 25, "Cuddalore OT Bazaar SO": 26, "Tirupadiripuliyur SO": 33,
  "Tirupadiripuliyur West SO": 34, "Vandipalayam SO": 33.5, "Tiruvendhipuram SO": 34, "Cuddalore HO": 32,
  "Cuddalore DO": 32, "Manjakuppam SO": 34.5, "Nellikkuppam SO": 34, "Kondur SO": 35,
  "Melpattambakkam SO": 29, "Kilkavarapattu SO": 26, "Cuddalore Public Offices SO": 32,
  "Varakkalpattu SO": 39, "Nellikkuppam Bazzar SO": 35,
  "Chidambaram HO": 27, "Fort St David SO": 34
};

const DIRECT_DURATIONS: Record<string, number> = {
  "Vadalur SO": 15, "Kullanchavadi SO": 20, "CN Palayam SO": 40, "Alapakkam SO": 35,
  "Cuddalore OT SO": 40, "Cuddalore OT Bazaar SO": 45, "Cuddalore HO": 50, "Tirupadiripuliyur SO": 50, "Nellikkuppam SO": 50,
  "Chidambaram HO": 45, "Fort St David SO": 55, "Cuddalore Public Offices SO": 50,
  "Tirupadiripuliyur West SO": 50, "Vandipalayam SO": 50, "Tiruvendhipuram SO": 50
};

const HUB_DURATIONS: Record<string, number> = { "CUDDALORE BUS STAND": 60, "CUDDALORE OT BUS STAND": 50, "PANRUTI BUS STAND": 40 };
const SPOKE_DURATIONS: Record<string, number> = {
  "Cuddalore HO": 10, "Tiruvendhipuram SO": 20, "Vandipalayam SO": 20, "Manjakuppam SO": 10,
  "Cuddalore DO": 10, "Kondur SO": 15, "Varakkalpattu SO": 15, "Nellikkuppam SO": 30,
  "Melpattambakkam SO": 30, "Tirupadiripuliyur SO": 10, "Tirupadiripuliyur West SO": 15,
  "Sipcot SO": 15, "Kilkavarapattu SO": 20, "Nellikkuppam Bazzar SO": 30, "Kurinjipadi SO": 60,
  "Kullanchavadi SO": 60, "Alapakkam SO": 60
};

const HUB_MAPPING: Record<string, { bsName: string, hubKm: number, spokeKm: number }> = {
  "Cuddalore HO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 2 },
  "Cuddalore DO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 2.5 },
  "Tiruvendhipuram SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 7 },
  "Vandipalayam SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 3.5 },
  "Manjakuppam SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 4 },
  "Kondur SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 5 },
  "Varakkalpattu SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 9 },
  "Nellikkuppam SO": { bsName: "PANRUTI BUS STAND", hubKm: 25, spokeKm: 13 },
  "Melpattambakkam SO": { bsName: "PANRUTI BUS STAND", hubKm: 25, spokeKm: 9 },
  "Kilkavarapattu SO": { bsName: "PANRUTI BUS STAND", hubKm: 25, spokeKm: 6 },
  "Nellikkuppam Bazzar SO": { bsName: "PANRUTI BUS STAND", hubKm: 25, spokeKm: 14 },
  "Sipcot SO": { bsName: "CUDDALORE OT BUS STAND", hubKm: 30, spokeKm: 4 },
  "Tirupadiripuliyur SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 3 },
  "Tirupadiripuliyur West SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 3.5 },
  "Cuddalore Public Offices SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 2 },
  "Fort St David SO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 4 }
};

const SPOKE_TO_HUB_BUS: Record<string, number> = {
  "Kurinjipadi SO": 35, "Kullanchavadi SO": 35, "Alapakkam SO": 35, "Cuddalore HO": 2, "Cuddalore DO": 2.5,
  "Tiruvendhipuram SO": 7, "Vandipalayam SO": 3.5, "Manjakuppam SO": 4, "Kondur SO": 7, "Varakkalpattu SO": 9,
  "Nellikkuppam SO": 13, "Melpattambakkam SO": 10, "Kilkavarapattu SO": 6, "CN Palayam SO": 21,
  "Sipcot SO": 4, "Cuddalore OT SO": 5, "Cuddalore OT Bazaar SO": 5, "Tirupadiripuliyur SO": 3,
  "Tirupadiripuliyur West SO": 3.5, "Fort St David SO": 4, "Cuddalore Public Offices SO": 2
};

const SPECIAL_SPOKE_MODES: Record<string, string> = { 
  // By user request, these modes are user specific (fetched from user-selected bus or bike)
};

const INTER_OFFICE_DATA: Record<string, Record<string, { km: string, mode?: string, dur?: number, fare?: number }>> = {
  "Kurinjipadi SO": { "Kullanchavadi SO": { km: "15", dur: 20 }, "Alapakkam SO": { km: "22", dur: 35 }, "Cuddalore OT SO": { km: "25", dur: 40 }, "Cuddalore OT Bazaar SO": { km: "25", dur: 40 }, "CN Palayam SO": { km: "20", dur: 40 }, "Cuddalore HO": { km: "32", dur: 50 } },
  "Kullanchavadi SO": { "Kurinjipadi SO": { km: "15", dur: 20 }, "Alapakkam SO": { km: "7", dur: 20 }, "Cuddalore OT SO": { km: "10", dur: 20 }, "Cuddalore OT Bazaar SO": { km: "10", dur: 20 }, "CN Palayam SO": { km: "20", dur: 40 }, "Cuddalore HO": { km: "17", dur: 30 } },
  "Alapakkam SO": { "Kullanchavadi SO": { km: "7", dur: 20 }, "Kurinjipadi SO": { km: "22", dur: 30 }, "Cuddalore OT SO": { km: "15", dur: 20 }, "Cuddalore OT Bazaar SO": { km: "15", dur: 20 }, "CN Palayam SO": { km: "27", dur: 50 }, "Cuddalore HO": { km: "20", dur: 35 } },
  "Cuddalore OT SO": { "Cuddalore OT Bazaar SO": { km: "0.5", dur: 10, mode: "WALK" }, "Kurinjipadi SO": { km: "25", dur: 40 }, "Kullanchavadi SO": { km: "10", dur: 20 }, "Alapakkam SO": { km: "14", dur: 30 }, "Cuddalore HO": { km: "7", dur: 25 } },
  "Cuddalore OT Bazaar SO": { "Tirupadiripuliyur SO": { km: "5", dur: 10 }, "Cuddalore OT SO": { km: "0.5", dur: 10, mode: "WALK" }, "Kurinjipadi SO": { km: "25", dur: 40 }, "Kullanchavadi SO": { km: "10", dur: 20 }, "Cuddalore HO": { km: "7", dur: 25 } },
  "Fort St David SO": { "Cuddalore DO": { km: "1.5", dur: 5 }, "Cuddalore HO": { km: "3.5", dur: 15 }, "Cuddalore Public Offices SO": { km: "1.5", dur: 5 } },
  "Cuddalore DO": { "Cuddalore HO": { km: "2", dur: 10 }, "Fort St David SO": { km: "1.5", dur: 5 }, "Cuddalore Public Offices SO": { km: "2", dur: 10 }, "Kondur SO": { km: "5", dur: 15 }, "Tirupadiripuliyur SO": { km: "2", dur: 10 }, "Nellikkuppam SO": { km: "13", dur: 30 } },
  "Cuddalore Public Offices SO": { "Fort St David SO": { km: "3", dur: 5 }, "Cuddalore HO": { km: "2", dur: 5 }, "Cuddalore DO": { km: "1.5", dur: 10 } },
  "Cuddalore HO": { "Cuddalore DO": { km: "2", dur: 10 }, "Manjakuppam SO": { km: "2", dur: 10 }, "Varakkalpattu SO": { km: "7", dur: 30 }, "Vandipalayam SO": { km: "5", dur: 15 }, "Cuddalore OT SO": { km: "7", dur: 25 }, "Tirupadiripuliyur West SO": { km: "4", dur: 15 }, "Tirupadiripuliyur SO": { km: "2", dur: 10 }, "Kondur SO": { km: "5", dur: 15 }, "Fort St David SO": { km: "4", dur: 15 }, "Cuddalore Public Offices SO": { km: "2", dur: 10 }, "Nellikkuppam SO": { km: "11", dur: 30 } },
  "Vandipalayam SO": { "Tiruvendhipuram SO": { km: "4", dur: 15 }, "Tirupadiripuliyur West SO": { km: "3", dur: 10 }, "Tirupadiripuliyur SO": { km: "3", dur: 10 }, "Cuddalore HO": { km: "5.5", dur: 15 } },
  "Tiruvendhipuram SO": { "Tirupadiripuliyur SO": { km: "6", dur: 15 }, "Tirupadiripuliyur West SO": { km: "2", dur: 10 }, "CN Palayam SO": { km: "14", dur: 30 }, "Cuddalore HO": { km: "9", dur: 15 } },
  "Nellikkuppam Bazzar SO": { "Nellikkuppam SO": { km: "1", dur: 5 }, "Melpattambakkam SO": { km: "5", dur: 15 }, "Kilkavarapattu SO": { km: "10", dur: 25 }, "Kondur SO": { km: "7", dur: 20 }, "Cuddalore HO": { km: "11", dur: 30 } },
  "Varakkalpattu SO": { "Nellikkuppam SO": { km: "5", dur: 15 }, "Melpattambakkam SO": { km: "5", dur: 15 }, "Kilkavarapattu SO": { km: "10", dur: 25 }, "Kondur SO": { km: "4", dur: 10 }, "Nellikkuppam Bazzar SO": { km: "4", dur: 10 }, "Cuddalore HO": { km: "7", dur: 15 } },
  "Nellikkuppam SO": { "Kondur SO": { km: "8", dur: 20 }, "Kilkavarapattu SO": { km: "11", dur: 30 }, "Cuddalore HO": { km: "11", dur: 30 }, "Melpattambakkam SO": { km: "5", dur: 20 } },
  "Kondur SO": { "Nellikkuppam SO": { km: "8", dur: 20 }, "Kilkavarapattu SO": { km: "12", dur: 30 }, "Nellikkuppam Bazzar SO": { km: "7", dur: 20 }, "Melpattambakkam SO": { km: "8", dur: 20 }, "Varakkalpattu SO": { km: "4", dur: 10 }, "Cuddalore HO": { km: "5", dur: 15 } },
  "Melpattambakkam SO": { "Nellikkuppam SO": { km: "5", dur: 20 }, "Kilkavarapattu SO": { km: "5", dur: 15 }, "Nellikkuppam Bazzar SO": { km: "5", dur: 15 }, "Kondur SO": { km: "8", dur: 20 }, "Varakkalpattu SO": { km: "5", dur: 15 }, "Cuddalore HO": { km: "15", dur: 30 } },
  "Kilkavarapattu SO": { "Melpattambakkam SO": { km: "5", dur: 15 }, "Nellikkuppam SO": { km: "11", dur: 30 }, "Nellikkuppam Bazzar SO": { km: "10", dur: 25 }, "Kondur SO": { km: "12", dur: 30 }, "Varakkalpattu SO": { km: "10", dur: 25 } },
  "Sipcot SO": { "Cuddalore HO": { km: "11", dur: 20 } },
  "Tirupadiripuliyur SO": { "Cuddalore HO": { km: "2", dur: 5 } },
  "Tirupadiripuliyur West SO": { "Cuddalore HO": { km: "5", dur: 10 } },
  "Manjakuppam SO": { "Cuddalore HO": { km: "2.5", dur: 10 } },
  "CN Palayam SO": { "Cuddalore HO": { km: "22", dur: 40 } },

  // Muthvel R (Neyveli 3 S.O Base) Route Mappings
  "Neyveli 3 S.O": {
    "Neyveli 2 S.O": { km: "17", dur: 30, mode: "Bike", fare: 15 },
    "Neyveli TS 2 S.O": { km: "10", dur: 20, mode: "Bike", fare: 12 },
    "Gandhinagar S.O": { km: "12", dur: 30, mode: "Bike", fare: 15 },
    "Neyveli Second MineS.O": { km: "14", dur: 20, mode: "Bike", fare: 12 },
    "Block 10,neyveli S.O": { km: "2", dur: 15, mode: "Bike", fare: 5 },
    "Neyveli 1 S.O": { km: "4", dur: 15, mode: "Bike", fare: 5 },
    "Panruti West S.O": { km: "28", dur: 75, mode: "Bus", fare: 35 },
    "Anathur S.O": { km: "38", dur: 90, mode: "Bus", fare: 42 },
    "Panruti S.O": { km: "26", dur: 70, mode: "Bus", fare: 30 },
    "Block 18 Neyveli S.O": { km: "1.5", dur: 15, mode: "Bike", fare: 5 },
    "Block 26 Neyveli S.O": { km: "2", dur: 15, mode: "Bike", fare: 5 },
    "Tiruthuraiyur S.O": { km: "35", dur: 90, mode: "Bus", fare: 32 },
    "Puthupet (CDL) S.O": { km: "33", dur: 75, mode: "Bus", fare: 37 },
    "Block 1 Neyveli S.O": { km: "6", dur: 15, mode: "Bike", fare: 5 },
    "Panruti East S.O": { km: "33", dur: 80, mode: "Bus", fare: 37 },
    "Kadambuliyur S.O": { km: "18", dur: 30, mode: "Bus", fare: 20 },
    "Neyveli TBS S.O": { km: "1.5", dur: 15, mode: "Bike", fare: 5 },
    "Block 5, Neyveli S.O": { km: "2.5", dur: 15, mode: "Bike", fare: 5 },
    "Perperiyankuppam S.O": { km: "6", dur: 15, mode: "Bus", fare: 9 },
    "Block 29 Neyveli S.O": { km: "3", dur: 15, mode: "Bike", fare: 5 }
  },
  "Neyveli Second MineS.O": {
    "Neyveli 2 S.O": { km: "14", dur: 25, mode: "Bike" },
    "Neyveli 3 S.O": { km: "14", dur: 20, mode: "Bike", fare: 12 }
  },
  "Block 10,neyveli S.O": {
    "Neyveli 1 S.O": { km: "2", dur: 10, mode: "Bike" },
    "Block 18 Neyveli S.O": { km: "2", dur: 15, mode: "Bike" },
    "Gandhinagar S.O": { km: "8", dur: 20, mode: "Bike" },
    "Neyveli 3 S.O": { km: "4", dur: 15, mode: "Bike", fare: 5 }
  },
  "Block 18 Neyveli S.O": {
    "Block 10,neyveli S.O": { km: "2", dur: 15, mode: "Bike" },
    "Neyveli 1 S.O": { km: "2.5", dur: 15, mode: "Bike" },
    "Neyveli 3 S.O": { km: "1.5", dur: 15, mode: "Bike", fare: 5 }
  },
  "Block 29 Neyveli S.O": {
    "Block 18 Neyveli S.O": { km: "4.5", dur: 20, mode: "Bike" },
    "Neyveli 1 S.O": { km: "7", dur: 25, mode: "Bike" },
    "Neyveli 3 S.O": { km: "3", dur: 15, mode: "Bike", fare: 5 }
  },
  "Panruti West S.O": {
    "Anathur S.O": { km: "10", dur: 15, mode: "Bus", fare: 12 },
    "Panruti East S.O": { km: "3.5", dur: 15, mode: "Bus", fare: 7 },
    "Neyveli 3 S.O": { km: "28", dur: 75, mode: "Bus", fare: 35 }
  },
  "Anathur S.O": {
    "Panruti S.O": { km: "12", dur: 30, mode: "Bus", fare: 12 },
    "Tiruthuraiyur S.O": { km: "11", dur: 25, mode: "Bus", fare: 15 },
    "Neyveli 3 S.O": { km: "38", dur: 90, mode: "Bus", fare: 42 }
  },
  "Tiruthuraiyur S.O": {
    "Puthupet (CDL) S.O": { km: "5", dur: 15, mode: "Bus", fare: 6 },
    "Panruti East S.O": { km: "6", dur: 35, mode: "Bus", fare: 12 },
    "Panruti West S.O": { km: "8", dur: 20, mode: "Bus", fare: 12 },
    "Neyveli 3 S.O": { km: "35", dur: 90, mode: "Bus", fare: 32 }
  },
  "Kadambuliyur S.O": {
    "Gandhinagar S.O": { km: "8", dur: 20, mode: "Bike" },
    "Neyveli 3 S.O": { km: "18", dur: 30, mode: "Bus", fare: 20 }
  },
  "Gandhinagar S.O": {
    "Neyveli 3 S.O": { km: "12", dur: 30, mode: "Bike", fare: 15 }
  },
  "Neyveli 2 S.O": {
    "Neyveli Second MineS.O": { km: "3", dur: 15, mode: "Bike" },
    "Neyveli 3 S.O": { km: "17", dur: 30, mode: "Bike", fare: 15 }
  },
  "Puthupet (CDL) S.O": {
    "Perperiyankuppam S.O": { km: "28", dur: 50, mode: "Bus", fare: 32 },
    "Neyveli 3 S.O": { km: "33", dur: 75, mode: "Bus", fare: 37 }
  },
  "Panruti S.O": {
    "Panruti East S.O": { km: "5", dur: 15, mode: "Bus", fare: 7 }
  },
  "Panruti East S.O": {
    "Neyveli 3 S.O": { km: "33", dur: 80, mode: "Bus", fare: 37 }
  }
};

const addMinutesToTime = (time: string, minutes: number): string => {
  if (!time) return "09:00";
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + Math.round(minutes);
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const isSystemDefaultProfile = (profileName: string): boolean => {
  return profileName === "Default Profile" || profileName === "Karikalvalavan R" || !profileName;
};

const getProfileStorageKey = (profileName: string, suffixKey: string): string => {
  if (isSystemDefaultProfile(profileName)) {
    return `diary_${suffixKey}`;
  }
  return `diary_profile_${profileName}_${suffixKey}`;
};

const App: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    const saved = localStorage.getItem('diary_active_profile');
    if (!saved) {
      return "Default Profile";
    }
    return saved;
  });

  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('diary_profiles_list');
      if (!saved) {
        const initialList = ["Default Profile"];
        localStorage.setItem('diary_profiles_list', JSON.stringify(initialList));
        return initialList;
      }
      let parsed = JSON.parse(saved) as string[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return ["Default Profile"];
      }
      return parsed;
    } catch {
      return ["Default Profile"];
    }
  });

  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [bikeOptBackup, setBikeOptBackup] = useState<any | null>(() => {
    try {
      const activeP = localStorage.getItem('diary_active_profile') || "Default Profile";
      const key = getProfileStorageKey(activeP, 'bike_opt_backup');
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const key = getProfileStorageKey(activeProfile, 'bike_opt_backup');
      const saved = localStorage.getItem(key);
      if (saved) {
        setBikeOptBackup(JSON.parse(saved));
      } else {
        setBikeOptBackup(null);
      }
    } catch {
      setBikeOptBackup(null);
    }
  }, [activeProfile]);

  const loadedProfileRef = useRef<string>(
    localStorage.getItem('diary_active_profile') || "Default Profile"
  );

  const [metadata, setMetadata] = useState<DiaryMetadata>(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentFortnight = currentDay <= 15 ? 'first' : 'second';
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(currentDay)}.${pad(currentMonth + 1)}.${currentYear}`;

    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";

    let dName = '';
    let dDesig = 'System Administrator';
    let dOffice = getProfileAttachedOffice(actProf);
    if (actProf === "Karikalvalavan R") {
      dName = "R. Karikalvalavan";
      dOffice = "Cuddalore HO";
    } else if (actProf === "Muthvel R") {
      dName = "R. Muthuvel";
    } else if (actProf === "Sivaraj S") {
      dName = "S. Sivaraj";
    } else if (actProf === "Default Profile") {
      dName = "";
      dOffice = "";
    } else {
      dName = actProf;
    }

    const defaultMeta = {
      name: dName,
      designation: dDesig,
      office: dOffice,
      submissionDate: todayStr,
      submissionPlace: dOffice,
      month: currentMonth,
      year: currentYear,
      fortnight: currentFortnight,
    };

    const key = getProfileStorageKey(actProf, 'metadata');
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultMeta,
          ...parsed,
          month: currentMonth,
          year: currentYear,
          fortnight: currentFortnight,
          submissionDate: todayStr,
        };
      } catch (e) {
        // Fallback
      }
    }

    return defaultMeta;
  });

  const isCurrentProfileLocked = useMemo(() => {
    return false;
  }, []);



  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSelection, setClearSelection] = useState({
    workFormDraft: false,
    savedFortnightlySummary: false,
    scrData: false,
    allProfileData: false
  });
  const [clearStep, setClearStep] = useState<'options' | 'fortnight'>('options');
  const [clearFortnight, setClearFortnight] = useState<'first' | 'second'>('first');
  const [clearMonth, setClearMonth] = useState<number>(0);
  const [clearYear, setClearYear] = useState<number>(2026);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    accentColor?: 'blue' | 'rose' | 'emerald';
  } | null>(null);
  const [showTABillModal, setShowTABillModal] = useState(false);
  const [taBillPay, setTaBillPay] = useState('38100+others');
  const [taBillAdvance, setTaBillAdvance] = useState('');
  const [taBillMonth, setTaBillMonth] = useState<number>(0);
  const [taBillYear, setTaBillYear] = useState<number>(2026);

  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [showExportDiaryModal, setShowExportDiaryModal] = useState(false);
  const [exportDiaryMonth, setExportDiaryMonth] = useState<number>(0);
  const [exportDiaryYear, setExportDiaryYear] = useState<number>(2026);

  // Diary Reminder Notification States & Logic
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('diary_notif_enabled');
    return saved ? saved === 'true' : false;
  });
  const [notifFrequency, setNotifFrequency] = useState<string>(() => {
    return localStorage.getItem('diary_notif_frequency') || 'mon_to_sat'; // DEFAULT is Monday to Saturday
  });
  const [notifTimesPerDay, setNotifTimesPerDay] = useState<number>(() => {
    const saved = localStorage.getItem('diary_notif_times_per_day');
    return saved ? parseInt(saved, 10) : 1; // Default to 1 time per day
  });
  const [notifTime1, setNotifTime1] = useState<string>(() => {
    return localStorage.getItem('diary_notif_time1') || '13:00';
  });
  const [notifTime2, setNotifTime2] = useState<string>(() => {
    return localStorage.getItem('diary_notif_time2') || '18:00';
  });
  const [notifTime3, setNotifTime3] = useState<string>(() => {
    return localStorage.getItem('diary_notif_time3') || '21:00';
  });
  const [showNotifSetupModal, setShowNotifSetupModal] = useState<boolean>(() => {
    const configured = localStorage.getItem('diary_notif_configured');
    return !configured;
  });
  const [inAppToast, setInAppToast] = useState<{ show: boolean; title: string; message: string } | null>(null);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support system notifications.");
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const triggerActualNotification = (triggeredTime?: string) => {
    const title = "SA's Diary Reminder 📝";
    const message = triggeredTime 
      ? `It is now ${triggeredTime}! Time to log your activities, transit movements, and services in your Work Diary.`
      : "Time to log today's activities, transit movements, and services in your Work Diary!";
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/logo-sa-diary-192.png',
          badge: '/logo-sa-diary-192.png',
          tag: `diary-reminder-${triggeredTime || 'any'}`
        });
      } catch (e) {
        console.warn("Failed to create native notification, showing in-app", e);
      }
    }

    setInAppToast({
      show: true,
      title,
      message
    });
  };

  // Notification Timer Loop
  useEffect(() => {
    if (!notifEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;

      const activeTimes: string[] = [];
      if (notifTimesPerDay >= 1) activeTimes.push(notifTime1);
      if (notifTimesPerDay >= 2) activeTimes.push(notifTime2);
      if (notifTimesPerDay >= 3) activeTimes.push(notifTime3);

      if (activeTimes.includes(currentTimeString)) {
        const todayStr = now.toDateString();
        const storageKey = `diary_notif_last_triggered_${currentTimeString}`;
        const lastTriggered = localStorage.getItem(storageKey);

        if (lastTriggered !== todayStr) {
          let shouldTrigger = false;
          const day = now.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday

          if (notifFrequency === 'mon_to_sat') {
            shouldTrigger = day >= 1 && day <= 6; // Monday to Saturday
          } else if (notifFrequency === 'daily') {
            shouldTrigger = true;
          } else if (notifFrequency === 'weekday') {
            shouldTrigger = day >= 1 && day <= 5;
          } else if (notifFrequency === 'weekly_sat') {
            shouldTrigger = day === 6;
          } else if (notifFrequency === 'weekly_sun') {
            shouldTrigger = day === 0;
          }

          if (shouldTrigger) {
            localStorage.setItem(storageKey, todayStr);
            triggerActualNotification(currentTimeString);
          }
        }
      }
    }, 15000); // Check every 15 seconds to be precise

    return () => clearInterval(interval);
  }, [notifEnabled, notifTimesPerDay, notifTime1, notifTime2, notifTime3, notifFrequency]);
  const [exportDiaryFortnight, setExportDiaryFortnight] = useState<'first' | 'second'>('first');

  const [showExportTAModal, setShowExportTAModal] = useState(false);
  const [exportTAMonth, setExportTAMonth] = useState<number>(0);
  const [exportTAYear, setExportTAYear] = useState<number>(2026);
  const [exportTAFormat, setExportTAFormat] = useState<'excel' | 'word'>('excel');

  // Direct Cross-Device Sync State (Mobile <-> PC)
  const detectedDevice = useMemo(() => {
    if (typeof window === 'undefined') return 'PC';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'PC';
  }, []);

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    hasData: boolean;
    updatedAt: number;
    device: string | null;
    profileName: string | null;
  }>({ hasData: false, updatedAt: 0, device: null, profileName: null });
  const [lastLocalSyncTime, setLastLocalSyncTime] = useState<number>(() => {
    const saved = localStorage.getItem('diary_last_cloud_sync_time');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [hasNewCloudData, setHasNewCloudData] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error' | 'info'; message: string; sub?: string } | null>(null);

  // User-Selected Operating Mode: 'online' vs 'offline'
  const [operatingMode, setOperatingMode] = useState<'online' | 'offline'>(() => {
    try {
      const saved = localStorage.getItem('diary_operating_mode');
      if (saved === 'offline' || saved === 'online') return saved;
    } catch (e) {}
    return 'online';
  });

  const handleSetOperatingMode = useCallback((mode: 'online' | 'offline') => {
    setOperatingMode(mode);
    try {
      localStorage.setItem('diary_operating_mode', mode);
    } catch (e) {}
    if (mode === 'offline') {
      setSyncToast({
        type: 'info',
        message: 'Switched to Offline Mode',
        sub: 'Working 100% locally on this device. Cloud sync is paused.'
      });
      setTimeout(() => setSyncToast(null), 4000);
    } else {
      setSyncToast({
        type: 'success',
        message: 'Switched to Online Mode',
        sub: 'Cloud synchronization & cross-device PIN transfers enabled.'
      });
      setTimeout(() => setSyncToast(null), 4000);
    }
  }, []);

  // 6-Digit PIN Cloud Sync Modal states
  const [showPinSyncModal, setShowPinSyncModal] = useState(false);
  const [pinSyncInitialMode, setPinSyncInitialMode] = useState<'upload' | 'download'>('upload');
  const [showOfflinePackageModal, setShowOfflinePackageModal] = useState(false);

  // Auto-detect incoming PIN parameters on mount (e.g. ?pin=123456)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pinFromUrl = urlParams.get('pin') || urlParams.get('qrPin') || urlParams.get('importPin');
      if (pinFromUrl) {
        setPinSyncInitialMode('download');
        setShowPinSyncModal(true);
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn("URL query param parse error", e);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'profile' | 'scr' | 'entry' | 'summary' | 'movements' | 'database'>('entry');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedHistoricalMonth, setSelectedHistoricalMonth] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const availableDays = useMemo(() => getFortnightDays(metadata.year, metadata.month, metadata.fortnight), [metadata.year, metadata.month, metadata.fortnight]);

  const [activities, setActivities] = useState<ActivityEntry[]>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "activities");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const [movements, setMovements] = useState<MovementEntry[]>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "movements");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  const mergeInterOfficeIntoOffices = (currentOffices: OfficeDatabaseEntry[], incomingInterOffice: any[]): OfficeDatabaseEntry[] => {
    const merged = [...currentOffices];
    incomingInterOffice.forEach(interItem => {
      const exists = merged.some(m => 
        (m.fromOffice.toLowerCase().replace(/\s+/g, '') === interItem.fromOffice.toLowerCase().replace(/\s+/g, '') &&
         m.toOffice.toLowerCase().replace(/\s+/g, '') === interItem.toOffice.toLowerCase().replace(/\s+/g, '')) ||
        (m.fromOffice.toLowerCase().replace(/\s+/g, '') === interItem.toOffice.toLowerCase().replace(/\s+/g, '') &&
         m.toOffice.toLowerCase().replace(/\s+/g, '') === interItem.fromOffice.toLowerCase().replace(/\s+/g, ''))
      );
      if (!exists) {
        merged.push({
          fromOffice: interItem.fromOffice,
          toOffice: interItem.toOffice,
          distanceBus: interItem.distanceBus ?? interItem.distanceBike ?? 0,
          distanceBike: interItem.distanceBike ?? interItem.distanceBus ?? 0,
          durationBus: interItem.durationBus ?? interItem.durationBike ?? 0,
          durationBike: interItem.durationBike ?? interItem.durationBus ?? 0,
          viaBusStand: interItem.viaBusStand,
          fromOfficeToBsKm: interItem.fromOfficeToBsKm,
          fromOfficeToBsMins: interItem.fromOfficeToBsMins,
          toOfficeToBsKm: interItem.toOfficeToBsKm,
          toOfficeToBsMins: interItem.toOfficeToBsMins,
          fareBus: interItem.fareBus,
          fromOfficeToBsFare: interItem.fromOfficeToBsFare,
          toOfficeToBsFare: interItem.toOfficeToBsFare,
          transportModeOverriding: interItem.transportModeOverriding
        });
      }
    });
    return merged.sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
  };

  const migrateOfficesDb = (list: OfficeDatabaseEntry[]): OfficeDatabaseEntry[] => {
    if (!Array.isArray(list)) return [];
    const updated = list.map(item => {
      if (!item) return item;
      let cleaned = { ...item };
      if (cleaned.fareBus === 10) {
        cleaned.fareBus = 12;
      }
      // Auto-correct inverted hub/spoke legs where Kilkavarapattu SO is origin via Panruti Bus Stand
      if (
        cleaned.fromOffice?.toLowerCase().includes('kilkavarapattu') &&
        cleaned.viaBusStand?.toLowerCase().includes('panruti') &&
        cleaned.fromOfficeToBsKm !== undefined &&
        cleaned.fromOfficeToBsKm > 10 &&
        cleaned.toOfficeToBsKm === 6
      ) {
        const tempKm = cleaned.fromOfficeToBsKm;
        cleaned.fromOfficeToBsKm = cleaned.toOfficeToBsKm;
        cleaned.toOfficeToBsKm = tempKm;
        const tempMins = cleaned.fromOfficeToBsMins;
        cleaned.fromOfficeToBsMins = cleaned.toOfficeToBsMins;
        cleaned.toOfficeToBsMins = tempMins;
        const tempFare = cleaned.fromOfficeToBsFare;
        cleaned.fromOfficeToBsFare = cleaned.toOfficeToBsFare;
        cleaned.toOfficeToBsFare = tempFare;
      }

      // Ensure Cuddalore HO and Cuddalore DO distance to/from Cuddalore Bus Stand strictly matches the office matrix database:
      // Cuddalore HO <-> Cuddalore Bus Stand is 2 KM
      // Cuddalore DO <-> Cuddalore Bus Stand is 2.5 KM
      if (cleaned.viaBusStand && cleaned.viaBusStand.toLowerCase().includes('cuddalore')) {
        if (tNorm.includes('cuddalore ho')) {
          cleaned.toOfficeToBsKm = 2;
          cleaned.toOfficeToBsMins = cleaned.toOfficeToBsMins || 10;
        }
        if (fNorm.includes('cuddalore ho')) {
          cleaned.fromOfficeToBsKm = 2;
          cleaned.fromOfficeToBsMins = cleaned.fromOfficeToBsMins || 10;
        }
        if (tNorm.includes('cuddalore do')) {
          cleaned.toOfficeToBsKm = 2.5;
          cleaned.toOfficeToBsMins = cleaned.toOfficeToBsMins || 10;
        }
        if (fNorm.includes('cuddalore do')) {
          cleaned.fromOfficeToBsKm = 2.5;
          cleaned.fromOfficeToBsMins = cleaned.fromOfficeToBsMins || 10;
        }
      }

      // Ensure Cuddalore OT SO <-> Cuddalore HO travel duration is strictly 25 minutes
      if (
        (fNorm.includes('cuddalore ot so') && tNorm.includes('cuddalore ho')) ||
        (fNorm.includes('cuddalore ho') && tNorm.includes('cuddalore ot so'))
      ) {
        cleaned.durationBus = 25;
        cleaned.durationBike = 25;
        if (fNorm.includes('cuddalore ho')) {
          cleaned.fromOfficeToBsMins = 10;
          cleaned.toOfficeToBsMins = 15;
          cleaned.fromOfficeToBsKm = 2;
          cleaned.toOfficeToBsKm = 5;
        } else {
          cleaned.fromOfficeToBsMins = 15;
          cleaned.toOfficeToBsMins = 10;
          cleaned.fromOfficeToBsKm = 5;
          cleaned.toOfficeToBsKm = 2;
        }
      }
      return cleaned;
    });

    // Remove any conflicting inverted duplicate where a forward route from Kurinjipadi exists
    const hasForwardKurinKilk = updated.some(e => 
      e.fromOffice?.toLowerCase().includes('kurinjipadi') && e.toOffice?.toLowerCase().includes('kilkavarapattu')
    );
    if (hasForwardKurinKilk) {
      return updated.filter(e => 
        !(e.fromOffice?.toLowerCase().includes('kilkavarapattu') && e.toOffice?.toLowerCase().includes('kurinjipadi'))
      );
    }
    return updated;
  };

  const getDefaultOfficesAndInterOfficesList = (profileName: string, targetAttachedOffice?: string): OfficeDatabaseEntry[] => {
    const activeAttached = targetAttachedOffice || getProfileAttachedOffice(profileName);
    const baseList = getProfileBaseOffices(profileName);
    const list: OfficeDatabaseEntry[] = baseList.map(name => {
      const specs = getDefaultOfficeSpecs(activeAttached, name);
      const mapping = HUB_MAPPING[name];
      const spokeTime = SPOKE_DURATIONS[name] || 0;

      return {
        fromOffice: activeAttached,
        toOffice: name,
        distanceBus: specs.distanceBus,
        distanceBike: specs.distanceBike,
        durationBus: specs.durationBus,
        durationBike: specs.durationBike,
        viaBusStand: mapping?.bsName || '',
        fromOfficeToBsKm: mapping ? (SPOKE_TO_HUB_BUS[activeAttached] || 35) : 0,
        fromOfficeToBsMins: mapping ? (SPOKE_DURATIONS[activeAttached] || 60) : 0,
        toOfficeToBsKm: mapping?.spokeKm || 0,
        toOfficeToBsMins: spokeTime,
        fareBus: (specs as any).fareBus === 10 ? 12 : (specs as any).fareBus
      };
    });

    const baseOfficesSet = new Set(getProfileBaseOffices(profileName).map(o => o.toLowerCase().trim()));
    baseOfficesSet.add(activeAttached.toLowerCase().trim());

    Object.entries(INTER_OFFICE_DATA).forEach(([fromOffice, toOffices]) => {
      if (!baseOfficesSet.has(fromOffice.toLowerCase().trim())) return;

      Object.entries(toOffices).forEach(([toOffice, spec]) => {
        if (!baseOfficesSet.has(toOffice.toLowerCase().trim())) return;

        const exists = list.some(m => 
          (m.fromOffice.toLowerCase().replace(/\s+/g, '') === fromOffice.toLowerCase().replace(/\s+/g, '') &&
           m.toOffice.toLowerCase().replace(/\s+/g, '') === toOffice.toLowerCase().replace(/\s+/g, '')) ||
          (m.fromOffice.toLowerCase().replace(/\s+/g, '') === toOffice.toLowerCase().replace(/\s+/g, '') &&
           m.toOffice.toLowerCase().replace(/\s+/g, '') === fromOffice.toLowerCase().replace(/\s+/g, ''))
        );
        if (exists) return;

        const valKm = parseFloat(spec.km) || 0;
        const mapFrom = HUB_MAPPING[fromOffice];
        const mapTo = HUB_MAPPING[toOffice];
        const sameBs = mapFrom && mapTo && mapFrom.bsName === mapTo.bsName;
        const viaBs = sameBs ? mapFrom.bsName : '';
        const fromBsKm = sameBs ? mapFrom.spokeKm : 0;
        const fromBsMins = sameBs ? (SPOKE_DURATIONS[fromOffice] || 15) : 0;
        const toBsKm = sameBs ? mapTo.spokeKm : 0;
        const toBsMins = sameBs ? (SPOKE_DURATIONS[toOffice] || 15) : 0;

        list.push({
          fromOffice,
          toOffice,
          distanceBike: valKm,
          distanceBus: valKm,
          durationBike: spec.dur || 20,
          durationBus: spec.dur || 20,
          transportModeOverriding: spec.mode || '',
          fareBus: spec.fare === 10 ? 12 : spec.fare,
          viaBusStand: viaBs || undefined,
          fromOfficeToBsKm: viaBs ? fromBsKm : undefined,
          fromOfficeToBsMins: viaBs ? fromBsMins : undefined,
          toOfficeToBsKm: viaBs ? mapTo.spokeKm : undefined,
          toOfficeToBsMins: viaBs ? toBsMins : undefined
        });
      });
    });

    return migrateOfficesDb(list.sort((a, b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice)));
  };

  const [officesDb, setOfficesDb] = useState<OfficeDatabaseEntry[]>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "offices_db");
    const saved = localStorage.getItem(key);
    
    // Also check for saved inter_office_db to automatically consolidate
    const interKey = getProfileStorageKey(actProf, "inter_office_db");
    const savedInter = localStorage.getItem(interKey);

    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let loaded = parsed.map((item: any) => {
            if (item && item.name && !item.fromOffice) {
              const baseAtt = getProfileAttachedOffice(actProf);
              return {
                fromOffice: baseAtt,
                toOffice: item.name,
                distanceBus: item.distanceBus || 0,
                distanceBike: item.distanceBike || 0,
                durationBus: item.durationBus || 0,
                durationBike: item.durationBike || 0
              };
            }
            return item;
          });
          
          if (savedInter) {
            try {
              const parsedInter = JSON.parse(savedInter);
              if (Array.isArray(parsedInter)) {
                loaded = mergeInterOfficeIntoOffices(loaded, parsedInter);
              }
            } catch (e) {}
          }
          return migrateOfficesDb(loaded).sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
        }
      } catch (e) {}
    }
    
    return getDefaultOfficesAndInterOfficesList(actProf);
  });

  const [serviceCalls, setServiceCalls] = useState<ServiceCallReport[]>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "service_calls");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [confirmedScrDays, setConfirmedScrDays] = useState<Record<string, boolean>>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "confirmed_scr_days");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "confirmed_scr_days");
    localStorage.setItem(key, JSON.stringify(confirmedScrDays));
  }, [confirmedScrDays, activeProfile]);

  const [scrDefaults, setScrDefaults] = useState<{
    divisionName: string;
    callGivenBy: string;
    timeIn: string;
    timeOut: string;
    replacementOfSpares: string;
    amountOfSpares: string;
    otherIssues: string;
  }>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "scr_defaults");
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      divisionName: 'Cuddalore Division',
      callGivenBy: 'SPM',
      timeIn: '09:00 hrs',
      timeOut: '17:00 hrs',
      replacementOfSpares: 'None',
      amountOfSpares: 'None',
      otherIssues: 'NSP 2'
    };
  });

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "scr_defaults");
    localStorage.setItem(key, JSON.stringify(scrDefaults));
  }, [scrDefaults, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "service_calls");
    localStorage.setItem(key, JSON.stringify(serviceCalls));
  }, [serviceCalls, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "metadata");
    localStorage.setItem(key, JSON.stringify(metadata));
  }, [metadata, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "activities");
    localStorage.setItem(key, JSON.stringify(activities));
  }, [activities, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "movements");
    localStorage.setItem(key, JSON.stringify(movements));
  }, [movements, activeProfile]);

  const [attachedOffice, setAttachedOffice] = useState<string>(() => {
    const actProf = localStorage.getItem('diary_active_profile') || "Default Profile";
    const key = getProfileStorageKey(actProf, "attached_office");
    return localStorage.getItem(key) || getProfileAttachedOffice(actProf);
  });

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "attached_office");
    localStorage.setItem(key, attachedOffice);
  }, [attachedOffice, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = getProfileStorageKey(activeProfile, "offices_db");
    localStorage.setItem(key, JSON.stringify(officesDb));
  }, [officesDb, activeProfile]);

  const [filterFromOffice, setFilterFromOffice] = useState<string>('');
  const [filterToOffice, setFilterToOffice] = useState<string>('');
  const [officeSearchQuery, setOfficeSearchQuery] = useState<string>('');
  const [officePage, setOfficePage] = useState<number>(1);
  const [officePageSize, setOfficePageSize] = useState<number | 'all'>(25);

  const uniqueFromOffices = useMemo(() => {
    const set = new Set<string>();
    officesDb.forEach(o => {
      if (o.fromOffice) set.add(o.fromOffice.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [officesDb]);

  const uniqueToOffices = useMemo(() => {
    const set = new Set<string>();
    officesDb.forEach(o => {
      if (o.toOffice) set.add(o.toOffice.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [officesDb]);

  const filteredOffices = useMemo(() => {
    const q = officeSearchQuery.trim().toLowerCase();
    return officesDb
      .map((o, originalIdx) => ({ o, originalIdx }))
      .filter(({ o }) => {
        const matchesFrom = !filterFromOffice || o.fromOffice === filterFromOffice;
        const matchesTo = !filterToOffice || o.toOffice === filterToOffice;
        if (!matchesFrom || !matchesTo) return false;
        if (!q) return true;
        const fromMatch = (o.fromOffice || '').toLowerCase().includes(q);
        const toMatch = (o.toOffice || '').toLowerCase().includes(q);
        const viaMatch = (o.viaBusStand || '').toLowerCase().includes(q);
        return fromMatch || toMatch || viaMatch;
      });
  }, [officesDb, filterFromOffice, filterToOffice, officeSearchQuery]);

  const totalOfficePages = useMemo(() => {
    if (officePageSize === 'all') return 1;
    const size = typeof officePageSize === 'number' ? officePageSize : 25;
    return Math.max(1, Math.ceil(filteredOffices.length / size));
  }, [filteredOffices.length, officePageSize]);

  const paginatedOffices = useMemo(() => {
    if (officePageSize === 'all') return filteredOffices;
    const size = typeof officePageSize === 'number' ? officePageSize : 25;
    const start = (officePage - 1) * size;
    return filteredOffices.slice(start, start + size);
  }, [filteredOffices, officePage, officePageSize]);

  const currentMonthStr = useMemo(() => String(metadata.month + 1).padStart(2, '0'), [metadata.month]);
  const currentYearStr = useMemo(() => String(metadata.year), [metadata.year]);

  const currentMonthServiceCalls = useMemo(() => {
    return serviceCalls.filter(sc => {
      if (!sc || !sc.date) return false;
      const parts = sc.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });
  }, [serviceCalls, currentMonthStr, currentYearStr]);

  const currentMonthActivities = useMemo(() => {
    return activities.filter(act => {
      if (!act || !act.date) return false;
      const parts = act.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });
  }, [activities, currentMonthStr, currentYearStr]);

  const currentMonthMovements = useMemo(() => {
    return movements.filter(m => {
      if (!m || !m.date) return false;
      const parts = m.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });
  }, [movements, currentMonthStr, currentYearStr]);

  const currentMonthBikeKM = useMemo(() => {
    return currentMonthMovements
      .filter(m => (m.mode || '').toUpperCase() === 'BIKE')
      .reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);
  }, [currentMonthMovements]);

  const hasBikeOptBackup = useMemo(() => {
    if (!bikeOptBackup) return false;
    return (
      bikeOptBackup.profile === activeProfile &&
      bikeOptBackup.monthStr === currentMonthStr &&
      bikeOptBackup.yearStr === currentYearStr &&
      Array.isArray(bikeOptBackup.activities) &&
      bikeOptBackup.activities.length > 0
    );
  }, [bikeOptBackup, activeProfile, currentMonthStr, currentYearStr]);

  const currentFortnightActivitiesCount = useMemo(() => {
    const keys = new Set(availableDays.map(day => formatDate(day)));
    return activities.filter(act => keys.has(act.date)).length;
  }, [activities, availableDays]);

  const currentFortnightMovements = useMemo(() => {
    const keys = new Set(availableDays.map(day => formatDate(day)));
    return movements.filter(m => keys.has(m.date));
  }, [movements, availableDays]);

  const currentFortnightKM = useMemo(() => {
    return currentFortnightMovements.reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);
  }, [currentFortnightMovements]);

  const totalKM = useMemo(() => {
    return movements.reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);
  }, [movements]);

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatMMYYYY = (mYStr: string) => {
    if (!mYStr) return '';
    const parts = mYStr.split('.');
    if (parts.length !== 2) return mYStr;
    const month = parseInt(parts[0], 10) - 1;
    const year = parseInt(parts[1], 10);
    const date = new Date(year, month, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const historicalMonthsList = useMemo(() => {
    const monthsSet = new Set<string>(); // "MM.YYYY"
    const addDate = (dStr: string) => {
      if (!dStr) return;
      const parts = dStr.split('.');
      if (parts.length === 3) {
        const mY = `${parts[1]}.${parts[2]}`;
        const curMy = `${String(metadata.month + 1).padStart(2, '0')}.${metadata.year}`;
        if (mY !== curMy) {
          monthsSet.add(mY);
        }
      }
    };
    activities.forEach(a => addDate(a.date));
    serviceCalls.forEach(sc => addDate(sc.date));
    movements.forEach(m => addDate(m.date));

    // If empty, add immediately preceding month as fallback
    if (monthsSet.size === 0) {
      let prevMonth = metadata.month - 1;
      let prevYear = metadata.year;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      monthsSet.add(`${String(prevMonth + 1).padStart(2, '0')}.${prevYear}`);
    }

    return Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split('.').map(Number);
      const [mB, yB] = b.split('.').map(Number);
      if (yA !== yB) return yB - yA;
      return mB - mA;
    });
  }, [activities, serviceCalls, movements, metadata.month, metadata.year]);

  useEffect(() => {
    setShowAllMonths(false);
  }, [metadata.month, metadata.year]);

  useEffect(() => {
    if (historicalMonthsList.length > 0 && !historicalMonthsList.includes(selectedHistoricalMonth)) {
      setSelectedHistoricalMonth(historicalMonthsList[0]);
    }
  }, [historicalMonthsList, selectedHistoricalMonth]);

  const historicalMonthServiceCallsCount = useMemo(() => {
    return serviceCalls.filter(sc => {
      if (!sc || !sc.date) return false;
      const parts = sc.date.split('.');
      return parts.length === 3 && `${parts[1]}.${parts[2]}` === selectedHistoricalMonth;
    }).length;
  }, [serviceCalls, selectedHistoricalMonth]);

  const historicalMonthActivitiesCount = useMemo(() => {
    return activities.filter(act => {
      if (!act || !act.date) return false;
      const parts = act.date.split('.');
      return parts.length === 3 && `${parts[1]}.${parts[2]}` === selectedHistoricalMonth;
    }).length;
  }, [activities, selectedHistoricalMonth]);

  const historicalMonthMovements = useMemo(() => {
    return movements.filter(m => {
      if (!m || !m.date) return false;
      const parts = m.date.split('.');
      return parts.length === 3 && `${parts[1]}.${parts[2]}` === selectedHistoricalMonth;
    });
  }, [movements, selectedHistoricalMonth]);

  const historicalMonthKM = useMemo(() => {
    return historicalMonthMovements.reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);
  }, [historicalMonthMovements]);

  const uniqueOfficesList = useMemo(() => {
    const baseList = getProfileBaseOffices(activeProfile);
    const officesSet = new Set<string>();
    baseList.forEach(name => {
      officesSet.add(cleanOfficeSpelling(name));
    });
    officesDb.forEach(o => {
      if (o.fromOffice) officesSet.add(cleanOfficeSpelling(o.fromOffice));
      if (o.toOffice) officesSet.add(cleanOfficeSpelling(o.toOffice));
    });
    return Array.from(officesSet).sort((a, b) => a.localeCompare(b));
  }, [officesDb, activeProfile]);

  useEffect(() => {
    // Migrate Muthuvel's office names in LocalStorage on startup to avoid cached old office names
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;

    // Check if Muthvel's database has any old names or requires alignment
    const keyOfficesMuthvel = "diary_profile_Muthvel R_offices_db";
    const savedOffices = localStorage.getItem(keyOfficesMuthvel);
    
    const alreadyMigrated = localStorage.getItem("diary_profile_Muthvel R_migrated_v2") === "true";
    const isCustomUploaded = localStorage.getItem("diary_profile_Muthvel R_custom_uploaded") === "true";

    let needsMigration = false;
    if (!alreadyMigrated && !isCustomUploaded) {
      if (savedOffices) {
        try {
          const parsed = JSON.parse(savedOffices);
          if (Array.isArray(parsed)) {
            needsMigration = parsed.some((item: any) => 
              item.toOffice === "Neyveli 3" || 
              item.toOffice === "Neyveli 2" || 
              item.fromOffice === "Neyveli 3" ||
              !item.toOffice.endsWith("S.O")
            );
            if (parsed.length !== 20) {
              needsMigration = true;
            }
          }
        } catch (e) {
          needsMigration = true;
        }
      } else {
        needsMigration = true;
      }
    }

    if (needsMigration) {
      const migrateOfficeName = (name: string): string => {
        if (!name) return "";
        const clean = name.trim().replace(/\s+/g, ' ');
        const m: Record<string, string> = {
          "Neyveli 3": "Neyveli 3 S.O",
          "Neyveli 3 SO": "Neyveli 3 S.O",
          "Neyveli 2": "Neyveli 2 S.O",
          "Neyveli 2 SO": "Neyveli 2 S.O",
          "Neyveli TS 2": "Neyveli TS 2 S.O",
          "Neyveli TS 2 SO": "Neyveli TS 2 S.O",
          "Gandhinagar": "Gandhinagar S.O",
          "Gandhinagar SO": "Gandhinagar S.O",
          "Neyveli Second Mine": "Neyveli Second MineS.O",
          "Neyveli Second Mine SO": "Neyveli Second MineS.O",
          "Neyveli Second Mines": "Neyveli Second MineS.O",
          "Block 10 Neyveli": "Block 10,neyveli S.O",
          "Block 10,neyveli": "Block 10,neyveli S.O",
          "Neyveli 1": "Neyveli 1 S.O",
          "Neyveli 1 SO": "Neyveli 1 S.O",
          "Panruti West": "Panruti West S.O",
          "Panruti West SO": "Panruti West S.O",
          "Anathur": "Anathur S.O",
          "Anathur SO": "Anathur S.O",
          "Panruti": "Panruti S.O",
          "Panruti SO": "Panruti S.O",
          "Block 18 Neyveli": "Block 18 Neyveli S.O",
          "Block 18 Neyveli SO": "Block 18 Neyveli S.O",
          "Block 26 Neyveli": "Block 26 Neyveli S.O",
          "Block 26 Neyveli SO": "Block 26 Neyveli S.O",
          "Tiruthuraiyur": "Tiruthuraiyur S.O",
          "Tiruthuraiyur SO": "Tiruthuraiyur S.O",
          "Puthupet": "Puthupet (CDL) S.O",
          "Puthupet SO": "Puthupet (CDL) S.O",
          "Block 1 Neyveli": "Block 1 Neyveli S.O",
          "Block 1 Neyveli SO": "Block 1 Neyveli S.O",
          "Panruti East": "Panruti East S.O",
          "Panruti East SO": "Panruti East S.O",
          "Kadambuliyur": "Kadambuliyur S.O",
          "Kadambuliyur SO": "Kadambuliyur S.O",
          "Neyveli TBS": "Neyveli TBS S.O",
          "Neyveli TBS SO": "Neyveli TBS S.O",
          "Block 5 Neyveli": "Block 5, Neyveli S.O",
          "Block 5, Neyveli": "Block 5, Neyveli S.O",
          "Block 5 Neyveli SO": "Block 5, Neyveli S.O",
          "Perperiyankuppam": "Perperiyankuppam S.O",
          "Perperiyankuppam SO": "Perperiyankuppam S.O",
          "Block 29 Neyveli": "Block 29 Neyveli S.O",
          "Block 29 Neyveli SO": "Block 29 Neyveli S.O"
        };
        return m[clean] || name;
      };

      // Clear Muthvel R's cached database so that it automatically rebuilds with the pristine new 21 offices
      localStorage.removeItem("diary_profile_Muthvel R_offices_db");
      localStorage.removeItem("diary_profile_Muthvel R_inter_office_db");
      localStorage.removeItem("diary_profile_Muthvel R_attached_office");
      
      // Also migrate any old office names located inside Muthuvel's saved activities & movements to ensure data continuity!
      const keyActivitiesMuthvel = "diary_profile_Muthvel R_activities";
      const savedActivities = localStorage.getItem(keyActivitiesMuthvel);
      if (savedActivities) {
        try {
          const activitiesArr = JSON.parse(savedActivities);
          if (Array.isArray(activitiesArr)) {
            const mapped = activitiesArr.map((activity: any) => {
              if (activity.visits) {
                activity.visits = activity.visits.map((vis: any) => ({
                  ...vis,
                  officeName: migrateOfficeName(vis.officeName)
                }));
              }
              return activity;
            });
            localStorage.setItem(keyActivitiesMuthvel, JSON.stringify(mapped));
          }
        } catch (_) {}
      }

      const keyMovementsMuthvel = "diary_profile_Muthvel R_movements";
      const savedMovements = localStorage.getItem(keyMovementsMuthvel);
      if (savedMovements) {
        try {
          const movementsArr = JSON.parse(savedMovements);
          if (Array.isArray(movementsArr)) {
            const mapped = movementsArr.map((mov: any) => ({
              ...mov,
              fromOffice: migrateOfficeName(mov.fromOffice),
              toOffice: migrateOfficeName(mov.toOffice)
            }));
            localStorage.setItem(keyMovementsMuthvel, JSON.stringify(mapped));
          }
        } catch (_) {}
      }

      // If activeProfile is Muthuvel R, then also reload current state from fresh defaults so it renders instantly!
      if (actProf === "Muthvel R") {
        const activeAttached = "Neyveli 3 S.O";
        setAttachedOffice(activeAttached);
        setOfficesDb(getDefaultOfficesAndInterOfficesList("Muthvel R", activeAttached));
      }
    }

    // Mark as migrated to prevent ever resetting their uploaded custom database on future reloads
    localStorage.setItem("diary_profile_Muthvel R_migrated_v2", "true");
  }, []);

  const loadDefaultOfficesDb = (targetAttachedOffice?: string) => {
    const activeAttached = targetAttachedOffice || attachedOffice;
    setOfficesDb(getDefaultOfficesAndInterOfficesList(activeProfile, activeAttached));
  };

  const switchProfile = (newProfileName: string) => {
    executeSwitchProfile(newProfileName);
  };

  const executeSwitchProfile = (newProfileName: string) => {
    const oldProf = loadedProfileRef.current;
    
    // Save current states first
    const keyMetadata = getProfileStorageKey(oldProf, "metadata");
    localStorage.setItem(keyMetadata, JSON.stringify(metadata));

    const keyActivities = getProfileStorageKey(oldProf, "activities");
    localStorage.setItem(keyActivities, JSON.stringify(activities));

    const keyMovements = getProfileStorageKey(oldProf, "movements");
    localStorage.setItem(keyMovements, JSON.stringify(movements));

    const keyAttachedOffice = getProfileStorageKey(oldProf, "attached_office");
    localStorage.setItem(keyAttachedOffice, attachedOffice);

    const keyOfficesDb = getProfileStorageKey(oldProf, "offices_db");
    localStorage.setItem(keyOfficesDb, JSON.stringify(officesDb));

    const keyServiceCalls = getProfileStorageKey(oldProf, "service_calls");
    localStorage.setItem(keyServiceCalls, JSON.stringify(serviceCalls));

    const keyConfirmedScrDays = getProfileStorageKey(oldProf, "confirmed_scr_days");
    localStorage.setItem(keyConfirmedScrDays, JSON.stringify(confirmedScrDays));

    const keyScrDefaults = getProfileStorageKey(oldProf, "scr_defaults");
    localStorage.setItem(keyScrDefaults, JSON.stringify(scrDefaults));

    // Update loadedProfileRef BEFORE setting activeProfile to let effects run again for new profile
    loadedProfileRef.current = newProfileName;
    setActiveProfile(newProfileName);
    localStorage.setItem('diary_active_profile', newProfileName);

    // Read the values for the new profile
    const getNewVal = (suffixKey: string) => {
      const pKey = getProfileStorageKey(newProfileName, suffixKey);
      return localStorage.getItem(pKey);
    };

    // Metadata
    const savedMeta = getNewVal('metadata');
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentFortnight = currentDay <= 15 ? 'first' : 'second';
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(currentDay)}.${pad(currentMonth + 1)}.${currentYear}`;
    
    let loadedMeta: any = null;
    if (savedMeta) {
      try {
        loadedMeta = JSON.parse(savedMeta);
        setMetadata({
          ...loadedMeta,
          month: currentMonth,
          year: currentYear,
          fortnight: currentFortnight,
          submissionDate: todayStr,
        });
      } catch {
        // fallback
      }
    }
    
    if (!loadedMeta) {
      let dName = '';
      let dDesig = 'System Administrator';
      let dOffice = getProfileAttachedOffice(newProfileName);
      if (newProfileName === "Karikalvalavan R") {
        dName = "R. Karikalvalavan";
        dOffice = "Cuddalore HO";
      } else if (newProfileName === "Muthvel R") {
        dName = "R. Muthuvel";
      } else if (newProfileName === "Sivaraj S") {
        dName = "S. Sivaraj";
      } else if (newProfileName === "Default Profile") {
        dName = "";
        dOffice = "";
      } else {
        dName = newProfileName;
      }
      setMetadata({
        name: dName,
        designation: dDesig,
        office: dOffice,
        submissionDate: todayStr,
        submissionPlace: dOffice,
        month: currentMonth,
        year: currentYear,
        fortnight: currentFortnight
      });
    }

    // Activities
    const savedAct = getNewVal('activities');
    setActivities(savedAct ? JSON.parse(savedAct) : []);

    // Movements
    const savedMov = getNewVal('movements');
    setMovements(savedMov ? JSON.parse(savedMov) : []);

    // Attached Office
    const savedOff = getNewVal('attached_office');
    const finalAttached = savedOff || getProfileAttachedOffice(newProfileName);
    setAttachedOffice(finalAttached);

    // Offices DB containing consolidated route database
    const savedOffices = getNewVal('offices_db');
    let loadedOffices: OfficeDatabaseEntry[] = [];
    if (savedOffices) {
      try {
        const parsed = JSON.parse(savedOffices);
        if (Array.isArray(parsed)) {
          loadedOffices = parsed.map((item: any) => {
            if (item && item.name && !item.fromOffice) {
              return {
                fromOffice: finalAttached,
                toOffice: item.name,
                distanceBus: item.distanceBus || 0,
                distanceBike: item.distanceBike || 0,
                durationBus: item.durationBus || 0,
                durationBike: item.durationBike || 0
              };
            }
            return item;
          });
        }
      } catch {
        loadedOffices = [];
      }
    } else {
      loadedOffices = getDefaultOfficesAndInterOfficesList(newProfileName, finalAttached);
    }

    // Also check for legacy saved inter_office_db to merge
    const savedInter = getNewVal('inter_office_db');
    if (savedInter) {
      try {
        const parsedInter = JSON.parse(savedInter);
        if (Array.isArray(parsedInter)) {
          loadedOffices = mergeInterOfficeIntoOffices(loadedOffices, parsedInter);
        }
      } catch (e) {
        // ignore
      }
    }
    setOfficesDb(migrateOfficesDb(loadedOffices).sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice)));

    // Service Calls
    const savedCalls = getNewVal('service_calls');
    setServiceCalls(savedCalls ? JSON.parse(savedCalls) : []);

    // Confirmed SCR Days
    const savedConfirmedScr = getNewVal('confirmed_scr_days');
    setConfirmedScrDays(savedConfirmedScr ? JSON.parse(savedConfirmedScr) : {});

    // SCR Defaults
    const savedScrDefaults = getNewVal('scr_defaults');
    setScrDefaults(savedScrDefaults ? JSON.parse(savedScrDefaults) : {
      divisionName: 'Cuddalore Division',
      callGivenBy: 'SPM',
      timeIn: '09:00 hrs',
      timeOut: '17:00 hrs',
      replacementOfSpares: 'None',
      amountOfSpares: 'None',
      otherIssues: 'NSP 2'
    });
  };

  const purgeKeysForProfile = (profileName: string, keepProfile: boolean = false) => {
    const isDefault = isSystemDefaultProfile(profileName);
    const prefixExact = isDefault ? "diary_" : `diary_profile_${profileName}_`;
    
    // Find variants of the name to purge legacy/duplicate data
    const variants = [profileName];
    if (profileName.endsWith(" S")) {
      variants.push(profileName.slice(0, -2).trim());
    }
    if (profileName.endsWith(" R")) {
      variants.push(profileName.slice(0, -2).trim());
    }
    if (profileName === "Muthvel R") {
      variants.push("Muthuvel");
      variants.push("Muthuvel R");
    }
    
    const prefixes = variants.map(v => isSystemDefaultProfile(v) ? "diary_" : `diary_profile_${v}_`);

    // 1. Delete from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        if (isDefault) {
          if (key.startsWith("diary_") && !key.includes("_profile_") && !key.startsWith("diary_websync_") && key !== "diary_profiles_list" && key !== "diary_active_profile") {
            localStorage.removeItem(key);
          }
        } else {
          const matchesAnyPrefix = prefixes.some(p => key.startsWith(p));
          const matchesExactKey = key === `diary_profile_${profileName}`;
          const matchesVariantKey = variants.some(v => key === `diary_profile_${v}`);
          if (matchesAnyPrefix || matchesExactKey || matchesVariantKey) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  };

  const addNewProfile = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    // Check if profile already exists in the current active list
    if (profiles.map(p => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setConfirmModal({
        title: "Profile Already Exists",
        message: `A profile named "${trimmed}" already exists in your active list. Please choose a different name.`,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    // Check if previous data exists for this name in localStorage or activeCloudPayload
    const isDefault = isSystemDefaultProfile(trimmed);
    const prefixExact = isDefault ? "diary_" : `diary_profile_${trimmed}_`;
    const variants = [trimmed];
    if (trimmed.endsWith(" S")) {
      variants.push(trimmed.slice(0, -2).trim());
    }
    if (trimmed.endsWith(" R")) {
      variants.push(trimmed.slice(0, -2).trim());
    }
    if (trimmed === "Muthvel R") {
      variants.push("Muthuvel");
      variants.push("Muthuvel R");
    }
    const prefixes = variants.map(v => isSystemDefaultProfile(v) ? "diary_" : `diary_profile_${v}_`);

    let hasPreExistingData = false;
    
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== "diary_profiles_list" && k !== "diary_active_profile") {
        if (prefixes.some(p => k.startsWith(p)) || variants.some(v => k === `diary_profile_${v}`)) {
          hasPreExistingData = true;
          break;
        }
      }
    }

    const proceedCreateFresh = () => {
      // Clear any pre-existing keys for this profile name (exact and variants)
      purgeKeysForProfile(trimmed);

      // Add profile and switch to it with fresh empty default state
      const updated = [...profiles, trimmed];
      setProfiles(updated);
      localStorage.setItem('diary_profiles_list', JSON.stringify(updated));
      switchProfile(trimmed);
      setConfirmModal(null);
    };

    const proceedRestore = () => {
      const updated = [...profiles, trimmed];
      setProfiles(updated);
      localStorage.setItem('diary_profiles_list', JSON.stringify(updated));
      switchProfile(trimmed);
      setConfirmModal(null);
    };

    if (hasPreExistingData) {
      setConfirmModal({
        title: "Restore Previous Profile Data?",
        message: `Existing stored data was found for "${trimmed}". Would you like to restore and load this previous data, or discard it and create a fresh new profile?`,
        confirmText: "Restore Previous Data",
        cancelText: "Clear & Create Fresh",
        accentColor: "blue",
        onConfirm: proceedRestore,
        onCancel: proceedCreateFresh
      });
    } else {
      // Create clean fresh profile
      proceedCreateFresh();
    }
  };



  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.office-select-container')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [newFromOffice, setNewFromOffice] = useState('');
  const [newToOffice, setNewToOffice] = useState('');
  const [newRouteDistBus, setNewRouteDistBus] = useState('');
  const [newRouteDistBike, setNewRouteDistBike] = useState('');
  const [newRouteDurBus, setNewRouteDurBus] = useState('');
  const [newRouteDurBike, setNewRouteDurBike] = useState('');
  const [newRouteOverrideMode, setNewRouteOverrideMode] = useState('');
  const [routeDbError, setRouteDbError] = useState('');
  const [newRouteViaBusStand, setNewRouteViaBusStand] = useState('');
  const [newRouteFromOfficeToBsKm, setNewRouteFromOfficeToBsKm] = useState('');
  const [newRouteFromOfficeToBsMins, setNewRouteFromOfficeToBsMins] = useState('');
  const [newRouteToOfficeToBsKm, setNewRouteToOfficeToBsKm] = useState('');
  const [newRouteToOfficeToBsMins, setNewRouteToOfficeToBsMins] = useState('');
  const [newRouteFareBus, setNewRouteFareBus] = useState('');
  const [newRouteFromBsFare, setNewRouteFromBsFare] = useState('');
  const [newRouteToBsFare, setNewRouteToBsFare] = useState('');
  
  // Single-day Entry Form State
  const [selectedDateIdx, setSelectedDateIdx] = useState(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentFortnight = currentDay <= 15 ? 'first' : 'second';
    
    const initialDays = getFortnightDays(currentYear, currentMonth, currentFortnight);
    const todayStr = formatDate(today);
    const idx = initialDays.findIndex(day => formatDate(day) === todayStr);
    return idx >= 0 ? idx : 0;
  });
  const [transportMode, setTransportMode] = useState<'Bus' | 'Bike' | 'Train' | 'Auto'>('Bus');
  const [visits, setVisits] = useState<OfficeVisit[]>(() => {
    const defaultOffice = localStorage.getItem('diary_attached_office') || 'Kurinjipadi SO';
    return [{ id: 'v1', officeName: defaultOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }];
  });
  const [leaveType, setLeaveType] = useState<'CL' | 'EL' | ''>('');
  const [workedOnHoliday, setWorkedOnHoliday] = useState<boolean>(false);
  const [saveSuccessFeedback, setSaveSuccessFeedback] = useState<boolean>(false);

  useEffect(() => {
    const day = availableDays[selectedDateIdx];
    if (!day) return;
    const dStr = formatDate(day);
    const saved = activities.find(a => a.date === dStr);
    if (saved) {
      setTransportMode(saved.transportMode || 'Bus');
      setVisits(saved.visits || []);
      setLeaveType(saved.leaveType || '');
      setWorkedOnHoliday(!!saved.workedOnHoliday);
    } else {
      setTransportMode('Bus');
      const defaultId = Math.random().toString(36).substr(2, 5);
      setVisits([{ id: defaultId, officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
      setLeaveType('');
      setWorkedOnHoliday(false);
    }
  }, [selectedDateIdx, attachedOffice]);

  const [lastPromptedScrId, setLastPromptedScrId] = useState<string | null>(null);

  const cleanHrsToTime = (str: string, fallback: string = '11:00') => {
    if (!str || typeof str !== 'string') return fallback;
    const trimmed = str.trim();
    const matched = trimmed.match(/(\d{1,2})[:.](\d{2})/);
    if (matched) {
      return `${matched[1].padStart(2, '0')}:${matched[2]}`;
    }
    const singleMatch = trimmed.match(/(\d{1,2})/);
    if (singleMatch) {
      const num = parseInt(singleMatch[1], 10);
      if (num >= 0 && num <= 23) {
        return `${String(num).padStart(2, '0')}:00`;
      }
    }
    return fallback;
  };

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const normalized = timeStr.replace('.', ':');
    const matched = normalized.match(/(\d{1,2}):(\d{2})/);
    if (matched) {
      return parseInt(matched[1], 10) * 60 + parseInt(matched[2], 10);
    }
    const singleMatched = normalized.match(/(\d+)/);
    if (singleMatched) {
      return parseInt(singleMatched[1], 10) * 60;
    }
    return 0;
  };

  const handleImportSCRs = (matchingList: any[]) => {
    const sortedList = [...matchingList].sort((a, b) => timeToMinutes(a.timeIn) - timeToMinutes(b.timeIn));
    const newVisits: OfficeVisit[] = sortedList.map((matching) => {
      const defaultId = Math.random().toString(36).substr(2, 5);
      const problemDescriptions = (matching.problems || [])
        .map((p: any) => {
          const reported = p.reported?.trim() || '';
          const action = p.actionTaken?.trim() || '';
          if (!reported) return '';
          if (action) {
            return `${reported} (${action})`;
          }
          return reported;
        })
        .filter(Boolean);

      let joinedIssues = '';
      if (problemDescriptions.length === 1) {
        joinedIssues = problemDescriptions[0];
      } else if (problemDescriptions.length === 2) {
        joinedIssues = `${problemDescriptions[0]} and ${problemDescriptions[1]}`;
      } else if (problemDescriptions.length > 2) {
        joinedIssues = problemDescriptions.slice(0, -1).join(', ') + ' and ' + problemDescriptions[problemDescriptions.length - 1];
      } else {
        joinedIssues = (matching.otherIssues && matching.otherIssues !== 'NIL' && matching.otherIssues.trim()) 
          ? matching.otherIssues.trim() 
          : 'Service call report';
      }

      const hasCallGivenBy = matching.callGivenBy && matching.callGivenBy.trim() !== '';
      const finalIssues = (joinedIssues.toLowerCase().startsWith('to attend') || joinedIssues.toLowerCase().startsWith('attended'))
        ? joinedIssues
        : (hasCallGivenBy ? joinedIssues : `to attend ${joinedIssues}`);

      return {
        id: defaultId,
        officeName: cleanOfficeSpelling(matching.officeAttended),
        startTime: cleanHrsToTime(matching.timeIn, '10:00'),
        endTime: cleanHrsToTime(matching.timeOut, '17:00'),
        issues: finalIssues,
        resolution: '',
        isManualTime: true
      };
    });

    const isFormUnmodified = (vList: OfficeVisit[]) => {
      if (vList.length === 0) return true;
      if (vList.length > 1) return false;
      const first = vList[0];
      const isOfficeDefaultOrEmpty = first.officeName === attachedOffice || !first.officeName || first.officeName.trim() === '';
      const isTimeDefault = first.startTime === '09:00' && first.endTime === '17:00';
      const isDetailsEmpty = (!first.issues || first.issues.trim() === '') && !first.resolution;
      return isOfficeDefaultOrEmpty && isTimeDefault && isDetailsEmpty;
    };

    let mergedVisits: OfficeVisit[] = [];
    if (isFormUnmodified(visits)) {
      mergedVisits = newVisits;
    } else {
      const normAtt = cleanOfficeSpelling(attachedOffice).toLowerCase().trim();
      const nonDefaultVisits = visits.filter(v => {
        const normName = v.officeName ? cleanOfficeSpelling(v.officeName).toLowerCase().trim() : '';
        return normName && normName !== normAtt;
      });

      const updatedExisting = nonDefaultVisits.map(existing => {
        const match = newVisits.find(nv => 
          cleanOfficeSpelling(nv.officeName).toLowerCase().trim() === cleanOfficeSpelling(existing.officeName).toLowerCase().trim()
        );
        if (match) {
          return {
            ...existing,
            startTime: match.startTime,
            endTime: match.endTime,
            issues: match.issues || existing.issues,
            isManualTime: true
          };
        }
        return existing;
      });

      const brandNewVisits = newVisits.filter(nv => 
        !updatedExisting.some(ex => 
          cleanOfficeSpelling(ex.officeName).toLowerCase().trim() === cleanOfficeSpelling(nv.officeName).toLowerCase().trim()
        )
      );

      mergedVisits = [...updatedExisting, ...brandNewVisits];
      if (mergedVisits.length === 0) {
        mergedVisits = newVisits;
      }
    }

    mergedVisits.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    setVisits(mergedVisits);
  };

  useEffect(() => {
    const day = availableDays[selectedDateIdx];
    if (!day) return;
    const dStr = formatDate(day);
    const matchingList = serviceCalls.filter(sc => normalizeDateStr(sc.date) === dStr);

    if (matchingList.length > 0 && activeTab === 'entry' && !confirmedScrDays[dStr]) {
      const promptKey = matchingList.map(m => m.id).sort().join('_');
      if (promptKey !== lastPromptedScrId) {
        const allAlreadyFilled = matchingList.every(matching => 
          visits.some(v => 
            cleanOfficeSpelling(v.officeName).toLowerCase().trim() === cleanOfficeSpelling(matching.officeAttended).toLowerCase().trim() && 
            v.startTime === cleanHrsToTime(matching.timeIn)
          )
        );
        
        if (!allAlreadyFilled) {
          const officeNames = matchingList.map(m => cleanOfficeSpelling(m.officeAttended)).join(' & ');
          setConfirmModal({
            title: "Service Call Reports Detected!",
            message: `Found ${matchingList.length} Service Call Report(s) on ${dStr} for [${officeNames}]. Would you like to automatically fill today's work entry with them in time sequence?`,
            confirmText: "Yes, Auto-fill All",
            cancelText: "No, Keep current",
            accentColor: "blue",
            onConfirm: () => {
              handleImportSCRs(matchingList);
              setLastPromptedScrId(promptKey);
              setConfirmedScrDays(prev => ({ ...prev, [dStr]: true }));
              setConfirmModal(null);
            },
            onCancel: () => {
              setLastPromptedScrId(promptKey);
              setConfirmModal(null);
            }
          });
        }
      }
    }
  }, [selectedDateIdx, serviceCalls, lastPromptedScrId, activeTab, visits, confirmedScrDays]);

  const [dbError, setDbError] = useState('');
  const [newOfficeFromOffice, setNewOfficeFromOffice] = useState('');
  const [newOfficeToOffice, setNewOfficeToOffice] = useState('');
  const [newOfficeDistBus, setNewOfficeDistBus] = useState('');
  const [newOfficeDistBike, setNewOfficeDistBike] = useState('');
  const [newOfficeDurBus, setNewOfficeDurBus] = useState('');
  const [newOfficeDurBike, setNewOfficeDurBike] = useState('');
  const [newOfficeViaBusStand, setNewOfficeViaBusStand] = useState('');
  const [newOfficeFromBsKm, setNewOfficeFromBsKm] = useState('');
  const [newOfficeFromBsMins, setNewOfficeFromBsMins] = useState('');
  const [newOfficeToBsKm, setNewOfficeToBsKm] = useState('');
  const [newOfficeToBsMins, setNewOfficeToBsMins] = useState('');
  const [newOfficeFareBus, setNewOfficeFareBus] = useState('');
  const [newOfficeFromBsFare, setNewOfficeFromBsFare] = useState('');
  const [newOfficeToBsFare, setNewOfficeToBsFare] = useState('');
  const [newOfficeOverrideMode, setNewOfficeOverrideMode] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [parsedEntries, setParsedEntries] = useState<OfficeDatabaseEntry[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  const exportDatabaseAsJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(officesDb, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "office_matrix_database_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportSuccess('Database exported successfully as JSON!');
      setImportError('');
    } catch (err) {
      setImportError('Failed to export database as JSON.');
    }
  };

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
      downloadAnchor.setAttribute("download", "office_matrix_database_backup.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportSuccess('Database exported successfully as CSV!');
      setImportError('');
    } catch (err) {
      setImportError('Failed to export database as CSV.');
    }
  };

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
      setImportSuccess('Sample proforma downloaded! Open this file in Excel to view and edit columns, then save as CSV to import.');
      setImportError('');
    } catch (err) {
      setImportError('Failed to download sample proforma.');
    }
  };

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
                    toOfficeToBsKm: 'toOfficeToBsKm' in item ? parseFloat((item as any).toOfficeToBsKm) || ('viaBusStandKm' in item ? parseFloat((item as any).viaBusStandKm) || 0 : 0) : undefined,
                    toOfficeToBsMins: 'toOfficeToBsMins' in item ? parseInt((item as any).toOfficeToBsMins) || ('viaBusStandDuration' in item ? parseInt((item as any).viaBusStandDuration) || 0 : 0) : undefined,
                    fareBus: 'fareBus' in item ? (parseFloat((item as any).fareBus) !== undefined && !isNaN(parseFloat((item as any).fareBus)) ? parseFloat((item as any).fareBus) : undefined) : undefined,
                    fromOfficeToBsFare: 'fromOfficeToBsFare' in item ? (parseFloat((item as any).fromOfficeToBsFare) !== undefined && !isNaN(parseFloat((item as any).fromOfficeToBsFare)) ? parseFloat((item as any).fromOfficeToBsFare) : undefined) : undefined,
                    toOfficeToBsFare: 'toOfficeToBsFare' in item ? (parseFloat((item as any).toOfficeToBsFare) !== undefined && !isNaN(parseFloat((item as any).toOfficeToBsFare)) ? parseFloat((item as any).toOfficeToBsFare) : undefined) : undefined,
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
              setImportSuccess(`Loaded backup successfully! Ready to import ${validated.length} office routes.`);
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
            setImportError('Headers missing. Required columns: "From Office" and "To Office" (or legacy "Office Name").');
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

            let fromOffice = '';
            let toOffice = '';

            if (fromIdx !== -1 && cells[fromIdx]) {
              fromOffice = cells[fromIdx].replace(/"/g, '').trim();
            }
            if (toIdx !== -1 && cells[toIdx]) {
              toOffice = cells[toIdx].replace(/"/g, '').trim();
            }

            // Legacy fallback if headers are name based
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
            const fareBus = fareBusFn(shareBusFareIdx);
            const fromOfficeToBsFare = fareBusFn(fromBsFareIdx);
            const toOfficeToBsFare = fareBusFn(toBsFareIdx);

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
              fareBus: fareBus,
              fromOfficeToBsFare: fromOfficeToBsFare,
              toOfficeToBsFare: toOfficeToBsFare
            });
          }

          if (entries.length === 0) {
            setImportError('No valid record lines found in CSV Proforma.');
          } else {
            setParsedEntries(entries);
            setImportError('');
            setImportSuccess(`Loaded backup successfully! Ready to import ${entries.length} office routes.`);
          }
        } else {
          setImportError('Unsupported file type. Please upload a .CSV or .JSON database file.');
        }
      } catch (err) {
        setImportError('Error parsing directory file records. Verify integrity of structure.');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

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

    // Save immediately to localStorage to ensure complete persistence on reload
    const key = getProfileStorageKey(activeProfile, "offices_db");
    localStorage.setItem(key, JSON.stringify(finalOffices));

    // Also mark as migrated and custom uploaded to prevent future automatic overrides
    localStorage.setItem(`diary_profile_${activeProfile}_custom_uploaded`, "true");
    localStorage.setItem("diary_profile_Muthvel R_migrated_v2", "true");

    // Synchronously bump the modification timestamp to avoid stale cloud sync pull on reload
    localStorage.setItem('diary_last_updated', Date.now().toString());

    setImportSuccess(`Successfully imported ${parsedEntries.length} offices into the route database!`);

    setParsedEntries([]);
    setTimeout(() => {
      setImportSuccess('');
    }, 6000);
  };

  const matchOfficeNames = useCallback((a: string, b: string): boolean => {
    if (!a || !b) return false;
    const cleanA = a.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const cleanB = b.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (cleanA === cleanB) return true;

    // Check if both have distinct office type suffixes (HO, DO, SO, BO)
    const suffixRegex = /\s+(so|bo|ho|do)$/i;
    const matchA = cleanA.match(suffixRegex);
    const matchB = cleanB.match(suffixRegex);
    
    // If both specify a suffix and they are different (e.g. HO vs DO, or SO vs BO), they are distinct offices!
    if (matchA && matchB && matchA[1].toLowerCase() !== matchB[1].toLowerCase()) {
      return false;
    }

    // Do NOT match HO or DO loosely to an office with a different or missing suffix
    if ((matchA && ['ho', 'do'].includes(matchA[1].toLowerCase()) && !matchB) ||
        (matchB && ['ho', 'do'].includes(matchB[1].toLowerCase()) && !matchA)) {
      return false;
    }

    const stripSuffix = (s: string) => s.replace(/\s+(so|bo|ho|do)$/i, '').trim();
    return stripSuffix(cleanA) === stripSuffix(cleanB);
  }, []);

  const findOfficeRoute = useCallback((origin: string, dest: string) => {
    if (!origin || !dest) return null;
    const norm = (s: string) => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const origNorm = norm(origin);
    const destNorm = norm(dest);

    // 1. Direct exact forward match (highest priority)
    const exactDirect = officesDb.find(o => norm(o.fromOffice) === origNorm && norm(o.toOffice) === destNorm);
    if (exactDirect) return { entry: exactDirect, isReverse: false };

    // 2. Direct exact reverse match
    const exactReverse = officesDb.find(o => norm(o.fromOffice) === destNorm && norm(o.toOffice) === origNorm);
    if (exactReverse) return { entry: exactReverse, isReverse: true };

    // 3. Direct Bus Stand <-> Office lookups directly from officesDb viaBusStand / toOfficeToBsKm / fromOfficeToBsKm
    const isBsOrigin = origNorm.includes('bus stand');
    const isBsDest = destNorm.includes('bus stand');

    if (isBsOrigin && !isBsDest) {
      const match = officesDb.find(o => 
        (norm(o.toOffice) === destNorm || matchOfficeNames(o.toOffice, dest) ||
         norm(o.fromOffice) === destNorm || matchOfficeNames(o.fromOffice, dest)) &&
        o.viaBusStand && norm(o.viaBusStand) === origNorm
      );
      if (match) {
        const isTo = norm(match.toOffice) === destNorm || matchOfficeNames(match.toOffice, dest);
        const km = isTo ? (match.toOfficeToBsKm ?? 0) : (match.fromOfficeToBsKm ?? 0);
        const mins = isTo ? (match.toOfficeToBsMins ?? 10) : (match.fromOfficeToBsMins ?? 10);
        const fare = isTo ? match.toOfficeToBsFare : match.fromOfficeToBsFare;
        return {
          entry: {
            ...match,
            fromOffice: origin,
            toOffice: dest,
            distanceBus: km,
            distanceBike: km,
            durationBus: mins,
            durationBike: mins,
            viaBusStand: undefined,
            fareBus: fare
          },
          isReverse: false
        };
      }
    }

    if (isBsDest && !isBsOrigin) {
      const match = officesDb.find(o => 
        (norm(o.fromOffice) === origNorm || matchOfficeNames(o.fromOffice, origin) ||
         norm(o.toOffice) === origNorm || matchOfficeNames(o.toOffice, origin)) &&
        o.viaBusStand && norm(o.viaBusStand) === destNorm
      );
      if (match) {
        const isFrom = norm(match.fromOffice) === origNorm || matchOfficeNames(match.fromOffice, origin);
        const km = isFrom ? (match.fromOfficeToBsKm ?? 0) : (match.toOfficeToBsKm ?? 0);
        const mins = isFrom ? (match.fromOfficeToBsMins ?? 10) : (match.toOfficeToBsMins ?? 10);
        const fare = isFrom ? match.fromOfficeToBsFare : match.toOfficeToBsFare;
        return {
          entry: {
            ...match,
            fromOffice: origin,
            toOffice: dest,
            distanceBus: km,
            distanceBike: km,
            durationBus: mins,
            durationBike: mins,
            viaBusStand: undefined,
            fareBus: fare
          },
          isReverse: false
        };
      }
    }

    // 4. Fallback loose forward match: origin -> dest
    const direct = officesDb.find(o => 
      matchOfficeNames(o.fromOffice, origin) && matchOfficeNames(o.toOffice, dest)
    );
    if (direct) return { entry: direct, isReverse: false };

    // 5. Fallback loose reverse match: dest -> origin
    const reverse = officesDb.find(o => 
      matchOfficeNames(o.fromOffice, dest) && matchOfficeNames(o.toOffice, origin)
    );
    if (reverse) return { entry: reverse, isReverse: true };

    return null;
  }, [officesDb, matchOfficeNames]);

  const getOfficeDynamicSpecs = (officeName: string) => {
    let routeMatch = findOfficeRoute(attachedOffice, officeName);

    // If attachedOffice doesn't connect via bus stand or route not found, find ANY route in officesDb containing officeName with viaBusStand
    if (!routeMatch || !routeMatch.entry.viaBusStand || !routeMatch.entry.viaBusStand.trim()) {
      const anyMatch = officesDb.find(o => 
        (matchOfficeNames(o.toOffice, officeName) || matchOfficeNames(o.fromOffice, officeName)) &&
        o.viaBusStand && o.viaBusStand.trim()
      );
      if (anyMatch) {
        const isTo = matchOfficeNames(anyMatch.toOffice, officeName);
        routeMatch = {
          entry: anyMatch,
          isReverse: !isTo
        };
      }
    }

    if (routeMatch && routeMatch.entry.viaBusStand && routeMatch.entry.viaBusStand.trim()) {
      const matched = routeMatch.entry;
      const isFromAtt = !routeMatch.isReverse;

      const hubKm = isFromAtt 
        ? (matched.fromOfficeToBsKm !== undefined ? matched.fromOfficeToBsKm : 35)
        : (matched.toOfficeToBsKm !== undefined ? matched.toOfficeToBsKm : 35);
      const spokeKm = isFromAtt
        ? (matched.toOfficeToBsKm !== undefined ? matched.toOfficeToBsKm : 0)
        : (matched.fromOfficeToBsKm !== undefined ? matched.fromOfficeToBsKm : 0);
      const spokeDuration = isFromAtt
        ? (matched.toOfficeToBsMins !== undefined ? matched.toOfficeToBsMins : 0)
        : (matched.fromOfficeToBsMins !== undefined ? matched.fromOfficeToBsMins : 0);
      const hubDuration = isFromAtt
        ? (matched.fromOfficeToBsMins !== undefined ? matched.fromOfficeToBsMins : 60)
        : (matched.toOfficeToBsMins !== undefined ? matched.toOfficeToBsMins : 60);

      const hubFare = isFromAtt ? matched.fromOfficeToBsFare : matched.toOfficeToBsFare;
      const spokeFare = isFromAtt ? matched.toOfficeToBsFare : matched.fromOfficeToBsFare;

      const bsName = matched.viaBusStand.trim();
      let finalSpokeKm = spokeKm;
      // Strictly enforce office matrix database distances for Cuddalore HO & DO
      const normOffice = (officeName || '').toLowerCase();
      if (normOffice.includes('cuddalore ho') && bsName.toUpperCase().includes('CUDDALORE')) {
        finalSpokeKm = 2;
      } else if (normOffice.includes('cuddalore do') && bsName.toUpperCase().includes('CUDDALORE')) {
        finalSpokeKm = 2.5;
      }

      return {
        bsName,
        spokeKm: finalSpokeKm,
        spokeDuration: spokeDuration,
        hubKm: hubKm,
        hubDuration: hubDuration,
        hubFare,
        spokeFare
      };
    }

    const mapping = HUB_MAPPING[officeName];
    if (mapping) {
      const spokeTime = SPOKE_DURATIONS[officeName] || 15;
      const hubTime = HUB_DURATIONS[mapping.bsName] || 60;
      let finalSpokeKm = mapping.spokeKm;
      const normOffice = (officeName || '').toLowerCase();
      if (normOffice.includes('cuddalore ho')) finalSpokeKm = 2;
      if (normOffice.includes('cuddalore do')) finalSpokeKm = 2.5;
      return {
        bsName: mapping.bsName,
        spokeKm: finalSpokeKm,
        spokeDuration: spokeTime,
        hubKm: mapping.hubKm,
        hubDuration: hubTime
      };
    }

    const normOffice = (officeName || '').toLowerCase();
    const finalSpokeKm = normOffice.includes('cuddalore ho') ? 2 : normOffice.includes('cuddalore do') ? 2.5 : 5;

    return {
      bsName: 'CUDDALORE BUS STAND',
      spokeKm: finalSpokeKm,
      spokeDuration: 15,
      hubKm: 30,
      hubDuration: 60
    };
  };



  const getTravelDur = (officeName: string, mode?: string) => {
    if (!officeName) return 0;
    const cleanOffice = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const cleanAttached = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanOffice === cleanAttached) return 0;

    const routeMatch = findOfficeRoute(attachedOffice, officeName);
    if (routeMatch) {
      const matched = routeMatch.entry;
      const isBike = mode?.toLowerCase().trim() === 'bike';
      if (!isBike && matched.viaBusStand && matched.viaBusStand.trim()) {
        const specs = getOfficeDynamicSpecs(officeName);
        if (specs && specs.hubDuration !== undefined && specs.hubDuration > 0) {
          const totalDur = specs.hubDuration + specs.spokeDuration;
          return totalDur;
        }
      }
      return isBike ? matched.durationBike : matched.durationBus;
    }

    const nName = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const nMode = mode ? mode.toLowerCase().trim() : '';

    if (nName === "chidambaram ho") return 45;
    if (nName === "cuddalore ot bazaar so") return 45;
    if (nName === "cuddalore ot so") return 40;

    if (nMode === "bike") {
      if (nName === "fort st david so") return 55;
      if (nName === "cuddalore public offices so") return 50;
      if (nName === "tiruvendhipuram so") return 50;
      if (nName === "vandipalayam so") return 50;
      if (nName === "tirupadiripuliyur so") return 50;
      if (nName === "tirupadiripuliyur west so") return 50;
    }

    if (nName === "vadalur so") return 10;
    if (nName === "panruti bus stand" || nName === "panruti so") return 55;
    if (nName === "cn palayam so" || nName === "cnpalayam so") {
      if (nMode === "bike") return 35;
      return 45;
    }

    if (nMode === "bike") {
      if (nName === "cuddalore ho" || nName === "cuddalore do") return 55;
      if (nName === "nellikkuppam so" || nName === "nellikuppam so") return 55;
      if (nName === "melpattambakkam so") return 50;
      if (nName === "kilkavarapattu so") return 50;
      if (nName === "varakkalpattu so") return 55;
      if (nName === "kondur so") return 55;
      if (nName === "manjakuppam so") return 55;
      if (nName === "alapakkam so") return 30;
      if (nName === "sipcot so") return 40;
      if (nName === "vandipalayam so") return 50;
    }
    if (nMode === "bus") {
      if (nName === "panruti bus stand" || nName === "panruti so") return 55;
      const specs = getOfficeDynamicSpecs(officeName);
      if (specs) {
        const hDur = (specs.hubDuration !== undefined && specs.hubDuration > 0) ? specs.hubDuration : (specs.bsName === "PANRUTI BUS STAND" ? 55 : 60);
        return hDur + specs.spokeDuration;
      }
    }

    const isDirectStart = ["Vadalur SO", "Kullanchavadi SO", "Alapakkam SO", "CN Palayam SO", "Cuddalore OT SO", "Cuddalore OT Bazaar SO"].includes(officeName);
    let dur = 30;
    if (isDirectStart) {
      dur = DIRECT_DURATIONS[officeName] || 30;
    } else {
      const specs = getOfficeDynamicSpecs(officeName);
      const hubName = specs.bsName;
      const spokeTime = specs.spokeDuration;
      dur = (HUB_DURATIONS[hubName] || 60) + spokeTime;
    }
    // reduce by 10 mins whenever starting from or returning to Kurinjipadi SO
    return Math.max(5, dur - 10);
  };

  const getTravelKm = (officeName: string, mode?: string) => {
    if (!officeName) return 0;
    const cleanOffice = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const cleanAttached = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanOffice === cleanAttached) return 0;

    const routeMatch = findOfficeRoute(attachedOffice, officeName);
    if (routeMatch) {
      const isBike = mode?.toLowerCase().trim() === 'bike';
      return isBike ? routeMatch.entry.distanceBike : routeMatch.entry.distanceBus;
    }

    const nName = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const nMode = mode ? mode.toLowerCase().trim() : '';

    if (nName === "chidambaram ho") return 27;
    if (nName === "cuddalore ot bazaar so") return 26;
    if (nName === "cuddalore ot so") return 25;

    if (nMode === "bike") {
      if (nName === "fort st david so") return 34;
      if (nName === "cuddalore public offices so") return 32;
      if (nName === "tiruvendhipuram so") return 34;
      if (nName === "vandipalayam so") return 33.5;
      if (nName === "tirupadiripuliyur so") return 33;
      if (nName === "tirupadiripuliyur west so") return 34;
    }

    if (nName === "vadalur so") return 5;
    if (nName === "panruti bus stand" || nName === "panruti so") return 31;
    if (nName === "cn palayam so" || nName === "cnpalayam so") return 20;

    if (nMode === "bike") {
      if (nName === "cuddalore ho" || nName === "cuddalore do") return 32;
      if (nName === "nellikkuppam so" || nName === "nellikuppam so") return 32;
      if (nName === "melpattambakkam so") return 31;
      if (nName === "kilkavarapattu so") return 31;
      if (nName === "varakkalpattu so") return 33;
      if (nName === "kondur so") return 34;
      if (nName === "manjakuppam so") return 32;
      if (nName === "alapakkam so") return 21;
      if (nName === "sipcot so") return 23;
      if (nName === "vandipalayam so") return 33.5;
    }
    if (nMode === "bus") {
      if (nName === "panruti bus stand" || nName === "panruti so") return 31;
    }

    const baseDistance = DIRECT_DISTANCES[officeName] || 35;
    return Math.max(0, baseDistance - 5);
  };

  const getTravelBusFare = (officeName: string) => {
    if (!officeName) return 0;
    const cleanOffice = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const cleanAttached = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanOffice === cleanAttached) return 0;

    const routeMatch = findOfficeRoute(attachedOffice, officeName);
    if (routeMatch && routeMatch.entry.fareBus !== undefined) {
      return routeMatch.entry.fareBus;
    }
    return undefined;
  };

  const getInterOfficeSpec = (fromOff: string, toOff: string, mode?: string) => {
    const routeMatch = findOfficeRoute(fromOff, toOff);
    if (routeMatch) {
      const found = routeMatch.entry;
      const reverse = routeMatch.isReverse;
      const isBike = mode?.toLowerCase().trim() === 'bike';
      return {
        km: (isBike ? found.distanceBike : found.distanceBus).toString(),
        dur: isBike ? found.durationBike : found.durationBus,
        mode: (mode?.toLowerCase().trim() === 'bike' && (found.transportModeOverriding || '').toUpperCase() === 'WALK') ? 'BIKE' : (found.transportModeOverriding || undefined),
        viaBusStand: found.viaBusStand,
        fromOfficeToBsKm: reverse ? found.toOfficeToBsKm : found.fromOfficeToBsKm,
        fromOfficeToBsMins: reverse ? found.toOfficeToBsMins : found.fromOfficeToBsMins,
        toOfficeToBsKm: reverse ? found.fromOfficeToBsKm : found.toOfficeToBsKm,
        toOfficeToBsMins: reverse ? found.fromOfficeToBsMins : found.toOfficeToBsMins,
        fareBus: found.fareBus,
        fromOfficeToBsFare: reverse ? found.toOfficeToBsFare : found.fromOfficeToBsFare,
        toOfficeToBsFare: reverse ? found.fromOfficeToBsFare : found.toOfficeToBsFare
      };
    }

    // Fallback static lookup
    const hardcoded = INTER_OFFICE_DATA[fromOff]?.[toOff] || INTER_OFFICE_DATA[toOff]?.[fromOff];
    if (hardcoded) {
      const mapFrom = HUB_MAPPING[fromOff];
      const mapTo = HUB_MAPPING[toOff];
      const sameBs = mapFrom && mapTo && mapFrom.bsName === mapTo.bsName ? mapFrom.bsName : undefined;
      return {
        km: hardcoded.km,
        dur: hardcoded.dur || 20,
        mode: (mode?.toLowerCase().trim() === 'bike' && (hardcoded.mode || '').toUpperCase() === 'WALK') ? 'BIKE' : hardcoded.mode,
        viaBusStand: sameBs,
        fromOfficeToBsKm: sameBs ? mapFrom.spokeKm : undefined,
        fromOfficeToBsMins: sameBs ? (SPOKE_DURATIONS[fromOff] || 15) : undefined,
        toOfficeToBsKm: sameBs ? mapTo.spokeKm : undefined,
        toOfficeToBsMins: sameBs ? (SPOKE_DURATIONS[toOff] || 15) : undefined,
        fareBus: undefined,
        fromOfficeToBsFare: undefined,
        toOfficeToBsFare: undefined
      };
    }
    
    return null;
  };

  const recalculateVisitsSequence = (currentVisits: OfficeVisit[], mode: string = transportMode) => {
    let updated = [...currentVisits];
    if (updated.length > 0) {
      const first = updated[0];
      if (first.officeName && !first.isManualTime) {
        const travelDur = getTravelDur(first.officeName, mode);
        const newStartTime = addMinutesToTime("09:00", travelDur);
        if (first.startTime !== newStartTime) {
          const prevDuration = Math.max(10, timeToMinutes(first.endTime) - timeToMinutes(first.startTime));
          const newEndTime = addMinutesToTime(newStartTime, prevDuration);
          updated[0] = {
            ...first,
            startTime: newStartTime,
            endTime: newEndTime
          };
        }
      }
    }
    for (let idx = 1; idx < updated.length; idx++) {
      const prev = updated[idx - 1];
      const v = updated[idx];
      if (prev.officeName && v.officeName) {
        const vStartMin = timeToMinutes(v.startTime);
        const prevEndMin = timeToMinutes(prev.endTime);
        const isStrictOverlap = vStartMin < prevEndMin;

        if (!v.isManualTime || isStrictOverlap) {
          let travelDur = 20;
          const spec = getInterOfficeSpec(prev.officeName, v.officeName, mode);
          if (spec) {
            travelDur = spec.dur || 20;
          } else {
            const normFrom = prev.officeName.toLowerCase().replace(/\s+/g, ' ').trim();
            const normTo = v.officeName.toLowerCase().replace(/\s+/g, ' ').trim();
            const matched = officesDb.find(o => {
              const f = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
              const t = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
              return (f === normFrom && t === normTo) || (f === normTo && t === normFrom);
            });
            if (matched) {
              travelDur = (mode?.toLowerCase().trim() === 'bike') ? (matched.durationBike || 20) : (matched.durationBus || 25);
            } else {
              travelDur = (mode?.toLowerCase().trim() === 'bike') ? 20 : 25;
            }
          }
          const newStartTime = addMinutesToTime(prev.endTime, travelDur);
          const prevDuration = Math.max(10, timeToMinutes(v.endTime) - timeToMinutes(v.startTime));
          const newEndTime = addMinutesToTime(newStartTime, prevDuration);

          if (!v.isManualTime) {
            if (v.startTime !== newStartTime || v.endTime !== newEndTime) {
              updated[idx] = {
                ...v,
                startTime: newStartTime,
                endTime: newEndTime
              };
            }
          } else if (isStrictOverlap) {
            updated[idx] = {
              ...v,
              startTime: newStartTime,
              endTime: newEndTime
            };
          }
        }
      }
    }
    return updated;
  };

  const computeDetails = useCallback((vts: OfficeVisit[], dateStr: string, dayName: string, mode: 'Bus' | 'Bike' | 'Train' | 'Auto', isWorkedHoliday?: boolean): string => {
    if (dayName === "Sunday" && !isWorkedHoliday) return "SUNDAY";
    if (HOLIDAYS[dateStr] && !isWorkedHoliday) return HOLIDAYS[dateStr];

    const realVisits = vts.filter(v => v.officeName && v.officeName.toLowerCase().replace(/\s+/g, ' ').trim() !== attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim());
    
    if (realVisits.length === 0) {
      const v = vts.find(vx => vx.officeName && vx.officeName.toLowerCase().replace(/\s+/g, ' ').trim() === attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim()) || vts[0] || { startTime: '09:00', endTime: '17:00' };
      return `${to24hDot(v.startTime)} to ${to24hDot(v.endTime)} at ${attachedOffice}., to attend the regular work.`;
    }

    const firstVisit = realVisits[0];
    const travelDur = getTravelDur(firstVisit.officeName, mode);

    const leaveDefaultTime = addMinutesToTime(firstVisit.startTime, -travelDur);
    const defaultOfficeLine = (leaveDefaultTime > "09:00")
      ? `09.00 to ${to24hDot(leaveDefaultTime)} at ${attachedOffice}., to attend the regular work.`
      : "";

    const visitLines = vts.map(v => {
      if (!v.officeName || v.officeName.toLowerCase().replace(/\s+/g, ' ').trim() === attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim()) return "";
      if (v.officeName === "Cuddalore DO") {
        return `${to24hDot(v.startTime)} to ${to24hDot(v.endTime)} at Cuddalore DO.,${v.issues ? ' to attend the ' + v.issues : ''}`;
      }
      const reporter = v.officeName === "Cuddalore HO" ? "PM" : "SPM";
      let issuePart = '.';
      if (v.issues) {
        if (v.issues.toLowerCase().includes('to attend')) {
          issuePart = `, ${v.issues}.`;
        } else {
          issuePart = `, ${reporter} reported ${v.issues}.`;
        }
      }
      
      return `${to24hDot(v.startTime)} to ${to24hDot(v.endTime)} at ${v.officeName}${issuePart}`;
    }).filter(s => s !== "");

    const lastVisit = realVisits[realVisits.length - 1];
    const returnTravelDur = getTravelDur(lastVisit.officeName, mode);
    const reachedAttachedTime = addMinutesToTime(lastVisit.endTime, returnTravelDur);
    const eveningOfficeLine = (reachedAttachedTime < "17:00")
      ? `${to24hDot(reachedAttachedTime)} to 17.00 at ${attachedOffice}., to attend the regular work.`
      : "";

    return [defaultOfficeLine, ...visitLines, eveningOfficeLine].filter(Boolean).join('\n');
  }, [attachedOffice, officesDb]);

  const generateMovementsForDay = (activity: ActivityEntry): MovementEntry[] => {
    const { date, transportMode, visits, leaveType, workedOnHoliday } = activity;
    const dayObj = availableDays.find(d => formatDate(d) === date);
    if (dayObj && !workedOnHoliday && (formatDay(dayObj) === "Sunday" || HOLIDAYS[date])) return [];
    if (leaveType === 'CL' || leaveType === 'EL') return [];

    const realVisits = visits.filter(v => v.officeName && v.officeName.toLowerCase().replace(/\s+/g, ' ').trim() !== attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim());
    if (realVisits.length === 0) return [];

    // uses global isNeyveliClusterOffice

    const baseId = Math.random().toString(36).substr(2, 5);
    const newMoves: MovementEntry[] = [];
    const modeText = transportMode.toUpperCase();
    const firstVisit = realVisits[0];
    const lastVisit = realVisits[realVisits.length - 1];

    if (transportMode === 'Bike') {
      const travelTime = getTravelDur(firstVisit.officeName, transportMode);
      newMoves.push({ id: `${baseId}-b1`, date, fromTime: addMinutesToTime(firstVisit.startTime, -travelTime), fromLocation: attachedOffice.toUpperCase(), toDate: date, toTime: firstVisit.startTime, toLocation: firstVisit.officeName.toUpperCase(), mode: modeText, km: getTravelKm(firstVisit.officeName, transportMode).toString() });
      for (let i = 0; i < realVisits.length - 1; i++) {
        const fromOff = realVisits[i].officeName;
        const toOff = realVisits[i+1].officeName;
        const spec = getInterOfficeSpec(fromOff, toOff, transportMode);
        let legMode = spec?.mode || modeText;
        if (transportMode === 'Bike' && legMode.toUpperCase() === 'WALK') {
          legMode = 'BIKE';
        }
        newMoves.push({ id: `${baseId}-bm${i}`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: addMinutesToTime(realVisits[i].endTime, spec?.dur || 20), toLocation: toOff.toUpperCase(), mode: legMode, km: spec?.km || '10' });
      }
      const returnTime = getTravelDur(lastVisit.officeName, transportMode);
      newMoves.push({ id: `${baseId}-b2`, date, fromTime: lastVisit.endTime, fromLocation: lastVisit.officeName.toUpperCase(), toDate: date, toTime: addMinutesToTime(lastVisit.endTime, returnTime), toLocation: attachedOffice.toUpperCase(), mode: modeText, km: getTravelKm(lastVisit.officeName, transportMode).toString() });
    } else {
      const startIsNeyveliCluster = activeProfile === "Muthvel R" && isNeyveliClusterOffice(attachedOffice) && isNeyveliClusterOffice(firstVisit.officeName);
      if (startIsNeyveliCluster) {
        const travelTime = getTravelDur(firstVisit.officeName, 'Bike');
        newMoves.push({
          id: `${baseId}-bus-s-cluster-bike`,
          date,
          fromTime: addMinutesToTime(firstVisit.startTime, -travelTime),
          fromLocation: attachedOffice.toUpperCase(),
          toDate: date,
          toTime: firstVisit.startTime,
          toLocation: firstVisit.officeName.toUpperCase(),
          mode: 'BIKE',
          km: getTravelKm(firstVisit.officeName, 'Bike').toString()
        });
      } else {
        const isDirectStart = ["Vadalur SO", "Kullanchavadi SO", "Alapakkam SO", "CN Palayam SO", "Cuddalore OT SO", "Cuddalore OT Bazaar SO", "Chidambaram HO"].includes(firstVisit.officeName) || activeProfile !== "Karikalvalavan R";
        if (isDirectStart) {
          const travelTime = getTravelDur(firstVisit.officeName, transportMode);
          const travelFare = getTravelBusFare(firstVisit.officeName);
          newMoves.push({ id: `${baseId}-bus-s-dir`, date, fromTime: addMinutesToTime(firstVisit.startTime, -travelTime), fromLocation: attachedOffice.toUpperCase(), toDate: date, toTime: firstVisit.startTime, toLocation: firstVisit.officeName.toUpperCase(), mode: modeText, km: getTravelKm(firstVisit.officeName, transportMode).toString(), fare: travelFare !== undefined ? travelFare.toString() : undefined });
        } else {
          const specs = getOfficeDynamicSpecs(firstVisit.officeName);
          const hubName = specs.bsName;
          const spokeTime = specs.spokeDuration;
          const totalTravelTime = getTravelDur(firstVisit.officeName, transportMode);
          const isPanruti = hubName === "PANRUTI BUS STAND";
          const hubKm = (specs.hubKm !== undefined && specs.hubKm > 0) ? specs.hubKm : (isPanruti ? 31 : 35);
          newMoves.push({ id: `${baseId}-bus-h1`, date, fromTime: addMinutesToTime(firstVisit.startTime, -totalTravelTime), fromLocation: attachedOffice.toUpperCase(), toDate: date, toTime: addMinutesToTime(firstVisit.startTime, -spokeTime), toLocation: hubName, mode: modeText, km: hubKm.toString(), fare: specs.hubFare !== undefined ? specs.hubFare.toString() : undefined });
          newMoves.push({ id: `${baseId}-bus-s1`, date, fromTime: addMinutesToTime(firstVisit.startTime, -spokeTime), fromLocation: hubName, toDate: date, toTime: firstVisit.startTime, toLocation: firstVisit.officeName.toUpperCase(), mode: SPECIAL_SPOKE_MODES[firstVisit.officeName] || modeText, km: specs.spokeKm.toString(), fare: specs.spokeFare !== undefined ? specs.spokeFare.toString() : undefined });
        }
      }

      for (let i = 0; i < realVisits.length - 1; i++) {
        const fromOff = realVisits[i].officeName;
        const toOff = realVisits[i+1].officeName;
        const legIsNeyveliCluster = activeProfile === "Muthvel R" && isNeyveliClusterOffice(fromOff) && isNeyveliClusterOffice(toOff);
        
        if (legIsNeyveliCluster) {
          const spec = getInterOfficeSpec(fromOff, toOff, 'Bike');
          newMoves.push({
            id: `${baseId}-bus-bm-cluster-bike-${i}`,
            date,
            fromTime: realVisits[i].endTime,
            fromLocation: fromOff.toUpperCase(),
            toDate: date,
            toTime: addMinutesToTime(realVisits[i].endTime, spec?.dur || 20),
            toLocation: toOff.toUpperCase(),
            mode: 'BIKE',
            km: spec?.km || '4'
          });
        } else {
          const spec = getInterOfficeSpec(fromOff, toOff, transportMode);

          if (fromOff === "Kilkavarapattu SO" && CUDDALORE_CLUSTER.includes(toOff)) {
            const bsName = "CUDDALORE BUS STAND";
            const bsArr = addMinutesToTime(realVisits[i].endTime, 45);
            const specs = getOfficeDynamicSpecs(toOff);
            const spokeMode = SPECIAL_SPOKE_MODES[toOff] || modeText;
            newMoves.push({ id: `${baseId}-kvp-bs`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: bsArr, toLocation: bsName, mode: modeText, km: '21' });
            newMoves.push({ id: `${baseId}-bs-kvp-t`, date, fromTime: addMinutesToTime(realVisits[i+1].startTime, -specs.spokeDuration), fromLocation: bsName, toDate: date, toTime: realVisits[i+1].startTime, toLocation: toOff.toUpperCase(), mode: spokeMode, km: specs.spokeKm.toString(), fare: specs.spokeFare !== undefined ? specs.spokeFare.toString() : undefined });
          } else if (spec) {
            if (spec.viaBusStand && spec.viaBusStand.trim()) {
              const bsName = spec.viaBusStand.trim();
              const fromBsDur = spec.fromOfficeToBsMins || 20;
              const fromBsKm = spec.fromOfficeToBsKm || 0;
              const toBsDur = spec.toOfficeToBsMins || 20;
              const toBsKm = spec.toOfficeToBsKm || 0;

              const bsArr = addMinutesToTime(realVisits[i].endTime, fromBsDur);
              // Leg 1: From Office to Bus Stand
              newMoves.push({ id: `${baseId}-bus-seq-${i}-leg1`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: bsArr, toLocation: bsName, mode: modeText, km: fromBsKm.toString(), fare: spec.fromOfficeToBsFare !== undefined ? spec.fromOfficeToBsFare.toString() : undefined });
              // Leg 2: Bus Stand to To Office
              newMoves.push({ id: `${baseId}-bus-seq-${i}-leg2`, date, fromTime: addMinutesToTime(realVisits[i+1].startTime, -toBsDur), fromLocation: bsName, toDate: date, toTime: realVisits[i+1].startTime, toLocation: toOff.toUpperCase(), mode: spec.mode || modeText, km: toBsKm.toString(), fare: spec.toOfficeToBsFare !== undefined ? spec.toOfficeToBsFare.toString() : undefined });
            } else {
              newMoves.push({ id: `${baseId}-bus-seq-${i}-sh`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: addMinutesToTime(realVisits[i].endTime, spec.dur || 20), toLocation: toOff.toUpperCase(), mode: spec.mode || modeText, km: spec.km, fare: spec.fareBus !== undefined ? spec.fareBus.toString() : undefined });
            }
          } else {
            const specs = getOfficeDynamicSpecs(toOff);
            const bsName = specs.bsName;
            const fromSpecs = getOfficeDynamicSpecs(fromOff);
            const spokeToHubTime = fromSpecs.spokeDuration;
            const spokeMode = SPECIAL_SPOKE_MODES[toOff] || modeText;
            const leg1Km = (fromSpecs.spokeKm !== undefined && fromSpecs.spokeKm > 0) ? fromSpecs.spokeKm : (SPOKE_TO_HUB_BUS[fromOff] || 5);
            newMoves.push({ id: `${baseId}-bus-seq-${i}-h`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: addMinutesToTime(realVisits[i].endTime, spokeToHubTime), toLocation: bsName, mode: modeText, km: leg1Km.toString(), fare: fromSpecs.spokeFare !== undefined ? fromSpecs.spokeFare.toString() : undefined });
            newMoves.push({ id: `${baseId}-bus-seq-${i}-s`, date, fromTime: addMinutesToTime(realVisits[i+1].startTime, -specs.spokeDuration), fromLocation: bsName, toDate: date, toTime: realVisits[i+1].startTime, toLocation: toOff.toUpperCase(), mode: spokeMode, km: specs.spokeKm.toString(), fare: specs.spokeFare !== undefined ? specs.spokeFare.toString() : undefined });
          }
        }
      }

      const returnIsNeyveliCluster = activeProfile === "Muthvel R" && isNeyveliClusterOffice(lastVisit.officeName) && isNeyveliClusterOffice(attachedOffice);
      if (returnIsNeyveliCluster) {
        const returnTime = getTravelDur(lastVisit.officeName, 'Bike');
        newMoves.push({
          id: `${baseId}-bus-ret-cluster-bike`,
          date,
          fromTime: lastVisit.endTime,
          fromLocation: lastVisit.officeName.toUpperCase(),
          toDate: date,
          toTime: addMinutesToTime(lastVisit.endTime, returnTime),
          toLocation: attachedOffice.toUpperCase(),
          mode: 'BIKE',
          km: getTravelKm(lastVisit.officeName, 'Bike').toString()
        });
      } else {
        const isDirectEnd = ["Vadalur SO", "Kullanchavadi SO", "Alapakkam SO", "CN Palayam SO", "Cuddalore OT SO", "Cuddalore OT Bazaar SO", "Chidambaram HO"].includes(lastVisit.officeName) || activeProfile !== "Karikalvalavan R";
        if (isDirectEnd) {
          const returnTime = getTravelDur(lastVisit.officeName, transportMode);
          const returnFare = getTravelBusFare(lastVisit.officeName);
          newMoves.push({ id: `${baseId}-bus-ret-dir`, date, fromTime: lastVisit.endTime, fromLocation: lastVisit.officeName.toUpperCase(), toDate: date, toTime: addMinutesToTime(lastVisit.endTime, returnTime), toLocation: attachedOffice.toUpperCase(), mode: modeText, km: getTravelKm(lastVisit.officeName, transportMode).toString(), fare: returnFare !== undefined ? returnFare.toString() : undefined });
        } else {
          const specs = getOfficeDynamicSpecs(lastVisit.officeName);
          if (specs) {
            const bsArr = addMinutesToTime(lastVisit.endTime, specs.spokeDuration);
            const spokeToHubKm = (specs.spokeKm !== undefined && specs.spokeKm > 0) ? specs.spokeKm : (SPOKE_TO_HUB_BUS[lastVisit.officeName] || 5);
            newMoves.push({ id: `${baseId}-bus-ret-h1`, date, fromTime: lastVisit.endTime, fromLocation: lastVisit.officeName.toUpperCase(), toDate: date, toTime: bsArr, toLocation: specs.bsName, mode: SPECIAL_SPOKE_MODES[lastVisit.officeName] || modeText, km: spokeToHubKm.toString(), fare: specs.spokeFare !== undefined ? specs.spokeFare.toString() : undefined });
            const isPanruti = specs.bsName === "PANRUTI BUS STAND";
            const hubReturnTime = (specs.hubDuration !== undefined && specs.hubDuration > 0)
              ? specs.hubDuration
              : (isPanruti ? 55 : Math.max(5, (HUB_DURATIONS[specs.bsName] || 60) - 10));
            const retKm = (specs.hubKm !== undefined && specs.hubKm > 0) ? specs.hubKm : (isPanruti ? 31 : 35);
            newMoves.push({ id: `${baseId}-bus-ret-v1`, date, fromTime: bsArr, fromLocation: specs.bsName, toDate: date, toTime: addMinutesToTime(bsArr, hubReturnTime), toLocation: attachedOffice.toUpperCase(), mode: modeText, km: retKm.toString(), fare: specs.hubFare !== undefined ? specs.hubFare.toString() : undefined });
          } else {
            newMoves.push({ id: `${baseId}-bus-ret-f`, date, fromTime: lastVisit.endTime, fromLocation: lastVisit.officeName.toUpperCase(), toDate: date, toTime: addMinutesToTime(lastVisit.endTime, 50), toLocation: attachedOffice.toUpperCase(), mode: modeText, km: '30' });
          }
        }
      }
    }
    return newMoves;
  };

  const runBikeOptimizer = () => {
    // 1. Get all activities of the current month
    // Merge active form edits for currently selected day if it belongs to current month
    const activeDay = availableDays[selectedDateIdx];
    const activeDateStr = activeDay ? formatDate(activeDay) : '';
    let mergedMonthActs = activities.filter(act => {
      if (!act || !act.date) return false;
      const parts = act.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });

    if (activeDay && activeDateStr) {
      const parts = activeDateStr.split('.');
      if (parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr) {
        const existingIdx = mergedMonthActs.findIndex(a => a.date === activeDateStr);
        const dayName = formatDay(activeDay);
        const activeEntry: ActivityEntry = {
          id: activeDay.toISOString(),
          date: activeDateStr,
          dayName,
          transportMode,
          visits: leaveType ? [] : [...visits],
          leaveType: leaveType || undefined,
          workedOnHoliday: workedOnHoliday || undefined,
          details: leaveType === 'CL' ? 'CASUAL LEAVE' : leaveType === 'EL' ? 'EARNED LEAVE' : computeDetails(visits, activeDateStr, dayName, transportMode, workedOnHoliday)
        };
        if (existingIdx >= 0) {
          mergedMonthActs[existingIdx] = activeEntry;
        } else if (!leaveType && visits.length > 0) {
          mergedMonthActs.push(activeEntry);
        }
      }
    }

    // 2. Identify candidate tour days (days with office visits)
    const candidates: CandidateDay[] = mergedMonthActs.map(act => {
      const realVisits = act.visits.filter(v => v.officeName && v.officeName.toLowerCase().replace(/\s+/g, ' ').trim() !== attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim());
      if (realVisits.length === 0) return null;
      if (act.leaveType === 'CL' || act.leaveType === 'EL') return null;
      
      const dayObj = availableDays.find(d => formatDate(d) === act.date);
      if (dayObj && !act.workedOnHoliday && (formatDay(dayObj) === "Sunday" || HOLIDAYS[act.date])) return null;

      const bikeMoves = generateMovementsForDay({ ...act, transportMode: 'Bike' });
      const bikeKM = bikeMoves
        .filter(m => {
          if ((m.mode || '').toUpperCase() !== 'BIKE') return false;
          if (activeProfile === "Muthvel R" && isNeyveliClusterRoute(m.fromLocation, m.toLocation)) return false;
          return true;
        })
        .reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);
        
      const busMoves = generateMovementsForDay({ ...act, transportMode: 'Bus' });
      const busKM = busMoves
        .filter(m => {
          if ((m.mode || '').toUpperCase() !== 'BIKE') return false;
          if (activeProfile === "Muthvel R" && isNeyveliClusterRoute(m.fromLocation, m.toLocation)) return false;
          return true;
        })
        .reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);

      const gain = Math.max(0, bikeKM - busKM);
        
      return {
        id: act.id,
        date: act.date,
        dayName: act.dayName || (dayObj ? formatDay(dayObj) : ''),
        officesVisited: realVisits.map(v => cleanOfficeSpelling(v.officeName)).join(' ➔ '),
        bikeKM: Math.round(bikeKM * 10) / 10,
        busKM: Math.round(busKM * 10) / 10,
        gain: Math.round(gain * 10) / 10,
        currentMode: act.transportMode,
        originalAct: act
      };
    }).filter(Boolean) as CandidateDay[];

    if (candidates.length === 0) {
      setConfirmModal({
        title: "No Candidate Days Found",
        message: `We couldn't find any saved tour days with office visits in ${new Date(metadata.year, metadata.month).toLocaleString('default', { month: 'long' })} ${metadata.year} to optimize. Please fill and save some days first!`,
        confirmText: "Understood",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    // 3. Baseline Bike KM from non-candidate movements (e.g. manual entries) in the current month
    const candidateDates = new Set(candidates.map(c => c.date));
    const nonCandidateBikeKM = currentMonthMovements
      .filter(m => {
        if (!candidateDates.has(m.date) && (m.mode || '').toUpperCase() === 'BIKE') {
          if (activeProfile === "Muthvel R" && isNeyveliClusterRoute(m.fromLocation, m.toLocation)) return false;
          return true;
        }
        return false;
      })
      .reduce((sum, m) => sum + (parseFloat(m.km) || 0), 0);

    // Baseline bike km if all candidates were set to Bus mode
    const baselineBusBikeKM = nonCandidateBikeKM + candidates.reduce((sum, c) => sum + c.busKM, 0);

    const targetKM = 200;
    const targetGain = targetKM - baselineBusBikeKM;
    const totalPossibleGain = candidates.reduce((sum, c) => sum + c.gain, 0);
    const maxPossibleBikeKM = Math.round((baselineBusBikeKM + totalPossibleGain) * 10) / 10;

    let recommendedUnderIds: string[] = [];
    let recommendedOverIds: string[] = [];

    if (maxPossibleBikeKM <= targetKM) {
      // Even if every candidate day is Bike, it doesn't exceed 200 km
      recommendedUnderIds = candidates.map(c => c.id);
      recommendedOverIds = candidates.map(c => c.id);
    } else if (targetGain <= 0) {
      // Baseline alone is >= 200 km, no bike days needed
      recommendedUnderIds = [];
      recommendedOverIds = [];
    } else {
      // DP subset sum with 0.1 km scaling
      const scaledTarget = Math.round(targetGain * 10);
      const scaledItems = candidates
        .map((c, idx) => ({
          idx,
          id: c.id,
          weight: Math.round(c.gain * 10)
        }))
        .filter(it => it.weight > 0);

      const maxW = scaledItems.reduce((sum, it) => sum + it.weight, 0);
      const dp = new Array(maxW + 1).fill(false);
      const parent = new Array(maxW + 1).fill(-1);
      const choice = new Array(maxW + 1).fill(-1);
      
      dp[0] = true;
      
      for (let i = 0; i < scaledItems.length; i++) {
        const w = scaledItems[i].weight;
        for (let v = maxW; v >= w; v--) {
          if (dp[v - w] && !dp[v]) {
            dp[v] = true;
            parent[v] = v - w;
            choice[v] = i;
          }
        }
      }

      const reconstruct = (weight: number): string[] => {
        if (weight <= 0) return [];
        const ids: string[] = [];
        let curr = weight;
        while (curr > 0) {
          const itemIdx = choice[curr];
          if (itemIdx !== undefined && itemIdx >= 0) {
            ids.push(scaledItems[itemIdx].id);
            curr = parent[curr];
          } else {
            break;
          }
        }
        return ids;
      };

      // Best under or equal to target
      let bestUnderW = 0;
      for (let v = Math.min(scaledTarget, maxW); v >= 0; v--) {
        if (dp[v]) {
          bestUnderW = v;
          break;
        }
      }
      recommendedUnderIds = reconstruct(bestUnderW);

      // Best over or equal to target
      let bestOverW = -1;
      for (let v = scaledTarget; v <= maxW; v++) {
        if (dp[v]) {
          bestOverW = v;
          break;
        }
      }
      if (bestOverW !== -1) {
        recommendedOverIds = reconstruct(bestOverW);
      } else {
        recommendedOverIds = candidates.map(c => c.id);
      }
    }

    setOptimizationResult({
      candidates,
      initialSelectedIds: recommendedUnderIds,
      recommendedUnderIds,
      recommendedOverIds,
      baselineBusBikeKM,
      nonCandidateBikeKM,
      targetKM: 200,
      monthName: new Date(metadata.year, metadata.month).toLocaleString('default', { month: 'long' }),
      year: metadata.year,
      activeProfile
    });
  };

  const applyBikeOptimization = (selectedIds: string[], candidates: CandidateDay[]) => {
    // 1. Save backup of current month before applying optimization
    const currentMonthActs = activities.filter(act => {
      if (!act || !act.date) return false;
      const parts = act.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });

    const currentMonthMoves = movements.filter(m => {
      if (!m || !m.date) return false;
      const parts = m.date.split('.');
      return parts.length === 3 && parts[1] === currentMonthStr && parts[2] === currentYearStr;
    });

    const backupData = {
      profile: activeProfile,
      monthStr: currentMonthStr,
      yearStr: currentYearStr,
      activities: currentMonthActs,
      movements: currentMonthMoves,
      timestamp: new Date().toISOString()
    };

    const backupKey = getProfileStorageKey(activeProfile, 'bike_opt_backup');
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    setBikeOptBackup(backupData);

    const selectedSet = new Set(selectedIds);
    const updatedActsMap = new Map();
    
    candidates.forEach(c => {
      const targetMode: 'Bike' | 'Bus' = selectedSet.has(c.id) ? 'Bike' : 'Bus';
      
      const dParts = c.originalAct.date.split('.');
      const dObj = new Date(parseInt(dParts[2]), parseInt(dParts[1]) - 1, parseInt(dParts[0]));
      const dayName = formatDay(dObj);
      
      updatedActsMap.set(c.id, {
        ...c.originalAct,
        transportMode: targetMode,
        details: c.originalAct.leaveType === 'CL' ? 'CASUAL LEAVE' : c.originalAct.leaveType === 'EL' ? 'EARNED LEAVE' : computeDetails(c.originalAct.visits, c.originalAct.date, dayName, targetMode, c.originalAct.workedOnHoliday)
      });
    });

    let finalActs: ActivityEntry[] = [];
    setActivities(prev => {
      finalActs = prev.map(act => {
        if (updatedActsMap.has(act.id)) {
          return updatedActsMap.get(act.id);
        }
        return act;
      });
      return finalActs;
    });

    let finalMoves: MovementEntry[] = [];
    setMovements(prev => {
      const candidateDates = new Set(candidates.map(c => c.date));
      const filteredMovements = prev.filter(m => !candidateDates.has(m.date) || m.isManual);
      
      const newMoves: MovementEntry[] = [];
      candidates.forEach(c => {
        const updatedAct = updatedActsMap.get(c.id);
        const dayMoves = generateMovementsForDay(updatedAct);
        newMoves.push(...dayMoves);
      });

      finalMoves = [...filteredMovements, ...newMoves].sort((a, b) => {
        const dComp = a.date.split('.').reverse().join('').localeCompare(b.date.split('.').reverse().join(''));
        return dComp !== 0 ? dComp : a.fromTime.localeCompare(b.fromTime);
      });
      return finalMoves;
    });

    // Synchronous direct localStorage persistence
    try {
      const keyActs = getProfileStorageKey(activeProfile, "activities");
      localStorage.setItem(keyActs, JSON.stringify(finalActs));
      const keyMoves = getProfileStorageKey(activeProfile, "movements");
      localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
    } catch {
      // ignore
    }

    // Also synchronize current active form on screen if it matches one of the candidate days
    const activeDay = availableDays[selectedDateIdx];
    if (activeDay) {
      const activeDateStr = formatDate(activeDay);
      const matchedCand = candidates.find(c => c.date === activeDateStr);
      if (matchedCand && updatedActsMap.has(matchedCand.id)) {
        const updatedAct = updatedActsMap.get(matchedCand.id);
        setTransportMode(updatedAct.transportMode);
        if (updatedAct.visits) {
          setVisits(updatedAct.visits);
        }
      }
    }

    setOptimizationResult(null);

    setConfirmModal({
      title: "Optimization Applied & Saved! 🚴",
      message: `Successfully set and saved ${selectedIds.length} days to BIKE mode and ${candidates.length - selectedIds.length} days to BUS mode.\n\nYour monthly Bike distance is now optimized and stored in your diary.`,
      confirmText: "Super, Got It!",
      accentColor: "emerald",
      onConfirm: () => setConfirmModal(null)
    });
  };

  const restorePreOptimizationState = () => {
    const key = getProfileStorageKey(activeProfile, 'bike_opt_backup');
    const saved = localStorage.getItem(key);
    
    if (!saved && !bikeOptBackup) {
      setConfirmModal({
        title: "No Backup Found",
        message: "No pre-optimization record was found for the current month.",
        confirmText: "OK",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    const backup = bikeOptBackup || JSON.parse(saved!);
    const backupActs = backup.activities || [];
    const backupMoves = backup.movements || [];

    const backupActMap = new Map(backupActs.map((a: any) => [a.id, a]));
    const backupDateSet = new Set(backupActs.map((a: any) => a.date));

    setActivities(prev => {
      return prev.map(act => {
        if (backupActMap.has(act.id)) {
          return backupActMap.get(act.id);
        }
        return act;
      });
    });

    setMovements(prev => {
      const filtered = prev.filter(m => !backupDateSet.has(m.date));
      return [...filtered, ...backupMoves].sort((a, b) => {
        const dComp = a.date.split('.').reverse().join('').localeCompare(b.date.split('.').reverse().join(''));
        return dComp !== 0 ? dComp : a.fromTime.localeCompare(b.fromTime);
      });
    });

    localStorage.removeItem(key);
    setBikeOptBackup(null);
    setOptimizationResult(null);

    // Refresh current form if active day was part of backup
    const activeDay = availableDays[selectedDateIdx];
    if (activeDay) {
      const activeDateStr = formatDate(activeDay);
      const prevAct = backupActs.find((a: any) => a.date === activeDateStr);
      if (prevAct) {
        setTransportMode(prevAct.transportMode || 'Bus');
        if (prevAct.visits) setVisits(prevAct.visits);
      }
    }

    setConfirmModal({
      title: "Restored Pre-Optimization State! 🔄",
      message: `Successfully reverted ${backupActs.length} days to their transport modes and movements prior to optimization.`,
      confirmText: "Great, Got It!",
      accentColor: "emerald",
      onConfirm: () => setConfirmModal(null)
    });
  };

  const handleSaveDay = (advanceToNext: boolean = true) => {
    const day = availableDays[selectedDateIdx];
    if (!day) return;
    const dateStr = formatDate(day);
    const dayName = formatDay(day);
    const newActivity: ActivityEntry = {
      id: day.toISOString(),
      date: dateStr,
      dayName: dayName,
      transportMode,
      visits: leaveType ? [] : [...visits],
      leaveType: leaveType || undefined,
      workedOnHoliday: workedOnHoliday || undefined,
      details: leaveType === 'CL' ? 'CASUAL LEAVE' : leaveType === 'EL' ? 'EARNED LEAVE' : computeDetails(visits, dateStr, dayName, transportMode, workedOnHoliday)
    };
    
    let updatedActivities: ActivityEntry[] = [];
    setActivities(prev => {
      const filtered = prev.filter(a => a.date !== newActivity.date);
      updatedActivities = [...filtered, newActivity].sort((a, b) => a.id.localeCompare(b.id));
      return updatedActivities;
    });

    const newMoves = generateMovementsForDay(newActivity);
    let updatedMovements: MovementEntry[] = [];
    setMovements(prev => {
      const others = prev.filter(m => m.date !== newActivity.date || m.isManual);
      updatedMovements = [...others, ...newMoves].sort((a, b) => {
        const dComp = a.date.split('.').reverse().join('').localeCompare(b.date.split('.').reverse().join(''));
        return dComp !== 0 ? dComp : a.fromTime.localeCompare(b.fromTime);
      });
      return updatedMovements;
    });

    try {
      const keyActs = getProfileStorageKey(activeProfile, "activities");
      localStorage.setItem(keyActs, JSON.stringify(updatedActivities));
      const keyMoves = getProfileStorageKey(activeProfile, "movements");
      localStorage.setItem(keyMoves, JSON.stringify(updatedMovements));
    } catch {
      // ignore
    }

    if (advanceToNext && selectedDateIdx < availableDays.length - 1) {
      setSelectedDateIdx(selectedDateIdx + 1);
      setVisits([{ id: Math.random().toString(36).substr(2, 5), officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
    } else {
      setSaveSuccessFeedback(true);
      setTimeout(() => setSaveSuccessFeedback(false), 2500);
    }
  };

  const deleteSavedDay = (date: string) => {
    setActivities(prev => prev.filter(a => a.date !== date));
    setMovements(prev => prev.filter(m => m.date !== date));
  };

  const handleExport = (exportMonth: number, exportYear: number, exportFortnight: 'first' | 'second') => {
    const exportDays = getFortnightDays(exportYear, exportMonth, exportFortnight);
    const fortnightKeys = new Set(exportDays.map(day => formatDate(day)));
    const fortnightActivities = activities.filter(a => fortnightKeys.has(a.date));
    const fortnightMovements = movements.filter(m => fortnightKeys.has(m.date));

    const tempMetadata = {
      ...metadata,
      month: exportMonth,
      year: exportYear,
      fortnight: exportFortnight
    };

    const checkPadding = () => {
      if (fortnightActivities.length < exportDays.length) {
        setConfirmModal({
          title: "Missing Days in Fortnight",
          message: `You only have ${fortnightActivities.length} days out of ${exportDays.length} filled for this fortnight. Would you like to automatically fill the remaining days with the default 'At ${attachedOffice}'?`,
          confirmText: "Yes, Auto-fill & Export Diary",
          cancelText: "No, Export Diary as is",
          accentColor: "blue",
          onConfirm: () => {
            const paddingActivities = exportDays.filter(day => !fortnightActivities.some(a => a.date === formatDate(day))).map(day => {
              const dStr = formatDate(day);
              const dNm = formatDay(day);
              return {
                id: day.toISOString(),
                date: dStr,
                dayName: dNm,
                transportMode: 'Bus' as const,
                visits: [{ id: 'pad', officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }],
                details: computeDetails([{ id: 'pad', officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }], dStr, dNm, 'Bus')
              };
            });
            generateWordDoc(tempMetadata, [...fortnightActivities, ...paddingActivities].sort((a,b) => a.id.localeCompare(b.id)), fortnightMovements);
            setConfirmModal(null);
          },
          onCancel: () => {
            generateWordDoc(tempMetadata, fortnightActivities, fortnightMovements);
            setConfirmModal(null);
          }
        });
      } else {
        generateWordDoc(tempMetadata, fortnightActivities, fortnightMovements);
      }
    };

    checkPadding();
  };

  const handleExportTA = (exportMonth: number, exportYear: number, format: 'excel' | 'word' = 'excel') => {
    const firstFort = getFortnightDays(exportYear, exportMonth, 'first');
    const secondFort = getFortnightDays(exportYear, exportMonth, 'second');
    const fullMonthDays = [...firstFort, ...secondFort];

    const monthKeys = new Set(fullMonthDays.map(day => formatDate(day)));
    const monthActivities = activities.filter(a => monthKeys.has(a.date));
    const monthMovements = movements.filter(m => monthKeys.has(m.date));

    const tempMetadata = {
      ...metadata,
      month: exportMonth,
      year: exportYear
    };

    const checkTAPadding = () => {
      if (monthActivities.length < fullMonthDays.length) {
        setConfirmModal({
          title: "Missing Days in Month",
          message: `You only have ${monthActivities.length} days out of ${fullMonthDays.length} filled for this month. Would you like to automatically fill the remaining days with the default 'At ${attachedOffice}'?`,
          confirmText: "Yes, Auto-fill & Export TA",
          cancelText: "No, Export TA as is",
          accentColor: "blue",
          onConfirm: () => {
            const paddingActivities = fullMonthDays.filter(day => !monthActivities.some(a => a.date === formatDate(day))).map(day => {
              const dStr = formatDate(day);
              const dNm = formatDay(day);
              return {
                id: day.toISOString(),
                date: dStr,
                dayName: dNm,
                transportMode: 'Bus' as const,
                visits: [{ id: 'pad', officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }],
                details: computeDetails([{ id: 'pad', officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }], dStr, dNm, 'Bus')
              };
            });
            generateTACalculationsDoc(tempMetadata, [...monthActivities, ...paddingActivities].sort((a,b) => a.id.localeCompare(b.id)), monthMovements, serviceCalls, attachedOffice, officesDb, format);
            setConfirmModal(null);
          },
          onCancel: () => {
            generateTACalculationsDoc(tempMetadata, monthActivities, monthMovements, serviceCalls, attachedOffice, officesDb, format);
            setConfirmModal(null);
          }
        });
      } else {
        generateTACalculationsDoc(tempMetadata, monthActivities, monthMovements, serviceCalls, attachedOffice, officesDb, format);
      }
    };

    checkTAPadding();
  };

  const handleExportTABill = () => {
    setTaBillMonth(metadata.month);
    setTaBillYear(metadata.year);
    setShowTABillModal(true);
  };

  const exportAllDataAsJSON = () => {
    try {
      const fullStorage: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('diary_')) {
          fullStorage[key] = localStorage.getItem(key) || '';
        }
      }
      
      const payload = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        activeProfile,
        profiles,
        metadata,
        activities,
        movements,
        officesDb,
        attachedOffice,
        serviceCalls,
        fullStorage
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SADairy_Backup_${metadata.name ? metadata.name.replace(/\s+/g, '_') : 'Workspace'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Error downloading backup: " + e.message);
    }
  };

  const handleFileUploadSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!parsed.activities && !parsed.metadata && !parsed.fullStorage) {
          throw new Error("Invalid backup file format.");
        }
        
        setConfirmModal({
          title: "Restore from Backup File 📂",
          message: `Are you sure you want to restore the backup file "${file.name}"? This will update your local workspace with the saved data.`,
          confirmText: "Yes, Restore Backup",
          cancelText: "Cancel",
          accentColor: "blue",
          onConfirm: () => {
            if (parsed.fullStorage) {
              const storage = parsed.fullStorage;
              Object.keys(storage).forEach(key => {
                localStorage.setItem(key, storage[key]);
              });
              
              const activeProf = localStorage.getItem('diary_active_profile') || parsed.activeProfile || "Default Profile";
              const prefix = isSystemDefaultProfile(activeProf) ? "diary_" : `diary_profile_${activeProf}_`;
              
              const savedProfiles = localStorage.getItem('diary_profiles_list');
              if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
              
              setActiveProfile(activeProf);
              loadedProfileRef.current = activeProf;
              
              const metaVal = localStorage.getItem(`${prefix}metadata`);
              if (metaVal) setMetadata(JSON.parse(metaVal));
              
              const actVal = localStorage.getItem(`${prefix}activities`);
              if (actVal) setActivities(JSON.parse(actVal));
              
              const movVal = localStorage.getItem(`${prefix}movements`);
              if (movVal) setMovements(JSON.parse(movVal));
              
              const attOffice = localStorage.getItem(`${prefix}attached_office`);
              if (attOffice) setAttachedOffice(attOffice);
              
              const offDb = localStorage.getItem(`${prefix}offices_db`);
              if (offDb) setOfficesDb(JSON.parse(offDb));
              
              const servCalls = localStorage.getItem(`${prefix}service_calls`);
              if (servCalls) setServiceCalls(JSON.parse(servCalls));
              
              const confScr = localStorage.getItem(`${prefix}confirmed_scr_days`);
              if (confScr) setConfirmedScrDays(JSON.parse(confScr));
              
              const scrDef = localStorage.getItem(`${prefix}scr_defaults`);
              if (scrDef) setScrDefaults(JSON.parse(scrDef));
            } else {
              if (parsed.metadata) setMetadata(parsed.metadata);
              if (parsed.activities) setActivities(parsed.activities);
              if (parsed.movements) setMovements(parsed.movements);
              let finalOffices = parsed.officesDb || [];
              if (parsed.interOfficeDb) {
                finalOffices = mergeInterOfficeIntoOffices(finalOffices, parsed.interOfficeDb);
              }
              if (finalOffices.length > 0) setOfficesDb(migrateOfficesDb(finalOffices));
              if (parsed.attachedOffice) setAttachedOffice(parsed.attachedOffice);
              if (parsed.serviceCalls) setServiceCalls(parsed.serviceCalls);
            }
            
            e.target.value = '';
            setConfirmModal({
              title: "Restore Complete! ✅",
              message: "Successfully restored your local workspace entries, movements, and office configuration.",
              confirmText: "Done",
              accentColor: "emerald",
              onConfirm: () => setConfirmModal(null)
            });
          },
          onCancel: () => {
            e.target.value = '';
            setConfirmModal(null);
          }
        });
      } catch (err: any) {
        setConfirmModal({
          title: "Failed to Parse Backup",
          message: "The selected file is not a valid SA Diary JSON backup file. Please select a valid JSON backup.",
          confirmText: "Close",
          accentColor: "rose",
          onConfirm: () => setConfirmModal(null)
        });
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleApplyQRTransferData = (parsed: any, mode: 'overwrite' | 'merge' = 'overwrite') => {
    if (!parsed) return;

    try {
      if (parsed.fullStorage) {
        const storage = parsed.fullStorage;
        if (mode === 'overwrite') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('diary_')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        }

        // Apply all storage keys from payload
        Object.keys(storage).forEach(key => {
          localStorage.setItem(key, storage[key]);
        });

        const activeProf = localStorage.getItem('diary_active_profile') || parsed.activeProfile || "Default Profile";
        const prefix = isSystemDefaultProfile(activeProf) ? "diary_" : `diary_profile_${activeProf}_`;

        const savedProfiles = localStorage.getItem('diary_profiles_list');
        if (savedProfiles) setProfiles(JSON.parse(savedProfiles));

        setActiveProfile(activeProf);
        loadedProfileRef.current = activeProf;

        const metaVal = localStorage.getItem(`${prefix}metadata`);
        if (metaVal) setMetadata(JSON.parse(metaVal));

        const actVal = localStorage.getItem(`${prefix}activities`);
        if (actVal) setActivities(JSON.parse(actVal));

        const movVal = localStorage.getItem(`${prefix}movements`);
        if (movVal) setMovements(JSON.parse(movVal));

        const attOffice = localStorage.getItem(`${prefix}attached_office`);
        if (attOffice) setAttachedOffice(attOffice);

        const offDb = localStorage.getItem(`${prefix}offices_db`);
        if (offDb) setOfficesDb(JSON.parse(offDb));

        const servCalls = localStorage.getItem(`${prefix}service_calls`);
        if (servCalls) setServiceCalls(JSON.parse(servCalls));

        const confScr = localStorage.getItem(`${prefix}confirmed_scr_days`);
        if (confScr) setConfirmedScrDays(JSON.parse(confScr));

        const scrDef = localStorage.getItem(`${prefix}scr_defaults`);
        if (scrDef) setScrDefaults(JSON.parse(scrDef));
      } else {
        if (parsed.metadata) setMetadata(parsed.metadata);
        if (parsed.activities) setActivities(parsed.activities);
        if (parsed.movements) setMovements(parsed.movements);
        let finalOffices = parsed.officesDb || [];
        if (parsed.interOfficeDb) {
          finalOffices = mergeInterOfficeIntoOffices(finalOffices, parsed.interOfficeDb);
        }
        if (finalOffices.length > 0) setOfficesDb(migrateOfficesDb(finalOffices));
        if (parsed.attachedOffice) setAttachedOffice(parsed.attachedOffice);
        if (parsed.serviceCalls) setServiceCalls(parsed.serviceCalls);
      }

      setConfirmModal({
        title: "Sync Successful! 🚀",
        message: "Your workspace has been successfully synced and updated with all transferred data.",
        confirmText: "Great, Continue",
        accentColor: "emerald",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (e: any) {
      console.error("Error applying QR transfer payload", e);
      setConfirmModal({
        title: "Sync Error",
        message: "Failed to apply the received data payload. Please try again.",
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
    }
  };

  // Direct 1-Click Cloud Sync (Mobile <-> PC)
  const handleUploadToCloud = async (silent: boolean = false) => {
    setIsCloudSyncing(true);
    try {
      const fullStorage: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('diary_')) {
          fullStorage[k] = localStorage.getItem(k) || '';
        }
      }

      const payload = {
        type: 'sa_diary_cross_device_sync',
        timestamp: Date.now(),
        device: detectedDevice,
        activeProfile,
        metadata,
        fullStorage
      };

      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, device: detectedDevice })
      });

      const data = await res.json();
      if (data.success) {
        const now = data.updatedAt || Date.now();
        setLastLocalSyncTime(now);
        localStorage.setItem('diary_last_cloud_sync_time', String(now));
        setHasNewCloudData(false);
        setCloudSyncStatus({
          hasData: true,
          updatedAt: now,
          device: detectedDevice,
          profileName: activeProfile
        });
        if (!silent) {
          setSyncToast({
            type: 'success',
            message: `Uploaded from ${detectedDevice}! ☁️`,
            sub: `Your data is backed up. Ready to download on your ${detectedDevice === 'Mobile' ? 'PC' : 'Mobile'} anytime.`
          });
          setTimeout(() => setSyncToast(null), 5000);
        }
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Cloud upload error:', err);
      if (!silent) {
        setSyncToast({
          type: 'error',
          message: 'Upload to Cloud Failed',
          sub: err.message || 'Please check your connection and retry.'
        });
        setTimeout(() => setSyncToast(null), 6000);
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDownloadFromCloud = async (silent: boolean = false) => {
    setIsCloudSyncing(true);
    try {
      const res = await fetch('/api/sync/pull');
      const data = await res.json();

      if (data.success && data.payload) {
        handleApplyQRTransferData(data.payload, 'overwrite');
        const now = data.updatedAt || Date.now();
        setLastLocalSyncTime(now);
        localStorage.setItem('diary_last_cloud_sync_time', String(now));
        setHasNewCloudData(false);
        setCloudSyncStatus({
          hasData: true,
          updatedAt: now,
          device: data.device,
          profileName: data.profileName
        });
        if (!silent) {
          setSyncToast({
            type: 'success',
            message: `Synced with ${data.device || 'other device'}! 🚀`,
            sub: 'All work diaries, travel logs, and database entries have been refreshed.'
          });
          setTimeout(() => setSyncToast(null), 5000);
        }
      } else {
        throw new Error(data.message || 'No cloud data found to download');
      }
    } catch (err: any) {
      console.error('Cloud download error:', err);
      if (!silent) {
        setSyncToast({
          type: 'error',
          message: 'Download from Cloud Failed',
          sub: err.message || 'No cloud sync record found. Please upload from your other device first.'
        });
        setTimeout(() => setSyncToast(null), 6000);
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const checkCloudSyncStatus = useCallback(async () => {
    if (operatingMode === 'offline') return;
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      if (data.success && data.hasData) {
        setCloudSyncStatus(data);
        if (data.updatedAt > (lastLocalSyncTime + 3000) && data.device !== detectedDevice) {
          setHasNewCloudData(true);
        }
      }
    } catch (e) {
      // Background status check error ignored
    }
  }, [operatingMode, lastLocalSyncTime, detectedDevice]);

  useEffect(() => {
    if (operatingMode === 'offline') return;
    checkCloudSyncStatus();
    const interval = setInterval(checkCloudSyncStatus, 20000);
    const onFocus = () => checkCloudSyncStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [operatingMode, checkCloudSyncStatus]);

  const entryActiveDay = availableDays[selectedDateIdx];
  const entryIsSundayOrHoliday = entryActiveDay ? !!(HOLIDAYS[formatDate(entryActiveDay)] || formatDay(entryActiveDay) === 'Sunday') : false;
  const entryShouldHideTravel = entryIsSundayOrHoliday && !workedOnHoliday;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-inter text-slate-900">
      {/* Toast Notification Alert */}
      {syncToast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all flex items-start gap-3 animate-fade-in ${
          syncToast.type === 'success' 
            ? 'bg-slate-900/95 text-white border-emerald-500/60' 
            : 'bg-rose-950/95 text-white border-rose-500/60'
        }`}>
          {syncToast.type === 'success' ? (
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 size={18} />
            </div>
          ) : (
            <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <AlertCircle size={18} />
            </div>
          )}
          <div className="space-y-0.5 flex-1 text-left">
            <p className="text-xs font-black tracking-wide">{syncToast.message}</p>
            {syncToast.sub && <p className="text-[11px] text-slate-300 font-medium leading-tight">{syncToast.sub}</p>}
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-400 hover:text-white cursor-pointer border-0 bg-transparent p-1">
            <X size={14} />
          </button>
        </div>
      )}


      <header className="bg-white border-b border-slate-200 relative z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src={logo} 
              alt="SA's Diary Logo" 
              className="w-11 h-11 sm:w-16 sm:h-16 object-contain rounded-2xl shadow-md border border-slate-200 bg-white" 
              referrerPolicy="no-referrer" 
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight leading-none">SA Diary</h1>
                {/* Single Online vs Offline Selector at the top */}
                <ModeSelector 
                  mode={operatingMode} 
                  onChange={handleSetOperatingMode} 
                  size="sm"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block mt-1">
                System &amp; Network Admin
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* 6-Digit PIN Sync & QR Transfer Hub */}
            <div className="flex items-center bg-slate-950 text-white p-1 rounded-2xl shadow-xl border border-slate-800">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 text-[11px] font-bold border-r border-slate-800">
                <KeyRound size={14} className="text-emerald-400" />
                <span className="hidden md:inline font-extrabold text-slate-200">PIN Sync</span>
                <span className="text-[10px] bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-black">
                  {detectedDevice}
                </span>
              </div>

              <button 
                id="pin-upload-btn"
                onClick={() => {
                  setPinSyncInitialMode('upload');
                  setShowPinSyncModal(true);
                }}
                className="flex items-center justify-center gap-1.5 hover:bg-emerald-500 text-white hover:text-slate-950 bg-emerald-600 px-3 py-1.5 sm:py-2 rounded-xl font-black transition-all active:scale-95 text-[11px] sm:text-xs cursor-pointer whitespace-nowrap border-0"
                title="Upload data and generate a 6-digit PIN"
              >
                <Upload size={13} />
                <span>Upload</span>
              </button>

              <button 
                id="pin-download-btn"
                onClick={() => {
                  setPinSyncInitialMode('download');
                  setShowPinSyncModal(true);
                }}
                className="flex items-center justify-center gap-1.5 hover:bg-indigo-500 text-white bg-indigo-600 ml-1 px-3 py-1.5 sm:py-2 rounded-xl font-black transition-all active:scale-95 text-[11px] sm:text-xs cursor-pointer whitespace-nowrap border-0"
                title="Enter 6-digit PIN to download data"
              >
                <Download size={13} />
                <span>Download</span>
              </button>
            </div>
            <button 
              id="export-diary-btn"
              onClick={() => {
                setExportDiaryMonth(metadata.month ?? new Date().getMonth());
                setExportDiaryYear(metadata.year ?? new Date().getFullYear());
                setExportDiaryFortnight(metadata.fortnight ?? 'first');
                setShowExportDiaryModal(true);
              }} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 text-[11px] sm:text-sm cursor-pointer whitespace-nowrap"
            >
              <Download size={14} className="sm:w-[18px] sm:h-[18px]" /> 
              <span>Dairy</span>
            </button>
            <button 
              id="export-ta-btn"
              onClick={() => {
                setExportTAMonth(metadata.month ?? new Date().getMonth());
                setExportTAYear(metadata.year ?? new Date().getFullYear());
                setShowExportTAModal(true);
              }} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 text-[11px] sm:text-sm cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet size={14} className="sm:w-[18px] sm:h-[18px]" /> 
              <span>TA Calculations</span>
            </button>
            <button 
              id="export-ta-bill-btn"
              onClick={() => {
                setTaBillMonth(metadata.month ?? new Date().getMonth());
                setTaBillYear(metadata.year ?? new Date().getFullYear());
                setShowTABillModal(true);
              }} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 text-[11px] sm:text-sm cursor-pointer whitespace-nowrap shadow-amber-100/50"
            >
              <FileText size={14} className="sm:w-[18px] sm:h-[18px]" /> 
              <span>TA Bill</span>
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton onOpenOfflineModal={() => setShowOfflinePackageModal(true)} />
          </div>
        </div>
      </header>

      {/* 6 Pages/Tabs Selector */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-2.5 bg-slate-100 border border-slate-200 rounded-[2rem] shadow-sm">
          <button 
            id="tab-btn-profile"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'profile' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <Settings size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">1. Profile Settings</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                {metadata.name || 'Setup profile'}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-scr"
            onClick={() => setActiveTab('scr')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'scr' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'scr' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">2. SCR Generator</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                {showAllMonths 
                  ? `${historicalMonthServiceCallsCount} Drafts (${selectedHistoricalMonth})` 
                  : `${currentMonthServiceCalls.length} Drafts Saved`}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-entry"
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'entry' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'entry' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <PlusCircle size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">3. New Work Entry</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                Active: {availableDays[selectedDateIdx] ? formatDate(availableDays[selectedDateIdx]) : 'Completed'}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-summary"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'summary' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">4. Saved Summary</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                {showAllMonths 
                  ? `${historicalMonthActivitiesCount} Days (${selectedHistoricalMonth})` 
                  : `${currentFortnightActivitiesCount} of ${availableDays.length} Days filled`}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-movements"
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'movements' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'movements' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">5. Live Travel Log</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                {showAllMonths 
                  ? `${historicalMonthMovements.length} rows • ${Number.isInteger(historicalMonthKM) ? historicalMonthKM : parseFloat(historicalMonthKM.toFixed(2))} KM (${selectedHistoricalMonth})` 
                  : `${currentFortnightMovements.length} rows • ${Number.isInteger(currentFortnightKM) ? currentFortnightKM : parseFloat(currentFortnightKM.toFixed(2))} KM`}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'database' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'database' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <Settings2 size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">6. Configuration</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                Defaults, offices & delete data
              </span>
            </div>
          </button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-10">
        {activeTab === 'profile' && (
          <>
            {/* User Profile Management System */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="text-left space-y-1">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-wider border border-indigo-100">
                    📂 Multi-Profile System
                  </span>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">
                    Manage Active Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-xl">
                    Create and switch profiles. Different profiles have completely independent work diaries, office databases, and configuration settings.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Select active profile */}
                  <div className="relative">
                    <select
                      value={activeProfile}
                      onChange={(e) => switchProfile(e.target.value)}
                      className="pl-4 pr-10 py-3 bg-slate-100 hover:bg-slate-200/60 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 outline-none transition-all cursor-pointer appearance-none"
                    >
                      {profiles.map((p) => (
                        <option key={p} value={p}>
                          👤 {p} {p === "Default Profile" || p === "Karikalvalavan R" ? "(System Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>

                  {/* Clear Profile Data button */}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        title: `Clear All Data for Profile "${activeProfile}"?`,
                        message: `This will wipe all work diary entries, movements, service call reports, and custom office matrix settings for "${activeProfile}". Profile configuration will reset to default.`,
                        confirmText: "Yes, Clear Profile Data",
                        accentColor: "rose",
                        onConfirm: () => {
                          purgeKeysForProfile(activeProfile, true);
                          window.location.reload();
                        }
                      });
                    }}
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 text-amber-700 rounded-2xl text-xs font-black uppercase tracking-wider border border-amber-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Clear all saved data for this profile"
                  >
                    <Trash2 size={13} />
                    <span>Clear Profile Data</span>
                  </button>

                  {/* Delete Previous Month Data button */}
                  <button
                    type="button"
                    id="btn-goto-month-cleanup"
                    onClick={() => {
                      setActiveTab('database');
                      setTimeout(() => {
                        const el = document.getElementById('month-wise-data-management-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-wider border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Select and delete previous month entered data month-wise"
                  >
                    <Trash2 size={13} />
                    <span>Delete Month Data</span>
                  </button>

                  {/* Delete Profile button */}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        title: `Delete Profile "${activeProfile}"?`,
                        message: `This will permanently delete all metadata, work entries, custom office databases, and transit settings recorded for "${activeProfile}". This action cannot be undone.`,
                        confirmText: "Yes, Delete permanently",
                        accentColor: "rose",
                        onConfirm: () => {
                          const updated = profiles.filter((p) => p !== activeProfile);
                          const finalProfiles = updated.length === 0 ? ["Default Profile"] : updated;
                          setProfiles(finalProfiles);
                          localStorage.setItem('diary_profiles_list', JSON.stringify(finalProfiles));
                          
                          // Delete from localStorage and cloud payload all profile keys using helper
                          purgeKeysForProfile(activeProfile);
                          
                          // Switch back to next profile remaining or Default Profile
                          const nextProfile = finalProfiles[0];
                          switchProfile(nextProfile);
                          setConfirmModal(null);
                        }
                      });
                    }}
                    className="px-4 py-3 bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 rounded-2xl text-xs font-black uppercase tracking-wider border border-red-100 transition-all cursor-pointer"
                    title="Delete this profile"
                  >
                    Delete Profile
                  </button>
                </div>
              </div>

              {/* Add New Profile Sub-Form */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter new profile name... (e.g. July 2026 Admin)"
                  id="new-profile-name-input"
                  className="flex-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      const val = input.value.trim();
                      if (val) {
                        addNewProfile(val);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('new-profile-name-input') as HTMLInputElement;
                    const val = input ? input.value.trim() : '';
                    if (!val) {
                      alert("Please type a profile name first!");
                      return;
                    }
                    addNewProfile(val);
                    if (input) input.value = '';
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Create & Load Profile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm" id="profile-section">
               <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2" id="profile-heading"><User size={14}/> Professional Profile</label>
               <div className="space-y-3">
                  <input type="text" id="profile-name-input" placeholder="Full Name" value={metadata.name || ''} onChange={e => setMetadata({...metadata, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" />
                  <input type="text" id="profile-office-input" placeholder="Sub Division / HO (e.g. Chidambaram HO)" value={metadata.office || ''} onChange={e => setMetadata({...metadata, office: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" />

                  

               </div>
            </section>
            <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm animate-fade-in" id="submission-section">
               <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14}/> Submission Info</label>
               <div className="space-y-3">
                  <input type="text" placeholder="Place" value={metadata.submissionPlace || ''} onChange={e => setMetadata({...metadata, submissionPlace: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all animate-fade-in" />
                  <input type="text" placeholder="Date" value={metadata.submissionDate || ''} onChange={e => setMetadata({...metadata, submissionDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all animate-fade-in" />
               </div>
            </section>
          </div>

          {/* Notification Reminder Settings Card */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm mt-6 text-left space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
                  ⏰ Diary Update Reminders & Notifications
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Set your notification scheduler preferences to remind you to keep your work diary logs updated.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                  Reminder Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const enabled = !notifEnabled;
                      if (enabled) {
                        const granted = await requestNotificationPermission();
                        if (!granted) {
                          alert("System notification permission is not granted. Enabling in-app reminders instead!");
                        }
                      }
                      setNotifEnabled(enabled);
                      localStorage.setItem('diary_notif_enabled', String(enabled));
                      localStorage.setItem('diary_notif_configured', 'true');
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                      notifEnabled
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {notifEnabled ? "🔔 Reminders Active" : "🔕 Reminders Off"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                  Day Frequency
                </label>
                <div className="relative">
                  <select
                    value={notifFrequency}
                    onChange={(e) => {
                      setNotifFrequency(e.target.value);
                      localStorage.setItem('diary_notif_frequency', e.target.value);
                      localStorage.setItem('diary_notif_configured', 'true');
                    }}
                    disabled={!notifEnabled}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 disabled:opacity-50 transition-all cursor-pointer appearance-none"
                  >
                    <option value="mon_to_sat">💼 Monday to Saturday (Mon-Sat)</option>
                    <option value="daily">📅 Every Single Day (Sun-Sat)</option>
                    <option value="weekday">💼 Weekdays Only (Mon-Fri)</option>
                    <option value="weekly_sat">🗓️ Weekly (Every Saturday)</option>
                    <option value="weekly_sun">🗓️ Weekly (Every Sunday)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                  Alert Frequency Per Day
                </label>
                <div className="relative">
                  <select
                    value={notifTimesPerDay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNotifTimesPerDay(val);
                      localStorage.setItem('diary_notif_times_per_day', String(val));
                      localStorage.setItem('diary_notif_configured', 'true');
                    }}
                    disabled={!notifEnabled}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 disabled:opacity-50 transition-all cursor-pointer appearance-none"
                  >
                    <option value={1}>🔔 1 Time Daily</option>
                    <option value={2}>🔔🔔 2 Times Daily</option>
                    <option value={3}>🔔🔔🔔 3 Times Daily</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Time Selectors */}
            {notifEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-dashed border-slate-200 bg-slate-50/50 p-4 rounded-2xl">
                {notifTimesPerDay >= 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      ⏰ First Reminder Time
                    </span>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime1}
                        onChange={(e) => {
                          setNotifTime1(e.target.value);
                          localStorage.setItem('diary_notif_time1', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}

                {notifTimesPerDay >= 2 && (
                  <div className="space-y-1.5 animate-fade-in">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      ⏰ Second Reminder Time
                    </span>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime2}
                        onChange={(e) => {
                          setNotifTime2(e.target.value);
                          localStorage.setItem('diary_notif_time2', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}

                {notifTimesPerDay >= 3 && (
                  <div className="space-y-1.5 animate-fade-in">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      ⏰ Third Reminder Time
                    </span>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime3}
                        onChange={(e) => {
                          setNotifTime3(e.target.value);
                          localStorage.setItem('diary_notif_time3', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Browser Permission:
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                  'Notification' in window
                    ? Notification.permission === 'granted'
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : Notification.permission === 'denied'
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {'Notification' in window ? Notification.permission.toUpperCase() : 'NOT SUPPORTED'}
                </span>
              </div>

              <div className="flex gap-2">
                {'Notification' in window && Notification.permission !== 'granted' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        alert("Permission granted successfully! Reminders will now be sent.");
                      } else {
                        alert("Permission denied. Please enable notifications in your browser settings to receive reminders.");
                      }
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    🔑 Allow Browser Notifications
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    triggerActualNotification();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  🔔 Send Test Reminder
                </button>
              </div>
            </div>
          </div>

          {/* Local Data Backup & Restore (JSON) Section */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm mt-6 animate-fade-in text-left" id="local-storage-backup-section">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                  <Database size={12} /> Local Backup & Restore
                </span>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">Export & Import Data File</h3>
                <p className="text-slate-600 text-xs font-semibold max-w-2xl">
                  Download a complete JSON backup of your workspace (all profiles, diaries, movements, service calls, and custom databases) or restore from a previously saved backup file.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {/* Option 0: 6-Digit PIN & QR Transfer (PC ⇄ Mobile) */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50 p-6 rounded-2xl border-2 border-emerald-300 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                    PIN & QR
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wide">
                    <KeyRound size={18} className="text-emerald-600" />
                    <span>6-Digit PIN Sync Hub</span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    Upload from mobile and download onto PC (or vice versa). Instant 6-digit PIN number, QR scanner, and cloud sync relay.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinSyncInitialMode('upload');
                      setShowPinSyncModal(true);
                    }}
                    className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5 border-0"
                  >
                    <Upload size={14} />
                    <span>Upload (Get PIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPinSyncInitialMode('download');
                      setShowPinSyncModal(true);
                    }}
                    className="py-3 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5 border-0"
                  >
                    <Download size={14} />
                    <span>Download (PIN)</span>
                  </button>
                </div>
              </div>

              {/* Option 1: Export Local JSON Backup */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 font-black text-sm uppercase tracking-wide">
                    <Download size={18} /> 1. Export Backup (JSON)
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Download all your saved work diary entries, transit records, and office configurations directly as a JSON file to your device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={exportAllDataAsJSON}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 border-0"
                >
                  <Download size={16} />
                  <span>Download Backup File</span>
                </button>
              </div>

              {/* Option 2: Restore from Local JSON File */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-black text-sm uppercase tracking-wide">
                    <Upload size={18} /> 2. Restore Backup (JSON)
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Select a previously downloaded SA Diary backup JSON file from your device to restore your data.
                  </p>
                </div>

                <label className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 text-center">
                  <Upload size={16} />
                  <span>Choose Backup File to Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUploadSync}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          </>
        )}

      {activeTab === 'scr' && (
        <ServiceCallReportGenerator
          metadata={metadata}
          setMetadata={setMetadata}
          attachedOffice={attachedOffice}
          activeProfile={activeProfile}
          uniqueOfficesList={uniqueOfficesList}
          serviceCalls={serviceCalls}
          setServiceCalls={setServiceCalls}
          setConfirmModal={setConfirmModal}
          officesDb={officesDb}
          transportMode={transportMode}
          activities={activities}
          showAllMonths={showAllMonths}
          setShowAllMonths={setShowAllMonths}
          selectedHistoricalMonth={selectedHistoricalMonth}
          setSelectedHistoricalMonth={setSelectedHistoricalMonth}
          historicalMonthsList={historicalMonthsList}
          formatMMYYYY={formatMMYYYY}
          scrDefaults={scrDefaults}
          currentVisits={visits}
          currentEntryDate={availableDays[selectedDateIdx] ? formatDate(availableDays[selectedDateIdx]) : ''}
          setConfirmedScrDays={setConfirmedScrDays}
        />
      )}

        {activeTab === 'entry' && (
          <section className="bg-white rounded-[2.5rem] border-2 border-blue-100 shadow-2xl overflow-hidden animate-fade-in" id="entry-tab-content">
            <div className="bg-blue-600 px-6 sm:px-10 py-5 sm:py-6 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PlusCircle size={24}/>
                <h2 className="text-lg font-black uppercase tracking-widest">New Work Entry</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      title: "Clear Entry Form Draft?",
                      message: "This will reset all visits, leave types, and inputs in the current day form.",
                      confirmText: "Clear Form Draft",
                      accentColor: "amber",
                      onConfirm: () => {
                        setTransportMode('Bus');
                        const defaultId = Math.random().toString(36).substr(2, 5);
                        setVisits([{ id: defaultId, officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
                        setLeaveType('');
                        setWorkedOnHoliday(false);
                        setConfirmModal(null);
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-white/20 active:scale-95"
                  title="Clear form draft for current day"
                >
                  <RotateCcw size={13} />
                  <span>Clear Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      title: `Clear Saved Diary Entries (${metadata.fortnight === 'first' ? '1st Fortnight' : '2nd Fortnight'})?`,
                      message: `This will clear all saved work diary entries and movements for the selected fortnight in profile "${activeProfile}".`,
                      confirmText: "Yes, Clear Saved Entries",
                      accentColor: "rose",
                      onConfirm: () => {
                        const clearDays = getFortnightDays(metadata.year ?? new Date().getFullYear(), metadata.month ?? new Date().getMonth(), metadata.fortnight || 'first');
                        const clearDates = new Set(clearDays.map(d => formatDate(d)));
                        
                        const keyActs = getProfileStorageKey(activeProfile, "activities");
                        const finalActs = activities.filter(act => !clearDates.has(act.date));
                        localStorage.setItem(keyActs, JSON.stringify(finalActs));
                        setActivities(finalActs);

                        const keyMoves = getProfileStorageKey(activeProfile, "movements");
                        const finalMoves = movements.filter(mov => !clearDates.has(mov.date));
                        localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                        setMovements(finalMoves);

                        setConfirmModal(null);
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-rose-400 active:scale-95"
                  title="Clear saved entries for current fortnight"
                >
                  <Trash2 size={13} />
                  <span>Clear Saved Entries</span>
                </button>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="space-y-6 lg:col-span-5">
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 block flex items-center gap-1.5">
                    <Calendar size={12} /> 1. Reporting Fortnight
                  </label>
                  <div className="flex bg-slate-200/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setMetadata({...metadata, fortnight: 'first'}); setSelectedDateIdx(0); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border-0 cursor-pointer ${
                        metadata.fortnight === 'first' 
                          ? 'bg-white shadow-sm text-blue-600 font-black' 
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      1 - 15
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMetadata({...metadata, fortnight: 'second'}); setSelectedDateIdx(0); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all border-0 cursor-pointer ${
                        metadata.fortnight === 'second' 
                          ? 'bg-white shadow-sm text-blue-600 font-black' 
                          : 'text-slate-500 hover:text-slate-700 bg-transparent'
                      }`}
                    >
                      16 - End
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={metadata.month ?? new Date().getMonth()}
                      onChange={e => { setMetadata({...metadata, month: parseInt(e.target.value)}); setSelectedDateIdx(0); }}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={metadata.year ?? new Date().getFullYear()}
                      onChange={e => { setMetadata({...metadata, year: parseInt(e.target.value)}); setSelectedDateIdx(0); }}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">2. Select Date</label>
                  <div className="relative mb-4">
                    <select 
                      value={selectedDateIdx}
                      onChange={e => setSelectedDateIdx(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 hover:bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:border-blue-300 focus:bg-white outline-none transition-all cursor-pointer shadow-sm appearance-none font-sans"
                    >
                      {availableDays.map((day, idx) => {
                        const formatted = formatDate(day);
                        const holidayName = HOLIDAYS[formatted];
                        const weekday = formatDay(day);
                        const saved = activities.find(a => a.date === formatted);
                        
                        let prefix = '🗒️ Fill: ';
                        if (saved) {
                          if (saved.workedOnHoliday) {
                            prefix = '💼 Worked: ';
                          } else {
                            prefix = '✅ Saved: ';
                          }
                        } else if (holidayName) {
                          prefix = '🏖️ Holiday: ';
                        } else if (weekday === 'Sunday') {
                          prefix = '☀️ Sunday: ';
                        }

                        const display = `${day.getDate()} - ${weekday} (${formatted})${holidayName ? ` [${holidayName}]` : ''}${saved ? ' [Saved]' : ''}`;
                        return (
                          <option key={idx} value={idx}>
                            {prefix}{display}
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>

                  {/* Leave options below Select Date */}
                  <div className="space-y-2 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Duty / Leave Status</label>
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                      {[
                        { value: '', label: 'On Duty' },
                        { value: 'CL', label: 'CL' },
                        { value: 'EL', label: 'EL' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setLeaveType(item.value as any);
                            if (item.value) {
                              setWorkedOnHoliday(false); // leaves cannot be worked days
                            }
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-0 ${
                            leaveType === item.value 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800 bg-transparent'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const activeDay = availableDays[selectedDateIdx];
                    if (!activeDay) return null;
                    const formatted = formatDate(activeDay);
                    const holidayName = HOLIDAYS[formatted];
                    const weekday = formatDay(activeDay);
                    const isSunOrHol = !!(holidayName || weekday === 'Sunday');
                    if (!isSunOrHol) return null;

                    return (
                      <div className="mt-4 p-4 bg-slate-100 rounded-2xl border border-slate-200/80 space-y-3 animate-fade-in text-[11px] font-sans">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider">
                            {holidayName ? '🏖️ Noted Holiday' : '☀️ Sunday Rest Day'}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-lg">
                            {holidayName ? 'Holiday' : 'Sunday'}
                          </span>
                        </div>
                        
                        {holidayName && (
                          <div className="font-semibold text-amber-700">
                            Holiday: <strong>{holidayName}</strong>
                          </div>
                        )}

                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200/50">
                          <span className="font-black text-slate-500">I worked on this day</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = !workedOnHoliday;
                              setWorkedOnHoliday(newValue);
                              if (newValue) {
                                setLeaveType(''); // worked days can't be leave
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                              workedOnHoliday 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {workedOnHoliday ? '✅ Yes' : '❌ No'}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                          {workedOnHoliday 
                            ? '💼 Marked as working day. Fill transport and visits below.'
                            : '🛌 Marked as rest day. Travel records are bypassed.'
                          }
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {leaveType ? (
                  <div className="p-6 bg-amber-50/50 border border-amber-200/60 rounded-3xl text-center space-y-2 flex flex-col items-center justify-center animate-fade-in">
                    <span className="text-2xl">🗓️</span>
                    <div>
                      <h4 className="font-extrabold text-[11px] text-amber-800 uppercase tracking-widest">Leave Mode Activated</h4>
                      <p className="text-[10px] text-amber-600 mt-1 font-semibold">
                        This day is marked as <strong>{leaveType === 'CL' ? 'Casual Leave (CL)' : 'Earned Leave (EL)'}</strong>. Custom travel and visit logs are bypassed.
                      </p>
                    </div>
                  </div>
                ) : entryShouldHideTravel ? (
                  <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-3xl text-center space-y-2 flex flex-col items-center justify-center animate-fade-in">
                    <span className="text-2xl">🛌</span>
                    <div>
                      <h4 className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest">Rest Day / Holiday</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        Primary transport is hidden for rest days. Mark "I worked on this day" above to enable.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">3. Primary Transport</label>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl">
                      {['Bus', 'Bike', 'Train', 'Auto'].map((m) => (
                        <button 
                          key={m} 
                          onClick={() => setTransportMode(m as any)}
                          className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border-0 cursor-pointer ${transportMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 bg-transparent'}`}
                        >
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500">
                          Bike Distance ({new Date(metadata.year, metadata.month).toLocaleString('default', { month: 'short' })}):
                        </span>
                        <span className={`font-black ${
                          currentMonthBikeKM > 200 
                            ? 'text-rose-600 animate-pulse' 
                            : 'text-blue-600'
                        }`}>
                          {currentMonthBikeKM.toFixed(1)} km
                        </span>
                      </div>
                      {currentMonthBikeKM > 200 && (
                        <div className="text-[9px] text-rose-600 font-extrabold text-right mt-1 animate-fade-in uppercase tracking-wider leading-none">
                          ⚠️ Exceeds 200 km limit
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={runBikeOptimizer}
                        className="mt-2 w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all hover:shadow-md flex items-center justify-center gap-1.5 border-0"
                      >
                        <Zap size={12} className="animate-pulse" />
                        <span>Optimize Bike KM (Target 200 km)</span>
                      </button>

                      {hasBikeOptBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              title: "Restore Pre-Optimization State?",
                              message: "This will revert all days in the current month back to their transport modes before bike optimization was applied.",
                              confirmText: "Yes, Restore Previous State",
                              accentColor: "amber",
                              onConfirm: () => restorePreOptimizationState()
                            });
                          }}
                          className="mt-1.5 w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                          title="Revert transport modes to state before optimization"
                        >
                          <RotateCcw size={12} />
                          <span>Reset / Restore Previous State</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 lg:col-span-7 flex flex-col justify-between text-left">
                 <div>
                   <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">4. Sequential Visits</label>
                   {!entryShouldHideTravel && (() => {
                     const activeDay = availableDays[selectedDateIdx];
                     if (!activeDay) return null;

                     const dStr = formatDate(activeDay);
                     const matchingList = serviceCalls.filter(sc => normalizeDateStr(sc.date) === dStr);
                     const officesSorted = [...matchingList].sort((a, b) => timeToMinutes(a.timeIn) - timeToMinutes(b.timeIn));
                     const officeNamesText = officesSorted.map(m => `${cleanOfficeSpelling(m.officeAttended)} (${cleanHrsToTime(m.timeIn, '10:00')} - ${cleanHrsToTime(m.timeOut, '17:00')})`).join(' & ');
                     if (matchingList.length === 0) return null;

                     return (
                       <div className="mb-4 p-4 bg-indigo-50 border border-indigo-150 rounded-2xl text-left flex items-start gap-2.5 animate-fade-in font-sans">
                         <span className="text-xs">📋</span>
                         <div className="flex-1">
                           <span className="font-extrabold text-[10px] text-indigo-800 uppercase tracking-wider block">{matchingList.length} SCR{matchingList.length > 1 ? 's' : ''} Found for {dStr}</span>
                           <p className="text-[10px] text-indigo-700 mt-0.5 leading-normal font-semibold">
                             Service Call Report{matchingList.length > 1 ? 's exist' : ' exists'} for <strong>{officeNamesText}</strong>. Would you like to fill details automatically from {matchingList.length > 1 ? 'them' : 'it'} in time sequence?
                           </p>
                           <button
                             type="button"
                             onClick={() => {
                               if (confirmedScrDays[dStr]) {
                                 handleImportSCRs(matchingList);
                               } else {
                                 setConfirmModal({
                                   title: `Import ${matchingList.length} SCR Details?`,
                                   message: `Are you sure you want to overwrite your visits for ${dStr} with the Service Call Report(s) for "${officeNamesText}" in time sequence?`,
                                   confirmText: "Yes, Overwrite & Fill All",
                                   cancelText: "No, Keep current",
                                   accentColor: "blue",
                                   onConfirm: () => {
                                     handleImportSCRs(matchingList);
                                     setConfirmedScrDays(prev => ({ ...prev, [dStr]: true }));
                                     setConfirmModal(null);
                                   },
                                   onCancel: () => setConfirmModal(null)
                                 });
                               }
                             }}
                             className={`mt-2 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer border-0 ${
                               confirmedScrDays[dStr] ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                             }`}
                           >
                             {confirmedScrDays[dStr] ? "✓ Already Confirmed (Click to Re-Fill)" : "⚡ Confirm & Auto-Fill All"}
                           </button>
                         </div>
                       </div>
                     );
                   })()}
                 </div>
                 {leaveType ? (
                    <div className="p-10 bg-slate-50 rounded-3xl border border-slate-100/80 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] animate-fade-in">
                      <span className="text-4xl">🏝️</span>
                      <div>
                        <p className="text-xs text-slate-500 font-extrabold uppercase tracking-widest">No Visits During Leave</p>
                        <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto mt-2 leading-relaxed">
                          Click <strong>Save & Next Date</strong> to register your leave state.
                        </p>
                      </div>
                    </div>
                 ) : entryShouldHideTravel ? (
                    <div className="p-10 bg-slate-50 rounded-3xl border border-slate-100/80 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] animate-fade-in">
                      <span className="text-4xl">🏖️</span>
                      <div>
                        <p className="text-xs text-slate-500 font-extrabold uppercase tracking-widest">No Office Visited Needed</p>
                        <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto mt-2 leading-relaxed">
                          This Sunday/Holiday is a rest day. Click <strong>Save & Next Date</strong> to continue.
                        </p>
                      </div>
                    </div>
                 ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                       {visits.map((v, i) => (
                      <div key={v.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                        <div className="absolute -left-2 top-4 w-6 h-6 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg">{i+1}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div className="relative space-y-1 text-left office-select-container">
                            <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mb-1.5">Office Visited</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                value={v.officeName} 
                                onFocus={() => setActiveDropdownId(v.id)}
                                onChange={e => {
                                  const updated = visits.map(vx => vx.id === v.id ? {...vx, officeName: e.target.value, isManualTime: false} : vx);
                                  setVisits(recalculateVisitsSequence(updated));
                                  setActiveDropdownId(v.id);
                                }} 
                                placeholder="Choose or type office..." 
                                className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm" 
                              />
                              <button
                                type="button"
                                onClick={() => setActiveDropdownId(activeDropdownId === v.id ? null : v.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1"
                              >
                                <ChevronDown size={14} className={`transform transition-transform ${activeDropdownId === v.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {activeDropdownId === v.id && (
                              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-50 py-1 font-bold text-xs">
                                {(() => {
                                  const search = v.officeName.toLowerCase().trim();
                                  const isFullOfficeName = uniqueOfficesList.some(name => name.toLowerCase() === search);
                                  const filtered = (search === "" || isFullOfficeName)
                                    ? uniqueOfficesList
                                    : uniqueOfficesList.filter(name => name.toLowerCase().includes(search));
                                  
                                  if (filtered.length === 0) {
                                    return (
                                      <div className="px-3 py-2 text-slate-400 italic text-left">
                                        No matching offices (press Enter or keep typing)
                                      </div>
                                    );
                                  }
                                  
                                  return filtered.map(name => (
                                    <button
                                      key={name}
                                      type="button"
                                      onClick={() => {
                                        const updated = visits.map(vx => vx.id === v.id ? {...vx, officeName: name, isManualTime: false} : vx);
                                        setVisits(recalculateVisitsSequence(updated));
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 transition-colors border-0 bg-transparent block"
                                    >
                                      {name}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1 text-left">
                              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mb-1.5">Time In</label>
                              <input 
                                type="time" 
                                value={v.startTime} 
                                onChange={e => {
                                  const newStart = e.target.value;
                                  const updated = visits.map(vx => {
                                    if (vx.id === v.id) {
                                      const prevDuration = Math.max(10, timeToMinutes(vx.endTime) - timeToMinutes(vx.startTime));
                                      const newEnd = addMinutesToTime(newStart, prevDuration);
                                      return { ...vx, startTime: newStart, endTime: newEnd, isManualTime: true };
                                    }
                                    return vx;
                                  });
                                  setVisits(recalculateVisitsSequence(updated));
                                }} 
                                className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold rounded-xl outline-none" 
                              />
                            </div>
                            <div className="space-y-1 text-left">
                              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mb-1.5">Time Out</label>
                              <input 
                                type="time" 
                                value={v.endTime} 
                                onChange={e => {
                                  const updated = visits.map(vx => vx.id === v.id ? {...vx, endTime: e.target.value, isManualTime: true} : vx);
                                  setVisits(recalculateVisitsSequence(updated));
                                }} 
                                className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold rounded-xl outline-none" 
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <textarea 
                            rows={2}
                            placeholder="Issues encountered (optional)..." 
                            value={v.issues} 
                            onChange={e => setVisits(prev => prev.map(vx => vx.id === v.id ? {...vx, issues: e.target.value} : vx))} 
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none placeholder-slate-300 resize-none min-h-[48px] overflow-y-auto" 
                          />
                          {visits.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => setVisits(prev => prev.filter(vx => vx.id !== v.id))} 
                              className="px-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer border-0 flex items-center justify-center shrink-0"
                              title="Delete visit"
                            >
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const last = visits[visits.length - 1];
                        setVisits([...visits, { id: Math.random().toString(36).substr(2, 5), officeName: '', startTime: last?.endTime || '09:00', endTime: '17:00', issues: '', resolution: '' }]);
                      }} 
                      className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl border-2 border-dashed border-slate-200 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                    >
                      <Plus size={16}/> Append to visit chain
                    </button>
                 </div>
                 )}

                 <div className="pt-4 border-t border-slate-150 mt-6 shrink-0 flex gap-3">
                    <button 
                       type="button"
                       onClick={() => {
                         const day = availableDays[selectedDateIdx];
                         const dateStr = formatDate(day);
                         
                         const saved = activities.find(a => a.date === dateStr);
                          if (saved) {
                            setTransportMode(saved.transportMode || "Bus");
                            setVisits(saved.visits || []);
                            setLeaveType(saved.leaveType || "");
                            setWorkedOnHoliday(!!saved.workedOnHoliday);
                          } else {
                            setVisits([{ id: Math.random().toString(36).substr(2, 5), officeName: attachedOffice, startTime: "09:00", endTime: "17:00", issues: "", resolution: "" }]);
                            setTransportMode("Bus");
                            setLeaveType("");
                            setWorkedOnHoliday(false);
                          }
                       }}
                       className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer border-0 flex items-center justify-center gap-2 active:scale-95"
                       title="Discard changes and revert to last saved state"
                    >
                       <X size={16}/> Cancel
                    </button>
                    <button 
                       type="button"
                       id="save-stay-btn"
                       onClick={() => handleSaveDay(false)}
                       className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-0 ${
                         saveSuccessFeedback 
                           ? 'bg-emerald-600 text-white shadow-emerald-200' 
                           : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50'
                       }`}
                       title="Save changes and stay on this date"
                    >
                      {saveSuccessFeedback ? (
                        <>
                          <CheckCircle2 size={16} /> Saved!
                        </>
                      ) : (
                        <>
                          <Save size={16}/> Save Day
                        </>
                      )}
                    </button>
                    <button 
                       id="save-entry-btn"
                       onClick={() => handleSaveDay(true)}
                       className="flex-[1.5] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-0"
                       title="Save changes and advance to next date"
                    >
                      <Save size={16}/> Save & Next Date ➔
                    </button>
                 </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'summary' && (
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-fade-in" id="summary-tab-content">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <h2 className="text-xl font-black text-slate-800">Saved Entries Summary</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Reporting Fortnight: {new Date(metadata.year, metadata.month).toLocaleString('default', { month: 'long', year: 'numeric' })} — {metadata.fortnight === 'first' ? '1st Fortnight (1st - 15th)' : '2nd Fortnight (16th - End)'}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      title: `Clear Fortnightly Summary Data (${metadata.fortnight === 'first' ? '1st Fortnight' : '2nd Fortnight'})?`,
                      message: `This will clear all saved activities and movements for the selected fortnight in profile "${activeProfile}".`,
                      confirmText: "Yes, Clear Summary Data",
                      accentColor: "rose",
                      onConfirm: () => {
                        const clearDays = getFortnightDays(metadata.year ?? new Date().getFullYear(), metadata.month ?? new Date().getMonth(), metadata.fortnight || 'first');
                        const clearDates = new Set(clearDays.map(d => formatDate(d)));
                        
                        const keyActs = getProfileStorageKey(activeProfile, "activities");
                        const finalActs = activities.filter(act => !clearDates.has(act.date));
                        localStorage.setItem(keyActs, JSON.stringify(finalActs));
                        setActivities(finalActs);

                        const keyMoves = getProfileStorageKey(activeProfile, "movements");
                        const finalMoves = movements.filter(mov => !clearDates.has(mov.date));
                        localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                        setMovements(finalMoves);

                        setConfirmModal(null);
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Clear summary data for selected fortnight"
                >
                  <Trash2 size={12} />
                  <span>Clear Summary Data</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAllMonths(!showAllMonths)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border ${
                      showAllMonths 
                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
                    }`}
                  >
                    <CalendarRange size={12} />
                    <span>{showAllMonths ? 'Show Current Month Only' : 'Get Previous Month Details'}</span>
                  </button>
                  {showAllMonths && (
                    <select
                      value={selectedHistoricalMonth}
                      onChange={(e) => setSelectedHistoricalMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {historicalMonthsList.map(mY => (
                        <option key={mY} value={mY}>
                          {formatMMYYYY(mY)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  <button 
                    onClick={() => { setMetadata({...metadata, fortnight: 'first'}); setSelectedDateIdx(0); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${metadata.fortnight === 'first' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    1 - 15
                  </button>
                  <button 
                    onClick={() => { setMetadata({...metadata, fortnight: 'second'}); setSelectedDateIdx(0); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${metadata.fortnight === 'second' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    16 - End
                  </button>
                </div>
                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-2 rounded-xl uppercase tracking-widest shrink-0">
                  {(() => {
                    const keys = new Set(availableDays.map(day => formatDate(day)));
                    const matched = activities.filter(act => keys.has(act.date));
                    return showAllMonths 
                      ? `${historicalMonthActivitiesCount} Days Saved (${formatMMYYYY(selectedHistoricalMonth)})` 
                      : `${matched.length} / ${availableDays.length} Days Completed`;
                  })()}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-[10px] text-slate-400 font-black uppercase tracking-widest sticky top-0 z-10">
                    <th className="px-10 py-5 text-left w-48">Date</th>
                    <th className="px-10 py-5 text-left">Visits Summary</th>
                    <th className="px-10 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const keys = new Set(availableDays.map(day => formatDate(day)));
                    const matched = showAllMonths 
                      ? activities.filter(act => {
                          if (!act || !act.date) return false;
                          const parts = act.date.split('.');
                          return parts.length === 3 && `${parts[1]}.${parts[2]}` === selectedHistoricalMonth;
                        }).sort((a,b) => {
                          const partsA = a.date.split('.');
                          const partsB = b.date.split('.');
                          if (partsA.length !== 3 || partsB.length !== 3) return 0;
                          const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
                          const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
                          return dateB.getTime() - dateA.getTime();
                        })
                      : activities.filter(act => keys.has(act.date));
                    if (matched.length === 0) {
                      return <tr><td colSpan={3} className="px-10 py-20 text-center text-slate-300 italic font-medium">No recorded days found.</td></tr>;
                    }
                    return matched.map(act => (
                      <tr key={act.id} className="hover:bg-slate-50/20 transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center">
                              <span className="text-sm font-black">{act.date.split('.')[0]}</span>
                              <span className="text-[8px] font-bold uppercase">{act.dayName.substr(0, 3)}</span>
                            </div>
                            {act.leaveType ? (
                              <div className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-lg tracking-widest leading-none">{act.leaveType}</div>
                            ) : act.workedOnHoliday ? (
                              <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase rounded-lg tracking-widest leading-none">WORKED</div>
                            ) : HOLIDAYS[act.date] ? (
                              <div className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-lg tracking-widest leading-none">HOL</div>
                            ) : act.dayName === 'Sunday' ? (
                              <div className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-lg tracking-widest leading-none">SUN</div>
                            ) : (
                              <div className="text-[10px] font-black text-slate-400 uppercase">{act.transportMode}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="text-xs text-slate-500 whitespace-pre-line leading-relaxed italic">{act.details}</div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button onClick={() => deleteSavedDay(act.date)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'movements' && (
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-fade-in" id="movements-tab-content">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <h2 className="text-xl font-black text-slate-800">Movement Intelligence Log</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Reporting Fortnight: {new Date(metadata.year, metadata.month).toLocaleString('default', { month: 'long', year: 'numeric' })} — {metadata.fortnight === 'first' ? '1st Fortnight (1st - 15th)' : '2nd Fortnight (16th - End)'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      title: `Clear Movement Log Data (${metadata.fortnight === 'first' ? '1st Fortnight' : '2nd Fortnight'})?`,
                      message: `This will clear saved movement transit records for the selected fortnight in profile "${activeProfile}".`,
                      confirmText: "Yes, Clear Movements Data",
                      accentColor: "rose",
                      onConfirm: () => {
                        const clearDays = getFortnightDays(metadata.year ?? new Date().getFullYear(), metadata.month ?? new Date().getMonth(), metadata.fortnight || 'first');
                        const clearDates = new Set(clearDays.map(d => formatDate(d)));
                        
                        const keyMoves = activeProfile === "Karikalvalavan R" ? "diary_movements" : `diary_profile_${activeProfile}_movements`;
                        const finalMoves = movements.filter(mov => !clearDates.has(mov.date));
                        localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                        setMovements(finalMoves);

                        setConfirmModal(null);
                      }
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Clear movement logs for selected fortnight"
                >
                  <Trash2 size={12} />
                  <span>Clear Movement Data</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAllMonths(!showAllMonths)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border ${
                      showAllMonths 
                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-sm'
                    }`}
                  >
                    <CalendarRange size={12} />
                    <span>{showAllMonths ? 'Show Current Month Only' : 'Get Previous Month Details'}</span>
                  </button>
                  {showAllMonths && (
                    <select
                      value={selectedHistoricalMonth}
                      onChange={(e) => setSelectedHistoricalMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {historicalMonthsList.map(mY => (
                        <option key={mY} value={mY}>
                          {formatMMYYYY(mY)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  <button 
                    onClick={() => { setMetadata({...metadata, fortnight: 'first'}); setSelectedDateIdx(0); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${metadata.fortnight === 'first' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    1 - 15
                  </button>
                  <button 
                    onClick={() => { setMetadata({...metadata, fortnight: 'second'}); setSelectedDateIdx(0); }} 
                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${metadata.fortnight === 'second' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    16 - End
                  </button>
                </div>
                <button 
                  onClick={() => {
                    const defaultDate = availableDays[0] ? formatDate(availableDays[0]) : formatDate(new Date());
                    setMovements([...movements, { id: Math.random().toString(36).substr(2, 5), date: defaultDate, fromTime: '09:00', fromLocation: attachedOffice.toUpperCase(), toDate: defaultDate, toTime: '18:00', toLocation: attachedOffice.toUpperCase(), mode: 'BUS', km: '0', isManual: true }]);
                  }}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                  <PlusCircle size={16} /> Add Manual Log
                </button>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full border-collapse min-w-[1200px]">
                <thead>
                  <tr className="text-[10px] bg-slate-50 border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                    <th className="px-4 py-5">Date</th>
                    <th className="px-4 py-5">Out</th>
                    <th className="px-4 py-5 text-left">From Location</th>
                    <th className="px-4 py-5">Date</th>
                    <th className="px-4 py-5">In</th>
                    <th className="px-4 py-5 text-left">To Location</th>
                    <th className="px-4 py-5">Mode</th>
                    <th className="px-4 py-5">KM</th>
                    <th className="px-4 py-5">X</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const keys = new Set(availableDays.map(day => formatDate(day)));
                    const matched = showAllMonths 
                      ? movements.filter(m => {
                          if (!m || !m.date) return false;
                          const parts = m.date.split('.');
                          return parts.length === 3 && `${parts[1]}.${parts[2]}` === selectedHistoricalMonth;
                        }).sort((a,b) => {
                          const partsA = a.date.split('.');
                          const partsB = b.date.split('.');
                          if (partsA.length !== 3 || partsB.length !== 3) return 0;
                          const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
                          const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
                          return dateB.getTime() - dateA.getTime();
                        })
                      : movements.filter(m => keys.has(m.date));
                    if (matched.length === 0) {
                      return <tr><td colSpan={9} className="px-10 py-20 text-center text-slate-300 italic font-medium">No movement logs found.</td></tr>;
                    }
                    return matched.map((m) => (
                      <tr key={m.id} className={`hover:bg-slate-50/50 transition-all ${m.isManual ? 'bg-amber-50/20' : ''}`}>
                        <td className="p-2 border-r"><input type="text" value={m.date} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, date: e.target.value} : mm))} className="w-full bg-transparent text-center text-xs font-bold outline-none" /></td>
                        <td className="p-2 border-r"><input type="time" value={m.fromTime} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, fromTime: e.target.value} : mm))} className="w-full bg-transparent text-center text-sm font-black outline-none" /></td>
                        <td className="p-2 border-r"><input type="text" value={m.fromLocation} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, fromLocation: e.target.value.toUpperCase()} : mm))} className="w-full bg-transparent px-3 text-sm font-black text-blue-700 uppercase outline-none" /></td>
                        <td className="p-2 border-r"><input type="text" value={m.toDate} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, toDate: e.target.value} : mm))} className="w-full bg-transparent text-center text-xs font-bold outline-none" /></td>
                        <td className="p-2 border-r"><input type="time" value={m.toTime} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, toTime: e.target.value} : mm))} className="w-full bg-transparent text-center text-sm font-black outline-none" /></td>
                        <td className="p-2 border-r"><input type="text" value={m.toLocation} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, toLocation: e.target.value.toUpperCase()} : mm))} className="w-full bg-transparent px-3 text-sm font-black text-emerald-700 uppercase outline-none" /></td>
                        <td className="p-2 border-r"><select value={m.mode} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, mode: e.target.value.toUpperCase()} : mm))} className="w-full bg-transparent text-[10px] font-black outline-none text-center"><option value="BUS">BUS</option><option value="BIKE">BIKE</option><option value="TRAIN">TRAIN</option><option value="WALK">WALK</option></select></td>
                        <td className="p-2 border-r"><input type="text" value={m.km} onChange={e => setMovements(prev => prev.map(mm => mm.id === m.id ? {...mm, km: e.target.value} : mm))} className="w-full bg-transparent text-center text-sm font-black outline-none" /></td>
                        <td className="p-2 text-center"><button onClick={() => setMovements(prev => prev.filter(mm => mm.id !== m.id))} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'database' && (
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-fade-in" id="database-tab-content">
            <div className="p-8 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-800">Application Configuration & Database Settings</h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  Manage defaults, attached (home) office, month-wise entered data cleanup, and office matrix database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    title: "Reset Office Database to Default?",
                    message: `This will clear custom office additions and restore the original post office database for profile "${activeProfile}".`,
                    confirmText: "Yes, Reset Office Database",
                    accentColor: "rose",
                    onConfirm: () => {
                      const keyOffices = getProfileStorageKey(activeProfile, "offices_db");
                      localStorage.removeItem(keyOffices);
                      window.location.reload();
                    }
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-sm active:scale-95"
                title="Reset custom offices and restore default route matrix"
              >
                <Trash2 size={13} />
                <span>Reset Office Database</span>
              </button>
            </div>

            {/* Attached Office (Default starting point) Configuration settings */}
            <div className="p-8 border-b border-blue-100/70 bg-blue-50/25">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-md shadow-blue-200 shrink-0">
                    <MapPin size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Default Attached (Home) Office</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Set the office where you start and end your travel diary every day. Changing this will update calculations & defaults.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Attached Office:</span>
                  <select
                    value={attachedOffice}
                    onChange={(e) => {
                      const newAttached = e.target.value;
                      setAttachedOffice(newAttached);
                      // Sync entry form Visits state default
                      setVisits(prev => prev.map(v => v.officeName === attachedOffice ? { ...v, officeName: newAttached } : v));
                    }}
                    className="bg-slate-50 hover:bg-white border-2 border-blue-100 rounded-xl px-5 py-3 text-xs font-black text-blue-700 focus:border-blue-400 outline-none transition-all cursor-pointer shadow-sm min-w-[240px]"
                    id="attached-office-selector"
                  >
                    {uniqueOfficesList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SCR Creator Default Settings */}
            <div className="p-8 border-b border-indigo-100/70 bg-indigo-50/15">
              <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-6">
                <div className="flex items-start gap-4 text-left border-b border-indigo-55 pb-4">
                  <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-md shadow-indigo-200 shrink-0">
                    <Sliders size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">SCR Creator Default Settings</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Set default values for the Service Call Report (SCR) Creator. These values are automatically pre-filled when creating new reports.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Division Name</label>
                    <input
                      type="text"
                      value={scrDefaults.divisionName}
                      onChange={(e) => setScrDefaults(prev => ({ ...prev, divisionName: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Call Given By</label>
                    <input
                      type="text"
                      value={scrDefaults.callGivenBy}
                      onChange={(e) => setScrDefaults(prev => ({ ...prev, callGivenBy: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Time In</label>
                      <input
                        type="text"
                        placeholder="09:00 hrs"
                        value={scrDefaults.timeIn}
                        onChange={(e) => setScrDefaults(prev => ({ ...prev, timeIn: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Time Out</label>
                      <input
                        type="text"
                        placeholder="17:00 hrs"
                        value={scrDefaults.timeOut}
                        onChange={(e) => setScrDefaults(prev => ({ ...prev, timeOut: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Replacement of Spares</label>
                    <input
                      type="text"
                      value={scrDefaults.replacementOfSpares}
                      onChange={(e) => setScrDefaults(prev => ({ ...prev, replacementOfSpares: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Amount of Spares</label>
                    <input
                      type="text"
                      value={scrDefaults.amountOfSpares}
                      onChange={(e) => setScrDefaults(prev => ({ ...prev, amountOfSpares: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Default Other Issues</label>
                    <input
                      type="text"
                      value={scrDefaults.otherIssues}
                      onChange={(e) => setScrDefaults(prev => ({ ...prev, otherIssues: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Month-wise Entered Data Management & Deletion */}
            <MonthWiseDataManagement
              activities={activities}
              setActivities={setActivities}
              movements={movements}
              setMovements={setMovements}
              serviceCalls={serviceCalls}
              setServiceCalls={setServiceCalls}
              confirmedScrDays={confirmedScrDays}
              setConfirmedScrDays={setConfirmedScrDays}
              activeProfile={activeProfile}
              currentMonth={metadata.month}
              currentYear={metadata.year}
              getProfileStorageKey={getProfileStorageKey}
              setConfirmModal={setConfirmModal}
              onMonthDeleted={(deletedMY) => {
                if (selectedHistoricalMonth === deletedMY) {
                  setSelectedHistoricalMonth('');
                }
              }}
            />

            {/* Modular Office Matrix & Database Manager */}
            <div className="p-8">
              <DatabaseSettingsTab
                officesDb={officesDb}
                setOfficesDb={setOfficesDb}
                activeProfile={activeProfile}
                onSaveToLocalStorage={(updated) => {
                  const keyOfficesDb = getProfileStorageKey(activeProfile, "offices_db");
                  localStorage.setItem(keyOfficesDb, JSON.stringify(updated));
                }}
              />
            </div>
          </section>
        )}
      </main>
      <footer className="text-center py-20 opacity-30"><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">SA Dairy • Intelligent Reporting</p></footer>

      {showClearConfirm && (
        <div id="clear-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="bg-rose-50 p-3 rounded-2xl">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Clear Profile Data</h3>
                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-0.5">
                  {clearStep === 'options' ? 'Select what to clear' : 'Select Target Fortnightly'} for {activeProfile === "Karikalvalavan R" ? "R. Karikalvalavan" : activeProfile === "Default Profile" ? "System Default" : activeProfile}
                </p>
              </div>
            </div>

            {clearStep === 'options' ? (
              <>
                <div className="flex flex-col gap-3 my-1">
                  {/* Option 1: Work entry inputs (current day draft) */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    clearSelection.allProfileData
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : clearSelection.workFormDraft
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={clearSelection.allProfileData}
                      checked={clearSelection.allProfileData || clearSelection.workFormDraft}
                      onChange={(e) => setClearSelection(prev => ({ ...prev, workFormDraft: e.target.checked }))}
                      className="mt-1 accent-rose-600 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">Work entry (Form Draft)</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">Resets the active entry form fields to defaults for selected fortnight</span>
                    </div>
                  </label>

                  {/* Option 2: Saved summary for fortnightly */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    clearSelection.allProfileData
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : clearSelection.savedFortnightlySummary
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={clearSelection.allProfileData}
                      checked={clearSelection.allProfileData || clearSelection.savedFortnightlySummary}
                      onChange={(e) => setClearSelection(prev => ({ ...prev, savedFortnightlySummary: e.target.checked }))}
                      className="mt-1 accent-rose-600 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">Saved summary for fortnightly</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">Deletes all saved daily entries and movements for selected fortnight</span>
                    </div>
                  </label>

                  {/* Option 3: Service Call Report (SCR) data */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    clearSelection.allProfileData
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : clearSelection.scrData
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={clearSelection.allProfileData}
                      checked={clearSelection.allProfileData || clearSelection.scrData}
                      onChange={(e) => setClearSelection(prev => ({ ...prev, scrData: e.target.checked }))}
                      className="mt-1 accent-rose-600 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">SCR Data</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">Deletes saved service call reports for selected fortnight</span>
                    </div>
                  </label>

                  {/* Option 4: All data related to profile */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    clearSelection.allProfileData
                      ? 'bg-rose-50/80 border-rose-300'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={clearSelection.allProfileData}
                      onChange={(e) => setClearSelection(prev => ({ ...prev, allProfileData: e.target.checked }))}
                      className="mt-1 accent-rose-600 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-black text-rose-700 uppercase tracking-wide">All data related to profile</span>
                      <span className="block text-[11px] text-rose-500/80 mt-0.5 font-bold">Complete reset: deletes all metadata, entries, movements, and SCR data</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <button
                    id="cancel-clear-btn"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    id="next-clear-btn"
                    disabled={!clearSelection.workFormDraft && !clearSelection.savedFortnightlySummary && !clearSelection.scrData && !clearSelection.allProfileData}
                    onClick={() => {
                      const handlePerformClear = () => {
                        let needsReload = false;
                        
                        // Compute clear target dates
                        const clearDays = getFortnightDays(clearYear, clearMonth, clearFortnight);
                        const clearDates = new Set(clearDays.map(d => formatDate(d)));

                        // 1. Clear Work Form Draft for selected day/fortnight
                        if (clearSelection.workFormDraft && !clearSelection.allProfileData) {
                          const activeDay = availableDays[selectedDateIdx];
                          if (activeDay && clearDates.has(formatDate(activeDay))) {
                            setTransportMode('Bus');
                            const defaultId = Math.random().toString(36).substr(2, 5);
                            setVisits([{ id: defaultId, officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
                            setLeaveType('');
                            setWorkedOnHoliday(false);
                          }
                          needsReload = true;
                        }

                        // 2. Clear Saved summary for fortnightly
                        if (clearSelection.savedFortnightlySummary && !clearSelection.allProfileData) {
                          const keyActs = getProfileStorageKey(activeProfile, "activities");
                          const savedActsRaw = localStorage.getItem(keyActs);
                          let finalActs = activities;
                          if (savedActsRaw) {
                            try {
                              const savedActs = JSON.parse(savedActsRaw) as ActivityEntry[];
                              finalActs = savedActs.filter(act => !clearDates.has(act.date));
                              localStorage.setItem(keyActs, JSON.stringify(finalActs));
                            } catch (e) {}
                          } else {
                            finalActs = activities.filter(act => !clearDates.has(act.date));
                            localStorage.setItem(keyActs, JSON.stringify(finalActs));
                          }
                          setActivities(finalActs);

                          const keyMoves = getProfileStorageKey(activeProfile, "movements");
                          const savedMovesRaw = localStorage.getItem(keyMoves);
                          let finalMoves = movements;
                          if (savedMovesRaw) {
                            try {
                              const savedMoves = JSON.parse(savedMovesRaw) as MovementEntry[];
                              finalMoves = savedMoves.filter(mov => !clearDates.has(mov.date));
                              localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                            } catch (e) {}
                          } else {
                            finalMoves = movements.filter(mov => !clearDates.has(mov.date));
                            localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                          }
                          setMovements(finalMoves);

                          needsReload = true;
                        }

                        // 3. Clear Service Call Report (SCR) data
                        if (clearSelection.scrData && !clearSelection.allProfileData) {
                          const keySCalls = getProfileStorageKey(activeProfile, "service_calls");
                          const savedSCallsRaw = localStorage.getItem(keySCalls);
                          let finalSCalls = serviceCalls;
                          if (savedSCallsRaw) {
                            try {
                              const savedSCalls = JSON.parse(savedSCallsRaw) as ServiceCallReport[];
                              finalSCalls = savedSCalls.filter(sc => !clearDates.has(sc.date));
                              localStorage.setItem(keySCalls, JSON.stringify(finalSCalls));
                            } catch (e) {}
                          } else {
                            finalSCalls = serviceCalls.filter(sc => !clearDates.has(sc.date));
                            localStorage.setItem(keySCalls, JSON.stringify(finalSCalls));
                          }
                          setServiceCalls(finalSCalls);

                          const keyConfScr = getProfileStorageKey(activeProfile, "confirmed_scr_days");
                          const savedConfScrRaw = localStorage.getItem(keyConfScr);
                          let finalConfScr = confirmedScrDays;
                          if (savedConfScrRaw) {
                            try {
                              const savedConfScr = JSON.parse(savedConfScrRaw) as Record<string, boolean>;
                              finalConfScr = { ...savedConfScr };
                              clearDates.forEach(dateStr => {
                                delete finalConfScr[dateStr];
                              });
                              localStorage.setItem(keyConfScr, JSON.stringify(finalConfScr));
                            } catch (e) {}
                          } else {
                            finalConfScr = { ...confirmedScrDays };
                            clearDates.forEach(dateStr => {
                              delete finalConfScr[dateStr];
                            });
                            localStorage.setItem(keyConfScr, JSON.stringify(finalConfScr));
                          }
                          setConfirmedScrDays(finalConfScr);

                          needsReload = true;
                        }

                        // 4. All profile data (Full Reset)
                        if (clearSelection.allProfileData) {
                          const today = new Date();
                          const currentDay = today.getDate();
                          const currentMonth = today.getMonth();
                          const currentYear = today.getFullYear();
                          const currentFortnight = currentDay <= 15 ? 'first' : 'second';
                          const pad = (num: number) => String(num).padStart(2, '0');
                          const todayStr = `${pad(currentDay)}.${pad(currentMonth + 1)}.${currentYear}`;

                          let dName = '';
                          let dDesig = 'System Administrator';
                          let dOffice = getProfileAttachedOffice(activeProfile);
                          if (activeProfile === "Karikalvalavan R") {
                            dName = "R. Karikalvalavan";
                            dOffice = "Cuddalore HO";
                          } else if (activeProfile === "Muthvel R") {
                            dName = "R. Muthuvel";
                          } else if (activeProfile === "Sivaraj S") {
                            dName = "S. Sivaraj";
                          } else {
                            dName = activeProfile;
                          }

                          // Purge keys using helper (keeps the profile name in list)
                          purgeKeysForProfile(activeProfile, true);

                          // Reset states
                          setMetadata({
                            name: dName,
                            designation: dDesig,
                            office: dOffice,
                            submissionDate: todayStr,
                            submissionPlace: dOffice,
                            month: currentMonth,
                            year: currentYear,
                            fortnight: currentFortnight
                          });
                          setActivities([]);
                          setMovements([]);
                          setSelectedDateIdx(0);
                          setServiceCalls([]);
                          setConfirmedScrDays([]);
                          setScrDefaults({
                            divisionName: 'Cuddalore Division',
                            callGivenBy: 'SPM',
                            timeIn: '09:00 hrs.',
                            timeOut: '17:00 hrs.',
                            replacementOfSpares: 'None',
                            amountOfSpares: 'None',
                            otherIssues: 'NSP 2'
                          });
                          needsReload = true;
                        }

                        setShowClearConfirm(false);

                        // Trigger reload if needed
                        if (needsReload) {
                          window.location.reload();
                        }
                      };

                      if (clearSelection.allProfileData) {
                        handlePerformClear();
                      } else {
                        setClearStep('fortnight');
                      }
                    }}
                    className={`flex-1 py-3 px-4 font-black text-sm rounded-xl transition-all shadow-lg text-center cursor-pointer ${
                      (!clearSelection.workFormDraft && !clearSelection.savedFortnightlySummary && !clearSelection.scrData && !clearSelection.allProfileData)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-rose-100'
                    }`}
                  >
                    {clearSelection.allProfileData ? 'Yes, Clear All' : 'Next: Choose Fortnightly'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Target Fortnightly Selector */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left flex flex-col gap-4 animate-fade-in">
                  <div>
                    <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">Select Target Fortnightly</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">Choose which period to clear for the checked options below:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">Fortnight</label>
                      <select
                        value={clearFortnight}
                        onChange={(e) => setClearFortnight(e.target.value as 'first' | 'second')}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        <option value="first">1st (1 - 15)</option>
                        <option value="second">2nd (16 - End)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">Month</label>
                      <select
                        value={clearMonth}
                        onChange={(e) => setClearMonth(parseInt(e.target.value, 10))}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                          <option key={idx} value={idx}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">Year</label>
                      <select
                        value={clearYear}
                        onChange={(e) => setClearYear(parseInt(e.target.value, 10))}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary of what is being cleared */}
                  <div className="border-t border-slate-200/60 pt-3 mt-1">
                    <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Items to be cleared:</span>
                    <ul className="list-disc list-inside mt-1.5 text-xs text-rose-600 font-bold space-y-1">
                      {clearSelection.workFormDraft && <li>Work entry form draft</li>}
                      {clearSelection.savedFortnightlySummary && <li>Saved fortnightly activities & movements</li>}
                      {clearSelection.scrData && <li>Service call report (SCR) data</li>}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => setClearStep('options')}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm rounded-xl transition-all cursor-pointer text-center"
                  >
                    Back to Options
                  </button>
                  <button
                    id="confirm-clear-btn"
                    onClick={() => {
                      let needsReload = false;
                      
                      // Compute clear target dates
                      const clearDays = getFortnightDays(clearYear, clearMonth, clearFortnight);
                      const clearDates = new Set(clearDays.map(d => formatDate(d)));

                      // 1. Clear Work Form Draft for selected day/fortnight
                      if (clearSelection.workFormDraft && !clearSelection.allProfileData) {
                        const activeDay = availableDays[selectedDateIdx];
                        if (activeDay && clearDates.has(formatDate(activeDay))) {
                          setTransportMode('Bus');
                          const defaultId = Math.random().toString(36).substr(2, 5);
                          setVisits([{ id: defaultId, officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
                          setLeaveType('');
                          setWorkedOnHoliday(false);
                        }
                        needsReload = true;
                      }

                      // 2. Clear Saved summary for fortnightly
                      if (clearSelection.savedFortnightlySummary && !clearSelection.allProfileData) {
                        const keyActs = getProfileStorageKey(activeProfile, "activities");
                        const savedActsRaw = localStorage.getItem(keyActs);
                        let finalActs = activities;
                        if (savedActsRaw) {
                          try {
                            const savedActs = JSON.parse(savedActsRaw) as ActivityEntry[];
                            finalActs = savedActs.filter(act => !clearDates.has(act.date));
                            localStorage.setItem(keyActs, JSON.stringify(finalActs));
                          } catch (e) {}
                        } else {
                          finalActs = activities.filter(act => !clearDates.has(act.date));
                          localStorage.setItem(keyActs, JSON.stringify(finalActs));
                        }
                        setActivities(finalActs);

                        const keyMoves = getProfileStorageKey(activeProfile, "movements");
                        const savedMovesRaw = localStorage.getItem(keyMoves);
                        let finalMoves = movements;
                        if (savedMovesRaw) {
                          try {
                            const savedMoves = JSON.parse(savedMovesRaw) as MovementEntry[];
                            finalMoves = savedMoves.filter(mov => !clearDates.has(mov.date));
                            localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                          } catch (e) {}
                        } else {
                          finalMoves = movements.filter(mov => !clearDates.has(mov.date));
                          localStorage.setItem(keyMoves, JSON.stringify(finalMoves));
                        }
                        setMovements(finalMoves);

                        needsReload = true;
                      }

                      // 3. Clear Service Call Report (SCR) data
                      if (clearSelection.scrData && !clearSelection.allProfileData) {
                        const keySCalls = getProfileStorageKey(activeProfile, "service_calls");
                        const savedSCallsRaw = localStorage.getItem(keySCalls);
                        let finalSCalls = serviceCalls;
                        if (savedSCallsRaw) {
                          try {
                            const savedSCalls = JSON.parse(savedSCallsRaw) as ServiceCallReport[];
                            finalSCalls = savedSCalls.filter(sc => !clearDates.has(sc.date));
                            localStorage.setItem(keySCalls, JSON.stringify(finalSCalls));
                          } catch (e) {}
                        } else {
                          finalSCalls = serviceCalls.filter(sc => !clearDates.has(sc.date));
                          localStorage.setItem(keySCalls, JSON.stringify(finalSCalls));
                        }
                        setServiceCalls(finalSCalls);

                        const keyConfScr = getProfileStorageKey(activeProfile, "confirmed_scr_days");
                        const savedConfScrRaw = localStorage.getItem(keyConfScr);
                        let finalConfScr = confirmedScrDays;
                        if (savedConfScrRaw) {
                          try {
                            const savedConfScr = JSON.parse(savedConfScrRaw) as Record<string, boolean>;
                            finalConfScr = { ...savedConfScr };
                            clearDates.forEach(dateStr => {
                              delete finalConfScr[dateStr];
                            });
                            localStorage.setItem(keyConfScr, JSON.stringify(finalConfScr));
                          } catch (e) {}
                        } else {
                          finalConfScr = { ...confirmedScrDays };
                          clearDates.forEach(dateStr => {
                            delete finalConfScr[dateStr];
                          });
                          localStorage.setItem(keyConfScr, JSON.stringify(finalConfScr));
                        }
                        setConfirmedScrDays(finalConfScr);

                        needsReload = true;
                      }

                      setShowClearConfirm(false);

                      // Trigger reload if needed
                      if (needsReload) {
                        window.location.reload();
                      }
                    }}
                    className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-rose-100 text-center cursor-pointer"
                  >
                    Yes, Clear Selected
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmModal && (
        <div id="general-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setConfirmModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-4 pr-6">
              <div className={`p-3 rounded-2xl ${
                confirmModal.accentColor === 'rose' ? 'bg-rose-50 text-rose-600' :
                confirmModal.accentColor === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{confirmModal.title}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                  confirmModal.accentColor === 'rose' ? 'text-rose-500' :
                  confirmModal.accentColor === 'emerald' ? 'text-emerald-500' :
                  'text-blue-500'
                }`}>Confirmation Required</p>
              </div>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed font-semibold">
              {confirmModal.message}
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
              {confirmModal.cancelText && (
                <button
                  id="cancel-confirm-btn"
                  onClick={() => {
                    if (confirmModal.onCancel) {
                      confirmModal.onCancel();
                    } else {
                      setConfirmModal(null);
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
                >
                  {confirmModal.cancelText}
                </button>
              )}
              <button
                id="confirm-action-btn"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className={`flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0 ${
                  confirmModal.accentColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100' :
                  confirmModal.accentColor === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100' :
                  'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
         </div>
       )}

       {showTABillModal && (
        <div id="ta-bill-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowTABillModal(false)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowTABillModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Generate TA Bill</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mt-0.5">GAR - 14A Tour Bill Form</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Month
                  </label>
                  <select
                    value={taBillMonth}
                    onChange={(e) => setTaBillMonth(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-yellow-500 focus:bg-white transition-all text-sm"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Year
                  </label>
                  <select
                    value={taBillYear}
                    onChange={(e) => setTaBillYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-yellow-500 focus:bg-white transition-all text-sm"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  S. No 3: Pay (Basic Pay Rs.)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 35400"
                  value={taBillPay}
                  onChange={(e) => setTaBillPay(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  S. No 12: Amount of T.A. advance (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nil, or 5000"
                  value={taBillAdvance}
                  onChange={(e) => setTaBillAdvance(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-500 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTABillModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
              >
                Cancel
              </button>
              <button
                id="generate-ta-bill-btn"
                onClick={() => {
                  const tempMetadata = {
                    ...metadata,
                    month: taBillMonth,
                    year: taBillYear
                  };
                  generateTABillDoc(tempMetadata, taBillPay, taBillAdvance, attachedOffice);
                  setShowTABillModal(false);
                }}
                className="flex-1 py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-lg shadow-amber-100/50"
              >
                Generate Document
              </button>
            </div>
          </div>
        </div>
      )}

      {optimizationResult && (
        <BikeOptimizerModal
          isOpen={!!optimizationResult}
          onClose={() => setOptimizationResult(null)}
          candidates={optimizationResult.candidates}
          initialSelectedIds={optimizationResult.initialSelectedIds}
          recommendedUnderIds={optimizationResult.recommendedUnderIds}
          recommendedOverIds={optimizationResult.recommendedOverIds}
          baselineBusBikeKM={optimizationResult.baselineBusBikeKM}
          nonCandidateBikeKM={optimizationResult.nonCandidateBikeKM}
          targetKM={optimizationResult.targetKM}
          monthName={optimizationResult.monthName}
          year={optimizationResult.year}
          activeProfile={optimizationResult.activeProfile}
          onApply={applyBikeOptimization}
          hasBackup={hasBikeOptBackup}
          onRestoreBackup={() => {
            setConfirmModal({
              title: "Restore Pre-Optimization State?",
              message: "This will revert all days in the current month back to their transport modes before bike optimization was applied.",
              confirmText: "Yes, Restore Previous State",
              accentColor: "amber",
              onConfirm: () => restorePreOptimizationState()
            });
          }}
        />
      )}

      {showExportDiaryModal && (
        <div id="export-diary-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExportDiaryModal(false)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowExportDiaryModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Export Dairy</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mt-0.5">Fortnightly Dairy Document</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Month
                  </label>
                  <select
                    value={exportDiaryMonth}
                    onChange={(e) => setExportDiaryMonth(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-sm"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Year
                  </label>
                  <select
                    value={exportDiaryYear}
                    onChange={(e) => setExportDiaryYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-sm"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Fortnight
                </label>
                <select
                  value={exportDiaryFortnight}
                  onChange={(e) => setExportDiaryFortnight(e.target.value as 'first' | 'second')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-sm"
                >
                  <option value="first">First Fortnight (1st - 15th)</option>
                  <option value="second">Second Fortnight (16th - End)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportDiaryModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
              >
                Cancel
              </button>
              <button
                id="generate-diary-btn"
                onClick={() => {
                  handleExport(exportDiaryMonth, exportDiaryYear, exportDiaryFortnight);
                  setShowExportDiaryModal(false);
                }}
                className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0 shadow-lg shadow-violet-100"
              >
                Generate Document
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportTAModal && (
        <div id="export-ta-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowExportTAModal(false)}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowExportTAModal(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-4 text-left">
              <div className={`p-3 rounded-2xl transition-colors ${exportTAFormat === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                {exportTAFormat === 'excel' ? <FileSpreadsheet size={28} /> : <FileText size={28} />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Export TA Calculation</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                  Choose Format & Period ({exportTAFormat === 'excel' ? 'Excel .xlsx' : 'Word .docx'})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 text-left">
              {/* Format Selection Option */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Select Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="ta-format-excel-btn"
                    onClick={() => setExportTAFormat('excel')}
                    className={`p-3.5 rounded-xl border-2 text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                      exportTAFormat === 'excel'
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 font-black text-xs ${exportTAFormat === 'excel' ? 'text-emerald-700' : 'text-slate-700'}`}>
                        <FileSpreadsheet size={16} className={exportTAFormat === 'excel' ? 'text-emerald-600' : 'text-slate-500'} /> Excel Sheet
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${exportTAFormat === 'excel' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        .XLSX
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Print-ready A4 portrait sheet with auto spacing & expandable rows
                    </p>
                  </button>

                  <button
                    type="button"
                    id="ta-format-word-btn"
                    onClick={() => setExportTAFormat('word')}
                    className={`p-3.5 rounded-xl border-2 text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                      exportTAFormat === 'word'
                        ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 font-black text-xs ${exportTAFormat === 'word' ? 'text-blue-700' : 'text-slate-700'}`}>
                        <FileText size={16} className={exportTAFormat === 'word' ? 'text-blue-600' : 'text-slate-500'} /> Word Doc
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${exportTAFormat === 'word' ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        .DOCX
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Print-ready landscape document for Microsoft Word
                    </p>
                  </button>
                </div>
              </div>

              {/* Month and Year Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Month
                  </label>
                  <select
                    value={exportTAMonth}
                    onChange={(e) => setExportTAMonth(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm cursor-pointer"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Year
                  </label>
                  <select
                    value={exportTAYear}
                    onChange={(e) => setExportTAYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportTAModal(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
              >
                Cancel
              </button>
              <button
                id="generate-ta-calc-btn"
                onClick={() => {
                  handleExportTA(exportTAMonth, exportTAYear, exportTAFormat);
                  setShowExportTAModal(false);
                }}
                className={`flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0 shadow-lg flex items-center justify-center gap-2 ${
                  exportTAFormat === 'excel'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {exportTAFormat === 'excel' ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                <span>Download {exportTAFormat === 'excel' ? 'Excel Sheet (.xlsx)' : 'Word Document (.docx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diary Reminder Notification Onboarding Setup Modal */}
      {showNotifSetupModal && (
        <div id="notif-setup-onboarding-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative animate-fade-in text-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Bell size={28} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-tight">
                  Daily Diary Reminders
                </h3>
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mt-0.5">
                  Never forget to update on time
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Updating your work diary and transit routes on time is crucial. Set your reminder scheduler preferences to get notified when it is time to log today's activities!
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Reminder Day Frequency
                </label>
                <div className="relative">
                  <select
                    value={notifFrequency}
                    onChange={(e) => {
                      setNotifFrequency(e.target.value);
                      localStorage.setItem('diary_notif_frequency', e.target.value);
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all cursor-pointer appearance-none"
                  >
                    <option value="mon_to_sat">💼 Monday to Saturday (Mon-Sat)</option>
                    <option value="daily">📅 Every Single Day (Sun-Sat)</option>
                    <option value="weekday">💼 Weekdays Only (Mon-Fri)</option>
                    <option value="weekly_sat">🗓️ Weekly (Every Saturday)</option>
                    <option value="weekly_sun">🗓️ Weekly (Every Sunday)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Alert Frequency Per Day
                </label>
                <div className="relative">
                  <select
                    value={notifTimesPerDay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNotifTimesPerDay(val);
                      localStorage.setItem('diary_notif_times_per_day', String(val));
                    }}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all cursor-pointer appearance-none"
                  >
                    <option value={1}>🔔 1 Time Daily</option>
                    <option value={2}>🔔🔔 2 Times Daily</option>
                    <option value={3}>🔔🔔🔔 3 Times Daily</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* Dynamic Time Picker List */}
              <div className="space-y-3 pt-2 border-t border-dashed border-slate-100">
                {notifTimesPerDay >= 1 && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      ⏰ First Reminder Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime1}
                        onChange={(e) => {
                          setNotifTime1(e.target.value);
                          localStorage.setItem('diary_notif_time1', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}

                {notifTimesPerDay >= 2 && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      ⏰ Second Reminder Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime2}
                        onChange={(e) => {
                          setNotifTime2(e.target.value);
                          localStorage.setItem('diary_notif_time2', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}

                {notifTimesPerDay >= 3 && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      ⏰ Third Reminder Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={notifTime3}
                        onChange={(e) => {
                          setNotifTime3(e.target.value);
                          localStorage.setItem('diary_notif_time3', e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Clock size={14} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  setNotifEnabled(true);
                  localStorage.setItem('diary_notif_enabled', 'true');
                  localStorage.setItem('diary_notif_configured', 'true');
                  
                  // Save all setup parameters to ensure they are cached
                  localStorage.setItem('diary_notif_frequency', notifFrequency);
                  localStorage.setItem('diary_notif_times_per_day', String(notifTimesPerDay));
                  localStorage.setItem('diary_notif_time1', notifTime1);
                  localStorage.setItem('diary_notif_time2', notifTime2);
                  localStorage.setItem('diary_notif_time3', notifTime3);

                  setShowNotifSetupModal(false);
                  
                  setTimeout(() => {
                    const timesStr = [];
                    if (notifTimesPerDay >= 1) timesStr.push(notifTime1);
                    if (notifTimesPerDay >= 2) timesStr.push(notifTime2);
                    if (notifTimesPerDay >= 3) timesStr.push(notifTime3);

                    if (granted) {
                      new Notification("Diary Reminders Active! 🔔", {
                        body: `We'll remind you to update your logs at: ${timesStr.join(', ')}!`,
                        icon: '/logo-sa-diary-192.png'
                      });
                    } else {
                      setInAppToast({
                        show: true,
                        title: "In-App Reminders Setup Completed! ⏰",
                        message: `We'll display on-screen alerts to update your logs at: ${timesStr.join(', ')}.`
                      });
                    }
                  }, 500);
                }}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 border-0 cursor-pointer text-center"
              >
                🔔 Enable & Schedule Reminders
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotifEnabled(false);
                  localStorage.setItem('diary_notif_enabled', 'false');
                  localStorage.setItem('diary_notif_configured', 'true');
                  setShowNotifSetupModal(false);
                }}
                className="w-full py-3 text-slate-500 hover:text-slate-800 text-xs font-bold tracking-wide transition-all border-0 bg-transparent cursor-pointer text-center"
              >
                No thanks, I will remember myself
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Alert banner */}
      {inAppToast && inAppToast.show && (
        <div id="in-app-toast-alert" className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 flex gap-4 animate-slide-up items-start animate-fade-in">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <Bell size={18} className="animate-bounce" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-xs font-black uppercase tracking-wide text-white">{inAppToast.title}</h4>
            <p className="text-[11px] text-slate-300 font-semibold leading-relaxed mt-1">{inAppToast.message}</p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setInAppToast(null);
                  setActiveTab('entry');
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg border-0 cursor-pointer animate-pulse"
              >
                Log Now 📝
              </button>
              <button
                type="button"
                onClick={() => setInAppToast(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg border-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInAppToast(null)}
            className="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer p-0.5"
            title="Close Alert"
          >
            <X size={14} />
          </button>
        </div>
      )}


      {/* 6-Digit PIN Cloud Sync Modal */}
      <PinSyncModal
        isOpen={showPinSyncModal}
        onClose={() => setShowPinSyncModal(false)}
        initialMode={pinSyncInitialMode}
        metadata={metadata}
        activeProfile={activeProfile}
        onApplyData={handleApplyQRTransferData}
      />

      {/* Offline Package & Standalone App Modal */}
      <OfflinePackageModal
        isOpen={showOfflinePackageModal}
        onClose={() => setShowOfflinePackageModal(false)}
        onExportAllData={exportAllDataAsJSON}
        onImportData={() => {
          const input = document.getElementById('offline-restore-input') as HTMLInputElement;
          if (input) input.click();
        }}
        operatingMode={operatingMode}
        onSetOperatingMode={handleSetOperatingMode}
      />

      {/* Connectivity Banner when offline */}
      <OfflineIndicator 
        operatingMode={operatingMode}
        onSwitchMode={handleSetOperatingMode}
      />

      {/* Hidden file input for offline backup restoration */}
      <input
        id="offline-restore-input"
        type="file"
        accept=".json"
        onChange={handleFileUploadSync}
        className="hidden"
      />

    </div>
  );
};

export default App;