import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { mongoClient } from '@/lib/mongodb';
import { logger } from '@/utils/logger';
import { PaymentError } from '@/types/errors';

interface PaystackPaymentProps {
    visible: boolean;
    onClose: () => void;
    planType: 'basic' | 'premium';
    billingCycle: 'monthly' | 'yearly';
}

const PLANS = {
    basic: {
        monthly: { amount: 299, discount: 0 },
        yearly: { amount: 3228, discount: 10 },
    },
    premium: {
        monthly: { amount: 499, discount: 0 },
        yearly: { amount: 5276, discount: 12 },
    },
};

export default function PaystackPayment({ visible, onClose, planType, billingCycle }: PaystackPaymentProps) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const plan = PLANS[planType][billingCycle];
    const amount = plan.amount * 100;

    const handlePayment = async () => {
        setLoading(true);
        try {
            if (!user) throw new Error('No user logged in');

            const startDate = new Date();
            const endDate = new Date();
            if (billingCycle === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            await mongoClient.createSubscription({
                userId: user.id,
                planType,
                status: 'active',
                startDate,
                endDate,
                paymentReference: `PAY_${Date.now()}`,
            });

            Toast.show({
                type: 'success',
                text1: 'Payment Successful!',
                text2: 'Your subscription is now active',
                position: 'top',
            });

            onClose();
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error saving subscription', err, {
                userId: user?.id,
                planType,
                billingCycle,
            });

            Toast.show({
                type: 'error',
                text1: 'Payment Failed',
                text2: err.message || 'Please try again',
                position: 'top',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Complete Payment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.black} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.planCard}>
                            <Text style={styles.planName}>
                                {planType === 'basic' ? 'Basic Plan' : 'Premium Plan'}
                            </Text>
                            <Text style={styles.billingCycle}>
                                {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                            </Text>
                            <Text style={styles.amount}>₦{(amount / 100).toFixed(2)}</Text>
                            {plan.discount > 0 && (
                                <Text style={styles.discount}>Save {plan.discount}%</Text>
                            )}
                        </View>

                        <View style={styles.features}>
                            <Text style={styles.featuresTitle}>What you get:</Text>
                            {planType === 'basic' ? (
                                <>
                                    <Text style={styles.feature}>• 50 plant scans per day</Text>
                                    <Text style={styles.feature}>• Basic plant care guides</Text>
                                    <Text style={styles.feature}>• Ad-free experience</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.feature}>• Unlimited plant scans</Text>
                                    <Text style={styles.feature}>• Advanced care guides</Text>
                                    <Text style={styles.feature}>• AR plant visualization</Text>
                                    <Text style={styles.feature}>• Health diagnosis</Text>
                                    <Text style={styles.feature}>• Priority support</Text>
                                    <Text style={styles.feature}>• Ad-free experience</Text>
                                </>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.payButton}
                            onPress={handlePayment}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.payButtonText}>Pay with Paystack</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.note}>
                            Note: This is a demo payment. In production, this will integrate with Paystack payment gateway.
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray.light,
    },
    title: {
        fontSize: 20,
        fontWeight: '700' as const,
        color: Colors.black,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    planCard: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    planName: {
        fontSize: 24,
        fontWeight: '700' as const,
        color: Colors.white,
        marginBottom: 4,
    },
    billingCycle: {
        fontSize: 16,
        color: Colors.white,
        opacity: 0.9,
        marginBottom: 16,
    },
    amount: {
        fontSize: 36,
        fontWeight: '700' as const,
        color: Colors.white,
    },
    discount: {
        fontSize: 14,
        color: Colors.accent,
        backgroundColor: Colors.white,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        fontWeight: '600' as const,
    },
    features: {
        marginBottom: 24,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: Colors.black,
        marginBottom: 12,
    },
    feature: {
        fontSize: 15,
        color: Colors.gray.dark,
        marginBottom: 8,
        lineHeight: 22,
    },
    payButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    payButtonText: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.white,
    },
    note: {
        fontSize: 12,
        color: Colors.gray.medium,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
