
const ANILIST_URL = "https://graphql.anilist.co";
const FRANIME_URL = "https://franime.fr/";

const PER_PAGE = 50;
const MAX_PAGES = 20;

const animeGrid = document.getElementById("animeGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const animeSearch = document.getElementById("animeSearch");
const filters = document.querySelectorAll(".filter");
const searchButton = document.getElementById("searchButton");

let allAnime = [];
let favorites = [];
let selectedGenre = "all";
let searchTimeout = null;
let currentPage = 0;
let isLoading = false;

try {
    favorites = JSON.parse(
        localStorage.getItem("animeverse_favorites") || "[]"
    );
} catch {
    favorites = [];
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Bouton Charger plus
const loadMoreButton = document.createElement("button");
loadMoreButton.id = "loadMoreButton";
loadMoreButton.className = "details-button";
loadMoreButton.textContent = "Charger plus";
loadMoreButton.style.display = "none";
loadMoreButton.style.margin = "30px auto";
loadMoreButton.style.padding = "14px 30px";

animeGrid.insertAdjacentElement("afterend", loadMoreButton);

loadMoreButton.addEventListener("click", () => loadMoreAnime());

// Requête AniList
async function fetchAnimePage(page) {
    const query = `
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(
                    type: ANIME,
                    sort: POPULARITY_DESC
                ) {
                    id
                    idMal
                    title {
                        romaji
                        english
                    }
                    coverImage {
                        extraLarge
                        large
                    }
                    averageScore
                    episodes
                    genres
                    description(asHtml: false)
                }
            }
        }
    `;

    const response = await fetch(ANILIST_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            query,
            variables: {
                page,
                perPage: PER_PAGE
            }
        })
    });

    if (!response.ok) {
        throw new Error("Erreur AniList : " + response.status);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(result.errors[0].message);
    }

    if (!result.data?.Page?.media) {
        throw new Error("Données AniList invalides");
    }

    return result.data.Page.media;
}

// Conversion des données
function normalizeAnime(anime) {
    const title =
        anime.title?.romaji ||
        anime.title?.english ||
        "Sans titre";

    const englishTitle =
        anime.title?.english ||
        anime.title?.romaji ||
        "";

    const image =
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        "";

    return {
        mal_id: anime.idMal || `anilist-${anime.id}`,
        anilist_id: anime.id,
        title: title,
        title_english: englishTitle,
        images: {
            jpg: {
                large_image_url: image
            }
        },
        score: anime.averageScore
            ? Number((anime.averageScore / 10).toFixed(1))
            : null,
        episodes: anime.episodes,
        genres: (anime.genres || []).map(name => ({ name })),
        synopsis: anime.description
            ? anime.description.replace(/<[^>]*>/g, "")
            : "Aucune description disponible."
    };
}

// Charger la première page
async function loadAnime() {
    if (isLoading) return;

    currentPage = 0;
    allAnime = [];

    animeGrid.innerHTML =
        '<p class="loading">Chargement des animes...</p>';

    loadMoreButton.style.display = "none";

    await loadMoreAnime(true);

    displayFavorites();
}

// Charger une page supplémentaire
async function loadMoreAnime(initial = false) {
    if (isLoading || currentPage >= MAX_PAGES) return;

    isLoading = true;

    loadMoreButton.textContent = "Chargement...";
    loadMoreButton.disabled = true;

    try {
        const nextPage = currentPage + 1;

        const results = await fetchAnimePage(nextPage);
        const newAnime = results.map(normalizeAnime);

        if (initial) {
            animeGrid.innerHTML = "";
        }

        allAnime.push(...newAnime);
        currentPage = nextPage;

        applyFilters();

        loadMoreButton.style.display =
            currentPage < MAX_PAGES ? "block" : "none";

        loadMoreButton.textContent =
            currentPage < MAX_PAGES
                ? `Charger plus (${allAnime.length}/1000)`
                : "Catalogue complet";

        console.log(
            `${allAnime.length} animes chargés sur 1000`
        );

    } catch (error) {
        console.error("Erreur AniList :", error);

        loadMoreButton.textContent = "Réessayer";
        loadMoreButton.style.display = "block";

        if (initial) {
            showLoadingError();
        }
    } finally {
        isLoading = false;
        loadMoreButton.disabled = false;
    }
}

function showLoadingError() {
    animeGrid.innerHTML = `
        <p class="error-message">
            Impossible de charger les animes.
        </p>
        <button class="details-button" id="retryAnime">
            Réessayer
        </button>
    `;

    document.getElementById("retryAnime")
        .addEventListener("click", loadAnime);
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

    const franimeButton = document.createElement("a");
    franimeButton.className = "details-button";
    franimeButton.href = FRANIME_URL;
    franimeButton.target = "_blank";
    franimeButton.rel = "noopener noreferrer";
    franimeButton.textContent = "▶ FR Anime";
    franimeButton.style.textAlign = "center";
    franimeButton.style.textDecoration = "none";

    const favoriteButton = document.createElement("button");
    favoriteButton.className = "favorite-button";

    updateFavoriteButton(favoriteButton, anime);

    favoriteButton.addEventListener("click", () => {
        toggleFavorite(anime);
    });

    actions.append(
        detailsButton,
        franimeButton,
        favoriteButton
    );

    info.append(title, score, episodes, actions);
    card.append(image, info);

    return card;
}

// Favoris
function isFavorite(anime) {
    return favorites.some(
        item => String(item.mal_id) === String(anime.mal_id)
    );
}

function updateFavoriteButton(button, anime) {
    const favorite = isFavorite(anime);

    button.textContent = favorite ? "♥" : "♡";
    button.classList.toggle("is-favorite", favorite);
}

function toggleFavorite(anime) {
    const exists = isFavorite(anime);

    favorites = exists
        ? favorites.filter(
            item => String(item.mal_id) !== String(anime.mal_id)
        )
        : [...favorites, anime];

    localStorage.setItem(
        "animeverse_favorites",
        JSON.stringify(favorites)
    );

    displayFavorites();
    applyFilters();
}

// Détails
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
    description.textContent =
        anime.synopsis || "Aucune description disponible.";

    const buttons = document.createElement("div");
    buttons.className = "netflix-buttons";

    const franimeButton = document.createElement("a");
    franimeButton.className = "netflix-watch";
    franimeButton.href = FRANIME_URL;
    franimeButton.target = "_blank";
    franimeButton.rel = "noopener noreferrer";
    franimeButton.textContent = "▶ Regarder sur FR Anime";

    const closeButton = document.createElement("button");
    closeButton.className = "netflix-secondary";
    closeButton.textContent = "Fermer";
    closeButton.addEventListener("click", () => modal.remove());

    buttons.append(franimeButton, closeButton);

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

// Favoris affichés
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

// Catalogue
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
            title.includes(search) ||
            english.includes(search);

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
        selectedGenre = button.dataset.genre || "all";

        applyFilters();
    });
});

// Recherche
animeSearch.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 250);
});

searchButton.addEventListener("click", () => {
    animeSearch.focus();

    document.getElementById("catalogue").scrollIntoView({
        behavior: "smooth"
    });
});

// Fermer les détails avec Échap
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        document.getElementById("animeModal")?.remove();
    }
});

// Démarrage
displayFavorites();
console.log("ANIMEVERSE : démarrage du chargement");
loadAnime();
