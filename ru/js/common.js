/* ── RU 네임스페이스: bgg_ 데이터 키를 ru_bgg_ 로 격리 ── */
(function () {
    const NS = 'ru_';
    const SKIP = ['bgg_admin_auth', 'siteLang'];
    function ns(k) { return k.startsWith('bgg_') && !SKIP.includes(k) ? NS + k : k; }
    const _set = Storage.prototype.setItem;
    const _get = Storage.prototype.getItem;
    const _rem = Storage.prototype.removeItem;
    Storage.prototype.setItem    = function (k, v) { return _set.call(this, ns(k), v); };
    Storage.prototype.getItem    = function (k)    { return _get.call(this, ns(k)); };
    Storage.prototype.removeItem = function (k)    { return _rem.call(this, ns(k)); };
})();

const HOSPITALS = [];

/*const HOSPITAL_PLACE_IDS = {
    "강남 연세의원": "ChIJ...",
    "로바에의원": "ChIJA_lFoh-ZfDURUOl1oxeQGIw",
    // 병원명은 bgg_hospitals에 등록된 이름과 정확히 일치해야 함
    //https://developers.google.com/maps/documentation/places/web-service/place-id?hl=ko
};*/

// admin에서 등록한 병원명을 HOSPITALS 배열에 자동으로 채움
// 将admin中注册的医院名称自动填入HOSPITALS数组
(function () {
    // TODO: [BACKEND] localStorage → GET /api/hospitals 로 교체
    // TODO: [BACKEND] localStorage → 替换为GET /api/hospitals
    // 현재: localStorage에서 병원 목록을 읽어 HOSPITALS 배열에 채움
    // 当前：从localStorage读取医院列表并填入HOSPITALS数组
    var raw = localStorage.getItem('bgg_hospitals');
    if (raw) {
        try { JSON.parse(raw).forEach(function (h) { HOSPITALS.push(h.name); }); } catch (e) {}
    }
})();

/* ── 동적 파트너 병원 목록 ──
   'bgg_hospitals' = [{id, name, img, tag}, ...]
   없으면 HOSPITALS 배열로 초기 시드 생성
*/
/* ── 动态合作医院列表 ──
   'bgg_hospitals' = [{id, name, img, tag}, ...]
   若无数据则用HOSPITALS数组生成初始种子
*/  
// TODO: [BACKEND] 이 함수 전체를 GET /api/hospitals 비동기 호출로 교체
// TODO: [BACKEND] 将此函数整体替换为GET /api/hospitals异步调用
// 현재: localStorage.getItem('bgg_hospitals') → 교체 후: fetch('/api/hospitals').then(r => r.json())
// 当前：localStorage.getItem('bgg_hospitals') → 替换后：fetch('/api/hospitals').then(r => r.json())
// 주의: 이 함수를 호출하는 모든 곳(partner.js, reservation.js, view.js, index.js 등)도 async/await로 변경 필요
// 注意：所有调用此函数的地方（partner.js, reservation.js, view.js, index.js等）也需改为async/await
function getHospitals() {
    var raw = localStorage.getItem('bgg_hospitals');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    // 최초 방문: 기본 HOSPITALS 배열로 시드 생성
    // 首次访问：用默认HOSPITALS数组生成种子数据
    var seed = HOSPITALS.map(function(name, i) {
        return { id: i + 1, name: name, img: '', tag: '', rating: '', logo: '', region: '' };
    });
    localStorage.setItem('bgg_hospitals', JSON.stringify(seed));
    return seed;
}

var DEFAULT_PARTNER_REGIONS = [
    { id: 1, name: '강남' },
    { id: 2, name: '홍대' },
    { id: 3, name: '성수' },
    { id: 4, name: '명동' }
];

var PARTNER_REGION_RU_LABELS = {
    1: 'Каннам',
    2: 'Хондэ',
    3: 'Сонсу',
    4: 'Мёндон'
};

function getPartnerRegionLabel(region) {
    return PARTNER_REGION_RU_LABELS[region.id] || region.name;
}

function getPartnerRegions() {
    var raw = localStorage.getItem('bgg_partner_regions');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    localStorage.setItem('bgg_partner_regions', JSON.stringify(DEFAULT_PARTNER_REGIONS));
    return DEFAULT_PARTNER_REGIONS.slice();
}

/* 동적 병원 목록으로 HOSPITAL_CONFIG에 없는 병원에 대한 기본 config 반환 */
/* 对动态医院列表中HOSPITAL_CONFIG里没有的医院返回默认config */
// TODO: [BACKEND] GET /api/hospitals/:id/config 로 교체
// TODO: [BACKEND] 替换为GET /api/hospitals/:id/config
// 현재: localStorage.getItem('bgg_hconfig_' + hospitalId)
// 当前：localStorage.getItem('bgg_hconfig_' + hospitalId)
function getHospitalConfig(hospitalId) {
    var stored = localStorage.getItem('bgg_hconfig_' + hospitalId);
    if (stored) { try { return JSON.parse(stored); } catch(e) {} }
    return {
        closedDays: [],
        times: [
            '09:00','09:30','10:00','10:30','11:00','11:30',
            '12:00','12:30','13:00','13:30','14:00','14:30',
            '15:00','15:30','16:00','16:30','17:00','17:30',
            '18:00','18:30','19:00','19:30','20:00','20:30',
        ],
    };
}

/*
 * 병원별 예약 설정 (HOSPITALS 배열과 동일한 순서의 배열) //各医院预约设置（与 HOSPITALS 排列相同的顺序排列）
 * idx 0 → HOSPITALS[0], idx 1 → HOSPITALS[1], ...
 * closedDays: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 //0=周日、1=周一、2=周二、3=周三、4=周四、5=周五、6=周六
 * times: 예약 가능 시간대 //可预约时段
 */

const HOSPITAL_CONFIG = [];
// 병원별 예약 설정을 담는 배열
// 存储各医院预约设置的数组

function buildMapEmbedUrl(address) {
    var q = String(address || '').trim();
    if (!q) return '';
    return 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&hl=ko&z=17&output=embed';
}

function renderHospitalRating(rating) {
    var value = parseFloat(rating);
    if (!rating || isNaN(value) || value <= 0) return '';
    value = Math.min(5, Math.max(0, value));
    return '<span class="hospital_rating" aria-label="Google rating ' + value.toFixed(1) + '">' +
        '<i class="fa-solid fa-star hospital_rating_icon"></i>' + value.toFixed(1) + '</span>';
}

function renderPartnerHospitalCard(hospital, options) {
    options = options || {};
    var imgPrefix = options.imgPrefix || './';
    var viewPrefix = options.viewPrefix || './';
    var name = hospital.name || '';
    var ratingHtml = renderHospitalRating(hospital.rating);
    var logoHtml = '<span class="hospital_logo_wrap' + (hospital.logo ? '' : ' is_empty') + '">' +
        (hospital.logo ? '<img src="' + hospital.logo + '" alt="" class="hospital_logo">' : '') +
        '</span>';
    var viewHref = viewPrefix + 'view.html?idx=' + hospital.id;
    var imgContent = hospital.img
        ? '<img src="' + hospital.img + '" alt="' + name + '">'
        : '<div class="hospital_img_placeholder">Hospital Image</div>';

    return '<article class="hospital_info">' +
        '<a href="' + viewHref + '" class="hospital_img_link">' +
        imgContent +
        '</a>' +
        '<div class="hospital_meta">' +
        '<div class="hospital_title_row">' +
        '<div class="hospital_title_main">' +
        logoHtml +
        '<span class="hospital_name">' + name + '</span>' +
        '</div>' +
        ratingHtml +
        '</div>' +
        '</div></article>';
}

/**
 * 검색 가능한 커스텀 드롭다운 생성
 * 创建可搜索定制下拉
 * @param {string} wrapId     - 드롭다운을 렌더링할 컨테이너 id //要渲染下拉器的容器id
 * @param {string} hiddenId   - 값을 저장할 hidden input의 id //保存值的 hidden input 的 id
 * @param {Array}  items      - string[] 또는 {value, label}[] 형태 //string[] 或 {value, label}[] 形态
 * @param {object} opts       - { placeholder, hiddenName }
 */
function createSearchableSelect(wrapId, hiddenId, items, { placeholder = 'Select...', hiddenName = '', onChange = null } = {}) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    const options = items.map(item =>
        typeof item === 'string' ? { value: item, label: item } : item
    );

    wrap.innerHTML = `
        <div class="ss-wrap" data-placeholder="${placeholder}">
            <button type="button" class="ss-trigger">
                <span class="ss-label ss-placeholder">${placeholder}</span>
                <span class="ss-arrow">▾</span>
            </button>
            <div class="ss-panel" hidden>
                <input type="text" class="ss-search" placeholder="Search...">
                <ul class="ss-list"></ul>
            </div>
            <input type="hidden" id="${hiddenId}"${hiddenName ? ` name="${hiddenName}"` : ''} value="">
        </div>`;

    const ssWrap  = wrap.querySelector('.ss-wrap');
    const trigger = ssWrap.querySelector('.ss-trigger');
    const labelEl = ssWrap.querySelector('.ss-label');
    const panel   = ssWrap.querySelector('.ss-panel');
    const search  = ssWrap.querySelector('.ss-search');
    const list    = ssWrap.querySelector('.ss-list');
    const hidden  = ssWrap.querySelector('input[type="hidden"]');

    function renderList(query) {
        const q = (query || '').toLowerCase();
        list.innerHTML = '';
        options.forEach(opt => {
            if (q && !opt.label.toLowerCase().includes(q)) return;
            const li = document.createElement('li');
            li.dataset.value = opt.value;
            li.textContent = opt.label;
            if (opt.value === hidden.value) li.classList.add('ss-selected');
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                hidden.value = opt.value;
                labelEl.textContent = opt.value ? opt.label : placeholder;
                labelEl.classList.toggle('ss-placeholder', !opt.value);
                closePanel();
                hidden.dispatchEvent(new Event('change', { bubbles: true }));
                if (onChange) onChange(opt.value);
            });
            list.appendChild(li);
        });
    }

    function openPanel() {
        panel.removeAttribute('hidden');
        search.value = '';
        renderList('');
        search.focus();
        ssWrap.classList.add('ss-open');
    }

    function closePanel() {
        panel.setAttribute('hidden', '');
        ssWrap.classList.remove('ss-open');
    }

    trigger.addEventListener('click', () =>
        panel.hasAttribute('hidden') ? openPanel() : closePanel()
    );
    search.addEventListener('input', () => renderList(search.value));

    document.addEventListener('click', e => {
        if (!ssWrap.contains(e.target)) closePanel();
    }, true);
}

/** hidden input 값을 초기화하고 드롭다운 표시를 placeholder로 되돌림 */
/** 重置hidden input的值，并将下拉框显示恢复为placeholder */
function resetSearchableSelect(hiddenId) {
    const hidden = document.getElementById(hiddenId);
    if (!hidden) return;
    const ssWrap = hidden.closest('.ss-wrap');
    if (!ssWrap) return;
    hidden.value = '';
    const labelEl = ssWrap.querySelector('.ss-label');
    if (labelEl) {
        labelEl.textContent = ssWrap.dataset.placeholder || 'Select...';
        labelEl.classList.add('ss-placeholder');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /*===============================================
        country selection html
    ===============================================*/
    const _curPage = location.pathname.split('/').pop() || 'index.html';
    document.querySelector('.country_selection').innerHTML = `
    <div class="country">
        <div class="country_inner">
            <p>COUNTRY</p>
        </div>
    </div>

    <div class="select_inner">
        <a href="../${_curPage}"><img src="../img/english.png" alt=""></a>
        <a href="../tw/${_curPage}"><img src="../img/Taiwan.png" alt=""></a>
    </div>
    `

    const select = document.querySelector(".country");
    const country = document.querySelector(".country_selection");
    country.addEventListener("click",()=>{
        country.classList.toggle('active');
    })

    /*===============================================
        header html
    ===============================================*/
    document.querySelector('header').innerHTML = `
    <h1 class="logo">
        <a href="index.html"><div class="logo_inner">
            <h2>B ⋅ G ⋅ G</h2>
            <p class="sub_logo">Beauty Glow Goddess</p>
        </div>
        </a>
    </h1>
    <nav class="header_nav">
        <ul class="top_nav">
            <li class="nav_item nav_item--direct">
                <a href="./company.html" class="main_menu">О нас</a>
            </li>
            <li class="nav_item nav_item--featured">
                <a href="./partner.html" class="main_menu main_menu--featured">Клиники</a>
            </li>
            <li class="nav_item nav_item--has-sub">
                <a href="./booking.html" class="main_menu">Запись</a>
            </li>
            <li class="nav_item nav_item--direct">
                <a href="./review.html" class="main_menu">Отзывы</a>
            </li>
            <li class="nav_item nav_item--direct">
                <a href="./request.html" class="main_menu">Запрос / Заявка</a>
            </li>
        </ul>

        <div class="sub_nav_row" aria-hidden="true">
            <div class="sub_nav_cell"></div>
            <div class="sub_nav_cell sub_nav_cell--featured"></div>
            <div class="sub_nav_cell sub_nav_items">
                <a href="./booking.html" class="sub_menu">Онлайн-запись</a>
                <a href="./reservation.html" class="sub_menu">Записаться сейчас</a>
                <a href="./check.html" class="sub_menu">Подтверждение записи</a>
            </div>
            <div class="sub_nav_cell"></div>
            <div class="sub_nav_cell"></div>
        </div>
    </nav>

    <button class="hamburger" aria-label="메뉴 열기" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
    </button>

    <div class="mobile_nav_overlay" aria-hidden="true">
        <ul class="mobile_nav_list">
            <li>
                <a href="./company.html">О нас</a>
            </li>
            <li class="mobile_nav_item--featured">
                <a href="./partner.html">Клиники</a>
            </li>
            <li>
                <a href="#">Запись</a>
                <ul class="mobile_sub_list">
                    <a href="./booking.html">Онлайн-запись</a>
                    <a href="./reservation.html">Записаться сейчас</a>
                    <a href="./check.html">Подтверждение записи</a>
                </ul>
            </li>
            <li>
                <a href="./review.html">Отзывы</a>
            </li>
            <li>
                <a href="./request.html">Запрос / Заявка</a>
            </li>
        </ul>
    </div>
`;

    /*===============================================
            footer html
    ===============================================*/
    document.querySelector('footer').innerHTML = `
        <div class="footer_inner">
            <div class="footer_brand">
                <p class="footer_logo">BGG</p>
                <p class="footer_tagline">Beauty glow goddess</p>
            </div>

            <div class="footer_info">
                <p><span>Адрес</span> Wawa Building, 5-й этаж, Donggyo-ro, Mapo-gu, Сеул, Южная Корея</p>
                <p><span>Тел.</span> 02-1234-5678</p>
                <p><span>Электронная почта</span> contact@example.com</p>
                <p><span>Регистрационный номер компании</span> 123-45-67890</p>
            </div>

            <div class="footer_links">
                <a href="./privacy.html">Политика конфиденциальности</a>
                <a href="./terms.html">Условия использования</a>
            </div>
        </div>

        <div class="footer_bottom">
            <p>&copy; 2026 BGG. All rights reserved.</p>
        </div>
`

    /*===============================================
            contact_btn html
    ===============================================*/
    let contactBtnWrap = document.querySelector('.contact_btn_wrap');
    if (!contactBtnWrap) {
        contactBtnWrap = document.createElement('div');
        contactBtnWrap.className = 'contact_btn_wrap';
        document.body.appendChild(contactBtnWrap);
    }

    contactBtnWrap.innerHTML = `
            <a class="contact_social" href="https://www.facebook.com/people/Beauty-Glow-Goddess/61590980261007/" target="_blank"><i class="fa-brands fa-facebook"></i></a>
            <a class="contact_social" href="https://www.instagram.com/beauty_glow_goddess/" target="_blank"><i class="fa-brands fa-instagram"></i></a>
            <a class="contact_social" href="https://api.whatsapp.com/send/?phone=821063674119&text&type=phone_number&app_absent=0" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
            <a class="contact_social" href="https://www.threads.com/@beauty_glow_goddess" target="_blank"><i class="fa-brands fa-x-twitter"></i></a>
            <button class="contact_btn_toggle" aria-label="Toggle contact buttons"><i class="fa-solid fa-plus"></i></button>
        `;

    if (sessionStorage.getItem('contactCollapsed') === '1') {
        contactBtnWrap.classList.add('collapsed');
    }

    contactBtnWrap.querySelector('.contact_btn_toggle').addEventListener('click', () => {
        contactBtnWrap.classList.toggle('collapsed');
        sessionStorage.setItem('contactCollapsed', contactBtnWrap.classList.contains('collapsed') ? '1' : '0');
    });

    /* ── 햄버거 메뉴 ── */
    /* ── 汉堡菜单 ── */
    const hamburger = document.querySelector('.hamburger');
    const mobileOverlay = document.querySelector('.mobile_nav_overlay');

    hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('open');
        mobileOverlay.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
        mobileOverlay.setAttribute('aria-hidden', !isOpen);
        document.body.classList.toggle('mobile_nav_open', isOpen);
    });

    // 메뉴창 바깥 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
        if (
            document.body.classList.contains('mobile_nav_open') &&
            !mobileOverlay.contains(e.target) &&
            !hamburger.contains(e.target)
        ) {
            hamburger.classList.remove('open');
            mobileOverlay.classList.remove('open');
            hamburger.setAttribute('aria-expanded', false);
            mobileOverlay.setAttribute('aria-hidden', true);
            document.body.classList.remove('mobile_nav_open');
        }
    });

    // 서브메뉴 링크 클릭 시에만 메뉴 닫기 (메인메뉴 제외)
    // 仅在点击子菜单链接时关闭菜单（不含主菜单）
    mobileOverlay.querySelectorAll('.mobile_nav_list a[href]:not([href="#"])').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('open');
            mobileOverlay.classList.remove('open');
            hamburger.setAttribute('aria-expanded', false);
            mobileOverlay.setAttribute('aria-hidden', true);
            document.body.classList.remove('mobile_nav_open');
        });
    });

    const topNav = document.querySelector("header .top_nav");
    const topNavItems = document.querySelectorAll(".top_nav .nav_item");
    const headerEl = document.querySelector("header");
    const subNavRow = document.querySelector(".sub_nav_row");

    const syncSubNavColumns = () => {
        if (!topNav || !subNavRow) return;
        const topItems = topNav.querySelectorAll(".nav_item");
        const subCells = subNavRow.querySelectorAll(".sub_nav_cell");

        subCells.forEach((cell) => {
            cell.style.flex = "";
            cell.style.width = "";
        });

        topItems.forEach((item, index) => {
            const cell = subCells[index];
            if (!cell) return;
            cell.style.flex = "0 0 auto";
            cell.style.width = `${item.getBoundingClientRect().width}px`;
        });
    };

    let subNavCloseTimer = null;

    const openSubNav = () => {
        clearTimeout(subNavCloseTimer);
        headerEl.classList.add("nav_sub_open");
        subNavRow.setAttribute("aria-hidden", "false");
        syncSubNavColumns();
    };

    const scheduleCloseSubNav = () => {
        clearTimeout(subNavCloseTimer);
        subNavCloseTimer = setTimeout(() => {
            headerEl.classList.remove("nav_sub_open");
            subNavRow.setAttribute("aria-hidden", "true");
            topNavItems.forEach((item) => item.classList.remove("nav_active"));
        }, 150);
    };

    if (topNav && subNavRow) {
        const subNavZone = [topNav, subNavRow];

        topNav.addEventListener("mouseenter", openSubNav);
        subNavRow.addEventListener("mouseenter", openSubNav);

        topNavItems.forEach((item) => {
            item.addEventListener("mouseenter", () => {
                topNavItems.forEach((el) => el.classList.remove("nav_active"));
                item.classList.add("nav_active");
                openSubNav();
            });
        });

        subNavZone.forEach((zone) => {
            zone.addEventListener("mouseleave", (e) => {
                if (!subNavZone.some((item) => item.contains(e.relatedTarget))) {
                    scheduleCloseSubNav();
                }
            });
        });

        window.addEventListener("resize", syncSubNavColumns);
        syncSubNavColumns();
    }

    const subMenu = document.querySelectorAll(".sub_menu");
    subMenu.forEach((sub) => {
        sub.addEventListener("mouseover", () => sub.classList.add("active"));
        sub.addEventListener("mouseout", () => sub.classList.remove("active"));
    });

    // 특정 페이지에만 헤더 높이만큼 margin-top 적용
    // 仅在特定页面应用与头部高度相同的margin-top
    const marginTargets = [
        { selector: 'main.booking_wrap' }, // reservation.html
        { selector: 'main.review_wrap' },  // review.html
        { selector: 'main.request_wrap' },  // request.html
    ];

    const header = document.querySelector('header');
    const applyHeaderMargin = () => {
        const headerH = header.offsetHeight;
        marginTargets.forEach(({ selector }) => {
            const el = document.querySelector(selector);
            if (el) el.style.marginTop = headerH + 'px';
        });
    };

    applyHeaderMargin();
    window.addEventListener('resize', applyHeaderMargin);

    // 스크롤 위치에 따라 현재 보이는 섹션의 data-header-theme을 읽어 헤더 색상 동적 전환
    // 根据滚动位置读取当前可见区块的data-header-theme，动态切换头部颜色
    const updateHeaderTheme = () => {
        const headerH = header.offsetHeight;
        const sections = document.querySelectorAll('[data-header-theme]');
        let currentTheme = null;
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= headerH && rect.bottom > headerH / 2) {
                currentTheme = section.dataset.headerTheme;
            }
        });
        header.style.setProperty('--header-color', currentTheme === 'dark' ? 'var(--white)' : 'var(--black)');
    };

    updateHeaderTheme();
    document.addEventListener('scroll', updateHeaderTheme, { passive: true });

    /* ── contact_btn_wrap: footer 위에서 멈추기 ── */
    /* ── contact_btn_wrap: 在footer上方停止 ── */
    // const contactBtn = document.querySelector('.contact_btn_wrap');
    // const footerEl = document.querySelector('footer');

    // const updateContactBtnPosition = () => {
    //     if (!contactBtn || !footerEl) return;

    //     const footerRect = footerEl.getBoundingClientRect();
    //     const viewportH = window.innerHeight;
    //     const gap = 16;
    //     const defaultBottom = viewportH * 0.05;

    //     // footer 상단이 뷰포트 안으로 들어왔을 때
    //     // 当footer顶部进入视口时
    //     if (footerRect.top < viewportH) {
    //         const newBottom = viewportH - footerRect.top + gap;
    //         contactBtn.style.bottom = newBottom + 'px';
    //     } else {
    //         contactBtn.style.bottom = defaultBottom + 'px';
    //     }
    // };

    // document.addEventListener('scroll', updateContactBtnPosition, { passive: true });
    // window.addEventListener('resize', updateContactBtnPosition);
    // updateContactBtnPosition();
});
