import { useState, useEffect, useCallback } from "react";
import { SystemSettings } from "../types";
import { getSettings, updateSettings as apiUpdateSettings } from "../lib/api";

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: SystemSettings) => {
    try {
      setSaving(true);
      setError(null);
      const saved = await apiUpdateSettings(newSettings);
      setSettings(saved);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to save settings" };
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    error,
    refetch: fetchSettings,
    saveSettings,
  };
}
