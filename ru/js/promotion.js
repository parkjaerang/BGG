/* =====================================================
   promotion.js – 동적 필터 탭 + 프로모션 카드 렌더
   promotion.js – 动态筛选标签 + 促销卡片渲染
   ===================================================== */

const DEFAULT_PROMO_TAGS = [];

const DEFAULT_PROMO_PAGE_CARDS = [];

// TODO: [BACKEND] localStorage → GET /api/promotion-tags
function getPromoTags() {
    var raw = localStorage.getItem('bgg_promo_tags');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return DEFAULT_PROMO_TAGS;
}

// TODO: [BACKEND] localStorage → GET /api/promotions
// TODO: [BACKEND] localStorage → 替换为GET /api/promotions
// 필터링은 클라이언트에서 처리하거나 GET /api/promotions?tag=FILTER 로 서버에서 처리
// 筛选在客户端处理，或由服务器通过GET /api/promotions?tag=FILTER处理
function getPromoPageCards() {
    var raw = localStorage.getItem('bgg_promo_page_cards');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return DEFAULT_PROMO_PAGE_CARDS;
}

document.addEventListener('DOMContentLoaded', function () {
    var tags  = getPromoTags();
    var cards = getPromoPageCards();
    var hospitals = getHospitals();

    /* ── 필터 탭 렌더 ── */
    /* ── 筛选标签渲染 ── */
    var filterTabs = document.getElementById('filter_tabs');
    if (filterTabs) {
        var allBtn = '<button class="tab_btn active" data-filter="all">All</button>';
        var tagBtns = tags.map(function(t) {
            return '<button class="tab_btn" data-filter="' + t.filter + '">' + t.label + '</button>';
        }).join('');
        filterTabs.innerHTML = allBtn + tagBtns;
    }

    /* ── 카드 렌더 ── */
    /* ── 卡片渲染 ── */
    var grid = document.getElementById('promo_grid');
    if (grid) {
        if (cards.length === 0) {
            grid.innerHTML = '<p class="empty_msg">There are no registered promotions.</p>';
        } else
        grid.innerHTML = cards.map(function(c) {
            var hospital = hospitals.find(function(h) { return h.id === c.hospitalId; });
            var viewHref = hospital ? './view.html?idx=' + hospital.id : '#';
            var imgSrc   = c.img || '../img/9hbto5kf57k33vd0.png';
            var badgeHtml = '';
            if (c.badge === 'HOT') badgeHtml = '<div class="card_badge badge_hot">HOT</div>';
            else if (c.badge === 'NEW') badgeHtml = '<div class="card_badge badge_new">NEW</div>';
            return '<article class="promo_card" data-category="' + (c.cardTag || '') + '">' +
                badgeHtml +
                '<div class="card_img"><a href="' + viewHref + '"><img src="' + imgSrc + '" alt="' + (c.cardTitle || '') + '"></a></div>' +
                '<div class="card_body">' +
                '<span class="card_tag">' + (c.cardTag || '') + '</span>' +
                '<h3 class="card_title">' + (c.cardTitle || '') + '</h3>' +
                '<p class="card_desc">' + (c.cardDesc || '') + '</p>' +
                '<a href="../html/reservation.html" class="card_btn">Book Now</a>' +
                '</div></article>';
        }).join('');
    }

    /* ── 필터 로직 ── */
    /* ── 筛选逻辑 ── */
    function initFilter() {
        var tabBtns  = document.querySelectorAll('.tab_btn');
        var cardEls  = document.querySelectorAll('.promo_card');

        var allTab = document.querySelector('.tab_btn[data-filter="all"]');
        if (allTab) {
            allTab.classList.add('active');
            cardEls.forEach(function(card) {
                card.style.display = '';
                setTimeout(function() { card.classList.add('visible'); }, 10);
            });
        }

        tabBtns.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tabBtns.forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                var filter = tab.dataset.filter;
                cardEls.forEach(function(card) { card.classList.remove('visible'); });
                setTimeout(function() {
                    cardEls.forEach(function(card) {
                        if (filter === 'all' || card.dataset.category === filter) {
                            card.style.display = '';
                            setTimeout(function() { card.classList.add('visible'); }, 10);
                        } else {
                            card.style.display = 'none';
                        }
                    });
                }, 300);
            });
        });
    }

    initFilter();
});
