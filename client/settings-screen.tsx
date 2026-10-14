import { useState } from "react";
import {
  SettingsCard,
  SettingsSection,
  SettingsInput,
  SettingsSelect,
  SettingsAction,
} from "@getpaseo/plugin/client/ui";
import { useSettings } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { plantUmlSettings } from "../shared/settings";

export function PlantUmlSettingsScreen() {
  const settings = useSettings(plantUmlSettings);
  const toast = useToast();

  const [serverUrl, setServerUrl] = useState(
    settings.status === "ready" ? settings.values.serverUrl : "https://www.plantuml.com/plantuml"
  );

  const handleSave = async () => {
    if (settings.status !== "ready") return;
    const ok = await settings.save(
      {
        ...settings.values,
        serverUrl: serverUrl.trim(),
      },
      settings.revision
    );

    if (ok) {
      toast.show("Đã lưu cài đặt PlantUML", { variant: "success" });
    } else {
      toast.error("Không thể lưu cài đặt");
    }
  };

  const handleReset = async () => {
    if (settings.status !== "ready") return;
    await settings.reset();
    setServerUrl("https://www.plantuml.com/plantuml");
    toast.show("Đã khôi phục cài đặt mặc định", { variant: "info" });
  };

  return (
    <SettingsSection title="Cấu hình PlantUML Preview">
      <SettingsCard>
        <SettingsInput
          label="PlantUML Server URL"
          placeholder="https://www.plantuml.com/plantuml"
          hint="Địa chỉ máy chủ PlantUML để render ảnh diagram (công khai hoặc nội bộ)."
          initialValue={serverUrl}
          onChangeText={setServerUrl}
        />

        <SettingsSelect
          label="Định dạng mặc định"
          value={settings.status === "ready" ? settings.values.defaultFormat : "svg"}
          options={[
            { label: "Vector SVG (Sắc nét)", value: "svg" },
            { label: "Hình ảnh PNG", value: "png" },
          ]}
          onValueChange={(val) => {
            if (settings.status === "ready") {
              settings.save(
                { ...settings.values, defaultFormat: val as "svg" | "png" },
                settings.revision
              );
            }
          }}
        />

        <SettingsSelect
          label="Chế độ xem mặc định"
          value={settings.status === "ready" ? settings.values.defaultView : "preview"}
          options={[
            { label: "Xem sơ đồ trực quan (Preview)", value: "preview" },
            { label: "Xem mã nguồn (Source Code)", value: "code" },
          ]}
          onValueChange={(val) => {
            if (settings.status === "ready") {
              settings.save(
                { ...settings.values, defaultView: val as "preview" | "code" },
                settings.revision
              );
            }
          }}
        />

        <SettingsAction
          label="Lưu thay đổi"
          actionLabel="Lưu cấu hình"
          onPress={handleSave}
        />
        <SettingsAction
          label="Khôi phục thiết lập gốc"
          actionLabel="Khôi phục mặc định"
          onPress={handleReset}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
