import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearSession, getStoredUser, getToken, onUnauthorized, setSession } from '../lib/api';
import type { User } from '../types';

interface LoginResponse {
    success: boolean;
    token: string;
    user: User;
    message?: string;
}

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    login: (email: string, wachtwoord: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const token = await getToken();
            const storedUser = await getStoredUser<User>();
            if (token && storedUser) setUser(storedUser);
            setIsLoading(false);
        })();
    }, []);

    useEffect(() => {
        onUnauthorized(() => setUser(null));
    }, []);

    const login = useCallback(async (email: string, wachtwoord: string) => {
        const data = await apiRequest<LoginResponse>('/api/auth/login', {
            method: 'POST',
            body: { email, wachtwoord },
        });
        await setSession(data.token, data.user);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        await clearSession();
        setUser(null);
    }, []);

    const refreshUser = useCallback((patch: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const value = useMemo(
        () => ({ user, isLoading, login, logout, refreshUser }),
        [user, isLoading, login, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
    return ctx;
}
