import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Droplets, Leaf, AlertCircle } from 'lucide-react-native';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function GardenScreen() {
    const insets = useSafeAreaInsets();
    const { garden, updatePlantWatering } = useApp();

    const handleWater = (id: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        updatePlantWatering(id);
    };

    const handleAddPlant = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push('/');
    };

    const getDaysUntilWatering = (nextWateringDue?: number) => {
        if (!nextWateringDue) return null;
        const days = Math.ceil((nextWateringDue - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return Colors.success;
            case 'warning':
                return Colors.warning;
            case 'critical':
                return Colors.error;
            default:
                return Colors.gray.medium;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>My Garden</Text>
                    <Text style={styles.subtitle}>{garden.length} plants in your collection</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddPlant}>
                    <Plus size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            {garden.length === 0 ? (
                <View style={styles.emptyState}>
                    <Leaf size={64} color={Colors.gray.medium} strokeWidth={1.5} />
                    <Text style={styles.emptyTitle}>Your Garden is Empty</Text>
                    <Text style={styles.emptyText}>
                        Add plants to your garden to track their care and health
                    </Text>
                    <TouchableOpacity style={styles.scanButton} onPress={handleAddPlant}>
                        <Plus size={20} color={Colors.white} />
                        <Text style={styles.scanButtonText}>Add Your First Plant</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.healthCard}>
                        <Text style={styles.healthTitle}>Plant Health Diagnosis</Text>
                        <Text style={styles.healthText}>
                            Is your plant sick? Upload a photo to diagnose issues
                        </Text>
                        <TouchableOpacity style={styles.diagnoseButton}>
                            <AlertCircle size={20} color={Colors.primary} />
                            <Text style={styles.diagnoseButtonText}>Diagnose Plant</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.plantsContainer}>
                        {garden.map((plant) => {
                            const daysUntilWatering = getDaysUntilWatering(plant.nextWateringDue);
                            const needsWater = daysUntilWatering !== null && daysUntilWatering <= 0;

                            return (
                                <View key={plant.id} style={styles.plantCard}>
                                    <Image source={{ uri: plant.imageUri }} style={styles.plantImage} />

                                    <View style={styles.plantContent}>
                                        <View style={styles.plantHeader}>
                                            <View style={styles.plantTitleContainer}>
                                                <Text style={styles.plantName}>{plant.commonName}</Text>
                                                <Text style={styles.plantScientific}>{plant.scientificName}</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.healthDot,
                                                    { backgroundColor: getHealthColor(plant.healthStatus) },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.careInfo}>
                                            <View style={styles.careItem}>
                                                <Droplets size={16} color={needsWater ? Colors.error : Colors.primary} />
                                                <Text style={[styles.careText, needsWater && styles.careTextWarning]}>
                                                    {needsWater
                                                        ? 'Water now!'
                                                        : daysUntilWatering !== null
                                                            ? `Water in ${daysUntilWatering} days`
                                                            : 'Set watering schedule'}
                                                </Text>
                                            </View>

                                            {plant.lastWatered && (
                                                <Text style={styles.lastWatered}>
                                                    Last watered: {new Date(plant.lastWatered).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.waterButton, needsWater && styles.waterButtonUrgent]}
                                            onPress={() => handleWater(plant.id)}
                                        >
                                            <Droplets size={18} color={Colors.white} />
                                            <Text style={styles.waterButtonText}>
                                                {needsWater ? 'Water Now' : 'Mark as Watered'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '700' as const,
        color: Colors.black,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.gray.dark,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    healthCard: {
        marginHorizontal: 24,
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
        backgroundColor: Colors.white,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: Colors.black,
        marginBottom: 8,
    },
    healthText: {
        fontSize: 14,
        color: Colors.gray.dark,
        marginBottom: 16,
        lineHeight: 20,
    },
    diagnoseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    diagnoseButtonText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.primary,
    },
    plantsContainer: {
        paddingHorizontal: 24,
        gap: 16,
    },
    plantCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    plantImage: {
        width: 120,
        height: '100%',
    },
    plantContent: {
        flex: 1,
        padding: 16,
    },
    plantHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    plantTitleContainer: {
        flex: 1,
    },
    plantName: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: Colors.black,
        marginBottom: 4,
    },
    plantScientific: {
        fontSize: 14,
        fontStyle: 'italic',
        color: Colors.gray.dark,
    },
    healthDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    careInfo: {
        marginBottom: 12,
    },
    careItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    careText: {
        fontSize: 14,
        color: Colors.gray.dark,
    },
    careTextWarning: {
        color: Colors.error,
        fontWeight: '600' as const,
    },
    lastWatered: {
        fontSize: 12,
        color: Colors.gray.medium,
        marginTop: 4,
    },
    waterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.primary,
    },
    waterButtonUrgent: {
        backgroundColor: Colors.error,
    },
    waterButtonText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: Colors.white,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700' as const,
        color: Colors.black,
        marginTop: 24,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.gray.dark,
        textAlign: 'center',
        marginBottom: 24,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.white,
    },
});
