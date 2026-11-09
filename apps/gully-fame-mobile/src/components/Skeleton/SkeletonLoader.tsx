import React, { useEffect, useId } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { SkeletonRoot } from "./Skeleton";

// Off-white bones with a warm glow, for the app's dark brown background.
const BONE = "#F3E9D6";
const JOINT = "#D9C7A6";
const SOCKET = "#3C2610";
const GLOW = "#FFE2A8";
const TEXT = "#E8D9BF";

/** The figure is drawn in a 100 x 160 unit box and scaled to `size` (its height in px). */
const UNITS_W = 100;
const UNITS_H = 160;
/** Each limb segment is drawn in a box this wide, with this much room above and below the bone. */
const LIMB_W = 12;
const PAD = 4;

const HALF_LOOP_MS = 600; // there and back again: 1.2 s per loop
const GLOW_MS = 900;
const DOTS_MS = 1200;

/** Angles in degrees at the two ends of the loop; 0 is hanging straight down. */
type Swing = { from: number; to: number };

const POSE = {
  leftUpperArm: { from: 12, to: 34 },
  leftForearm: { from: -10, to: -35 },
  rightUpperArm: { from: -34, to: -12 },
  rightForearm: { from: 35, to: 10 },
  leftThigh: { from: 4, to: 14 },
  leftShin: { from: -2, to: -14 },
  rightThigh: { from: -14, to: -4 },
  rightShin: { from: 14, to: 2 },
} satisfies Record<string, Swing>;

/**
 * One bone that rotates around the joint at its top. `x`/`y` place that joint in the
 * parent's units; a child bone hangs from this bone's far end and follows its rotation.
 */
function Bone({
  k,
  x,
  y,
  length,
  swing,
  phase,
  end,
  children,
}: {
  /** px per unit */
  k: number;
  x: number;
  y: number;
  length: number;
  swing: Swing;
  phase: SharedValue<number>;
  end?: "hand" | "footLeft" | "footRight";
  children?: React.ReactNode;
}) {
  const { from, to } = swing;
  const rotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${from + (to - from) * phase.value}deg` }],
  }));
  const c = LIMB_W / 2;
  const boxH = length + PAD * 2;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: (x - c) * k,
          top: (y - PAD) * k,
          width: LIMB_W * k,
          height: boxH * k,
          transformOrigin: [c * k, PAD * k, 0],
        },
        rotation,
      ]}
    >
      <Svg width={LIMB_W * k} height={boxH * k} viewBox={`0 0 ${LIMB_W} ${boxH}`}>
        <Line x1={c} y1={PAD} x2={c} y2={PAD + length} stroke={BONE} strokeWidth={2.6} strokeLinecap="round" />
        <Circle cx={c} cy={PAD + length} r={1.9} fill={BONE} />
        {end === "hand" && <Circle cx={c} cy={PAD + length + 1.6} r={2.2} fill={BONE} />}
        {end === "footLeft" && <Ellipse cx={c - 2} cy={PAD + length + 1.4} rx={3.6} ry={1.6} fill={BONE} />}
        {end === "footRight" && <Ellipse cx={c + 2} cy={PAD + length + 1.4} rx={3.6} ry={1.6} fill={BONE} />}
        <Circle cx={c} cy={PAD} r={2.5} fill={JOINT} stroke={BONE} strokeWidth={0.8} />
      </Svg>
      {children}
    </Animated.View>
  );
}

/** Spine, collarbones, ribs and pelvis: the parts that do not move on their own. */
function Torso({ k }: { k: number }) {
  const ribs = [46, 52, 58, 64, 70];
  return (
    <Svg style={StyleSheet.absoluteFill} width={UNITS_W * k} height={UNITS_H * k} viewBox={`0 0 ${UNITS_W} ${UNITS_H}`}>
      <Line x1={50} y1={35} x2={50} y2={92} stroke={BONE} strokeWidth={2.6} strokeLinecap="round" />
      {Array.from({ length: 10 }, (_, i) => (
        <Circle key={i} cx={50} cy={38 + i * 5.8} r={1.6} fill={JOINT} />
      ))}
      <Path d="M36 40 Q50 36 64 40" stroke={BONE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      {ribs.map((y, i) => {
        const w = 13 - i * 1.3;
        return (
          <React.Fragment key={y}>
            <Path
              d={`M50 ${y} C ${50 - w} ${y - 3}, ${50 - w - 2} ${y + 5}, ${50 - w + 3} ${y + 8}`}
              stroke={BONE}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={`M50 ${y} C ${50 + w} ${y - 3}, ${50 + w + 2} ${y + 5}, ${50 + w - 3} ${y + 8}`}
              stroke={BONE}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          </React.Fragment>
        );
      })}
      <Path
        d="M40 90 Q50 86 60 90 Q63 98 57 101 L43 101 Q37 98 40 90 Z"
        stroke={BONE}
        strokeWidth={2.4}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Skull, eye sockets, nose and jaw, with a soft glow behind them. */
function Skull({ k, glowId }: { k: number; glowId: string }) {
  return (
    <Svg width={40 * k} height={40 * k} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id={glowId} cx={20} cy={20} r={20} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={GLOW} stopOpacity={0.45} />
          <Stop offset="0.55" stopColor={GLOW} stopOpacity={0.18} />
          <Stop offset="1" stopColor={GLOW} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={20} r={20} fill={`url(#${glowId})`} />
      <Circle cx={20} cy={19} r={11} fill={BONE} />
      <Ellipse cx={16} cy={19} rx={3} ry={3.4} fill={SOCKET} />
      <Ellipse cx={24} cy={19} rx={3} ry={3.4} fill={SOCKET} />
      <Path d="M20 23 L18.6 26 L21.4 26 Z" fill={SOCKET} />
      <Rect x={14} y={28} width={12} height={6} rx={3} fill={BONE} />
      <Line x1={15.5} y1={31} x2={24.5} y2={31} stroke={SOCKET} strokeWidth={0.8} />
      {[17, 20, 23].map((x) => (
        <Line key={x} x1={x} y1={29.5} x2={x} y2={32.5} stroke={SOCKET} strokeWidth={0.6} />
      ))}
    </Svg>
  );
}

/** "Loading" with three dots that light up one after another. */
function LoadingText({ dots }: { dots: SharedValue<number> }) {
  return (
    <View style={styles.textRow}>
      <Text style={styles.text}>Loading</Text>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} dots={dots} />
      ))}
    </View>
  );
}

function Dot({ index, dots }: { index: number; dots: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: dots.value > (index + 1) / 4 ? 1 : 0.25 }));
  return <Animated.Text style={[styles.text, style]}>.</Animated.Text>;
}

/**
 * A dancing human skeleton for full-screen loading states. Bones swing around their joints,
 * the skull glows and the dots count up, all on the UI thread. With "Remove animations"
 * switched on it shows the figure standing still.
 */
export function SkeletonLoader({ size = 160, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const k = size / UNITS_H;
  const glowId = `skullGlow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const phase = useSharedValue(0.5);
  const glow = useSharedValue(1);
  const dots = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.ease);
    phase.value = 0;
    phase.value = withRepeat(withTiming(1, { duration: HALF_LOOP_MS, easing: ease }), -1, true);
    glow.value = 0.6;
    glow.value = withRepeat(withTiming(1, { duration: GLOW_MS, easing: ease }), -1, true);
    dots.value = 0;
    dots.value = withRepeat(withTiming(1, { duration: DOTS_MS, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(phase);
      cancelAnimation(glow);
      cancelAnimation(dots);
    };
  }, [reduceMotion, phase, glow, dots]);

  const bob = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2 * k * Math.sin(Math.PI * phase.value) },
      { rotate: `${(phase.value - 0.5) * 6}deg` },
    ],
  }));
  const skullGlow = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <SkeletonRoot style={[styles.root, style]}>
      <Animated.View
        style={[{ width: UNITS_W * k, height: UNITS_H * k, transformOrigin: [50 * k, UNITS_H * k, 0] }, bob]}
      >
        <Torso k={k} />

        <Bone k={k} x={36} y={40} length={24} swing={POSE.leftUpperArm} phase={phase}>
          <Bone k={k} x={LIMB_W / 2} y={PAD + 24} length={21} swing={POSE.leftForearm} phase={phase} end="hand" />
        </Bone>
        <Bone k={k} x={64} y={40} length={24} swing={POSE.rightUpperArm} phase={phase}>
          <Bone k={k} x={LIMB_W / 2} y={PAD + 24} length={21} swing={POSE.rightForearm} phase={phase} end="hand" />
        </Bone>
        <Bone k={k} x={44} y={99} length={28} swing={POSE.leftThigh} phase={phase}>
          <Bone k={k} x={LIMB_W / 2} y={PAD + 28} length={25} swing={POSE.leftShin} phase={phase} end="footLeft" />
        </Bone>
        <Bone k={k} x={56} y={99} length={28} swing={POSE.rightThigh} phase={phase}>
          <Bone k={k} x={LIMB_W / 2} y={PAD + 28} length={25} swing={POSE.rightShin} phase={phase} end="footRight" />
        </Bone>

        <Animated.View style={[{ position: "absolute", left: 30 * k, top: 0 }, skullGlow]}>
          <Skull k={k} glowId={glowId} />
        </Animated.View>
      </Animated.View>

      <LoadingText dots={dots} />
    </SkeletonRoot>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  textRow: { flexDirection: "row", marginTop: 16 },
  text: { color: TEXT, fontSize: 14, letterSpacing: 0.5, opacity: 0.85 },
});
