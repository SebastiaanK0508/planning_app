import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export function TopBar({
    title,
    subtitle,
    right,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

export function IconButton({ name, onPress, badge }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number }) {
    return (
        <Pressable onPress={onPress} style={styles.iconButton}>
            <Ionicons name={name} size={22} color={colors.primary} />
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
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    iconButton: { padding: 6 },
    badgeDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.danger,
        borderRadius: 999,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeDotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
