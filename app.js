/* =========================================================
   GET AWAY — app.js
   Funciones compartidas:
   cuentas, sesiones, perfiles, itinerarios y viajes.
========================================================= */

"use strict";

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

const byId = id => document.getElementById(id);

const STORAGE = {
    users: "getaway_demo_users",
    session: "getaway_demo_session",
    sessionBackup: "getaway_demo_session_backup",
    legacyTrips: "getaway_trips",
    lastTrip: "getaway_last_trip",
    selectedTripPrefix: "getaway_selected_trip_",
    preferences: "getaway_preferences"
};

/* ===================== ALMACENAMIENTO ===================== */

function getData(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.warn(`No se pudo leer ${key}`, error);
        return fallback;
    }
}

function setData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`No se pudo guardar ${key}`, error);
        return false;
    }
}

/* ===================== SESIÓN Y USUARIO ===================== */

function getSession() {
    return getData(STORAGE.session, null) ||
           getData(STORAGE.sessionBackup, null);
}

function setSession(session) {
    setData(STORAGE.session, session);
    setData(STORAGE.sessionBackup, session);
}

function getUserEmail() {
    const session = getSession();

    return String(
        session?.email ||
        session?.user?.email ||
        "invitada@getaway.local"
    ).trim().toLowerCase();
}

function getUserName() {
    const session = getSession();

    return String(
        session?.name ||
        session?.user?.name ||
        session?.nombre ||
        session?.user?.displayName ||
        "Viajera"
    ).trim();
}

function isGuest() {
    return !getSession() ||
           getUserEmail() === "invitada@getaway.local";
}

function tripsKey() {
    return `getaway_demo_trips_${getUserEmail()}`;
}

/* ===================== FOTOS DE DESTINOS ===================== */

const destinationImages = {
    "cartagena":
        "https://images.unsplash.com/photo-1583997052103-b4a1cb974ce3?auto=format&fit=crop&w=1200&q=85",

    "santa marta":
        "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=85",

    "medellín":
        "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=1200&q=85",

    "medellin":
        "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=1200&q=85",

    "san andrés":
        "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85",

    "san andres":
        "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85",

    "eje cafetero":
        "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=85",

    "guatapé":
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85",

    "guatape":
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85",

    "villa de leyva":
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85",

    "tayrona":
        "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=85",

    "mompox":
        "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=85",

    "bogotá":
        "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=1200&q=85",

    "bogota":
        "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?auto=format&fit=crop&w=1200&q=85",

    "barranquilla":
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85"
};

function getDestinationImage(destination) {
    const key = String(destination || "")
        .trim()
        .toLowerCase();

    return destinationImages[key] ||
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85";
}

/* ===================== UTILIDADES ===================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
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

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Fecha por definir";
    }

    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return 1;

    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return 1;
    }

    return Math.max(
        1,
        Math.round((end - start) / 86400000) + 1
    );
}

const styleNames = {
    playa: "Sol y playa",
    aventura: "Aventura",
    cultura: "Cultura",
    gastronomia: "Gastronomía",
    ciudad: "Explorar la ciudad",
    romantico: "Escapada romántica",
    naturaleza: "Naturaleza",
    descanso: "Descanso"
};
/* ===================== NORMALIZAR VIAJES ===================== */

function normalizeTrip(trip = {}) {
    const destination = String(
        trip.destination || trip.destino || "Mi escapada"
    ).trim();

    const style = String(
        trip.travelStyle || trip.style || trip.estilo || "aventura"
    ).toLowerCase();

    const startDate = trip.startDate || trip.fechaInicio || "";
    const endDate = trip.endDate || trip.fechaFin || "";

    const travelers = Math.max(
        1,
        Number(trip.travelers || trip.personas || 1)
    );

    return {
        ...trip,
        id: String(
            trip.id ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        ),
        destination,
        startDate,
        endDate,
        travelStyle: style,
        style,
        styleName: trip.styleName || styleNames[style] || "A tu manera",
        travelers,
        travelersLabel: `${travelers} ${
            travelers === 1 ? "viajero" : "viajeros"
        }`,
        budget: Math.max(
            0,
            Number(trip.budget || trip.presupuesto || 0)
        ),
        days: Math.max(
            1,
            Number(trip.days || calculateDays(startDate, endDate))
        ),
        image: trip.image || trip.imagen || getDestinationImage(destination),
        createdAt: trip.createdAt || new Date().toISOString()
    };
}

/* ===================== LEER Y GUARDAR VIAJES ===================== */

function getTrips() {
    const currentTrips = getData(tripsKey(), null);

    if (Array.isArray(currentTrips)) {
        return currentTrips.map(normalizeTrip);
    }

    // Recupera los viajes creados con la versión anterior.
    const oldTrips = getData(STORAGE.legacyTrips, []);

    if (Array.isArray(oldTrips) && oldTrips.length > 0) {
        const normalizedTrips = oldTrips.map(normalizeTrip);

        setData(tripsKey(), normalizedTrips);

        return normalizedTrips;
    }

    return [];
}

function saveTrips(trips) {
    const normalizedTrips = (
        Array.isArray(trips) ? trips : []
    ).map(normalizeTrip);

    return setData(tripsKey(), normalizedTrips);
}

/* ===================== ACTIVIDADES POR ESTILO ===================== */

const activities = {
    playa: [
        ["Mañana", "Desayuno local y paseo por la playa"],
        ["Tarde", "Almuerzo caribeño y actividad junto al mar"],
        ["Atardecer", "Fotos, brisa y tiempo para disfrutar el paisaje"],
        ["Noche", "Cena tranquila y recorrido por el centro"]
    ],

    aventura: [
        ["Mañana", "Desayuno temprano y salida a la ruta"],
        ["Tarde", "Actividad al aire libre y parada panorámica"],
        ["Atardecer", "Descanso y fotografías del paisaje"],
        ["Noche", "Cena local y preparación para el siguiente día"]
    ],

    cultura: [
        ["Mañana", "Desayuno típico y recorrido por el centro histórico"],
        ["Tarde", "Visita a un museo, galería o lugar cultural"],
        ["Atardecer", "Café en un lugar tradicional"],
        ["Noche", "Prueba un plato representativo del destino"]
    ],

    gastronomia: [
        ["Mañana", "Desayuno en una cafetería local"],
        ["Tarde", "Ruta gastronómica y almuerzo regional"],
        ["Atardecer", "Visita a un mercado o negocio local"],
        ["Noche", "Cena especial para cerrar el día"]
    ],

    ciudad: [
        ["Mañana", "Desayuno y recorrido por lugares emblemáticos"],
        ["Tarde", "Tiendas locales, parques y rincones fotogénicos"],
        ["Atardecer", "Visita a un mirador o café"],
        ["Noche", "Plan nocturno según tus gustos"]
    ],

    romantico: [
        ["Mañana", "Desayuno relajado en un lugar bonito"],
        ["Tarde", "Paseo especial y experiencia para compartir"],
        ["Atardecer", "Contemplar el paisaje y tomar fotografías"],
        ["Noche", "Cena especial y caminata tranquila"]
    ],

    naturaleza: [
        ["Mañana", "Desayuno y caminata para descubrir el entorno"],
        ["Tarde", "Visita a un parque, sendero o paisaje natural"],
        ["Atardecer", "Disfruta las vistas y toma fotografías"],
        ["Noche", "Cena local y descanso"]
    ],

    descanso: [
        ["Mañana", "Desayuno relajado y mañana libre"],
        ["Tarde", "Actividad suave y tiempo para desconectar"],
        ["Atardecer", "Disfruta la vista sin mirar el reloj"],
        ["Noche", "Cena tranquila y descanso"]
    ]
};

/* ===================== GENERAR ITINERARIO ===================== */

function buildItinerary(trip) {
    const normalizedTrip = normalizeTrip(trip);

    const plans =
        activities[normalizedTrip.travelStyle] || activities.aventura;

    const totalDays = Math.min(normalizedTrip.days, 30);

    return Array.from({ length: totalDays }, (_, index) => {
        let date = "";

        if (normalizedTrip.startDate) {
            const start = new Date(
                `${normalizedTrip.startDate}T12:00:00`
            );

            start.setDate(start.getDate() + index);

            date = [
                start.getFullYear(),
                String(start.getMonth() + 1).padStart(2, "0"),
                String(start.getDate()).padStart(2, "0")
            ].join("-");
        }

        return {
            day: index + 1,
            date,

            activities: plans.map((activity, activityIndex) => ({
                time: activity[0],
                title: activity[1],

                note: [
                    "Empieza el día a tu ritmo.",
                    "Adapta el plan según el clima y tus preferencias.",
                    "Guarda un recuerdo especial de este momento.",
                    "Revisa tu presupuesto antes de terminar el día."
                ][activityIndex]
            }))
        };
    });
}

/* ===================== MOSTRAR ITINERARIO ===================== */

function renderItinerary(trip) {
    const normalizedTrip = normalizeTrip(trip);

    if (
        !Array.isArray(normalizedTrip.itinerary) ||
        normalizedTrip.itinerary.length === 0
    ) {
        normalizedTrip.itinerary = buildItinerary(normalizedTrip);
    }

    const result = byId("tripResult");
    const details = byId("tripDetails");

    if (!result || !details) {
        console.warn(
            "No se encontraron #tripResult o #tripDetails en crear-viaje.html."
        );
        return;
    }

    details.innerHTML = `
        <div class="trip-result-cover">
            <img
                src="${escapeHTML(normalizedTrip.image)}"
                alt="Paisaje de ${escapeHTML(normalizedTrip.destination)}"
                onerror="this.onerror=null;this.src='${getDestinationImage("naturaleza")}';"
            >

            <div class="trip-result-overlay">
                <p class="eyebrow">TU PRÓXIMA AVENTURA</p>

                <h2>${escapeHTML(normalizedTrip.destination)}</h2>

                <p>
                    ${escapeHTML(normalizedTrip.styleName)}
                    ·
                    ${normalizedTrip.days}
                    ${normalizedTrip.days === 1 ? "día" : "días"}
                </p>
            </div>
        </div>

        <div class="trip-summary">
            <div>
                <span>Fechas</span>
                <strong>
                    ${escapeHTML(formatDate(normalizedTrip.startDate))}
                    –
                    ${escapeHTML(formatDate(normalizedTrip.endDate))}
                </strong>
            </div>

            <div>
                <span>Viajeros</span>
                <strong>${normalizedTrip.travelers}</strong>
            </div>

            <div>
                <span>Presupuesto</span>
                <strong>${escapeHTML(money(normalizedTrip.budget))}</strong>
            </div>
        </div>

        <div class="itinerary-days">
            ${normalizedTrip.itinerary.map(day => `
                <article class="itinerary-day">
                    <div class="itinerary-day-heading">
                        <span>DÍA ${day.day}</span>

                        <h3>
                            ${escapeHTML(
                                day.date
                                    ? formatDate(day.date)
                                    : `Día ${day.day} de tu viaje`
                            )}
                        </h3>
                    </div>

                    <div class="itinerary-activities">
                        ${(day.activities || []).map(activity => `
                            <div class="itinerary-activity">
                                <span class="activity-time">
                                    ${escapeHTML(activity.time || "Plan")}
                                </span>

                                <div>
                                    <h4>
                                        ${escapeHTML(
                                            activity.title || "Tiempo libre"
                                        )}
                                    </h4>

                                    <p>
                                        ${escapeHTML(
                                            activity.note ||
                                            "Disfruta el momento a tu manera."
                                        )}
                                    </p>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </article>
            `).join("")}
        </div>
    `;

    result.hidden = false;
    result.style.display = "block";

    const saveButton =
        byId("saveTripBtn") ||
        byId("saveTrip");

    if (saveButton) {
        const alreadySaved = getTrips().some(
            savedTrip => savedTrip.id === normalizedTrip.id
        );

        saveButton.textContent = alreadySaved
            ? "Viaje guardado ✓"
            : "Guardar mi viaje";

        saveButton.disabled = alreadySaved;

        saveButton.onclick = () => {
            saveCurrentTrip(normalizedTrip);
        };
    }

    result.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* ===================== GUARDAR UN VIAJE ===================== */

function saveCurrentTrip(trip) {
    if (isGuest()) {
        alert(
            "Inicia sesión o crea una cuenta para guardar tus viajes en tu perfil."
        );

        window.location.href = "login.html";
        return false;
    }

    const normalizedTrip = normalizeTrip(trip);
    const trips = getTrips();

    const alreadyExists = trips.some(
        savedTrip => savedTrip.id === normalizedTrip.id
    );

    if (alreadyExists) {
        alert("Este viaje ya está guardado en tu colección.");
        refreshTripLists();
        return false;
    }

    normalizedTrip.id = String(Date.now());
    normalizedTrip.createdAt = new Date().toISOString();

    const success = saveTrips([
        normalizedTrip,
        ...trips
    ]);

    if (!success) {
        alert(
            "No se pudo guardar el viaje. Revisa el almacenamiento de tu navegador."
        );
        return false;
    }

    setData(STORAGE.lastTrip, normalizedTrip);

    const saveButton =
        byId("saveTripBtn") ||
        byId("saveTrip");

    if (saveButton) {
        saveButton.textContent = "Viaje guardado ✓";
        saveButton.disabled = true;
    }

    refreshTripLists();

    alert(
        "¡Tu viaje quedó guardado! Ya puedes encontrarlo en Mis viajes."
    );

    return true;
}/* ===================== TARJETAS DE VIAJES ===================== */

function renderTripCards(container, trips, emptyMessage = "Aún no tienes viajes guardados.") {
    if (!container) return;

    if (!trips || trips.length === 0) {
        container.innerHTML = `
            <div class="empty-trips">
                <div class="empty-trips-icon">✦</div>
                <h3>Tu próxima aventura te espera</h3>
                <p>${escapeHTML(emptyMessage)}</p>
                <a href="explorar.html" class="btn btn-primary">
                    Explorar destinos
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = trips.map(rawTrip => {
        const trip = normalizeTrip(rawTrip);

        return `
            <article class="saved-trip-card" data-trip-id="${escapeHTML(trip.id)}">
                <div class="saved-trip-image">
                    <img
                        src="${escapeHTML(trip.image)}"
                        alt="${escapeHTML(trip.destination)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${getDestinationImage("naturaleza")}';"
                    >

                    <span class="saved-trip-tag">
                        ${escapeHTML(trip.styleName)}
                    </span>
                </div>

                <div class="saved-trip-content">
                    <h3>${escapeHTML(trip.destination)}</h3>

                    <p class="saved-trip-date">
                        ${escapeHTML(formatDate(trip.startDate))}
                        ${trip.endDate
                            ? ` – ${escapeHTML(formatDate(trip.endDate))}`
                            : ""}
                    </p>

                    <div class="saved-trip-info">
                        <span>
                            ${trip.days} ${trip.days === 1 ? "día" : "días"}
                        </span>

                        <span>${trip.travelers} viajeros</span>
                    </div>

                    <p class="saved-trip-budget">
                        ${escapeHTML(money(trip.budget))}
                    </p>

                    <div class="saved-trip-actions">
                        <button
                            type="button"
                            class="btn btn-primary view-trip"
                            data-action="view-trip"
                            data-id="${escapeHTML(trip.id)}"
                        >
                            Ver itinerario
                        </button>

                        <button
                            type="button"
                            class="btn btn-secondary delete-trip"
                            data-action="delete-trip"
                            data-id="${escapeHTML(trip.id)}"
                            aria-label="Eliminar viaje a ${escapeHTML(trip.destination)}"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    container.querySelectorAll('[data-action="view-trip"]').forEach(button => {
        button.addEventListener("click", () => {
            const trip = trips
                .map(normalizeTrip)
                .find(item => item.id === button.dataset.id);

            if (!trip) return;

            setData(STORAGE.lastTrip, trip);
            setData(
                `${STORAGE.selectedTripPrefix}${getUserEmail()}`,
                trip
            );

            window.location.href =
                `crear-viaje.html?ver=${encodeURIComponent(trip.id)}`;
        });
    });

    container.querySelectorAll('[data-action="delete-trip"]').forEach(button => {
        button.addEventListener("click", () => {
            const tripId = button.dataset.id;

            const confirmed = confirm(
                "¿Seguro que quieres eliminar este viaje?"
            );

            if (!confirmed) return;

            const updatedTrips = getTrips().filter(
                trip => trip.id !== tripId
            );

            if (saveTrips(updatedTrips)) {
                refreshTripLists();
            } else {
                alert("No se pudo eliminar el viaje.");
            }
        });
    });
}

/* ===================== ACTUALIZAR LISTAS ===================== */

function refreshTripLists() {
    const trips = getTrips();

    const allTripsContainer =
        byId("allTrips") ||
        byId("savedTrips") ||
        byId("tripsGrid");

    if (allTripsContainer) {
        renderTripCards(
            allTripsContainer,
            trips,
            "Crea tu primer itinerario y guárdalo aquí."
        );
    }

    const profileTripsContainer =
        byId("profileTrips") ||
        byId("myTrips");

    if (
        profileTripsContainer &&
        profileTripsContainer !== allTripsContainer
    ) {
        renderTripCards(
            profileTripsContainer,
            trips.slice(0, 3),
            "Cuando guardes un viaje, aparecerá aquí."
        );
    }

    const tripCount = byId("tripCount");

    if (tripCount) {
        tripCount.textContent = String(trips.length);
    }
}

/* ===================== REGISTRO DE USUARIOS ===================== */

function setupRegister() {
    const form =
        byId("registerForm") ||
        byId("registroForm") ||
        $('form[data-auth="register"]');

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const nameInput =
            byId("name") ||
            byId("fullName") ||
            byId("nombre") ||
            $('[name="name"]', form) ||
            $('[name="nombre"]', form);

        const emailInput =
            byId("email") ||
            $('[name="email"]', form);

        const passwordInput =
            byId("password") ||
            $('[name="password"]', form);

        const confirmInput =
            byId("confirmPassword") ||
            byId("passwordConfirm") ||
            $('[name="confirmPassword"]', form) ||
            $('[name="confirm-password"]', form);

        const name = nameInput?.value.trim() || "";
        const email = emailInput?.value.trim().toLowerCase() || "";
        const password = passwordInput?.value || "";
        const confirmPassword = confirmInput?.value || "";

        if (!name || !email || !password) {
            alert("Completa todos los campos obligatorios.");
            return;
        }

        if (password.length < 6) {
            alert("Tu contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (confirmInput && password !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        const users = getData(STORAGE.users, []);

        if (
            users.some(user =>
                String(user.email).toLowerCase() === email
            )
        ) {
            alert("Ya existe una cuenta con ese correo.");
            return;
        }

        const user = {
            id: String(Date.now()),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(user);

        if (!setData(STORAGE.users, users)) {
            alert("No se pudo crear la cuenta. Inténtalo nuevamente.");
            return;
        }

        setSession({
            id: user.id,
            name: user.name,
            email: user.email
        });

        alert("¡Tu cuenta está lista! Bienvenida a Get Away.");

        window.location.href = "app.html";
    });
}

/* ===================== INICIO DE SESIÓN ===================== */

function setupLogin() {
    const form =
        byId("loginForm") ||
        byId("inicioSesionForm") ||
        $('form[data-auth="login"]');

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const emailInput =
            byId("email") ||
            $('[name="email"]', form);

        const passwordInput =
            byId("password") ||
            $('[name="password"]', form);

        const email = emailInput?.value.trim().toLowerCase() || "";
        const password = passwordInput?.value || "";

        const users = getData(STORAGE.users, []);

        const user = users.find(item =>
            String(item.email).toLowerCase() === email &&
            item.password === password
        );

        if (!user) {
            alert("Correo o contraseña incorrectos.");
            return;
        }

        setSession({
            id: user.id,
            name: user.name,
            email: user.email
        });

        alert(`¡Qué bueno tenerte de vuelta, ${user.name}!`);

        window.location.href = "app.html";
    });
}/* ===================== FORMULARIO DEL ITINERARIO ===================== */

function setupPlanner() {
    const form =
        byId("tripForm") ||
        byId("createTripForm");

    if (!form) return;

    const steps = $$(".step", form);
    let currentStep = 1;

    const getValue = (...ids) => {
        for (const id of ids) {
            const element = byId(id) || $(`[name="${id}"]`, form);

            if (element && element.value !== undefined) {
                return element.value.trim();
            }
        }

        return "";
    };

    const showStep = stepNumber => {
        currentStep = stepNumber;

        steps.forEach((step, index) => {
            step.hidden = index + 1 !== stepNumber;
            step.classList.toggle("active", index + 1 === stepNumber);
        });

        const indicator = byId("stepIndicator");

        if (indicator) {
            indicator.textContent = `Paso ${stepNumber} de ${steps.length || 3}`;
        }

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    const destinationField =
        byId("destination") ||
        $('[name="destination"]', form);

    // Recibe el destino elegido desde Explorar.
    const selectedDestination =
        sessionStorage.getItem("getaway_destination");

    if (
        destinationField &&
        selectedDestination &&
        !destinationField.value
    ) {
        destinationField.value = selectedDestination;
    }

    const startField =
        byId("startDate") ||
        $('[name="startDate"]', form);

    const endField =
        byId("endDate") ||
        $('[name="endDate"]', form);

    if (startField && endField) {
        startField.addEventListener("change", () => {
            if (startField.value) {
                endField.min = startField.value;

                if (
                    endField.value &&
                    endField.value < startField.value
                ) {
                    endField.value = startField.value;
                }
            }
        });
    }

    const updatePreview = () => {
        const destination = getValue("destination") || "Tu destino";
        const style = getValue("travelStyle", "style") || "aventura";
        const travelers = Number(getValue("travelers", "personas")) || 1;
        const budget = Number(getValue("budget", "presupuesto")) || 0;
        const startDate = getValue("startDate");
        const endDate = getValue("endDate");
        const days = calculateDays(startDate, endDate);

        const previewDestination = byId("previewDestination");
        const previewImage = byId("previewImage");
        const previewStyle = byId("previewStyle");
        const previewTravelers = byId("previewTravelers");
        const previewDuration = byId("previewDuration");
        const previewBudget = byId("previewBudget");

        if (previewDestination) {
            previewDestination.textContent = destination;
        }

        if (previewImage) {
            previewImage.src = getDestinationImage(destination);
            previewImage.alt = `Destino: ${destination}`;
        }

        if (previewStyle) {
            previewStyle.textContent =
                styleNames[style.toLowerCase()] || style;
        }

        if (previewTravelers) {
            previewTravelers.textContent =
                `${travelers} ${travelers === 1 ? "viajero" : "viajeros"}`;
        }

        if (previewDuration) {
            previewDuration.textContent =
                `${days} ${days === 1 ? "día" : "días"}`;
        }

        if (previewBudget) {
            previewBudget.textContent = money(budget);
        }
    };

    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);

    const next1 = byId("next1");
    const next2 = byId("next2");
    const back2 = byId("back2");
    const back3 = byId("back3");

    next1?.addEventListener("click", () => {
        if (!destinationField?.value.trim()) {
            alert("Primero elige tu destino.");
            destinationField?.focus();
            return;
        }

        if (
            startField?.value &&
            endField?.value &&
            endField.value < startField.value
        ) {
            alert("La fecha de regreso no puede ser anterior a la salida.");
            return;
        }

        showStep(2);
    });

    next2?.addEventListener("click", () => {
        showStep(3);
        updatePreview();
    });

    back2?.addEventListener("click", () => showStep(1));
    back3?.addEventListener("click", () => showStep(2));

    const editButton =
        byId("editTripBtn") ||
        byId("editTrip");

    editButton?.addEventListener("click", () => {
        showStep(1);
    });

    // Abre un viaje previamente guardado desde Mis viajes.
    const requestedTripId = new URLSearchParams(
        window.location.search
    ).get("ver");

    if (requestedTripId) {
        const selectedTrip = getTrips().find(
            trip => trip.id === requestedTripId
        );

        if (selectedTrip) {
            if (destinationField) {
                destinationField.value = selectedTrip.destination;
            }

            const styleField =
                byId("travelStyle") ||
                $('[name="travelStyle"]', form) ||
                byId("style");

            if (styleField) {
                styleField.value = selectedTrip.travelStyle;
            }

            if (startField) {
                startField.value = selectedTrip.startDate;
            }

            if (endField) {
                endField.value = selectedTrip.endDate;
            }

            const travelersField =
                byId("travelers") ||
                $('[name="travelers"]', form);

            if (travelersField) {
                travelersField.value = selectedTrip.travelers;
            }

            const budgetField =
                byId("budget") ||
                $('[name="budget"]', form);

            if (budgetField) {
                budgetField.value = selectedTrip.budget;
            }

            renderItinerary(selectedTrip);
            updatePreview();
            return;
        }
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        const destination = getValue("destination");
        const startDate = getValue("startDate");
        const endDate = getValue("endDate");

        const style =
            getValue("travelStyle", "style") || "aventura";

        const travelers = Number(
            getValue("travelers", "personas")
        ) || 1;

        const budget = Number(
            getValue("budget", "presupuesto")
        ) || 0;

        if (!destination) {
            alert("Elige el destino de tu aventura.");
            return;
        }

        if (startDate && endDate && endDate < startDate) {
            alert("Revisa las fechas de tu viaje.");
            return;
        }

        const trip = normalizeTrip({
            id: String(Date.now()),
            destination,
            startDate,
            endDate,
            travelStyle: style,
            travelers,
            budget,
            createdAt: new Date().toISOString()
        });

        trip.itinerary = buildItinerary(trip);

        setData(STORAGE.lastTrip, trip);

        renderItinerary(trip);

        sessionStorage.removeItem("getaway_destination");
    });

    updatePreview();

    if (steps.length) {
        showStep(1);
    }
}

/* ===================== INFORMACIÓN DEL USUARIO ===================== */

function updateUserInterface() {
    const name = getUserName();
    const email = getUserEmail();

    [
        "userName",
        "profileName",
        "welcomeName",
        "accountName"
    ].forEach(id => {
        const element = byId(id);

        if (element) {
            element.textContent = name;
        }
    });

    [
        "userEmail",
        "profileEmail",
        "accountEmail"
    ].forEach(id => {
        const element = byId(id);

        if (element) {
            element.textContent =
                email === "invitada@getaway.local" ? "" : email;
        }
    });

    [
        "userAvatar",
        "profileAvatar",
        "avatarInitial"
    ].forEach(id => {
        const element = byId(id);

        if (element) {
            element.textContent = name.charAt(0).toUpperCase() || "V";
        }
    });
}

/* ===================== PERFIL ===================== */

function setupProfile() {
    updateUserInterface();

    const nameInput =
        byId("profileNameInput") ||
        byId("editName");

    const saveProfileButton =
        byId("saveProfileBtn") ||
        byId("saveProfile");

    saveProfileButton?.addEventListener("click", () => {
        const newName = nameInput?.value.trim();

        if (!newName) {
            alert("Escribe tu nombre.");
            return;
        }

        const session = getSession();

        if (!session) {
            alert("Inicia sesión para modificar tu perfil.");
            return;
        }

        session.name = newName;

        if (session.user) {
            session.user.name = newName;
        }

        setSession(session);

        const users = getData(STORAGE.users, []);
        const email = getUserEmail();

        const updatedUsers = users.map(user =>
            user.email.toLowerCase() === email
                ? { ...user, name: newName }
                : user
        );

        setData(STORAGE.users, updatedUsers);

        updateUserInterface();

        alert("Tu perfil se actualizó.");
    });

    refreshTripLists();
}

/* ===================== CONFIGURACIÓN ===================== */

function setupSettings() {
    const form =
        byId("settingsForm") ||
        byId("preferencesForm");

    if (!form) return;

    const preferences = getData(STORAGE.preferences, {});

    Object.entries(preferences).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);

        if (input) {
            if (input.type === "checkbox") {
                input.checked = Boolean(value);
            } else {
                input.value = value;
            }
        }
    });

    form.addEventListener("submit", event => {
        event.preventDefault();

        const updatedPreferences = {};

        form.querySelectorAll("input, select, textarea").forEach(input => {
            if (!input.name) return;

            updatedPreferences[input.name] =
                input.type === "checkbox"
                    ? input.checked
                    : input.value;
        });

        if (setData(STORAGE.preferences, updatedPreferences)) {
            alert("Tus preferencias se guardaron.");
        } else {
            alert("No se pudieron guardar tus preferencias.");
        }
    });
}

/* ===================== CERRAR SESIÓN ===================== */

function setupLogout() {
    const logoutButtons = $$(
        "#logoutBtn, #logout, [data-action='logout']"
    );

    logoutButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            if (!confirm("¿Quieres cerrar tu sesión?")) {
                return;
            }

            try {
                localStorage.removeItem(STORAGE.session);
                localStorage.removeItem(STORAGE.sessionBackup);
            } catch (error) {
                console.warn("No se pudo cerrar la sesión.", error);
            }

            window.location.href = "login.html";
        });
    });
}

/* ===================== BOTONES DE DESTINOS ===================== */

function setupGenericDestinationButtons() {
    $$("[data-destination]").forEach(button => {
        // Explorar ya administra los botones de su propia cuadrícula.
        if (button.closest("#destinationGrid")) return;

        button.addEventListener("click", () => {
            const destination = button.dataset.destination;

            if (!destination) return;

            sessionStorage.setItem(
                "getaway_destination",
                destination
            );

            window.location.href = "crear-viaje.html";
        });
    });
}

/* ===================== INICIALIZAR GET AWAY ===================== */

document.addEventListener("DOMContentLoaded", () => {
    setupRegister();
    setupLogin();
    setupPlanner();
    setupProfile();
    setupSettings();
    setupLogout();
    setupGenericDestinationButtons();

    updateUserInterface();
    refreshTripLists();
});