const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDEN = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export function parseServerDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    // MySQL geeft 'YYYY-MM-DD HH:mm:ss' terug (zonder tijdzone) -> lokaal interpreteren.
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
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

export function statusLabel(status: string | undefined): { label: string; tone: 'default' | 'success' | 'danger' | 'warning' } {
    switch (status) {
        case 'ingepland':
            return { label: 'Ingepland', tone: 'default' };
        case 'wacht_op_planner':
            return { label: 'Wacht op planner', tone: 'warning' };
        case 'verlof_aanvraag':
            return { label: 'Verlof: aangevraagd', tone: 'warning' };
        case 'verlof_goedgekeurd':
            return { label: 'Verlof: goedgekeurd', tone: 'success' };
        case 'verlof_afgewezen':
            return { label: 'Verlof: afgewezen', tone: 'danger' };
        case 'in_afwachting':
            return { label: 'In afwachting', tone: 'warning' };
        case 'goedgekeurd':
            return { label: 'Goedgekeurd', tone: 'success' };
        case 'afgewezen':
            return { label: 'Afgewezen', tone: 'danger' };
        case 'geannuleerd':
            return { label: 'Geannuleerd', tone: 'danger' };
        case 'open':
            return { label: 'Open', tone: 'warning' };
        case 'geaccepteerd':
            return { label: 'Geaccepteerd', tone: 'success' };
        case 'geweigerd':
            return { label: 'Geweigerd', tone: 'danger' };
        default:
            return { label: status || 'Onbekend', tone: 'default' };
    }
}
