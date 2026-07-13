
export interface OfficeVisit {
  id: string;
  officeName: string;
  startTime: string;
  endTime: string;
  issues: string;
  resolution: 'Resolved' | 'Not Resolved' | '';
  isManualTime?: boolean;
}

export interface ActivityEntry {
  id: string;
  date: string;
  dayName: string;
  details: string;
  transportMode: 'Bike' | 'Bus' | 'Train' | 'Auto';
  visits: OfficeVisit[];
  leaveType?: 'CL' | 'EL';
  workedOnHoliday?: boolean;
}

export interface MovementEntry {
  id: string;
  date: string;
  fromTime: string;
  fromLocation: string;
  toDate: string;
  toTime: string;
  toLocation: string;
  mode: string;
  km: string;
  isManual?: boolean;
  fare?: string;
}

export interface DiaryMetadata {
  name: string;
  designation: string;
  office: string;
  submissionDate: string;
  submissionPlace: string;
  month: number; // 0-11
  year: number;
  fortnight: 'first' | 'second'; // 1-15 or 16-end
}

export interface OfficeDatabaseEntry {
  fromOffice: string;
  toOffice: string;
  distanceBus: number;
  distanceBike: number;
  durationBus: number;
  durationBike: number;
  viaBusStand?: string;
  fromOfficeToBsKm?: number;
  fromOfficeToBsMins?: number;
  toOfficeToBsKm?: number;
  toOfficeToBsMins?: number;
  fareBus?: number;
  fromOfficeToBsFare?: number;
  toOfficeToBsFare?: number;
  transportModeOverriding?: string;
}

export interface InterOfficeRouteEntry {
  id: string;
  fromOffice: string;
  toOffice: string;
  distanceBus: number;
  distanceBike: number;
  durationBus: number;
  durationBike: number;
  transportModeOverriding?: string;
  viaBusStand?: string;
  fromOfficeToBsKm?: number;
  fromOfficeToBsMins?: number;
  toOfficeToBsKm?: number;
  toOfficeToBsMins?: number;
  fareBus?: number;
  fromOfficeToBsFare?: number;
  toOfficeToBsFare?: number;
}

export interface ServiceCallProblem {
  reported: string;
  actionTaken: string;
  followUp: string;
}

export interface ServiceCallReport {
  id: string;
  officeAttended: string;
  callGivenBy: string;
  date: string;
  timeIn: string;
  timeOut: string;
  problems: ServiceCallProblem[];
  replacementOfSpares?: string;
  amountOfSpares?: string;
  otherIssues?: string;
  divisionName?: string;
}


