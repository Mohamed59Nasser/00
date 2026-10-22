const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export function appPath(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
