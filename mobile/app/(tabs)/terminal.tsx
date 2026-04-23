import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Terminal from "@/components/Terminal";
import { useColors } from "@/hooks/useColors";

const TAB_HEIGHT = Platform.OS === "web" ? 84 : 80;

export default function TerminalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.terminalBg, paddingBottom: TAB_HEIGHT }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 6,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.primary }]}>$ Terminal</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          DevMobile Shell
        </Text>
      </View>
      <Terminal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  headerSub: { fontSize: 12 },
});
