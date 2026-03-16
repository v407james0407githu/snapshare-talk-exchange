import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Estimated weights (must match frontend constants)
const AVG_PAGE_WEIGHT_KB = 350;
const AVG_PHOTO_WEIGHT_KB = 1800;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Read system settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "plan_bandwidth_gb",
        "plan_storage_gb",
        "resource_alert_last_sent",
        "resource_alert_threshold",
      ]);

    const settingsMap = new Map(
      settings?.map((s: any) => [s.setting_key, s.setting_value]) || []
    );

    const bandwidthLimitGB = parseFloat(settingsMap.get("plan_bandwidth_gb") || "2");
    const storageLimitGB = parseFloat(settingsMap.get("plan_storage_gb") || "8");
    const threshold = parseFloat(settingsMap.get("resource_alert_threshold") || "90");
    const lastSent = settingsMap.get("resource_alert_last_sent") || "";

    // Avoid sending more than once per day
    if (lastSent) {
      const lastSentDate = new Date(lastSent);
      const hoursSince = (Date.now() - lastSentDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return new Response(
          JSON.stringify({ message: "Alert already sent within 24h, skipping" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Calculate current month bandwidth usage
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: views } = await supabase
      .from("page_views")
      .select("page_path")
      .gte("created_at", monthStart.toISOString());

    let photoDetailViews = 0;
    let regularViews = 0;
    (views || []).forEach((v: any) => {
      if (v.page_path?.startsWith("/gallery/") && v.page_path !== "/gallery") {
        photoDetailViews++;
      } else {
        regularViews++;
      }
    });

    const bandwidthUsedMB =
      (photoDetailViews * AVG_PHOTO_WEIGHT_KB + regularViews * AVG_PAGE_WEIGHT_KB) / 1024;
    const bandwidthUsedGB = bandwidthUsedMB / 1024;
    const bandwidthPercent = (bandwidthUsedGB / bandwidthLimitGB) * 100;

    // 3. Calculate storage usage
    const { count: totalPhotos } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true });

    const storageUsedMB = ((totalPhotos || 0) * AVG_PHOTO_WEIGHT_KB) / 1024;
    const storageUsedGB = storageUsedMB / 1024;
    const storagePercent = (storageUsedGB / storageLimitGB) * 100;

    const alerts: string[] = [];
    if (bandwidthPercent >= threshold) {
      alerts.push(
        `⚠️ 頻寬使用量已達 ${bandwidthPercent.toFixed(1)}%（${bandwidthUsedGB.toFixed(2)} GB / ${bandwidthLimitGB} GB）`
      );
    }
    if (storagePercent >= threshold) {
      alerts.push(
        `⚠️ 儲存空間使用量已達 ${storagePercent.toFixed(1)}%（${storageUsedGB.toFixed(2)} GB / ${storageLimitGB} GB）`
      );
    }

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Usage within limits",
          bandwidthPercent: bandwidthPercent.toFixed(1),
          storagePercent: storagePercent.toFixed(1),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get admin emails
    const { data: adminEmails } = await supabase.rpc("get_user_emails");

    if (!adminEmails || adminEmails.length === 0) {
      console.error("No admin emails found");
      return new Response(
        JSON.stringify({ error: "No admin emails found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Send email notifications via the email queue
    const alertBody = alerts.join("\n");
    const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

    for (const admin of adminEmails) {
      const emailPayload = {
        to: admin.email,
        subject: `🚨 資源使用量警告 - ${now}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626; margin-bottom: 16px;">🚨 資源使用量警告</h2>
            <p style="color: #374151; margin-bottom: 16px;">以下資源使用量已超過 ${threshold}% 的警戒線：</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              ${alerts.map((a) => `<p style="color: #991b1b; margin: 4px 0;">${a}</p>`).join("")}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              頻寬使用量：${bandwidthUsedGB.toFixed(2)} GB / ${bandwidthLimitGB} GB (${bandwidthPercent.toFixed(1)}%)<br/>
              儲存空間使用量：${storageUsedGB.toFixed(2)} GB / ${storageLimitGB} GB (${storagePercent.toFixed(1)}%)
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
              請前往管理後台查看詳細資訊，或考慮升級方案。
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">此為系統自動發送的警告通知</p>
          </div>
        `,
      };

      // Try enqueue to transactional email queue
      try {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: emailPayload,
        });
      } catch (enqueueError) {
        console.error("Failed to enqueue email, logging directly:", enqueueError);
        // Fallback: just log that we tried
        await supabase.from("email_send_log").insert({
          template_name: "resource_alert",
          recipient_email: admin.email,
          status: "failed",
          error_message: `Enqueue failed: ${enqueueError}`,
        });
      }
    }

    // 6. Update last sent timestamp
    await supabase
      .from("system_settings")
      .update({
        setting_value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", "resource_alert_last_sent");

    // 7. Also create in-app notifications for admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles) {
      for (const role of adminRoles) {
        await supabase.from("notifications").insert({
          user_id: role.user_id,
          type: "system",
          title: "資源使用量警告",
          content: alertBody,
          related_type: "system",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Alerts sent",
        alerts,
        bandwidthPercent: bandwidthPercent.toFixed(1),
        storagePercent: storagePercent.toFixed(1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Resource alert check failed:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
