import type { BadgeTone } from '../components/ui';

// Kleuren/iconen uit support.html.
export const TICKET_STATUSSEN = ['Open', 'In Behandeling', 'Opgelost', 'Gesloten'] as const;
export const TICKET_CATEGORIEEN = ['Algemeen', 'Technisch', 'Facturatie', 'Feature Aanvraag'] as const;
export const TICKET_PRIORITEITEN = ['Laag', 'Medium', 'Hoog'] as const;

export function ticketStatusTone(status: string): BadgeTone {
    if (status === 'In Behandeling') return 'amber';
    if (status === 'Opgelost') return 'emerald';
    if (status === 'Gesloten') return 'default';
    return 'blue';
}

export function prioriteitTone(p: string): BadgeTone {
    if (p === 'Laag') return 'default';
    if (p === 'Hoog') return 'rose';
    if (p === 'Kritiek') return 'dark';
    return 'blue';
}

export function categorieIcoon(c: string): 'construct-outline' | 'receipt-outline' | 'bulb-outline' | 'help-circle-outline' {
    if (c === 'Technisch') return 'construct-outline';
    if (c === 'Facturatie') return 'receipt-outline';
    if (c === 'Feature Aanvraag') return 'bulb-outline';
    return 'help-circle-outline';
}
