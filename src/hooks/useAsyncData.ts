import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError('');
        try {
            const result = await fetcher();
            setData(result);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Er ging iets mis bij het laden van de gegevens.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load();
    }, [load]);

    return {
        data,
        setData,
        loading,
        refreshing,
        error,
        refresh: () => load(true),
        reload: () => load(false),
    };
}
