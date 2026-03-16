
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include("accounts.urls")),
    path("api/parts/", include("parts.urls")),
    path("api/upload/", include("core.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/", include("minifigs.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/", include("sets.urls")),

]
