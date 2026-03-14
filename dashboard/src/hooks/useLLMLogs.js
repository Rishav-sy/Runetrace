import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://efy27iqiuf.execute-api.us-east-1.amazonaws.com';

const TIME_RANGES = {
  '1h': () => Date.now() / 1000 - 3600,
  '24h': () => Date.now() / 1000 - 86400,
  '7d': () => Date.now() / 1000 - 604800,
  '30d': () => Date.now() / 1000 - 2592000,
  'all': () => null,
};

export function useLLMLogs(projectId = 'live-demo', timeRange = 'all') {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastKey, setLastKey] = useState(null);
  const debounceRef = useRef(null);

  const fetchLogs = useCallback(async (append = false) => {
    try {
      if (!append) setLoading(true);

      const params = { project_id: projectId, limit: 100 };

      // Time range
      const getStartTime = TIME_RANGES[timeRange];
      if (getStartTime) {
        const start = getStartTime();
        if (start) params.start_time = Math.floor(start);
      }

      // Pagination — only append when loading more
      if (append && lastKey) {
        params.last_key = lastKey;
      }

      const response = await axios.get(`${API_URL}/logs`, { params });
      const data = response.data;

      if (append) {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      } else {
        setLogs(data.logs || []);
      }

      setHasMore(data.has_more || false);
      setLastKey(data.last_key || null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, timeRange, lastKey]);

  // Debounced fetch when projectId or timeRange changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLastKey(null);
      fetchLogs(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [projectId, timeRange]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchLogs(false), 30000);
    return () => clearInterval(interval);
  }, [projectId, timeRange]);

  const loadMore = useCallback(() => {
    if (hasMore && lastKey) fetchLogs(true);
  }, [hasMore, lastKey, fetchLogs]);

  return { logs, loading, error, hasMore, refetch: () => fetchLogs(false), loadMore };
}

export { TIME_RANGES };
