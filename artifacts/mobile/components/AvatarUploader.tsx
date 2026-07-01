import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { customFetch } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface AvatarUploaderProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
  size?: number;
  editable?: boolean;
}

export default function AvatarUploader({
  userId,
  currentAvatarUrl,
  onUploadSuccess,
  size = 120,
  editable = true,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const colors = useColors();

  const pickImage = async () => {
    if (!editable || isUploading) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload an avatar.');
        return;
      }

      // Pick image without base64 first to avoid loading huge string into memory
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Start with high quality, manipulate later
      });

      if (!result.canceled && result.assets[0]?.uri) {
        // Optimize the image: resize to 400x400 and compress to 0.6 quality
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipResult.base64) {
          await uploadImage(manipResult.base64, 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const uploadImage = async (base64: string, mimeType: string) => {
    setIsUploading(true);
    try {
      const res = await customFetch<{ avatarUrl: string }>(`/users/${userId}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, contentType: mimeType }),
      });

      if (res.avatarUrl) {
        onUploadSuccess(res.avatarUrl);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', 'There was a problem uploading your photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={pickImage} 
        disabled={!editable || isUploading}
        style={[
          styles.imageContainer,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }
        ]}
      >
        {currentAvatarUrl ? (
          <Image
            source={{ uri: currentAvatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Feather name="user" size={size * 0.4} color={colors.textMuted} />
        )}

        {editable && !isUploading && (
          <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={14} color="#FFF" />
          </View>
        )}

        {isUploading && (
          <View style={[styles.loadingOverlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'visible', // for the badge
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
