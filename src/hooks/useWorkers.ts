import { useState, useEffect, useCallback } from "react";
import { Worker } from "../types";
import { 
  getWorkers, 
  createWorker as apiCreateWorker, 
  updateWorker as apiUpdateWorker, 
  deactivateWorker as apiDeactivateWorker 
} from "../lib/api";

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkers();
      setWorkers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const addWorker = async (data: Omit<Worker, "active" | "attendanceRate">) => {
    try {
      setError(null);
      const created = await apiCreateWorker(data);
      setWorkers(prev => [created, ...prev]);
      return { success: true, worker: created };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to create worker" };
    }
  };

  const updateWorkerData = async (id: string, data: Partial<Worker>) => {
    try {
      setError(null);
      const updated = await apiUpdateWorker(id, data);
      setWorkers(prev => prev.map(w => w.workerId === id ? updated : w));
      return { success: true, worker: updated };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update worker" };
    }
  };

  const toggleDeactivate = async (id: string) => {
    try {
      setError(null);
      await apiDeactivateWorker(id);
      setWorkers(prev => prev.map(w => w.workerId === id ? { ...w, active: !w.active } : w));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to toggle active status" };
    }
  };

  return {
    workers,
    loading,
    error,
    refetch: fetchWorkers,
    addWorker,
    updateWorker: updateWorkerData,
    toggleDeactivate,
  };
}
