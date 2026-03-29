import { useState, useMemo } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Settings, Globe, Mail, Info } from "lucide-react";
import { LogoUpload } from "@/components/admin/LogoUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_label: string;
  setting_value: string;
  setting_type: string;
  setting_group: string;
  sort_order: number;
}

const groupConfig: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  general: { label: "基本設定", icon: <Settings className="h-4 w-4" />, description: "網站名稱、描述、Logo 與 Favicon" },
  seo: { label: "SEO 設定", icon: <Globe className="h-4 w-4" />, description: "搜尋引擎最佳化相關設定" },
  footer: { label: "頁尾連結", icon: <Globe className="h-4 w-4" />, description: "管理頁尾區塊的連結與社群資訊" },
  email: { label: "郵件模板", icon: <Mail className="h-4 w-4" />, description: "自訂郵件樣式與內容模板" },
};

const EXCLUDED_GROUPS = new Set(["features"]);
const EXCLUDED_KEYS = new Set(["plan_bandwidth_gb", "plan_storage_gb"]);

/** Detect footer section prefixes and group settings by section */
const FOOTER_SECTION_PREFIXES = [
  { prefix: "footer_community_", label: "社群區塊" },
  { prefix: "footer_photo_", label: "攝影區塊" },
  { prefix: "footer_section3_", label: "區塊 3" },
  { prefix: "footer_section4_", label: "區塊 4" },
  { prefix: "footer_section5_", label: "區塊 5" },
];

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useAdminPage("系統設定", "管理網站基本設定、SEO、頁尾與郵件模板");

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(editedValues);
      await Promise.all(
        entries.map(async ([id, value]) => {
          const { error } = await supabase
            .from("system_settings")
            .update({ setting_value: value, updated_at: new Date().toISOString(), updated_by: user?.id })
            .eq("id", id);
          if (error) throw error;
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings-public"] });
      setEditedValues({});
      toast.success("設定已儲存");
    },
    onError: () => toast.error("儲存失敗"),
  });

  const getValue = (setting: SystemSetting) => editedValues[setting.id] ?? setting.setting_value;
  const setValue = (setting: SystemSetting, value: string) => {
    setEditedValues((prev) => ({ ...prev, [setting.id]: value }));
  };

  const groups = settings
    .filter(s => !EXCLUDED_GROUPS.has(s.setting_group) && !EXCLUDED_KEYS.has(s.setting_key))
    .reduce<Record<string, SystemSetting[]>>((acc, s) => {
      if (!acc[s.setting_group]) acc[s.setting_group] = [];
      acc[s.setting_group].push(s);
      return acc;
    }, {});

  const hasChanges = Object.keys(editedValues).length > 0;
  const groupKeys = Object.keys(groupConfig).filter((k) => groups[k]);

  // ---------- Render helpers ----------

  const renderEditBadge = () => (
    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">已修改</span>
  );

  const renderSettingField = (setting: SystemSetting) => {
    const val = getValue(setting);
    if (setting.setting_type === "image") {
      return (
        <LogoUpload
          value={val}
          onChange={(url) => setValue(setting, url)}
          {...(setting.setting_key === "site_favicon_url" ? {
            placeholder: "尚未設定 Favicon，將顯示預設圖示",
            uploadLabel: "上傳新 Favicon",
            hint: "建議尺寸：32×32px 或 64×64px，PNG、ICO 或 SVG 格式，最大 2MB",
          } : {})}
        />
      );
    }
    if (setting.setting_type === "boolean") {
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={val === "true"}
            onCheckedChange={(checked) => setValue(setting, checked ? "true" : "false")}
          />
          <span className="text-sm text-muted-foreground">
            {val === "true" ? "啟用" : "停用"}
          </span>
        </div>
      );
    }
    if (setting.setting_type === "textarea") {
      return <Textarea value={val} onChange={(e) => setValue(setting, e.target.value)} rows={4} />;
    }
    if (setting.setting_type === "number") {
      return <Input type="number" value={val} onChange={(e) => setValue(setting, e.target.value)} />;
    }
    return <Input value={val} onChange={(e) => setValue(setting, e.target.value)} />;
  };

  /** Default group: each field on its own row */
  const renderDefaultGroup = (items: SystemSetting[]) => (
    <div className="space-y-5">
      {items.map((setting) => {
        const isEdited = editedValues[setting.id] !== undefined;
        return (
          <div key={setting.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className={isEdited ? "text-primary" : ""}>{setting.setting_label}</Label>
              {isEdited && renderEditBadge()}
            </div>
            {renderSettingField(setting)}
          </div>
        );
      })}
    </div>
  );

  /** Footer group: compact two-column layout per section */
  const renderFooterGroup = (items: SystemSetting[]) => {
    const byKey = new Map(items.map((s) => [s.setting_key, s]));

    return (
      <div className="space-y-6">
        {FOOTER_SECTION_PREFIXES.map(({ prefix, label: sectionLabel }) => {
          const enabledSetting = byKey.get(`${prefix}enabled`);
          const titleSetting = byKey.get(`${prefix}title`);
          if (!enabledSetting && !titleSetting) return null;

          const links: { labelSetting?: SystemSetting; urlSetting?: SystemSetting }[] = [];
          for (let i = 1; i <= 4; i++) {
            const ls = byKey.get(`${prefix}label_${i}`);
            const us = byKey.get(`${prefix}url_${i}`);
            if (ls || us) links.push({ labelSetting: ls, urlSetting: us });
          }

          const enabledVal = enabledSetting ? getValue(enabledSetting) : "true";
          const isCollapsed = enabledVal !== "true";

          return (
            <div key={prefix} className="rounded-lg border bg-muted/30 p-4 space-y-3">
              {/* Row 1: title + switch side by side */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                <div className="space-y-1">
                  {titleSetting && (
                    <div className="flex items-center gap-2">
                      <Label className={`text-sm font-semibold ${editedValues[titleSetting.id] !== undefined ? "text-primary" : ""}`}>
                        {sectionLabel} 標題
                      </Label>
                      {editedValues[titleSetting.id] !== undefined && renderEditBadge()}
                    </div>
                  )}
                  {titleSetting && (
                    <Input
                      value={getValue(titleSetting)}
                      onChange={(e) => setValue(titleSetting, e.target.value)}
                      placeholder={sectionLabel}
                      className="max-w-sm"
                    />
                  )}
                </div>
                {enabledSetting && (
                  <div className="flex items-center gap-2 md:justify-end">
                    <Switch
                      checked={enabledVal === "true"}
                      onCheckedChange={(checked) => setValue(enabledSetting, checked ? "true" : "false")}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {enabledVal === "true" ? "啟用" : "停用"}
                    </span>
                    {editedValues[enabledSetting.id] !== undefined && renderEditBadge()}
                  </div>
                )}
              </div>

              {/* Link rows: label + url side by side */}
              {!isCollapsed && links.length > 0 && (
                <div className="space-y-2 pt-1">
                  {links.map(({ labelSetting, urlSetting }, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {labelSetting && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Label className={`text-xs ${editedValues[labelSetting.id] !== undefined ? "text-primary" : "text-muted-foreground"}`}>
                              連結 {idx + 1} 名稱
                            </Label>
                            {editedValues[labelSetting.id] !== undefined && renderEditBadge()}
                          </div>
                          <Input
                            value={getValue(labelSetting)}
                            onChange={(e) => setValue(labelSetting, e.target.value)}
                            placeholder="名稱"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {urlSetting && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Label className={`text-xs ${editedValues[urlSetting.id] !== undefined ? "text-primary" : "text-muted-foreground"}`}>
                              連結 {idx + 1} 網址
                            </Label>
                            {editedValues[urlSetting.id] !== undefined && renderEditBadge()}
                          </div>
                          <Input
                            value={getValue(urlSetting)}
                            onChange={(e) => setValue(urlSetting, e.target.value)}
                            placeholder="https://..."
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {hasChanges && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-sm font-medium flex-1">
            您有 {Object.keys(editedValues).length} 項未儲存的變更
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditedValues({})}>
            取消
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2" size="sm">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            儲存所有變更
          </Button>
        </div>
      )}

      {/* Tip */}
      <div className="mb-6 flex items-start gap-3 p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>功能開關（作品分享、論壇、市集等）已移至獨立的<strong>「功能開關」</strong>頁面管理，可從左側選單進入。</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue={groupKeys[0] || "general"}>
          <TabsList className="mb-6">
            {groupKeys.map((key) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                {groupConfig[key]?.icon}
                {groupConfig[key]?.label || key}
              </TabsTrigger>
            ))}
          </TabsList>

          {groupKeys.map((groupKey) => (
            <TabsContent key={groupKey} value={groupKey}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {groupConfig[groupKey]?.icon}
                    {groupConfig[groupKey]?.label}
                  </CardTitle>
                  <CardDescription>{groupConfig[groupKey]?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {groupKey === "footer"
                    ? renderFooterGroup(groups[groupKey] || [])
                    : renderDefaultGroup(groups[groupKey] || [])}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </>
  );
}
