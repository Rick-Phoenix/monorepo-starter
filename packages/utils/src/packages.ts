import latestVersion from "latest-version";

export async function getLatestVersionRange(pkgName: string) {
  const version = await latestVersion(pkgName);
  if (!version.length) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️ Could not get a valid version for ${pkgName}`);
  }
  return `^${version}`;
}
