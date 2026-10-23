/**
 * CrashScreen Component for Luqya Chat App
 * 
 * A user-friendly fallback UI displayed when the app crashes.
 * Provides retry functionality and support contact option.
 */

import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CrashScreen - Fallback UI for error boundary
 * @param {Object} props
 * @param {Function} props.onRetry - Callback to reset error boundary
 * @param {Error} props.error - The error that caused the crash (optional)
 */
export default function CrashScreen({ onRetry, error }) {
    return (
        <View style={styles.container}>
            {/* Error Icon */}
            <View style={styles.iconContainer}>
                <Ionicons name="warning-outline" size={80} color="#FF6B6B" />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>Oops! Something went wrong</Text>

            {/* Error Description */}
            <Text style={styles.description}>
                We apologize for the inconvenience. The app encountered an unexpected error.
            </Text>

            {/* Show error message in development */}
            {__DEV__ && error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText} numberOfLines={3}>
                        {error.message || 'Unknown error'}
                    </Text>
                </View>
            )}

            {/* Retry Button */}
            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.8}
            >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {/* Contact Support */}
            <TouchableOpacity
                style={styles.supportButton}
                activeOpacity={0.7}
            >
                <Ionicons name="mail-outline" size={18} color="#666" />
                <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>

            {/* App branding */}
            <Text style={styles.appName}>Luqya</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFF0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    errorBox: {
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFECEC',
    },
    errorText: {
        fontSize: 12,
        color: '#CC4444',
        fontFamily: 'monospace',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A90D9',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
        width: '100%',
        shadowColor: '#4A90D9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        gap: 6,
    },
    supportButtonText: {
        fontSize: 14,
        color: '#666666',
    },
    appName: {
        position: 'absolute',
        bottom: 32,
        fontSize: 14,
        color: '#CCCCCC',
        fontWeight: '500',
    },
});
