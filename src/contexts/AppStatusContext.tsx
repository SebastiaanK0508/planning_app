import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { onPaymentRequired } from '../lib/api';
import { zelfdeUuid } from '../lib/format';
import { telOngezieneRuilUpdates } from '../lib/ruilNotificaties';
import { AbonnementApi, AbonnementStatus, BerichtenApi, PlanningApi, RuilbeursApi } from '../lib/services';
import { hasRole, PLANNER_PLUS } from '../lib/theme';
import { useAuth } from './AuthContext';

// Badges en abonnementsstatus, net als de 30s-checks in navigation.js op het web.
interface AppStatus {
    ongelezenBerichten: number;
    ruilBadge: number;
    beheerOpen: number;
    abonnement: AbonnementStatus | null;
    refresh: () => void;
}

const Ctx = createContext<AppStatus>({ ongelezenBerichten: 0, ruilBadge: 0, beheerOpen: 0, abonnement: null, refresh: () => {} });

const INTERVAL = 30000;

export function AppStatusProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [ongelezenBerichten, setOngelezen] = useState(0);
    const [ruilBadge, setRuilBadge] = useState(0);
    const [beheerOpen, setBeheerOpen] = useState(0);
    const [abonnement, setAbonnement] = useState<AbonnementStatus | null>(null);
    const laatsteAbo = useRef(0);

    const refresh = useCallback(async () => {
        if (!user) return;
        const isPlanner = hasRole(user.rol, PLANNER_PLUS);
        const taken: Promise<unknown>[] = [
            (BerichtenApi.mijnBerichten(user.uuid, user.org_uuid) as Promise<any[]>)
                .then((rows) =>
                    setOngelezen((rows || []).filter((b) => Number(b.is_gelezen_door_mij) !== 1 && !zelfdeUuid(b.zender_uuid, user.uuid)).length)
                )
                .catch(() => {}),
            Promise.all([
                (RuilbeursApi.ontvangen(user.uuid) as Promise<any[]>).catch(() => []),
                (RuilbeursApi.mijnVerzonden(user.uuid) as Promise<any[]>).catch(() => []),
            ])
                .then(async ([ontvangen, verzonden]) => setRuilBadge((ontvangen || []).length + (await telOngezieneRuilUpdates(verzonden))))
                .catch(() => {}),
        ];
        if (isPlanner) {
            taken.push(
                PlanningApi.ruilVerlofOpenAantal(user.org_uuid)
                    .then((r) => setBeheerOpen(Number(r?.aantal) || 0))
                    .catch(() => {})
            );
        }
        // Abonnementsstatus hoeft niet elke 30s: 5 minuten cache zoals op het web.
        if (user.rol !== 'super_admin' && Date.now() - laatsteAbo.current > 5 * 60 * 1000) {
            laatsteAbo.current = Date.now();
            taken.push(
                AbonnementApi.status()
                    .then(setAbonnement)
                    .catch(() => {})
            );
        }
        await Promise.all(taken);
    }, [user]);

    useEffect(() => {
        if (!user) {
            setOngelezen(0);
            setRuilBadge(0);
            setBeheerOpen(0);
            setAbonnement(null);
            laatsteAbo.current = 0;
            return;
        }
        refresh();
        const timer = setInterval(() => {
            if (AppState.currentState === 'active') refresh();
        }, INTERVAL);
        const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
        return () => {
            clearInterval(timer);
            sub.remove();
        };
    }, [user, refresh]);

    useEffect(() => {
        onPaymentRequired(() => {
            laatsteAbo.current = 0;
            refresh();
        });
    }, [refresh]);

    const value = useMemo(
        () => ({ ongelezenBerichten, ruilBadge, beheerOpen, abonnement, refresh }),
        [ongelezenBerichten, ruilBadge, beheerOpen, abonnement, refresh]
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStatus() {
    return useContext(Ctx);
}
