import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasRole } from '../lib/theme';

export function useRoleGuard(allowed: string[]) {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !hasRole(user.rol, allowed)) {
            router.replace('/(app)/(tabs)');
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
}
