import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthApi } from '../lib/services';
import { parseInstellingen } from '../lib/verlof';

/** Actuele instellingen (verlofsaldo, vaste uren, contracturen, persoonsgegevens) van de ingelogde gebruiker. */
export function useMijnInstellingen() {
    const { user } = useAuth();
    const [instellingen, setInstellingen] = useState<Record<string, any> | null>(null);
    const [profielfoto, setProfielfoto] = useState<string | null>(null);

    const laad = useCallback(async () => {
        if (!user) return;
        try {
            const res: any = await AuthApi.getUser(user.uuid);
            setInstellingen(parseInstellingen(res?.instellingen));
            setProfielfoto(res?.profielfoto || null);
        } catch {
            setInstellingen((prev) => prev ?? parseInstellingen(user.instellingen));
        }
    }, [user?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        laad();
    }, [laad]);

    return { instellingen, profielfoto, setProfielfoto, herlaad: laad };
}
