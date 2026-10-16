import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStatus } from '../contexts/AppStatusContext';
import { colors } from '../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Item = { pad: string; href: string; label: string; icon: IconName; iconAan: IconName; badge?: number };

// Donkere navigatiebalk met blauwe actieve "pil", zoals de mobiele navigatie van de webapp.
// Staat onder de tabs én onder alle detailschermen, zodat je overal kunt wisselen.
export function BottomNav() {
    const pad = usePathname();
    const insets = useSafeAreaInsets();
    const { ruilBadge, ongelezenBerichten, beheerOpen } = useAppStatus();

    const items: Item[] = [
        { pad: '/', href: '/(app)/(tabs)', label: 'Home', icon: 'home-outline', iconAan: 'home' },
        { pad: '/rooster', href: '/(app)/(tabs)/rooster', label: 'Rooster', icon: 'calendar-outline', iconAan: 'calendar' },
        { pad: '/verlof', href: '/(app)/(tabs)/verlof', label: 'Verlof', icon: 'airplane-outline', iconAan: 'airplane' },
        { pad: '/ruilbeurs', href: '/(app)/(tabs)/ruilbeurs', label: 'Ruilbeurs', icon: 'swap-horizontal', iconAan: 'swap-horizontal', badge: ruilBadge },
        { pad: '/meer', href: '/(app)/(tabs)/meer', label: 'Menu', icon: 'grid-outline', iconAan: 'grid', badge: ongelezenBerichten + beheerOpen },
    ];

    // Detailschermen (beheer, berichten, profiel, ...) bereik je via het menu: daar licht Menu op.
    const actief = items.find((i) => (i.pad === '/' ? pad === '/' : pad === i.pad || pad.startsWith(`${i.pad}/`)))?.pad ?? '/meer';

    return (
        <View style={[styles.balk, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {items.map((i) => {
                const aan = actief === i.pad;
                return (
                    <Pressable
                        key={i.pad}
                        onPress={() => {
                            if (pad !== i.pad) router.navigate(i.href as any);
                        }}
                        style={styles.item}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: aan }}
                        accessibilityLabel={i.label}
                    >
                        <View style={[styles.pil, aan && styles.pilAan]}>
                            <Ionicons name={aan ? i.iconAan : i.icon} size={20} color={aan ? '#fff' : colors.subtle} />
                            {i.badge ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeTekst}>{i.badge > 9 ? '9+' : i.badge}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={[styles.label, aan && { color: '#fff' }]}>{i.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    balk: { flexDirection: 'row', backgroundColor: colors.ink, paddingTop: 8 },
    item: { flex: 1, alignItems: 'center', gap: 3 },
    pil: { width: 46, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pilAan: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, color: colors.subtle },
    badge: {
        position: 'absolute',
        top: -4,
        right: 2,
        backgroundColor: '#ef4444',
        borderRadius: 999,
        minWidth: 17,
        height: 17,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.ink,
    },
    badgeTekst: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
