import api from "../api/client";

type PresignRes = {
  upload_url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
  public_url: string;
};

export async function uploadImageToR2(file: File): Promise<{ public_url: string; key: string }> {
  // IMPORTANT: matches your Django include: path("api/upload/", include("core.urls"))
  const presign = await api.post<PresignRes>("/api/upload/presign/", {
    filename: file.name,
    content_type: file.type || "application/octet-stream",
  });

  const { upload_url, headers, public_url, key } = presign.data;

  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers,
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`R2 upload failed (${putRes.status})`);
  }

  return { public_url, key };
}
