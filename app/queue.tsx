import { useEffect, useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface QueueItem {
  id: number;
  videoId: number;
  productUrl: string;
  status: "queued" | "processing" | "completed" | "failed";
  priority: number;
  createdAt: Date;
  errorMessage?: string;
}

export default function QueueScreen() {
  const router = useRouter();
  const colors = useColors();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  const { data: items, isLoading, refetch } = trpc.queue.list.useQuery();
  const { data: stats } = trpc.queue.stats.useQuery();
  const deleteMutation = trpc.queue.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (items) {
      setQueueItems(items);
    }
  }, [items]);

  // Auto-refresh queue every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return colors.muted;
      case "processing":
        return colors.primary;
      case "completed":
        return colors.success;
      case "failed":
        return colors.error;
      default:
        return colors.foreground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return "clock";
      case "processing":
        return "hourglass";
      case "completed":
        return "checkmark.circle.fill";
      case "failed":
        return "xmark.circle.fill";
      default:
        return "questionmark.circle";
    }
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => (
    <View className="bg-surface rounded-xl p-4 border border-border mb-3 flex-row items-center justify-between">
      <View className="flex-1 gap-2">
        <View className="flex-row items-center gap-2">
          <IconSymbol
            name={getStatusIcon(item.status)}
            size={20}
            color={getStatusColor(item.status)}
          />
          <Text className="text-base font-semibold text-foreground capitalize">
            {item.status}
          </Text>
        </View>

        <Text className="text-sm text-muted" numberOfLines={1}>
          {item.productUrl}
        </Text>

        {item.errorMessage && (
          <Text className="text-xs text-error">{item.errorMessage}</Text>
        )}

        <Text className="text-xs text-muted">
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      {item.status === "queued" && (
        <TouchableOpacity
          onPress={() => deleteMutation.mutate({ id: item.id })}
          className="ml-4 p-2"
        >
          <IconSymbol name="xmark.circle.fill" size={24} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

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
            <Text className="text-3xl font-bold text-foreground">Processing Queue</Text>
            <Text className="text-base text-muted">Manage your video generation queue</Text>
          </View>

          {/* Stats */}
          {stats && (
            <View className="gap-3">
              <View className="flex-row gap-3">
                {/* Queued */}
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
                  <Text className="text-2xl font-bold text-foreground">{stats.queued}</Text>
                  <Text className="text-xs text-muted mt-1">Queued</Text>
                </View>

                {/* Processing */}
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
                  <Text className="text-2xl font-bold text-primary">{stats.processing}</Text>
                  <Text className="text-xs text-muted mt-1">Processing</Text>
                </View>

                {/* Completed */}
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
                  <Text className="text-2xl font-bold text-success">{stats.completed}</Text>
                  <Text className="text-xs text-muted mt-1">Completed</Text>
                </View>
              </View>

              {stats.failed > 0 && (
                <View className="bg-error/10 border border-error rounded-xl p-4">
                  <Text className="text-error font-semibold">{stats.failed} Failed</Text>
                  <Text className="text-error/80 text-sm mt-1">
                    Some videos failed to generate. Try again or check settings.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Queue Items */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Queue Items</Text>

            {queueItems.length > 0 ? (
              <FlatList
                data={queueItems}
                renderItem={renderQueueItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View className="items-center py-8">
                <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
                <Text className="text-foreground font-semibold mt-3">Queue is Empty</Text>
                <Text className="text-muted text-sm mt-1">All videos have been processed</Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">How Batch Processing Works</Text>
            <Text className="text-sm text-muted leading-relaxed">
              Videos are processed in order of priority. You can add multiple products to the queue and they'll be generated automatically in the background. Check back later to download your completed videos.
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
