// Kleuren en maten volgen frontend/app.css + navigation.js van de webapp, zodat app en web
// er hetzelfde uitzien.
export const colors = {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primarySoft: '#eff6ff',
    primaryBorder: '#dbeafe',
    brand: '#4361ee',
    purple: '#7209b7',

    ink: '#0f172a',
    text: '#334155',
    textMuted: '#64748b',
    subtle: '#94a3b8',
    line: '#eef1f6',
    border: '#e2e8f0',
    inputBg: '#f8fafc',
    bg: '#f8f9fc',
    slateSoft: '#f1f5f9',

    danger: '#e11d48',
    dangerSoft: '#fff1f2',
    dangerBorder: '#fecdd3',
    success: '#059669',
    successSoft: '#ecfdf5',
    successBorder: '#a7f3d0',
    warning: '#d97706',
    warningSoft: '#fffbeb',
    warningBorder: '#fde68a',
    violet: '#9333ea',
    violetSoft: '#faf5ff',
    violetBorder: '#e9d5ff',
};

// Dagdeelkleuren uit team-rooster.html / planning.html.
export const dagdeelKleuren = {
    ochtend: { fg: '#f59e0b', bg: '#fef3e2' },
    middag: { fg: '#0f9d75', bg: '#e5f7f0' },
    avond: { fg: '#7c5cfc', bg: '#f1edff' },
    verlof: { fg: '#e6467a', bg: '#fdeaf1' },
};

export const radius = { card: 24, tile: 14, input: 14, button: 16, pill: 999 };

export const shadow = {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
};

export const roleLabels: Record<string, string> = {
    medewerker: 'Medewerker',
    planner: 'Planner',
    beheerder: 'Beheerder',
    eigenaar: 'Eigenaar',
    super_admin: 'Super Admin',
};

export const PLANNER_PLUS = ['planner', 'beheerder', 'eigenaar', 'super_admin'];
export const BEHEERDER_PLUS = ['beheerder', 'eigenaar', 'super_admin'];

export function hasRole(rol: string | undefined, allowed: string[]): boolean {
    if (!rol) return false;
    if (rol === 'super_admin') return true;
    return allowed.includes(rol);
}
