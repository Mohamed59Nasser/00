const BASE_PATH = "/00";

export function appPath(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
