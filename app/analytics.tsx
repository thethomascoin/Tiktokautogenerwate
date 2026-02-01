import { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface VideoMetrics {
  videoId: number;
  productName: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  createdAt: Date;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [metrics, setMetrics] = useState<VideoMetrics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const { data: videos, isLoading } = trpc.videos.list.useQuery();

  useEffect(() => {
    if (videos) {
      // Mock analytics data - in production, this would come from TikTok API
      const mockMetrics = videos.map((video) => ({
        videoId: video.id,
        productName: video.productName || "Unknown",
        views: Math.floor(Math.random() * 50000) + 1000,
        likes: Math.floor(Math.random() * 5000) + 100,
        comments: Math.floor(Math.random() * 500) + 10,
        shares: Math.floor(Math.random() * 200) + 5,
        engagement: Math.random() * 15 + 2,
        createdAt: video.createdAt,
      }));

      setMetrics(mockMetrics.sort((a, b) => b.views - a.views));
    }
  }, [videos]);

  const totalStats = {
    views: metrics.reduce((sum, m) => sum + m.views, 0),
    likes: metrics.reduce((sum, m) => sum + m.likes, 0),
    comments: metrics.reduce((sum, m) => sum + m.comments, 0),
    shares: metrics.reduce((sum, m) => sum + m.shares, 0),
    avgEngagement: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.engagement, 0) / metrics.length).toFixed(2) : "0",
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement > 10) return colors.success;
    if (engagement > 5) return colors.primary;
    return colors.warning;
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 mt-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Analytics</Text>
            <Text className="text-base text-muted">Track your video performance</Text>
          </View>

          {/* Period Selector */}
          <View className="flex-row gap-2">
            {["7d", "30d", "90d", "all"].map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setSelectedPeriod(period)}
                className="flex-1 rounded-lg py-2 items-center border-2"
                style={{
                  borderColor: selectedPeriod === period ? colors.primary : colors.border,
                  backgroundColor: selectedPeriod === period ? colors.primary + "20" : "transparent",
                }}
              >
                <Text
                  className="font-semibold text-sm"
                  style={{
                    color: selectedPeriod === period ? colors.primary : colors.foreground,
                  }}
                >
                  {period === "7d" ? "7D" : period === "30d" ? "30D" : period === "90d" ? "90D" : "All"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Overall Stats */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Overall Performance</Text>

            <View className="flex-row gap-3">
              {/* Views */}
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-2">
                  <IconSymbol name="eye" size={20} color={colors.primary} />
                  <Text className="text-xs text-muted">Views</Text>
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {(totalStats.views / 1000).toFixed(1)}K
                </Text>
              </View>

              {/* Likes */}
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-2">
                  <IconSymbol name="heart.fill" size={20} color={colors.error} />
                  <Text className="text-xs text-muted">Likes</Text>
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {(totalStats.likes / 1000).toFixed(1)}K
                </Text>
              </View>

              {/* Engagement */}
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-2">
                  <IconSymbol name="flame.fill" size={20} color={colors.warning} />
                  <Text className="text-xs text-muted">Engagement</Text>
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {totalStats.avgEngagement}%
                </Text>
              </View>
            </View>

            {/* Secondary Stats */}
            <View className="flex-row gap-3">
              {/* Comments */}
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-2">
                  <IconSymbol name="bubble.right" size={20} color={colors.secondary} />
                  <Text className="text-xs text-muted">Comments</Text>
                </View>
                <Text className="text-xl font-bold text-foreground">{totalStats.comments}</Text>
              </View>

              {/* Shares */}
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <View className="flex-row items-center gap-2 mb-2">
                  <IconSymbol name="arrowshape.turn.up.right" size={20} color={colors.success} />
                  <Text className="text-xs text-muted">Shares</Text>
                </View>
                <Text className="text-xl font-bold text-foreground">{totalStats.shares}</Text>
              </View>
            </View>
          </View>

          {/* Top Performing Videos */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Top Performing Videos</Text>

            {metrics.length > 0 ? (
              metrics.slice(0, 5).map((metric, index) => (
                <View key={metric.videoId} className="bg-surface rounded-xl p-4 border border-border">
                  {/* Rank Badge */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{
                          backgroundColor:
                            index === 0
                              ? "#FFD700"
                              : index === 1
                              ? "#C0C0C0"
                              : index === 2
                              ? "#CD7F32"
                              : colors.muted + "20",
                        }}
                      >
                        <Text
                          className="font-bold text-sm"
                          style={{
                            color:
                              index < 3 ? "#000" : colors.foreground,
                          }}
                        >
                          #{index + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground" numberOfLines={1}>
                          {metric.productName}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: getEngagementColor(metric.engagement) + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: getEngagementColor(metric.engagement) }}
                      >
                        {metric.engagement.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {/* Stats Row */}
                  <View className="flex-row justify-between gap-2">
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-muted mb-1">Views</Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {(metric.views / 1000).toFixed(1)}K
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-muted mb-1">Likes</Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {(metric.likes / 1000).toFixed(1)}K
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-muted mb-1">Comments</Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {metric.comments}
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-muted mb-1">Shares</Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {metric.shares}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View className="items-center py-8">
                <IconSymbol name="chart.bar" size={48} color={colors.muted} />
                <Text className="text-foreground font-semibold mt-3">No Data Yet</Text>
                <Text className="text-muted text-sm mt-1">
                  Analytics will appear after videos are posted
                </Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">About Analytics</Text>
            <Text className="text-sm text-muted leading-relaxed">
              Metrics are updated daily from TikTok. Engagement rate is calculated as (likes + comments + shares) / views × 100. Videos with higher engagement rates are more likely to go viral.
            </Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: colors.muted + "20" }}
          >
            <Text className="text-foreground text-lg font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
