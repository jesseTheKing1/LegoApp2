from django.urls import path
from .views import R2PresignUploadView, R2DeleteObjectView

urlpatterns = [
    path("presign/", R2PresignUploadView.as_view(), name="r2-presign"),
    path("delete/", R2DeleteObjectView.as_view(), name="r2-delete"),
]
