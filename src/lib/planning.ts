// Planningslogica uit planning.html en pauze-regels.js, zodat app en web hetzelfde rekenen.

export const DAGNAMEN = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export const schoonId = (u: unknown) => String(u || '').replace(/-/g, '').toLowerCase();
const isAan = (v: unknown) => String(v) === '1' || v === true;

// ---------- Pauze (pauze-regels.js) ----------
export const PAUZE_REGELS_ATW = [
    { vanaf_uren: 5.5, minuten: 30 },
    { vanaf_uren: 10, minuten: 45 },
];

export const tijdNaarMinuten = (t: string) => {
    const [u, m] = String(t || '').split(':').map(Number);
    return (u || 0) * 60 + (m || 0);
};

function dienstVenster(start: string, eind: string) {
    const s = tijdNaarMinuten(start);
    let e = tijdNaarMinuten(eind);
    if (e <= s) e += 24 * 60;
    return { s, e };
}

export function dienstDuurUren(start: string, eind: string): number {
    if (!start || !eind) return 0;
    const { s, e } = dienstVenster(start, eind);
    return (e - s) / 60;
}

function werktNa(start: string, eind: string, na: string) {
    if (!start || !eind) return false;
    return dienstVenster(start, eind).e > tijdNaarMinuten(na);
}

function normaliseerLocatieRegels(waarde: any) {
    if (Array.isArray(waarde)) return { duur: waarde, tijd: [] as any[], optellen: false };
    if (waarde && typeof waarde === 'object') {
        return {
            duur: Array.isArray(waarde.duur) ? waarde.duur : [],
            tijd: Array.isArray(waarde.tijd) ? waarde.tijd : [],
            optellen: isAan(waarde.optellen),
        };
    }
    return null;
}

export function pauzeRegelsVoor(settings: any, locatieUuid?: string | null) {
    const perLocatie = settings?.pauze_regels_locaties || {};
    const eigen = locatieUuid ? normaliseerLocatieRegels(perLocatie[schoonId(locatieUuid)]) : null;
    if (eigen) return { ...eigen, eigenLocatie: true };
    return {
        duur: Array.isArray(settings?.pauze_regels) ? settings.pauze_regels : PAUZE_REGELS_ATW,
        tijd: Array.isArray(settings?.pauze_tijdregels) ? settings.pauze_tijdregels : [],
        optellen: isAan(settings?.pauze_optellen),
        eigenLocatie: false,
    };
}

export function berekenPauzeMetRegels(duurRegels: any[], tijdRegels: any[], start: string, eind: string, optellen = false) {
    const duur = dienstDuurUren(start, eind);
    const geldend = (duurRegels || []).filter((r) => duur > Number(r.vanaf_uren)).map((r) => Number(r.minuten) || 0);
    const basis = optellen ? geldend.reduce((s, m) => s + m, 0) : geldend.reduce((max, m) => Math.max(max, m), 0);
    const extra = (tijdRegels || []).filter((r) => werktNa(start, eind, r.na)) as { na: string; minuten: number }[];
    const minuten = basis + extra.reduce((s, r) => s + (Number(r.minuten) || 0), 0);
    return { minuten, basis, extra };
}

export function berekenStandaardPauze(settings: any, locatieUuid: string | null | undefined, start: string, eind: string) {
    const s = settings || {};
    const automatisch = isAan(s.auto_pauze_enabled);
    if (!automatisch) {
        const vast = parseInt(s.pauze_default, 10);
        const minuten = Number.isFinite(vast) ? vast : 30;
        return { minuten, basis: minuten, extra: [] as { na: string; minuten: number }[], automatisch: false, eigenLocatie: false };
    }
    const { duur, tijd, optellen, eigenLocatie } = pauzeRegelsVoor(s, locatieUuid);
    return { ...berekenPauzeMetRegels(duur, tijd, start, eind, optellen), automatisch: true, eigenLocatie };
}

// ---------- Openingstijden, sjablonen, bezetting ----------
export function openingstijdenVoor(settings: any, locatieUuid: string | null | undefined, dagNaam: string): { open?: string; sluit?: string; gesloten?: boolean } | null {
    const perLocatie = settings?.openingstijden_locaties || {};
    const eigen = locatieUuid ? perLocatie[schoonId(locatieUuid)] : null;
    const standaard = settings?.openingstijden || {};
    return (eigen || standaard)[dagNaam] || null;
}

export type Sjabloon = { id: string; naam: string; start: string; eind: string; pauze: number | null; locatie?: string };

export function sjablonenVoor(settings: any, locatieUuid: string | null | undefined): Sjabloon[] {
    const lijst: Sjabloon[] = Array.isArray(settings?.dienst_sjablonen) ? settings.dienst_sjablonen : [];
    const loc = schoonId(locatieUuid);
    return lijst.filter((t) => !t.locatie || !loc || t.locatie === loc);
}

export function minimaleBezetting(settings: any, locatieUuid: string | null | undefined, dagNaam: string): number | null {
    const perLocatie = settings?.bezetting_minimum_locaties || {};
    const eigen = locatieUuid ? perLocatie[schoonId(locatieUuid)] : null;
    const bron = eigen || settings?.bezetting_minimum || {};
    const n = parseInt(bron[dagNaam], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export const BEZ_DAGDELEN: [string, string, number, number, string][] = [
    ['O', 'Ochtend', 360, 720, '#d97706'],
    ['M', 'Middag', 720, 1080, '#0f9d75'],
    ['A', 'Avond', 1080, 1440, '#7c5cfc'],
];

function tijdDeel(dt: string) {
    const t = String(dt || '').replace('T', ' ').split(' ')[1] || '00:00';
    return tijdNaarMinuten(t.substring(0, 5));
}

export function telBezetting(diensten: any[]) {
    const mensen = new Set(diensten.map((s) => schoonId(s.gebruiker_uuid)));
    const perDagdeel = BEZ_DAGDELEN.map(
        ([, , van, tot]) =>
            new Set(
                diensten
                    .filter((s) => {
                        const begin = tijdDeel(s.start_tijd);
                        let eind = tijdDeel(s.eind_tijd);
                        if (eind <= begin) eind += 1440;
                        return begin < tot && eind > van;
                    })
                    .map((s) => schoonId(s.gebruiker_uuid))
            ).size
    );
    return { aantal: mensen.size, perDagdeel };
}

export function bepaalDagdeel(start: string, eind: string): { key: string; label: string } {
    const s = tijdNaarMinuten(start);
    let e = tijdNaarMinuten(eind);
    if (e <= s) e += 1440;
    if (s < 720 && e >= 1080) return { key: 'heledag', label: 'Hele dag' };
    if (s < 720) return { key: 'ochtend', label: 'Ochtend' };
    if (s < 1080) return { key: 'middag', label: 'Middag' };
    return { key: 'avond', label: 'Avond' };
}

export function isWerkDienst(s: any) {
    const st = String(s?.status || '');
    return !st || (!st.includes('verlof') && st !== 'goedgekeurd' && st !== 'in_afwachting' && st !== 'aanvraag');
}

/** 'YYYY-MM-DD HH:MM:SS' of ISO → { datum: 'YYYY-MM-DD', tijd: 'HH:MM' } zonder tijdzone-omrekening. */
export function splitDatumTijd(v: string | null | undefined): { datum: string; tijd: string } {
    const s = String(v || '');
    if (s.includes('T') && /Z|[+-]\d\d:?\d\d$/.test(s)) {
        const d = new Date(s);
        const pad = (n: number) => String(n).padStart(2, '0');
        return { datum: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, tijd: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
    }
    const [datum, tijd] = s.replace('T', ' ').split(' ');
    return { datum: datum || '', tijd: (tijd || '00:00').substring(0, 5) };
}

// ---------- Feestdagen ----------
const feestdagCache: Record<number, { naam: string; datum: string }[]> = {};

/** Nederlandse feestdagen via date.nager.at (zoals planning.html), plus die van de organisatie. */
export async function feestdagenVoorJaar(jaar: number, settings: any): Promise<{ naam: string; datum: string }[]> {
    if (!feestdagCache[jaar]) {
        try {
            const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${jaar}/NL`);
            feestdagCache[jaar] = res.ok ? ((await res.json()) as any[]).map((f) => ({ naam: f.localName, datum: f.date })) : [];
        } catch {
            feestdagCache[jaar] = [];
        }
    }
    const org = Array.isArray(settings?.feestdagen) ? settings.feestdagen : [];
    return [...org, ...feestdagCache[jaar]];
}
