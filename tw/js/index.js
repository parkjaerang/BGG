// ── Popup ──────────────────────────────────────────────────────────────────
// TODO: [BACKEND] localStorage → GET /api/popups (팝업 목록 + 이미지 + 타이틀 한번에 가져오기)
// TODO: [BACKEND] localStorage → GET /api/popups（一次性获取弹窗列表+图片+标题）
function getPopupCount() {
    var raw = localStorage.getItem('bgg_popup_count');
    if (raw === null) return 0;   // 초기값(설정 없음): 기본 0개 // 初始值（无设置）：默认2个
    var c = parseInt(raw);
    return (isNaN(c) || c < 0) ? 0 : c;
}

var popupOrder = [];

function generatePopups() {
    var count = getPopupCount();
    var container = document.getElementById('popup_container');
    if (!container) return;
    var leftBase = 20;
    var leftGap  = 380;
    container.innerHTML = Array.from({ length: count }, function(_, i) {
        var k   = 'popup' + (i + 1);
        var pos = 'top: var(--header-h, 80px); left: ' + (leftBase + i * leftGap) + 'px;';
        return '<div id="' + k + '" class="popup_box" style="' + pos + '">' +
            '<div class="popup_header">' +
            '<h3 id="' + k + '_header_text">INPUT TITLE</h3>' +
            '<button class="popup_close" onclick="closePopup(\'' + k + '\')">✕</button>' +
            '</div>' +
            '<div class="popup_body">' +
            '<img src="../img/popup_image_default.png" alt="Promotion" style="width:100%;border-radius:6px;">' +
            '</div>' +
            '<div class="popup_footer">' +
            '<label><input type="checkbox" id="' + k + '_hide"> Do not show today</label>' +
            '</div>' +
            '</div>';
    }).join('');
    popupOrder = Array.from({ length: count }, function(_, i) { return 'popup' + (i + 1); });

    // 어드민 저장 이미지/제목 적용
    // 应用管理员保存的图片/标题
    popupOrder.forEach(function(id) {
        // TODO: [BACKEND] localStorage → 위에서 GET /api/popups 응답 데이터의 각 팝업 이미지 src 사용
        // TODO: [BACKEND] localStorage → 使用上方GET /api/popups响应数据中各弹窗的图片src
        var src = localStorage.getItem('bgg_' + id);
        if (src) {
            var box = document.getElementById(id);
            if (box) {
                var img = box.querySelector('.popup_body img');
                if (img) img.src = src;
            }
        }
        // TODO: [BACKEND] localStorage → GET /api/popups 응답 데이터의 각 팝업 헤더 텍스트 사용
        // TODO: [BACKEND] localStorage → 使用GET /api/popups响应数据中各弹窗的头部文字
        var headerText = localStorage.getItem('bgg_' + id + '_header');
        if (headerText) {
            var h3 = document.getElementById(id + '_header_text');
            if (h3) h3.textContent = headerText;
        }
    });
}

function isMobile() {
    return window.innerWidth <= 767;
}

function closePopup(id) {
    var checkbox = document.getElementById(id + '_hide');
    if (checkbox && checkbox.checked) {
        var expires = new Date();
        expires.setHours(23, 59, 59, 0);
        document.cookie = id + '_hide=1; expires=' + expires.toUTCString() + '; path=/';
    }
    var box = document.getElementById(id);
    if (box) box.classList.add('hidden');

    if (isMobile()) {
        var idx = popupOrder.indexOf(id);
        for (var i = idx + 1; i < popupOrder.length; i++) {
            var next = document.getElementById(popupOrder[i]);
            if (next && !next.classList.contains('hidden')) {
                break;
            }
            if (next && next.classList.contains('hidden')) {
                next.classList.remove('hidden');
                break;
            }
        }
    }
}

function getCookie(name) {
    return document.cookie.split(';').some(function(c) {
        return c.trim().startsWith(name + '=');
    });
}

window.addEventListener('DOMContentLoaded', function() {
    var header = document.querySelector('header');
    if (header) {
        var h = header.offsetHeight;
        document.documentElement.style.setProperty('--header-h', h + 'px');
    }

    // 팝업 DOM 생성 (DOMContentLoaded 이후)
    // 生成弹窗DOM（DOMContentLoaded之后）
    generatePopups();

    // 쿠키 기반 오늘 숨김 적용
    // 应用基于Cookie的今日隐藏
    popupOrder.forEach(function(k) {
        if (getCookie(k + '_hide')) {
            var el = document.getElementById(k);
            if (el) el.classList.add('hidden');
        }
    });

    // 모바일: 첫 팝업만 표시
    // 移动端：仅显示第一个弹窗
    if (isMobile()) {
        var shown = false;
        popupOrder.forEach(function(k) {
            var el = document.getElementById(k);
            if (!el) return;
            if (!shown && !el.classList.contains('hidden')) {
                shown = true;
            } else if (shown && !el.classList.contains('hidden')) {
                el.classList.add('hidden');
            }
        });
    }
});

// ── Index: Admin 데이터 연동 ────────────────────────────────────────────────
// ── Index: 与Admin数据联动 ────────────────────────────────────────────────
(function renderIndexSections() {
    // 파트너 병원 상위 4개
    // 合作医院前4名
    function renderPartners() {
        var wrap = document.querySelector('#partner .hospital_list_wrap');
        if (!wrap) return;
        // TODO: [BACKEND] localStorage → GET /api/hospitals (상위 4개만 가져올 경우 GET /api/hospitals?limit=4)
        // TODO: [BACKEND] localStorage → GET /api/hospitals（仅获取前4个时使用GET /api/hospitals?limit=4）
        var hospitals = [];
        try { hospitals = JSON.parse(localStorage.getItem('bgg_hospitals') || '[]'); } catch(e) {}
        if (!hospitals.length) {
            wrap.innerHTML = '<p class="empty_msg">There are no registered hospitals.</p>';
            return;
        }
        var top4 = hospitals.slice(0, 4);
        wrap.innerHTML = top4.map(function(h) {
            return renderPartnerHospitalCard(h, { imgPrefix: '../', viewPrefix: './' });
        }).join('');
    }

    // 프로모션 카드 상위 4개
    // 促销卡片前4名
    function renderPromos() {
        var grid = document.querySelector('#promotion .promo_grid_preview');
        if (!grid) return;
        var cards = [];
        var tags  = [];
        // TODO: [BACKEND] localStorage → GET /api/promotions?limit=4 (상위 4개만 가져올 경우 GET /api/promotions?limit=4)
        try { cards = JSON.parse(localStorage.getItem('bgg_promo_page_cards') || '[]'); } catch(e) {}
        // TODO: [BACKEND] localStorage → GET /api/promotion-tags
        try { tags  = JSON.parse(localStorage.getItem('bgg_promo_tags')        || '[]'); } catch(e) {}
        if (!cards.length) {
            grid.innerHTML = '<p class="empty_msg">There are no registered promotions.</p>';
            return;
        }
        var top4 = cards.slice(0, 4);
        grid.innerHTML = top4.map(function(c) {
            var tagLabel = c.cardTag;
            for (var i = 0; i < tags.length; i++) {
                if (tags[i].filter === c.cardTag) { tagLabel = tags[i].label; break; }
            }
            var badgeHtml = '';
            if (c.badge === 'HOT') badgeHtml = '<div class="card_badge badge_hot">HOT</div>';
            else if (c.badge === 'NEW') badgeHtml = '<div class="card_badge badge_new">NEW</div>';
            var imgSrc = c.img || '../img/popup_image_default.png';
            var viewLink = c.hospitalId ? './view.html?idx=' + c.hospitalId : '#';
            return '<article class="promo_card" data-category="' + c.cardTag + '">' +
                badgeHtml +
                '<div class="card_img"><a href="' + viewLink + '"><img src="' + imgSrc + '" alt="' + c.cardTitle + '"></a></div>' +
                '<div class="card_body">' +
                '<span class="card_tag">' + tagLabel + '</span>' +
                '<h3 class="card_title">' + c.cardTitle + '</h3>' +
                '<p class="card_desc">' + c.cardDesc + '</p>' +
                '<a href="./reservation.html" class="card_btn">Book Now</a>' +
                '</div>' +
                '</article>';
        }).join('');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            renderPartners();
            renderPromos();
        });
    } else {
        renderPartners();
        renderPromos();
    }
})();

// ── Main ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');

    // 헤더 높이를 CSS 변수로 설정
    // 将头部高度设置为CSS变量
    function updateHeaderHeight() {
        if (header) {
            document.documentElement.style.setProperty(
                '--header-height',
                header.offsetHeight + 'px'
            );
        }
    }
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    (function () {
        const slides = document.querySelectorAll('.hero_slide');
        const dots = document.querySelectorAll('.hero_dot');
        const overlayH2 = document.querySelector('.hero_overlay h2');
        const overlayP = document.querySelector('.hero_overlay p');
        let current = 0;

        const slideTexts = [
            { h2: 'Beauty Glow Goddess', p: 'At BGG (Beauty Glow Goddess), we provide a seamless beauty and medical experience tailored for international clients. <br>From private pickup service and professional interpretation support to exclusive welcome kits, <br>every detail is designed for your comfort and confidence.' },
            { h2: 'Pickup Service', p: 'Airport / Hotel / Home pickup service available. <br>We provide safe and convenient transportation directly to the clinic.' },
            { h2: 'Interpretation Service', p: 'Medical interpretation service is available for international patients.' },
            { h2: 'Welcome Kit', p: 'International patients using our interpretation service will receive a complimentary welcome kit.' }
        ];

        function updateOverlay(index) {
            if (!overlayH2 || !overlayP) return;
            const t = slideTexts[index] || { h2: '', p: '' };
            overlayH2.textContent = t.h2;
            overlayP.innerHTML = t.p;
        }

        updateOverlay(0);

        function goTo(index) {
            const prevIndex = current;
            current = (index + slides.length) % slides.length;
            if (prevIndex === current) return;

            // 새 슬라이드를 항상 오른쪽 대기 위치로 순간 이동 (transition 없이)
            // 将新幻灯片瞬间移至右侧等待位置（无过渡动画）
            slides[current].style.transition = 'none';
            slides[current].style.transform = 'translateX(100%)';
            void slides[current].offsetWidth; // reflow

            // 이전 슬라이드: 왼쪽으로 밀려나가도록 설정
            // 上一张幻灯片：设置为向左滑出
            slides[prevIndex].style.transition = '';
            slides[prevIndex].style.transform = 'translateX(-100%)';
            slides[prevIndex].classList.remove('active');

            // 새 슬라이드: transition 복원 후 오른쪽에서 왼쪽으로 흘러들어오기
            // 新幻灯片：恢复过渡动画后从右向左滑入
            slides[current].style.transition = '';
            slides[current].style.transform = '';
            slides[current].classList.add('active');

            dots[prevIndex].classList.remove('active');
            dots[current].classList.add('active');

            updateOverlay(current);

            // 전환 완료 후 이전 슬라이드 정리
            // 过渡完成后清理上一张幻灯片
            slides[current].addEventListener('transitionend', function cleanup() {
                slides[prevIndex].style.transition = 'none';
                slides[prevIndex].style.transform = '';
                void slides[prevIndex].offsetWidth; // reflow
                slides[prevIndex].style.transition = '';
                slides[current].removeEventListener('transitionend', cleanup);
            });
        }

        dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
        setInterval(() => goTo(current + 1), 3000);
    })();

    // flow_steps 순차 애니메이션
    // flow_steps 顺序动画
    const flowSection = document.querySelector('.flow_steps');
    if (flowSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const items = flowSection.querySelectorAll('.flow_step, .flow_arrow');
                    items.forEach((el, i) => {
                        setTimeout(() => el.classList.add('visible'), i * 200);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });
        observer.observe(flowSection);
    }
});
