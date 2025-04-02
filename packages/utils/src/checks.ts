export function isRunningInBrowser() {
  return (
    // eslint-disable-next-line node/no-process-env
    process.env.NODE_ENV !== "production" ||
    (typeof window !== "undefined" && typeof window.document !== "undefined")
  );
}
