import { useState, useCallback } from "react";
import api from "../lib/axios";

export interface TosTemplate {
  usage_contracts?: { contract_id: string; type: string }[];
  id: string;
  terms_title: string;
  terms_content: string;
  is_default: boolean;
}

export const useTerms = () => {
  const [terms, setTerms] = useState<TosTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTerms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/terms-of-service");
      if (res.data.success) {
        setTerms(res.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching terms:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTerms = useCallback(async (data: { terms_title: string; terms_content: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/terms-of-service", data);
      if (res.data.success) {
        setTerms((prev) => [res.data.data, ...prev]);
        return res.data.data;
      }
    } catch (err: any) {
      console.error("Error creating terms:", err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTerms = useCallback(async (id: string, data: { terms_title: string; terms_content: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put(`/api/terms-of-service/${id}`, data);
      if (res.data.success) {
        setTerms((prev) => prev.map((t) => (t.id === id ? res.data.data : t)));
        return res.data.data;
      }
    } catch (err: any) {
      console.error("Error updating terms:", err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTerms = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.delete(`/api/terms-of-service/${id}`);
      if (res.data.success) {
        setTerms((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err: any) {
      console.error("Error deleting terms:", err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { terms, loading, error, fetchTerms, createTerms, updateTerms, deleteTerms };
};
