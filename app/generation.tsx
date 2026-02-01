import { useEffect, useState } from "react";
import { Text, View, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type GenerationStep = "analyzing" | "script" | "video" | "thumbnail" | "caption" | "complete";

interface StepInfo {
  id: GenerationStep;
  title: string;
  description: string;
}

const STEPS: StepInfo[] = [
  { id: "analyzing", title: "Analyzing Product", description: "Extracting product details..." },
  { id: "script", title: "Generating Script", description: "Creating UGC-style video script..." },
  { id: "video", title: "Creating Video", description: "Generating video with AI..." },
  { id: "thumbnail", title: "Making Thumbnail", description: "Creating eye-catching thumbnail..." },
  { id: "caption", title: "Writing Caption", description: "Generating viral hashtags..." },
  { id: "complete", title: "Complete", description: "Ready to download!" },
];

export default function GenerationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { videoId } = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState<GenerationStep>("analyzing");
  const [error, setError] = useState<string | null>(null);

  const { data: video } = trpc.videos.get.useQuery({ id: Number(videoId) });
  const scriptMutation = trpc.video.generateScript.useMutation();
  const generateMutation = trpc.video.generate.useMutation();
  const captionMutation = trpc.video.generateCaption.useMutation();

  useEffect(() => {
    const runGeneration = async () => {
      try {
        if (!videoId) return;

        // Step 1: Generate script
        setCurrentStep("script");
        const scriptResult = await scriptMutation.mutateAsync({ videoId: Number(videoId) });

        // Step 2: Generate video
        setCurrentStep("video");
        const videoResult = await generateMutation.mutateAsync({
          videoId: Number(videoId),
          script: scriptResult.script,
        });

        // Step 3: Generate caption
        setCurrentStep("caption");
        await captionMutation.mutateAsync({ videoId: Number(videoId) });

        // Step 4: Complete
        setCurrentStep("complete");
      } catch (err: any) {
        setError(err.message || "An error occurred during video generation");
        setCurrentStep("complete");
      }
    };

    runGeneration();
  }, [videoId]);

  const handleContinue = () => {
    if (error) {
      router.back();
    } else {
      router.push({
        pathname: "/download",
        params: { videoId },
      } as any);
    }
  };

  const getStepStatus = (step: GenerationStep) => {
    const stepIndex = STEPS.findIndex((s) => s.id === step);
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between gap-8 mt-8">
          {/* Product Info */}
          {video && (
            <View className="bg-surface rounded-xl p-4 border border-border">
              <Text className="text-sm text-muted mb-1">Product</Text>
              <Text className="text-lg font-semibold text-foreground" numberOfLines={2}>
                {video.productName}
              </Text>
              {video.productPrice && (
                <Text className="text-sm text-muted mt-2">{video.productPrice}</Text>
              )}
            </View>
          )}

          {/* Progress Steps */}
          <View className="gap-4">
            {STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              const isActive = status === "active";
              const isComplete = status === "complete";

              return (
                <View key={step.id} className="flex-row items-start gap-4">
                  {/* Step Icon */}
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mt-1"
                    style={{
                      backgroundColor: isComplete
                        ? colors.success + "20"
                        : isActive
                        ? colors.primary + "20"
                        : colors.muted + "20",
                    }}
                  >
                    {isComplete ? (
                      <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors.muted }}
                      />
                    )}
                  </View>

                  {/* Step Info */}
                  <View className="flex-1 pt-1">
                    <Text
                      className="font-semibold"
                      style={{
                        color: isActive ? colors.primary : colors.foreground,
                      }}
                    >
                      {step.title}
                    </Text>
                    <Text
                      className="text-sm mt-1"
                      style={{
                        color: isActive ? colors.primary : colors.muted,
                      }}
                    >
                      {step.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error/10 border border-error rounded-xl p-4">
              <Text className="text-error font-semibold mb-1">Generation Failed</Text>
              <Text className="text-error/80 text-sm">{error}</Text>
            </View>
          )}

          {/* Continue Button */}
          {currentStep === "complete" && (
            <TouchableOpacity
              onPress={handleContinue}
              className="rounded-xl py-4 items-center"
              style={{
                backgroundColor: error ? colors.error : colors.success,
              }}
            >
              <Text className="text-white text-lg font-semibold">
                {error ? "Go Back" : "Download Video"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
