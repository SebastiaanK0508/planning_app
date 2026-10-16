// Rekenregels uit verlof.html: verlofuren per dag volgen de vaste uren van de medewerker
// (instellingen.vaste_uren, sleutels als 'Ma', 'Di', ...). Zonder waarde telt een werkdag als 8 uur.

export const VERLOF_TYPES = ['Vakantie', 'Privé', 'Overig'] as const;

const DAGCODE = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

export function parseInstellingen(raw: unknown): Record<string, any> {
    let temp: any = raw;
    try {
        while (typeof temp === 'string') temp = JSON.parse(temp);
    } catch {
        return {};
    }
    return temp && typeof temp === 'object' ? temp : {};
}

export function urenOpDag(datum: Date, vasteUren: Record<string, any>): number {
    const code = DAGCODE[datum.getDay()];
    for (const key of Object.keys(vasteUren || {})) {
        if (key.toLowerCase().startsWith(code)) {
            const ruw = vasteUren[key];
            if (ruw !== '' && ruw !== null && ruw !== undefined && !Number.isNaN(parseFloat(ruw))) return parseFloat(ruw);
            break;
        }
    }
    return ['ma', 'di', 'wo', 'do', 'vr'].includes(code) ? 8 : 0;
}

export function berekenDagenUren(start: Date, eind: Date, vasteUren: Record<string, any>): number {
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const e = new Date(eind);
    e.setHours(23, 59, 59, 999);
    let totaal = 0;
    while (d <= e) {
        totaal += urenOpDag(d, vasteUren);
        d.setDate(d.getDate() + 1);
    }
    return totaal;
}

/** Splitst "Type: toelichting" uit de notitie die de backend teruggeeft. */
export function splitsNotitie(notitie: string | null | undefined): { type: string; tekst: string } {
    const n = String(notitie || '');
    const i = n.indexOf(':');
    if (i === -1) return { type: n || 'Verlof', tekst: '' };
    return { type: n.slice(0, i).trim() || 'Verlof', tekst: n.slice(i + 1).trim() };
}

export function verlofIcoon(type: string): 'airplane-outline' | 'heart-outline' | 'calendar-outline' {
    if (type.includes('Vakantie')) return 'airplane-outline';
    if (type.includes('Privé')) return 'heart-outline';
    return 'calendar-outline';
}

/** 'aanvraag' | 'goedgekeurd' | 'afgewezen' uit 'verlof_aanvraag' enz. */
export function verlofStatus(status: string | null | undefined): 'wachtend' | 'goedgekeurd' | 'afgewezen' {
    const s = String(status || '').replace('verlof_', '');
    if (s === 'goedgekeurd') return 'goedgekeurd';
    if (s === 'afgewezen') return 'afgewezen';
    return 'wachtend';
}
