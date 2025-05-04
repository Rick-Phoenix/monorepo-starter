// eslint-disable no-control-regex
export const windowsUnsafePathRegex = /[\0"*/:<>?\\|]/;
export const posixUnsafePathRegex = /[\0/\\]/;
