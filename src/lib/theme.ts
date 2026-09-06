export const colors = {
    primary: '#4361ee',
    primaryDark: '#3347c9',
    primarySoft: '#eef2ff',
    danger: '#ef4444',
    dangerSoft: '#fee2e2',
    success: '#16a34a',
    successSoft: '#dcfce7',
    warning: '#f59e0b',
    warningSoft: '#fef3c7',
    textMuted: '#64748b',
    border: '#e2e8f0',
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
