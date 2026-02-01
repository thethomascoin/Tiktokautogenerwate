import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  const { data: videos, isLoading } = trpc.videos.list.useQuery();

  const handleCreateVideo = () => {
    router.push("/product-input");
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-8">
          {/* Hero Section */}
          <View className="items-center gap-4 mt-8">
            <Text className="text-4xl font-bold text-foreground text-center">
              Tik Agent
            </Text>
            <Text className="text-base text-muted text-center max-w-sm">
              Automate TikTok Shop product videos with AI. Create engaging UGC content in minutes.
            </Text>
          </View>

          {/* Create Video Button */}
          <View className="items-center">
            <TouchableOpacity
              onPress={handleCreateVideo}
              className="bg-primary px-8 py-4 rounded-full flex-row items-center gap-3 active:opacity-80"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <IconSymbol name="plus.circle.fill" size={24} color="#ffffff" />
              <Text className="text-white text-lg font-semibold">Create Video</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Videos */}
          <View className="gap-4">
            <Text className="text-xl font-semibold text-foreground">Recent Videos</Text>

            {isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : videos && videos.length > 0 ? (
              <View className="gap-3">
                {videos.slice(0, 5).map((video) => (
                  <View
                    key={video.id}
                    className="bg-surface rounded-xl p-4 border border-border"
                  >
                    <View className="flex-row items-center gap-3">
                      {video.thumbnailUrl ? (
                        <View className="w-16 h-16 bg-muted rounded-lg" />
                      ) : (
                        <View className="w-16 h-16 bg-muted rounded-lg items-center justify-center">
                          <IconSymbol name="play.circle.fill" size={32} color={colors.muted} />
                        </View>
                      )}

                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                          {video.productName || "Untitled"}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <View
                            className="px-2 py-1 rounded"
                            style={{
                              backgroundColor:
                                video.status === "posted"
                                  ? colors.success + "20"
                                  : video.status === "failed"
                                    ? colors.error + "20"
                                    : video.status === "processing"
                                      ? colors.warning + "20"
                                      : colors.muted + "20",
                            }}
                          >
                            <Text
                              className="text-xs font-medium"
                              style={{
                                color:
                                  video.status === "posted"
                                    ? colors.success
                                    : video.status === "failed"
                                      ? colors.error
                                      : video.status === "processing"
                                        ? colors.warning
                                        : colors.muted,
                              }}
                            >
                              {video.status}
                            </Text>
                          </View>
                          <Text className="text-xs text-muted">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <IconSymbol name="chevron.right" size={20} color={colors.muted} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center py-8">
                <Text className="text-muted text-center">
                  No videos yet. Create your first one!
                </Text>
              </View>
            )}
          </View>

          {/* Info Cards */}
          <View className="gap-3 mt-4">
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-base font-semibold text-foreground mb-2">
                How it works
              </Text>
              <Text className="text-sm text-muted leading-relaxed">
                1. Paste a TikTok Shop product URL{"\n"}
                2. AI analyzes and creates a video script{"\n"}
                3. Video is generated automatically{"\n"}
                4. Post directly to your TikTok account
              </Text>
            </View>
          </View>
          {/* Chat Widget */}
          <View className="mt-8 bg-surface rounded-xl overflow-hidden border border-border" style={{ height: 600 }}>
            <WebView
              originWhitelist={['*']}
              source={{
                html: `
                   <!DOCTYPE html>
                   <html>
                   <head>
                       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                       <style>body { margin: 0; background-color: #0d0d0d; }</style>
                   </head>
                   <body>
                       <script src="https://ionos.ai-voice-receptionist.com/chat-scripts-MqGN74WP/web-chat.js" name="web-chat" data-client-secret="e5be958f-206c-4776-82e3-368876d65d63"></script>
                   </body>
                   </html>
                 `
              }}
              style={{ flex: 1, backgroundColor: 'transparent' }}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
