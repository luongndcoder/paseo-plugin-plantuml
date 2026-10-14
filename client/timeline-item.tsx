import { useMemo } from "react";
import { View, Text } from "react-native";
import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { useRevealedText } from "@getpaseo/plugin/client/react-native";
import type { PlantUmlTimelineData } from "../shared/schema";
import { DiagramCard } from "./diagram-card";

export function PlantUmlTimelineItem({
  item,
  theme,
  layout,
}: PluginTimelineItemProps<PlantUmlTimelineData>) {
  const data = item.data;

  const styles = useMemo(
    () => ({
      container: {
        width: "100%" as const,
        marginVertical: 4,
      },
      textBlock: {
        fontSize: 14,
        lineHeight: 22,
        color: theme.colors.foreground,
        marginVertical: 4,
      },
    }),
    [theme]
  );

  return (
    <View style={styles.container}>
      {data.blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <TextBlock
              key={`text-${index}`}
              text={block.content}
              phase={data.phase}
              style={styles.textBlock}
            />
          );
        }

        if (block.type === "diagram") {
          return (
            <DiagramCard
              key={block.id || `diagram-${index}`}
              id={block.id}
              code={block.code}
              title={block.title}
              theme={theme}
              compact={layout.compact}
            />
          );
        }

        return null;
      })}
    </View>
  );
}

function TextBlock({
  text,
  phase,
  style,
}: {
  text: string;
  phase: "streaming" | "complete";
  style: any;
}) {
  const revealed = useRevealedText(text, phase);
  if (!revealed) return null;
  return (
    <Text selectable style={style}>
      {revealed}
    </Text>
  );
}
