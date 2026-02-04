export function formatApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message ?? "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length) {
      const k = keys[0];
      const v = (data as any)[k];
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      if (typeof v === "string") return `${k}: ${v}`;
    }
  }
  return "Request failed";
}
