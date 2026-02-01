import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function EditProductScreen() {
  const router = useRouter();
  const { videoId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");

  // Fetch video details using useQuery
  const { data: video } = trpc.videos.get.useQuery({
    id: parseInt(videoId as string),
  });

  // Update mutation
  const updateMutation = trpc.videos.updateDetails.useMutation({
    onSuccess: () => {
      router.push({
        pathname: "/generation",
        params: { videoId },
      });
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Populate form when video loads
  useEffect(() => {
    if (video) {
      setProductName(video.productName || "");
      setProductPrice(video.productPrice || "");
      setProductDescription(video.productDescription || "");
      setLoading(false);
    }
  }, [video]);

  const handleSaveAndContinue = () => {
    if (!productName.trim()) {
      Alert.alert("Validation", "Product name is required");
      return;
    }

    if (!productDescription.trim()) {
      Alert.alert("Validation", "Product description is required");
      return;
    }

    updateMutation.mutate({
      id: parseInt(videoId as string),
      productName: productName.trim(),
      productPrice: productPrice.trim(),
      productDescription: productDescription.trim(),
    });
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Edit Product Details
            </Text>
            <Text className="text-base text-muted">
              Review and customize the product information before generating your video
            </Text>
          </View>

          {/* Product Name */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Product Name *
            </Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
              placeholderTextColor="#9BA1A6"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!updateMutation.isPending}
            />
          </View>

          {/* Product Price */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Price
            </Text>
            <TextInput
              value={productPrice}
              onChangeText={setProductPrice}
              placeholder="e.g., $29.99"
              placeholderTextColor="#9BA1A6"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!updateMutation.isPending}
            />
          </View>

          {/* Product Description */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Description *
            </Text>
            <TextInput
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Enter product description (used for video script generation)"
              placeholderTextColor="#9BA1A6"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              editable={!updateMutation.isPending}
            />
            <Text className="text-xs text-muted">
              {productDescription.length} characters
            </Text>
          </View>

          {/* Info Box */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-2">
            <Text className="text-sm font-semibold text-foreground">
              💡 Tip
            </Text>
            <Text className="text-sm text-muted leading-relaxed">
              Make your description engaging and highlight key features. This will be used to generate your UGC video script.
            </Text>
          </View>

          {/* Buttons */}
          <View className="gap-3 mt-4">
            <Pressable
              onPress={handleSaveAndContinue}
              disabled={updateMutation.isPending}
              className="bg-primary rounded-full py-4 items-center"
              style={({ pressed }) => [
                pressed && !updateMutation.isPending && { opacity: 0.8 },
                updateMutation.isPending && { opacity: 0.6 },
              ]}
            >
              <Text className="text-white font-semibold text-base">
                {updateMutation.isPending ? "Saving..." : "Save & Generate Video"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              disabled={updateMutation.isPending}
              className="border border-border rounded-full py-4 items-center"
              style={({ pressed }) => [
                pressed && !updateMutation.isPending && { opacity: 0.7 },
              ]}
            >
              <Text className="text-foreground font-semibold text-base">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
