import { Stack, useSegments } from 'expo-router';
import { View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';
import { colors } from '../../src/lib/theme';

export default function AppLayout() {
    const segments = useSegments();
    // Binnen de tabs tekent de Tabs-navigator de balk al; op alle andere schermen doen we het hier.
    const inTabs = (segments as string[])[1] === '(tabs)';
    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack
                screenOptions={{
                    headerTintColor: colors.ink,
                    headerTitleStyle: { fontWeight: '900', color: colors.ink },
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    contentStyle: { backgroundColor: colors.bg },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="verlof/nieuw" options={{ title: 'Verlof aanvragen', presentation: 'modal' }} />
                <Stack.Screen name="berichten/index" options={{ title: 'Berichten' }} />
                <Stack.Screen name="berichten/nieuw" options={{ title: 'Nieuw bericht', presentation: 'modal' }} />
                <Stack.Screen name="berichten/[uuid]" options={{ title: 'Bericht' }} />
                <Stack.Screen name="profiel/index" options={{ title: 'Mijn profiel' }} />
                <Stack.Screen name="profiel/wachtwoord" options={{ title: 'Wachtwoord wijzigen' }} />
                <Stack.Screen name="beheer/index" options={{ title: 'Dashboard' }} />
                <Stack.Screen name="beheer/team-rooster" options={{ title: 'Team rooster' }} />
                <Stack.Screen name="beheer/planning" options={{ title: 'Planning' }} />
                <Stack.Screen name="beheer/ruil-verlof" options={{ title: 'Ruil & verlof' }} />
                <Stack.Screen name="beheer/uren" options={{ title: 'Uren & correcties' }} />
                <Stack.Screen name="beheer/mededelingen" options={{ title: 'Mededelingen' }} />
                <Stack.Screen name="beheer/medewerkers" options={{ title: 'Medewerkers' }} />
                <Stack.Screen name="beheer/locaties" options={{ title: 'Locaties & afdelingen' }} />
                <Stack.Screen name="beheer/instellingen" options={{ title: 'Instellingen' }} />
                <Stack.Screen name="beheer/abonnement" options={{ title: 'Abonnement' }} />
                <Stack.Screen name="admin/index" options={{ title: 'Platformbeheer' }} />
                <Stack.Screen name="admin/organisaties" options={{ title: 'Organisaties' }} />
                <Stack.Screen name="admin/tickets" options={{ title: 'Alle tickets' }} />
                <Stack.Screen name="kennisbank" options={{ title: 'Kennisbank' }} />
                <Stack.Screen name="support/index" options={{ title: 'Support' }} />
                <Stack.Screen name="support/nieuw" options={{ title: 'Nieuw ticket', presentation: 'modal' }} />
                <Stack.Screen name="support/[uuid]" options={{ title: 'Ticket' }} />
            </Stack>
            {inTabs ? null : <BottomNav />}
        </View>
    );
}
