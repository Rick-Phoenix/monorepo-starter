export function isRunningInBrowser() {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}
