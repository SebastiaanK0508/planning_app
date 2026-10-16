import { Tabs } from 'expo-router';
import { BottomNav } from '../../../src/components/BottomNav';

// De tabbalk zelf is BottomNav: dezelfde balk staat ook onder alle detailschermen (zie ../_layout.tsx).
export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />}>
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="rooster" options={{ title: 'Rooster' }} />
            <Tabs.Screen name="verlof" options={{ title: 'Verlof' }} />
            <Tabs.Screen name="ruilbeurs" options={{ title: 'Ruilbeurs' }} />
            <Tabs.Screen name="meer" options={{ title: 'Menu' }} />
        </Tabs>
    );
}
