import React, { useState, useEffect } from 'react';
import { X, CloudDownload, Trash2, Mail, Share2 } from 'lucide-react';
import { DiaryMetadata, ServiceCallReport, OfficeDatabaseEntry, ActivityEntry } from '../types';
import { isMonthCompleted } from '../utils/dateUtils';
import { 
  generateServiceCallReportDoc, 
  generateMultipleServiceCallReportsDoc,
  getServiceCallReportBlob,
  getMultipleServiceCallReportsBlob
} from '../services/docGenerator';
import { initAuth, googleSignIn, googleSignOut } from '../services/firebaseAuth';
import { getOrCreateFolder, uploadFileToGoogleDrive } from '../services/googleDrive';

const OFFICE_EMAIL_MAP: Record<string, string> = {
  "alapakkam": "alapakkamso@indiapost.gov.in",
  "cnpalayam": "chinnapanaickenpalayamso@indiapost.gov.in",
  "chinnapanaickenpalayam": "chinnapanaickenpalayamso@indiapost.gov.in",
  "cuddaloredov": "cuddaloreho@indiapost.gov.in",
  "cuddaloredo": "cuddaloreho@indiapost.gov.in",
  "cuddaloreho": "cuddaloreho@indiapost.gov.in",
  "cuddaloreotbazaar": "cuddaloreotbazaarso@indiapost.gov.in",
  "cuddaloreot": "cuddaloreoldtownso@indiapost.gov.in",
  "cuddaloreoldtown": "cuddaloreoldtownso@indiapost.gov.in",
  "cuddalorepublicoffices": "cuddalorepublicofficeso.tn@indiapost.gov.in",
  "fortstdavid": "fortstdavidso@indiapost.gov.in",
  "kilkavarapattu": "kilkavarappattuso@indiapost.gov.in",
  "kilkavarappattu": "kilkavarappattuso@indiapost.gov.in",
  "kondur": "kondurso@indiapost.gov.in",
  "kullanchavadi": "kullanchavadiso@indiapost.gov.in",
  "kurinjipadi": "kurinjipadiso@indiapost.gov.in",
  "manjakuppam": "manjakuppamso.tn@indiapost.gov.in",
  "melpattambakkam": "melpattambakkamso@indiapost.gov.in",
  "nellikkuppam": "nellikkuppamso@indiapost.gov.in",
  "nellikkuppambazaar": "nellikkuppambazaarso@indiapost.gov.in",
  "sipcot": "sipcotcuddaloreso@indiapost.gov.in",
  "tirupadiripuliyur": "tirupadiripuliyurso@indiapost.gov.in",
  "tirupathiripuliyur": "tirupadiripuliyurso@indiapost.gov.in",
  "tirupadiripuliyurwest": "tiruppadiripuliyurwestso@indiapost.gov.in",
  "tiruppadiripuliyurwest": "tiruppadiripuliyurwestso@indiapost.gov.in",
  "tiruvendhipuram": "tiruvendhipuramso@indiapost.gov.in",
  "vadalur": "vadalurso@indiapost.gov.in",
  "vandipalayam": "vandipalayamso@indiapost.gov.in",
  "varakkalpattu": "varakalpattuso@indiapost.gov.in",
  "varakalpattu": "varakalpattuso@indiapost.gov.in",
  "anathur": "anathurso@indiapost.gov.in",
  "block1neyveli": "block1neyveliso@indiapost.gov.in",
  "block18neyveli": "block18neyveliso@indiapost.gov.in",
  "block26neyveli": "block26neyveliso@indiapost.gov.in",
  "block29neyveli": "block29neyveliso@indiapost.gov.in",
  "gandhinagar": "gandhinagarcuddaloreso@indiapost.gov.in",
  "kadambuliyur": "kadambuliyurso@indiapost.gov.in",
  "neyveli1": "neyveli1so@indiapost.gov.in",
  "neyveli2": "neyveli2so@indiapost.gov.in",
  "neyveli3": "neyveli3so@indiapost.gov.in",
  "neyvelisecondmine": "neyvelisecondmineso@indiapost.gov.in",
  "neyvelitbs": "neyvelithermalbsso@indiapost.gov.in",
  "neyvelitb": "neyvelithermalbsso@indiapost.gov.in",
  "neyvelithermalbusstand": "neyvelithermalbsso@indiapost.gov.in",
  "neyvelits2": "neyvelillthermalstnso@indiapost.gov.in",
  "neyveliiithermalstation": "neyvelillthermalstnso@indiapost.gov.in",
  "neyvelithermalstation": "neyvelillthermalstnso@indiapost.gov.in",
  "neyvelillthermalstn": "neyvelillthermalstnso@indiapost.gov.in",
  "panrutieast": "panrutieastso@indiapost.gov.in",
  "panruti": "panrutiso@indiapost.gov.in",
  "panrutiwest": "panrutiwestso@indiapost.gov.in",
  "perperiyankuppam": "perperiyankuppamso@indiapost.gov.in",
  "puthupet": "puthupetcdlso@indiapost.gov.in",
  "puthupetcdl": "puthupetcdlso@indiapost.gov.in",
  "tiruthuraiyur": "tiruthuraiyurso@indiapost.gov.in",
  "block10neyveli": "block10neyveliso@indiapost.gov.in",
  "block5neyveli": "block5neyveliso@indiapost.gov.in",
  "annamalainagar": "annamalainagarso@indiapost.gov.in",
  "ayangudi": "ayangudiso@indiapost.gov.in",
  "bmutlur": "bmutlurso@indiapost.gov.in",
  "bhuvanagiri": "bhuvanagiriso@indiapost.gov.in",
  "annamalaiuniversity": "annamalaiuniversityso@indiapost.gov.in",
  "kattumannarkoil": "kattumannarkoilso@indiapost.gov.in",
  "keerapalayam": "keerapalayamso@indiapost.gov.in",
  "killai": "killaiso@indiapost.gov.in",
  "komaratchi": "komaratchiso@indiapost.gov.in",
  "lalpet": "lalpetso@indiapost.gov.in",
  "orathur": "orathurso@indiapost.gov.in",
  "palayamkottai": "palayamkottaicdlso@indiapost.gov.in",
  "palayamkottaicdl": "palayamkottaicdlso@indiapost.gov.in",
  "parangipettai": "parangipettaiso@indiapost.gov.in",
  "pinnalur": "pinnalurso@indiapost.gov.in",
  "reddiyur": "reddiyurso@indiapost.gov.in",
  "sethiathope": "sethiathopeso@indiapost.gov.in",
  "srimushnam": "srimushnamso@indiapost.gov.in",
  "tnedunjeri": "tnedunjeriso@indiapost.gov.in",
  "nedunjeri": "tnedunjeriso@indiapost.gov.in",
  "vallampadugai": "vallampadugaiso@indiapost.gov.in",
  "chidambaramcutcherry": "chidambaramcutcherryso@indiapost.gov.in",
  "chidambaramho": "chidambaramho@indiapost.gov.in",
  "postmasterchidambaram": "chidambaramho@indiapost.gov.in",
  "cmutlur": "cmutlurso.tn@indiapost.gov.in",
  "cdmwest": "chidambaramwestso@indiapost.gov.in",
  "chidambaramwest": "chidambaramwestso@indiapost.gov.in",
  "semmandalam": "semmandalamso@indiapost.gov.in",
  "tiruppadiripuliyurbazaar": "tiruppadiripuliyurbzrso@indiapost.gov.in",
  "tiruppadiripuliyurbzr": "tiruppadiripuliyurbzrso@indiapost.gov.in"
};

const getOfficeEmail = (officeName: string, fallback: string): string => {
  if (!officeName) return fallback;
  const normalized = officeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (OFFICE_EMAIL_MAP[normalized]) {
    return OFFICE_EMAIL_MAP[normalized];
  }

  for (const key of Object.keys(OFFICE_EMAIL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return OFFICE_EMAIL_MAP[key];
    }
  }

  return fallback;
};

const ddmmyyyyToYyyymmdd = (str: string) => {
  if (!str) return '';
  const parts = str.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
};

const yyyymmddToDdmmyyyy = (str: string) => {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
  }
  return str;
};

const hrsToTimeValue = (str: string) => {
  if (!str) return '';
  const matched = str.match(/(\d{2}):(\d{2})/);
  if (matched) {
    return `${matched[1]}:${matched[2]}`;
  }
  return '';
};

const timeValueToHrs = (str: string) => {
  if (!str) return '';
  return `${str} hrs`;
};

const timeToMinutes = (str: string): number => {
  if (!str) return 0;
  const cleaned = str.replace(/hrs/gi, '').trim();
  const matched = cleaned.match(/(\d{2})[:.](\d{2})/);
  if (matched) {
    return parseInt(matched[1], 10) * 60 + parseInt(matched[2], 10);
  }
  const single = cleaned.match(/(\d+)/);
  if (single) {
    return parseInt(single[1], 10) * 60;
  }
  return 0;
};

const minutesToTimeStr = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} hrs`;
};

const getTravelMinutes = (
  fromOff: string,
  toOff: string,
  db: OfficeDatabaseEntry[],
  mode: string = 'Bus'
): number => {
  const normFrom = (fromOff || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const normTo = (toOff || '').toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normFrom || !normTo || normFrom === normTo) return 0;

  const matched = db.find(o => {
    const f = o.fromOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    const t = o.toOffice.toLowerCase().replace(/\s+/g, ' ').trim();
    return (f === normFrom && t === normTo) || (f === normTo && t === normFrom);
  });

  if (matched) {
    const isBike = mode.toLowerCase().trim() === 'bike';
    return isBike ? (matched.durationBike || 20) : (matched.durationBus || 25);
  }

  const isBike = mode.toLowerCase().trim() === 'bike';
  if (normTo === "chidambaram ho") return 45;
  if (normTo === "cuddalore ot bazaar so") return 45;
  if (normTo === "cuddalore ot so") return 40;

  if (isBike) {
    if (normTo === "fort st david so") return 55;
    if (normTo === "cuddalore public offices so") return 50;
    if (normTo === "tiruvendhipuram so") return 50;
    if (normTo === "vandipalayam so") return 50;
    if (normTo === "tirupadiripuliyur so") return 50;
    if (normTo === "tirupadiripuliyur west so") return 50;
  }

  if (normTo === "vadalur so") return 10;
  if (normTo === "panruti bus stand" || normTo === "panruti so") return 55;
  if (normTo === "cn palayam so" || normTo === "cnpalayam so") {
    if (isBike) return 35;
    return 45;
  }

  if (isBike) {
    if (normTo === "cuddalore ho" || normTo === "cuddalore do") return 55;
    if (normTo === "nellikkuppam so" || normTo === "nellikuppam so") return 55;
    if (normTo === "melpattambakkam so") return 50;
    if (normTo === "kilkavarapattu so") return 50;
    if (normTo === "varakkalpattu so") return 55;
    if (normTo === "kondur so") return 55;
    if (normTo === "manjakuppam so") return 55;
    if (normTo === "alapakkam so") return 30;
    if (normTo === "sipcot so") return 40;
  }

  return isBike ? 20 : 25;
};

interface ServiceCallReportGeneratorProps {
  metadata: DiaryMetadata;
  attachedOffice: string;
  activeProfile: string;
  uniqueOfficesList: string[];
  serviceCalls: ServiceCallReport[];
  setServiceCalls: React.Dispatch<React.SetStateAction<ServiceCallReport[]>>;
  setConfirmModal: (modal: any) => void;
  officesDb?: OfficeDatabaseEntry[];
  transportMode?: 'Bus' | 'Bike' | 'Train' | 'Auto';
  activities?: ActivityEntry[];
  showAllMonths?: boolean;
  setShowAllMonths?: (val: boolean) => void;
  selectedHistoricalMonth?: string;
  setSelectedHistoricalMonth?: (val: string) => void;
  historicalMonthsList?: string[];
  formatMMYYYY?: (val: string) => string;
  scrDefaults?: {
    divisionName: string;
    callGivenBy: string;
    timeIn: string;
    timeOut: string;
    replacementOfSpares: string;
    amountOfSpares: string;
    otherIssues: string;
  };
}

export const ServiceCallReportGenerator: React.FC<ServiceCallReportGeneratorProps> = ({
  metadata,
  attachedOffice,
  activeProfile,
  uniqueOfficesList,
  serviceCalls,
  setServiceCalls,
  setConfirmModal,
  officesDb = [],
  transportMode = 'Bus',
  activities = [],
  showAllMonths = false,
  setShowAllMonths,
  selectedHistoricalMonth = '',
  setSelectedHistoricalMonth,
  historicalMonthsList = [],
  formatMMYYYY = (val) => val,
  scrDefaults,
}) => {
  const [editingCall, setEditingCall] = useState<{
    officeAttended: string;
    callGivenBy: string;
    date: string;
    timeIn: string;
    timeOut: string;
    problems: { reported: string; actionTaken: string; followUp: string }[];
    replacementOfSpares: string;
    amountOfSpares: string;
    otherIssues: string;
    divisionName: string;
  }>(() => {
    const today = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`;
    return {
      officeAttended: '',
      callGivenBy: scrDefaults?.callGivenBy || 'SPM',
      date: todayStr,
      timeIn: scrDefaults?.timeIn || '09:00 hrs',
      timeOut: scrDefaults?.timeOut || '17:00 hrs',
      problems: [
        { reported: '', actionTaken: '', followUp: '' }
      ],
      replacementOfSpares: scrDefaults?.replacementOfSpares || 'None',
      amountOfSpares: scrDefaults?.amountOfSpares || 'None',
      otherIssues: scrDefaults?.otherIssues || 'NSP 2',
      divisionName: scrDefaults?.divisionName || 'Cuddalore Division'
    };
  });

  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [draftFilterDate, setDraftFilterDate] = useState<string>(() => {
    const today = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  });
  const [isDateExplicitlySelected, setIsDateExplicitlySelected] = useState(false);
  const [selectedOfficeWise, setSelectedOfficeWise] = useState<string>('');
  const [viewingScDraft, setViewingScDraft] = useState<ServiceCallReport | null>(null);

  // Gmail Sending & OAuth states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const ensureGoogleAuth = async (): Promise<string> => {
    if (googleToken) return googleToken;
    
    setIsGoogleSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        return res.accessToken;
      }
      throw new Error("Could not log in to Google");
    } catch (err: any) {
      console.error("Auth error:", err);
      setConfirmModal({
        title: "Google Authentication Required",
        message: `To send reports directly from your Gmail account, we need permission to connect. Please review and accept the authentication screen.`,
        confirmText: "OK",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      throw err;
    } finally {
      setIsGoogleSigningIn(false);
    }
  };



  const parseSCRDate = (dateStr: string) => {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return { day, month, year };
    }
    return null;
  };

  const getSelectedMonthName = () => {
    const dateObj = draftFilterDate ? new Date(draftFilterDate) : new Date();
    return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleDownloadFirstFortnightly = () => {
    const filterDateObj = draftFilterDate ? new Date(draftFilterDate) : new Date();
    const activeYear = filterDateObj.getFullYear();
    const activeMonth = filterDateObj.getMonth() + 1;

    const items = serviceCalls.filter(sc => {
      const parsed = parseSCRDate(sc.date);
      return parsed && parsed.year === activeYear && parsed.month === activeMonth && parsed.day >= 1 && parsed.day <= 15;
    });

    if (items.length === 0) {
      setConfirmModal({
        title: "No Drafts Found",
        message: `There are no saved drafts for the 1st Fortnightly (1st-15th) of ${getSelectedMonthName()} to download.`,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setConfirmModal({
      title: "Download 1st Fortnightly",
      message: `Do you want to download all ${items.length} report(s) from the 1st Fortnight (1st-15th) of ${getSelectedMonthName()} compiled together into a single Word Document?`,
      confirmText: "Download",
      accentColor: "indigo",
      onConfirm: () => {
        setConfirmModal(null);
        generateMultipleServiceCallReportsDoc(metadata, attachedOffice, items);
      }
    });
  };

  const handleDownloadSecondFortnightly = () => {
    const filterDateObj = draftFilterDate ? new Date(draftFilterDate) : new Date();
    const activeYear = filterDateObj.getFullYear();
    const activeMonth = filterDateObj.getMonth() + 1;

    const items = serviceCalls.filter(sc => {
      const parsed = parseSCRDate(sc.date);
      return parsed && parsed.year === activeYear && parsed.month === activeMonth && parsed.day >= 16;
    });

    if (items.length === 0) {
      setConfirmModal({
        title: "No Drafts Found",
        message: `There are no saved drafts for the 2nd Fortnightly (16th-End) of ${getSelectedMonthName()} to download.`,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setConfirmModal({
      title: "Download 2nd Fortnightly",
      message: `Do you want to download all ${items.length} report(s) from the 2nd Fortnight (16th-End) of ${getSelectedMonthName()} compiled together into a single Word Document?`,
      confirmText: "Download",
      accentColor: "indigo",
      onConfirm: () => {
        setConfirmModal(null);
        generateMultipleServiceCallReportsDoc(metadata, attachedOffice, items);
      }
    });
  };

  const handleDownloadOfficeWise = (office: string) => {
    if (!office) {
      setConfirmModal({
        title: "Selection Required",
        message: "Please select an office for the office-wise download.",
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    const filterDateObj = draftFilterDate ? new Date(draftFilterDate) : new Date();
    const activeYear = filterDateObj.getFullYear();
    const activeMonth = filterDateObj.getMonth() + 1;

    const items = serviceCalls.filter(sc => {
      const parsed = parseSCRDate(sc.date);
      return parsed && parsed.year === activeYear && parsed.month === activeMonth && sc.officeAttended === office;
    });

    if (items.length === 0) {
      setConfirmModal({
        title: "No Drafts Found",
        message: `There are no saved drafts for ${office} in ${getSelectedMonthName()} to download.`,
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setConfirmModal({
      title: `Download SCRs for ${office}`,
      message: `Do you want to download all ${items.length} report(s) for ${office} in ${getSelectedMonthName()} compiled together into a single Word Document?`,
      confirmText: "Download",
      accentColor: "indigo",
      onConfirm: () => {
        setConfirmModal(null);
        generateMultipleServiceCallReportsDoc(metadata, attachedOffice, items);
      }
    });
  };

  const getAutoTimeInForSCR = (officeName: string, currentDate: string, currentId: string) => {
    if (!officeName) return '';
    // Find if there is a previous SCR on the same date
    const sameDayCalls = serviceCalls
      .filter(sc => sc.date === currentDate && sc.id !== currentId)
      .sort((a, b) => {
        return timeToMinutes(a.timeOut) - timeToMinutes(b.timeOut);
      });

    // If this is the 1st SCR for the date, calculate starting from 09:00 + travel time from attached office
    if (sameDayCalls.length === 0) {
      const travelMin = getTravelMinutes(attachedOffice, officeName, officesDb, transportMode);
      const computedTimeMinutes = 9 * 60 + travelMin; // 09:00 is 540 minutes
      return minutesToTimeStr(computedTimeMinutes);
    }

    const lastCall = sameDayCalls[sameDayCalls.length - 1];
    const prevOffice = lastCall.officeAttended;
    const baseTimeMinutes = timeToMinutes(lastCall.timeOut);

    const travelMin = getTravelMinutes(prevOffice, officeName, officesDb, transportMode);
    const computedTimeMinutes = baseTimeMinutes + travelMin;
    return minutesToTimeStr(computedTimeMinutes);
  };

  const handleOfficeChange = (office: string) => {
    const newTimeIn = getAutoTimeInForSCR(office, editingCall.date, selectedSavedId || 'temp');
    if (newTimeIn) {
      const prevDuration = Math.max(10, timeToMinutes(editingCall.timeOut) - timeToMinutes(editingCall.timeIn));
      const newTimeInMin = timeToMinutes(newTimeIn);
      const newTimeOut = minutesToTimeStr(newTimeInMin + prevDuration);
      setEditingCall(prev => ({
        ...prev,
        officeAttended: office,
        timeIn: newTimeIn,
        timeOut: newTimeOut
      }));
    } else {
      setEditingCall(prev => ({
        ...prev,
        officeAttended: office
      }));
    }
  };

  const filteredCalls = React.useMemo(() => {
    const currentMonthStr = String(metadata.month + 1).padStart(2, '0');
    const currentYearStr = String(metadata.year);

    return serviceCalls.filter(sc => {
      if (!sc || !sc.date) return false;
      const parts = sc.date.split('.');
      if (parts.length !== 3) return false;
      const scYear = parseInt(parts[2], 10);
      const scMonth = parseInt(parts[1], 10) - 1; // 0-indexed

      // 1. If showAllMonths is active, we filter by selectedHistoricalMonth
      if (showAllMonths) {
        const scMy = `${parts[1]}.${parts[2]}`;
        if (scMy !== selectedHistoricalMonth) return false;

        if (draftFilterDate) {
          const selectedDateDdmmyyyy = yyyymmddToDdmmyyyy(draftFilterDate);
          return sc.date === selectedDateDdmmyyyy;
        }
        return true;
      }

      // 2. Otherwise, we ONLY allow service calls from the current metadata month & year
      const isCurrentMonth = parts[1] === currentMonthStr && parts[2] === currentYearStr;
      if (!isCurrentMonth) return false;

      // 3. For current month, check if it's a completed month
      const scMonthCompleted = isMonthCompleted(scYear, scMonth, activities);

      if (scMonthCompleted) {
        if (draftFilterDate && isDateExplicitlySelected) {
          const selectedDateDdmmyyyy = yyyymmddToDdmmyyyy(draftFilterDate);
          return sc.date === selectedDateDdmmyyyy;
        }
        return false;
      } else {
        if (draftFilterDate) {
          const selectedDateDdmmyyyy = yyyymmddToDdmmyyyy(draftFilterDate);
          return sc.date === selectedDateDdmmyyyy;
        }
        return true;
      }
    });
  }, [serviceCalls, draftFilterDate, isDateExplicitlySelected, activities, metadata.month, metadata.year, showAllMonths, selectedHistoricalMonth]);

  // Sync / Reset on profile change to prevent mixing draft IDs
  useEffect(() => {
    setSelectedSavedId(null);
    const today = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`;
    const todayYmd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    setDraftFilterDate(todayYmd);
    setIsDateExplicitlySelected(false);
    setEditingCall({
      officeAttended: '',
      callGivenBy: scrDefaults?.callGivenBy || 'SPM',
      date: todayStr,
      timeIn: scrDefaults?.timeIn || '09:00 hrs',
      timeOut: scrDefaults?.timeOut || '17:00 hrs',
      problems: [
        { reported: '', actionTaken: '', followUp: '' }
      ],
      replacementOfSpares: scrDefaults?.replacementOfSpares || 'None',
      amountOfSpares: scrDefaults?.amountOfSpares || 'None',
      otherIssues: scrDefaults?.otherIssues || 'NSP 2',
      divisionName: scrDefaults?.divisionName || 'Cuddalore Division'
    });
  }, [activeProfile, scrDefaults]);

  const handleSaveServiceCall = () => {
    if (!editingCall.officeAttended.trim()) {
      setConfirmModal({
        title: "Validation Error",
        message: "Please enter or select the office attended.",
        confirmText: "Cancel",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    const finalOtherIssues = !editingCall.otherIssues || !editingCall.otherIssues.trim() ? 'NIL' : editingCall.otherIssues.trim();
    const id = selectedSavedId || `sc_${Date.now()}`;
    const newCall: ServiceCallReport = {
      id,
      ...editingCall,
      otherIssues: finalOtherIssues
    };
    let updated: ServiceCallReport[];
    if (selectedSavedId) {
      updated = serviceCalls.map(c => c.id === selectedSavedId ? newCall : c);
    } else {
      updated = [newCall, ...serviceCalls];
    }
    setServiceCalls(updated);
    
    const wasEditing = !!selectedSavedId;
    const savedDateYyyymmdd = ddmmyyyyToYyyymmdd(newCall.date);
    handleClearServiceCall();
    setDraftFilterDate(savedDateYyyymmdd);
    
    setConfirmModal({
      title: "Report Saved",
      message: wasEditing ? "Service call report updated successfully!" : "New service call report created and saved to active profile!",
      confirmText: "Close",
      accentColor: "indigo",
      onConfirm: () => setConfirmModal(null)
    });
  };

  const handleDeleteServiceCall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      title: "Delete Service Call Report",
      message: "Are you sure you want to permanently delete this service call report draft?",
      confirmText: "Delete",
      accentColor: "rose",
      onConfirm: () => {
        const updated = serviceCalls.filter(c => c.id !== id);
        setServiceCalls(updated);
        if (selectedSavedId === id) {
          setSelectedSavedId(null);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleClearServiceCall = () => {
    const today = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`;
    const todayYmd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    setEditingCall({
      officeAttended: '',
      callGivenBy: scrDefaults?.callGivenBy || 'SPM',
      date: todayStr,
      timeIn: scrDefaults?.timeIn || '09:00 hrs',
      timeOut: scrDefaults?.timeOut || '17:00 hrs',
      problems: [
        { reported: '', actionTaken: '', followUp: '' }
      ],
      replacementOfSpares: scrDefaults?.replacementOfSpares || 'None',
      amountOfSpares: scrDefaults?.amountOfSpares || 'None',
      otherIssues: scrDefaults?.otherIssues || 'NSP 2',
      divisionName: scrDefaults?.divisionName || 'Cuddalore Division'
    });
    setSelectedSavedId(null);
    setDraftFilterDate(todayYmd);
  };

  const handleDownloadServiceCall = (call?: ServiceCallReport) => {
    const rawReportData = call || { id: 'temp', ...editingCall };
    const reportData = {
      ...rawReportData,
      otherIssues: !rawReportData.otherIssues || !rawReportData.otherIssues.trim() ? 'NIL' : rawReportData.otherIssues.trim()
    };
    if (!reportData.officeAttended.trim()) {
      setConfirmModal({
        title: "Validation Error",
        message: "Please specify the office attended before generating the Word document.",
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }
    generateServiceCallReportDoc(metadata, attachedOffice, reportData);
  };

  const handleSaveToGoogleDriveServiceCall = async (call?: ServiceCallReport) => {
    const rawReportData = call || { id: 'temp', ...editingCall };
    const reportData = {
      ...rawReportData,
      otherIssues: !rawReportData.otherIssues || !rawReportData.otherIssues.trim() ? 'NIL' : rawReportData.otherIssues.trim()
    };
    if (!reportData.officeAttended.trim()) {
      setConfirmModal({
        title: "Validation Error",
        message: "Please specify the office attended before generating the report.",
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setIsSavingToDrive(true);
    try {
      // 1. Ensure Google Authenticated
      const token = await ensureGoogleAuth();
      if (!token) {
        setIsSavingToDrive(false);
        return;
      }

      // 2. Generate the report blob
      const { blob, fileName } = await getServiceCallReportBlob(metadata, attachedOffice, reportData);

      // 3. Find or create the DiaryFlow folder in Google Drive
      const folderId = await getOrCreateFolder(token, "DiaryFlow");

      // 4. Upload file to Google Drive
      await uploadFileToGoogleDrive(token, fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob, folderId);

      setConfirmModal({
        title: "Saved to Google Drive!",
        message: `"${fileName}" has been successfully saved to your Google Drive in the "DiaryFlow" folder!`,
        confirmText: "Awesome!",
        accentColor: "emerald",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (error: any) {
      console.error("Error saving to Google Drive:", error);
      alert(`Error saving to Google Drive: ${error.message || error}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleSaveMultipleToGoogleDrive = async (items: ServiceCallReport[], titleLabel: string) => {
    if (items.length === 0) return;

    setIsSavingToDrive(true);
    try {
      // 1. Ensure Google Authenticated
      const token = await ensureGoogleAuth();
      if (!token) {
        setIsSavingToDrive(false);
        return;
      }

      // 2. Generate the merged report blob
      const result = await getMultipleServiceCallReportsBlob(metadata, attachedOffice, items);
      if (!result) {
        setIsSavingToDrive(false);
        return;
      }

      const { blob, fileName } = result;

      // 3. Find or create the DiaryFlow folder in Google Drive
      const folderId = await getOrCreateFolder(token, "DiaryFlow");

      // 4. Upload file to Google Drive
      await uploadFileToGoogleDrive(token, fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob, folderId);

      setConfirmModal({
        title: "Saved to Google Drive!",
        message: `"${fileName}" has been successfully saved to your Google Drive in the "DiaryFlow" folder!`,
        confirmText: "Awesome!",
        accentColor: "emerald",
        onConfirm: () => setConfirmModal(null)
      });
    } catch (error: any) {
      console.error("Error saving multiple to Google Drive:", error);
      alert(`Error saving multiple to Google Drive: ${error.message || error}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleDownloadAllSCR = () => {
    if (serviceCalls.length === 0) {
      handleDownloadServiceCall();
      return;
    }

    const itemsToDownload = draftFilterDate
      ? serviceCalls.filter(sc => sc.date === yyyymmddToDdmmyyyy(draftFilterDate))
      : serviceCalls;

    if (itemsToDownload.length === 0) {
      setConfirmModal({
        title: "No Matching Drafts",
        message: "There are no saved drafts matching the selected filter date to download.",
        confirmText: "Close",
        accentColor: "rose",
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    setConfirmModal({
      title: "Download Merged SCRs",
      message: `Do you want to download all ${itemsToDownload.length} report(s) compiled together into a single Word Document?`,
      confirmText: "Download",
      accentColor: "indigo",
      onConfirm: () => {
        setConfirmModal(null);
        generateMultipleServiceCallReportsDoc(metadata, attachedOffice, itemsToDownload);
      }
    });
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-fade-in space-y-6 mt-8" id="service-call-section">
      <div className="text-left space-y-1 border-b border-slate-100 pb-4">
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[10px] uppercase tracking-wider border border-indigo-100">
          📂 Word Generator
        </span>
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">
          Service Call Report Creator
        </h3>
        <p className="text-xs text-slate-500 font-semibold max-w-xl">
          Name and quarters are fetched from the active profile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs (Left) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* 1. Date */}
            <div>
              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Date</label>
              <input
                id="service-call-date"
                type="date"
                value={ddmmyyyyToYyyymmdd(editingCall.date)}
                onChange={(e) => {
                  const formatted = yyyymmddToDdmmyyyy(e.target.value);
                  setEditingCall(prev => ({ ...prev, date: formatted }));
                  setDraftFilterDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
              />
            </div>

            {/* 2. Office Attended */}
            <div>
              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Office Attended</label>
              <select
                id="service-call-office-select"
                value={uniqueOfficesList.includes(editingCall.officeAttended) ? editingCall.officeAttended : "custom"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== "custom") {
                    handleOfficeChange(val);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              >
                <option value="">-- Select Office --</option>
                {uniqueOfficesList.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="custom">-- Custom Office (Type Below) --</option>
              </select>
              <input
                id="service-call-custom-office"
                type="text"
                placeholder="Or type custom office name..."
                value={editingCall.officeAttended}
                onChange={(e) => handleOfficeChange(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* 3. Timing (Time In and Time Out) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Time In</label>
                <input
                  id="service-call-time-in"
                  type="time"
                  value={hrsToTimeValue(editingCall.timeIn)}
                  onChange={(e) => {
                    const formatted = timeValueToHrs(e.target.value);
                    setEditingCall(prev => ({ ...prev, timeIn: formatted }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Time Out</label>
                <input
                  id="service-call-time-out"
                  type="time"
                  value={hrsToTimeValue(editingCall.timeOut)}
                  onChange={(e) => {
                    const formatted = timeValueToHrs(e.target.value);
                    setEditingCall(prev => ({ ...prev, timeOut: formatted }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Call Given By */}
            <div>
              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Call Given By</label>
              <input
                id="service-call-given-by"
                type="text"
                placeholder="e.g. SPM, PM, APM..."
                value={editingCall.callGivenBy}
                onChange={(e) => setEditingCall(prev => ({ ...prev, callGivenBy: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Troubles Table */}
          <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Troubleshooting Rows</h4>
            </div>

            <div className="space-y-4">
              {editingCall.problems.map((p, pIdx) => (
                <div key={pIdx} className="p-4 bg-white border border-slate-100 shadow-sm rounded-xl space-y-3 relative text-left">
                  <button
                    type="button"
                    onClick={() => setEditingCall(prev => ({
                      ...prev,
                      problems: prev.problems.filter((_, idx) => idx !== pIdx)
                    }))}
                    disabled={editingCall.problems.length <= 1}
                    className="absolute top-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg outline-none disabled:opacity-40 transition-all"
                    title="Delete row"
                  >
                    <X size={14} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mb-1.5">Details of Problem Reported</label>
                      <textarea
                        placeholder="e.g. Passbook printer issue."
                        value={p.reported}
                        rows={2}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingCall(prev => {
                            const updated = [...prev.problems];
                            updated[pIdx].reported = val;
                            return { ...prev, problems: updated };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mb-1.5">Action Taken by System Manager</label>
                      <textarea
                        placeholder="e.g. Issue not resolved."
                        value={p.actionTaken}
                        rows={2}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingCall(prev => {
                            const updated = [...prev.problems];
                            updated[pIdx].actionTaken = val;
                            return { ...prev, problems: updated };
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2 border-t border-slate-100/60">
                <button
                  type="button"
                  onClick={() => setEditingCall(prev => ({
                    ...prev,
                    problems: [...prev.problems, { reported: '', actionTaken: '', followUp: '' }]
                  }))}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider border border-indigo-100 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  ➕ Add Row
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-left">
            <div>
              <label className="inline-block bg-slate-100/80 border border-slate-200/50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-1.5">Pending issues</label>
              <input
                id="service-call-other-issues"
                type="text"
                placeholder="All computer peripherals are working fine except: NSP 2"
                value={editingCall.otherIssues}
                onChange={(e) => setEditingCall(prev => ({ ...prev, otherIssues: e.target.value }))}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setEditingCall(prev => ({ ...prev, otherIssues: 'NIL' }));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Actions footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              id="clear-service-call-btn"
              type="button"
              onClick={handleClearServiceCall}
              className="bg-slate-100 hover:bg-slate-200/80 text-slate-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              🧹 Clear Form
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="save-service-call-btn"
                type="button"
                onClick={handleSaveServiceCall}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
              >
                💾 Save Draft
              </button>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 pl-3 pr-2.5 h-10 rounded-xl shrink-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Office:</span>
                <select
                  value={selectedOfficeWise}
                  onChange={(e) => setSelectedOfficeWise(e.target.value)}
                  className="bg-transparent border-0 text-[10px] font-black text-slate-700 outline-none pr-1 cursor-pointer max-w-[130px] h-full"
                >
                  <option value="">Select Office</option>
                  {(() => {
                    const filterDateObj = draftFilterDate ? new Date(draftFilterDate) : new Date();
                    const activeYear = filterDateObj.getFullYear();
                    const activeMonth = filterDateObj.getMonth() + 1;
                    const monthCalls = serviceCalls.filter(sc => {
                      const parsed = parseSCRDate(sc.date);
                      return parsed && parsed.year === activeYear && parsed.month === activeMonth;
                    });
                    const uniqueOfficesForMonth = Array.from(new Set(monthCalls.map(sc => sc.officeAttended).filter(Boolean))).sort();
                    return uniqueOfficesForMonth.map((off) => (
                      <option key={off} value={off}>
                        {off}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadOfficeWise(selectedOfficeWise)}
                disabled={!selectedOfficeWise}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1 ${
                  selectedOfficeWise
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>⬇️ Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drafts History List (Right) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <span>📝 Saved Drafts ({filteredCalls.length})</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                History of report drafts saved in this profile.
              </p>
            </div>

            {/* Date Picker Filter */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-left space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Filter Drafts by Date</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={draftFilterDate}
                  onChange={(e) => {
                    setDraftFilterDate(e.target.value);
                    setIsDateExplicitlySelected(true);
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                />
                {draftFilterDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFilterDate('');
                      setIsDateExplicitlySelected(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {setShowAllMonths && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAllMonths(!showAllMonths)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer border ${
                      showAllMonths
                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📂 {showAllMonths ? 'Show Current Month Only' : 'Get Previous Month Details'}</span>
                  </button>
                  {showAllMonths && setSelectedHistoricalMonth && (
                    <select
                      value={selectedHistoricalMonth}
                      onChange={(e) => setSelectedHistoricalMonth(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {historicalMonthsList.map(mY => (
                        <option key={mY} value={mY}>
                          {formatMMYYYY(mY)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredCalls.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-bold">No drafts found</p>
                  <p className="text-[10px] text-slate-400">
                    {draftFilterDate 
                      ? `No saved drafts for this selected date (${yyyymmddToDdmmyyyy(draftFilterDate)}).`
                      : "No active drafts found for uncompleted months."}
                  </p>
                </div>
              ) : (
                filteredCalls.map(sc => (
                  <div
                    key={sc.id}
                    className={`p-4 rounded-xl border transition-all text-left relative group flex flex-col justify-between ${selectedSavedId === sc.id ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}
                  >
                    <div className="pr-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          {sc.date}
                        </span>
                        {selectedSavedId === sc.id && (
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 animate-pulse">
                            Active Editing
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-700 block mt-1 truncate uppercase">
                        {sc.officeAttended}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">
                        Call by: {sc.callGivenBy} ({sc.problems.length} problems)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100/60 justify-between">
                      {/* Left Side: Edit button (Toggles On / Off) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSavedId === sc.id) {
                            handleClearServiceCall();
                          } else {
                            setSelectedSavedId(sc.id);
                            setEditingCall({
                              officeAttended: sc.officeAttended,
                              callGivenBy: sc.callGivenBy,
                              date: sc.date,
                              timeIn: sc.timeIn,
                              timeOut: sc.timeOut,
                              problems: sc.problems,
                              replacementOfSpares: sc.replacementOfSpares || scrDefaults?.replacementOfSpares || 'None',
                              amountOfSpares: sc.amountOfSpares || scrDefaults?.amountOfSpares || 'None',
                              otherIssues: sc.otherIssues || scrDefaults?.otherIssues || 'NSP 2',
                              divisionName: sc.divisionName || scrDefaults?.divisionName || 'Cuddalore Division'
                            });
                          }
                        }}
                        className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm ${selectedSavedId === sc.id ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-200/50'}`}
                        title={selectedSavedId === sc.id ? "Stop Editing (Turn Off)" : "Edit Draft"}
                      >
                        {selectedSavedId === sc.id ? '🛑 Stop Edit' : '✏️ Edit'}
                      </button>

                      {/* Right Side: Larger Download and Delete buttons */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingScDraft(sc);
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                          title="View Draft Details"
                        >
                          👁️ View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadServiceCall(sc);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md border-0"
                          title="Download Word Document"
                        >
                          <CloudDownload size={13} className="stroke-[3]" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteServiceCall(sc.id, e)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Draft Viewer Modal */}
      {viewingScDraft && (
        <div id="draft-viewer-modal" className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setViewingScDraft(null)}>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">👁️</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Service Call Report Draft</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Draft Information Viewer</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingScDraft(null)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all border-0 bg-transparent cursor-pointer"
                title="Close Viewer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-left">
              {/* General Meta Section */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Date of Call</span>
                  <p className="text-xs font-black text-slate-800 mt-1">{viewingScDraft.date}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Office Attended</span>
                  <p className="text-xs font-black text-indigo-700 mt-1 uppercase">{viewingScDraft.officeAttended}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Call Given By</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">{viewingScDraft.callGivenBy}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Hours Visited</span>
                  <p className="text-xs font-mono font-bold text-slate-600 mt-1">{viewingScDraft.timeIn} - {viewingScDraft.timeOut}</p>
                </div>
              </div>

              {/* Problems & Actions Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reported Problems & Action Taken</h4>
                <div className="space-y-3.5">
                  {viewingScDraft.problems.map((prob, idx) => (
                    <div key={idx} className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/40 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-black">
                          Problem #{idx + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Reported Issue</span>
                          <span className="font-extrabold text-slate-700 block mt-0.5 leading-relaxed">{prob.reported || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Action Taken</span>
                          <span className="font-extrabold text-slate-700 block mt-0.5 leading-relaxed">{prob.actionTaken || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Follow Up</span>
                          <span className="font-extrabold text-slate-500 block mt-0.5 leading-relaxed">{prob.followUp || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spares & Other Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Replacement of Spares</span>
                  <p className="text-xs font-extrabold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{viewingScDraft.replacementOfSpares || 'None'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cost/Amount of Spares</span>
                  <p className="text-xs font-extrabold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{viewingScDraft.amountOfSpares || 'None'}</p>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Other Issues / Notes</span>
                <p className="text-xs font-extrabold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">{viewingScDraft.otherIssues || 'NSP 2'}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-end rounded-b-[2rem]">
              <button
                onClick={() => setViewingScDraft(null)}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 active:scale-95"
              >
                Close Draft Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
