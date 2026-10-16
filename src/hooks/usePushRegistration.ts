import { useEffect } from 'react';
import { registreerPush } from '../lib/push';

// Meldt het toestel na het inloggen aan voor pushmeldingen, tenzij de gebruiker ze in
// het profiel heeft uitgezet (instellingen.push === false).
export function usePushRegistration(enabled: boolean, uitgezet: boolean) {
    useEffect(() => {
        if (!enabled || uitgezet) return;
        registreerPush(true).catch(() => {});
    }, [enabled, uitgezet]);
}
