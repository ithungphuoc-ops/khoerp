import "server-only";
import { adminDb } from "@/lib/firebase/admin";

interface LogActivityInput {
  actorId?: string | null;
  moduleCode?: string;
  action: string;
  entity?: string;
  entityId?: string;
  moTa?: string;
  ipAddress?: string;
}

/** Ghi activity_log — best-effort, không throw để không chặn nghiệp vụ chính. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await adminDb.collection("activity_log").add({
      userId: input.actorId ?? null,
      moduleCode: input.moduleCode ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      moTa: input.moTa ?? null,
      ipAddress: input.ipAddress ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[activityLog] error:", e);
  }
}
