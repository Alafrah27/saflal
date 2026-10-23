import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

const AttachmentItem = ({ icon, color, label, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
       style={{flex:1,
        Width:"100%",
        flexWrap:'wrap'
        
       }}
    >
        <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: color,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
            // Subtle Shadow
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        }}>
            <Ionicons name={icon} size={28} color="white" />
        </View>
        <Text style={{ fontSize: 12, color: '#555', fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
);

export default AttachmentItem;
