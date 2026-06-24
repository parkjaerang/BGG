// ── Google Maps API 초기화 (review.html의 callback으로 호출됨) ──
// ── Google Maps API初始化（作为review.html的callback调用） ──
let placesService = null;

function initGoogleMaps() {
    // PlacesService는 지도 div 또는 지도 객체가 필요 (숨겨진 div 활용)
    // PlacesService需要地图div或地图对象（利用隐藏的div）
    const dummyDiv = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyDiv);

    // 이미 병원이 선택돼 있으면 바로 로드
    // 若已选择医院则直接加载
    const hidden = document.getElementById('viewHospitalSelect');
    if (hidden && hidden.value) loadGoogleReviews(hidden.value);
}

function renderViewHospitals() {
    const items = [
        { value: '', label: 'Select a Hospital' },
        ...getHospitals().map(h => ({ value: h.name, label: h.name })),
    ];
    createSearchableSelect('viewHospitalSelectWrap', 'viewHospitalSelect', items, {
        placeholder: 'Select a Hospital',
        onChange: onViewHospitalChange,
    });
}

function onViewHospitalChange(hospital) {
    const box = document.getElementById('google_review_box');

    if (!hospital) {
        box.innerHTML = '<p class="google_review_placeholder">Select a hospital to view Google reviews.</p>';
        return;
    }

    box.innerHTML = '<p class="google_review_loading">Loading Google reviews...</p>';

    if (!placesService) {
        box.innerHTML = '<p class="google_review_placeholder">Google Maps API has not been loaded yet. Please try again in a moment.</p>';
        return;
    }

    loadGoogleReviews(hospital);
}

function loadGoogleReviews(hospitalName) {
    const box = document.getElementById('google_review_box');
    const placeId = HOSPITAL_PLACE_IDS[hospitalName];

    if (!placeId || placeId.startsWith('PLACE_ID_HERE')) {
        box.innerHTML = '<p class="google_review_placeholder">A Place ID has not been configured for this hospital yet.</p>';
        return;
    }

    placesService.getDetails(
        {
            placeId: placeId,
            fields: ['name', 'rating', 'user_ratings_total', 'reviews', 'url'],
        },
        (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                box.innerHTML = '<p class="google_review_placeholder">Unable to load reviews. Please verify the Place ID.</p>';
                return;
            }
            renderGoogleReviews(place);
        }
    );
}

function renderGoogleReviews(place) {
    const box = document.getElementById('google_review_box');
    const reviews = place.reviews || [];

    const headerHtml = `
        <div class="gr_header">
            <img src="https://www.google.com/favicon.ico" class="gr_google_icon" alt="Google">
            <span class="gr_place_name">${escapeHtml(place.name)}</span>
            <span class="gr_overall_rating">★ ${place.rating ?? '-'}</span>
            <span class="gr_rating_count">(${place.user_ratings_total ?? 0}개 리뷰)</span>
            ${place.url ? `<a class="gr_map_link" href="${place.url}" target="_blank" rel="noopener">View on Google Maps</a>` : ''}
        </div>
    `;

    if (reviews.length === 0) {
        box.innerHTML = headerHtml + '<p class="google_review_placeholder">No reviews to display.</p>';
        return;
    }

    const cardsHtml = reviews.map(r => `
        <div class="gr_card">
            <div class="gr_card_top">
                <img class="gr_avatar" src="${r.profile_photo_url}" alt="${escapeHtml(r.author_name)}" onerror="this.src='https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png'">
                <div class="gr_author_info">
                    <a class="gr_author_name" href="${r.author_url}" target="_blank" rel="noopener">${escapeHtml(r.author_name)}</a>
                    <div class="gr_stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                </div>
                <span class="gr_time">${r.relative_time_description}</span>
            </div>
            <p class="gr_text">${escapeHtml(r.text)}</p>
        </div>
    `).join('');

    box.innerHTML = headerHtml + `<div class="gr_cards">${cardsHtml}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderViewHospitals();
});

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}