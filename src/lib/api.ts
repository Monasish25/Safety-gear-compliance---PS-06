import { 
  Worker, 
  AttendanceRecord, 
  ScanEvent, 
  AttendanceSummary, 
  SystemSettings, 
  ManualOverridePayload,
  User,
  Zone,
  Shift,
  ZoneAssignment,
  ZoneOccupancy,
  ModelMetrics,
  DetectedPerson
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Token storage fallback (along with httpOnly cookies)
let authToken: string | null = localStorage.getItem("smart_attendance_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("smart_attendance_token", token);
  } else {
    localStorage.removeItem("smart_attendance_token");
  }
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem("smart_attendance_token");
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include httpOnly cookies for access & refresh tokens
  });

  if (response.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    // Attempt token refresh via backend or Supabase
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.accessToken) {
          setAuthToken(refreshData.accessToken);
        }
        headers.set("Authorization", `Bearer ${refreshData.accessToken || getAuthToken()}`);
        const retryRes = await fetch(url, { ...options, headers, credentials: "include" });
        if (retryRes.ok) return retryRes.json();
      }
    } catch {
      // Backend refresh unavailable, attempt Supabase session recovery
    }

    try {
      const { supabase } = await import("./supabase");
      const { data: sbData } = await supabase.auth.getSession();
      if (sbData?.session?.access_token) {
        setAuthToken(sbData.session.access_token);
        headers.set("Authorization", `Bearer ${sbData.session.access_token}`);
        const retryRes = await fetch(url, { ...options, headers, credentials: "include" });
        if (retryRes.ok) return retryRes.json();
      }
    } catch {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
  }

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ==========================================
// AUTHENTICATION API
// ==========================================

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
  const data = await apiFetch<{ user: User; accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.accessToken) {
    setAuthToken(data.accessToken);
  }
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

export async function changeInitialPassword(newPassword: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

// ==========================================
// USERS API (HEAD ONLY)
// ==========================================

export async function getUsers(): Promise<User[]> {
  return apiFetch<User[]>("/users");
}

export async function createUser(data: { email: string; name: string; role: string; password?: string }): Promise<User> {
  return apiFetch<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  return apiFetch<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function resetUserPassword(id: number, newPassword: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

// ==========================================
// WORKERS API
// ==========================================

export async function getWorkers(shiftId?: number, zoneId?: number): Promise<Worker[]> {
  const params = new URLSearchParams();
  if (shiftId) params.append("shift_id", shiftId.toString());
  if (zoneId) params.append("zone_id", zoneId.toString());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Worker[]>(`/workers${query}`);
}

export async function createWorker(data: Omit<Worker, "active" | "attendanceRate">): Promise<Worker> {
  return apiFetch<Worker>("/workers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorker(id: string, data: Partial<Worker>): Promise<Worker> {
  return apiFetch<Worker>(`/workers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deactivateWorker(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/workers/${id}`, { method: "DELETE" });
}

export async function regenerateWorkerQr(id: string): Promise<{ qrToken: string; qrUrl: string }> {
  return apiFetch<{ qrToken: string; qrUrl: string }>(`/workers/${id}/qr/regenerate`, {
    method: "POST",
  });
}

export function getWorkerQrCodeImageUrl(workerId: string): string {
  return `${API_BASE_URL}/workers/${workerId}/qr.png`;
}

export function getPrintBadgesPdfUrl(): string {
  return `${API_BASE_URL}/badges/print`;
}

export async function getPublicQrData(token: string): Promise<{
  valid: boolean;
  worker?: Worker;
  requiredPpe?: Record<string, boolean>;
  todayAttendance?: AttendanceRecord;
  history?: AttendanceRecord[];
  transfers?: ZoneAssignment[];
  message?: string;
}> {
  return apiFetch(`/qr/${token}`);
}

// ==========================================
// SHIFTS & ZONES API
// ==========================================

export async function getShifts(): Promise<Shift[]> {
  return apiFetch<Shift[]>("/shifts");
}

export async function updateShift(id: number, data: Partial<Shift>): Promise<Shift> {
  return apiFetch<Shift>(`/shifts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getZones(): Promise<Zone[]> {
  return apiFetch<Zone[]>("/zones");
}

export async function createZone(data: Omit<Zone, "id">): Promise<Zone> {
  return apiFetch<Zone>("/zones", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateZone(id: number, data: Partial<Zone>): Promise<Zone> {
  return apiFetch<Zone>(`/zones/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getZoneOccupancy(date?: string, shiftId?: number): Promise<ZoneOccupancy[]> {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (shiftId) params.append("shift", shiftId.toString());
  return apiFetch<ZoneOccupancy[]>(`/zones/occupancy?${params.toString()}`);
}

// ==========================================
// ZONE TRANSFERS & APPROVALS
// ==========================================

export async function getPendingTransfers(): Promise<ZoneAssignment[]> {
  return apiFetch<ZoneAssignment[]>("/transfers?status=PENDING");
}

export async function approveTransfer(id: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/transfers/${id}/approve`, { method: "POST" });
}

export async function rejectTransfer(id: number, reason?: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/transfers/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ==========================================
// ATTENDANCE API
// ==========================================

export async function getAttendance(date?: string, shift?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (shift) params.append("shift", shift);
  return apiFetch<AttendanceRecord[]>(`/attendance?${params.toString()}`);
}

export async function getAttendanceSummary(date?: string, shift?: string): Promise<AttendanceSummary> {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (shift) params.append("shift", shift);
  return apiFetch<AttendanceSummary>(`/attendance/summary?${params.toString()}`);
}

export interface DrilldownItem {
  id?: number;
  workerId: string;
  name: string;
  department: string;
  position: string;
  shift: string;
  zone: string;
  status: string;
  timestamp: string;
  reason?: string;
  ppe?: Record<string, string>;
  missingItems?: string[];
  approvedBy?: string;
  canCheckIn?: boolean;
  isTransfer?: boolean;
  transferId?: number;
  attendanceRecord?: number;
}

export interface DrilldownResponse {
  category: string;
  date: string;
  shift: string;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: DrilldownItem[];
}

export async function getDashboardDrilldown(
  category: string,
  date?: string,
  shift?: string,
  search?: string,
  department?: string,
  sortBy = "workerId",
  sortOrder = "asc",
  page = 1,
  pageSize = 10
): Promise<DrilldownResponse> {
  const params = new URLSearchParams({ category });
  if (date) params.append("date", date);
  if (shift) params.append("shift", shift);
  if (search) params.append("search", search);
  if (department) params.append("department", department);
  if (sortBy) params.append("sortBy", sortBy);
  if (sortOrder) params.append("sortOrder", sortOrder);
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));

  return apiFetch<DrilldownResponse>(`/dashboard/drilldown?${params.toString()}`);
}

export async function getRecentScans(): Promise<ScanEvent[]> {
  return apiFetch<ScanEvent[]>("/scans/recent");
}

export async function markCheckIn(workerId: string): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify({ worker_id: workerId }),
  });
}

export async function markCheckOut(workerId: string): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance/check-out", {
    method: "POST",
    body: JSON.stringify({ worker_id: workerId }),
  });
}

export async function manualOverride(payload: ManualOverridePayload): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance/override", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// SCAN & VISION API
// ==========================================

export async function uploadScanImage(
  file: File, 
  recordAttendance = false
): Promise<{
  scanId: string;
  peopleCount: number;
  people: DetectedPerson[];
  annotatedImageUrl: string;
  originalImageUrl: string;
  qualityPassed: boolean;
  qualityIssues: string[];
}> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("record_attendance", String(recordAttendance));

  const token = getAuthToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}/scans/image`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Scan failed" }));
    throw new Error(err.detail || "Image detection failed");
  }

  return res.json();
}

export async function reviewScan(
  scanId: string, 
  decision: "ALLOW" | "TRANSFER" | "DENY", 
  assignedZoneId?: number,
  notes?: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/scans/${scanId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, assigned_zone_id: assignedZoneId, notes }),
  });
}

// ==========================================
// REPORTS & EXPORT
// ==========================================

export async function getReport(
  from: string, 
  to: string, 
  filters?: Record<string, string>
): Promise<AttendanceRecord[]> {
  const query = new URLSearchParams({ from, to, ...(filters || {}) }).toString();
  return apiFetch<AttendanceRecord[]>(`/reports?${query}`);
}

export function exportReportToCSV(records: AttendanceRecord[], dateStr = "2026-10-08"): void {
  const headers = [
    "Date",
    "Worker ID",
    "Name",
    "Department",
    "Shift",
    "Default Zone",
    "Assigned Zone",
    "Zone Decision",
    "Transfer Reason",
    "Check In",
    "Check Out",
    "Working Hours",
    "Helmet",
    "Vest",
    "Shoes",
    "Gloves",
    "Goggles",
    "Attendance Status",
    "Manual Override",
    "Notes",
  ];

  const rows = records.map(r => [
    r.date || dateStr,
    r.workerId,
    `"${r.workerName || ''}"`,
    r.department || '',
    r.shift || '',
    r.defaultZoneName || 'General',
    r.assignedZoneName || r.defaultZoneName || 'General',
    r.decision || 'ALLOWED',
    `"${r.transferReason || ''}"`,
    r.checkIn || '—',
    r.checkOut || '—',
    r.workingHours || '—',
    r.ppe?.helmet || 'N/A',
    r.ppe?.vest || 'N/A',
    r.ppe?.shoes || 'N/A',
    r.ppe?.gloves || 'N/A',
    r.ppe?.goggles || 'N/A',
    (r.status || 'not_scanned').toUpperCase(),
    r.manualOverride ? "YES" : "NO",
    `"${r.note || ''}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `smart_attendance_report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// SETTINGS API
// ==========================================

export async function getSettings(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>("/settings");
}

export async function updateSettings(newSettings: SystemSettings): Promise<SystemSettings> {
  return apiFetch<SystemSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(newSettings),
  });
}

// ==========================================
// MODEL ADMIN (HEAD ONLY)
// ==========================================

export async function getModelMetrics(): Promise<ModelMetrics> {
  return apiFetch<ModelMetrics>("/model/metrics");
}

export function getExportFeedbackDatasetUrl(): string {
  return `${API_BASE_URL}/model/feedback/export`;
}
