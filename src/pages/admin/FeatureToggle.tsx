import { useState } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Image, Star, ToggleLeft, AlertTriangle, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FeatureSetting {
  id: string;
  setting_key: string;
  setting_label: string;
  setting_value: string;
  setting_type: string;
  setting_group: string;
  sort_order: number;
}

// 由首頁區塊排序控制的功能，不在此處顯示
const EXCLUDED_FEATURE_KEYS = new Set(["forum_enabled", "marketplace_enabled"]);

const featureIcons: Record<string, typeof Image> = {
  gallery_enabled: Image,
  featured_enabled: Star,
};

const featureDescriptions: Record<string, string> = {
  gallery_enabled: "啟用後，使用者可上傳與瀏覽攝影作品。停用會隱藏導覽列「作品」入口與首頁相關區塊。",
  forum_enabled: "啟用後，使用者可在討論區發表主題與回覆。停用會隱藏導覽列「討論」入口與首頁相關區塊。",
  marketplace_enabled: "啟用後，使用者可在二手市集刊登與瀏覽商品。停用會隱藏導覽列「市集」入口與首頁相關區塊。",
  featured_enabled: "啟用後，首頁將顯示精選作品輪播區塊。",
  registration_enabled: "啟用後，新使用者可以註冊帳號。停用後註冊頁面會顯示暫停註冊訊息。",
};

const featureWarnings: Record<string, string> = {
  gallery_enabled: "停用後，已上傳的作品仍會保留，但前台將無法存取。",
  forum_enabled: "停用後，所有討論資料仍會保留，但前台將無法存取。",
  marketplace_enabled: "停用後，所有商品資料仍會保留，但前台將無法存取。",
  registration_enabled: "停用後，新使用者將無法註冊。現有使用者不受影響。",
};

export default function FeatureToggle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useAdminPage("功能開關", "控制作品、討論、市集與註冊等前台功能");

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["admin-feature-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_group", "features")
        .eq("setting_type", "boolean")
        .order("sort_order");
      if (error) throw error;
      return (data as FeatureSetting[]).filter(f => !EXCLUDED_FEATURE_KEYS.has(f.setting_key));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        Object.entries(editedValues).map(async ([id, value]) => {
          const { error } = await supabase
            .from("system_settings")
            .update({ setting_value: value, updated_at: new Date().toISOString(), updated_by: user?.id })
            .eq("id", id);

          if (error) throw error;
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings-public"] });
      setEditedValues({});
      toast.success("功能開關已儲存，前台將即時生效");
    },
    onError: () => toast.error("儲存失敗"),
  });

  const getValue = (f: FeatureSetting) => editedValues[f.id] ?? f.setting_value;
  const toggleValue = (f: FeatureSetting) => {
    const current = getValue(f);
    setEditedValues(prev => ({ ...prev, [f.id]: current === "true" ? "false" : "true" }));
  };

  const hasChanges = Object.keys(editedValues).length > 0;
  const enabledCount = features.filter(f => getValue(f) === "true").length;

  // Check if any toggle is being turned off (show warning)
  const turningOff = features.filter(f => {
    const edited = editedValues[f.id];
    return edited === "false" && f.setting_value === "true";
  });

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><ToggleLeft className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{features.length}</p><p className="text-xs text-muted-foreground">功能總數</p></div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ToggleLeft className="h-4 w-4 text-primary" /></div>
          <div><p className="text-2xl font-bold text-primary">{enabledCount}</p><p className="text-xs text-muted-foreground">已啟用</p></div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><ToggleLeft className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{features.length - enabledCount}</p><p className="text-xs text-muted-foreground">已停用</p></div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-4 flex items-start gap-3 p-3 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>功能開關會即時影響前台的導覽列、首頁區塊與對應頁面的顯示。停用功能不會刪除已有資料。</span>
      </div>

      {/* Warning for turning off */}
      {turningOff.length > 0 && (
        <div className="mb-4 flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-700">即將停用以下功能：</p>
            <ul className="mt-1 space-y-0.5 text-amber-600">
              {turningOff.map(f => (
                <li key={f.id}>• {f.setting_label}{featureWarnings[f.setting_key] ? ` — ${featureWarnings[f.setting_key]}` : ""}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Save Bar */}
      {hasChanges && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-sm font-medium flex-1">
            您有 {Object.keys(editedValues).length} 項未儲存的變更
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditedValues({})}>取消</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2" size="sm">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            儲存變更
          </Button>
        </div>
      )}

      {/* Feature List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : features.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl">
          尚未設定任何功能開關，請至系統設定新增
        </div>
      ) : (
        <div className="space-y-3">
          {features.map(feature => {
            const enabled = getValue(feature) === "true";
            const isEdited = editedValues[feature.id] !== undefined;
            const isTurningOff = editedValues[feature.id] === "false" && feature.setting_value === "true";
            const Icon = featureIcons[feature.setting_key] || ToggleLeft;

            return (
              <Card key={feature.id} className={`transition-all ${isTurningOff ? "border-amber-500/40 ring-1 ring-amber-500/20" : isEdited ? "border-primary/40 ring-1 ring-primary/20" : ""} ${!enabled ? "opacity-70" : ""}`}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`p-3 rounded-xl ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{feature.setting_label}</h3>
                      {isEdited && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">已修改</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {featureDescriptions[feature.setting_key] || `設定鍵：${feature.setting_key}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-medium ${enabled ? "text-primary" : "text-muted-foreground"}`}>
                      {enabled ? "啟用" : "停用"}
                    </span>
                    <Switch checked={enabled} onCheckedChange={() => toggleValue(feature)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
