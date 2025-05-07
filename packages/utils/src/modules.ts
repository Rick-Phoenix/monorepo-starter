import { fileURLToPath } from "node:url";

export function isMainModule(importMetaUrl: string) {
  if (importMetaUrl && importMetaUrl?.startsWith("file:")) {
    const modulePath = fileURLToPath(importMetaUrl);
    return process.argv[1] === modulePath;
  }
  return false;
}
