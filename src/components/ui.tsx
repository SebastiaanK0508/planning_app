import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{children}</Text>
            {right}
        </View>
    );
}

/** Klein blauw kopje boven een titel, zoals de "eyebrow"-labels op het web. */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
    return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'soft' | 'dark' | 'danger' | 'dangerSolid' | 'success';

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: '#fff' },
    secondary: { bg: '#fff', fg: colors.text, border: colors.border },
    outline: { bg: '#fff', fg: colors.primary, border: colors.primaryBorder },
    soft: { bg: colors.primarySoft, fg: colors.primary },
    dark: { bg: colors.ink, fg: '#fff' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: '#ffe4e6' },
    dangerSolid: { bg: colors.danger, fg: '#fff' },
    success: { bg: colors.success, fg: '#fff' },
};

export function PrimaryButton({
    title,
    onPress,
    loading,
    disabled,
    variant = 'primary',
    icon,
    small,
    style,
}: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: ButtonVariant;
    icon?: IconName;
    small?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const isDisabled = disabled || loading;
    const v = buttonVariants[variant];
    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.button,
                small && styles.buttonSmall,
                { backgroundColor: v.bg, borderColor: v.border || v.bg },
                variant === 'primary' && styles.buttonPrimaryShadow,
                isDisabled && styles.buttonDisabled,
                pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={v.fg} />
            ) : (
                <>
                    {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={v.fg} style={{ marginRight: 7 }} /> : null}
                    <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.fg }]} numberOfLines={1}>
                        {title}
                    </Text>
                </>
            )}
        </Pressable>
    );
}

export function IconButtonSmall({
    name,
    onPress,
    tone = 'default',
    disabled,
}: {
    name: IconName;
    onPress: () => void;
    tone?: 'default' | 'danger' | 'primary';
    disabled?: boolean;
}) {
    const fg = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.textMuted;
    const bg = tone === 'danger' ? colors.dangerSoft : tone === 'primary' ? colors.primarySoft : colors.slateSoft;
    return (
        <Pressable onPress={onPress} disabled={disabled} style={[styles.iconBtnSmall, { backgroundColor: bg }, disabled && { opacity: 0.5 }]}>
            <Ionicons name={name} size={16} color={fg} />
        </Pressable>
    );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
    return <Text style={styles.label}>{children}</Text>;
}

export function TextField(props: TextInputProps & { label?: string; hint?: string }) {
    const { label, hint, style, onFocus, onBlur, ...rest } = props;
    const [focus, setFocus] = useState(false);
    return (
        <View style={{ marginBottom: 14 }}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <TextInput
                placeholderTextColor={colors.subtle}
                style={[styles.input, focus && styles.inputFocus, style]}
                onFocus={(e) => {
                    setFocus(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setFocus(false);
                    onBlur?.(e);
                }}
                {...rest}
            />
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
}

export function PasswordField(props: Omit<TextInputProps, 'style'> & { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
    const { label, hint, style, ...rest } = props;
    const [zichtbaar, setZichtbaar] = useState(false);
    const [focus, setFocus] = useState(false);
    return (
        <View style={{ marginBottom: 14 }}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <View style={[styles.input, styles.passwordWrap, focus && styles.inputFocus, style]}>
                <TextInput
                    placeholderTextColor={colors.subtle}
                    secureTextEntry={!zichtbaar}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.passwordInput}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    {...rest}
                />
                <Pressable onPress={() => setZichtbaar((z) => !z)} hitSlop={8} accessibilityLabel={zichtbaar ? 'Verberg wachtwoord' : 'Toon wachtwoord'}>
                    <Ionicons name={zichtbaar ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.subtle} />
                </Pressable>
            </View>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
    return (
        <Pressable onPress={() => onChange(!checked)} style={styles.checkRow} hitSlop={4}>
            <View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
            <View style={{ flex: 1 }}>{children}</View>
        </Pressable>
    );
}

export function SearchField({ value, onChangeText, placeholder = 'Zoeken...', style }: {
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <View style={[styles.search, style]}>
            <Ionicons name="search" size={16} color={colors.subtle} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.subtle}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
            />
        </View>
    );
}

/** Datum- of tijdveld met native picker (iOS inline, Android dialoog). */
export function DateField({
    label,
    value,
    onChange,
    mode = 'date',
    minimumDate,
    style,
}: {
    label?: string;
    value: Date;
    onChange: (d: Date) => void;
    mode?: 'date' | 'time';
    minimumDate?: Date;
    style?: StyleProp<ViewStyle>;
}) {
    const [open, setOpen] = useState(false);
    const pad = (n: number) => String(n).padStart(2, '0');
    const tekst =
        mode === 'time'
            ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
            : value.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    return (
        <View style={[{ marginBottom: 14 }, style]}>
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            <Pressable style={[styles.input, styles.dateField, open && styles.inputFocus]} onPress={() => setOpen((o) => !o)}>
                <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={16} color={colors.primary} />
                <Text style={styles.dateFieldText}>{tekst}</Text>
            </Pressable>
            {open ? (
                <DateTimePicker
                    value={value}
                    mode={mode}
                    is24Hour
                    locale="nl-NL"
                    minimumDate={minimumDate}
                    minuteInterval={mode === 'time' ? 5 : undefined}
                    display={Platform.OS === 'ios' ? (mode === 'time' ? 'spinner' : 'inline') : 'default'}
                    onChange={(event, selected) => {
                        if (Platform.OS !== 'ios') setOpen(false);
                        if (event.type === 'dismissed') return;
                        if (selected) onChange(selected);
                    }}
                />
            ) : null}
        </View>
    );
}

export type BadgeTone =
    | 'default'
    | 'blue'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'purple'
    | 'dark'
    // oude namen, blijven werken
    | 'success'
    | 'danger'
    | 'warning';

const badgeTones: Record<string, { bg: string; fg: string; border: string }> = {
    default: { bg: colors.slateSoft, fg: '#475569', border: colors.border },
    blue: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primaryBorder },
    emerald: { bg: colors.successSoft, fg: '#047857', border: colors.successBorder },
    amber: { bg: colors.warningSoft, fg: '#b45309', border: colors.warningBorder },
    rose: { bg: colors.dangerSoft, fg: '#be123c', border: colors.dangerBorder },
    purple: { bg: colors.violetSoft, fg: '#7e22ce', border: colors.violetBorder },
    dark: { bg: colors.ink, fg: '#fff', border: colors.ink },
};
badgeTones.success = badgeTones.emerald;
badgeTones.danger = badgeTones.rose;
badgeTones.warning = badgeTones.amber;

export function Badge({ label, tone = 'default', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
    const t = badgeTones[tone] || badgeTones.default;
    return (
        <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
            {icon ? <Ionicons name={icon} size={10} color={t.fg} style={{ marginRight: 4 }} /> : null}
            <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
        </View>
    );
}

export type TileTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate' | 'dark';

const tileTones: Record<TileTone, { bg: string; fg: string }> = {
    blue: { bg: colors.primarySoft, fg: colors.primary },
    emerald: { bg: colors.successSoft, fg: colors.success },
    amber: { bg: colors.warningSoft, fg: colors.warning },
    rose: { bg: colors.dangerSoft, fg: colors.danger },
    purple: { bg: colors.violetSoft, fg: colors.violet },
    slate: { bg: colors.slateSoft, fg: '#475569' },
    dark: { bg: colors.ink, fg: '#fff' },
};

export function IconTile({ name, tone = 'blue', size = 40 }: { name: IconName; tone?: TileTone; size?: number }) {
    const t = tileTones[tone];
    return (
        <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.35, backgroundColor: t.bg }]}>
            <Ionicons name={name} size={size * 0.48} color={t.fg} />
        </View>
    );
}

/** Kaartkop zoals .wp-card-header op het web: icoontegel + titel + optionele actie rechts. */
export function CardHeader({
    icon,
    tone = 'blue',
    title,
    subtitle,
    right,
}: {
    icon?: IconName;
    tone?: TileTone;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) {
    return (
        <View style={styles.cardHeader}>
            {icon ? <IconTile name={icon} tone={tone} size={38} /> : null}
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

export function Segmented<T extends string>({
    options,
    value,
    onChange,
    style,
}: {
    options: { value: T; label: string; count?: number }[];
    value: T;
    onChange: (v: T) => void;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <View style={[styles.segment, style]}>
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                            {o.label}
                            {o.count !== undefined ? ` · ${o.count}` : ''}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
    return (
        <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
            {icon ? <Ionicons name={icon} size={13} color={active ? '#fff' : colors.textMuted} style={{ marginRight: 5 }} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </Pressable>
    );
}

export function ChipRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {children}
        </ScrollView>
    );
}

export function SwitchRow({
    label,
    description,
    value,
    onValueChange,
    disabled,
}: {
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{label}</Text>
                {description ? <Text style={styles.switchDesc}>{description}</Text> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ true: colors.primary, false: '#cbd5e1' }}
                thumbColor="#fff"
                ios_backgroundColor="#cbd5e1"
            />
        </View>
    );
}

export function StatTile({
    label,
    value,
    icon,
    tone = 'blue',
    style,
    onPress,
}: {
    label: string;
    value: string | number;
    icon?: IconName;
    tone?: TileTone;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}) {
    const inner = (
        <>
            {icon ? <IconTile name={icon} tone={tone} size={34} /> : null}
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </>
    );
    if (onPress) {
        return (
            <Pressable onPress={onPress} style={[styles.card, styles.statTile, style]}>
                {inner}
            </Pressable>
        );
    }
    return <View style={[styles.card, styles.statTile, style]}>{inner}</View>;
}

export function ProgressBar({ value, color = colors.primary, track = colors.slateSoft, height = 8 }: {
    value: number;
    color?: string;
    track?: string;
    height?: number;
}) {
    const pct = Math.max(0, Math.min(1, value || 0));
    return (
        <View style={{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height }} />
        </View>
    );
}

/** Donkere kaart (slate-900) met blauwe gloed, zoals de urenkaart en verlofsaldo op het web. */
export function HeroCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[styles.hero, style]}>
            <View style={styles.heroGlowBlue} />
            <View style={styles.heroGlowPurple} />
            {children}
        </View>
    );
}

export function EmptyState({ title, subtitle, icon = 'file-tray-outline' }: { title: string; subtitle?: string; icon?: IconName }) {
    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <Ionicons name={icon} size={24} color={colors.subtle} />
            </View>
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
    return <InfoBanner tone="rose" icon="alert-circle" message={message} />;
}

export function InfoBanner({
    message,
    tone = 'blue',
    icon = 'information-circle',
    style,
    action,
}: {
    message: string;
    tone?: 'blue' | 'amber' | 'rose' | 'emerald';
    icon?: IconName;
    style?: StyleProp<ViewStyle>;
    action?: React.ReactNode;
}) {
    const t = {
        blue: { bg: colors.primarySoft, border: colors.primaryBorder, fg: colors.primaryDark },
        amber: { bg: colors.warningSoft, border: colors.warningBorder, fg: '#92400e' },
        rose: { bg: colors.dangerSoft, border: colors.dangerBorder, fg: '#9f1239' },
        emerald: { bg: colors.successSoft, border: colors.successBorder, fg: '#047857' },
    }[tone];
    return (
        <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }, style]}>
            <Ionicons name={icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
                <Text style={[styles.bannerText, { color: t.fg }]}>{message}</Text>
                {action}
            </View>
        </View>
    );
}

export function ListRow({
    icon,
    tone = 'blue',
    title,
    subtitle,
    right,
    onPress,
    danger,
    last,
}: {
    icon?: IconName;
    tone?: TileTone;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    last?: boolean;
}) {
    return (
        <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listRow, !last && styles.listRowBorder, pressed && { backgroundColor: colors.inputBg }]}>
            {icon ? <IconTile name={icon} tone={danger ? 'rose' : tone} size={36} /> : null}
            <View style={{ flex: 1 }}>
                <Text style={[styles.listTitle, danger && { color: colors.danger }]} numberOfLines={1}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text style={styles.listSubtitle} numberOfLines={2}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color="#cbd5e1" /> : null}
        </Pressable>
    );
}

/** Bottom sheet zoals de mobiele modals op het web (radius 28 aan de bovenkant). */
export function Sheet({
    visible,
    onClose,
    title,
    subtitle,
    children,
    footer,
    scroll = true,
}: {
    visible: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    scroll?: boolean;
}) {
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.sheetHandle} />
                    {title ? (
                        <View style={styles.sheetHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetTitle}>{title}</Text>
                                {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
                            </View>
                            <Pressable onPress={onClose} style={styles.sheetClose} hitSlop={8}>
                                <Ionicons name="close" size={18} color={colors.textMuted} />
                            </Pressable>
                        </View>
                    ) : null}
                    {scroll ? (
                        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                            {children}
                        </ScrollView>
                    ) : (
                        children
                    )}
                    {footer ? <View style={{ paddingTop: 12, gap: 10 }}>{footer}</View> : null}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export function Avatar({ uri, naam, size = 40 }: { uri?: string | null; naam?: string; size?: number }) {
    const [failed, setFailed] = useState(false);
    const delen = (naam || '?').trim().split(/\s+/);
    const init = `${delen[0]?.charAt(0) || '?'}${delen.length > 1 ? delen[delen.length - 1].charAt(0) : ''}`.toUpperCase();
    if (uri && !failed) {
        return (
            <Image
                source={{ uri }}
                style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: colors.slateSoft }}
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2.6 }]}>
            <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{init}</Text>
        </View>
    );
}

export const uiStyles = StyleSheet.create({
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    h1: { fontSize: 26, fontWeight: '900', color: colors.ink, letterSpacing: -0.8 },
    h2: { fontSize: 18, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
    h3: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
    body: { fontSize: 14, color: colors.text, lineHeight: 20 },
    muted: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    content: { padding: 16, paddingBottom: 40 },
});

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    card: {
        backgroundColor: '#fff',
        borderRadius: radius.card,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.line,
        ...shadow,
    },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 22, marginHorizontal: 4 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
    eyebrow: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
    button: {
        minHeight: 48,
        borderRadius: radius.button,
        paddingHorizontal: 18,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderWidth: 1,
    },
    buttonSmall: { minHeight: 38, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    buttonPrimaryShadow: { shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
    buttonTextSmall: { fontSize: 11 },
    iconBtnSmall: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 11, fontWeight: '900', color: colors.textMuted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1.2 },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
    input: {
        minHeight: 48,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '600',
        backgroundColor: colors.inputBg,
        color: colors.ink,
    },
    inputFocus: { borderColor: colors.primary, backgroundColor: '#fff' },
    dateField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    passwordWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 },
    passwordInput: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink, paddingVertical: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateFieldText: { fontSize: 15, fontWeight: '700', color: colors.ink },
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink, paddingVertical: 10 },
    badge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    tile: { alignItems: 'center', justifyContent: 'center' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    cardTitle: { fontSize: 17, fontWeight: '900', color: colors.ink, letterSpacing: -0.4 },
    cardSubtitle: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
    segment: { flexDirection: 'row', backgroundColor: colors.slateSoft, borderRadius: 16, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: '#fff', ...shadow, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    segmentText: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    segmentTextActive: { color: colors.primary },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '800', color: colors.text },
    chipTextActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    switchLabel: { fontSize: 14, fontWeight: '800', color: colors.ink },
    switchDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
    statTile: { flex: 1, padding: 14, gap: 4 },
    statValue: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.6, marginTop: 6 },
    statLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    hero: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 20, overflow: 'hidden' },
    heroGlowBlue: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primary, opacity: 0.35, top: -80, right: -50 },
    heroGlowPurple: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: colors.purple, opacity: 0.25, bottom: -70, left: -40 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 24 },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.ink, textAlign: 'center', letterSpacing: -0.3 },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    banner: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
    bannerText: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    listTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
    listSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, maxHeight: '90%' },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
    sheetSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 3, fontWeight: '600' },
    sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.slateSoft, alignItems: 'center', justifyContent: 'center' },
    avatar: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '900' },
});
