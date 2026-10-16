import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OrganisatieApi } from '../lib/services';

// Organisatie-instellingen veranderen zelden; één gedeelde cache voorkomt dat elk scherm
// en elke modal ze opnieuw ophaalt.
let cache: { org: string; data: any; tijd: number } | null = null;
let lopend: Promise<any> | null = null;
const MAX_LEEFTIJD = 2 * 60 * 1000;

export function invalidateOrgSettings() {
    cache = null;
}

async function haalSettings(org: string) {
    if (cache && cache.org === org && Date.now() - cache.tijd < MAX_LEEFTIJD) return cache.data;
    if (!lopend) {
        lopend = OrganisatieApi.settings(org)
            .then((data) => {
                cache = { org, data, tijd: Date.now() };
                return data;
            })
            .finally(() => {
                lopend = null;
            });
    }
    return lopend;
}

export function useOrgSettings(): any | null {
    const { user } = useAuth();
    const org = user?.org_uuid;
    const [data, setData] = useState<any | null>(cache && cache.org === org ? cache.data : null);

    useEffect(() => {
        if (!org) return;
        let actief = true;
        haalSettings(org)
            .then((d) => actief && setData(d))
            .catch(() => {});
        return () => {
            actief = false;
        };
    }, [org]);

    return data;
}

export function settingAan(waarde: unknown, standaard = false): boolean {
    if (waarde === undefined || waarde === null || waarde === '') return standaard;
    return waarde === true || waarde === 'true' || Number(waarde) === 1;
}
