export type ExcludeAll<T> = {
  [P in keyof T]?: never;
};
