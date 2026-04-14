import { StyleSheet, Text, View } from "react-native";

type Point = {
  left: number;
  top: number;
  size: number;
  color?: string;
};

type Segment = {
  left: number;
  top: number;
  width: number;
  rotation: string;
};

const ACCENT = "#FFC247";
const NODE = "#FFFFFF";
const LINE = "rgba(255, 255, 255, 0.7)";

const topPoints: Point[] = [
  { left: 239, top: 28, size: 9 },
  { left: 285, top: 27, size: 12 },
  { left: 362, top: 3, size: 8 },
  { left: 341, top: 36, size: 12 },
  { left: 320, top: 69, size: 8 },
  { left: 347, top: 95, size: 9 },
  { left: 228, top: 120, size: 12, color: ACCENT },
  { left: 264, top: 142, size: 11 },
];

const topSegments: Segment[] = [
  { left: 244, top: 33, width: 42, rotation: "-1deg" },
  { left: 293, top: 30, width: 76, rotation: "-19deg" },
  { left: 249, top: 67, width: 94, rotation: "-18deg" },
  { left: 325, top: 44, width: 34, rotation: "-56deg" },
  { left: 324, top: 74, width: 33, rotation: "55deg" },
  { left: 233, top: 127, width: 42, rotation: "34deg" },
  { left: 269, top: 83, width: 74, rotation: "-57deg" },
];

const bottomPoints: Point[] = [
  { left: -10, top: 646, size: 18 },
  { left: 52, top: 580, size: 12 },
  { left: 52, top: 635, size: 12 },
  { left: 184, top: 604, size: 16 },
  { left: 198, top: 664, size: 20, color: ACCENT },
  { left: 43, top: 716, size: 18, color: ACCENT },
  { left: 129, top: 713, size: 15 },
  { left: 103, top: 773, size: 12 },
];

const bottomSegments: Segment[] = [
  { left: 7, top: 646, width: 57, rotation: "-12deg" },
  { left: 59, top: 640, width: 126, rotation: "-13deg" },
  { left: 59, top: 589, width: 54, rotation: "90deg" },
  { left: 191, top: 619, width: 62, rotation: "78deg" },
  { left: 9, top: 684, width: 115, rotation: "27deg" },
  { left: 112, top: 721, width: 62, rotation: "-61deg" },
];

function NetworkLine({ left, top, width, rotation }: Segment) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.line,
        {
          left,
          top,
          width,
          transform: [{ rotate: rotation }],
        },
      ]}
    />
  );
}

function NetworkPoint({ left, top, size, color = NODE }: Point) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.point,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function AppSplashScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.gradientBase} />
      <View style={styles.gradientGlowTop} />
      <View style={styles.gradientGlowBottom} />

      {topSegments.map((segment, index) => (
        <NetworkLine key={`top-line-${index}`} {...segment} />
      ))}
      {topPoints.map((point, index) => (
        <NetworkPoint key={`top-point-${index}`} {...point} />
      ))}

      {bottomSegments.map((segment, index) => (
        <NetworkLine key={`bottom-line-${index}`} {...segment} />
      ))}
      {bottomPoints.map((point, index) => (
        <NetworkPoint key={`bottom-point-${index}`} {...point} />
      ))}

      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>Konektado</Text>
          <View style={styles.brandDot} />
        </View>
        <Text style={styles.tagline}>Trabaho sa Komunidad. Isang App.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#4C8CDE",
    overflow: "hidden",
  },
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#4C8CDE",
  },
  gradientGlowTop: {
    position: "absolute",
    left: -80,
    right: -80,
    top: -140,
    height: 360,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  gradientGlowBottom: {
    position: "absolute",
    left: -60,
    right: -60,
    bottom: -210,
    height: 420,
    borderTopLeftRadius: 260,
    borderTopRightRadius: 260,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  brandBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "41%",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  brandText: {
    color: "#FFFFFF",
    fontFamily: "AvantGarde",
    fontSize: 33,
    lineHeight: 34,
    letterSpacing: -1.2,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginBottom: 4,
    backgroundColor: ACCENT,
  },
  tagline: {
    marginTop: 12,
    color: "#FFFFFF",
    fontFamily: "Satoshi-Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  line: {
    position: "absolute",
    height: 1,
    backgroundColor: LINE,
  },
  point: {
    position: "absolute",
  },
});
