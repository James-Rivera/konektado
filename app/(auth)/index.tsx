import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const TOP_CLUSTER_LINES = [
  { left: "66%", top: 42, width: 90, rotate: "-18deg" },
  { left: "76%", top: 72, width: 36, rotate: "-135deg" },
  { left: "62%", top: 78, width: 82, rotate: "124deg" },
  { left: "56%", top: 38, width: 44, rotate: "72deg" },
  { left: "61%", top: 130, width: 42, rotate: "32deg" },
];

const BOTTOM_CLUSTER_LINES = [
  { left: "-8%", top: 645, width: 90, rotate: "30deg" },
  { left: "4%", top: 635, width: 130, rotate: "-10deg" },
  { left: "19%", top: 685, width: 110, rotate: "-152deg" },
  { left: "39%", top: 702, width: 70, rotate: "121deg" },
  { left: "49%", top: 613, width: 63, rotate: "77deg" },
];

const TOP_CLUSTER_DOTS = [
  { left: "64%", top: 28, size: 8, color: "#F4F7FF" },
  { left: "73%", top: 20, size: 12, color: "#F4F7FF" },
  { left: "86%", top: 28, size: 12, color: "#F4F7FF" },
  { left: "66%", top: 70, size: 12, color: "#F4F7FF" },
  { left: "77%", top: 106, size: 12, color: "#F4F7FF" },
  { left: "88%", top: 96, size: 8, color: "#D8E8FF" },
  { left: "63%", top: 124, size: 12, color: "#F4BB37" },
];

const BOTTOM_CLUSTER_DOTS = [
  { left: "-4%", top: 618, size: 16, color: "#E8F1FF" },
  { left: "13%", top: 610, size: 12, color: "#F4F7FF" },
  { left: "13%", top: 665, size: 12, color: "#F4F7FF" },
  { left: "31%", top: 744, size: 12, color: "#E8F1FF" },
  { left: "20%", top: 735, size: 18, color: "#F4BB37" },
  { left: "49%", top: 604, size: 16, color: "#F4F7FF" },
  { left: "53%", top: 665, size: 20, color: "#F4BB37" },
  { left: "34%", top: 716, size: 16, color: "#E8F1FF" },
];

export default function AuthSplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 1700);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.replace("/(auth)/login")}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={["#6AA5EC", "#4B8CDB", "#3D80D2"]}
        locations={[0, 0.52, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.overlay}>
          {TOP_CLUSTER_LINES.map((line, index) => (
            <View
              key={`top-line-${index}`}
              style={[
                styles.line,
                {
                  left: line.left,
                  top: line.top,
                  width: line.width,
                  transform: [{ rotate: line.rotate }],
                },
              ]}
            />
          ))}

          {BOTTOM_CLUSTER_LINES.map((line, index) => (
            <View
              key={`bottom-line-${index}`}
              style={[
                styles.line,
                {
                  left: line.left,
                  top: line.top,
                  width: line.width,
                  transform: [{ rotate: line.rotate }],
                },
              ]}
            />
          ))}

          {TOP_CLUSTER_DOTS.map((dot, index) => (
            <View
              key={`top-dot-${index}`}
              style={[
                styles.dot,
                {
                  left: dot.left,
                  top: dot.top,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                },
              ]}
            />
          ))}

          {BOTTOM_CLUSTER_DOTS.map((dot, index) => (
            <View
              key={`bottom-dot-${index}`}
              style={[
                styles.dot,
                {
                  left: dot.left,
                  top: dot.top,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                },
              ]}
            />
          ))}

          <View style={styles.centerContent}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>Konektado</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.tagline}>Trabaho sa Komunidad. Isang App.</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  centerContent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "42%",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "AvantGarde",
    color: "#FFFFFF",
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F4BB37",
    marginTop: 16,
    marginLeft: 3,
  },
  tagline: {
    marginTop: 10,
    color: "#F5F9FF",
    fontFamily: "Satoshi-Regular",
    fontSize: 18,
    lineHeight: 24,
  },
  line: {
    position: "absolute",
    height: 1,
    backgroundColor: "#D3E5FF",
    opacity: 0.95,
  },
  dot: {
    position: "absolute",
  },
});
