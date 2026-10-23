import { useState } from "react";
import { Image, Text, View } from "react-native";
import { getColorFromId } from "../../utils/getColorfromId";

export default function CallAvatar({ peer, name }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const uri = peer?.imageUrl;
  if (uri && failedUrl !== uri) return <Image source={{ uri }} accessibilityLabel={name}
    onError={() => setFailedUrl(uri)} style={{ width: 50, height: 50, borderRadius: 25 }} />;
  return <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: getColorFromId(peer?._id || "unavailable"),
    alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>{peer ? name.trim().charAt(0).toUpperCase() || "?" : "?"}</Text>
  </View>;
}
