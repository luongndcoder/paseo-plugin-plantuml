import { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings, useWorkspace } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { readDiagramFileContract, listDiagramFilesContract } from "../shared/rpc";
import { plantUmlSettings, DEFAULT_PLANTUML_CONFIG } from "../shared/settings";
import { extractPlantUmlBlocks, type DiagramBlock } from "../shared/plantuml";
import { DiagramCard } from "./diagram-card";

export function WorkspaceDiagramPanel({
  workspaceId,
  theme,
  layout,
}: PluginWorkspacePanelProps) {
  const readDiagramFile = useRpc(readDiagramFileContract);
  const listDiagramFiles = useRpc(listDiagramFilesContract);
  const settingsState = useSettings(plantUmlSettings);
  const settings =
    settingsState.status === "ready"
      ? settingsState.values
      : DEFAULT_PLANTUML_CONFIG;

  const [filePath, setFilePath] = useState("");
  const [candidateFiles, setCandidateFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "manual">("file");
  const [manualCode, setManualCode] = useState(
    "@startuml\nactor User\nparticipant System\nUser -> System: Request\nSystem --> User: Response\n@enduml"
  );

  // Load candidate markdown/puml files when panel loads
  useEffect(() => {
    let mounted = true;
    listDiagramFiles({ workspaceId })
      .then((res) => {
        if (mounted && res?.ok && Array.isArray(res.files) && res.files.length > 0) {
          setCandidateFiles(res.files);
          if (!filePath) {
            setFilePath(res.files[0]);
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const loadFile = async (targetPath: string) => {
    if (!targetPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await readDiagramFile({
        workspaceId,
        filePath: targetPath.trim(),
      });
      if (res?.ok && res.content !== undefined) {
        setFileContent(res.content);
        setFilePath(targetPath.trim());
      } else {
        setError(res?.error || "Không thể đọc nội dung file");
        setFileContent(null);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi gọi RPC đọc file");
      setFileContent(null);
    } finally {
      setLoading(false);
    }
  };

  const parsedBlocks: DiagramBlock[] = useMemo(() => {
    const rawText = activeTab === "file" ? fileContent || "" : manualCode;
    return extractPlantUmlBlocks(rawText);
  }, [activeTab, fileContent, manualCode]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface0,
        padding: layout.compact ? 12 : 20,
      }}
    >
      {/* Top Header / Mode Switcher */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="Network" size={20} color={theme.colors.accent} />
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            PlantUML Preview
          </Text>
        </View>

        {/* Tab switcher: File vs Manual Scratchpad */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.surface2,
            borderRadius: 6,
            padding: 2,
          }}
        >
          <Pressable
            onPress={() => setActiveTab("file")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor:
                activeTab === "file" ? theme.colors.surface0 : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color:
                  activeTab === "file"
                    ? theme.colors.foreground
                    : theme.colors.foregroundMuted,
              }}
            >
              File Markdown / PUML
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("manual")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor:
                activeTab === "manual" ? theme.colors.surface0 : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color:
                  activeTab === "manual"
                    ? theme.colors.foreground
                    : theme.colors.foregroundMuted,
              }}
            >
              Scratchpad (Soạn tay)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Mode: File Input & Quick Selector */}
      {activeTab === "file" ? (
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <TextInput
              value={filePath}
              onChangeText={setFilePath}
              placeholder="Nhập đường dẫn file (VD: docs/arch.md, README.md, diagram.puml)..."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={{
                flex: 1,
                height: 38,
                backgroundColor: theme.colors.surface1,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 6,
                paddingHorizontal: 12,
                color: theme.colors.foreground,
                fontSize: 13,
              }}
              onSubmitEditing={() => loadFile(filePath)}
            />
            <Pressable
              onPress={() => loadFile(filePath)}
              disabled={loading}
              style={{
                height: 38,
                paddingHorizontal: 16,
                backgroundColor: theme.colors.accent,
                borderRadius: 6,
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.accentForeground}
                />
              ) : (
                <>
                  <Icon
                    name="RefreshCw"
                    size={14}
                    color={theme.colors.accentForeground}
                  />
                  <Text
                    style={{
                      color: theme.colors.accentForeground,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Xem Preview
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Quick candidates chip selector */}
          {candidateFiles.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
            >
              <Text
                style={{
                  color: theme.colors.foregroundMuted,
                  fontSize: 12,
                  alignSelf: "center",
                  marginRight: 4,
                }}
              >
                Gợi ý file:
              </Text>
              {candidateFiles.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => loadFile(f)}
                  style={{
                    backgroundColor:
                      filePath === f
                        ? theme.colors.surface2
                        : theme.colors.surface1,
                    borderWidth: 1,
                    borderColor:
                      filePath === f
                        ? theme.colors.accent
                        : theme.colors.border,
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color:
                        filePath === f
                          ? theme.colors.foreground
                          : theme.colors.foregroundMuted,
                    }}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        /* Mode: Scratchpad Textarea */
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            Nhập hoặc dán mã PlantUML (@startuml ... @enduml):
          </Text>
          <TextInput
            multiline
            numberOfLines={6}
            value={manualCode}
            onChangeText={setManualCode}
            style={{
              backgroundColor: theme.colors.surface1,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 6,
              padding: 10,
              color: theme.colors.foreground,
              fontSize: 12,
              height: 120,
              textAlignVertical: "top",
            }}
          />
        </View>
      )}

      {/* Error notification */}
      {error && (
        <View
          style={{
            padding: 10,
            borderRadius: 6,
            backgroundColor: theme.colors.surface1,
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.statusDanger,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.colors.statusDanger, fontSize: 13 }}>
            {error}
          </Text>
        </View>
      )}

      {/* Main Diagrams View */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
      >
        {parsedBlocks.length === 0 ? (
          <View
            style={{
              padding: 32,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: theme.colors.border,
              borderRadius: 8,
            }}
          >
            <Icon
              name="FileQuestion"
              size={32}
              color={theme.colors.foregroundMuted}
            />
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 14,
                fontWeight: "500",
                marginTop: 12,
              }}
            >
              {activeTab === "file" && !fileContent
                ? "Chưa chọn file markdown hoặc puml để preview."
                : "Không tìm thấy sơ đồ PlantUML nào trong nội dung."}
            </Text>
            <Text
              style={{
                color: theme.colors.foregroundMuted,
                fontSize: 12,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {activeTab === "file" && !fileContent
                ? "Chọn một file từ gợi ý ở trên hoặc nhập đường dẫn và ấn 'Xem Preview'."
                : "Cú pháp PlantUML hợp lệ bắt đầu bằng @startuml và kết thúc bằng @enduml."}
            </Text>
          </View>
        ) : (
          parsedBlocks.map((block: DiagramBlock, idx: number) => (
            <View key={block.id || idx}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.foregroundMuted,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Sơ đồ #{idx + 1}
                  {block.title ? `: ${block.title}` : ""}
                </Text>
              </View>
              <DiagramCard
                id={block.id || `diagram-${idx}`}
                code={block.code}
                title={block.title}
                theme={theme}
                compact={layout.compact}
                serverUrl={settings.serverUrl}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
