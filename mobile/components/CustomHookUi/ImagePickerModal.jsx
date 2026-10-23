import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ImagePickerModal({ visible, onClose, onCamera, onGallery }) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Backdrop: Clicking outside closes the modal */}
      <Pressable 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        onPress={onClose}
      >
        {/* Modal Container */}
        <Pressable className="w-full bg-white rounded-3xl p-6 shadow-xl" onPress={(e) => e.stopPropagation()}>
          <Text className="text-xl font-bold text-slate-900 mb-6 text-center">
            Update Profile Photo
          </Text>

          <View className="flex-row justify-around mb-4">
            {/* Camera Option */}
            <TouchableOpacity 
              onPress={onCamera}
              className="items-center"
            >
              <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center mb-2">
                <MaterialCommunityIcons name="camera-outline" size={32} color="#3b82f6" />
              </View>
              <Text className="text-slate-600 font-medium">Camera</Text>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity 
              onPress={onGallery}
              className="items-center"
            >
              <View className="w-16 h-16 bg-purple-50 rounded-2xl items-center justify-center mb-2">
                <MaterialCommunityIcons name="image-outline" size={32} color="#a855f7" />
              </View>
              <Text className="text-slate-600 font-medium">Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity 
            onPress={onClose}
            className="mt-4 py-3 border-t border-slate-100 items-center"
          >
            <Text className="text-red-500 font-bold text-lg">Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}