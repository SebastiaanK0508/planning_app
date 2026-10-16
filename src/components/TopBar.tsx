import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

// Paginakop in de stijl van de witte .page-header op het web: icoontegel + zware titel.
export function TopBar({
    title,
    subtitle,
    eyebrow,
    icon,
    right,
}: {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    right?: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
            {icon ? (
                <View style={styles.iconTile}>
                    <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
            ) : null}
            <View style={{ flex: 1 }}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {right ? <View style={styles.right}>{right}</View> : null}
        </View>
    );
}

export function IconButton({ name, onPress, badge }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number }) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.primarySoft }]} hitSlop={4}>
            <Ionicons name={name} size={20} color={colors.text} />
            {badge ? (
                <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
    },
    iconTile: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyebrow: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 2 },
    title: { fontSize: 24, fontWeight: '900', color: colors.ink, letterSpacing: -0.8 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    right: { flexDirection: 'row', gap: 6 },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: colors.slateSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeDot: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#ef4444',
        borderRadius: 999,
        minWidth: 17,
        height: 17,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
