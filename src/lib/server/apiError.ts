import "server-only";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ detail: e.message }, { status: e.status });
  }
  console.error("[api] unhandled error:", e);
  return NextResponse.json(
    { detail: e instanceof Error ? e.message : "Lỗi không xác định" },
    { status: 500 }
  );
}
