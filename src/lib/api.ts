import { AccessError } from "./access";
import { AuthError } from "./auth";
import { DuplicateClientError } from "./clients";

export function apiError(error: unknown, fallback = "Something went wrong."): Response {
  if (error instanceof DuplicateClientError) {
    return Response.json({ error: error.message, duplicate: error.info }, { status: error.status });
  }
  if (error instanceof AuthError || error instanceof AccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error instanceof Error ? error.message : "Unknown error");
  return Response.json({ error: fallback }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AuthError("Invalid JSON body.", 400);
  }
}
