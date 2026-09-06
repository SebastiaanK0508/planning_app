import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../../src/lib/theme';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: { borderTopColor: colors.border },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="rooster"
                options={{
                    title: 'Rooster',
                    tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="verlof"
                options={{
                    title: 'Verlof',
                    tabBarIcon: ({ color, size }) => <Ionicons name="airplane" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="ruilbeurs"
                options={{
                    title: 'Ruilbeurs',
                    tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="meer"
                options={{
                    title: 'Meer',
                    tabBarIcon: ({ color, size }) => <Ionicons name="menu" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
