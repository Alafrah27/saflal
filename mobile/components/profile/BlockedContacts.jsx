import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetBlockedContacts, useToggleBlockUser } from "../../store/transtack/query";
import { useAuthStore } from "../../store/Store";
import ActionModal from "../CustomHookUi/ActionModel";
import { useState } from "react";

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

const BlockedContactItem = ({ user, onUnblock, isUnblocking }) => {
    const bgColor = useMemo(() => hashColor(user._id), [user._id]);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: "#F1F5F9",
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                {user.avatar ? (
                    <Image
                        source={{ uri: user.avatar }}
                        style={{ width: 46, height: 46, borderRadius: 23 }}
                    />
                ) : (
                    <View
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 23,
                            backgroundColor: bgColor,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
                            {user.FullName?.charAt(0)?.toUpperCase()}
                        </Text>
                    </View>
                )}
                <Text
                    numberOfLines={1}
                    style={{ fontSize: 15, fontWeight: "600", color: "#1E293B", flex: 1 }}
                >
                    {user.FullName}
                </Text>
            </View>

            <TouchableOpacity
                onPress={() => onUnblock(user)}
                disabled={isUnblocking}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#F0FDF4",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                }}
            >
                <Ionicons name="shield-checkmark-outline" size={16} color="#22C55E" />
                <Text style={{ color: "#22C55E", fontWeight: "700", fontSize: 13 }}>
                    Unblock
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const BlockedContacts = () => {
    const { data: blockedUsers, isLoading } = useGetBlockedContacts();
    const { mutate: toggleBlock, isPending: isUnblocking } = useToggleBlockUser();
    const { userAuth } = useAuthStore();
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleUnblockPress = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleConfirmUnblock = () => {
        if (!selectedUser) return;
        toggleBlock(selectedUser._id, {
            onSuccess: () => {
                userAuth();
                setSelectedUser(null);
            },
        });
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#b88144" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, paddingTop: 8 }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#1A1A2E" }}>
                    Blocked Contacts
                </Text>
                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
                    {blockedUsers?.length || 0} blocked contact{blockedUsers?.length !== 1 ? "s" : ""}
                </Text>
            </View>

            {/* List */}
            {blockedUsers && blockedUsers.length > 0 ? (
                blockedUsers.map((user) => (
                    <BlockedContactItem
                        key={user._id}
                        user={user}
                        onUnblock={handleUnblockPress}
                        isUnblocking={isUnblocking}
                    />
                ))
            ) : (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <Ionicons name="shield-outline" size={56} color="#CBD5E1" />
                    <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "600", marginTop: 10 }}>
                        No blocked contacts
                    </Text>
                    <Text style={{ color: "#CBD5E1", fontSize: 13, marginTop: 4 }}>
                        Users you block will appear here
                    </Text>
                </View>
            )}

            {/* Unblock Confirmation Modal */}
            <ActionModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                title="Unblock User"
                description={`Are you sure you want to unblock ${selectedUser?.FullName || "this user"}? They will be able to message you again.`}
                cancelLabel="Cancel"
                actionLabel="Unblock"
                isDangerous={false}
                onHandleFn={handleConfirmUnblock}
            />
        </View>
    );
};

export default BlockedContacts;
