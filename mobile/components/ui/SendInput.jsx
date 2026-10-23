import { View, TouchableOpacity, TextInput, Alert, ScrollView, Text, Keyboard, Platform } from 'react-native';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SocketIoStore } from '../../store/socketioStore';
import { useSendMessage } from '../../store/transtack/query';


const EMOJIS = ['😂', '❤️', '🔥', '😍', '😊', '🙏', '👍', '😭', '✨', '🥰'];

export default function SendInput({ chatId }) {
    const [text, setText] = useState("");
    const insets = useSafeAreaInsets();
    const { i18n } = useTranslation();
    const socket = SocketIoStore((s) => s.socket);
    const typingTimeoutRef = useRef(null);
    const { sendMessage, isPending, error } = useSendMessage();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        
        const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
        
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);


    // cleanup typing indicator on unmount
    useEffect(() => {
        return () => {
            if (socket?.connected && chatId) {
                socket.emit("typing", { chatId, isTyping: false });
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [socket, chatId]);

    const sendEmoji = (emoji) => {
        try {
            if (!chatId) return;
            sendMessage({ chatId, text: emoji });
        } catch (error) {
            console.log(error);
        }
    };

    const handleSend = () => {
        try {
            if (!text.trim() || !chatId) return;

            sendMessage({ chatId, text: text.trim() });
            setText("");
            if (socket?.connected) {
                socket.emit("typing", { chatId, isTyping: false });
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleTextChange = useCallback((value) => {
        setText(value);

        if (!chatId) return;

        // Emit typing = true via socket
        if (socket?.connected) {
            socket.emit("typing", { chatId, isTyping: true });
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
            if (socket?.connected) {
                socket.emit("typing", { chatId, isTyping: false });
            }
        }, 2000);
    }, [socket, chatId]);

    if (error) return Alert.alert("Error", error.message);

    return (
        <View 
            className="flex-col w-full"
            style={{ paddingBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom, 0) }}
        >
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 10, gap: 15, paddingBottom: 5 }}
                >
                    {EMOJIS.map((emoji, idx) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => sendEmoji(emoji)}
                            disabled={isPending}
                            className="p-2"
                        >
                            <Text className="text-2xl">{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View className='flex-row items-center gap-2 px-2 mb-4 '>
                <TextInput
                    placeholder={i18n.language === "ar" ? "اكتب رسالتك" : "Type your message..."}
                    value={text}
                    multiline
                    // Remove or increase maxLength to something like 1000
                    maxLength={1000}
                    onChangeText={handleTextChange}
                    // This allows the input to grow but stops at a certain height
                    style={{ maxHeight: 120, textAlignVertical: 'top' }}
                    className='flex-1 p-2 py-3 border-2 border-gray-300/50 rounded-3xl placeholder:text-gray-400'
                />
                <TouchableOpacity
                    disabled={isPending}
                    className=' flex items-center justify-center bg-[#b88144] w-12 h-12 rounded-full'
                    onPress={handleSend}>
                    <Ionicons
                        name="send"
                        size={24}
                        color="white"
                        style={{
                            transform: [{ scaleX: i18n.language === "ar" ? -1 : 1 }]
                        }}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}