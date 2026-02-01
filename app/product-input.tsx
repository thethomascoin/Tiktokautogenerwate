import { useState } from "react";
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Clipboard } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProductInputScreen() {
  const router = useRouter();
  const colors = useColors();
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);

  const analyzeMutation = trpc.product.analyze.useMutation({
    onSuccess: (data) => {
      router.push({
        pathname: "/edit-product",
        params: { videoId: data.videoId },
      } as any);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleUrlChange = (text: string) => {
    setUrl(text);
    const isTikTok = text.includes("tiktok.com") || text.includes("vm.tiktok.com");
    setIsValidUrl(isTikTok && text.startsWith("http"));
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await Clipboard.getString();
      handleUrlChange(clipboardText);
    } catch (error) {
      console.error("Failed to read clipboard", error);
    }
  };

  const handleAnalyze = () => {
    if (!isValidUrl) return;
    analyzeMutation.mutate({ url });
  };

  return (
    <ScreenContainer className="p-6">
      <View className="flex-1 justify-between">
        <View className="gap-6 mt-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Enter Product URL
            </Text>
            <Text className="text-base text-muted">
              Paste a TikTok Shop product link to get started
            </Text>
          </View>

          {/* URL Input */}
          <View className="gap-3">
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground"
              placeholder="https://shop.tiktok.com/..."
              placeholderTextColor={colors.muted}
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />

            {/* Paste Button */}
            <TouchableOpacity
              onPress={handlePaste}
              className="bg-primary px-4 py-3 rounded-lg items-center"
            >
              <Text className="text-white text-sm font-medium">Paste from Clipboard</Text>
            </TouchableOpacity>

            {/* Example hint */}
            <View className="flex-row items-start gap-2">
              <IconSymbol name="link" size={16} color={colors.muted} />
              <Text className="text-sm text-muted flex-1">
                Example: https://shop.tiktok.com/view/product/...
              </Text>
            </View>

            {/* Validation feedback */}
            {url.length > 0 && (
              <View className="flex-row items-center gap-2">
                <IconSymbol
                  name={isValidUrl ? "checkmark.circle.fill" : "xmark.circle.fill"}
                  size={20}
                  color={isValidUrl ? colors.success : colors.error}
                />
                <Text
                  className="text-sm"
                  style={{ color: isValidUrl ? colors.success : colors.error }}
                >
                  {isValidUrl ? "Valid TikTok URL" : "Invalid URL format"}
                </Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">
              What happens next?
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              We'll analyze the product page, extract details, and generate a UGC-style video. The entire process takes 2-5 minutes.
            </Text>
          </View>
        </View>

        {/* Analyze Button */}
        <View className="pb-6">
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={!isValidUrl || analyzeMutation.isPending}
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: isValidUrl && !analyzeMutation.isPending ? colors.primary : colors.muted + "40",
            }}
          >
            {analyzeMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                Analyze Product
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
