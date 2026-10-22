import { errorMessage, getStore } from "@/lib/store";
import { validateClientInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await getStore().list();
    return Response.json({ clients });
  } catch (error) {
    console.error("GET /api/clients failed", error);
    return Response.json({ error: errorMessage(error, "Failed to load clients.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateClientInput(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  try {
    const client = await getStore().create(result.data);
    return Response.json({ client }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients failed", error);
    return Response.json({ error: errorMessage(error, "Failed to save client.") }, { status: 500 });
  }
}
