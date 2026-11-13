
const API_URL = "https://api.jikan.moe/v4";

// Éléments HTML
const animeGrid = document.getElementById("animeGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const animeSearch = document.getElementById("animeSearch");
const filters = document.querySelectorAll(".filter");
const searchButton = document.getElementById("searchButton");

let allAnime = [];
let selectedGenre = "all";
let searchTimer;

// Récupérer les favoris
let favorites = JSON.parse(localStorage.getItem("animeverse_favorites") || "[]");

// Charger les animes depuis l'API
async function loadAnime() {
    animeGrid.innerHTML = '<p class="loading">Chargement des animes...</p>';

    try {
        const response = await fetch(`${API_URL}/top/anime?limit=24`);

        if (!response.ok) {
            throw new Error("Impossible de charger les animes");
        }

        const data = await response.json();
        allAnime = data.data || [];

        displayAnime(allAnime);
        displayFavorites();

    } catch (error) {
        animeGrid.innerHTML = `
            <p class="empty-message">
                Impossible de charger le catalogue.
                Vérifie ta connexion Internet et réessaie.
            </p>
            <button onclick="loadAnime()">Réessayer</button>
        `;
        console.error(error);
    }
}

// Afficher les cartes
function displayAnime(animes) {
    animeGrid.innerHTML = "";

    if (!animes.length) {
        animeGrid.innerHTML = '<p class="empty-message">Aucun anime trouvé.</p>';
        return;
    }

    animes.forEach(anime => {
        const image = anime.images?.jpg?.large_image_url
            || anime.images?.jpg?.image_url
            || "";

        const title = anime.title || "Titre inconnu";
        const score = anime.score || "N/A";
        const year = anime.year || "Année inconnue";
        const genreNames = (anime.genres || []).map(g => g.name);

        const card = document.createElement("article");
        card.className = "anime-card";

        const poster = document.createElement("img");
        poster.className = "anime-poster";
        poster.src = image;
        poster.alt = title;
        poster.loading = "lazy";

        const info = document.createElement("div");
        info.className = "anime-info";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const description = document.createElement("p");
        description.textContent = `${year} • ${genreNames.slice(0, 2).join(", ") || "Anime"}`;

        const actions = document.createElement("div");
        actions.className = "anime-actions";

        const rating = document.createElement("span");
        rating.className = "anime-rating";
        rating.textContent = `★ ${score}`;

        const favoriteButton = document.createElement("button");
        favoriteButton.className = "favorite-button";
        favoriteButton.textContent = favorites.some(item => item.mal_id === anime.mal_id)
            ? "♥"
            : "♡";

        if (favorites.some(item => item.mal_id === anime.mal_id)) {
            favoriteButton.classList.add("is-favorite");
        }

        favoriteButton.addEventListener("click", () => {
            toggleFavorite(anime);
        });

        actions.append(rating, favoriteButton);
        info.append(heading, description, actions);
        card.append(poster, info);

        card.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            openAnime(anime);
        });

        animeGrid.appendChild(card);
    });
}

// Ajouter ou retirer un favori
function toggleFavorite(anime) {
    const exists = favorites.some(item => item.mal_id === anime.mal_id);

    if (exists) {
        favorites = favorites.filter(item => item.mal_id !== anime.mal_id);
    } else {
        favorites.push({
            mal_id: anime.mal_id,
            title: anime.title,
            image: anime.images?.jpg?.large_image_url || "",
            score: anime.score || "N/A",
            year: anime.year || "Inconnue"
        });
    }

    localStorage.setItem("animeverse_favorites", JSON.stringify(favorites));

    displayAnime(getFilteredAnime());
    displayFavorites();
}

// Afficher les favoris
function displayFavorites() {
    favoritesGrid.innerHTML = "";

    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <p class="empty-message">
                Tu n'as pas encore de favoris. Clique sur ♡ pour en ajouter !
            </p>
        `;
        return;
    }

    favorites.forEach(anime => {
        const card = document.createElement("article");
        card.className = "anime-card";

        const poster = document.createElement("img");
        poster.className = "anime-poster";
        poster.src = anime.image;
        poster.alt = anime.title;
        poster.loading = "lazy";

        const info = document.createElement("div");
        info.className = "anime-info";

        const heading = document.createElement("h3");
        heading.textContent = anime.title;

        const description = document.createElement("p");
        description.textContent = `★ ${anime.score} • ${anime.year}`;

        const removeButton = document.createElement("button");
        removeButton.className = "favorite-button is-favorite";
        removeButton.textContent = "♥ Retirer";
        removeButton.addEventListener("click", () => {
            toggleFavorite({
                mal_id: anime.mal_id
            });
        });

        info.append(heading, description, removeButton);
        card.append(poster, info);
        favoritesGrid.appendChild(card);
    });
}

// Ouvrir les détails d'un anime sur sa fiche officielle
function openAnime(anime) {
    const url = anime.url;

    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}

// Filtrer par genre et recherche
function getFilteredAnime() {
    const search = animeSearch.value.trim().toLowerCase();

    return allAnime.filter(anime => {
        const title = (anime.title || "").toLowerCase();
        const genres = (anime.genres || []).map(g => g.name);

        const matchesSearch = title.includes(search);
        const matchesGenre = selectedGenre === "all"
            || genres.includes(selectedGenre);

        return matchesSearch && matchesGenre;
    });
}

function applyFilters() {
    displayAnime(getFilteredAnime());
}

// Recherche avec délai pour éviter trop de mises à jour
animeSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        applyFilters();
    }, 250);
});

// Boutons des genres
filters.forEach(button => {
    button.addEventListener("click", () => {
        filters.forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        selectedGenre = button.dataset.genre;

        applyFilters();
    });
});

// Bouton de recherche
searchButton.addEventListener("click", () => {
    animeSearch.focus();
    document.getElementById("catalogue").scrollIntoView({
        behavior: "smooth"
    });
});

// Lancer le catalogue
loadAnime();
