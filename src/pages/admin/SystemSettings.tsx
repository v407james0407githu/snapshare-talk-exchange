import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Settings, Globe, ToggleLeft, Mail } from "lucide-react";
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

const groupConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  general: { label: "基本設定", icon: <Settings className="h-4 w-4" /> },
  seo: { label: "SEO 設定", icon: <Globe className="h-4 w-4" /> },
  features: { label: "功能開關", icon: <ToggleLeft className="h-4 w-4" /> },
  email: { label: "郵件模板", icon: <Mail className="h-4 w-4" /> },
};

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

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
      for (const [id, value] of entries) {
        await supabase
          .from("system_settings")
          .update({
            setting_value: value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      setEditedValues({});
      toast.success("設定已儲存");
    },
    onError: () => toast.error("儲存失敗"),
  });

  const getValue = (setting: SystemSetting) => {
    return editedValues[setting.id] ?? setting.setting_value;
  };

  const setValue = (setting: SystemSetting, value: string) => {
    setEditedValues((prev) => ({ ...prev, [setting.id]: value }));
  };

  const groups = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    if (!acc[s.setting_group]) acc[s.setting_group] = [];
    acc[s.setting_group].push(s);
    return acc;
  }, {});

  const hasChanges = Object.keys(editedValues).length > 0;
  const groupKeys = Object.keys(groupConfig).filter((k) => groups[k]);

  return (
    <AdminLayout title="系統設定" subtitle="管理網站基本設定、功能開關與郵件模板">
      {hasChanges && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-sm font-medium flex-1">
            您有 {Object.keys(editedValues).length} 項未儲存的變更
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditedValues({})}
          >
            取消
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
            size="sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            儲存所有變更
          </Button>
        </div>
      )}

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
                </CardHeader>
                <CardContent className="space-y-6">
                  {groups[groupKey]?.map((setting) => {
                    const val = getValue(setting);
                    const isEdited = editedValues[setting.id] !== undefined;

                    return (
                      <div key={setting.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className={isEdited ? "text-primary" : ""}>
                            {setting.setting_label}
                          </Label>
                          {isEdited && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              已修改
                            </span>
                          )}
                        </div>

                        {setting.setting_type === "boolean" ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={val === "true"}
                              onCheckedChange={(checked) =>
                                setValue(setting, checked ? "true" : "false")
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {val === "true" ? "啟用" : "停用"}
                            </span>
                          </div>
                        ) : setting.setting_type === "textarea" ? (
                          <Textarea
                            value={val}
                            onChange={(e) => setValue(setting, e.target.value)}
                            rows={4}
                          />
                        ) : setting.setting_type === "number" ? (
                          <Input
                            type="number"
                            value={val}
                            onChange={(e) => setValue(setting, e.target.value)}
                          />
                        ) : (
                          <Input
                            value={val}
                            onChange={(e) => setValue(setting, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </AdminLayout>
  );
}
