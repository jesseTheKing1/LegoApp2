from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import me,register
from .views_jwt import TokenObtainPairEitherView

urlpatterns = [
    path("register/", register, name="register"),
    path("token/", TokenObtainPairEitherView.as_view(), name="token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", me, name="me"),
]
