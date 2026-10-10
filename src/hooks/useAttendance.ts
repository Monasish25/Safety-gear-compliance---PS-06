import { useState, useEffect, useCallback } from "react";
import { AttendanceRecord, AttendanceSummary, ManualOverridePayload } from "../types";
import { 
  getAttendance, 
  getAttendanceSummary, 
  markCheckIn as apiCheckIn, 
  markCheckOut as apiCheckOut, 
  manualOverride as apiOverride 
} from "../lib/api";

export function useAttendance(date?: string, shift?: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordsAndSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, summaryData] = await Promise.all([
        getAttendance(date, shift),
        getAttendanceSummary(date, shift),
      ]);
      setRecords(data);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [date, shift]);

  useEffect(() => {
    fetchRecordsAndSummary();
  }, [fetchRecordsAndSummary]);

  const checkIn = async (workerId: string) => {
    try {
      setError(null);
      await apiCheckIn(workerId);
      await fetchRecordsAndSummary();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to check in" };
    }
  };

  const checkOut = async (workerId: string) => {
    try {
      setError(null);
      await apiCheckOut(workerId);
      await fetchRecordsAndSummary();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to check out" };
    }
  };

  const applyOverride = async (payload: ManualOverridePayload) => {
    try {
      setError(null);
      await apiOverride(payload);
      await fetchRecordsAndSummary();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to apply override" };
    }
  };

  return {
    records,
    summary,
    loading,
    error,
    refetch: fetchRecordsAndSummary,
    checkIn,
    checkOut,
    applyOverride,
  };
}
