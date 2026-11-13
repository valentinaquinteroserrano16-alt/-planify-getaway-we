const $ = (selector) => document.querySelector(selector);

/* -------------------- ALMACENAMIENTO -------------------- */

const getData = (key, fallback = []) => {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.error("No se pudo leer el almacenamiento:", key, error);
        return fallback;
    }
};

const setData = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error("No se pudo guardar la información:", error);
        alert("No se pudo guardar. Comprueba el almacenamiento del navegador.");
    }
};

function getSession() {
    return getData("getaway_demo_session", null);
}

function getUserName() {
    const session = getSession();

    return (
        session?.name ||
        session?.nombre ||
        session?.user?.name ||
        session?.user?.nombre ||
        session?.email?.split("@")[0] ||
        "Viajera"
    );
}

function getUserEmail() {
    const session = getSession();

    return (
        session?.email ||
        session?.user?.email ||
        "invitada@getaway.local"
    ).toLowerCase();
}

function tripsKey() {
    return "getaway_demo_trips_" + getUserEmail();
}

function getTrips() {
    const savedTrips = getData(tripsKey(), null);
    if (Array.isArray(savedTrips)) {
        return savedTrips;
    }
    const legacyTrips = getData("getaway_trips", []);
    if (Array.isArray(legacyTrips) && legacyTrips.length > 0) {
        saveTrips(legacyTrips);
        return legacyTrips;
    }
    return [];
}

function saveTrips(trips) {
    setData(tripsKey(), trips);
}

/* -------------------- SISTEMA DE FAVORITOS (LOCALSTORAGE) -------------------- */

function favoritesKey() {
    return "planify_favoritos_" + getUserEmail();
}

function getFavorites() {
    const favs = getData(favoritesKey(), []);
    return Array.isArray(favs) ? favs : [];
}

function toggleFavorite(destinoObj) {
    const favorites = getFavorites();
    const index = favorites.findIndex(
        item => item.nombre.toLowerCase() === destinoObj.nombre.toLowerCase()
    );

    if (index !== -1) {
        favorites.splice(index, 1);
        setData(favoritesKey(), favorites);
        return false; // Eliminado
    } else {
        favorites.push(destinoObj);
        setData(favoritesKey(), favorites);
        return true; // Agregado
    }
}

function isFavorite(nombreDestino) {
    return getFavorites().some(
        item => item.nombre.toLowerCase() === nombreDestino.toLowerCase()
    );
}

/* -------------------- UTILIDADES -------------------- */

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp",
        "<": "&lt",
        ">": "&gt",
        '"': "&quot;",
        "'": "&#39;"
})[char]);
    
}

function money(value) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "Fecha por definir";
    const date = new Date(value + "T12:00:00");
    if (Number.isNaN(date.getTime())) {
        return "Fecha por definir";
    }
    return date.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function calculateDays(start, end) {
    if (!start || !end) return 1;
    const startDate = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 1;
    }
    const difference = Math.round((endDate - startDate) / 86400000);
    return Math.max(1, difference + 1);
}

/* =========================================================
   APIs PÚBLICAS DE PLANIFY
   1. REST Countries API (Información de países)
   2. Nominatim OpenStreetMap API (Geocodificación)
   3. Open-Meteo API (Clima actual y pronóstico)
   ========================================================= */

// API 1: REST Countries
async function consultarPaisesAPI() {
    try {
        const res = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,translations,capital,region,subregion,population,flags,languages,currencies,latlng"
        );
        if (!res.ok) throw new Error("Error HTTP REST Countries: " + res.status);
        return await res.json();
    } catch (error) {
        console.error("Fallo al consultar REST Countries API:", error);
        return [];
    }
}

// API 2: Nominatim / OpenStreetMap (Geocodificación dinámica)
async function obtenerCoordenadasCiudad(lugar) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(lugar)}`;
        const res = await fetch(url, {
            headers: { "Accept-Language": "es" }
        });
        if (!res.ok) throw new Error("Error HTTP Nominatim: " + res.status);
        const datos = await res.json();

        if (Array.isArray(datos) && datos.length > 0) {
            return {
                lat: parseFloat(datos[0].lat),
                lon: parseFloat(datos[0].lon),
                nombreCompleto: datos[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error("Fallo al consultar Nominatim API:", error);
        return null;
    }
}

// API 3: Open-Meteo (Clima actual y pronóstico de 3 días)
async function consultarClimaAPI(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}¤t_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Error HTTP Open-Meteo: " + res.status);
        return await res.json();
    } catch (error) {
        console.error("Fallo al consultar Open-Meteo API:", error);
        return null;
    }
}

function interpretarCodigoClima(code) {
    if (code === 0) return "Despejado ☀";
    if (code <= 3) return "Parcialmente nublado ⛅";
    if (code <= 48) return "Neblina 🌫";
    if (code <= 67) return "Lluvia 🌧";
    if (code <= 77) return "Nieve ❄";
    if (code <= 82) return "Chubascos 🌦";
    return "Tormenta ⛈";
}

/* -------------------- MAPAS INTERACTIVOS (LEAFLET + OSM) -------------------- */

const coordenadasDestinos = {
    "cartagena": [10.391, -75.479],
    "santa marta": [11.240, -74.211],
    "medellin": [6.2442, -75.5812],
    "medellín": [6.2442, -75.5812],
    "bogota": [4.7110, -74.0721],
    "bogotá": [4.7110, -74.0721],
    "san andres": [12.5847, -81.7006],
    "san andrés": [12.5847, -81.7006],
    "guatape": [6.2355, -75.1583],
    "guatapé": [6.2355, -75.1583]
};

let mapaInstancia = null;

async function inicializarMapaYClima(nombreDestino) {
    const contenedorMapa = document.getElementById("mapa-destino");
    const contenedorClima = document.getElementById("clima-destino");

    // 1. Buscar coordenadas reales mediante Nominatim API (con respaldo local)
    let coords = null;
    const geo = await obtenerCoordenadasCiudad(nombreDestino);

    if (geo) {
        coords = [geo.lat, geo.lon];
    } else {
        const clave = nombreDestino.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        coords = coordenadasDestinos[clave] || [4.5709, -74.2973];
    }

    // 2. Renderizar el mapa con Leaflet si existe el contenedor y la librería L
    if (contenedorMapa && typeof L !== "undefined") {
        if (mapaInstancia !== null) {
            mapaInstancia.remove();
        }

        mapaInstancia = L.map("mapa-destino").setView(coords, 12);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }).addTo(mapaInstancia);

        L.marker(coords).addTo(mapaInstancia)
            .bindPopup(`<b>${escapeHTML(nombreDestino)}</b><br>¡Tu escapada comienza aquí!`)
            .openPopup();
    }

    // 3. Consultar clima real con Open-Meteo API usando las coordenadas obtenidas
    if (contenedorClima) {
        contenedorClima.innerHTML = `<p class="muted">Consultando clima en tiempo real...</p>`;
        const clima = await consultarClimaAPI(coords[0], coords[1]);

        if (clima && clima.current_weather) {
            const actual = clima.current_weather;
            const dias = clima.daily || {};
            const pronosticoHTML = (dias.time || []).slice(1, 4).map((fecha, idx) => {
                const max = dias.temperature_2m_max?.[idx + 1] ?? "-";
                const min = dias.temperature_2m_min?.[idx + 1] ?? "-";
                const lluvia = dias.precipitation_probability_max?.[idx + 1] ?? 0;
                return `
                    <div class="forecast-day" style="padding:10px;border:1px solid #eadbd4;border-radius:12px;background:#fff;">
                        <strong>${formatDate(fecha)}</strong><br>
                        <span>Máx: ${max}°C / Mín: ${min}°C</span><br>
                        <small>Lluvia: ${lluvia}%</small>
                    </div>
                `;
            }).join("");

            contenedorClima.innerHTML = `
                <div class="weather-box" style="padding:18px;border:1px solid #eadbd4;border-radius:16px;background:#fff8f5;margin:16px 0;">
                    <span class="eyebrow">CLIMA EN TIEMPO REAL · OPEN-METEO</span>
                    <h4>${escapeHTML(nombreDestino)}: ${actual.temperature}°C (${interpretarCodigoClima(actual.weathercode)})</h4>
                    <p style="font-size:0.85rem;margin-bottom:12px;">Viento: ${actual.windspeed} km/h</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
                        ${pronosticoHTML}
                    </div>
                </div>
            `;
        } else {
            contenedorClima.innerHTML = `<p class="small-note">No se pudo cargar el pronóstico climático para este destino.</p>`;
        }
    }
}

/* -------------------- IDEAS DE ITINERARIOS -------------------- */

const activities = {
    playa: [
        ["Mañana junto al mar", "Empieza el día con un paseo por la playa y un desayuno tranquilo."],
        ["Una tarde sin afán", "Busca un lugar frente al mar, disfruta el paisaje y toma fotografías."],
        ["Atardecer inolvidable", "Termina el día viendo caer el sol y prueba algo típico del destino."]
    ],
    aventura: [
        ["Conecta con la naturaleza", "Explora un sendero o un parque natural de la zona."],
        ["Un plan fuera de la rutina", "Busca una actividad al aire libre adecuada para tu experiencia."],
        ["Paisajes para recordar", "Visita un mirador y guarda tus mejores fotografías."]
    ],
    cultura: [
        ["Conoce la historia", "Visita un museo, centro histórico o lugar cultural."],
        ["Camina sin prisa", "Descubre calles tradicionales, arquitectura y comercios locales."],
        ["Historias y sabores", "Prueba un plato típico y conoce más sobre sus tradiciones."]
    ],
    gastronomia: [
        ["Desayuno local", "Busca una cafetería tradicional y prueba una especialidad regional."],
        ["Ruta de sabores", "Organiza una pequeña ruta por restaurantes y mercados locales."],
        ["Un sabor para recordar", "Termina el día con un plato representativo del destino."]
    ],
    ciudad: [
        ["La ciudad despierta", "Empieza por una zona céntrica y sus lugares más conocidos."],
        ["Entre tiendas y cafés", "Explora barrios interesantes, librerías y espacios creativos."],
        ["La ciudad de noche", "Elige una zona concurrida y segura para cenar o pasear."]
    ],
    romantico: [
        ["Un comienzo especial", "Busca un desayuno bonito y un paseo tranquilo."],
        ["Un momento para dos", "Planea una actividad compartida o una visita a un lugar especial."],
        ["Una noche memorable", "Elige una cena acogedora y disfruta el destino sin afanes."]
    ]
};

const styleNames = {
    playa: "Playa y descanso",
    aventura: "Aventura y naturaleza",
    cultura: "Cultura e historia",
    gastronomia: "Gastronomía",
    ciudad: "Vida urbana",
    romantico: "Escapada romántica"
};

function buildItinerary(trip) {
    const days = calculateDays(trip.startDate, trip.endDate);
    const ideas = activities[trip.travelStyle] || activities.playa;

    return Array.from({ length: Math.min(days, 14) }, (_, index) => {
        const idea = ideas[index % ideas.length];
        return {
            day: index + 1,
            title: idea[0],
            description: idea[1]
        };
    });
}

/* -------------------- MOSTRAR ITINERARIO -------------------- */

function renderItinerary(trip) {
    const result = $("#tripResult");
    const details = $("#tripDetails");

    if (!result || !details || !trip) return;

    const itinerary = buildItinerary(trip);
    const days = calculateDays(trip.startDate, trip.endDate);

    result.hidden = false;

    details.innerHTML = `
        <div class="itinerary-cover">
            <p class="eyebrow">TU PRÓXIMA HISTORIA</p>
            <h3>${escapeHTML(trip.destination || "Mi escapada")}</h3>
            <p>${escapeHTML(styleNames[trip.travelStyle] || "Viaje a tu estilo")}</p>
            <div class="trip-meta">
                <span>◷ ${days} día(s)</span>
                <span>♧ ${money(trip.budget)}</span>
                <span>♡ ${escapeHTML(trip.travelersLabel || "A tu ritmo")}</span>
            </div>
            <p>${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}</p>
        </div>

        <div id="clima-destino"></div>

        <div class="itinerary-days">
            ${itinerary.map(day => `
                <article class="itinerary-day">
                    <span class="day-number">DÍA ${day.day}</span>
                    <h4>${escapeHTML(day.title)}</h4>
                    <p>${escapeHTML(day.description)}</p>
                </article>
            `).join("")}
        </div>
        <p class="muted small-note">
            Estas son ideas iniciales para inspirarte. Verifica horarios,
            disponibilidad, transporte y precios reales antes de viajar.
        </p>
    `;

    const saveButton = $("#saveTripButton");
    if (saveButton) {
        saveButton.onclick = () => {
            const trips = getTrips();
            const newTrip = {
                ...trip,
                id: String(Date.now()),
                createdAt: new Date().toISOString()
            };
            saveTrips([newTrip, ...trips]);
            saveButton.disabled = true;
            saveButton.textContent = "Viaje guardado ✓";
            const message = $("#saveMessage");
            if (message) {
                message.textContent = "¡Listo! Tu aventura ya está en Mis viajes.";
            }
            updateUserInterface();
        };
    }

    setTimeout(() => {
        inicializarMapaYClima(trip.destination);
    }, 200);
}

/* -------------------- TARJETAS DE VIAJES GUARDADOS -------------------- */

function renderTripCards(container, trips, emptyMessage) {
    if (!container) return;

    if (!Array.isArray(trips) || trips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-symbol">✧</span>
                <h3>Tu próxima historia comienza aquí</h3>
                <p>${escapeHTML(emptyMessage)}</p>
                <a class="button" href="crear-viaje.html">Crear mi aventura ↗</a>
            </div>
        `;
        return;
    }

    container.innerHTML = trips.map(trip => `
        <article class="saved-trip-card">
            <div class="saved-trip-art">✧</div>
            <div class="saved-trip-content">
                <span class="eyebrow">${escapeHTML(styleNames[trip.travelStyle] || "Mi escapada")}</span>
                <h3>${escapeHTML(trip.destination || "Mi escapada")}</h3>
                <p>${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}</p>
                <p>${calculateDays(trip.startDate, trip.endDate)} día(s) · ${money(trip.budget)}</p>
                <button class="text-link view-trip" data-id="${escapeHTML(trip.id)}" type="button">Ver itinerario ↗</button>
                <button class="text-link delete-trip" data-id="${escapeHTML(trip.id)}" type="button">Eliminar</button>
            </div>
        </article>
    `).join("");

    container.querySelectorAll(".view-trip").forEach(button => {
        button.addEventListener("click", () => {
            const trip = getTrips().find(item => String(item.id) === button.dataset.id);
            if (!trip) {
                alert("No encontramos ese viaje guardado.");
                return;
            }
            setData("getaway_selected_trip_" + getUserEmail(), trip);
            window.location.href = "crear-viaje.html?ver=" + encodeURIComponent(trip.id);
        });
    });

    container.querySelectorAll(".delete-trip").forEach(button => {
        button.addEventListener("click", () => {
            const confirmed = confirm("¿Quieres eliminar este viaje guardado?");
            if (!confirmed) return;
            const remainingTrips = getTrips().filter(item => String(item.id) !== button.dataset.id);
            saveTrips(remainingTrips);
            renderTripCards(container, remainingTrips, emptyMessage);
            updateUserInterface();
        });
    });
}

/* -------------------- ACTUALIZAR USUARIO -------------------- */

function updateUserInterface() {
    const name = getUserName();
    const email = getUserEmail();

    const navUser = $("#navUser");
    const welcomeUser = $("#welcomeUser");
    const navAvatar = $("#navAvatar");
    const profileName = $("#profileName");
    const profileEmail = $("#profileEmail");
    const profileAvatar = $("#profileAvatar");
    const profileTrips = $("#profileTrips");
    const nameInput = $("#editName");

    if (navUser) navUser.textContent = name;
    if (welcomeUser) welcomeUser.textContent = name;
    if (navAvatar) navAvatar.textContent = name.charAt(0).toUpperCase();
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (profileAvatar) profileAvatar.textContent = name.charAt(0).toUpperCase();
    if (profileTrips) profileTrips.textContent = getTrips().length;
    if (nameInput) nameInput.value = name;
}

/* -------------------- CREAR VIAJE -------------------- */

function setupPlanner() {
    const form = $("#tripForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const selected = getData("getaway_selected_trip_" + getUserEmail(), null);

    if (selected && params.get("ver") === String(selected.id)) {
        const fields = {
            destination: selected.destination || "",
            startDate: selected.startDate || "",
            endDate: selected.endDate || "",
            budget: selected.budget || "",
            travelers: String(selected.travelers || 1),
            travelStyle: selected.travelStyle || "playa"
        };

        Object.entries(fields).forEach(([id, value]) => {
            const field = document.getElementById(id);
            if (field) field.value = value;
        });

        renderItinerary(selected);
        localStorage.removeItem("getaway_selected_trip_" + getUserEmail());
        return;
    }

    const destination = sessionStorage.getItem("getaway_destination");
    const style = sessionStorage.getItem("getaway_style");
    const destinationInput = $("#destination");
    const styleInput = $("#travelStyle");

    if (destination && destinationInput) {
        destinationInput.value = destination;
        sessionStorage.removeItem("getaway_destination");
    }

    if (style && styleInput) {
        styleInput.value = style;
        sessionStorage.removeItem("getaway_style");
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        const destinationField = $("#destination");
        const startField = $("#startDate");
        const endField = $("#endDate");
        const budgetField = $("#budget");
        const travelersField = $("#travelers");
        const styleField = $("#travelStyle");

        if (!destinationField || !startField || !endField || !budgetField || !travelersField || !styleField) {
            alert("Falta un campo del formulario.");
            return;
        }

        const trip = {
            destination: destinationField.value.trim(),
            startDate: startField.value,
            endDate: endField.value,
            budget: Number(budgetField.value),
            travelers: Number(travelersField.value || 1),
            travelStyle: styleField.value || "playa",
            travelersLabel: travelersField.selectedOptions?.[0]?.textContent || "A tu ritmo"
        };

        if (!trip.destination || !trip.startDate || !trip.endDate || trip.budget <= 0) {
            alert("Completa todos los campos para crear tu itinerario.");
            return;
        }

        if (trip.endDate < trip.startDate) {
            alert("La fecha de regreso no puede ser anterior a la salida.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const departure = new Date(trip.startDate + "T00:00:00");

        if (departure < today) {
            alert("Elige una fecha de salida válida.");
            return;
        }

        renderItinerary(trip);

        const saveButton = $("#saveTripButton");
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Guardar viaje";
        }
    });
}

/* -------------------- EXPLORAR DESTINOS (CON REST COUNTRIES API + FAVORITOS) -------------------- */

async function setupExplore() {
    const grid = $("#destinationGrid");
    if (!grid) return;

    const searchInput = $("#searchInput");
    const countLabel = $("#destinationCount");
    const emptyMsg = $("#emptyMessage");

    // Destinos locales destacados
    const localDestinations = [
        { name: "Cartagena", capital: "Bolívar", region: "Americas", population: 1028736, style: "playa", description: "Murallas, atardeceres y brisa caribeña.", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=85" },
        { name: "Santa Marta", capital: "Magdalena", region: "Americas", population: 538612, style: "aventura", description: "Montañas, mar y naturaleza para explorar.", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=85" },
        { name: "Medellín", capital: "Antioquia", region: "Americas", population: 2569007, style: "ciudad", description: "Cultura, cafés y rincones creativos.", image: "https://images.unsplash.com/photo-1560347876-aeef00ee58a1?auto=format&fit=crop&w=900&q=85" },
        { name: "Bogotá", capital: "Cundinamarca", region: "Americas", population: 7901653, style: "cultura", description: "Arte, historia y gastronomía urbana.", image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=900&q=85" },
        { name: "Eje Cafetero", capital: "Armenia / Pereira", region: "Americas", population: 2500000, style: "naturaleza", description: "Paisajes verdes y experiencias rurales.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85" },
        { name: "San Andrés", capital: "San Andrés", region: "Americas", population: 65228, style: "playa", description: "Aguas turquesas y días junto al mar.", image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=85" }
    ];

    grid.innerHTML = `<p class="muted">Cargando destinos y países desde REST Countries API...</p>`;

    // Consultar países reales desde REST Countries API
    const apiPaises = await consultarPaisesAPI();
    const paisesMapeados = apiPaises.slice(0, 30).map(pais => {
        const nombreES = pais.translations?.spa?.common || pais.name?.common || "País";
        const capital = Array.isArray(pais.capital) ? pais.capital[0] : "No definida";
        const idiomas = pais.languages ? Object.values(pais.languages).join(", ") : "N/A";
        const monedas = pais.currencies ? Object.values(pais.currencies).map(m => m.name).join(", ") : "N/A";

        return {
            name: nombreES,
            capital: capital,
            region: pais.region || "Mundo",
            population: pais.population || 0,
            style: (pais.region || "").toLowerCase(),
            description: `Capital: ${capital} · Idiomas: ${idiomas} · Moneda: ${monedas}`,
            image: pais.flags?.svg || pais.flags?.png || ""
        };
    });

    const allDestinations = [...localDestinations, ...paisesMapeados];
    let currentFilter = "todos";

    function draw() {
        const query = (searchInput?.value || "").trim().toLowerCase();

        const filtered = allDestinations.filter(place => {
            const matchFilter =
                currentFilter === "todos" ||
                place.style === currentFilter ||
                place.region.toLowerCase() === currentFilter;

            const matchSearch =
                !query ||
                place.name.toLowerCase().includes(query) ||
                place.capital.toLowerCase().includes(query) ||
                place.region.toLowerCase().includes(query);

            return matchFilter && matchSearch;
        });

        if (countLabel) {
            countLabel.textContent = `${filtered.length} destino(s) encontrados`;
        }

        if (filtered.length === 0) {
            grid.innerHTML = "";
            if (emptyMsg) emptyMsg.style.display = "block";
            return;
        }

        if (emptyMsg) emptyMsg.style.display = "none";

        grid.innerHTML = filtered.map(place => {
            const favActive = isFavorite(place.name);
            return `
                <article class="destination-card">
                    <img src="${escapeHTML(place.image)}" alt="${escapeHTML(place.name)}" loading="lazy">
                    <div class="destination-card-content">
                        <span class="eyebrow">${escapeHTML(place.region)} · Capital: ${escapeHTML(place.capital)}</span>
                        <h3>${escapeHTML(place.name)}</h3>
                        <p>${escapeHTML(place.description)}</p>
                        <p><small>Población: ${Number(place.population).toLocaleString("es-CO")} hab.</small></p>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                            <button class="button button-small plan-destination" data-destination="${escapeHTML(place.name)}" data-style="${escapeHTML(place.style)}" type="button">Planear ↗</button>
                            <button class="button button-small button-outline fav-destination" data-name="${escapeHTML(place.name)}" data-region="${escapeHTML(place.region)}" data-image="${escapeHTML(place.image)}" type="button">
                                ${favActive ? "♥ Guardado" : "♡ Favorito"}
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        grid.querySelectorAll(".plan-destination").forEach(button => {
            button.addEventListener("click", () => {
                sessionStorage.setItem("getaway_destination", button.dataset.destination);
                sessionStorage.setItem("getaway_style", button.dataset.style);
                window.location.href = "crear-viaje.html";
            });
        });

        grid.querySelectorAll(".fav-destination").forEach(button => {
            button.addEventListener("click", () => {
                const added = toggleFavorite({
                    nombre: button.dataset.name,
                    region: button.dataset.region,
                    imagen: button.dataset.image
                });
                button.textContent = added ? "♥ Guardado" : "♡ Favorito";
            });
        });
    }

    document.querySelectorAll("[data-filter]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-filter]").forEach(item => {
                item.classList.remove("active", "filter-active");
            });
            button.classList.add("active", "filter-active");
            currentFilter = button.dataset.filter;
            draw();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", draw);
    }

    draw();
}

/* -------------------- PERFIL -------------------- */

function setupProfile() {
    const form = $("#profileForm");
    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();
        const nameInput = $("#editName");
        if (!nameInput) return;
        const newName = nameInput.value.trim();
        if (!newName) {
            alert("Escribe el nombre que quieres mostrar.");
            return;
        }
        const session = getSession();
        if (!session) {
            alert("No encontramos una sesión activa.");
            return;
        }
        session.name = newName;
        session.nombre = newName;
        if (session.user && typeof session.user === "object") {
            session.user.name = newName;
            session.user.nombre = newName;
        }
        setData("getaway_demo_session", session);
        updateUserInterface();
        const message = $("#profileMessage");
        if (message) {
            message.textContent = "Tu nombre se actualizó correctamente.";
        }
    });
}

/* -------------------- CONFIGURACIÓN -------------------- */

function setupSettings() {
    const form = $("#settingsForm");
    if (!form) return;

    const settingsKey = "getaway_settings_" + getUserEmail();
    const settings = getData(settingsKey, { currency: "COP", style: "aventura" });

    const currencyInput = $("#preferredCurrency");
    const styleInput = $("#preferredStyle");

    if (currencyInput) currencyInput.value = settings.currency || "COP";
    if (styleInput) styleInput.value = settings.style || "aventura";

    form.addEventListener("submit", event => {
        event.preventDefault();
        const currency = $("#preferredCurrency");
        const style = $("#preferredStyle");
        if (!currency || !style) return;

        setData(settingsKey, { currency: currency.value, style: style.value });
        const message = $("#settingsMessage");
        if (message) message.textContent = "Tus preferencias se guardaron.";
    });
}

/* -------------------- CERRAR SESIÓN -------------------- */

function setupLogout() {
    const logoutButton = $("#logoutButton");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("getaway_demo_session");
        localStorage.removeItem("getaway_demo_session");
        window.location.href = "login.html";
    });
}

/* -------------------- INICIAR APLICACIÓN -------------------- */

document.addEventListener("DOMContentLoaded", () => {
    updateUserInterface();
    setupLogout();

    renderTripCards($("#homeTrips"), getTrips().slice(0, 3), "Todavía no has guardado ningún viaje.");
    renderTripCards($("#allTrips"), getTrips(), "Cuando guardes tu primera aventura, aparecerá aquí.");

    setupPlanner();
    setupExplore();
    setupProfile();
    setupSettings();
});