import api from "../api/client";

type PresignRes = {
  upload_url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  public_url: string;
};

export async function uploadImageToR2(file: File): Promise<{ public_url: string; key: string }> {
  const presign = await api.post<PresignRes>("/api/upload/presign/", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
  });

  const { upload_url, headers: presignHeaders, public_url, key } = presign.data;

  // Build headers safely. Keep any x-amz-* your backend included,
  // and ALWAYS set Content-Type to match what you presigned for.
  const headers: Record<string, string> = {};

  for (const [k, v] of Object.entries(presignHeaders || {})) {
    // Only forward headers you're allowed to set in browsers
    const lk = k.toLowerCase();
    if (lk.startsWith("x-amz-") || lk === "content-type") headers[k] = v;
  }

  headers["Content-Type"] = file.type || "application/octet-stream";

  let putRes: Response;
  try {
    putRes = await fetch(upload_url, {
      method: "PUT",
      headers,
      body: file,
      // mode: "cors", // optional; default is usually fine
    });
  } catch (e: any) {
    throw new Error(`Upload request failed (fetch): ${e?.message ?? e}`);
  }

  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`R2 upload failed (${putRes.status}) ${text ? `- ${text}` : ""}`);
  }

  return { public_url, key };
}
