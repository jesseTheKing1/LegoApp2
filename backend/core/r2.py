import os
import uuid
from urllib.parse import urljoin

import boto3
from botocore.config import Config


def r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def r2_bucket_name() -> str:
    return os.environ["R2_BUCKET_NAME"]


def r2_public_base_url() -> str:
    return os.environ["R2_PUBLIC_BASE_URL"].rstrip("/") + "/"


def guess_ext(filename: str) -> str:
    fn = (filename or "").lower()
    for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        if fn.endswith(ext):
            return ext
    return ""


def make_object_key(prefix: str, filename: str) -> str:
    ext = guess_ext(filename)
    return f"{prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"


def public_url_for_key(key: str) -> str:
    return urljoin(r2_public_base_url(), key.lstrip("/"))
