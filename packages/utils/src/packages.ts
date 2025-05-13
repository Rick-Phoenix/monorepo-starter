import pacote from "pacote";
import { tryThrow } from "./error_handling.js";

export async function getLatestVersionRange(pkgName: string) {
  const manifest = await tryThrow(
    pacote.manifest(pkgName),
    `getting the latest version for ${pkgName}`,
  );

  return `^${manifest.version}`;
}
