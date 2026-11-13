
import json
import urllib.request
import urllib.error

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.views.decorators.http import require_POST


def register_view(request):
    form = UserCreationForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        return redirect("profile")

    return render(request, "accounts/register.html", {"form": form})


def login_view(request):
    form = AuthenticationForm(request, data=request.POST or None)

    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        return redirect("profile")

    return render(request, "accounts/login.html", {"form": form})


@login_required
def profile_view(request):
    return render(request, "accounts/profile.html")


@require_POST
@login_required
def logout_view(request):
    logout(request)
    return redirect("login")


def home_view(request):
    return render(request, "accounts/home.html")


def anime_api_view(request):
    query = """
    query {
        Page(page: 1, perPage: 24) {
            media(
                type: ANIME,
                sort: POPULARITY_DESC,
                isAdult: false
            ) {
                id
                title {
                    romaji
                    english
                }
                description(asHtml: false)
                coverImage {
                    large
                    extraLarge
                }
                averageScore
                episodes
                genres
                siteUrl
            }
        }
    }
    """

    payload = json.dumps({"query": query}).encode("utf-8")

    req = urllib.request.Request(
        "https://graphql.anilist.co",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ANIMEVERSE/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))

        media = result.get("data", {}).get("Page", {}).get("media", [])

        anime_list = []

        for anime in media:
            title = anime.get("title") or {}
            cover = anime.get("coverImage") or {}
            score = anime.get("averageScore")

            anime_list.append({
                "mal_id": anime.get("id"),
                "title": title.get("english") or title.get("romaji") or "Anime",
                "title_english": title.get("english"),
                "description": anime.get("description") or "",
                "images": {
                    "jpg": {
                        "large_image_url": (
                            cover.get("extraLarge") or cover.get("large")
                        )
                    }
                },
                "score": round(score / 10, 1) if score else None,
                "episodes": anime.get("episodes"),
                "genres": [
                    {"name": genre}
                    for genre in anime.get("genres", [])
                ],
                "url": anime.get("siteUrl")
            })

        return JsonResponse({"data": anime_list})

    except (
        urllib.error.URLError,
        TimeoutError,
        json.JSONDecodeError
    ) as error:
        return JsonResponse({
            "error": "Impossible de contacter AniList.",
            "details": str(error)
        }, status=503)
