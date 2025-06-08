// =================================================================
//  IMPORTS DE FIREBASE (NO TOCAR)
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// =================================================================
//  CONFIGURACIÓN DE FIREBASE
// =================================================================
// TODO: REEMPLAZA ESTO CON LA CONFIGURACIÓN DE TU PROPIO PROYECTO DE FIREBASE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApdeGseVldr23PBlU5utTprKEJG5U89j4",
  authDomain: "fear-heights.firebaseapp.com",
  projectId: "fear-heights",
  storageBucket: "fear-heights.firebasestorage.app",
  messagingSenderId: "423925382602",
  appId: "1:423925382602:web:73e9ec5694d926052de333",
  measurementId: "G-M53B0RYRSS"
};


// =================================================================
//  INICIALIZACIÓN DE SERVICIOS (NO TOCAR)
// =================================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


// =================================================================
//  VARIABLES GLOBALES
// =================================================================
let map;
let geocoder;
let marker;
let selectedRating = null; // Guardará la valoración del usuario (0-4)
let currentUser = null; // Guardará la información del usuario logueado
let currentLocation = null; // Guardará la info del lugar buscado


// =================================================================
//  LÓGICA DE GOOGLE MAPS
// =================================================================
// Esta función es llamada por la API de Google Maps cuando está lista.
// NO la llames directamente.
window.initMap = function() {
    const initialLocation = { lat: 40.416775, lng: -3.703790 }; // Madrid por defecto
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 5,
        center: initialLocation,
    });
    geocoder = new google.maps.Geocoder();
    marker = new google.maps.Marker({
        position: initialLocation,
        map: map,
    });
}

// Evento para el botón de búsqueda
document.getElementById('search-button').addEventListener('click', () => {
    const address = document.getElementById('search-input').value;
    if (!address) return;

    geocoder.geocode({ 'address': address }, (results, status) => {
        if (status === 'OK') {
            const place = results[0];
            map.setCenter(place.geometry.location);
            marker.setPosition(place.geometry.location);
            
            // Guardamos la información del lugar actual
            currentLocation = {
                placeId: place.place_id,
                name: place.formatted_address,
            };

            // Mostramos los detalles y cargamos las valoraciones desde Firestore
            document.getElementById('location-details').classList.remove('hidden');
            document.getElementById('location-name').innerText = currentLocation.name;
            loadRatingsForLocation(currentLocation.placeId);

        } else {
            alert('La búsqueda no tuvo éxito por el siguiente motivo: ' + status);
        }
    });
});


// =================================================================
//  LÓGICA DE AUTENTICACIÓN (LOGIN / LOGOUT)
// =================================================================
// Esta es la función principal que se encarga de actualizar la interfaz
// dependiendo de si el usuario está conectado o no.
onAuthStateChanged(auth, (user) => {
    const userAuthDiv = document.getElementById('user-auth');
    const userRatingSection = document.getElementById('user-rating-section');

    if (user) {
        // El usuario está conectado
        currentUser = user; // Guardamos el usuario actual
        userAuthDiv.innerHTML = `
            <div class="user-info">
                <img src="${user.photoURL}" alt="${user.displayName}" class="user-photo">
                <span>Hola, ${user.displayName.split(' ')[0]}</span>
            </div>
            <button id="logout-button">Cerrar Sesión</button>
        `;
        // Mostramos la sección para dejar valoraciones si hay un lugar seleccionado
        if (currentLocation) {
            userRatingSection.classList.remove('hidden');
        }
        document.getElementById('logout-button').addEventListener('click', () => signOut(auth));
    } else {
        // El usuario no está conectado
        currentUser = null;
        userAuthDiv.innerHTML = `<button id="login-button">Login with Google</button>`;
        userRatingSection.classList.add('hidden'); // Ocultamos la sección de valorar
        
        document.getElementById('login-button').addEventListener('click', () => {
            signInWithPopup(auth, provider).catch((error) => console.error("Error en login:", error));
        });
    }
});


// =================================================================
//  LÓGICA DE VALORACIONES (RATINGS) Y COMENTARIOS
// =================================================================
// Evento para seleccionar una de las opciones de valoración
document.querySelectorAll('.rating-option').forEach(option => {
    option.addEventListener('click', (e) => {
        document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedRating = e.currentTarget.dataset.value;
    });
});

// Evento para el botón de enviar valoración
document.getElementById('submit-review').addEventListener('click', async () => {
    if (!currentUser) {
        alert("Necesitas iniciar sesión para dejar una valoración.");
        return;
    }
    if (selectedRating === null) {
        alert("Por favor, selecciona una valoración.");
        return;
    }
    if (!currentLocation) {
        alert("No se ha seleccionado ningún lugar para valorar.");
        return;
    }

    const commentText = document.getElementById('comment-input').value;
    const reviewId = `${currentUser.uid}_${currentLocation.placeId}`; // ID único por usuario y lugar

    const reviewData = {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhoto: currentUser.photoURL,
        placeId: currentLocation.placeId,
        placeName: currentLocation.name,
        rating: parseInt(selectedRating, 10),
        comment: commentText,
        createdAt: Timestamp.now()
    };
    
    try {
        // Guardamos la valoración en Firestore
        await setDoc(doc(db, "reviews", reviewId), reviewData);
        alert("¡Gracias por tu valoración!");
        
        // Limpiamos el formulario y recargamos las valoraciones
        document.getElementById('comment-input').value = "";
        document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
        selectedRating = null;
        loadRatingsForLocation(currentLocation.placeId);

    } catch (error) {
        console.error("Error al guardar la valoración: ", error);
        alert("Hubo un error al guardar tu valoración. Inténtalo de nuevo.");
    }
});


// Función para cargar las valoraciones de un lugar desde Firestore
async function loadRatingsForLocation(placeId) {
    const commentsListDiv = document.getElementById('comments-list');
    const averageRatingP = document.getElementById('average-rating');
    
    commentsListDiv.innerHTML = '<p>Cargando valoraciones...</p>';
    
    const q = query(collection(db, "reviews"), where("placeId", "==", placeId));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        commentsListDiv.innerHTML = '<p>Nadie ha valorado este lugar todavía. ¡Sé el primero!</p>';
        averageRatingP.innerText = "Sin valorar";
        return;
    }

    let totalRating = 0;
    let reviewsCount = 0;
    commentsListDiv.innerHTML = ''; // Limpiamos el div

    querySnapshot.forEach((doc) => {
        const review = doc.data();
        reviewsCount++;
        totalRating += review.rating;

        const reviewElement = document.createElement('div');
        reviewElement.classList.add('comment');
        reviewElement.innerHTML = `
            <div class="comment-header">
                <img src="${review.userPhoto}" alt="${review.userName}" class="user-photo-comment">
                <strong>${review.userName}</strong>
                <span class="comment-rating">Valoración: ${review.rating}/4</span>
            </div>
            <p class="comment-text">${review.comment || '<i>Sin comentario.</i>'}</p>
        `;
        commentsListDiv.appendChild(reviewElement);
    });

    const average = (totalRating / reviewsCount).toFixed(1);
    averageRatingP.innerText = `Valoración media: ${average} / 4 (basado en ${reviewsCount} valoraciones)`;
}