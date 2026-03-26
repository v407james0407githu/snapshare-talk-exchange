

## Problem

The `EXCLUDED_KEYS` set in `SystemSettings.tsx` contains `"bandwidth_quota_gb"` and `"storage_quota_gb"`, but the actual database keys are `"plan_bandwidth_gb"` and `"plan_storage_gb"`. The filter doesn't match, so these items still appear.

## Fix

Update line 36 in `src/pages/admin/SystemSettings.tsx`:

```typescript
const EXCLUDED_KEYS = new Set(["plan_bandwidth_gb", "plan_storage_gb"]);
```

One line change. That's it.

