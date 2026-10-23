import React, { forwardRef, useState, useMemo } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomBottomSheetModal from "../CustomHookUi/BottomsheetModalCustomHook";
import ActionModal from "../CustomHookUi/ActionModel";
import { useGetUserProfile, useToggleBlockUser } from "../../store/transtack/query";
import { useAuthStore } from "../../store/Store";
import dayjs from "dayjs";
import { useRouter } from "expo-router";

const AVATAR_COLORS = [
    "#F87171", "#60A5FA", "#34D399", "#FBBF24",
    "#A78BFA", "#FB923C", "#F472B6", "#38BDF8",
];

function hashColor(id) {
    if (!id) return AVATAR_COLORS[0];
    const str = String(id);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const UserProfileSheet = forwardRef(({ userId }, ref) => {
    const { user: currentUser, userAuth } = useAuthStore();
    const { data: profile, isLoading } = useGetUserProfile(userId);
    const { mutate: toggleBlock, isPending: isBlocking } = useToggleBlockUser();
    const [showBlockModal, setShowBlockModal] = useState(false);
    const router = useRouter();

    const bgColor = useMemo(() => hashColor(userId), [userId]);

    // Check if this user is blocked by the current user
    const isBlocked = useMemo(() => {
        if (!currentUser?.block || !userId) return false;
        return currentUser.block.includes(userId);
    }, [currentUser?.block, userId]);

    const handleToggleBlock = () => {
        toggleBlock(userId, {
            onSuccess: () => {
                // Refresh the auth store so currentUser.block is up-to-date
                userAuth();
            },
        });
    };

    return (
        <>
            <CustomBottomSheetModal ref={ref}>
                {isLoading ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                        <ActivityIndicator size="large" color="#b88144" />
                    </View>
                ) : profile ? (
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
                        {/* Avatar */}
                        <View style={{ alignItems: "center", marginBottom: 20 }}>
                            {profile.avatar ? (
                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        // Dismiss the bottom sheet so it doesn't stay open behind the new screen
                                        if (ref && ref.current && ref.current.dismiss) {
                                            ref.current.dismiss();
                                        }
                                        router.push({
                                            pathname: "/imageView",
                                            params: { url: profile.avatar }
                                        });
                                    }}
                                >
                                    <Image
                                        source={{ uri: profile.avatar }}
                                        style={{
                                            width: 100,
                                            height: 100,
                                            borderRadius: 50,
                                            borderWidth: 3,
                                            borderColor: "#b88144",
                                        }}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <View
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 50,
                                        backgroundColor: bgColor,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderWidth: 3,
                                        borderColor: "#b88144",
                                    }}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 40 }}>
                                        {profile.FullName?.charAt(0)?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Name */}
                        <Text
                            style={{
                                fontSize: 24,
                                fontWeight: "800",
                                color: "#1A1A2E",
                                textAlign: "center",
                                marginBottom: 4,
                            }}
                        >
                            {profile.FullName}
                        </Text>

                        {/* Email */}
                        <Text
                            style={{
                                fontSize: 14,
                                color: "#94A3B8",
                                textAlign: "center",
                                marginBottom: 24,
                            }}
                        >
                            {profile.email}
                        </Text>

                        {/* Info Cards */}
                        <View
                            style={{
                                backgroundColor: "#F8FAFC",
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 24,
                                gap: 12,
                            }}
                        >
                            {/* Member Since */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        backgroundColor: "#EEF2FF",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "500" }}>
                                        Member Since
                                    </Text>
                                    <Text style={{ fontSize: 15, color: "#1E293B", fontWeight: "600" }}>
                                        {dayjs(profile.createdAt).format("MMMM D, YYYY")}
                                    </Text>
                                </View>
                            </View>

                            {/* Email Row */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        backgroundColor: "#FFF7ED",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Ionicons name="mail-outline" size={20} color="#F59E0B" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: "#94A3B8", fontWeight: "500" }}>
                                        Email
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={{ fontSize: 15, color: "#1E293B", fontWeight: "600" }}
                                    >
                                        {profile.email}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Block / Unblock Button */}
                        <TouchableOpacity
                            onPress={() => setShowBlockModal(true)}
                            disabled={isBlocking}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                paddingVertical: 16,
                                borderRadius: 16,
                                backgroundColor: isBlocked ? "#F0FDF4" : "#FEF2F2",
                            }}
                        >
                            <Ionicons
                                name={isBlocked ? "shield-checkmark-outline" : "ban-outline"}
                                size={22}
                                color={isBlocked ? "#22C55E" : "#EF4444"}
                            />
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: isBlocked ? "#22C55E" : "#EF4444",
                                }}
                            >
                                {isBlocking
                                    ? "Processing..."
                                    : isBlocked
                                        ? "Unblock User"
                                        : "Block User"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                        <Ionicons name="person-outline" size={48} color="#CBD5E1" />
                        <Text style={{ color: "#94A3B8", fontSize: 16, marginTop: 8 }}>
                            Profile not available
                        </Text>
                    </View>
                )}
            </CustomBottomSheetModal>

            {/* Block/Unblock Confirmation Modal */}
            <ActionModal
                visible={showBlockModal}
                onClose={() => setShowBlockModal(false)}
                title={isBlocked ? "Unblock User" : "Block User"}
                description={
                    isBlocked
                        ? `Are you sure you want to unblock ${profile?.FullName || "this user"}? They will be able to message you again.`
                        : `Are you sure you want to block ${profile?.FullName || "this user"}? They won't be able to send you messages.`
                }
                cancelLabel="Cancel"
                actionLabel={isBlocked ? "Unblock" : "Block"}
                isDangerous={!isBlocked}
                onHandleFn={handleToggleBlock}
            />
        </>
    );
});

UserProfileSheet.displayName = "UserProfileSheet";

export default UserProfileSheet;
