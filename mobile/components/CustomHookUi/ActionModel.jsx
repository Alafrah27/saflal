import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';

export default function ActionModal({
    visible,
    onClose,
    title,
    cancelLabel,
    description, // Added description for clarity
    onHandleFn,
    actionLabel,  // e.g., "Logout", "Delete", "Confirm"
    isDangerous = false,
    isLoading = false,
    error,
    isArabic = false,
    closeOnConfirm = true,
    actionDisabled = false,
    children,
}) {
    if (!visible) return null;
    const close = () => { if (!isLoading) onClose(); };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={close}
        >
            {/* Backdrop */}
            <Pressable
                className="flex-1 bg-black/60 justify-center items-center px-6"
                onPress={close}
            >
                {/* Modal Card - Stop Propagation prevents closing when clicking the card itself */}
                <Pressable accessibilityViewIsModal onPress={event => event.stopPropagation()} className="w-full bg-white rounded-[30px] p-6 shadow-xl overflow-hidden" style={{ maxWidth: 440 }}>

                    <View className="items-center mb-6">
                        <Text accessibilityRole="header" className="text-xl font-bold text-slate-900 text-center mb-2">
                            {title}
                        </Text>
                        {description && (
                            <Text className="text-slate-500 text-center text-[14px]">
                                {description}
                            </Text>
                        )}
                    </View>
                    {children}
                    {!!error && <Text accessibilityRole="alert" style={{ color: '#dc2626', textAlign: 'center', marginBottom: 16 }}>{error}</Text>}

                    <View className="flex-row gap-3" style={{ flexDirection: isArabic ? 'row-reverse' : 'row' }}>
                        {/* Cancel Button */}
                        <TouchableOpacity
                            accessibilityRole="button" accessibilityLabel={cancelLabel} disabled={isLoading}
                            onPress={close}
                            className="flex-1 py-4 rounded-2xl bg-slate-100 items-center"
                        >
                            <Text className="text-slate-600 font-bold text-base">
                                {cancelLabel}
                            </Text>
                        </TouchableOpacity>

                        {/* Action Button */}
                        <TouchableOpacity
                            accessibilityRole="button" accessibilityLabel={actionLabel}
                            accessibilityState={{ disabled: isLoading || actionDisabled, busy: isLoading }} disabled={isLoading || actionDisabled}
                            onPress={() => {
                                if (isLoading || actionDisabled) return;
                                onHandleFn();
                                if (closeOnConfirm) onClose();
                            }}
                            className={`flex-1 py-4 rounded-2xl items-center ${isDangerous ? 'bg-red-500' : 'bg-[#b88144]'
                                }`}
                        >
                            {isLoading && <ActivityIndicator color="white" />}
                            <Text className="text-white font-bold text-base">
                                {actionLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
