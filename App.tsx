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
  Filter
} from 'lucide-react';
import { DiaryMetadata, ActivityEntry, MovementEntry, OfficeVisit, OfficeDatabaseEntry, InterOfficeRouteEntry, ServiceCallReport } from './types';
import { getFortnightDays, formatDate, formatDay, to24hDot, isMonthCompleted } from './utils/dateUtils';
import { generateWordDoc, generateTACalculationsDoc, generateServiceCallReportDoc, generateTABillDoc } from './services/docGenerator';
import { ServiceCallReportGenerator } from './components/ServiceCallReportGenerator';
import { googleSignIn } from './services/firebaseAuth';
import { sendEmailWithAttachments } from './services/gmailSender';


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
      "neyveli ts 2": { distanceBus: 10, distanceBike: 10, durationBus: 20, durationBike: 20, fareBus: 10 },
      "gandhinagar": { distanceBus: 12, distanceBike: 12, durationBus: 30, durationBike: 30, fareBus: 15 },
      "gandhi nagar": { distanceBus: 12, distanceBike: 12, durationBus: 30, durationBike: 30, fareBus: 15 },
      "neyveli second mine": { distanceBus: 14, distanceBike: 14, durationBus: 20, durationBike: 20, fareBus: 10 },
      "neyveli second mines": { distanceBus: 16, distanceBike: 16, durationBus: 25, durationBike: 25, fareBus: 15 },
      "neyveli ii thermal": { distanceBus: 10, distanceBike: 10, durationBus: 25, durationBike: 20, fareBus: 10 },
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
  "Cuddalore DO": { bsName: "CUDDALORE BUS STAND", hubKm: 35, spokeKm: 2 },
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
  "Kurinjipadi SO": 35, "Kullanchavadi SO": 35, "Alapakkam SO": 35, "Cuddalore HO": 2, "Cuddalore DO": 2,
  "Tiruvendhipuram SO": 7, "Vandipalayam SO": 3.5, "Manjakuppam SO": 4, "Kondur SO": 7, "Varakkalpattu SO": 9,
  "Nellikkuppam SO": 13, "Melpattambakkam SO": 10, "Kilkavarapattu SO": 6, "CN Palayam SO": 21,
  "Sipcot SO": 4, "Cuddalore OT SO": 5, "Cuddalore OT Bazaar SO": 5, "Tirupadiripuliyur SO": 3,
  "Tirupadiripuliyur West SO": 3.5, "Fort St David SO": 4, "Cuddalore Public Offices SO": 2
};

const SPECIAL_SPOKE_MODES: Record<string, string> = { 
  "Tirupadiripuliyur SO": "AUTO", 
  "Vandipalayam SO": "AUTO", 
  "Tirupadiripuliyur West SO": "AUTO" 
};

const INTER_OFFICE_DATA: Record<string, Record<string, { km: string, mode?: string, dur?: number, fare?: number }>> = {
  "Kurinjipadi SO": { "Kullanchavadi SO": { km: "15", dur: 20 }, "Alapakkam SO": { km: "22", dur: 35 }, "Cuddalore OT SO": { km: "25", dur: 40 }, "Cuddalore OT Bazaar SO": { km: "25", dur: 40 }, "CN Palayam SO": { km: "20", dur: 40 }, "Cuddalore HO": { km: "32", dur: 50 } },
  "Kullanchavadi SO": { "Kurinjipadi SO": { km: "15", dur: 20 }, "Alapakkam SO": { km: "7", dur: 20 }, "Cuddalore OT SO": { km: "10", dur: 20 }, "Cuddalore OT Bazaar SO": { km: "10", dur: 20 }, "CN Palayam SO": { km: "20", dur: 40 }, "Cuddalore HO": { km: "17", dur: 30 } },
  "Alapakkam SO": { "Kullanchavadi SO": { km: "7", dur: 20 }, "Kurinjipadi SO": { km: "22", dur: 30 }, "Cuddalore OT SO": { km: "15", dur: 20 }, "Cuddalore OT Bazaar SO": { km: "15", dur: 20 }, "CN Palayam SO": { km: "27", dur: 50 }, "Cuddalore HO": { km: "20", dur: 35 } },
  "Cuddalore OT SO": { "Cuddalore OT Bazaar SO": { km: "0.5", dur: 10, mode: "WALK" }, "Kurinjipadi SO": { km: "25", dur: 40 }, "Kullanchavadi SO": { km: "10", dur: 20 }, "Alapakkam SO": { km: "14", dur: 30 }, "Cuddalore HO": { km: "7", dur: 15 } },
  "Cuddalore OT Bazaar SO": { "Tirupadiripuliyur SO": { km: "5", dur: 10 }, "Cuddalore OT SO": { km: "0.5", dur: 10, mode: "WALK" }, "Kurinjipadi SO": { km: "25", dur: 40 }, "Kullanchavadi SO": { km: "10", dur: 20 }, "Cuddalore HO": { km: "7", dur: 15 } },
  "Fort St David SO": { "Cuddalore DO": { km: "1.5", dur: 5 }, "Cuddalore HO": { km: "3.5", dur: 15 }, "Cuddalore Public Offices SO": { km: "1.5", dur: 5 } },
  "Cuddalore DO": { "Cuddalore HO": { km: "2", dur: 10 }, "Fort St David SO": { km: "1.5", dur: 5 }, "Cuddalore Public Offices SO": { km: "2", dur: 10 }, "Kondur SO": { km: "5", dur: 15 }, "Tirupadiripuliyur SO": { km: "2", dur: 10 }, "Nellikkuppam SO": { km: "13", dur: 30 } },
  "Cuddalore Public Offices SO": { "Fort St David SO": { km: "3", dur: 5 }, "Cuddalore HO": { km: "2", dur: 5 }, "Cuddalore DO": { km: "1.5", dur: 10 } },
  "Cuddalore HO": { "Cuddalore DO": { km: "2", dur: 10 }, "Manjakuppam SO": { km: "2", dur: 10 }, "Varakkalpattu SO": { km: "7", dur: 30 }, "Vandipalayam SO": { km: "5", dur: 15 }, "Cuddalore OT SO": { km: "7", dur: 20 }, "Tirupadiripuliyur West SO": { km: "4", dur: 15 }, "Tirupadiripuliyur SO": { km: "2", dur: 10 }, "Kondur SO": { km: "5", dur: 15 }, "Fort St David SO": { km: "4", dur: 15 }, "Cuddalore Public Offices SO": { km: "2", dur: 10 }, "Nellikkuppam SO": { km: "11", dur: 30 } },
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
    "Neyveli TS 2 S.O": { km: "10", dur: 20, mode: "Bike", fare: 10 },
    "Gandhinagar S.O": { km: "12", dur: 30, mode: "Bike", fare: 15 },
    "Neyveli Second MineS.O": { km: "14", dur: 20, mode: "Bike", fare: 10 },
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
    "Neyveli 3 S.O": { km: "14", dur: 20, mode: "Bike", fare: 10 }
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
    "Panruti East S.O": { km: "6", dur: 35, mode: "Bus", fare: 10 },
    "Panruti West S.O": { km: "8", dur: 20, mode: "Bus", fare: 10 },
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

const App: React.FC = () => {
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    const saved = localStorage.getItem('diary_active_profile');
    if (!saved || saved === "Default Profile") {
      return "Karikalvalavan R";
    }
    return saved;
  });

  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('diary_profiles_list');
      if (!saved) {
        const initialList = ["Karikalvalavan R", "Muthvel R", "Sivaraj S"];
        localStorage.setItem('diary_profiles_list', JSON.stringify(initialList));
        return initialList;
      }
      let parsed = JSON.parse(saved) as string[];
      parsed = parsed.map(p => p === "Default Profile" ? "Karikalvalavan R" : p);
      return parsed;
    } catch {
      return ["Karikalvalavan R", "Muthvel R", "Sivaraj S"];
    }
  });

  // Email setup states
  const [emailSetupPendingProfile, setEmailSetupPendingProfile] = useState<string | null>(null);
  const [emailSetupInput, setEmailSetupInput] = useState<string>('');
  const [emailSetupError, setEmailSetupError] = useState<string>('');
  const [emailSetupDismissed, setEmailSetupDismissed] = useState<boolean>(false);
  const [profileEmailInputError, setProfileEmailInputError] = useState<string>('');

  const loadedProfileRef = useRef<string>(
    localStorage.getItem('diary_active_profile') === "Default Profile"
      ? "Karikalvalavan R"
      : (localStorage.getItem('diary_active_profile') || "Karikalvalavan R")
  );

  const isFirstSyncEffectRef = useRef(true);

  const [metadata, setMetadata] = useState<DiaryMetadata>(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentFortnight = currentDay <= 15 ? 'first' : 'second';
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(currentDay)}.${pad(currentMonth + 1)}.${currentYear}`;

    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;

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

    const key = actProf === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${actProf}_metadata`;
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

  useEffect(() => {
    if (!emailSetupDismissed) {
      const linkedEmail = metadata.scrEmailRecipient || '';
      if (!linkedEmail && !emailSetupPendingProfile) {
        setEmailSetupPendingProfile(activeProfile);
        setEmailSetupInput('');
        setEmailSetupError('');
      }
    }
  }, [activeProfile, metadata.scrEmailRecipient, emailSetupPendingProfile, emailSetupDismissed]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
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

  const [showExportDiaryModal, setShowExportDiaryModal] = useState(false);
  const [exportDiaryMonth, setExportDiaryMonth] = useState<number>(0);
  const [exportDiaryYear, setExportDiaryYear] = useState<number>(2026);
  const [exportDiaryFortnight, setExportDiaryFortnight] = useState<'first' | 'second'>('first');

  const [showExportTAModal, setShowExportTAModal] = useState(false);
  const [exportTAMonth, setExportTAMonth] = useState<number>(0);
  const [exportTAYear, setExportTAYear] = useState<number>(2026);

  const [activeTab, setActiveTab] = useState<'profile' | 'scr' | 'entry' | 'summary' | 'movements' | 'database'>('entry');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedHistoricalMonth, setSelectedHistoricalMonth] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [syncTextInput, setSyncTextInput] = useState('');
  const [syncPinInput, setSyncPinInput] = useState('');
  const [activeCloudPin, setActiveCloudPin] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Persistent Web Storage Sync States
  const [webSyncUser, setWebSyncUser] = useState<{ email: string; passcode: string } | null>(() => {
    const saved = localStorage.getItem('diary_websync_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [webSyncStatus, setWebSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'loading'>('idle');
  const [webSyncErrorMessage, setWebSyncErrorMessage] = useState('');
  const [isInitialSyncCompleted, setIsInitialSyncCompleted] = useState(false);
  const [webSyncBackups, setWebSyncBackups] = useState<Array<{ payload: any; updatedAt: number; device?: string }>>([]);
  const [webSyncUpdatedAt, setWebSyncUpdatedAt] = useState<number | null>(() => {
    const saved = localStorage.getItem('diary_websync_updated_at');
    return saved ? parseInt(saved, 10) : null;
  });
  const [activeCloudPayload, setActiveCloudPayload] = useState<any | null>(null);

  // Free up local storage quota immediately
  useEffect(() => {
    try {
      localStorage.removeItem('diary_websync_active_payload');
    } catch (e) {
      console.warn('Failed to clean up diary_websync_active_payload:', e);
    }
  }, []);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');

  const getLocalStorageSyncPayload = () => {
    const payload: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('diary_') && !key.startsWith('diary_websync_')) {
        payload[key] = localStorage.getItem(key) || '';
      }
    }
    
    // Inject latest in-memory React state to guarantee no stale values during sync
    const prefix = activeProfile === "Karikalvalavan R" ? "diary_" : `diary_profile_${activeProfile}_`;
    payload[`${prefix}metadata`] = JSON.stringify(metadata);
    payload[`${prefix}activities`] = JSON.stringify(activities);
    payload[`${prefix}movements`] = JSON.stringify(movements);
    payload[`${prefix}attached_office`] = attachedOffice;
    payload[`${prefix}offices_db`] = JSON.stringify(officesDb);
    payload[`${prefix}service_calls`] = JSON.stringify(serviceCalls);
    payload['diary_profiles_list'] = JSON.stringify(profiles);
    payload['diary_active_profile'] = activeProfile;
    if (!payload['diary_last_updated']) {
      payload['diary_last_updated'] = localStorage.getItem('diary_last_updated') || Date.now().toString();
    }
    
    return payload;
  };

  const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, delay = 1500): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      
      // If it's an API route and we get HTML (e.g., due to offline fallback, SPA fallback or service worker)
      if (url.startsWith('/api/')) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Server returned HTML instead of JSON. Please refresh the page, clear your service worker cache, or check your internet connection.');
        }
      }
      
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };

  const syncWorkspaceToWebStorage = async (customUser?: { email: string; passcode: string }, customPayload?: any) => {
    const userToSync = customUser || webSyncUser;
    if (!userToSync) return;

    setWebSyncStatus('syncing');
    try {
      const payload = customPayload || getLocalStorageSyncPayload();
      const response = await fetchWithRetry('/api/web-storage/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userToSync.email,
          passcode: userToSync.passcode,
          payload,
          device: getDeviceType()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Save failed' }));
        throw new Error(errorData.message || 'Server error saving data.');
      }
      
      const resData = await response.json();
      if (resData.success) {
        if (resData.updatedAt) {
          localStorage.setItem('diary_websync_updated_at', resData.updatedAt.toString());
          setWebSyncUpdatedAt(resData.updatedAt);
        }
        if (resData.history) {
          setWebSyncBackups(resData.history);
        }
        // Save the active payload we just saved to cloud
        setActiveCloudPayload(payload);
      }
      
      setWebSyncStatus('synced');
    } catch (e: any) {
      console.error('[Web Storage Auto-sync] Failure:', e);
      setWebSyncStatus('error');
      setWebSyncErrorMessage(e?.message || 'Sync connection failed.');
    }
  };

  useEffect(() => {
    const initCloudProfile = async () => {
      if (!webSyncUser) {
        setIsInitialSyncCompleted(true);
        return;
      }

      // Check sessionStorage reload guard to prevent loops
      if (sessionStorage.getItem('diary_sync_reloaded') === '1') {
        sessionStorage.removeItem('diary_sync_reloaded');
        setWebSyncStatus('synced');
        setIsInitialSyncCompleted(true);
        return;
      }

      setWebSyncStatus('loading');
      try {
        const response = await fetchWithRetry('/api/web-storage/register-or-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: webSyncUser.email,
            passcode: webSyncUser.passcode,
            device: getDeviceType()
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
          throw new Error(errorData.message || 'Authentication error.');
        }

        const resData = await response.json();
        if (resData.success) {
          if (resData.history) {
            setWebSyncBackups(resData.history);
          }
          if (resData.updatedAt) {
            localStorage.setItem('diary_websync_updated_at', resData.updatedAt.toString());
            setWebSyncUpdatedAt(resData.updatedAt);
          }
          if (resData.payload) {
            setActiveCloudPayload(resData.payload);
            
            const cloudPayload = resData.payload;
            const cloudTimestamp = parseInt(cloudPayload['diary_last_updated'] || '0', 10);
            const localTimestamp = parseInt(localStorage.getItem('diary_last_updated') || '0', 10);

            const hasLocalTimestamp = !!localStorage.getItem('diary_last_updated');
            let shouldPull = false;

            if (cloudTimestamp > 0 || localTimestamp > 0) {
              shouldPull = (cloudTimestamp > localTimestamp) || (!hasLocalTimestamp && cloudTimestamp > 0);
            } else {
              // Legacy fallback if no timestamps are present: do identicalness check
              let isIdentical = true;
              Object.entries(cloudPayload).forEach(([key, val]) => {
                if (localStorage.getItem(key) !== val) {
                  isIdentical = false;
                }
              });
              shouldPull = !isIdentical;
            }

            if (shouldPull) {
              // Restore entire payload from cloud!
              Object.entries(cloudPayload).forEach(([key, val]) => {
                if (typeof val === 'string') {
                  localStorage.setItem(key, val);
                }
              });
              sessionStorage.setItem('diary_sync_reloaded', '1');
              setWebSyncStatus('synced');
              window.location.reload();
              return;
            }
          }
        }
        
        // If identical or no payload, we are active & synced!
        setWebSyncStatus('synced');
        setIsInitialSyncCompleted(true);
      } catch (err: any) {
        console.error('[Web Storage Initial Load] Error:', err);
        setWebSyncStatus('error');
        setWebSyncErrorMessage(err.message || 'Connection lost.');
        setIsInitialSyncCompleted(true);
      }
    };

    initCloudProfile();
  }, []);

  const availableDays = useMemo(() => getFortnightDays(metadata.year, metadata.month, metadata.fortnight), [metadata.year, metadata.month, metadata.fortnight]);

  const [activities, setActivities] = useState<ActivityEntry[]>(() => {
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_activities" : `diary_profile_${actProf}_activities`;
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
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_movements" : `diary_profile_${actProf}_movements`;
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
        fareBus: (specs as any).fareBus
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
          fareBus: spec.fare,
          viaBusStand: viaBs || undefined,
          fromOfficeToBsKm: viaBs ? fromBsKm : undefined,
          fromOfficeToBsMins: viaBs ? fromBsMins : undefined,
          toOfficeToBsKm: viaBs ? mapTo.spokeKm : undefined,
          toOfficeToBsMins: viaBs ? toBsMins : undefined
        });
      });
    });

    return list.sort((a, b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
  };

  const [officesDb, setOfficesDb] = useState<OfficeDatabaseEntry[]>(() => {
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_offices_db" : `diary_profile_${actProf}_offices_db`;
    const saved = localStorage.getItem(key);
    
    // Also check for saved inter_office_db to automatically consolidate
    const interKey = actProf === "Karikalvalavan R" ? "diary_inter_office_db" : `diary_profile_${actProf}_inter_office_db`;
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
          return loaded.sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice));
        }
      } catch (e) {}
    }
    
    return getDefaultOfficesAndInterOfficesList(actProf);
  });

  const [serviceCalls, setServiceCalls] = useState<ServiceCallReport[]>(() => {
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_service_calls" : `diary_profile_${actProf}_service_calls`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [confirmedScrDays, setConfirmedScrDays] = useState<Record<string, boolean>>(() => {
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_confirmed_scr_days" : `diary_profile_${actProf}_confirmed_scr_days`;
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
    const key = activeProfile === "Karikalvalavan R" ? "diary_confirmed_scr_days" : `diary_profile_${activeProfile}_confirmed_scr_days`;
    localStorage.setItem(key, JSON.stringify(confirmedScrDays));
  }, [confirmedScrDays, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_service_calls" : `diary_profile_${activeProfile}_service_calls`;
    localStorage.setItem(key, JSON.stringify(serviceCalls));
  }, [serviceCalls, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${activeProfile}_metadata`;
    localStorage.setItem(key, JSON.stringify(metadata));
  }, [metadata, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_activities" : `diary_profile_${activeProfile}_activities`;
    localStorage.setItem(key, JSON.stringify(activities));
  }, [activities, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_movements" : `diary_profile_${activeProfile}_movements`;
    localStorage.setItem(key, JSON.stringify(movements));
  }, [movements, activeProfile]);

  const [attachedOffice, setAttachedOffice] = useState<string>(() => {
    const rawProf = localStorage.getItem('diary_active_profile') || "Karikalvalavan R";
    const actProf = rawProf === "Default Profile" ? "Karikalvalavan R" : rawProf;
    const key = actProf === "Karikalvalavan R" ? "diary_attached_office" : `diary_profile_${actProf}_attached_office`;
    return localStorage.getItem(key) || getProfileAttachedOffice(actProf);
  });

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_attached_office" : `diary_profile_${activeProfile}_attached_office`;
    localStorage.setItem(key, attachedOffice);
  }, [attachedOffice, activeProfile]);

  useEffect(() => {
    if (loadedProfileRef.current !== activeProfile) return;
    const key = activeProfile === "Karikalvalavan R" ? "diary_offices_db" : `diary_profile_${activeProfile}_offices_db`;
    localStorage.setItem(key, JSON.stringify(officesDb));
  }, [officesDb, activeProfile]);

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

  // Automatic Background Cloud Save
  useEffect(() => {
    if (!isInitialSyncCompleted || !webSyncUser) return;

    if (isFirstSyncEffectRef.current) {
      isFirstSyncEffectRef.current = false;
      return;
    }

    // Bump the modification timestamp only because a real user edit occurred
    localStorage.setItem('diary_last_updated', Date.now().toString());

    const delayDebounce = setTimeout(() => {
      syncWorkspaceToWebStorage();
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [
    metadata,
    activities,
    movements,
    attachedOffice,
    officesDb,
    profiles,
    activeProfile,
    serviceCalls,
    isInitialSyncCompleted,
    webSyncUser
  ]);

  const isEmailLinkedToOtherProfile = (email: string, currentProfile: string, profilesList: string[]): string | null => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return null;
    
    for (const p of profilesList) {
      if (p === currentProfile) continue;
      const key = p === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${p}_metadata`;
      const metaStr = localStorage.getItem(key);
      if (metaStr) {
        try {
          const parsed = JSON.parse(metaStr);
          if (parsed.scrEmailRecipient && parsed.scrEmailRecipient.trim().toLowerCase() === trimmedEmail) {
            return p;
          }
        } catch {}
      }
    }
    return null;
  };

  const switchProfile = (newProfileName: string) => {
    // 1. Check Email Setup
    const emailKey = newProfileName === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${newProfileName}_metadata`;
    const savedMeta = localStorage.getItem(emailKey);
    let linkedEmail = '';
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        linkedEmail = parsed.scrEmailRecipient || '';
      } catch {}
    }

    if (!linkedEmail) {
      setEmailSetupPendingProfile(newProfileName);
      setEmailSetupInput('');
      setEmailSetupError('');
      return;
    }

    // 3. Complete Switch
    executeSwitchProfile(newProfileName);
  };

  const executeSwitchProfile = (newProfileName: string) => {
    const oldProf = loadedProfileRef.current;
    
    // Save current states first
    const keyMetadata = oldProf === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${oldProf}_metadata`;
    localStorage.setItem(keyMetadata, JSON.stringify(metadata));

    const keyActivities = oldProf === "Karikalvalavan R" ? "diary_activities" : `diary_profile_${oldProf}_activities`;
    localStorage.setItem(keyActivities, JSON.stringify(activities));

    const keyMovements = oldProf === "Karikalvalavan R" ? "diary_movements" : `diary_profile_${oldProf}_movements`;
    localStorage.setItem(keyMovements, JSON.stringify(movements));

    const keyAttachedOffice = oldProf === "Karikalvalavan R" ? "diary_attached_office" : `diary_profile_${oldProf}_attached_office`;
    localStorage.setItem(keyAttachedOffice, attachedOffice);

    const keyOfficesDb = oldProf === "Karikalvalavan R" ? "diary_offices_db" : `diary_profile_${oldProf}_offices_db`;
    localStorage.setItem(keyOfficesDb, JSON.stringify(officesDb));

    const keyServiceCalls = oldProf === "Karikalvalavan R" ? "diary_service_calls" : `diary_profile_${oldProf}_service_calls`;
    localStorage.setItem(keyServiceCalls, JSON.stringify(serviceCalls));

    const keyConfirmedScrDays = oldProf === "Karikalvalavan R" ? "diary_confirmed_scr_days" : `diary_profile_${oldProf}_confirmed_scr_days`;
    localStorage.setItem(keyConfirmedScrDays, JSON.stringify(confirmedScrDays));

    // Update loadedProfileRef BEFORE setting activeProfile to let effects run again for new profile
    loadedProfileRef.current = newProfileName;
    setActiveProfile(newProfileName);
    setEmailSetupDismissed(false);
    localStorage.setItem('diary_active_profile', newProfileName);

    // Read the values for the new profile
    const getNewVal = (suffixKey: string) => {
      const pKey = newProfileName === "Karikalvalavan R" ? `diary_${suffixKey}` : `diary_profile_${newProfileName}_${suffixKey}`;
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
    setOfficesDb(loadedOffices.sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice)));

    // Service Calls
    const savedCalls = getNewVal('service_calls');
    setServiceCalls(savedCalls ? JSON.parse(savedCalls) : []);

    // Confirmed SCR Days
    const savedConfirmedScr = getNewVal('confirmed_scr_days');
    setConfirmedScrDays(savedConfirmedScr ? JSON.parse(savedConfirmedScr) : {});
  };

  const purgeKeysForProfile = (profileName: string, keepProfile: boolean = false) => {
    const prefixExact = profileName === "Karikalvalavan R" ? "diary_" : `diary_profile_${profileName}_`;
    
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
    
    const prefixes = variants.map(v => v === "Karikalvalavan R" ? "diary_" : `diary_profile_${v}_`);

    // Preserve email recipient if we are keeping the profile
    let preservedEmail = '';
    if (keepProfile) {
      const emailKey = profileName === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${profileName}_metadata`;
      const savedMeta = localStorage.getItem(emailKey);
      if (savedMeta) {
        try {
          const parsed = JSON.parse(savedMeta);
          preservedEmail = parsed.scrEmailRecipient || '';
        } catch {}
      }
    }

    // 1. Delete from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        if (profileName === "Karikalvalavan R") {
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

    // 2. Delete from activeCloudPayload too
    if (activeCloudPayload) {
      const nextCloud = { ...activeCloudPayload };
      Object.keys(nextCloud).forEach(key => {
        if (profileName === "Karikalvalavan R") {
          if (key.startsWith("diary_") && !key.includes("_profile_") && !key.startsWith("diary_websync_") && key !== "diary_profiles_list" && key !== "diary_active_profile") {
            delete nextCloud[key];
          }
        } else {
          const matchesAnyPrefix = prefixes.some(p => key.startsWith(p));
          const matchesExactKey = key === `diary_profile_${profileName}`;
          const matchesVariantKey = variants.some(v => key === `diary_profile_${v}`);
          if (matchesAnyPrefix || matchesExactKey || matchesVariantKey) {
            delete nextCloud[key];
          }
        }
      });
      setActiveCloudPayload(nextCloud);
    }

    // 3. Re-save preserved email recipient if needed
    if (keepProfile && preservedEmail) {
      const emailKey = profileName === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${profileName}_metadata`;
      const newMeta = { scrEmailRecipient: preservedEmail };
      localStorage.setItem(emailKey, JSON.stringify(newMeta));
      if (activeCloudPayload) {
        setActiveCloudPayload(prev => prev ? { ...prev, [emailKey]: JSON.stringify(newMeta) } : null);
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
    const prefixExact = trimmed === "Karikalvalavan R" ? "diary_" : `diary_profile_${trimmed}_`;
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
    const prefixes = variants.map(v => v === "Karikalvalavan R" ? "diary_" : `diary_profile_${v}_`);

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
    
    if (!hasPreExistingData && activeCloudPayload) {
      for (const k of Object.keys(activeCloudPayload)) {
        if (k !== "diary_profiles_list" && k !== "diary_active_profile") {
          if (prefixes.some(p => k.startsWith(p)) || variants.some(v => k === `diary_profile_${v}`)) {
            hasPreExistingData = true;
            break;
          }
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
      
      // Auto-sync
      setTimeout(() => {
        syncWorkspaceToWebStorage();
      }, 200);
    };

    const proceedRestore = () => {
      // If the data is only in the cloud, copy it to localStorage so it gets loaded correctly
      if (activeCloudPayload) {
        Object.entries(activeCloudPayload).forEach(([key, val]) => {
          if (key !== "diary_profiles_list" && key !== "diary_active_profile" && typeof val === 'string') {
            const isMatch = prefixes.some(p => key.startsWith(p)) || variants.some(v => key === `diary_profile_${v}`);
            if (isMatch) {
              localStorage.setItem(key, val);
            }
          }
        });
      }

      const updated = [...profiles, trimmed];
      setProfiles(updated);
      localStorage.setItem('diary_profiles_list', JSON.stringify(updated));
      switchProfile(trimmed);
      setConfirmModal(null);
      
      // Auto-sync
      setTimeout(() => {
        syncWorkspaceToWebStorage();
      }, 200);
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

  const cleanHrsToTime = (str: string) => {
    if (!str) return '11:00';
    const matched = str.match(/(\d{2})[:.](\d{2})/);
    if (matched) {
      return `${matched[1]}:${matched[2]}`;
    }
    return str.replace(/\s*hrs/gi, '').trim() || '11:00';
  };

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const normalized = timeStr.replace('.', ':');
    const matched = normalized.match(/(\d{2}):(\d{2})/);
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
    const newVisits = sortedList.map((matching) => {
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
        joinedIssues = 'Service call report';
      }

      const hasCallGivenBy = matching.callGivenBy && matching.callGivenBy.trim() !== '';
      const finalIssues = hasCallGivenBy ? joinedIssues : `to attend ${joinedIssues}`;

      return {
        id: defaultId,
        officeName: matching.officeAttended,
        startTime: cleanHrsToTime(matching.timeIn),
        endTime: cleanHrsToTime(matching.timeOut),
        issues: finalIssues,
        resolution: ''
      };
    });

    setVisits(newVisits);
  };

  useEffect(() => {
    const day = availableDays[selectedDateIdx];
    if (!day) return;
    const dStr = formatDate(day);
    const matchingList = serviceCalls.filter(sc => sc.date === dStr);
    
    const activeYear = day.getFullYear();
    const activeMonth = day.getMonth();
    const monthIsCompleted = isMonthCompleted(activeYear, activeMonth, activities);

    if (matchingList.length > 0 && activeTab === 'entry' && !monthIsCompleted && !confirmedScrDays[dStr]) {
      const promptKey = matchingList.map(m => m.id).sort().join('_');
      if (promptKey !== lastPromptedScrId) {
        const allAlreadyFilled = matchingList.every(matching => 
          visits.some(v => 
            v.officeName === matching.officeAttended && 
            v.startTime === cleanHrsToTime(matching.timeIn)
          )
        );
        
        if (!allAlreadyFilled) {
          const officeNames = matchingList.map(m => m.officeAttended).join(' & ');
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
  }, [selectedDateIdx, serviceCalls, lastPromptedScrId, activeTab, visits, activities, confirmedScrDays]);

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
    const key = activeProfile === "Karikalvalavan R" ? "diary_offices_db" : `diary_profile_${activeProfile}_offices_db`;
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

  const getOfficeDynamicSpecs = (officeName: string) => {
    const attOff = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    const destOff = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
    const matched = officesDb.find(o => {
      const fOff = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const tOff = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      return (fOff === attOff && tOff === destOff) || (fOff === destOff && tOff === attOff);
    });

    if (matched && matched.viaBusStand && matched.viaBusStand.trim()) {
      const isFromAtt = matched.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim() === attOff;
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

      return {
        bsName: matched.viaBusStand.trim(),
        spokeKm: spokeKm,
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
      return {
        bsName: mapping.bsName,
        spokeKm: mapping.spokeKm,
        spokeDuration: spokeTime,
        hubKm: mapping.hubKm,
        hubDuration: hubTime
      };
    }

    return {
      bsName: 'CUDDALORE BUS STAND',
      spokeKm: 5,
      spokeDuration: 15,
      hubKm: 30,
      hubDuration: 60
    };
  };



  const getTravelDur = (officeName: string, mode?: string) => {
    const matched = officesDb.find(o => {
      const fOff = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const tOff = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const attOff = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const destOff = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
      return (fOff === attOff && tOff === destOff) || (fOff === destOff && tOff === attOff);
    });
    if (matched) {
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
    const matched = officesDb.find(o => {
      const fOff = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const tOff = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const attOff = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const destOff = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
      return (fOff === attOff && tOff === destOff) || (fOff === destOff && tOff === attOff);
    });
    if (matched) {
      const isBike = mode?.toLowerCase().trim() === 'bike';
      return isBike ? matched.distanceBike : matched.distanceBus;
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
    const matched = officesDb.find(o => {
      const fOff = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const tOff = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const attOff = attachedOffice.toLowerCase().replace(/\s+/g, ' ').trim();
      const destOff = officeName.toLowerCase().replace(/\s+/g, ' ').trim();
      return (fOff === attOff && tOff === destOff) || (fOff === destOff && tOff === attOff);
    });
    if (matched && matched.fareBus !== undefined) {
      return matched.fareBus;
    }
    return undefined;
  };

  const getInterOfficeSpec = (fromOff: string, toOff: string, mode?: string) => {
    const normalizedFrom = fromOff.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedTo = toOff.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // First, look for exact match in officesDb
    let found = officesDb.find(r => 
      r.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedFrom &&
      r.toOffice.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedTo
    );
    let reverse = false;
    if (!found) {
      // Look for reverse match in officesDb
      found = officesDb.find(r => 
        r.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedTo &&
        r.toOffice.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedFrom
      );
      if (found) reverse = true;
    }
    
    if (found) {
      const isBike = mode?.toLowerCase().trim() === 'bike';
      return {
        km: (isBike ? found.distanceBike : found.distanceBus).toString(),
        dur: isBike ? found.durationBike : found.durationBus,
        mode: found.transportModeOverriding || undefined,
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
        mode: hardcoded.mode,
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
      if (first.officeName) {
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
        let travelDur = 20;
        const spec = getInterOfficeSpec(prev.officeName, v.officeName, mode);
        if (spec) {
          travelDur = spec.dur || 20;
        } else {
          travelDur = getTravelDur(v.officeName, mode);
        }
        const newStartTime = addMinutesToTime(prev.endTime, travelDur);
        if (v.startTime !== newStartTime) {
          const prevDuration = Math.max(10, timeToMinutes(v.endTime) - timeToMinutes(v.startTime));
          const newEndTime = addMinutesToTime(newStartTime, prevDuration);
          updated[idx] = {
            ...v,
            startTime: newStartTime,
            endTime: newEndTime
          };
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
        newMoves.push({ id: `${baseId}-bm${i}`, date, fromTime: realVisits[i].endTime, fromLocation: fromOff.toUpperCase(), toDate: date, toTime: addMinutesToTime(realVisits[i].endTime, spec?.dur || 20), toLocation: toOff.toUpperCase(), mode: spec?.mode || modeText, km: spec?.km || '10' });
      }
      const returnTime = getTravelDur(lastVisit.officeName, transportMode);
      newMoves.push({ id: `${baseId}-b2`, date, fromTime: lastVisit.endTime, fromLocation: lastVisit.officeName.toUpperCase(), toDate: date, toTime: addMinutesToTime(lastVisit.endTime, returnTime), toLocation: attachedOffice.toUpperCase(), mode: modeText, km: getTravelKm(lastVisit.officeName, transportMode).toString() });
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

      for (let i = 0; i < realVisits.length - 1; i++) {
        const fromOff = realVisits[i].officeName;
        const toOff = realVisits[i+1].officeName;
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
    return newMoves;
  };

  const handleSaveDay = () => {
    const day = availableDays[selectedDateIdx];
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
    
    setActivities(prev => {
      const filtered = prev.filter(a => a.date !== newActivity.date);
      return [...filtered, newActivity].sort((a, b) => a.id.localeCompare(b.id));
    });

    const newMoves = generateMovementsForDay(newActivity);
    setMovements(prev => {
      const others = prev.filter(m => m.date !== newActivity.date || m.isManual);
      const combined = [...others, ...newMoves].sort((a, b) => {
        const dComp = a.date.split('.').reverse().join('').localeCompare(b.date.split('.').reverse().join(''));
        return dComp !== 0 ? dComp : a.fromTime.localeCompare(b.fromTime);
      });
      return combined;
    });

    if (selectedDateIdx < availableDays.length - 1) {
      setSelectedDateIdx(selectedDateIdx + 1);
    }
    setVisits([{ id: Math.random().toString(36).substr(2, 5), officeName: attachedOffice, startTime: '09:00', endTime: '17:00', issues: '', resolution: '' }]);
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

  const handleExportTA = (exportMonth: number, exportYear: number) => {
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
            generateTACalculationsDoc(tempMetadata, [...monthActivities, ...paddingActivities].sort((a,b) => a.id.localeCompare(b.id)), monthMovements, serviceCalls);
            setConfirmModal(null);
          },
          onCancel: () => {
            generateTACalculationsDoc(tempMetadata, monthActivities, monthMovements, serviceCalls);
            setConfirmModal(null);
          }
        });
      } else {
        generateTACalculationsDoc(tempMetadata, monthActivities, monthMovements, serviceCalls);
      }
    };

    checkTAPadding();
  };

  const handleExportTABill = () => {
    setTaBillMonth(metadata.month);
    setTaBillYear(metadata.year);
    setShowTABillModal(true);
  };

  const handleWebSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPasscode.trim()) {
      alert("Please enter a valid Username/Email and Passcode.");
      return;
    }
    setWebSyncStatus('loading');
    setWebSyncErrorMessage('');
    try {
      const response = await fetchWithRetry('/api/web-storage/register-or-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          passcode: loginPasscode,
          device: getDeviceType()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failure logging in.' }));
        throw new Error(errorData.message || 'Verification failed. Incorrect passcode or invalid format.');
      }

      const resData = await response.json();
      if (resData.success) {
        const loggedInUser = { email: loginEmail.toLowerCase().trim(), passcode: loginPasscode.trim() };
        localStorage.setItem('diary_websync_user', JSON.stringify(loggedInUser));
        setWebSyncUser(loggedInUser);

        if (resData.history) {
          setWebSyncBackups(resData.history);
        }

        if (resData.updatedAt) {
          localStorage.setItem('diary_websync_updated_at', resData.updatedAt.toString());
          setWebSyncUpdatedAt(resData.updatedAt);
        }

        if (resData.payload) {
          setActiveCloudPayload(resData.payload);
          // Overwrite with downloaded workspace values!
          Object.entries(resData.payload).forEach(([key, val]) => {
            if (typeof val === 'string') {
              localStorage.setItem(key, val);
            }
          });
          setWebSyncStatus('synced');
          setConfirmModal({
            title: "Database Sync Connected! ☁️",
            message: `Successfully connected as "${loggedInUser.email}". Your cloud-saved database, day entries, and transit relationships have been retrieved and synchronized over to this device!`,
            confirmText: "Phenomenal!",
            accentColor: "emerald",
            onConfirm: () => {
              setConfirmModal(null);
              setLoginModalOpen(false);
              sessionStorage.setItem('diary_sync_reloaded', '1');
              window.location.reload();
            }
          });
        } else {
          // Brand new account: sync current local data instantly to establish their initial cloud space
          await syncWorkspaceToWebStorage(loggedInUser);
          setWebSyncStatus('synced');
          setIsInitialSyncCompleted(true);
          setConfirmModal({
            title: "Cloud Workspace Established! 🚀",
            message: `Success! Created a brand new cloud workspace for "${loggedInUser.email}". Your current local database is now synced automatically. Any updates from mobile or PC will reflect in real-time.`,
            confirmText: "Excellent, Thanks!",
            accentColor: "emerald",
            onConfirm: () => {
              setConfirmModal(null);
              setLoginModalOpen(false);
            }
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setWebSyncStatus('error');
      setWebSyncErrorMessage(err.message || 'Validation error.');
    }
  };

  const handleWebSyncLogout = () => {
    setConfirmModal({
      title: "Disconnect Web Sync? ☁️",
      message: `Are you sure you want to log out from "${webSyncUser?.email}"? This device will stop syncing automatically to the cloud, but all current local data will remain fully intact.`,
      confirmText: "Yes, Disconnect",
      cancelText: "No, Stay Connected",
      accentColor: "rose",
      onConfirm: () => {
        localStorage.removeItem('diary_websync_user');
        localStorage.removeItem('diary_websync_updated_at');
        setWebSyncUser(null);
        setWebSyncStatus('idle');
        setWebSyncBackups([]);
        setWebSyncUpdatedAt(null);
        setActiveCloudPayload(null);
        setConfirmModal({
          title: "Disconnected",
          message: "Web Sync disconnected. This device is now in Offline Local Storage mode.",
          confirmText: "Okay",
          accentColor: "blue",
          onConfirm: () => {
            setConfirmModal(null);
            setLoginModalOpen(false);
          }
        });
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const handleRestoreFromHistory = (backup: { payload: any; updatedAt: number }) => {
    setConfirmModal({
      title: "Rollback Workspace? ⚠️",
      message: `Are you sure you want to restore the backup from ${new Date(backup.updatedAt).toLocaleString()}? This will replace your current local entries with this historical version.`,
      confirmText: "Yes, Rollback",
      cancelText: "No, Cancel",
      accentColor: "rose",
      onConfirm: () => {
        // Overwrite local storage
        Object.entries(backup.payload).forEach(([key, val]) => {
          if (typeof val === 'string') {
            localStorage.setItem(key, val);
          }
        });
        
        // Also ensure active profile and states are reloaded
        sessionStorage.setItem('diary_sync_reloaded', '1');
        window.location.reload();
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const handleCloudUpload = async () => {
    setIsUploading(true);
    try {
      const payload = {
        version: "1.0",
        metadata,
        activities,
        movements,
        officesDb,
        attachedOffice
      };
      
      const response = await fetchWithRetry('/api/cloud-sync/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed. Internal status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success && result.pin) {
        setActiveCloudPin(result.pin);
        setConfirmModal({
          title: "Uploaded to Cloud! ☁️",
          message: `Your workspace data is now securely stored in our cloud cache. Your 6-digit Sync PIN is:\n\n${result.pin.slice(0,3)} ${result.pin.slice(3)}\n\nEnter this PIN on your mobile device to complete download & restoration instantly! (Active for 48 hours)`,
          confirmText: "Super, Got It!",
          accentColor: "emerald",
          onConfirm: () => setConfirmModal(null)
        });
      } else {
        throw new Error(result.message || "Unknown error during cloud upload.");
      }
    } catch (e: any) {
      setConfirmModal({
        title: "Cloud Upload Failed",
        message: `Could not sync data to the server: ${e?.message || e}. Please make sure you are connected to the internet and try again.`,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloudDownload = async (pinSource?: string) => {
    const pin = (pinSource || syncPinInput).trim().replace(/\s+/g, '');
    if (!pin) {
      setConfirmModal({
        title: "Enter a Valid PIN",
        message: "Please enter the 6-digit PIN generated from your computer to download your backup.",
        confirmText: "Retry",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    
    setIsDownloading(true);
    try {
      const response = await fetchWithRetry(`/api/cloud-sync/download/${pin}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "PIN not found or has expired." }));
        throw new Error(errorData.message || "PIN code does not exist.");
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        const parsed = result.data;
        setConfirmModal({
          title: "Cloud Sync Data Found! ☁️",
          message: `We found a valid backup containing ${parsed.activities?.length || 0} entries and professional profiles. This will restore and sync entries filled on your computer (including June 1-8). Do you want to load this data and overwrite current browser entries?`,
          confirmText: "Yes, Synchronize",
          cancelText: "No, Cancel",
          accentColor: "blue",
          onConfirm: () => {
            if (parsed.metadata) setMetadata(parsed.metadata);
            if (parsed.activities) setActivities(parsed.activities);
            if (parsed.movements) setMovements(parsed.movements);
            let finalOffices = parsed.officesDb || [];
            if (parsed.interOfficeDb) {
              finalOffices = mergeInterOfficeIntoOffices(finalOffices, parsed.interOfficeDb);
            }
            if (finalOffices.length > 0) setOfficesDb(finalOffices);
            if (parsed.attachedOffice) setAttachedOffice(parsed.attachedOffice);
            
            setSyncPinInput('');
            setConfirmModal({
              title: "Cloud Sync Complete!",
              message: `Fantastic! Successfully synchronized all ${parsed.activities?.length || 0} date entries and settings over to this device.`,
              confirmText: "Great!",
              accentColor: "emerald",
              onConfirm: () => setConfirmModal(null)
            });
          },
          onCancel: () => {
            setConfirmModal(null);
          }
        });
      } else {
        throw new Error("Invalid sync file format from server.");
      }
    } catch (e: any) {
      setConfirmModal({
        title: "Download Rejected",
        message: `Failed to download: ${e?.message || e}. Double-check your PIN and ensure it is correct and not expired.`,
        confirmText: "Retry",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const generateQuickSyncKey = () => {
    try {
      const payload = {
        version: "1.0",
        metadata,
        activities,
        movements,
        officesDb,
        attachedOffice
      };
      const jsonStr = JSON.stringify(payload);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      navigator.clipboard.writeText(base64);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
      setConfirmModal({
        title: "Sync Key Copied",
        message: "Your complete workspace data (June entries, configuration & route matrix) has been successfully copied as a text token! You can now send this token to your mobile phone (by email, WhatsApp or notes) and paste it into the sync section there.",
        confirmText: "Awesome!",
        accentColor: "emerald",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (e: any) {
      setConfirmModal({
        title: "Error Creating Sync Key",
        message: "Failed to compile your workspace data. " + e.message,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
    }
  };

  const importQuickSyncKey = () => {
    if (!syncTextInput.trim()) return;
    try {
      const decodedJson = decodeURIComponent(escape(atob(syncTextInput.trim())));
      const parsed = JSON.parse(decodedJson);
      
      if (!parsed.activities && !parsed.metadata) {
        throw new Error("Invalid sync key payload.");
      }
      
      setConfirmModal({
        title: "Restore from Sync Key",
        message: `This will import the data from your computer. This contains ${parsed.activities?.length || 0} activity entries (including June 1-8 entries) and profiles. Do you want to overwrite your mobile current local state and proceed?`,
        confirmText: "Yes, Restore all Data",
        cancelText: "Cancel",
        accentColor: "blue",
        onConfirm: () => {
          if (parsed.metadata) setMetadata(parsed.metadata);
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.movements) setMovements(parsed.movements);
          let finalOffices = parsed.officesDb || [];
          if (parsed.interOfficeDb) {
            finalOffices = mergeInterOfficeIntoOffices(finalOffices, parsed.interOfficeDb);
          }
          if (finalOffices.length > 0) setOfficesDb(finalOffices);
          if (parsed.attachedOffice) setAttachedOffice(parsed.attachedOffice);
          
          setSyncTextInput('');
          setConfirmModal({
            title: "Data Synced Successfully!",
            message: `Successfully loaded all ${parsed.activities?.length || 0} daily entries, movements and configuration. Your workspace is now 100% updated on this device!`,
            confirmText: "Great!",
            accentColor: "emerald",
            onConfirm: () => setConfirmModal(null)
          });
        },
        onCancel: () => {
          setConfirmModal(null);
        }
      });
    } catch (e: any) {
      setConfirmModal({
        title: "Invalid Sync Key",
        message: "The entered text is not a valid synchronization key. Please make sure you copied the entire key from your computer/other device and try again.",
        confirmText: "Retry",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
    }
  };

  const exportAllDataAsJSON = () => {
    try {
      const payload = {
        version: "1.0",
        metadata,
        activities,
        movements,
        officesDb,
        attachedOffice
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DiaryFlow_SyncBackup_${metadata.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
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
        
        if (!parsed.activities && !parsed.metadata) {
          throw new Error("Invalid sync file format.");
        }
        
        setConfirmModal({
          title: "Restore from Backup File",
          message: `Are you sure you want to restore the backup file containing ${parsed.activities?.length || 0} entries and settings? This will overwrite your existing local data on this browser.`,
          confirmText: "Yes, Restore Backup",
          cancelText: "Cancel",
          accentColor: "blue",
          onConfirm: () => {
            if (parsed.metadata) setMetadata(parsed.metadata);
            if (parsed.activities) setActivities(parsed.activities);
            if (parsed.movements) setMovements(parsed.movements);
            let finalOffices = parsed.officesDb || [];
            if (parsed.interOfficeDb) {
              finalOffices = mergeInterOfficeIntoOffices(finalOffices, parsed.interOfficeDb);
            }
            if (finalOffices.length > 0) setOfficesDb(finalOffices);
            if (parsed.attachedOffice) setAttachedOffice(parsed.attachedOffice);
            
            e.target.value = '';
            setConfirmModal({
              title: "Restore Complete!",
              message: `Successfully restored ${parsed.activities?.length || 0} diary entries, movements and configured matrix.`,
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
          message: "The uploaded file is not a valid DiaryFlow JSON sync backup. Please choose a valid file.",
          confirmText: "Close",
          accentColor: "rose",
          onConfirm: () => setConfirmModal(null)
        });
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  const handleEmailSetupSubmit = (e?: React.FormEvent, isLinkAction?: boolean) => {
    if (e) e.preventDefault();
    if (!emailSetupPendingProfile) return;
    
    const inputEmail = emailSetupInput.trim();
    if (!inputEmail) {
      setEmailSetupError('Email address is required.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inputEmail)) {
      setEmailSetupError('Please enter a valid email address.');
      return;
    }

    const duplicateProfile = isEmailLinkedToOtherProfile(inputEmail, emailSetupPendingProfile, profiles);
    if (duplicateProfile) {
      setEmailSetupError(`This mail ID is already linked to the profile "${duplicateProfile}". Please use a different unique email address.`);
      return;
    }

    // Save email address in profile metadata
    const emailKey = emailSetupPendingProfile === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${emailSetupPendingProfile}_metadata`;
    const savedMetaStr = localStorage.getItem(emailKey);
    let updatedMeta: any = {};
    if (savedMetaStr) {
      try {
        updatedMeta = JSON.parse(savedMetaStr);
      } catch {}
    }
    updatedMeta.scrEmailRecipient = inputEmail;
    localStorage.setItem(emailKey, JSON.stringify(updatedMeta));

    // Update state if it is currently loaded profile
    if (emailSetupPendingProfile === activeProfile) {
      setMetadata(prev => ({
        ...prev,
        scrEmailRecipient: inputEmail
      }));
    }

    const pName = emailSetupPendingProfile;
    setEmailSetupPendingProfile(null);
    setEmailSetupInput('');
    setEmailSetupError('');

    // If "Link" action, complete the profile switch / load!
    if (isLinkAction) {
      executeSwitchProfile(pName);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-inter text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-blue-600 p-2 text-white rounded-xl sm:p-3 sm:rounded-2xl shadow-lg"><FileText size={20} className="sm:w-[24px] sm:h-[24px]" /></div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-none">DiaryFlow Pro</h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Movement Tracker v8.0</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Global Continuous Cloud Web Sync Control */}
            <button
              onClick={() => setLoginModalOpen(true)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold transition-all active:scale-95 text-[11px] sm:text-xs cursor-pointer whitespace-nowrap border ${
                webSyncUser 
                  ? webSyncStatus === 'syncing' || webSyncStatus === 'loading'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : webSyncStatus === 'error'
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100/60 text-blue-600 shadow-sm'
              }`}
              title="Cloud Web Storage: Keeps your database synchronized in real-time between your PC and mobile device automatically"
            >
              <Cloud size={14} className={webSyncStatus === 'syncing' || webSyncStatus === 'loading' ? "animate-bounce" : ""} />
              {webSyncUser ? (
                <span>
                  {webSyncStatus === 'syncing' && 'Syncing...'}
                  {webSyncStatus === 'loading' && 'Restoring...'}
                  {webSyncStatus === 'error' && 'Sync offline ⚠️'}
                  {webSyncStatus === 'synced' && `Cloud: ${webSyncUser.email.length > 14 ? webSyncUser.email.split('@')[0] : webSyncUser.email}`}
                  {webSyncStatus === 'idle' && `Cloud: Connected`}
                </span>
              ) : (
                <span>Cloud Web Storage</span>
              )}
            </button>

            <button 
              onClick={() => {
                setShowClearConfirm(true);
              }} 
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold transition-all active:scale-95 text-[11px] sm:text-sm cursor-pointer whitespace-nowrap"
              title="Clear all saved inputs and start fresh"
              id="clear-data-btn"
            >
              <Trash2 size={13} className="sm:w-[16px] sm:h-[16px]" />
              <span>Clear Data</span>
            </button>
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
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 text-[11px] sm:text-sm cursor-pointer whitespace-nowrap"
            >
              <FileText size={14} className="sm:w-[18px] sm:h-[18px]" /> 
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
                  ? `${historicalMonthMovements.length} rows • ${historicalMonthKM.toFixed(0)} KM (${selectedHistoricalMonth})` 
                  : `${currentFortnightMovements.length} rows • ${currentFortnightKM.toFixed(0)} KM`}
              </span>
            </div>
          </button>

          <button 
            id="tab-btn-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer text-left ${activeTab === 'database' ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-600 hover:bg-slate-200/50'}`}
          >
            <div className={`p-2.5 rounded-xl ${activeTab === 'database' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">6. Office Matrix</span>
              <span className="block text-[10px] opacity-80 truncate font-semibold">
                {officesDb.length} Offices Configured
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
                          👤 {p} {p === "Karikalvalavan R" ? "(System Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>

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
                          const finalProfiles = updated.length === 0 ? ["Karikalvalavan R"] : updated;
                          setProfiles(finalProfiles);
                          localStorage.setItem('diary_profiles_list', JSON.stringify(finalProfiles));
                          
                          // Delete from localStorage and cloud payload all profile keys using helper
                          purgeKeysForProfile(activeProfile);
                          
                          // Switch back to next profile remaining or Karikalvalavan R
                          const nextProfile = finalProfiles[0];
                          switchProfile(nextProfile);
                          setConfirmModal(null);

                          // Sync to Cloud immediately to overwrite
                          setTimeout(() => {
                            syncWorkspaceToWebStorage();
                          }, 200);
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
                  <div>
                    <input 
                      type="email" 
                      id="profile-scr-email-input" 
                      placeholder="SCR Email Recipient (e.g. supervisor@domain.com)" 
                      value={metadata.scrEmailRecipient || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        const dup = isEmailLinkedToOtherProfile(val, activeProfile, profiles);
                        if (dup) {
                          setProfileEmailInputError(`Mail ID already linked to profile "${dup}"`);
                        } else {
                          setProfileEmailInputError('');
                        }
                        setMetadata({...metadata, scrEmailRecipient: val});
                      }} 
                      className={`w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:bg-white border-2 transition-all ${profileEmailInputError ? 'border-rose-400 focus:border-rose-400' : 'border-transparent focus:border-blue-100'}`} 
                    />
                    {profileEmailInputError && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 pl-1">{profileEmailInputError}</p>
                    )}
                  </div>
                  

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
          
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/30 p-8 rounded-[2rem] border border-blue-100/80 shadow-sm mt-6 animate-fade-in" id="sync-container">
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
              <div className="flex-1 space-y-4 flex flex-col justify-between">
                <div className="space-y-4 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      ☁️ LIVE CLOUD SYNC
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-xl font-black uppercase tracking-wider">
                      PC to Mobile Simplified
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Sync & Move Data Between Devices</h3>
                  <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                    Sign in with your email and passcode to establish your permanent Cloud Web Sync space. Logging in with the same credentials on other devices loads all records automatically!
                  </p>
                </div>
                
                <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-2xl text-[11px] text-emerald-800 font-bold leading-relaxed space-y-1 mt-4 text-left">
                  <p className="text-emerald-950 font-extrabold uppercase tracking-wide text-[9px]">⚡ Secure Continuous Sync:</p>
                  <p>Your database, day entries, and transit relationships are synchronized automatically and securely. No manual exports required.</p>
                </div>
              </div>
              
              <div className="w-full lg:w-[480px] shrink-0">
                {/* Continuous Automated Web Storage Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between h-full min-h-[220px]">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/20 text-white px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider">
                        ⭐ RECOMMENDED
                      </span>
                      <span className="text-[10px] text-blue-100 font-extrabold uppercase tracking-wide">
                        Continuous Safe Sync
                      </span>
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-white">
                      <Cloud size={16} /> Persistent Web Storage Space
                    </h4>
                    <p className="text-[11px] text-blue-100 leading-relaxed font-semibold">
                      Save entries and custom post office routes continuously! Log in with your email or username and a passcode on both PC and mobile to keep them perfectly in sync in real-time.
                    </p>
                  </div>

                  <div className="w-full bg-white/10 p-4 rounded-xl border border-white/20 text-left mt-4">
                    {webSyncUser ? (
                      <div className="space-y-3">
                        <div className="space-y-2.5">
                          <div>
                            <span className="block text-[8px] text-blue-200 font-extrabold uppercase tracking-wider">CONNECTED TO:</span>
                            <span className="block text-xs font-black tracking-wide truncate max-w-[280px] text-white">{webSyncUser.email}</span>
                          </div>
                          
                          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 text-left">
                            <span className="block text-[8px] text-blue-200 font-extrabold uppercase tracking-wider">☁️ LAST CLOUD BACKUP TIME:</span>
                            <span className="block text-xs font-black text-emerald-300 tracking-wide mt-0.5">
                              {webSyncUpdatedAt ? new Date(webSyncUpdatedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              }) : 'Never / No backup saved yet'}
                            </span>
                            {activeCloudPayload && (
                              <button
                                type="button"
                                onClick={() => handleRestoreFromHistory({ payload: activeCloudPayload, updatedAt: webSyncUpdatedAt || Date.now() })}
                                className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-white px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider border-0 shadow-sm transition-all cursor-pointer font-sans"
                              >
                                📥 Restore Active Backup
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 justify-start">
                          <button
                            type="button"
                            onClick={() => syncWorkspaceToWebStorage(undefined, getLocalStorageSyncPayload())}
                            disabled={webSyncStatus === 'syncing'}
                            className="bg-white hover:bg-slate-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-0 shadow-sm active:scale-95 transition-all cursor-pointer font-sans"
                          >
                            {webSyncStatus === 'syncing' ? 'Syncing...' : 'Sync Now 🔄'}
                          </button>
                          <button
                            type="button"
                            onClick={handleWebSyncLogout}
                            className="bg-red-500/30 hover:bg-red-500/50 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/10 shadow-sm active:scale-95 transition-all cursor-pointer font-sans"
                          >
                            Logout
                          </button>
                        </div>
                        <span className="block text-[8px] text-emerald-200 font-extrabold uppercase tracking-wider">
                          ✓ Autosave is active
                        </span>

                        {webSyncBackups && webSyncBackups.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/15 space-y-2">
                            <span className="block text-[8px] text-blue-200 font-extrabold uppercase tracking-wider">
                              ☁️ ROLLBACK HISTORY (Last {webSyncBackups.length} saves)
                            </span>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {webSyncBackups.map((backup, bIdx) => {
                                const backupTime = new Date(backup.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const backupDate = new Date(backup.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                                
                                // Parse counts safely
                                let actCount = 0;
                                let movCount = 0;
                                try {
                                  const actRaw = backup.payload?.diary_activities || backup.payload?.['diary_profile_Muthvel R_activities'];
                                  if (actRaw) actCount = JSON.parse(actRaw).length;
                                  const movRaw = backup.payload?.diary_movements || backup.payload?.['diary_profile_Muthvel R_movements'];
                                  if (movRaw) movCount = JSON.parse(movRaw).length;
                                } catch (_) {}
                                  
                                return (
                                  <div key={bIdx} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-2 rounded-lg text-[10px] transition-all">
                                    <div className="text-left">
                                      <span className="block font-black text-white">
                                        {backupDate} @ {backupTime}
                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider uppercase inline-block align-middle ${
                                          (backup.device || "PC").toLowerCase() === "mobile" 
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' 
                                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/20'
                                        }`}>
                                          {backup.device || "PC"}
                                        </span>
                                      </span>
                                      <span className="block text-[8px] text-blue-100/80">
                                        {actCount} entries • {movCount} transits
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreFromHistory(backup)}
                                      className="bg-white/20 hover:bg-white text-white hover:text-blue-700 px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider border-0 shadow-sm transition-all cursor-pointer font-sans"
                                    >
                                      Restore
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col text-left">
                        <span className="block text-[9px] text-blue-200 font-black uppercase tracking-wider">LOCAL STORAGE ONLY</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail('');
                            setLoginPasscode('');
                            setLoginModalOpen(true);
                          }}
                          className="w-full bg-white hover:bg-slate-100 text-blue-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer border-0 text-center font-sans"
                        >
                          🔑 Log In / Register Web Sync
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {activeTab === 'scr' && (
        <ServiceCallReportGenerator
          metadata={metadata}
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
        />
      )}

        {activeTab === 'entry' && (
          <section className="bg-white rounded-[2.5rem] border-2 border-blue-100 shadow-2xl overflow-hidden animate-fade-in" id="entry-tab-content">
            <div className="bg-blue-600 px-10 py-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3"><PlusCircle size={24}/><h2 className="text-lg font-black uppercase tracking-widest">New Work Entry</h2></div>
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
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 lg:col-span-7 flex flex-col justify-between text-left">
                 <div>
                   <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">4. Sequential Visits</label>
                   {(() => {
                     const activeDay = availableDays[selectedDateIdx];
                     if (!activeDay) return null;
                     
                     const activeYear = activeDay.getFullYear();
                     const activeMonth = activeDay.getMonth();
                     if (isMonthCompleted(activeYear, activeMonth, activities)) return null;

                     const dStr = formatDate(activeDay);
                     const matchingList = serviceCalls.filter(sc => sc.date === dStr);
                      const officesSorted = [...matchingList].sort((a, b) => timeToMinutes(a.timeIn) - timeToMinutes(b.timeIn));
                      const officeNamesText = officesSorted.map(m => m.officeAttended).join(' & ');
                      const matching = matchingList[0];
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
                          Click <strong>Save Entry & Next Date</strong> to register your leave state.
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
                                  const updated = visits.map(vx => vx.id === v.id ? {...vx, officeName: e.target.value} : vx);
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
                                        const updated = visits.map(vx => vx.id === v.id ? {...vx, officeName: name} : vx);
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
                                      return { ...vx, startTime: newStart, endTime: newEnd };
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
                                  const updated = visits.map(vx => vx.id === v.id ? {...vx, endTime: e.target.value} : vx);
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

                 <div className="pt-4 border-t border-slate-150 mt-6 shrink-0">
                    <button 
                       id="save-entry-btn"
                       onClick={handleSaveDay}
                       className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-0"
                    >
                      <Save size={16}/> Save Entry & Next Date
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
            <div className="p-8 border-b bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 text-left">Office & Distance Route Database</h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold text-left">
                Configure custom offices, distances (KM) and durations (Mins) relative to <span className="text-blue-600 font-extrabold">{attachedOffice}</span>.
              </p>
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

            {/* Database Quick Setup Actions */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/20">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight text-left">Quick Database Actions</h3>
                  <p className="text-xs text-slate-500 mt-1 text-left">
                    Wipe database records of active profile to start on a clean slate.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setOfficesDb([]);
                      setInterOfficeDb([]);
                    }}
                    className="px-4 py-3 border border-dashed border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Clear Database
                  </button>
                </div>
              </div>
            </div>

            {officesDb.length === 0 && (
              <div className="mx-8 mt-8 p-8 bg-blue-50/30 rounded-3xl border-2 border-dashed border-blue-200/60 flex flex-col items-center text-center">
                <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-600 mb-4 animate-bounce">
                  <Database size={28} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Your Office Matrix is Empty</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
                  You are using a new profile or have cleared the database. Use the forms below to start adding custom offices and route configurations, or import them.
                </p>
              </div>
            )}



            {/* Database Import & Export Integration Panel */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Side: Export & Proforma */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100/85 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">1. Export & Sample Templates</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">Excel & System-Wide Backups</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed mt-3 text-left">
                      Export your active route directory so you don't lose custom additions when wiping data. You can also download the custom CSV/Excel proforma sheet to update large lists offline and import them effortlessly.
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <button
                      onClick={downloadSampleProforma}
                      className="flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Download size={14} />
                      Download Proforma (Excel)
                    </button>
                    <button
                      onClick={exportDatabaseAsCSV}
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Download size={14} />
                      Export CSV
                    </button>
                    <button
                      onClick={exportDatabaseAsJSON}
                      className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Download size={14} />
                      Download JSON Backup
                    </button>
                  </div>
                </div>

                {/* Right Side: Import & Upload */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100/85 shadow-md hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
                        <Upload size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">2. Import & Restore Data</h3>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider text-left">Dynamic CSV / JSON File Loader</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed mt-3 text-left">
                      Select or drop a saved <strong>Office Database CSV/JSON backup</strong> file matching our required columns header format.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {/* File selection block */}
                    {parsedEntries.length === 0 ? (
                      <div>
                        <input
                          type="file"
                          accept=".csv,.json"
                          id="db-file-upload-input"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <label
                          htmlFor="db-file-upload-input"
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-2xl p-5 hover:bg-slate-50/50 transition-all cursor-pointer group text-center"
                        >
                          <Upload className="text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" size={24} />
                          <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider group-hover:text-emerald-600 transition-colors">
                            Select CSV/JSON Database Configuration File
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Excel (Save as CSV file), config.json, or backup.csv
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 animate-fade-in space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                            Loaded: {parsedEntries.length} Offices
                          </span>
                          <button
                            onClick={() => setParsedEntries([])}
                            className="text-xs text-slate-400 hover:text-slate-600 font-bold underline"
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Direct First 3 preview table */}
                        <div className="border border-emerald-100 rounded-xl bg-white/70 overflow-hidden text-[10px] font-semibold text-slate-600">
                          <div className="grid grid-cols-5 p-2 bg-emerald-50 text-[8px] font-black uppercase tracking-widest text-emerald-700 border-b border-emerald-100 text-center">
                            <div className="text-left col-span-2">Route Pair</div>
                            <div>Bus Dist</div>
                            <div>Bike Dist</div>
                            <div>Bus/Bike Mins</div>
                          </div>
                          {parsedEntries.slice(0, 3).map((pe, idx) => (
                            <div key={idx} className="grid grid-cols-5 p-2 border-b border-emerald-50/50 text-center last:border-0">
                              <div className="text-left font-bold truncate col-span-2 text-slate-800">
                                {pe.fromOffice} → {pe.toOffice}
                              </div>
                              <div>{pe.distanceBus} km</div>
                              <div>{pe.distanceBike} km</div>
                              <div>{pe.durationBus}/{pe.durationBike}m</div>
                            </div>
                          ))}
                          {parsedEntries.length > 3 && (
                            <div className="p-1 px-2 text-center text-[9px] text-slate-400 border-t border-emerald-50 font-bold italic">
                              ...and {parsedEntries.length - 3} more records
                            </div>
                          )}
                        </div>

                        {/* Import mode options */}
                        <div className="flex items-center justify-around gap-2 bg-white/50 p-2 rounded-xl border border-emerald-100/50 text-xs">
                          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="accent-emerald-600 text-emerald-600"
                            />
                            <span>Merge & Update</span>
                          </label>
                          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'overwrite'}
                              onChange={() => setImportMode('overwrite')}
                              className="accent-rose-600 text-rose-500"
                            />
                            <span>Overwrite Directory</span>
                          </label>
                        </div>

                        {/* Execute Action */}
                        <button
                          onClick={handleExecuteImport}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest py-3.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          Execute Import ({importMode === 'merge' ? 'Merge Database' : 'Full Overwrite'})
                        </button>
                      </div>
                    )}

                    {/* Toast Alert Responses inside loader widgets */}
                    {importError && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-bold flex items-start justify-between gap-2.5 animate-fade-in text-left">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="shrink-0 text-rose-500 mt-0.5" size={16} />
                          <span>{importError}</span>
                        </div>
                        <button
                          onClick={() => setImportError('')}
                          className="text-rose-400 hover:text-rose-600 transition-colors bg-transparent border-0 cursor-pointer p-0.5"
                          title="Close panel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {importSuccess && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-start justify-between gap-2.5 animate-fade-in text-left">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="shrink-0 text-emerald-500 mt-0.5" size={16} />
                          <span>{importSuccess}</span>
                        </div>
                        <button
                          onClick={() => setImportSuccess('')}
                          className="text-emerald-400 hover:text-emerald-600 transition-colors bg-transparent border-0 cursor-pointer p-0.5"
                          title="Close panel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Form to Add New Office */}
            <div className="p-8 bg-blue-50/30 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Add Dynamic Office Input</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">Configure custom route relationships and intermediate bus stand transit</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Row 1: Direct Office Route Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">From Office</label>
                    <input
                      type="text"
                      list="db-from-office-options"
                      placeholder="e.g. Kurinjipadi SO"
                      value={newOfficeFromOffice}
                      onChange={e => { setNewOfficeFromOffice(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                    <datalist id="db-from-office-options">
                      {uniqueOfficesList.map(name => <option key={name} value={name} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">To Office</label>
                    <input
                      type="text"
                      list="db-to-office-options"
                      placeholder="e.g. Vadalur SO"
                      value={newOfficeToOffice}
                      onChange={e => { setNewOfficeToOffice(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                    <datalist id="db-to-office-options">
                      {uniqueOfficesList.map(name => <option key={name} value={name} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Bus Distance (KM)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 15"
                      value={newOfficeDistBus}
                      onChange={e => { setNewOfficeDistBus(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>Bus Fare (Rs.)</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={newOfficeFareBus}
                      onChange={e => { setNewOfficeFareBus(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-amber-50/20 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Bike Distance (KM)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 15"
                      value={newOfficeDistBike}
                      onChange={e => { setNewOfficeDistBike(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Bus Duration (Mins)</label>
                    <input
                      type="number"
                      placeholder="e.g. 30"
                      value={newOfficeDurBus}
                      onChange={e => { setNewOfficeDurBus(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Bike Duration (Mins)</label>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      value={newOfficeDurBike}
                      onChange={e => { setNewOfficeDurBike(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Row 2: Bus Stand Transit Details (The "Via" parameters) */}
                <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                  <div className="space-y-1 text-left md:col-span-2">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>Via Bus Stand</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      list="db-bus-stands"
                      placeholder="e.g. CUDDALORE BUS STAND"
                      value={newOfficeViaBusStand}
                      onChange={e => { setNewOfficeViaBusStand(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                    <datalist id="db-bus-stands">
                      <option value="CUDDALORE BUS STAND" />
                      <option value="PANRUTI BUS STAND" />
                      <option value="CHIDAMBARAM BUS STAND" />
                      <option value="VADALUR BUS STAND" />
                    </datalist>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>From Office to BS (KM)</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 35"
                      value={newOfficeFromBsKm}
                      onChange={e => { setNewOfficeFromBsKm(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>(From office to BS) Fare</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={newOfficeFromBsFare}
                      onChange={e => { setNewOfficeFromBsFare(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-amber-50/20 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>From Office to BS (Mins)</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 60"
                      value={newOfficeFromBsMins}
                      onChange={e => { setNewOfficeFromBsMins(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>BS to To Office (KM)</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5"
                      value={newOfficeToBsKm}
                      onChange={e => { setNewOfficeToBsKm(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>(BS to To office ) Fare</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={newOfficeToBsFare}
                      onChange={e => { setNewOfficeToBsFare(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-amber-50/20 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>BS to To Office (Mins)</span>
                      <span className="text-[8px] text-slate-400 font-bold lowercase">(opt)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={newOfficeToBsMins}
                      onChange={e => { setNewOfficeToBsMins(e.target.value); setDbError(''); }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!newOfficeFromOffice.trim()) {
                        setDbError('Please enter standard or custom From Office');
                        return;
                      }
                      if (!newOfficeToOffice.trim()) {
                        setDbError('Please enter standard or custom To Office');
                        return;
                      }
                      const normalizedFrom = newOfficeFromOffice.toLowerCase().replace(/\s+/g, '').trim();
                      const normalizedTo = newOfficeToOffice.toLowerCase().replace(/\s+/g, '').trim();
                      if (officesDb.some(o => {
                        const itemFrom = o.fromOffice.toLowerCase().replace(/\s+/g, '').trim();
                        const itemTo = o.toOffice.toLowerCase().replace(/\s+/g, '').trim();
                        return (itemFrom === normalizedFrom && itemTo === normalizedTo) || (itemFrom === normalizedTo && itemTo === normalizedFrom);
                      })) {
                        setDbError('A route relationship between these two offices already exists');
                        return;
                      }

                      const valDistBus = parseFloat(newOfficeDistBus) || 0;
                      const valDistBike = parseFloat(newOfficeDistBike) || 0;
                      const valDurBus = parseInt(newOfficeDurBus) || 0;
                      const valDurBike = parseInt(newOfficeDurBike) || 0;

                      const valViaBusStand = newOfficeViaBusStand.trim();
                      const valFromBsKm = parseFloat(newOfficeFromBsKm);
                      const valFromBsMins = parseInt(newOfficeFromBsMins);
                      const valToBsKm = parseFloat(newOfficeToBsKm);
                      const valToBsMins = parseInt(newOfficeToBsMins);

                      const valFareBus = parseFloat(newOfficeFareBus);
                      const valFromBsFare = parseFloat(newOfficeFromBsFare);
                      const valToBsFare = parseFloat(newOfficeToBsFare);

                      const newEntry: OfficeDatabaseEntry = {
                        fromOffice: newOfficeFromOffice.trim(),
                        toOffice: newOfficeToOffice.trim(),
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

                      setOfficesDb(prev => [...prev, newEntry].sort((a,b) => a.fromOffice.localeCompare(b.fromOffice) || a.toOffice.localeCompare(b.toOffice)));
                      
                      // Reset fields
                      setNewOfficeFromOffice('');
                      setNewOfficeToOffice('');
                      setNewOfficeDistBus('');
                      setNewOfficeDistBike('');
                      setNewOfficeDurBus('');
                      setNewOfficeDurBike('');
                      setNewOfficeViaBusStand('');
                      setNewOfficeFromBsKm('');
                      setNewOfficeFromBsMins('');
                      setNewOfficeToBsKm('');
                      setNewOfficeToBsMins('');
                      setNewOfficeFareBus('');
                      setNewOfficeFromBsFare('');
                      setNewOfficeToBsFare('');
                      setDbError('');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center px-6 py-3.5 transition-all shadow-md active:scale-95 cursor-pointer h-[46px]"
                  >
                    Add Office
                  </button>
                </div>
              </div>

              {dbError && (
                <div className="mt-3 text-xs text-rose-600 font-bold flex items-center justify-between gap-1.5 animate-fade-in text-left bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-rose-500" />
                    <span>{dbError}</span>
                  </div>
                  <button
                    onClick={() => setDbError('')}
                    className="text-rose-400 hover:text-rose-600 transition-colors bg-transparent border-0 cursor-pointer p-0.5"
                    title="Close warning"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* List of offices editable inline */}
            <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[10px] bg-slate-50 border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 text-center">
                    <th className="px-6 py-4 text-left w-[15%]">From Office</th>
                    <th className="px-6 py-4 text-left w-[15%]">To Office</th>
                    <th className="px-2 py-4">Bus Distance (KM)</th>
                    <th className="px-2 py-4 text-amber-600">Bus Fare (Rs.)</th>
                    <th className="px-2 py-4">Bike Distance (KM)</th>
                    <th className="px-2 py-4">Bus Duration (Mins)</th>
                    <th className="px-2 py-4">Bike Duration (Mins)</th>
                    <th className="px-2 py-4">Via Bus Stand</th>
                    <th className="px-2 py-4 text-[9px]">From Office to BS (KM)</th>
                    <th className="px-2 py-4 text-[9px] text-amber-600">(From office to BS) Fare</th>
                    <th className="px-2 py-4 text-[9px]">From Office to BS (Mins)</th>
                    <th className="px-2 py-4 text-[9px]">BS to To Office (KM)</th>
                    <th className="px-2 py-4 text-[9px] text-amber-600">(BS to To office ) Fare</th>
                    <th className="px-2 py-4 text-[9px]">BS to To Office (Mins)</th>
                    <th className="px-2 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {officesDb.map((o, idx) => {
                    const rowKey = `${o.fromOffice}-${o.toOffice}-${idx}`;
                    return (
                      <tr key={rowKey} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-3 font-semibold text-xs text-slate-700 text-left">
                          {o.fromOffice}
                        </td>
                        <td className="px-6 py-3 font-semibold text-xs text-slate-700 text-left">
                          {o.toOffice}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={o.distanceBus}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, distanceBus: parseFloat(e.target.value) || 0} : item))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            placeholder="auto"
                            value={o.fareBus !== undefined ? o.fareBus : ''}
                            onChange={e => {
                               const val = parseFloat(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fareBus: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-16 bg-amber-50/10 border border-amber-200 rounded-lg py-2 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={o.distanceBike}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, distanceBike: parseFloat(e.target.value) || 0} : item))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={o.durationBus}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, durationBus: parseInt(e.target.value) || 0} : item))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={o.durationBike}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, durationBike: parseInt(e.target.value) || 0} : item))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="text"
                            placeholder="None"
                            value={o.viaBusStand || ''}
                            onChange={e => {
                               const val = e.target.value;
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, viaBusStand: val.trim() || undefined} : item));
                            }}
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-center text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={o.fromOfficeToBsKm !== undefined ? o.fromOfficeToBsKm : ''}
                            onChange={e => {
                               const val = parseFloat(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsKm: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            placeholder="auto"
                            value={o.fromOfficeToBsFare !== undefined ? o.fromOfficeToBsFare : ''}
                            onChange={e => {
                               const val = parseFloat(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsFare: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-amber-50/10 border border-amber-200 rounded-lg py-2 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            placeholder="0"
                            value={o.fromOfficeToBsMins !== undefined ? o.fromOfficeToBsMins : ''}
                            onChange={e => {
                               const val = parseInt(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsMins: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={o.toOfficeToBsKm !== undefined ? o.toOfficeToBsKm : ''}
                            onChange={e => {
                               const val = parseFloat(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsKm: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            placeholder="auto"
                            value={o.toOfficeToBsFare !== undefined ? o.toOfficeToBsFare : ''}
                            onChange={e => {
                               const val = parseFloat(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsFare: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-amber-50/10 border border-amber-200 rounded-lg py-2 text-center text-xs font-black text-amber-800 focus:bg-white focus:border-amber-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            placeholder="0"
                            value={o.toOfficeToBsMins !== undefined ? o.toOfficeToBsMins : ''}
                            onChange={e => {
                               const val = parseInt(e.target.value);
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsMins: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => setOfficesDb(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-300 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50 border-0 bg-transparent cursor-pointer"
                            title="Delete office"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {officesDb.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase animate-pulse">
                        No customized offices database records found. Use the editor panel above to append one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Render as Cards instead of sideways scrolling table */}
            <div className="block lg:hidden space-y-4 max-h-[600px] overflow-y-auto p-4 bg-slate-50 border-t border-slate-100">
              {officesDb.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-black uppercase">
                  No customized offices saved yet
                </div>
              ) : (
                officesDb.map((o, idx) => {
                  const cardKey = `card-${o.fromOffice}-${o.toOffice}-${idx}`;
                  return (
                    <div key={cardKey} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm text-left relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          Office Record {idx + 1}
                        </span>
                        <button
                          onClick={() => {
                            setOfficesDb(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 px-2.5 text-xs text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-500 hover:text-white transition-all font-black uppercase tracking-widest"
                        >
                          Delete
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">From Office</span>
                          <span className="font-semibold text-slate-700">{o.fromOffice}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">To Office</span>
                          <span className="font-semibold text-slate-700">{o.toOffice}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bus Dist (KM)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={o.distanceBus}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, distanceBus: parseFloat(e.target.value) || 0} : item))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-amber-600 uppercase mb-1">Bus Fare</label>
                          <input
                            type="number"
                            placeholder="auto"
                            value={o.fareBus !== undefined ? o.fareBus : ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fareBus: isNaN(val) ? undefined : val} : item));
                            }}
                            className="w-full bg-amber-50/10 border border-amber-200 rounded-lg py-2 text-center text-xs font-black text-amber-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bike Dist (KM)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={o.distanceBike}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, distanceBike: parseFloat(e.target.value) || 0} : item))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bus Dur (Mins)</label>
                          <input
                            type="number"
                            value={o.durationBus}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, durationBus: parseInt(e.target.value) || 0} : item))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bike Dur (Mins)</label>
                          <input
                            type="number"
                            value={o.durationBike}
                            onChange={e => setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, durationBike: parseInt(e.target.value) || 0} : item))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-xs font-black text-slate-800 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Via Bus Stand</label>
                          <input
                            type="text"
                            placeholder="None"
                            value={o.viaBusStand || ''}
                            onChange={e => {
                               const val = e.target.value;
                               setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, viaBusStand: val.trim() || undefined} : item));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 focus:bg-white"
                          />
                        </div>

                        {o.viaBusStand && (
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                            <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pb-1">Bus Stand Specifics:</div>
                            
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">From Office to BS (KM)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={o.fromOfficeToBsKm !== undefined ? o.fromOfficeToBsKm : ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsKm: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-amber-600 uppercase">(From office to BS) Fare</label>
                              <input
                                type="number"
                                placeholder="auto"
                                value={o.fromOfficeToBsFare !== undefined ? o.fromOfficeToBsFare : ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsFare: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium text-amber-800"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">From Office to BS (Mins)</label>
                              <input
                                type="number"
                                value={o.fromOfficeToBsMins !== undefined ? o.fromOfficeToBsMins : ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, fromOfficeToBsMins: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">BS to To Office (KM)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={o.toOfficeToBsKm !== undefined ? o.toOfficeToBsKm : ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsKm: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-amber-600 uppercase">(BS to To office ) Fare</label>
                              <input
                                type="number"
                                placeholder="auto"
                                value={o.toOfficeToBsFare !== undefined ? o.toOfficeToBsFare : ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsFare: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium text-amber-800"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[8px] font-bold text-slate-400 uppercase">BS to To Office (Mins)</label>
                              <input
                                type="number"
                                value={o.toOfficeToBsMins !== undefined ? o.toOfficeToBsMins : ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setOfficesDb(prev => prev.map((item, i) => i === idx ? {...item, toOfficeToBsMins: isNaN(val) ? undefined : val} : item));
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md py-1 text-center text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save / Update Button for Custom Offices Database */}
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-start items-center gap-4">
              <button
                onClick={() => {
                  const keyOfficesDb = activeProfile === "Karikalvalavan R" ? "diary_offices_db" : `diary_profile_${activeProfile}_offices_db`;
                  localStorage.setItem(keyOfficesDb, JSON.stringify(officesDb));
                  setImportSuccess('Dynamic Office Database successfully updated & saved!');
                  setTimeout(() => setImportSuccess(''), 4500);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md inline-flex items-center gap-2 uppercase tracking-wide"
              >
                <Save size={14} />
                <span>Update Dynamic Office Database</span>
              </button>
            </div>
          </section>
        )}
      </main>
      <footer className="text-center py-20 opacity-30"><p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">DiaryFlow v8.0 Pro • Intelligent Reporting</p></footer>

      {showClearConfirm && (
        <div id="clear-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="bg-rose-50 p-3 rounded-2xl">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Clear Profile Data?</h3>
                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mt-0.5">Warning: This action is permanent</p>
              </div>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed">
              Are you sure you want to clear saved progress for <strong className="text-slate-800">{activeProfile === "Karikalvalavan R" ? "R. Karikalvalavan" : activeProfile}</strong>? This will completely reset metadata, visited days, and manually added movements back to defaults for this profile.
            </p>
            
            <div className="flex items-center gap-3 mt-2">
              <button
                id="cancel-clear-btn"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm rounded-xl transition-all cursor-pointer text-center"
              >
                No, Keep My Data
              </button>
              <button
                id="confirm-clear-btn"
                onClick={() => {
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

                  // 1. Get current preserved email if any
                  const emailKey = activeProfile === "Karikalvalavan R" ? "diary_metadata" : `diary_profile_${activeProfile}_metadata`;
                  const savedMeta = localStorage.getItem(emailKey);
                  let preservedEmail = '';
                  if (savedMeta) {
                    try {
                      preservedEmail = JSON.parse(savedMeta).scrEmailRecipient || '';
                    } catch {}
                  }

                  // 2. Purge keys using helper (keeps the profile, preserves email)
                  purgeKeysForProfile(activeProfile, true);

                  // 3. Update React states
                  setMetadata({
                    name: dName,
                    designation: dDesig,
                    office: dOffice,
                    submissionDate: todayStr,
                    submissionPlace: dOffice,
                    month: currentMonth,
                    year: currentYear,
                    fortnight: currentFortnight,
                    scrEmailRecipient: preservedEmail
                  });
                  setActivities([]);
                  setMovements([]);
                  setSelectedDateIdx(0);
                  setShowClearConfirm(false);

                  // 4. Force immediate Cloud Web Sync to write empty states, then reload
                  syncWorkspaceToWebStorage().then(() => {
                    window.location.reload();
                  }).catch(() => {
                    // Fallback reload anyway in case of network issue
                    window.location.reload();
                  });
                }}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl transition-all shadow-lg hover:shadow-rose-100 cursor-pointer text-center"
              >
                Yes, Clear All
              </button>
            </div>
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowExportTAModal(false)}
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
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Export TA Calculation</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mt-0.5">TA Calculation Journal Sheet</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Month
                  </label>
                  <select
                    value={exportTAMonth}
                    onChange={(e) => setExportTAMonth(parseInt(e.target.value, 10))}
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
                    value={exportTAYear}
                    onChange={(e) => setExportTAYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white transition-all text-sm"
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
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
              >
                Cancel
              </button>
              <button
                id="generate-ta-calc-btn"
                onClick={() => {
                  handleExportTA(exportTAMonth, exportTAYear);
                  setShowExportTAModal(false);
                }}
                className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center border-0 shadow-lg shadow-violet-100"
              >
                Generate Document
              </button>
            </div>
          </div>
        </div>
      )}

      {loginModalOpen && (
        <div id="web-sync-login-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setLoginModalOpen(false)}>
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6 relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLoginModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 bg-transparent cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Cloud size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Cloud Web Storage Space</h3>
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mt-0.5">Real-time Continuous Sync</p>
              </div>
            </div>

            {webSyncUser ? (
              // Connected Account Overview User Interface
              <div className="space-y-4 text-left">
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Account ID</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg font-black font-mono">{webSyncUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Storage Mode</span>
                    <span className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">🟢 Real-time Autosave Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Sync Connection Status</span>
                    <span className="text-xs text-slate-700 font-bold uppercase tracking-wide">
                      {webSyncStatus === 'synced' && '✓ Synced & Backed Up'}
                      {webSyncStatus === 'syncing' && '🔄 Saving updates to Cloud...'}
                      {webSyncStatus === 'loading' && '🔄 Pulling cloud...'}
                      {webSyncStatus === 'error' && `⚠️ Offline: ${webSyncErrorMessage}`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Excellent! Your diaries, 21 specialized Neyveli/Panruti offices, movements, and travel allowance databases are automatically saved to our server. Opening this web app on your smartphone, home PC, or tablet lets you resume instantly exactly where you left off.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      syncWorkspaceToWebStorage(undefined, getLocalStorageSyncPayload());
                    }}
                    disabled={webSyncStatus === 'syncing'}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 font-black text-xs text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-100 border-0 active:scale-95 disabled:opacity-50"
                  >
                    {webSyncStatus === 'syncing' ? 'Syncing...' : 'Force Backup Now 🔄'}
                  </button>
                  <button
                    onClick={handleWebSyncLogout}
                    className="py-3 px-4 bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 font-black text-xs rounded-xl transition-all cursor-pointer border border-red-100 active:scale-95"
                  >
                    Disconnect Sync
                  </button>
                </div>
              </div>
            ) : (
              // Login or Registration User Interface
              <form onSubmit={handleWebSyncSubmit} className="space-y-4 text-left">
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Enter your email (e.g. <strong className="text-slate-800 font-extrabold">valavan89@gmail.com</strong>) and any passcode to establish your permanent Cloud Web Sync. Logging in with the same email and passcode on your mobile or home PC loads all records instantly!
                </p>

                {webSyncErrorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold leading-relaxed">
                    ⚠️ {webSyncErrorMessage}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Username or Email Address</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. valavan89@gmail.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/60 transition-all rounded-xl text-xs font-bold outline-none border border-slate-200/80 focus:border-blue-300 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Passcode / PIN Password</label>
                    <input
                      required
                      type="password"
                      placeholder="Enter 4+ characters (memorize this)"
                      value={loginPasscode}
                      onChange={e => setLoginPasscode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/60 transition-all rounded-xl text-xs font-bold outline-none border border-slate-200/80 focus:border-blue-300 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl text-[10px] text-blue-800 font-bold leading-normal">
                  💡 <strong>No registration required:</strong> If this email doesn&#39;t exist yet, typing a new passcode will immediately set up a secure cloud workspace partition for you.
                </div>

                <button
                  type="submit"
                  disabled={webSyncStatus === 'loading'}
                  className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-xl shadow-blue-100 border-0 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Cloud size={14} className={webSyncStatus === 'loading' ? 'animate-bounce' : ''} />
                  {webSyncStatus === 'loading' ? 'Authenticating...' : 'Access Cloud Storage & Sync Device'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}



      {/* SCR EMAIL SETUP MODAL */}
      {emailSetupPendingProfile && (
        <div id="profile-email-setup-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => {
                setEmailSetupDismissed(true);
                setEmailSetupPendingProfile(null);
                setEmailSetupInput('');
                setEmailSetupError('');
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center"
              title="Close"
              type="button"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 text-left pr-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Link SCR Email</h3>
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mt-0.5">Profile Identity Registration</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed text-left">
              To send Service Call Reports (SCR) for the profile <strong className="text-slate-800">"{emailSetupPendingProfile}"</strong>, enter a recipient email address. 
              <br />
              <strong className="text-indigo-600">Note: Each profile must have a completely unique email address.</strong> You cannot use a mail ID linked with another profile.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleEmailSetupSubmit(e, true); }} className="space-y-4 text-left">
              {emailSetupError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-600 font-bold">
                  ⚠️ {emailSetupError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Recipient Mail ID for SCR</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. supervisor@domain.com"
                  value={emailSetupInput}
                  onChange={(e) => setEmailSetupInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/60 transition-all rounded-xl text-xs font-bold outline-none border border-slate-200 focus:border-indigo-300 focus:bg-white"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSetupDismissed(true);
                    setEmailSetupPendingProfile(null);
                    setEmailSetupInput('');
                    setEmailSetupError('');
                  }}
                  className="flex-1 py-3 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 text-center active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleEmailSetupSubmit(undefined, false)}
                  className="flex-1 py-3 px-2 bg-slate-700 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 text-center active:scale-95"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleEmailSetupSubmit(undefined, true)}
                  className="flex-1 py-3 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-100 border-0 text-center active:scale-95"
                >
                  Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default App;