
const API_URL = "/api/animes/";

const animeGrid = document.getElementById("animeGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const animeSearch = document.getElementById("animeSearch");
const filters = document.querySelectorAll(".filter");
const searchButton = document.getElementById("searchButton");

let allAnime = [];
let favorites = [];
let selectedGenre = "all";
let searchTimeout = null;

// Charger les favoris
try {
    favorites = JSON.parse(
        localStorage.getItem("animeverse_favorites") || "[]"
    );
} catch {
    favorites = [];
}

// Charger le catalogue
async function loadAnime() {
    animeGrid.innerHTML = '<p class="loading">Chargement...</p>';

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Erreur HTTP : " + response.status);
        }

        const result = await response.json();

        if (!Array.isArray(result.data)) {
            throw new Error("Données invalides");
        }

        allAnime = result.data;
        displayAnime(allAnime);

    } catch (error) {
        console.error(error);
        animeGrid.innerHTML =
            '<p class="error-message">Impossible de charger les animes.</p>';
    }
}

// Créer une carte
function createAnimeCard(anime) {
    const card = document.createElement("article");
    card.className = "anime-card";

    const image = document.createElement("img");
    image.className = "anime-image";
    image.src = anime.images?.jpg?.large_image_url || "";
    image.alt = anime.title || "Anime";
    image.loading = "lazy";

    image.onerror = () => {
        image.style.display = "none";
    };

    const info = document.createElement("div");
    info.className = "anime-info";

    const title = document.createElement("h3");
    title.textContent = anime.title || "Sans titre";

    const score = document.createElement("p");
    score.className = "anime-score";
    score.textContent = anime.score
        ? `⭐ ${anime.score}/10`
        : "Note inconnue";

    const episodes = document.createElement("p");
    episodes.textContent = anime.episodes
        ? `${anime.episodes} épisodes`
        : "Épisodes inconnus";

    const actions = document.createElement("div");
    actions.className = "anime-actions";

    const detailsButton = document.createElement("button");
    detailsButton.className = "details-button";
    detailsButton.textContent = "Découvrir";
    detailsButton.addEventListener("click", () => {
        showAnimeDetails(anime);
    });

    const favoriteButton = document.createElement("button");
    favoriteButton.className = "favorite-button";
    updateFavoriteButton(favoriteButton, anime);

    favoriteButton.addEventListener("click", () => {
        toggleFavorite(anime);
    });

    actions.append(detailsButton, favoriteButton);
    info.append(title, score, episodes, actions);
    card.append(image, info);

    return card;
}

// Bouton favori
function updateFavoriteButton(button, anime) {
    const isFavorite = favorites.some(
        item => item.mal_id === anime.mal_id
    );

    button.textContent = isFavorite ? "♥" : "♡";
    button.classList.toggle("is-favorite", isFavorite);
}

// Détails style Netflix
function showAnimeDetails(anime) {
    document.getElementById("animeModal")?.remove();

    const modal = document.createElement("div");
    modal.id = "animeModal";
    modal.className = "anime-modal";

    const content = document.createElement("div");
    content.className = "netflix-details";

    const imageUrl = anime.images?.jpg?.large_image_url || "";

    content.style.backgroundImage = `
        linear-gradient(
            to top,
            #14111e 5%,
            rgba(20, 17, 30, 0.85) 48%,
            rgba(20, 17, 30, 0.15) 100%
        ),
        url("${imageUrl}")
    `;

    const close = document.createElement("button");
    close.className = "netflix-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "Fermer");
    close.addEventListener("click", () => modal.remove());

    const badge = document.createElement("span");
    badge.className = "netflix-badge";
    badge.textContent = "ANIMEVERSE";

    const title = document.createElement("h1");
    title.textContent = anime.title || "Anime";

    const meta = document.createElement("div");
    meta.className = "netflix-meta";

    const rating = document.createElement("span");
    rating.textContent = anime.score
        ? `⭐ ${anime.score}/10`
        : "Note inconnue";

    const episode = document.createElement("span");
    episode.textContent = anime.episodes
        ? `${anime.episodes} épisodes`
        : "Épisodes inconnus";

    meta.append(rating, episode);

    const genreText = document.createElement("p");
    genreText.className = "netflix-genres";
    genreText.textContent = (anime.genres || [])
        .map(genre => genre.name)
        .join(" • ") || "Genres inconnus";

    const description = document.createElement("p");
    description.className = "netflix-description";
    description.textContent = anime.description
        ? anime.description.replace(/<[^>]*>/g, "")
        : "Aucune description disponible pour cet anime.";

    const buttons = document.createElement("div");
    buttons.className = "netflix-buttons";

    const official = document.createElement("a");
    official.className = "netflix-watch";
    official.href = anime.url || "https://anilist.co/search/anime";
    official.target = "_blank";
    official.rel = "noopener noreferrer";
    official.textContent = "↗ Voir la fiche officielle";

    const closeButton = document.createElement("button");
    closeButton.className = "netflix-secondary";
    closeButton.textContent = "Fermer";
    closeButton.addEventListener("click", () => modal.remove());

    buttons.append(official, closeButton);

    content.append(
        close,
        badge,
        title,
        meta,
        genreText,
        description,
        buttons
    );

    modal.appendChild(content);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

// Favoris
function toggleFavorite(anime) {
    const exists = favorites.some(
        item => item.mal_id === anime.mal_id
    );

    favorites = exists
        ? favorites.filter(item => item.mal_id !== anime.mal_id)
        : [...favorites, anime];

    localStorage.setItem(
        "animeverse_favorites",
        JSON.stringify(favorites)
    );

    displayFavorites();
    applyFilters();
}

// Afficher les favoris
function displayFavorites() {
    favoritesGrid.innerHTML = "";

    if (favorites.length === 0) {
        favoritesGrid.innerHTML =
            '<p class="empty-message">Tes favoris apparaîtront ici.</p>';
        return;
    }

    favorites.forEach(anime => {
        favoritesGrid.appendChild(createAnimeCard(anime));
    });
}

// Afficher les animes
function displayAnime(animes) {
    animeGrid.innerHTML = "";

    if (animes.length === 0) {
        animeGrid.innerHTML =
            '<p class="empty-message">Aucun anime trouvé.</p>';
        return;
    }

    animes.forEach(anime => {
        animeGrid.appendChild(createAnimeCard(anime));
    });
}

// Recherche et filtres
function applyFilters() {
    const search = animeSearch.value.trim().toLowerCase();

    const filtered = allAnime.filter(anime => {
        const title = (anime.title || "").toLowerCase();
        const english = (anime.title_english || "").toLowerCase();

        const matchesSearch =
            title.includes(search) || english.includes(search);

        const genres = (anime.genres || []).map(
            genre => genre.name.toLowerCase()
        );

        const matchesGenre =
            selectedGenre === "all" ||
            genres.includes(selectedGenre.toLowerCase());

        return matchesSearch && matchesGenre;
    });

    displayAnime(filtered);
}

// Filtres
filters.forEach(button => {
    button.addEventListener("click", () => {
        filters.forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        selectedGenre = button.dataset.genre;

        applyFilters();
    });
});

// Recherche
animeSearch.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 250);
});

// Bouton recherche
searchButton.addEventListener("click", () => {
    animeSearch.focus();

    document.getElementById("catalogue").scrollIntoView({
        behavior: "smooth"
    });
});

// Fermer la fenêtre avec Échap
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        document.getElementById("animeModal")?.remove();
    }
});

// Démarrage
displayFavorites();
loadAnime();
