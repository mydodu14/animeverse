
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

// Charger les favoris sauvegardés
try {
    favorites = JSON.parse(
        localStorage.getItem("animeverse_favorites") || "[]"
    );
} catch {
    favorites = [];
}

// Construire le lien de recherche Crunchyroll
function getCrunchyrollUrl(anime) {
    const title =
        anime.title_english ||
        anime.title ||
        anime.title_japanese ||
        "Anime";

    return `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`;
}

// Ouvrir Crunchyroll dans un nouvel onglet
function openCrunchyroll(anime) {
    window.open(
        getCrunchyrollUrl(anime),
        "_blank",
        "noopener,noreferrer"
    );
}

// Charger le catalogue
async function loadAnime() {
    animeGrid.innerHTML =
        '<p class="loading">Chargement des animes...</p>';

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
        displayFavorites();

    } catch (error) {
        console.error(error);

        animeGrid.innerHTML = `
            <p class="error-message">
                Impossible de charger les animes.
            </p>
            <button class="details-button" onclick="loadAnime()">
                Réessayer
            </button>
        `;
    }
}

// Créer une carte anime
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

    // Bouton Découvrir
    const detailsButton = document.createElement("button");
    detailsButton.className = "details-button";
    detailsButton.textContent = "Découvrir";

    detailsButton.addEventListener("click", () => {
        showAnimeDetails(anime);
    });

    // Bouton Crunchyroll sur chaque carte
    const crunchyrollButton = document.createElement("a");

    crunchyrollButton.className = "details-button";
    crunchyrollButton.href = getCrunchyrollUrl(anime);
    crunchyrollButton.target = "_blank";
    crunchyrollButton.rel = "noopener noreferrer";
    crunchyrollButton.textContent = "▶ Crunchyroll";

    crunchyrollButton.style.textAlign = "center";
    crunchyrollButton.style.textDecoration = "none";

    // Bouton favoris
    const favoriteButton = document.createElement("button");
    favoriteButton.className = "favorite-button";

    updateFavoriteButton(favoriteButton, anime);

    favoriteButton.addEventListener("click", () => {
        toggleFavorite(anime);
    });

    actions.append(
        detailsButton,
        crunchyrollButton,
        favoriteButton
    );

    info.append(title, score, episodes, actions);
    card.append(image, info);

    return card;
}

// Mettre à jour le bouton favoris
function updateFavoriteButton(button, anime) {
    const isFavorite = favorites.some(
        item => item.mal_id === anime.mal_id
    );

    button.textContent = isFavorite ? "♥" : "♡";
    button.classList.toggle("is-favorite", isFavorite);
}

// Afficher les détails d'un anime
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

    // Fermer
    const close = document.createElement("button");
    close.className = "netflix-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "Fermer");

    close.addEventListener("click", () => modal.remove());

    // Badge
    const badge = document.createElement("span");
    badge.className = "netflix-badge";
    badge.textContent = "ANIMEVERSE";

    // Titre
    const title = document.createElement("h1");
    title.textContent = anime.title || "Anime";

    // Informations
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

    // Genres
    const genreText = document.createElement("p");
    genreText.className = "netflix-genres";

    genreText.textContent = (anime.genres || [])
        .map(genre => genre.name)
        .join(" • ") || "Genres inconnus";

    // Description
    const description = document.createElement("p");
    description.className = "netflix-description";

    description.textContent = anime.description
        ? anime.description.replace(/<[^>]*>/g, "")
        : anime.synopsis || "Aucune description disponible.";

    // Boutons
    const buttons = document.createElement("div");
    buttons.className = "netflix-buttons";

    // Bouton Regarder sur Crunchyroll
    const official = document.createElement("a");

    official.className = "netflix-watch";
    official.href = getCrunchyrollUrl(anime);
    official.target = "_blank";
    official.rel = "noopener noreferrer";
    official.textContent = "▶ Regarder sur Crunchyroll";

    // Bouton Fermer
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

// Ajouter ou retirer un favori
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

// Afficher le catalogue
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

// Filtres par genre
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
