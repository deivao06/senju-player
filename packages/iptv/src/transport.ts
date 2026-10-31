// The provider JSON is normalized by the existing Xtream service.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Request = (url: string, timeout: number) => Promise<{ data: any }>;
