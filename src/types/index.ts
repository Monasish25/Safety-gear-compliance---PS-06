export type PPEState = "WORN" | "MISSING" | "NOT_VISIBLE";

export type PPEItem = "helmet" | "vest" | "shoes" | "gloves" | "goggles";

export type AttendanceStatus = 
  | "present" 
  | "late" 
  | "absent" 
  | "access_denied" 
  | "not_scanned"
  | "checked_in"
  | "checked_out";

export type BadgeType = "QR" | "TEXT";

export type ShiftName = "Morning" | "Afternoon" | "Night";

export type Role = "HEAD" | "SUPERVISOR" | "VIEWER";

export interface User {
  id: number | string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
}

export interface Zone {
  id: number;
  name: string;
  requiredPpe: Record<PPEItem, boolean>;
  capacityPerShift: number;
  isActive: boolean;
}

export interface Shift {
  id: number;
  name: ShiftName;
  entryTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
  gracePeriodMinutes: number; // 10
  checkInWindowMinutes: number; // 60
}

export interface Worker {
  workerId: string; // e.g. W-1001
  name: string;
  department: string;
  shift: ShiftName;
  shiftId?: number;
  defaultZoneId?: number;
  defaultZoneName?: string;
  position: string;
  badgeType: BadgeType;
  joiningDate: string;
  active: boolean;
  photoUrl?: string;
  attendanceRate?: number;
  qrToken?: string;
  qrIssuedAt?: string;
  qrRevoked?: boolean;
}

export type ZoneDecisionStatus = "ALLOWED" | "TRANSFERRED" | "ACCESS_DENIED" | "NEEDS_MANUAL_CHECK";

export interface AttendanceRecord {
  id?: string | number;
  workerId: string;
  workerName?: string;
  department?: string;
  shift?: ShiftName;
  shiftId?: number;
  defaultZoneName?: string;
  assignedZoneName?: string;
  transferReason?: string;
  transferStatus?: "AUTO" | "PENDING" | "APPROVED" | "REJECTED";
  date: string; // YYYY-MM-DD
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | null;
  status: AttendanceStatus;
  decision?: ZoneDecisionStatus;
  ppe: Record<PPEItem, PPEState>;
  manualOverride: boolean;
  note?: string;
}

export type ScanResult = 
  | "ALLOWED" 
  | "TRANSFERRED" 
  | "ACCESS_DENIED" 
  | "NEEDS_MANUAL_CHECK" 
  | "ID_NOT_VISIBLE"
  | "checked_in" 
  | "late" 
  | "access_denied" 
  | "id_not_visible";

export interface DetectionBox {
  label: string;
  confidence: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  state?: PPEState;
}

export interface DetectedPerson {
  personIndex: number;
  workerId?: string | null;
  workerName?: string | null;
  department?: string;
  shift?: ShiftName;
  defaultZoneName?: string;
  assignedZoneName?: string;
  decision?: ZoneDecisionStatus;
  reason?: string;
  ppe: Record<PPEItem, { state: PPEState; confidence: number }>;
  box: [number, number, number, number];
  qrRecognized: boolean;
  qualityIssues?: string[];
}

export interface ScanEvent {
  id: string;
  time: string; // HH:mm:ss
  timestamp?: string;
  gate: string;
  source?: "CAMERA" | "UPLOAD";
  workerId: string | null;
  workerName?: string;
  shift?: ShiftName;
  defaultZoneName?: string;
  assignedZoneName?: string;
  ppe: Record<PPEItem, PPEState>;
  result: ScanResult;
  reason?: string;
  imagePath?: string;
  annotatedImagePath?: string;
  needsReview?: boolean;
}

export interface ZoneAssignment {
  id: number;
  attendanceId?: number;
  workerId: string;
  workerName?: string;
  workDate: string;
  shiftId: number;
  shiftName?: ShiftName;
  fromZoneId: number;
  fromZoneName: string;
  toZoneId: number;
  toZoneName: string;
  reason: string;
  missingItems: PPEItem[];
  status: "AUTO" | "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  createdAt: string;
}

export interface ZoneOccupancy {
  zoneId: number;
  zoneName: string;
  assignedCount: number;
  capacity: number;
  percentage: number;
}

export interface AttendanceSummary {
  totalWorkers: number;
  present: number;
  presentPercentage: number;
  late: number;
  latePercentage: number;
  absent: number;
  absentPercentage: number;
  accessDenied: number;
  zoneTransfersToday: number;
  pendingApprovals: number;
  hourlyCheckIns: { time: string; count: number }[];
  ppeViolations: { item: PPEItem; name: string; count: number }[];
  zoneOccupancies?: ZoneOccupancy[];
}

export interface SystemSettings {
  shifts: Shift[];
  rules: {
    lateAfterMinutes: number;
    gracePeriodMinutes: number;
    minFullDayHours: number;
    allowManualOverride: boolean;
    treatNotVisibleAsReview: boolean;
    requireTransferApproval: boolean;
    faceBlurring: boolean;
    retentionDays: number;
  };
  requiredPPE: Record<PPEItem, boolean>;
  camera: {
    useRtsp: boolean;
    rtspUrl: string;
    fps: number;
  };
  notifications: {
    lateArrivalAlerts: boolean;
    absenceAlerts: boolean;
    accessDeniedAlerts: boolean;
  };
  general: {
    companyName: string;
    gates: string[];
    timezone: string;
  };
}

export interface ManualOverridePayload {
  workerId: string;
  workDate?: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  decision?: ZoneDecisionStatus;
  zoneId?: number;
  reason: string;
  note?: string;
}

export interface ModelMetrics {
  version: string;
  precision: number;
  recall: number;
  mAP50: number;
  perClass: Record<string, { precision: number; recall: number }>;
  feedbackCount: number;
  lastTrained: string;
  cudaAvailable: boolean;
  device: string;
}
