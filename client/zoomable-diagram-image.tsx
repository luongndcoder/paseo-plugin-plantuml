import { useCallback, useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.5;
const DOUBLE_TAP_MS = 300;
// A press that moves less than this is a tap, not a drag.
const DRAG_THRESHOLD = 3;

interface Offset {
  x: number;
  y: number;
}

interface ZoomableDiagramImageProps {
  uri: string;
  height: number;
  theme: PluginTheme;
  onError?: () => void;
}

// Scale 1 shows the whole diagram (`contain`), so panning is only meaningful once zoomed in.
// Offsets are clamped so the scaled image always covers its own frame edge to edge.
function clampOffset(offset: Offset, scale: number, size: { width: number; height: number }) {
  const maxX = ((scale - 1) * size.width) / 2;
  const maxY = ((scale - 1) * size.height) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

export function ZoomableDiagramImage({ uri, height, theme, onError }: ZoomableDiagramImageProps) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const sizeRef = useRef({ width: 0, height });
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const dragStartRef = useRef<Offset>({ x: 0, y: 0 });
  const lastTapRef = useRef(0);

  const applyZoom = useCallback((nextScale: number) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    // Keep the point at the frame centre fixed while zooming.
    const ratio = clampedScale / scaleRef.current;
    const nextOffset = clampOffset(
      { x: offsetRef.current.x * ratio, y: offsetRef.current.y * ratio },
      clampedScale,
      sizeRef.current,
    );
    scaleRef.current = clampedScale;
    offsetRef.current = nextOffset;
    setScale(clampedScale);
    setOffset(nextOffset);
  }, []);

  const zoomIn = useCallback(() => applyZoom(scaleRef.current * ZOOM_STEP), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(scaleRef.current / ZOOM_STEP), [applyZoom]);
  const reset = useCallback(() => applyZoom(MIN_SCALE), [applyZoom]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    sizeRef.current = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => scaleRef.current > MIN_SCALE,
        onPanResponderGrant: () => {
          dragStartRef.current = offsetRef.current;
          if (scaleRef.current > MIN_SCALE) setIsDragging(true);
        },
        onPanResponderMove: (_event, gesture) => {
          if (scaleRef.current <= MIN_SCALE) return;
          const next = clampOffset(
            { x: dragStartRef.current.x + gesture.dx, y: dragStartRef.current.y + gesture.dy },
            scaleRef.current,
            sizeRef.current,
          );
          offsetRef.current = next;
          setOffset(next);
        },
        onPanResponderRelease: (_event, gesture) => {
          setIsDragging(false);
          const isTap =
            Math.abs(gesture.dx) < DRAG_THRESHOLD && Math.abs(gesture.dy) < DRAG_THRESHOLD;
          if (!isTap) return;
          const now = Date.now();
          if (now - lastTapRef.current < DOUBLE_TAP_MS) {
            lastTapRef.current = 0;
            applyZoom(scaleRef.current > MIN_SCALE ? MIN_SCALE : 2);
          } else {
            lastTapRef.current = now;
          }
        },
        onPanResponderTerminate: () => setIsDragging(false),
      }),
    [applyZoom],
  );

  const styles = useMemo(
    () => ({
      frame: {
        width: "100%" as const,
        height,
        overflow: "hidden" as const,
        borderRadius: 6,
        backgroundColor: "#ffffff",
      },
      image: {
        width: "100%" as const,
        height: "100%" as const,
        resizeMode: "contain" as const,
      },
      toolbar: {
        position: "absolute" as const,
        top: 8,
        right: 8,
        flexDirection: "row" as const,
        gap: 4,
      },
      toolButton: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.surface2,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
    }),
    [height, theme],
  );

  // `cursor` is a react-native-web style; native ignores it.
  const canvasStyle = useMemo(() => {
    let cursor = "default";
    if (scale > MIN_SCALE) cursor = isDragging ? "grabbing" : "grab";
    return { flex: 1, cursor } as unknown as ViewStyle;
  }, [isDragging, scale]);
  const transformStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
      height: "100%",
      transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }],
    }),
    [offset, scale],
  );

  const tools = [
    { icon: "ZoomIn", label: "Phóng to", onPress: zoomIn, disabled: scale >= MAX_SCALE },
    { icon: "ZoomOut", label: "Thu nhỏ", onPress: zoomOut, disabled: scale <= MIN_SCALE },
    { icon: "Scan", label: "Vừa khung", onPress: reset, disabled: scale === MIN_SCALE },
  ];

  return (
    <View style={styles.frame} onLayout={handleLayout}>
      <View style={canvasStyle} {...panResponder.panHandlers}>
        <View style={transformStyle}>
          <Image source={{ uri }} style={styles.image} onError={onError} />
        </View>
      </View>
      <View style={styles.toolbar}>
        {tools.map((tool) => (
          <Pressable
            key={tool.icon}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
            disabled={tool.disabled}
            onPress={tool.onPress}
            style={[styles.toolButton, tool.disabled ? { opacity: 0.4 } : null]}
          >
            <Icon name={tool.icon} size={14} color={theme.colors.foreground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
