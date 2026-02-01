import { useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Video } from "expo-av";

export default function DownloadScreen() {
  const router = useRouter();
  const colors = useColors();
  const { videoId } = useLocalSearchParams();
  const [downloading, setDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: video, isLoading } = trpc.videos.get.useQuery({ id: Number(videoId) });

  const handleDownloadVideo = async () => {
    if (!video?.videoUrl) {
      Alert.alert("Error", "Video URL not available");
      return;
    }

    setDownloading(true);
    try {
      const fileName = `ShopVid_${video.productName?.replace(/\s+/g, "_")}_${Date.now()}.mp4`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(video.videoUrl, fileUri);

      if (downloadResult.status === 200) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "video/mp4",
          dialogTitle: "Save Video",
        });
        Alert.alert("Success", "Video downloaded and ready to share!");
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to download video: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadThumbnail = async () => {
    if (!video?.thumbnailUrl) {
      Alert.alert("Error", "Thumbnail URL not available");
      return;
    }

    setDownloading(true);
    try {
      const fileName = `ShopVid_Thumbnail_${video.productName?.replace(/\s+/g, "_")}_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(video.thumbnailUrl, fileUri);

      if (downloadResult.status === 200) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Save Thumbnail",
        });
        Alert.alert("Success", "Thumbnail downloaded!");
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to download thumbnail: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!video?.caption) {
      Alert.alert("Error", "Caption not available");
      return;
    }

    try {
      const { Clipboard } = require("react-native");
      await Clipboard.setString(video.caption);
      Alert.alert("Copied", "Caption and hashtags copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Failed to copy caption");
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!video) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">Video not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 gap-6 mt-8">
          {/* Success Header */}
          <View className="items-center gap-3">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.success + "20" }}
            >
              <IconSymbol name="checkmark.circle.fill" size={40} color={colors.success} />
            </View>
            <Text className="text-3xl font-bold text-foreground text-center">
              Video Ready!
            </Text>
            <Text className="text-base text-muted text-center">
              Your UGC video has been generated successfully
            </Text>
          </View>

          {/* Product Info */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm text-muted mb-2">Product</Text>
            <Text className="text-lg font-semibold text-foreground mb-3">{video.productName}</Text>
            {video.productPrice && (
              <Text className="text-sm text-muted">Price: {video.productPrice}</Text>
            )}
          </View>

          {/* Video Preview */}
          {video.videoUrl && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Video Preview</Text>

              <View className="bg-black rounded-xl overflow-hidden border border-border">
                {video.videoUrl.startsWith("data:") || video.videoUrl.includes("base64") ? (
                  <View className="w-full aspect-video items-center justify-center bg-surface">
                    <Text className="text-muted text-sm">Video preview not available</Text>
                  </View>
                ) : (
                  <Video
                    source={{ uri: video.videoUrl }}
                    rate={1.0}
                    volume={1.0}
                    isMuted={false}
                    useNativeControls
                    style={{ width: "100%", aspectRatio: 9 / 16 }}
                    onPlaybackStatusUpdate={(status: any) => {
                      if (status.isPlaying) {
                        setIsPlaying(true);
                      } else {
                        setIsPlaying(false);
                      }
                    }}
                  />
                )}
              </View>

              {!isPlaying && video.thumbnailUrl && (
                <TouchableOpacity
                  onPress={() => setIsPlaying(true)}
                  className="absolute inset-0 items-center justify-center"
                  style={{ marginTop: 120 }}
                >
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <IconSymbol name="play.fill" size={32} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Download Options */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Download Assets</Text>

            {/* Video Download */}
            <TouchableOpacity
              onPress={handleDownloadVideo}
              disabled={downloading}
              className="bg-primary rounded-xl p-4 flex-row items-center gap-3"
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <IconSymbol name="play.circle.fill" size={24} color="#ffffff" />
              )}
              <View className="flex-1">
                <Text className="text-white font-semibold">Download Video</Text>
                <Text className="text-white/70 text-sm">MP4 format for TikTok</Text>
              </View>
            </TouchableOpacity>

            {/* Thumbnail Download */}
            <TouchableOpacity
              onPress={handleDownloadThumbnail}
              disabled={downloading}
              className="bg-secondary rounded-xl p-4 flex-row items-center gap-3"
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <IconSymbol name="play.circle.fill" size={24} color="#ffffff" />
              )}
              <View className="flex-1">
                <Text className="text-white font-semibold">Download Thumbnail</Text>
                <Text className="text-white/70 text-sm">PNG image for cover</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Caption Section */}
          {video.caption && (
            <View className="gap-3">
              <Text className="text-lg font-semibold text-foreground">Caption & Hashtags</Text>

              <View className="bg-surface rounded-xl p-4 border border-border">
                <Text className="text-sm text-foreground leading-relaxed">{video.caption}</Text>
              </View>

              <TouchableOpacity
                onPress={handleCopyCaption}
                className="bg-surface border border-primary rounded-xl p-4 flex-row items-center justify-center gap-2"
              >
                <IconSymbol name="link" size={20} color={colors.primary} />
                <Text className="text-primary font-semibold">Copy Caption to Clipboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Instructions */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">Next Steps</Text>
            <Text className="text-sm text-muted leading-relaxed">
              1. Download the video and thumbnail{"\n"}
              2. Copy the caption with hashtags{"\n"}
              3. Open TikTok and create a new post{"\n"}
              4. Upload the video and add the caption{"\n"}
              5. Tag the product from TikTok Shop{"\n"}
              6. Post and watch it go viral!
            </Text>
          </View>

          {/* Create Another Button */}
          <TouchableOpacity
            onPress={() => router.push("/product-input")}
            className="rounded-xl py-4 items-center border border-primary"
          >
            <Text className="text-primary text-lg font-semibold">Create Another Video</Text>
          </TouchableOpacity>

          {/* Home Button */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: colors.muted + "20" }}
          >
            <Text className="text-foreground text-lg font-semibold">Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
