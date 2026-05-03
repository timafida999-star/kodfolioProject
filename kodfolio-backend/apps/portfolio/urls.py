"""URLs for /api/v1/portfolio/"""
from django.urls import path

from .views import MyPortfolioView, PortfolioEntryDetailView, PublicPortfolioView

urlpatterns = [
    path("me/", MyPortfolioView.as_view(), name="my-portfolio"),
    path("entries/<uuid:id>/", PortfolioEntryDetailView.as_view(), name="portfolio-entry"),
    path("<uuid:user_id>/", PublicPortfolioView.as_view(), name="public-portfolio"),
]
