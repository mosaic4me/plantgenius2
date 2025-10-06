import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from 'react-native-toast-message';
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { initializeSentry } from "@/utils/sentry";

// Initialize Sentry before app renders
initializeSentry();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
    return (
        <Stack screenOptions={{ headerBackTitle: "Back" }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="results" options={{ headerShown: false, presentation: "card" }} />
            <Stack.Screen name="analyzing" options={{ headerShown: false, presentation: "card" }} />
            <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
            <Stack.Screen name="contact" options={{ headerShown: false, presentation: "card" }} />
        </Stack>
    );
}

export default function RootLayout() {
    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <AppProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <RootLayoutNav />
                            <Toast />
                        </GestureHandlerRootView>
                    </AppProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
