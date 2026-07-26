import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { AppUser, Role, ActivityLog } from "@/lib/types/system";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export async function GET() {
  try {
    const user = await requireUser();
    requireManager(user);

    const usersCol = adminDb.collection("users");
    const [totalCnt, activeCnt, lockedCnt, pendingCnt, onlineCnt, activeUsersSnap] = await Promise.all([
      usersCol.count().get(),
      usersCol.where("active", "==", true).where("isLocked", "==", false).count().get(),
      usersCol.where("isLocked", "==", true).count().get(),
      usersCol.where("active", "==", false).count().get(),
      usersCol.where("lastLogin", ">=", isoMinutesAgo(15)).count().get(),
      usersCol.where("active", "==", true).get(),
    ]);

    const total = totalCnt.data().count;
    const activeCount = activeCnt.data().count;
    const locked = lockedCnt.data().count;
    const pending = pendingCnt.data().count;
    const online = onlineCnt.data().count;

    const activeUsers = activeUsersSnap.docs.map((d) => d.data() as AppUser);
    const roleIds = [...new Set(activeUsers.map((u) => u.roleId).filter(Boolean))] as string[];
    const roleDocs = await Promise.all(roleIds.map((rid) => adminDb.collection("roles").doc(rid).get()));
    const roleMap = new Map(roleDocs.filter((r) => r.exists).map((r) => [r.id, r.data() as Role]));

    const roleCounts = new Map<string, { tenRole: string; color: string; count: number }>();
    for (const u of activeUsers) {
      const role = u.roleId ? roleMap.get(u.roleId) : undefined;
      const key = role?.tenRole || "Khác";
      const color = role?.color || "#6b7280";
      if (!roleCounts.has(key)) roleCounts.set(key, { tenRole: key, color, count: 0 });
      roleCounts.get(key)!.count += 1;
    }
    const usersByRole = [...roleCounts.values()].sort((a, b) => b.count - a.count);

    const deptCounts = new Map<string, number>();
    for (const u of activeUsers) {
      const dept = u.phongBan || "Chưa phân loại";
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    }
    const usersByDept = [...deptCounts.entries()]
      .map(([phongBan, count]) => ({ phong_ban: phongBan, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const weekAgo = isoDaysAgo(7);
    const loginLogsSnap = await adminDb
      .collection("activity_log")
      .where("action", "==", "LOGIN")
      .where("createdAt", ">=", weekAgo)
      .get();
    const dayCounts = new Map<string, number>();
    for (const doc of loginLogsSnap.docs) {
      const entry = doc.data() as ActivityLog;
      const day = (entry.createdAt || "").slice(0, 10);
      if (day) dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    const login7days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      login7days.push({ ngay: key, count: dayCounts.get(key) || 0 });
    }

    return NextResponse.json({
      kpi: { total, active: activeCount, locked, pending, online, offline: total - online },
      users_by_role: usersByRole,
      users_by_dept: usersByDept,
      login_7days: login7days,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
