// =================================================================
//  CÓDIGO FINAL Y CORRECTO PARA SCRIPT.JS
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // <-- CORRECCIÓN APLICADA AQUÍ

// CONFIGURACIÓN DE FIREBASE (Asegúrate de que tus datos están aquí)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbzNWEqqF3Qe6d_-meH34rYoKKe8KoUZk",
  authDomain: "fear-heights-2.firebaseapp.com",
  projectId: "fear-heights-2",
  storageBucket: "fear-heights-2.firebasestorage.app",
  messagingSenderId: "553481001760",
  appId: "1:553481001760:web:ac564662c1ad4d891f5545",
  measurementId: "G-S0PJF08Z39"
};

// INICIALIZACIÓN DE SERVICIOS
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// VARIABLES GLOBALES
let map;
let geocoder;
let marker;
let selectedRating = null;
let currentUser = null;
let currentLocation = null;

// LÓGICA DE GOOGLE MAPS
function initMap() {
    const initialLocation = { lat: 40.416775, lng: -3.703790 };
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

document.getElementById('search-button').addEventListener('click', () => {
    const address = document.getElementById('search-input').value;
    if (!address) return;
    geocoder.geocode({ 'address': address }, (results, status) => {
        if (status === 'OK') {
            const place = results[0];
            map.setCenter(place.geometry.location);
            marker.setPosition(place.geometry.location);
            currentLocation = {
                placeId: place.place_id,
                name: place.formatted_address,
            };
            document.getElementById('location-details').classList.remove('hidden');
            document.getElementById('location-name').innerText = currentLocation.name;
            loadRatingsForLocation(currentLocation.placeId);
        } else {
            alert('La búsqueda no tuvo éxito: ' + status);
        }
    });
});

// LÓGICA DE AUTENTICACIÓN
onAuthStateChanged(auth, (user) => {
    const userAuthDiv = document.getElementById('user-auth');
    const userRatingSection = document.getElementById('user-rating-section');
    if (user) {
        currentUser = user;
        userAuthDiv.innerHTML = `
            <div class="user-info">
                <span>Hola, ${user.displayName.split(' ')[0]}</span>
            </div>
            <button id="logout-button">Cerrar Sesión</button>
        `;
        if (currentLocation) userRatingSection.classList.remove('hidden');
        document.getElementById('logout-button').addEventListener('click', () => signOut(auth));
    } else {
        currentUser = null;
        userAuthDiv.innerHTML = `<button id="login-button">Login with Google</button>`;
        userRatingSection.classList.add('hidden');
        const loginButton = document.getElementById('login-button');
        if(loginButton) {
            loginButton.addEventListener('click', () => {
                signInWithPopup(auth, provider).catch((error) => console.error("Error en login:", error));
            });
        }
    }
});

// LÓGICA DE VALORACIONES
document.querySelectorAll('.rating-option').forEach(option => {
    option.addEventListener('click', (e) => {
        document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedRating = e.currentTarget.dataset.value;
    });
});

document.getElementById('submit-review').addEventListener('click', async () => {
    if (!currentUser) return alert("Necesitas iniciar sesión.");
    if (selectedRating === null) return alert("Por favor, selecciona una valoración.");
    if (!currentLocation) return alert("No se ha seleccionado ningún lugar.");
    const commentText = document.getElementById('comment-input').value;
    const reviewId = `${currentUser.uid}_${currentLocation.placeId}`;
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
        await setDoc(doc(db, "reviews", reviewId), reviewData);
        alert("¡Gracias por tu valoración!");
        loadRatingsForLocation(currentLocation.placeId);
    } catch (error) {
        console.error("Error al guardar la valoración: ", error);
    }
});

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
    let totalRating = 0, reviewsCount = 0;
    commentsListDiv.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const review = doc.data();
        reviewsCount++;
        totalRating += review.rating;
        const reviewElement = document.createElement('div');
        reviewElement.classList.add('comment');
        reviewElement.innerHTML = `<strong>${review.userName}</strong>: ${review.rating}/4 <p>${review.comment || ''}</p>`;
        commentsListDiv.appendChild(reviewElement);
    });
    const average = (totalRating / reviewsCount).toFixed(1);
    averageRatingP.innerText = `Valoración media: ${average} / 4 (${reviewsCount} valoraciones)`;
}
// Llamamos a la función para inicializar el mapa nosotros mismos
initMap();