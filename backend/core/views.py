from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from .serializers import (
    PresignRequestSerializer,
    R2DeleteRequestSerializer,
)
from .r2 import r2_client, r2_bucket_name, r2_public_base_url

import uuid


def _guess_ext(filename: str) -> str:
    fn = (filename or "").lower()
    for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        if fn.endswith(ext):
            return ext
    return ""


def _make_key(prefix: str, filename: str) -> str:
    ext = _guess_ext(filename)
    return f"{prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"


class R2PresignUploadView(APIView):
    """
    Admin-only: returns a presigned PUT URL to upload directly to R2.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        ser = PresignRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        filename = ser.validated_data["filename"]
        content_type = ser.validated_data.get("content_type") or "application/octet-stream"

        # You can change prefix to something like: "part-colors" or "parts"
        key = _make_key(prefix="uploads", filename=filename)

        s3 = r2_client()
        bucket = r2_bucket_name()

        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=60 * 5,  # 5 min
        )

        public_url = r2_public_base_url().rstrip("/") + "/" + key.lstrip("/")

        return Response(
            {
                "upload_url": upload_url,
                "method": "PUT",
                "headers": {"Content-Type": content_type},
                "key": key,
                "public_url": public_url,
            },
            status=status.HTTP_200_OK,
        )


class R2DeleteObjectView(APIView):
    """
    Admin-only: deletes an object by key (optional but useful).
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        ser = R2DeleteRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        key = ser.validated_data["key"]

        s3 = r2_client()
        s3.delete_object(Bucket=r2_bucket_name(), Key=key)

        return Response({"deleted": True, "key": key}, status=status.HTTP_200_OK)
