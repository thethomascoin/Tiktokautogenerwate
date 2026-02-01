import { Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function HistoryScreen() {
  return (
    <ScreenContainer className="p-6">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-foreground">Video History</Text>
        <Text className="mt-2 text-muted">Coming soon</Text>
      </View>
    </ScreenContainer>
  );
}
