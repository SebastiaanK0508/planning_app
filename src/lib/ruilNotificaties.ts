import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ruil_status_gezien_v1';
const AFGEHANDELDE_STATUSSEN = ['geaccepteerd', 'afgewezen'];

type SeenMap = Record<string, string>;

async function getSeen(): Promise<SeenMap> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

async function setSeen(map: SeenMap) {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(map));
    } catch {
        // niet kritiek, badge blijft dan gewoon staan tot de volgende sync
    }
}

/** Aantal verzonden ruilverzoeken waarvan de status (goedgekeurd/afgekeurd) nog niet bekeken is. */
export async function telOngezieneRuilUpdates(verzonden: any[] | null | undefined): Promise<number> {
    if (!verzonden || verzonden.length === 0) return 0;
    const seen = await getSeen();
    return verzonden.filter((v) => AFGEHANDELDE_STATUSSEN.includes(v.status) && seen[v.uuid] !== v.status).length;
}

/** Markeer de huidige status van alle verzonden ruilverzoeken als gezien. */
export async function markeerRuilUpdatesGezien(verzonden: any[] | null | undefined): Promise<void> {
    if (!verzonden || verzonden.length === 0) return;
    const seen = await getSeen();
    let changed = false;
    verzonden.forEach((v) => {
        if (AFGEHANDELDE_STATUSSEN.includes(v.status) && seen[v.uuid] !== v.status) {
            seen[v.uuid] = v.status;
            changed = true;
        }
    });
    if (changed) await setSeen(seen);
}
