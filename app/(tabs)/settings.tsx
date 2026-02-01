import { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const colors = useColors();
  const [showTokens, setShowTokens] = useState(false);

  // Form state
  const [hfToken, setHfToken] = useState("");
  const [videoLength, setVideoLength] = useState("8");
  const [videoQuality, setVideoQuality] = useState("balanced");
  const [enableComments, setEnableComments] = useState(true);
  const [enableDuets, setEnableDuets] = useState(true);
  const [enableStitch, setEnableStitch] = useState(true);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Settings saved successfully!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Load settings when they arrive
  useEffect(() => {
    if (settings) {
      setHfToken(settings.hfToken || "");
      setVideoLength(String(settings.videoLength || 8));
      setVideoQuality(settings.videoQuality || "balanced");
      setEnableComments(settings.enableComments ?? true);
      setEnableDuets(settings.enableDuets ?? true);
      setEnableStitch(settings.enableStitch ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate({
      hfToken: hfToken || undefined,
      videoLength: parseInt(videoLength),
      videoQuality: videoQuality as any,
      enableComments,
      enableDuets,
      enableStitch,
    });
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
            <Text className="text-3xl font-bold text-foreground">Settings</Text>
            <Text className="text-base text-muted">Configure your video generation preferences</Text>
          </View>

          {/* API Keys Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">API Configuration</Text>

            {/* Hugging Face Token */}
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-medium text-foreground">Hugging Face Token</Text>
                <TouchableOpacity onPress={() => setShowTokens(!showTokens)}>
                  <IconSymbol
                    name={showTokens ? "xmark.circle.fill" : "eye"}
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground"
                placeholder="hf_xxxxxxxxxxxxx"
                placeholderTextColor={colors.muted}
                value={hfToken}
                onChangeText={setHfToken}
                secureTextEntry={!showTokens}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text className="text-xs text-muted">
                Get your token from https://huggingface.co/settings/tokens
              </Text>
            </View>

            {/* Info Card */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-sm font-semibold text-foreground mb-2">About Hugging Face</Text>
              <Text className="text-sm text-muted leading-relaxed">
                Hugging Face provides free AI video generation. Sign up for a free account and create an API token to enable video generation in this app.
              </Text>
            </View>
          </View>

          {/* Video Settings Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Video Settings</Text>

            {/* Video Length */}
            <View className="gap-2">
              <Text className="text-base font-medium text-foreground">Video Length (seconds)</Text>
              <View className="flex-row gap-2">
                {["5", "8", "10"].map((length) => (
                  <TouchableOpacity
                    key={length}
                    onPress={() => setVideoLength(length)}
                    className="flex-1 rounded-lg py-3 items-center border-2"
                    style={{
                      borderColor: videoLength === length ? colors.primary : colors.border,
                      backgroundColor:
                        videoLength === length ? colors.primary + "20" : "transparent",
                    }}
                  >
                    <Text
                      className="font-semibold"
                      style={{
                        color: videoLength === length ? colors.primary : colors.foreground,
                      }}
                    >
                      {length}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Video Quality */}
            <View className="gap-2">
              <Text className="text-base font-medium text-foreground">Video Quality</Text>
              <View className="flex-row gap-2">
                {[
                  { id: "fast", label: "Fast" },
                  { id: "balanced", label: "Balanced" },
                  { id: "high", label: "High" },
                ].map((quality) => (
                  <TouchableOpacity
                    key={quality.id}
                    onPress={() => setVideoQuality(quality.id)}
                    className="flex-1 rounded-lg py-3 items-center border-2"
                    style={{
                      borderColor:
                        videoQuality === quality.id ? colors.primary : colors.border,
                      backgroundColor:
                        videoQuality === quality.id ? colors.primary + "20" : "transparent",
                    }}
                  >
                    <Text
                      className="font-semibold text-sm"
                      style={{
                        color:
                          videoQuality === quality.id ? colors.primary : colors.foreground,
                      }}
                    >
                      {quality.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs text-muted">
                Fast: Quick generation, lower quality | High: Slower, better quality
              </Text>
            </View>
          </View>

          {/* TikTok Settings Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">TikTok Preferences</Text>

            {/* Enable Comments */}
            <View className="flex-row items-center justify-between bg-surface rounded-xl p-4 border border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Allow Comments</Text>
                <Text className="text-sm text-muted mt-1">Let viewers comment on your videos</Text>
              </View>
              <Switch
                value={enableComments}
                onValueChange={setEnableComments}
                trackColor={{ false: colors.border, true: colors.primary + "40" }}
                thumbColor={enableComments ? colors.primary : colors.muted}
              />
            </View>

            {/* Enable Duets */}
            <View className="flex-row items-center justify-between bg-surface rounded-xl p-4 border border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Allow Duets</Text>
                <Text className="text-sm text-muted mt-1">Let viewers create duets with your video</Text>
              </View>
              <Switch
                value={enableDuets}
                onValueChange={setEnableDuets}
                trackColor={{ false: colors.border, true: colors.primary + "40" }}
                thumbColor={enableDuets ? colors.primary : colors.muted}
              />
            </View>

            {/* Enable Stitch */}
            <View className="flex-row items-center justify-between bg-surface rounded-xl p-4 border border-border">
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Allow Stitches</Text>
                <Text className="text-sm text-muted mt-1">Let viewers stitch your video into theirs</Text>
              </View>
              <Switch
                value={enableStitch}
                onValueChange={setEnableStitch}
                trackColor={{ false: colors.border, true: colors.primary + "40" }}
                thumbColor={enableStitch ? colors.primary : colors.muted}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-xl py-4 items-center mt-4"
            style={{
              backgroundColor: updateMutation.isPending ? colors.muted + "40" : colors.primary,
            }}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-semibold">Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
