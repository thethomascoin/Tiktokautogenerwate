import { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const handleGuestMode = async () => {
    try {
      setLoading(true);
      const guestUser = {
        id: Math.random(),
        openId: `guest_${Date.now()}`,
        name: "Guest User",
        email: "guest@shopvid.local",
        loginMethod: "guest" as const,
        lastSignedIn: new Date(),
      };

      await Auth.setUserInfo(guestUser);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Guest mode error:", error);
      Alert.alert("Error", "Failed to enter guest mode");
      setLoading(false);
    }
  };

  const handleLogin = () => {
    Alert.alert(
      "OAuth Login",
      "In production, this would redirect to your OAuth provider to sign in."
    );
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center gap-8">
          {/* Logo/Header */}
          <View className="items-center gap-4">
            <View
              className="w-24 h-24 rounded-3xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-4xl">🎬</Text>
            </View>
            <Text className="text-4xl font-bold text-foreground text-center">ShopVid Auto</Text>
            <Text className="text-base text-muted text-center max-w-xs leading-relaxed">
              Automate TikTok Shop product videos with AI. Create engaging UGC content in minutes.
            </Text>
          </View>

          {/* Features List */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground mb-2">What you can do:</Text>

            {[
              { icon: "📱", text: "Paste TikTok Shop product URLs" },
              { icon: "🤖", text: "AI analyzes and creates video scripts" },
              { icon: "🎥", text: "Generate UGC-style videos automatically" },
              { icon: "📊", text: "Track video performance with analytics" },
            ].map((feature, index) => (
              <View key={index} className="flex-row items-center gap-3 bg-surface rounded-xl p-4">
                <Text className="text-2xl">{feature.icon}</Text>
                <Text className="flex-1 text-foreground font-medium">{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Login Options */}
          <View className="gap-3">
            {/* Guest Mode Button */}
            <TouchableOpacity
              onPress={handleGuestMode}
              disabled={loading}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text className="text-background text-lg font-semibold">Continue as Guest</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
              <Text className="text-muted text-sm">or</Text>
              <View className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
            </View>

            {/* OAuth Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="rounded-xl py-4 items-center border-2"
              style={{ borderColor: colors.primary }}
            >
              <Text className="text-primary text-lg font-semibold">Sign in with Account</Text>
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="bg-surface rounded-xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">Guest Mode Info</Text>
            <Text className="text-sm text-muted leading-relaxed">
              Guest mode lets you try ShopVid Auto without signing in. Your videos will be stored locally on this device.
            </Text>
          </View>

          {/* Footer */}
          <View className="items-center gap-2">
            <Text className="text-xs text-muted">By continuing, you agree to our</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity>
                <Text className="text-xs" style={{ color: colors.primary }}>
                  Terms of Service
                </Text>
              </TouchableOpacity>
              <Text className="text-xs text-muted">•</Text>
              <TouchableOpacity>
                <Text className="text-xs" style={{ color: colors.primary }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
