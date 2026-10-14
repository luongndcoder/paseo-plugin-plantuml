import { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import type { PluginTheme } from "@getpaseo/plugin";
import { Icon, Modal, copyText, useToast } from "@getpaseo/plugin/client/react-native";
import { buildPlantUmlUrl } from "../shared/plantuml";
import { ZoomableDiagramImage } from "./zoomable-diagram-image";

interface DiagramCardProps {
  id: string;
  code: string;
  title?: string;
  theme: PluginTheme;
  compact: boolean;
  serverUrl?: string;
}

export function DiagramCard({
  code,
  title,
  theme,
  compact,
  serverUrl = "https://www.plantuml.com/plantuml",
}: DiagramCardProps) {
  // Mode: "preview" (image) or "code" (raw PlantUML source)
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [format, setFormat] = useState<"svg" | "png">("png");
  const [modalOpen, setModalOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const toast = useToast();

  const diagramUrl = useMemo(
    () => buildPlantUmlUrl(code, format, serverUrl),
    [code, format, serverUrl]
  );

  const displayTitle = title || "PlantUML Diagram";

  const handleCopyCode = async () => {
    try {
      await copyText(code);
      toast.show("Đã sao chép mã nguồn PlantUML", { variant: "success" });
    } catch {
      toast.error("Không thể sao chép vào bộ nhớ tạm");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await copyText(diagramUrl);
      toast.show("Đã sao chép URL ảnh Diagram", { variant: "success" });
    } catch {
      toast.error("Không thể sao chép URL");
    }
  };

  const styles = useMemo(
    () => ({
      container: {
        marginVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        overflow: "hidden" as const,
      },
      header: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: compact ? 10 : 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface2,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      headerLeft: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        flex: 1,
      },
      titleText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: theme.colors.foreground,
      },
      actionsRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
      },
      tabButton: (isActive: boolean) => ({
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: isActive ? theme.colors.accent : "transparent",
      }),
      tabButtonText: (isActive: boolean) => ({
        fontSize: 12,
        fontWeight: "500" as const,
        color: isActive ? theme.colors.accentForeground : theme.colors.foregroundMuted,
      }),
      actionIconBtn: {
        padding: 5,
        borderRadius: 4,
        backgroundColor: "transparent",
      },
      contentArea: {
        padding: compact ? 8 : 12,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        minHeight: 180,
        backgroundColor: theme.colors.surface0,
      },
      codeScrollView: {
        width: "100%" as const,
        maxHeight: 280,
        backgroundColor: theme.colors.surface1,
        borderRadius: 6,
        padding: 10,
      },
      codeText: {
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 12,
        lineHeight: 18,
        color: theme.colors.foreground,
      },
      errorBox: {
        padding: 16,
        alignItems: "center" as const,
        gap: 8,
      },
      errorText: {
        fontSize: 13,
        color: theme.colors.statusDanger,
        textAlign: "center" as const,
      },
      modalBar: {
        flexDirection: "row" as const,
        justifyContent: "flex-end" as const,
        gap: 10,
        marginBottom: 10,
      },
      badge: {
        fontSize: 11,
        color: theme.colors.foregroundMuted,
        backgroundColor: theme.colors.surface2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      },
    }),
    [theme, compact]
  );

  return (
    <View style={styles.container}>
      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="Network" size={16} color={theme.colors.accent} />
          <Text style={styles.titleText} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {/* Format Switcher */}
          <Pressable
            accessibilityRole="button"
            style={styles.actionIconBtn}
            onPress={() => setFormat((f) => (f === "png" ? "svg" : "png"))}
          >
            <Text style={styles.badge}>{format.toUpperCase()}</Text>
          </Pressable>

          {/* Tab: Preview */}
          <Pressable
            accessibilityRole="button"
            style={styles.tabButton(activeTab === "preview")}
            onPress={() => setActiveTab("preview")}
          >
            <Text style={styles.tabButtonText(activeTab === "preview")}>Preview</Text>
          </Pressable>

          {/* Tab: Code */}
          <Pressable
            accessibilityRole="button"
            style={styles.tabButton(activeTab === "code")}
            onPress={() => setActiveTab("code")}
          >
            <Text style={styles.tabButtonText(activeTab === "code")}>Code</Text>
          </Pressable>

          {/* Fullscreen Expand Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Phóng to sơ đồ"
            style={styles.actionIconBtn}
            onPress={() => setModalOpen(true)}
          >
            <Icon name="Maximize2" size={14} color={theme.colors.foregroundMuted} />
          </Pressable>

          {/* Copy Code Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sao chép PlantUML code"
            style={styles.actionIconBtn}
            onPress={handleCopyCode}
          >
            <Icon name="Copy" size={14} color={theme.colors.foregroundMuted} />
          </Pressable>
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.contentArea}>
        {activeTab === "preview" ? (
          hasError ? (
            <View style={styles.errorBox}>
              <Icon name="AlertTriangle" size={24} color={theme.colors.statusDanger} />
              <Text style={styles.errorText}>
                Không thể tải diagram từ PlantUML server. Hãy kiểm tra kết nối mạng hoặc cú pháp.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.tabButton(true)}
                onPress={() => setActiveTab("code")}
              >
                <Text style={styles.tabButtonText(true)}>Xem mã nguồn</Text>
              </Pressable>
            </View>
          ) : (
            <ZoomableDiagramImage
              uri={diagramUrl}
              height={compact ? 280 : 360}
              theme={theme}
              onError={() => setHasError(true)}
            />
          )
        ) : (
          <ScrollView style={styles.codeScrollView}>
            <Text selectable style={styles.codeText}>
              {code}
            </Text>
          </ScrollView>
        )}
      </View>

      {/* Modal View Full Diagram */}
      <Modal
        title={displayTitle}
        icon={<Icon name="Network" size={18} color={theme.colors.foreground} />}
        open={modalOpen}
        onOpenChange={setModalOpen}
      >
        <Modal.Content>
          <View style={styles.modalBar}>
            <Pressable
              accessibilityRole="button"
              style={[styles.tabButton(false), { backgroundColor: theme.colors.surface2 }]}
              onPress={handleCopyUrl}
            >
              <Text style={styles.tabButtonText(false)}>Sao chép URL ảnh</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.tabButton(true)}
              onPress={handleCopyCode}
            >
              <Text style={styles.tabButtonText(true)}>Sao chép Code</Text>
            </Pressable>
          </View>
          <ZoomableDiagramImage uri={diagramUrl} height={560} theme={theme} />
        </Modal.Content>
      </Modal>
    </View>
  );
}
