// eslint-disable no-control-regex
export const windowsUnsafePathRegex = /[\0"*/:<>?\\|]/;
export const posixUnsafePathRegex = /[\0/\\]/;

export const semVerRegexp = /\^\d{1,3}(\.\d{1,3}){2}$/;
