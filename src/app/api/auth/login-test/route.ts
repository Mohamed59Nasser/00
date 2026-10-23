import { POST as login } from "../login/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Temporary deployment-only harness; disabled unless both test secrets exist. */
export async function GET(request: Request) {
  const token = process.env.LOGIN_TEST_TOKEN;
  const password = process.env.LOGIN_TEST_PASSWORD;
  const provided = new URL(request.url).searchParams.get("token");
  if (!token || !password || provided !== token) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const testRequest = new Request(`${url.origin}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: url.host,
      origin: url.origin,
    },
    body: JSON.stringify({ identifier: "Mohamed Nasser", password }),
  });
  const response = await login(testRequest);
  return Response.json({ loginStatus: response.status, loginBody: await response.text() });
}
