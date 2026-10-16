const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDEN = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export function parseServerDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    // MySQL geeft 'YYYY-MM-DD HH:mm:ss' terug (zonder tijdzone) -> lokaal interpreteren.
    // Alleen een datum ('YYYY-MM-DD') zou als UTC geparsed worden; forceer lokale middernacht.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value.includes('T') ? value : value.replace(' ', 'T');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDayLabel(value: string | null | undefined): string {
    const d = parseServerDate(value);
    if (!d) return '';
    return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

export function formatShortDate(value: string | null | undefined): string {
    const d = parseServerDate(value);
    if (!d) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export function formatTime(value: string | null | undefined): string {
    const d = parseServerDate(value);
    if (!d) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(value: string | null | undefined): string {
    const d = parseServerDate(value);
    if (!d) return '';
    return `${formatShortDate(value)} ${formatTime(value)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // maandag = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function initials(voornaam?: string, achternaam?: string): string {
    return `${(voornaam || '?').charAt(0)}${(achternaam || '').charAt(0)}`.toUpperCase();
}

type Tone = 'default' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';

// Labels en kleuren volgen mijn_rooster.html / verlof.html op het web.
export function statusLabel(status: string | null | undefined): { label: string; tone: Tone } {
    switch (status) {
        case 'ingepland':
        case undefined:
        case null:
        case '':
            return { label: 'Ingepland', tone: 'blue' };
        case 'bevestigd':
            return { label: 'Bevestigd', tone: 'emerald' };
        case 'concept':
            return { label: 'Concept', tone: 'default' };
        case 'te ruil':
            return { label: 'Op de beurs', tone: 'amber' };
        case 'wacht_op_planner':
            return { label: 'Wacht op planner', tone: 'amber' };
        case 'wacht_op_manager':
            return { label: 'Bij planner', tone: 'amber' };
        case 'ziek':
            return { label: 'Ziek', tone: 'rose' };
        case 'verlof_aanvraag':
            return { label: 'Verlof aangevraagd', tone: 'purple' };
        case 'verlof_goedgekeurd':
            return { label: 'Verlof akkoord', tone: 'emerald' };
        case 'verlof_afgewezen':
            return { label: 'Verlof afgewezen', tone: 'rose' };
        case 'in_afwachting':
            return { label: 'Wachtend', tone: 'amber' };
        case 'goedgekeurd':
            return { label: 'Geregeld', tone: 'emerald' };
        case 'afgewezen':
            return { label: 'Afgewezen', tone: 'rose' };
        case 'geannuleerd':
            return { label: 'Geannuleerd', tone: 'rose' };
        case 'open':
            return { label: 'In afwachting', tone: 'blue' };
        case 'geaccepteerd':
            return { label: 'Geaccepteerd', tone: 'emerald' };
        case 'geweigerd':
            return { label: 'Geweigerd', tone: 'rose' };
        case 'mislukt':
            return { label: 'Mislukt', tone: 'rose' };
        default:
            return { label: status || 'Onbekend', tone: 'default' };
    }
}

export function isVerlofStatus(status: string | undefined | null): boolean {
    return String(status || '').startsWith('verlof') || status === 'in_afwachting';
}

/** ISO-weeknummer. */
export function weekNummer(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dag = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dag);
    const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - jaarStart.getTime()) / 864e5 + 1) / 7);
}

/** Uren als "7,5" (max. 2 decimalen, NL-notatie). */
export function formatUren(uren: number | string | null | undefined): string {
    const n = Number(uren) || 0;
    return n.toLocaleString('nl-NL', { maximumFractionDigits: 2 });
}

export function dagdeel(start: string | null | undefined): 'ochtend' | 'middag' | 'avond' {
    const d = parseServerDate(start);
    const h = d ? d.getHours() : 9;
    if (h < 12) return 'ochtend';
    if (h < 18) return 'middag';
    return 'avond';
}

/** 'YYYY-MM-DD HH:MM:SS' voor de backend, in lokale tijd. */
export function toServerDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${toIsoDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function shortDayMonth(date: Date): string {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

/** Zoeken zonder accenten/hoofdletters, zoals de kennisbank en lijsten op het web. */
export function normaliseer(tekst: string | null | undefined): string {
    return String(tekst || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

/** Vergelijkt uuids ongeacht streepjes/hoofdletters (backend geeft beide vormen terug). */
export function zelfdeUuid(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase();
}
