import { useState } from "react";
import { Image, Text, View } from "react-native";
import { getColorFromId } from "../../utils/getColorfromId";
import { displayName } from "../../shared/displayName";

export default function ProfileAvatar({ user, size = 52 }) {
  const [failed, setFailed] = useState(null);
  const uri = user?.imageUrl;
  if (uri && failed !== uri) return <Image source={{ uri }} accessibilityLabel={displayName(user)}
    onError={() => setFailed(uri)} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: getColorFromId(user?._id || "unavailable"), justifyContent: "center", alignItems: "center" }}>
    <Text style={{ color: "white", fontSize: size * 0.4, fontWeight: "700" }}>{displayName(user).trim().charAt(0).toUpperCase() || "?"}</Text>
  </View>;
}
