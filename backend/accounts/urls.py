
from django.urls import path
from . import views

urlpatterns = [
    path("", views.home_view, name="home"),
    path("inscription/", views.register_view, name="register"),
    path("connexion/", views.login_view, name="login"),
    path("profil/", views.profile_view, name="profile"),
    path("deconnexion/", views.logout_view, name="logout"),

    # API du catalogue
    path("api/animes/", views.anime_api_view, name="anime_api"),
]
