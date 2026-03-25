from django.urls import path
from .views import LibraryPickerLookupView

urlpatterns = [
    path("library-picker/lookup/", LibraryPickerLookupView.as_view(), name="library-picker-lookup"),
]