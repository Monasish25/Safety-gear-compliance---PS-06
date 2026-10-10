import { useState, useEffect, useCallback } from "react";
import { ScanEvent } from "../types";
import { getRecentScans, reviewScan as apiReviewScan } from "../lib/api";

export function useScans() {
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentScans();
      setScans(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load recent scans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const review = async (scanId: string, decision: "ALLOW" | "TRANSFER" | "DENY", assignedZoneId?: number, notes?: string) => {
    try {
      await apiReviewScan(scanId, decision, assignedZoneId, notes);
      await fetchScans();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Review failed" };
    }
  };

  return {
    scans,
    loading,
    error,
    refetch: fetchScans,
    review,
  };
}
