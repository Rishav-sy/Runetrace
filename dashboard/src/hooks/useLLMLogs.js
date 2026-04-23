import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/auth';

const TIME_RANGES = {
  '1h': () => new Date(Date.now() - 3600000).toISOString(),
  '24h': () => new Date(Date.now() - 86400000).toISOString(),
  '7d': () => new Date(Date.now() - 604800000).toISOString(),
  '30d': () => new Date(Date.now() - 2592000000).toISOString(),
  'all': () => null,
};

export function useLLMLogs(projectId = 'default', timeRange = 'all') {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef(null);

  const PAGE_SIZE = 10000;

  const fetchLogs = useCallback(async (append = false) => {
    try {
      if (!append) setLoading(true);

      let allData = [];
      let currentOffset = append ? offset : 0;
      let keepFetching = true;
      let totalCount = 0;

      while (keepFetching) {
        let query = supabase
          .from('request_logs')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        // Apply time filter
        const getStartTime = TIME_RANGES[timeRange];
        if (getStartTime) {
          const startTimeStr = getStartTime();
          if (startTimeStr) {
            query = query.gte('created_at', startTimeStr);
          }
        }

        const { data, error, count } = await query;

        if (error) throw error;

        totalCount = count;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          currentOffset += data.length;
          
          // Supabase has a hard 1000 row limit per request by default.
          // If we got fewer rows than we asked for, we've hit the end.
          if (data.length < PAGE_SIZE && data.length < 1000) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }

      // Map created_at to epoch-seconds timestamp for chart components
      const mapped = allData.map(row => ({
        ...row,
        timestamp: row.created_at ? new Date(row.created_at).getTime() / 1000 : 0,
        status: row.status || 'success',
      }));

      if (append) {
        setLogs(prev => [...prev, ...mapped]);
      } else {
        setLogs(mapped);
      }

      setOffset(currentOffset);
      setHasMore(totalCount > currentOffset);
      setError(null);
    } catch (err) {
      console.error("Runetrace Data Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, timeRange, offset]);

  // Debounced fetch when projectId or timeRange changes
  useEffect(() => {
    // Instantly wipe old data to trigger loading skeleton
    setLogs([]);
    setLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchLogs(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [projectId, timeRange]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchLogs(true);
  }, [hasMore, fetchLogs]);

  return { logs, loading, error, hasMore, refetch: () => fetchLogs(false), loadMore };
}

export { TIME_RANGES };
