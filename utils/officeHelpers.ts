import { OfficeDatabaseEntry, DiaryMetadata, ActivityEntry, MovementEntry, OfficeVisit, ServiceCallReport } from '../types';
import { normalizeDateStr } from './dateUtils';

export const PROFILE_1_OFFICES = [
  "Alapakkam SO", "CN Palayam SO", "Cuddalore DO", "Cuddalore HO", 
  "Cuddalore OT Bazaar SO", "Cuddalore OT SO", "Cuddalore Public Offices SO", 
  "Fort St David SO", "Kilkavarapattu SO", "Kondur SO", "Kullanchavadi SO", 
  "Kurinjipadi SO", "Manjakuppam SO", "Melpattambakkam SO", "Nellikkuppam SO", 
  "Sipcot SO", "Tirupadiripuliyur SO", "Tirupadiripuliyur West SO", "Tiruvendhipuram SO", 
  "Vadalur SO", "Vandipalayam SO", "Varakkalpattu SO"
];

export const PROFILE_2_OFFICES = [
  "Anathur S.O", "Block 1 Neyveli S.O", "Block 18 Neyveli S.O", "Block 26 Neyveli S.O", 
  "Block 29 Neyveli S.O", "Gandhinagar S.O", "Kadambuliyur S.O", "Neyveli 1 S.O", 
  "Neyveli 2 S.O", "Neyveli Second MineS.O", "Neyveli TBS S.O", "Neyveli TS 2 S.O", 
  "Panruti East S.O", "Panruti S.O", "Panruti West S.O", "Perperiyankuppam S.O", 
  "Puthupet (CDL) S.O", "Tiruthuraiyur S.O", "Block 10,neyveli S.O", "Block 5, Neyveli S.O", 
  "Neyveli 3 S.O"
];

export const PROFILE_3_OFFICES = [
  "Annamalainagar SO", "Ayangudi SO", "B.Mutlur SO", "Bhuvanagiri SO", "Annamalai University SO", 
  "Kattumannarkoil SO", "Keerapalayam SO", "Killai SO", "Komaratchi SO", "Lalpet SO", "Orathur SO", 
  "Palayamkottai(CDL) SO", "Parangipettai SO", "Pinnalur SO", "Reddiyur SO", "Sethiathope SO", 
  "Srimushnam SO", "T.Nedunjeri SO", "Vallampadugai SO", "Chidambaram HO", "Chidambaram Cutcherry SO", "C. Mutlur SO",
  "Shemford School", "CDM West S.O"
];

export const getProfileBaseOffices = (profileName: string): string[] => {
  return [];
};

export const getProfileAttachedOffice = (profileName: string): string => {
  const norm = profileName === "Default Profile" ? "Karikalvalavan R" : profileName;
  if (norm === "Karikalvalavan R") return "Kurinjipadi SO";
  if (norm === "Muthvel R") return "Neyveli 3 S.O";
  if (norm === "Sivaraj S") return "Annamalainagar SO";
  return "";
};

export const isSystemDefaultProfile = (profileName: string): boolean => {
  return profileName === "Default Profile" || profileName === "Karikalvalavan R" || !profileName;
};

export const getProfileStorageKey = (profileName: string, suffixKey: string): string => {
  if (isSystemDefaultProfile(profileName)) {
    return `diary_${suffixKey}`;
  }
  return `diary_profile_${profileName}_${suffixKey}`;
};

export const CORRECTIONS: Record<string, string> = {
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

export const HUB_DURATIONS: Record<string, number> = { "CUDDALORE BUS STAND": 60, "CUDDALORE OT BUS STAND": 50, "PANRUTI BUS STAND": 40 };

export const SPOKE_DURATIONS: Record<string, number> = {
  "Cuddalore HO": 10, "Tiruvendhipuram SO": 20, "Vandipalayam SO": 20, "Manjakuppam SO": 10,
  "Cuddalore DO": 10, "Kondur SO": 15, "Varakkalpattu SO": 15, "Nellikkuppam SO": 30,
  "Melpattambakkam SO": 30, "Tirupadiripuliyur SO": 10, "Tirupadiripuliyur West SO": 15,
  "Sipcot SO": 15, "Kilkavarapattu SO": 20, "Nellikkuppam Bazzar SO": 30, "Kurinjipadi SO": 60,
  "Kullanchavadi SO": 60, "Alapakkam SO": 60
};

export const HUB_MAPPING: Record<string, { bsName: string, hubKm: number, spokeKm: number }> = {
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

export const SPOKE_TO_HUB_BUS: Record<string, number> = {
  "Kurinjipadi SO": 35, "Kullanchavadi SO": 35, "Alapakkam SO": 35, "Cuddalore HO": 2, "Cuddalore DO": 2.5,
  "Tiruvendhipuram SO": 7, "Vandipalayam SO": 3.5, "Manjakuppam SO": 4, "Kondur SO": 7, "Varakkalpattu SO": 9,
  "Nellikkuppam SO": 13, "Melpattambakkam SO": 10, "Kilkavarapattu SO": 6, "CN Palayam SO": 21,
  "Sipcot SO": 4, "Cuddalore OT SO": 5, "Cuddalore OT Bazaar SO": 5, "Tirupadiripuliyur SO": 3,
  "Tirupadiripuliyur West SO": 3.5, "Fort St David SO": 4, "Cuddalore Public Offices SO": 2
};

export const DIRECT_DISTANCES: Record<string, number> = {
  "Vadalur SO": 5, "Kullanchavadi SO": 15, "Alapakkam SO": 22, "CN Palayam SO": 20, 
  "Cuddalore OT SO": 25, "Cuddalore OT Bazaar SO": 25
};

export const DIRECT_DURATIONS: Record<string, number> = {
  "Vadalur SO": 20, "Kullanchavadi SO": 20, "Alapakkam SO": 35, "CN Palayam SO": 40, 
  "Cuddalore OT SO": 40, "Cuddalore OT Bazaar SO": 40
};

export const getDefaultOfficeSpecs = (fromOffice: string, toOffice: string) => {
  const f = fromOffice.toLowerCase().replace(/\./g, "").trim();
  const t = toOffice.toLowerCase().replace(/\./g, "").trim();

  if (f === t) {
    return { distanceBus: 0, distanceBike: 0, durationBus: 0, durationBike: 0 };
  }

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
