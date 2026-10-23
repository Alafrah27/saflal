import React, { forwardRef, useImperativeHandle, useState, useMemo, useRef } from 'react';
import { Platform, View, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { requireNativeModule } from 'expo-modules-core';

// Conditional import for Android Jetpack Compose to avoid iOS crashes
let ExpoBottomSheet = null;
if (Platform.OS === 'android') {
    try {
        // Verify the Native Kotlin code is actually compiled into this app build
        const isNativeLinked = requireNativeModule('ExpoUI');
        if (isNativeLinked) {
            const Jetpack = require('@expo/ui/jetpack-compose');
            if (Jetpack && Jetpack.BottomSheet) {
                ExpoBottomSheet = Jetpack.BottomSheet;
            }
        }
    } catch (e) {
        console.warn("Native @expo/ui module not found in this build. Falling back to Gorhom.", e);
    }
}

const CustomBottomSheetModal = forwardRef(({ children, ...props }, ref) => {
    const snapPoints = useMemo(() => ['50%', "75%", "96%"], []);
    const [isOpened, setIsOpened] = useState(false);
    const gorhomRef = useRef(null);

    // Provide the identical ref API to parent components
    useImperativeHandle(ref, () => ({
        present: () => {
            if (Platform.OS === 'android' && ExpoBottomSheet) {
                setIsOpened(true);
            } else {
                gorhomRef.current?.present();
            }
        },
        dismiss: () => {
            if (Platform.OS === 'android' && ExpoBottomSheet) {
                setIsOpened(false);
            } else {
                gorhomRef.current?.dismiss();
            }
        }
    }));

    // On Android, use the native Jetpack Compose BottomSheet if available
    if (Platform.OS === 'android' && ExpoBottomSheet) {
        return (
            <ExpoBottomSheet
                isOpened={isOpened}
                onIsOpenedChange={setIsOpened}
                skipPartiallyExpanded={false}
            >
                <View style={{ flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                    <ScrollView 
                        style={{ flex: 1 }} 
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                </View>
            </ExpoBottomSheet>
        );
    }

    // On iOS (or if Expo fails to load), fallback to standard Gorhom BottomSheet
    return (
        <BottomSheetModal
            ref={gorhomRef}
            snapPoints={snapPoints}
            index={0}
            enablePanDownToClose={true}
            handleIndicatorStyle={{ backgroundColor: '#000000' }}
            stackBehavior="push"
            {...props}
        >
            <BottomSheetScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <BottomSheetView style={{ flex: 1 }}>
                    {children}
                </BottomSheetView>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
});

CustomBottomSheetModal.displayName = 'CustomBottomSheetModal';

export default CustomBottomSheetModal; 