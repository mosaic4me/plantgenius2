import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
    Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function ContactScreen() {
    const insets = useSafeAreaInsets();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!subject || !message) {
            if (Platform.OS === 'web') {
                alert('Please fill in all fields');
            } else {
                Alert.alert('Error', 'Please fill in all fields');
            }
            return;
        }

        setLoading(true);
        try {
            const emailUrl = `mailto:info@programmerscourt.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            await Linking.openURL(emailUrl);

            setSubject('');
            setMessage('');

            if (Platform.OS === 'web') {
                alert('Email client opened! Please send your message.');
            } else {
                Alert.alert('Success', 'Email client opened! Please send your message.');
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                alert('Failed to open email client');
            } else {
                Alert.alert('Error', 'Failed to open email client');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contact Us</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                <View style={styles.content}>
                    <View style={styles.infoCard}>
                        <Mail size={24} color={Colors.primary} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>Email Us</Text>
                            <Text style={styles.infoEmail}>info@programmerscourt.com</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Send us a message</Text>

                        <View style={styles.inputContainer}>
                            <MessageSquare size={20} color={Colors.gray.dark} />
                            <TextInput
                                style={styles.input}
                                placeholder="Subject"
                                value={subject}
                                onChangeText={setSubject}
                                placeholderTextColor={Colors.gray.medium}
                            />
                        </View>

                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Your message..."
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                placeholderTextColor={Colors.gray.medium}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSend}
                            disabled={loading}
                        >
                            <Send size={20} color={Colors.white} />
                            <Text style={styles.buttonText}>
                                {loading ? 'Sending...' : 'Send Message'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>Need Help?</Text>
                        <Text style={styles.helpText}>
                            We typically respond within 24 hours. For urgent matters, please email us directly.
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray.light,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: Colors.black,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        padding: 20,
        borderRadius: 16,
        marginBottom: 32,
        gap: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.white,
        marginBottom: 4,
    },
    infoEmail: {
        fontSize: 14,
        color: Colors.white,
        opacity: 0.9,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700' as const,
        color: Colors.black,
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: Colors.gray.light,
        gap: 12,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        paddingVertical: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: Colors.black,
    },
    textArea: {
        minHeight: 120,
        paddingVertical: 0,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: Colors.white,
    },
    helpSection: {
        backgroundColor: Colors.gray.light,
        padding: 20,
        borderRadius: 12,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: Colors.black,
        marginBottom: 8,
    },
    helpText: {
        fontSize: 14,
        color: Colors.gray.dark,
        lineHeight: 20,
    },
});
