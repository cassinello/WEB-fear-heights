let map;
let marker;
let selectedRating = null;

// This function is called by the Google Maps script tag
function initMap() {
    const initialLocation = { lat: 40.416775, lng: -3.703790 }; // Madrid
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: initialLocation
    });
    marker = new google.maps.Marker({
        position: initialLocation,
        map: map,
    });
}

document.getElementById('search-button').addEventListener('click', () => {
    const address = document.getElementById('search-input').value;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': address }, (results, status) => {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
            marker.setPosition(results[0].geometry.location);
            
            document.getElementById('location-name').innerText = results[0].formatted_address;
            document.getElementById('location-details').classList.remove('hidden');

            // TODO: Here you would fetch existing ratings for this location from your backend
            // For now, we'll just show the sections
            // Example: fetchRatings(results[0].place_id);

            // Mock login check
            const isLoggedIn = true; // Replace with actual Google Auth check
            if (isLoggedIn) {
                document.getElementById('user-rating-section').classList.remove('hidden');
            }

        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
});

// Handle rating selection
document.querySelectorAll('.rating-option').forEach(option => {
    option.addEventListener('click', (e) => {
        // Remove previous selection
        document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
        // Add new selection
        e.target.classList.add('selected');
        selectedRating = e.target.dataset.value;
    });
});


document.getElementById('submit-review').addEventListener('click', () => {
    const comment = document.getElementById('comment-input').value;

    if (selectedRating === null) {
        alert('Please select a rating!');
        return;
    }

    if (comment.trim() === "") {
        alert('Please leave a comment!');
        return;
    }

    // TODO: Here you would send the data to your backend
    // Example: saveReview(locationId, selectedRating, comment);

    console.log({
        rating: selectedRating,
        comment: comment
    });

    alert('Thank you for your review!');
    // Clear form
    document.getElementById('comment-input').value = "";
    document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
    selectedRating = null;
});


// Mock function to display comments (this data would come from your backend)
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = ''; // Clear existing comments
    comments.forEach(c => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        commentDiv.innerHTML = `
            <p><strong>${c.user}</strong> rated it: <strong>${c.rating}/4</strong></p>
            <p>${c.text}</p>
        `;
        commentsList.appendChild(commentDiv);
    });
}

// Example usage:
const mockComments = [
    { user: 'BraveTraveler123', rating: 2, text: 'The view from the Eiffel Tower\'s second floor was amazing! I stayed behind the glass, but it was manageable.'},
    { user: 'CautiousExplorer', rating: 3, text: 'The Carrick-a-Rede Rope Bridge was terrifying. Definitely a 3, maybe even a 4 for me. My friends loved it, though.'}
];

// We would call this after fetching location data.
// For the demo, we call it right away.
displayComments(mockComments);