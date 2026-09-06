import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import { colors } from '../lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function PrimaryButton({
    title,
    onPress,
    loading,
    disabled,
    variant = 'primary',
}: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'danger' | 'outline';
}) {
    const isDisabled = disabled || loading;
    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.button,
                variant === 'danger' && styles.buttonDanger,
                variant === 'outline' && styles.buttonOutline,
                isDisabled && styles.buttonDisabled,
                pressed && !isDisabled && { opacity: 0.85 },
            ]}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
            ) : (
                <Text style={[styles.buttonText, variant === 'outline' && styles.buttonTextOutline]}>{title}</Text>
            )}
        </Pressable>
    );
}

export function TextField(props: TextInputProps & { label?: string }) {
    const { label, style, ...rest } = props;
    return (
        <View style={{ marginBottom: 14 }}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor="#94a3b8"
                style={[styles.input, style]}
                {...rest}
            />
        </View>
    );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'danger' | 'warning' }) {
    const toneStyles: Record<string, ViewStyle> = {
        default: { backgroundColor: colors.primarySoft },
        success: { backgroundColor: colors.successSoft },
        danger: { backgroundColor: colors.dangerSoft },
        warning: { backgroundColor: colors.warningSoft },
    };
    const textColor: Record<string, string> = {
        default: colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
    };
    return (
        <View style={[styles.badge, toneStyles[tone]]}>
            <Text style={[styles.badgeText, { color: textColor[tone] }]}>{label}</Text>
        </View>
    );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{title}</Text>
            {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
        </View>
    );
}

export function CenteredLoader() {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}

export function ErrorBanner({ message }: { message: string }) {
    if (!message) return null;
    return (
        <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonDanger: { backgroundColor: colors.danger },
    buttonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    buttonTextOutline: { color: colors.primary },
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        backgroundColor: '#fff',
        color: '#0f172a',
    },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
    badgeText: { fontSize: 12, fontWeight: '700' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorBanner: {
        backgroundColor: colors.dangerSoft,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});
