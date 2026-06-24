/* =====================================================
   BGG Admin Panel – admin.js
   localStorage 기반
   BGG Admin Panel – admin.js
   localStorage 基盤
   ===================================================== */

const ADMIN_PW = '0000';

/* ── 카드 추가 후 add 버튼을 클릭했던 마우스 Y 위치로 스크롤 ── */
let _adminLastClickY = 0;
document.addEventListener('mousedown', e => {
    if (e.target.closest('.card_add_btn')) 
        _adminLastClickY = e.clientY - 20;
});

function scrollToCardAddBtn(containerEl) {
    if (!containerEl) return;
    const btn = containerEl.querySelector('.card_add_btn');
    if (!btn) return;
    const btnY = btn.getBoundingClientRect().top;
    window.scrollBy({ top: btnY - _adminLastClickY, behavior: 'smooth' });
}

/* ── 임시 이미지 저장 (저장 버튼 전까지) ── */
/* ── 临时图片存储（保存按钮前） ── */
const pending = {};

/* ── 현재 선택된 View 병원 (id 기반) ── */
/* ── 当前选中的View医院（基于id） ── */
let viewHospital = ''; // hospital.id (숫자) // hospital.id（数字）

/* ── 기본 데이터 ── */
/* ── 基础数据 ── */
//가격표 배열
//价格表数组
const DEFAULT_PRICES = [];

// 프로모션 태그 배열
// 促销标签数组
const DEFAULT_PROMO_TAGS_ADMIN = [];

const DEFAULT_PROMO_CARDS = Array.from({}, () => ({
    tag: 'category', 
    title: 'Promotion Title',
    desc: 'Promotion description goes here.',
    origPrice: '₩ 000,000', 
    salePrice: '₩ 000,000',
}));

const DEFAULT_BA = Array.from({}, () => ({
    tag: 'Treatment Name',
    desc: 'Short description of the procedure performed.',
    beforeImg: '', afterImg: '',
}));

/* =====================================================
   로그인
   管理员登录
   ===================================================== */
function checkPw() {
    const input = document.getElementById('pwInput');
    if (input.value === ADMIN_PW) {
        localStorage.setItem('bgg_admin_auth', '1');
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminMain').style.display = 'block';
        input.value = '';
        initAdmin();
    } else {
        document.getElementById('pwError').textContent = t('pw_wrong');
        input.value = '';
        input.focus();
    }
}

(function autoLogin() {
    if (localStorage.getItem('bgg_admin_auth') === '1') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('adminMain').style.display = 'block';
                initAdmin();
            });
        } else {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('adminMain').style.display = 'block';
            initAdmin();
        }
    }
})();

/* =====================================================
   다국어 번역 데이터 → i18n.js 참조
   多国语言翻译数据 → i18n.js 参考
   ===================================================== */
function applyLang(lang) {
    const t = I18N[lang] || I18N.kr;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('select option[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (t[key] !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
    window._currentLang = lang;
}

function t(key) {
    const lang = window._currentLang || localStorage.getItem('siteLang') || 'kr';
    return (I18N[lang] && I18N[lang][key]) || (I18N.kr[key]) || key;
}

function setLang(lang) {
    document.querySelectorAll('.lang_btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === lang);
    });
    localStorage.setItem('siteLang', lang);
    document.documentElement.classList.toggle('lang-zh', lang === 'cn');
    applyLang(lang);
    // 동적으로 렌더링된 카드/에디터 재렌더링
    // 重新渲染动态渲染的卡片/编辑器
    renderPopupCards();
    renderPartnerList();
    renderPromoTagsEditor();
    renderPromoPageCardsEditor();
    if (viewHospital) {
        renderHeroRow();
        renderPromoCards();
        renderBA();
        renderPrices();
    }
    if (document.getElementById('hospitalSelect')) {
        const _dowIdx = getAdminHospitalIdx();
        if (_dowIdx >= 0) renderDowButtons(_dowIdx);
    }
    renderInquiryList();
    renderReceivedList();
    renderPendingList();

    // 다른 탭(reservation 페이지)에서 예약 접수 시 명단 자동 갱신
    window.addEventListener('storage', function (e) {
        if (e.key === 'bgg_reservations' || e.key === 'bgg_blocked_' + getAdminHospitalIdx()) {
            renderReceivedList();
            renderPendingList();
        }
    });
}

(function initLang() {
    const saved = localStorage.getItem('siteLang') || 'kr';
    window._currentLang = saved;
    document.documentElement.classList.toggle('lang-zh', saved === 'cn');
    document.querySelectorAll('.lang_btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === saved);
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyLang(saved));
    } else {
        applyLang(saved);
    }
})();

function logout() {
    localStorage.removeItem('bgg_admin_auth');
    document.getElementById('adminMain').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('pwInput').value = '';
    document.getElementById('pwError').textContent = '';
}

/* =====================================================
   탭 전환
   切换标签
   ===================================================== */
function activateTab(tabId) {
    document.querySelectorAll('.tab_section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin_tab').forEach(b => b.classList.remove('active'));
    const section = document.getElementById(tabId);
    if (section) section.classList.add('active');
    const btn = document.querySelector(`.admin_tab[onclick*="${tabId}"]`);
    if (btn) btn.classList.add('active');
}

function showTab(tabId, btn) {
    localStorage.setItem('bgg_admin_active_tab', tabId);
    if (tabId === 'tab_reserve') {
        location.reload();
        return;
    }
    activateTab(tabId);
}

/* =====================================================
   초기화
   初始化
   ===================================================== */
function initAdmin() {
    initPopupTab();
    initPartnerTab();
    initPromoPageTab();
    initViewTab();
    initReserveTab();
    initInquiryTab();

    const savedTab = localStorage.getItem('bgg_admin_active_tab');
    if (savedTab && document.getElementById(savedTab)) {
        activateTab(savedTab);
    }
}

/* =====================================================
   공통: 이미지 로드 (FileReader → base64)
   通用: 映像负载( FileReader→ base64)
   ===================================================== */
function loadImage(input, key) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        pending[key] = e.target.result;
        applyPreview(key, e.target.result);
    };
    reader.readAsDataURL(file);
}

function deleteImage(key) {
    pending[key] = '';
    applyPreview(key, '');
}

function applyPreview(key, src) {
    const img = document.getElementById('prev_' + key);
    const ph = document.getElementById('ph_' + key);
    if (!img) return;
    if (src) {
        img.src = src;
        img.classList.add('has_img');
        ph?.classList.add('hidden');
        // .auto 프레임: 이미지 비율에 맞게 aspect-ratio 자동 조절
        // .auto框架：根据图片比例自动调整aspect-ratio
        const frame = img.closest('.img_frame.auto');
        if (frame) {
            const tmp = new Image();
            tmp.onload = () => {
                frame.style.aspectRatio = tmp.naturalWidth + ' / ' + tmp.naturalHeight;
            };
            tmp.src = src;
        }
    } else {
        img.src = '';
        img.classList.remove('has_img');
        ph?.classList.remove('hidden');
        // 이미지 제거 시 기본 비율로 복원
        // 删除图片时恢复为默认比例
        const frame = img.closest('.img_frame.auto');
        if (frame) frame.style.aspectRatio = '';
    }
}

function loadStored(key) {
    const v = localStorage.getItem('bgg_' + key);
    if (v) applyPreview(key, v);
}

/* View 탭 전용: 병원별 localStorage 키 */
/* View标签专用：按医院区分的localStorage键 */
function viewKey(key) {
    return 'bgg_view_' + viewHospital + '_' + key;
}

function loadStoredView(key) {
    const v = localStorage.getItem(viewKey(key));
    if (v) applyPreview(key, v);
}

/* =====================================================
   탭1: 팝업
   标签1: 弹窗
   ===================================================== */
function getPopupCount() {
    const raw = localStorage.getItem('bgg_popup_count');
    if (raw === null) return 0;
    const c = parseInt(raw);
    return (Number.isNaN(c) || c < 0) ? 0 : c;
    // return (isNaN(c) || c < 0) ? 2 : c;
}

function renderPopupCards() {
    const wrap = document.getElementById('popup_cards_wrap');
    if (!wrap) return;
    const count = getPopupCount();
    const lang = window._currentLang || 'kr';
    const labelMap = { kr: '팝업', cn: '弹窗', en: 'Popup' };
    const label = labelMap[lang] || 'Popup';

    wrap.innerHTML = Array.from({ length: count }, (_, i) => {
        const k = 'popup' + (i + 1);
        return `
        <div class="edit_card sortable_item" id="popup_block_${i + 1}">
            <div class="edit_card_label" style="display:flex;justify-content:space-between;align-items:center;">
                <span>${label} ${i + 1}</span>
                <button class="card_del_btn" onclick="removePopup(${i + 1})" title="삭제"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="img_frame auto" id="frame_${k}">
                <img id="prev_${k}" class="frame_img" src="" alt="">
                <div class="frame_empty" id="ph_${k}">
                    <i class="fa-regular fa-image"></i>
                    <span>${t('upload_img')}</span>
                </div>
            </div>
            <div class="card_actions">
                <label class="site_btn">
                    <i class="fa-solid fa-arrow-up-from-bracket"></i> <span>${t('change_img')}</span>
                    <input type="file" accept="image/*" onchange="loadImage(this,'${k}')">
                </label>
                <button class="ghost_btn" onclick="deleteImage('${k}')">
                    <i class="fa-solid fa-rotate-left"></i> <span>${t('default_val')}</span>
                </button>
            </div>
            <div class="field_row" style="margin-top:12px;">
                <label class="field_label">${t('popup_header_lbl')}</label>
                <input class="s_input" id="${k}_header" placeholder="Popup Title">
            </div>
        </div>`;
    }).join('');

    Array.from({ length: count }, (_, i) => {
        const k = 'popup' + (i + 1);
        loadStored(k);
        if (k in pending) applyPreview(k, pending[k]);
        const h = localStorage.getItem('bgg_' + k + '_header');
        const el = document.getElementById(k + '_header');
        if (el && h) el.value = h;
    });

    makeSortable(wrap, '.edit_card', () => {
        collectPopupDOMOrder();
        renderPopupCards();
    });
}

function collectPopupDOMOrder() {
    const wrap = document.getElementById('popup_cards_wrap');
    const blocks = wrap ? wrap.querySelectorAll('.edit_card[id^="popup_block_"]') : [];
    const count = getPopupCount();

    // 원래 위치 기준으로 현재 데이터 수집
    const data = {};
    for (let i = 1; i <= count; i++) {
        const headerEl = document.getElementById('popup' + i + '_header');
        data[i] = {
            img: localStorage.getItem('bgg_popup' + i),
            header: headerEl ? headerEl.value.trim() : (localStorage.getItem('bgg_popup' + i + '_header') || ''),
            pend: ('popup' + i) in pending ? pending['popup' + i] : undefined,
        };
    }

    // DOM 순서대로 새 순서 저장
    Array.from(blocks).forEach((block, newPos) => {
        const origIdx = parseInt(block.id.replace('popup_block_', ''));
        const newK = 'popup' + (newPos + 1);
        const d = data[origIdx];
        if (d.img) localStorage.setItem('bgg_' + newK, d.img);
        else localStorage.removeItem('bgg_' + newK);
        if (d.header) localStorage.setItem('bgg_' + newK + '_header', d.header);
        else localStorage.removeItem('bgg_' + newK + '_header');
        if (d.pend !== undefined) pending[newK] = d.pend;
        else delete pending[newK];
    });
}

function addPopup() {
    const count = getPopupCount();
    localStorage.setItem('bgg_popup_count', count + 1);
    renderPopupCards();
    scrollToCardAddBtn(document.getElementById('tab_popup'));
}

function removePopup(idx) {
    const count = getPopupCount();
    // idx번 팝업 삭제 후 뒤 항목들을 앞으로 당김
    // 删除第idx个弹窗后，将后续项目前移
    for (let i = idx; i < count; i++) {
        const curK = 'popup' + i;
        const nextK = 'popup' + (i + 1);
        const imgVal = localStorage.getItem('bgg_' + nextK);
        const hdrVal = localStorage.getItem('bgg_' + nextK + '_header');
        imgVal ? localStorage.setItem('bgg_' + curK, imgVal) : localStorage.removeItem('bgg_' + curK);
        hdrVal ? localStorage.setItem('bgg_' + curK + '_header', hdrVal) : localStorage.removeItem('bgg_' + curK + '_header');
        pending[curK] = pending[nextK];
    }
    const lastK = 'popup' + count;
    localStorage.removeItem('bgg_' + lastK);
    localStorage.removeItem('bgg_' + lastK + '_header');
    delete pending[lastK];
    const newCount = Math.max(count - 1, 0);
    localStorage.setItem('bgg_popup_count', newCount);
    renderPopupCards();
}

function movePopup(idx, direction) {
    const count = getPopupCount();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 1 || targetIdx > count) return;

    const kA = 'popup' + idx;
    const kB = 'popup' + targetIdx;

    // localStorage 스왑
    const imgA = localStorage.getItem('bgg_' + kA);
    const hdrA = localStorage.getItem('bgg_' + kA + '_header');
    const imgB = localStorage.getItem('bgg_' + kB);
    const hdrB = localStorage.getItem('bgg_' + kB + '_header');

    imgB ? localStorage.setItem('bgg_' + kA, imgB) : localStorage.removeItem('bgg_' + kA);
    hdrB ? localStorage.setItem('bgg_' + kA + '_header', hdrB) : localStorage.removeItem('bgg_' + kA + '_header');
    imgA ? localStorage.setItem('bgg_' + kB, imgA) : localStorage.removeItem('bgg_' + kB);
    hdrA ? localStorage.setItem('bgg_' + kB + '_header', hdrA) : localStorage.removeItem('bgg_' + kB + '_header');

    // pending 스왑
    const pendA = pending[kA];
    const pendB = pending[kB];
    if (pendB !== undefined) pending[kA] = pendB; else delete pending[kA];
    if (pendA !== undefined) pending[kB] = pendA; else delete pending[kB];

    renderPopupCards();
}

function initPopupTab() {
    renderPopupCards();
}

function savePopup() {
    const count = getPopupCount();
    Array.from({ length: count }, (_, i) => 'popup' + (i + 1)).forEach(k => {
        if (!(k in pending)) return;
        pending[k] ? localStorage.setItem('bgg_' + k, pending[k])
            : localStorage.removeItem('bgg_' + k);
    });
    Array.from({ length: count }, (_, i) => 'popup' + (i + 1) + '_header').forEach(k => {
        const el = document.getElementById(k);
        if (!el) return;
        const v = el.value.trim();
        v ? localStorage.setItem('bgg_' + k, v)
            : localStorage.removeItem('bgg_' + k);
    });
    showMsg('popup_msg', 'SAVED');
}

/* =====================================================
   탭2: 파트너 병원
   标签2:合伙医院
   ===================================================== */
function initPartnerTab() {
    renderPartnerList();
}

function renderPartnerList() {
    const hospitals = getHospitals();
    const wrap = document.getElementById('partner_list_editor');
    if (!wrap) return;

    wrap.innerHTML = `<div class="partner_hospital_grid">
        ${hospitals.map((h, i) => `
        <div class="partner_hospital_block sortable_item" id="ph_block_${h.id}">
            <div class="promo_card_num_row">
                <div class="promo_card_num">HOSPITAL ${i + 1} <a href="./view.html?idx=${h.id}" target="_blank" style="color:var(--gold-dk);font-size:11px;margin-left:8px;text-decoration:underline;">View →</a></div>
                <button class="card_del_btn" onclick="removePartnerHospital(${h.id})" title="병원 삭제">
                    <i class="fa-solid fa-minus"></i>
                </button>
            </div>
            <div>
                <label class="field_label">${t('thumbnail_img')}</label>
                <div class="img_frame square" id="frame_ph_img_${h.id}" style="margin-top:8px;">
                    <img id="prev_ph_img_${h.id}" class="frame_img ${h.img ? 'has_img' : ''}" src="${h.img || ''}">
                    <div class="frame_empty ${h.img ? 'hidden' : ''}" id="ph_ph_img_${h.id}">
                        <i class="fa-regular fa-image"></i>
                    </div>
                </div>
                <div class="card_actions" style="margin-top:8px;">
                    <label class="site_btn">
                        <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('upload')}
                        <input type="file" accept="image/*" onchange="loadImage(this,'ph_img_${h.id}')">
                    </label>
                    <button class="ghost_btn" onclick="deleteImage('ph_img_${h.id}')"><i class="fa-solid fa-rotate-left"></i></button>
                </div>
            </div>
            <div class="field_row" style="margin-top:14px;">
                <label class="field_label">${t('hospital_name_lbl')}</label>
                <input class="s_input" id="ph_name_${h.id}" value="${esc(h.name)}">
            </div>
            <div class="field_row">
                <label class="field_label">${t('hospital_tag_lbl')}</label>
                <input class="s_input" id="ph_tag_${h.id}" value="${esc(h.tag)}" placeholder="#ooo #ooo">
            </div>
        </div>
        `).join('')}
    </div>
    <button class="card_add_btn" onclick="addPartnerHospital()">
        <i class="fa-solid fa-plus"></i> ${t('add_hospital')}
    </button>`;

    const grid = wrap.querySelector('.partner_hospital_grid');
    makeSortable(grid, '.partner_hospital_block', () => {
        const reordered = collectPartnerHospitalsDOMOrder();
        localStorage.setItem('bgg_hospitals', JSON.stringify(reordered));
        renderPartnerList();
        refreshHospitalSelects();
    });
}

function collectPartnerHospitals() {
    const hospitals = getHospitals();
    return hospitals.map(h => {
        const nameEl = document.getElementById('ph_name_' + h.id);
        const tagEl = document.getElementById('ph_tag_' + h.id);
        return {
            id: h.id,
            name: nameEl ? nameEl.value : h.name,
            tag: tagEl ? tagEl.value : h.tag,
            img: ('ph_img_' + h.id) in pending
                ? pending['ph_img_' + h.id]
                : h.img,
        };
    });
}

function addPartnerHospital() {
    const hospitals = collectPartnerHospitals();
    const maxId = hospitals.reduce((m, h) => Math.max(m, h.id), 0);
    hospitals.push({ id: maxId + 1, name: 'New Hospital', img: '', tag: '' });
    localStorage.setItem('bgg_hospitals', JSON.stringify(hospitals));
    renderPartnerList();
    refreshHospitalSelects();
    scrollToCardAddBtn(document.getElementById('tab_partner'));
}

function removePartnerHospital(id) {
    const hospitals = collectPartnerHospitals();
    if (hospitals.length <= 1) { alert(t('alert_min_hospital')); return; }
    const updated = hospitals.filter(h => h.id !== id);
    localStorage.setItem('bgg_hospitals', JSON.stringify(updated));
    renderPartnerList();
    refreshHospitalSelects();
}

function refreshHospitalSelects() {
    const hospitals = getHospitals();

    // View 탭 select 갱신
    // 更新View标签的select
    const viewSel = document.getElementById('viewHospitalSelect');
    if (viewSel) {
        const prevVal = viewSel.value;
        while (viewSel.options.length > 1) viewSel.remove(1);
        hospitals.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id; opt.textContent = h.name;
            viewSel.appendChild(opt);
        });
        viewSel.value = prevVal;
    }

    // 예약 차단 탭 select 갱신
    // 更新预约屏蔽标签的select
    const resSel = document.getElementById('hospitalSelect');
    if (resSel) {
        const prevVal = resSel.value;
        while (resSel.options.length > 1) resSel.remove(1);
        hospitals.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.name; opt.textContent = h.name;
            resSel.appendChild(opt);
        });
        resSel.value = prevVal;
    }

    // 프로모션 카드 병원 select 갱신
    // 更新促销卡片医院的select
    renderPromoPageCardsEditor();
}

function savePartner() {
    const hospitals = collectPartnerHospitals();
    localStorage.setItem('bgg_hospitals', JSON.stringify(hospitals));
    showMsg('partner_msg', 'SAVED');
    // 저장 후 임시 pending 이미지 정리
    // 保存后清理临时pending图片
    hospitals.forEach(h => {
        delete pending['ph_img_' + h.id];
    });
    renderPartnerList();
    refreshHospitalSelects();
}

/* =====================================================
   탭3: 프로모션 페이지
   标签3:促销页面
   ===================================================== */
function initPromoPageTab() {
    renderPromoTagsEditor();
    renderPromoPageCardsEditor();
}

/* ── 프로모션 태그 편집기 ── */
/* -- 促销标签编辑器 -- */
function getAdminPromoTags() {
    const raw = localStorage.getItem('bgg_promo_tags');
    if (raw) { try { return JSON.parse(raw); } catch (e) { } }
    return DEFAULT_PROMO_TAGS_ADMIN.slice();
}

function renderPromoTagsEditor() {
    const tags = getAdminPromoTags();
    const wrap = document.getElementById('promo_tags_editor');
    if (!wrap) return;
    wrap.innerHTML = `<div class="ba_editor_list" id="promo_tags_list">
        ${tags.map((tag, i) => `
        <div class="promo_tag_row" id="ptag_row_${i}">
            <div class="promo_tag_field">
                <label class="field_label">${t('tag_label_lbl')}</label>
                <input class="s_input" id="ptag_label_${i}" value="${esc(tag.label)}" oninput="syncTagFilter(${i})">
            </div>
            <div class="promo_tag_field">
                <label class="field_label">${t('tag_filter_lbl')}</label>
                <input class="s_input" id="ptag_filter_${i}" value="${esc(tag.filter)}" readonly>
            </div>
            <button class="card_del_btn" onclick="removePromoTag(${i})" title="태그 삭제" style="margin-top:18px;">
                <i class="fa-solid fa-minus"></i>
            </button>
        </div>`).join('')}
    </div>
    <button class="card_add_btn" onclick="addPromoTag()" style="margin-top:8px;">
        <i class="fa-solid fa-plus"></i> ${t('add_tag')}
    </button>`;
}

function syncTagFilter(i) {
    const labelEl = document.getElementById('ptag_label_' + i);
    const filterEl = document.getElementById('ptag_filter_' + i);
    if (labelEl && filterEl) {
        filterEl.value = labelEl.value.toLowerCase().replace(/\s+/g, '_');
    }
    syncCardTagSelects();
}

/* 카드 에디터를 전체 재렌더링하지 않고 각 카드의 시술 카테고리 <select> 옵션만 업데이트 */
function syncCardTagSelects() {
    const tags = collectPromoTags();
    const blocks = document.querySelectorAll('#promo_page_cards_editor .promo_card_editor');
    blocks.forEach((_, i) => {
        const sel = document.getElementById('ppc_tag_' + i);
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = tags.map(tg =>
            `<option value="${esc(tg.filter)}" ${tg.filter === currentVal ? 'selected' : ''}>${esc(tg.label)}</option>`
        ).join('');
        // 이전 선택값이 사라진 경우 첫 번째 옵션으로 fallback
        if (sel.value !== currentVal && tags.length > 0) {
            sel.value = tags[0].filter;
        }
    });
}

function collectPromoTags() {
    const rows = document.querySelectorAll('#promo_tags_list .promo_tag_row');
    return Array.from(rows).map((_, i) => ({
        label: val('ptag_label_' + i),
        filter: val('ptag_filter_' + i),
    }));
}

function addPromoTag() {
    const tags = collectPromoTags();
    tags.push({ label: 'New Tag', filter: 'new_tag' });
    localStorage.setItem('bgg_promo_tags', JSON.stringify(tags));
    renderPromoTagsEditor();
    syncCardTagSelects(); // 카드 에디터 전체 재렌더 없이 select만 업데이트
    scrollToCardAddBtn(document.getElementById('promo_tags_editor'));
}

function removePromoTag(i) {
    const tags = collectPromoTags();
    tags.splice(i, 1);
    localStorage.setItem('bgg_promo_tags', JSON.stringify(tags));
    renderPromoTagsEditor();
    syncCardTagSelects(); // 카드 에디터 전체 재렌더 없이 select만 업데이트
}

/* ── 프로모션 페이지 카드 편집기 ── */
/* -- 促销页面卡片编辑器 -- */
function getAdminPromoPageCards() {
    const raw = localStorage.getItem('bgg_promo_page_cards');
    if (raw) { try { return JSON.parse(raw); } catch (e) { } }
    return [];
}

function renderPromoPageCardsEditor() {
    const cards = getAdminPromoPageCards();
    const tags = getAdminPromoTags();
    const hospitals = getHospitals();
    const wrap = document.getElementById('promo_page_cards_editor');
    if (!wrap) return;

    const tagOptions = tags.map(t =>
        `<option value="${esc(t.filter)}">${esc(t.label)}</option>`
    ).join('');
    const hospitalOptions = hospitals.map(h =>
        `<option value="${h.id}">${esc(h.name)}</option>`
    ).join('');
    const badgeOptions = `
        <option value="">없음</option>
        <option value="HOT">HOT</option>
        <option value="NEW">NEW</option>`;

    wrap.innerHTML = `<div class="promo_cards_grid">
        ${cards.map((c, i) => `
        <div class="promo_card_editor" id="ppc_block_${i}">
            <div class="promo_card_num_row">
                <div class="promo_card_num">CARD ${i + 1}</div>
                <button class="card_del_btn" onclick="removePromoPageCard(${i})" title="카드 삭제">
                    <i class="fa-solid fa-minus"></i>
                </button>
            </div>
            <div class="field_row">
                <label class="field_label">${t('card_img_lbl')}</label>
                <div class="img_frame banner" id="frame_ppc_img_${i}">
                    <img id="prev_ppc_img_${i}" class="frame_img ${c.img ? 'has_img' : ''}" src="${c.img || ''}">
                    <div class="frame_empty ${c.img ? 'hidden' : ''}" id="ph_ppc_img_${i}">
                        <i class="fa-regular fa-image"></i>
                    </div>
                </div>
                <div class="card_actions" style="margin-top:8px;">
                    <label class="site_btn">
                        <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('upload')}
                        <input type="file" accept="image/*" onchange="loadImage(this,'ppc_img_${i}')">
                    </label>
                    <button class="ghost_btn" onclick="deleteImage('ppc_img_${i}')"><i class="fa-solid fa-rotate-left"></i></button>
                </div>
            </div>
            <div class="field_row">
                <label class="field_label">${t('linked_hospital_lbl')}</label>
                <select class="s_input" id="ppc_hospital_${i}" style="border-bottom:1px solid var(--border);">
                    ${hospitals.map(h => `<option value="${h.id}" ${h.id === c.hospitalId ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}
                </select>
            </div>
            <div class="field_row">
                <label class="field_label">${t('card_tag_lbl')}</label>
                <select class="s_input" id="ppc_tag_${i}" style="border-bottom:1px solid var(--border);">
                    ${tags.map(tg => `<option value="${esc(tg.filter)}" ${tg.filter === c.cardTag ? 'selected' : ''}>${esc(tg.label)}</option>`).join('')}
                </select>
            </div>
            <div class="field_row">
                <label class="field_label">${t('badge_lbl')}</label>
                <select class="s_input" id="ppc_badge_${i}" style="border-bottom:1px solid var(--border);">
                    <option value="" ${!c.badge ? 'selected' : ''}>${t('none_option')}</option>
                    <option value="HOT" ${c.badge === 'HOT' ? 'selected' : ''}>HOT</option>
                    <option value="NEW" ${c.badge === 'NEW' ? 'selected' : ''}>NEW</option>
                </select>
            </div>
            <div class="field_row">
                <label class="field_label">${t('card_title_lbl')}</label>
                <input class="s_input" id="ppc_title_${i}" value="${esc(c.cardTitle)}">
            </div>
            <div class="field_row">
                <label class="field_label">${t('card_desc_lbl')}</label>
                <textarea class="s_textarea" id="ppc_desc_${i}">${esc(c.cardDesc)}</textarea>
            </div>
        </div>`).join('')}
    </div>
    <button class="card_add_btn" onclick="addPromoPageCard()">
        <i class="fa-solid fa-plus"></i> ${t('add_card')}
    </button>`;

    const countEl = document.getElementById('promo_page_card_count');
    if (countEl) countEl.textContent = `(${cards.length}개)`;

    const grid = wrap.querySelector('.promo_cards_grid');
    makeSortable(grid, '.promo_card_editor', () => {
        const reordered = collectPromoPageCardsDOMOrder();
        localStorage.setItem('bgg_promo_page_cards', JSON.stringify(reordered));
        renderPromoPageCardsEditor();
    });
}

function collectPromoPageCards() {
    const cards = getAdminPromoPageCards();
    const wrap = document.getElementById('promo_page_cards_editor');
    const blocks = wrap ? wrap.querySelectorAll('.promo_card_editor') : [];
    return Array.from(blocks).map((_, i) => ({
        img: ('ppc_img_' + i) in pending ? pending['ppc_img_' + i] : (cards[i]?.img || ''),
        hospitalId: parseInt(val('ppc_hospital_' + i)) || 1,
        cardTag: val('ppc_tag_' + i),
        badge: val('ppc_badge_' + i),
        cardTitle: val('ppc_title_' + i),
        cardDesc: val('ppc_desc_' + i),
    }));
}

function addPromoPageCard() {
    const cards = collectPromoPageCards();
    const tags = getAdminPromoTags();
    const hospitals = getHospitals();
    cards.push({
        img: '', hospitalId: hospitals[0]?.id || 1,
        cardTag: tags[0]?.filter || 'cosmetic',
        cardTitle: '',
        cardDesc: '',
        badge: '',
    });
    localStorage.setItem('bgg_promo_page_cards', JSON.stringify(cards));
    renderPromoPageCardsEditor();
    scrollToCardAddBtn(document.getElementById('promo_page_cards_editor'));
}

function removePromoPageCard(i) {
    const cards = collectPromoPageCards();
    if (cards.length <= 1) return;
    cards.splice(i, 1);
    localStorage.setItem('bgg_promo_page_cards', JSON.stringify(cards));
    renderPromoPageCardsEditor();
}

function savePromoPage() {
    const tags = collectPromoTags();
    const cards = collectPromoPageCards();
    localStorage.setItem('bgg_promo_tags', JSON.stringify(tags));
    localStorage.setItem('bgg_promo_page_cards', JSON.stringify(cards));
    showMsg('promo_page_msg', 'SAVED');
}

/* =====================================================
   탭4: View 페이지
   标签4: View 页面
   ===================================================== */
function initViewTab() {
    const sel = document.getElementById('viewHospitalSelect');
    const hospitals = getHospitals();
    hospitals.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id; opt.textContent = h.name;
        sel.appendChild(opt);
    });
}

function onViewHospitalChange() {
    const _vh = document.getElementById('viewHospitalSelect').value;
    viewHospital = _vh;
    const content = document.getElementById('viewContent');

    const _pc = getPopupCount();
    const _popupKeys = Array.from({ length: _pc }, (_, i) => 'popup' + (i + 1));
    Object.keys(pending).forEach(k => {
        if (!_popupKeys.includes(k)) delete pending[k];
    });

    if (!viewHospital) {
        content.style.display = 'none';
        return;
    }

    content.style.display = 'block';
    renderHeroRow();
    loadViewTextFields();
    loadAboutSection();
    loadDoctorSection();
    loadStoredView('promoBanner');
    renderPromoCards();
    renderBA();
    renderPrices();
}

/* ── 히어로 캐러셀 현재 슬라이드 인덱스 ── */
let adminHeroSlide = 0;

function goAdminHeroSlide(idx) {
    const count = getHeroCount();
    adminHeroSlide = Math.max(0, Math.min(idx, count - 1));
    document.querySelectorAll('.admin_hero_slide').forEach((s, i) => {
        s.classList.toggle('active', i === adminHeroSlide);
        s.classList.toggle('prev', i < adminHeroSlide);
    });
    document.querySelectorAll('.admin_hero_dot').forEach((d, i) =>
        d.classList.toggle('active', i === adminHeroSlide));
}

/* ── 히어로 슬라이드 수 ── */
/* -- 英雄幻灯片数 -- */
function getHeroCount() {
    const c = parseInt(localStorage.getItem(viewKey('hero_count')));
    return (c && c > 0) ? c : 1;
}

function addHeroSlide() {
    if (!viewHospital) return;
    const newIdx = getHeroCount(); // 추가 전 count = 새 슬라이드 인덱스
    localStorage.setItem(viewKey('hero_count'), newIdx + 1);
    adminHeroSlide = newIdx;
    renderHeroRow();
}

function removeHeroSlide(idx) {
    if (!viewHospital) return;
    const count = getHeroCount();
    if (count <= 1) return;
    // idx번 슬라이드 삭제 후 뒤 항목들을 앞으로 당김
    // 删除第idx个幻灯片后，将后续项目前移
    for (let i = idx; i < count - 1; i++) {
        const curK = 'hero' + i;
        const nextK = 'hero' + (i + 1);
        const imgVal = localStorage.getItem(viewKey(nextK));
        imgVal ? localStorage.setItem(viewKey(curK), imgVal) : localStorage.removeItem(viewKey(curK));
        pending[curK] = pending[nextK];
    }
    const lastK = 'hero' + (count - 1);
    localStorage.removeItem(viewKey(lastK));
    delete pending[lastK];
    localStorage.setItem(viewKey('hero_count'), count - 1);
    renderHeroRow();
}

//히어로 이미지 캐러셀 렌더
//英雄形象轮播渲染
function renderHeroRow() {
    const row = document.getElementById('hero_images_row');
    const dotsRow = document.getElementById('hero_dots_row');
    if (!row) return;
    const count = getHeroCount();
    if (adminHeroSlide >= count) adminHeroSlide = count - 1;
    const lang = window._currentLang || 'kr';
    const labelPrefix = { kr: '슬라이드', cn: '幻灯片', en: 'Slide' }[lang] || 'Slide';

    row.innerHTML = Array.from({ length: count }, (_, i) => {
        const cls = i === adminHeroSlide ? 'active' : i < adminHeroSlide ? 'prev' : '';
        return `
        <div class="admin_hero_slide${cls ? ' ' + cls : ''}" data-idx="${i}">
            <img id="prev_hero${i}" class="admin_hero_img frame_img" src="" alt="">
            <div class="admin_hero_empty" id="ph_hero${i}">
                <i class="fa-regular fa-image"></i>
                <span>${t('upload_img')}</span>
            </div>
            <div class="admin_hero_slide_overlay">
                <span class="admin_hero_slide_label">${labelPrefix} ${i + 1}</span>
                <div class="admin_hero_ctrl_row">
                    <label class="site_btn admin_hero_upload_btn">
                        <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('change_img')}
                        <input type="file" accept="image/*" onchange="loadImage(this,'hero${i}')">
                    </label>
                    <button class="ghost_btn admin_hero_del_btn" onclick="deleteImage('hero${i}')" title="${t('default_val')}">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    ${count > 1 ? `<button class="admin_hero_remove_btn" onclick="removeHeroSlide(${i})" title="삭제"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    if (dotsRow) {
        dotsRow.innerHTML = Array.from({ length: count }, (_, i) =>
            `<button class="admin_hero_dot${i === adminHeroSlide ? ' active' : ''}" onclick="goAdminHeroSlide(${i})"></button>`
        ).join('');
    }

    Array.from({ length: count }, (_, i) => loadStoredView('hero' + i));
}

/* ── 히어로 텍스트 필드 로드 ── */
/* -英雄文本现场路线 */
function loadViewTextFields() {
    const heroName = localStorage.getItem(viewKey('hero_name'));
    const heroSub = localStorage.getItem(viewKey('hero_sub'));
    const el1 = document.getElementById('view_hero_name');
    const el2 = document.getElementById('view_hero_sub');
    if (el1) el1.value = heroName || '';
    if (el2) el2.value = heroSub || '';
}

/* ── About 섹션 로드 ── */
/* - About部分路线 */
function loadAboutSection() {
    const aboutTitle = localStorage.getItem(viewKey('about_title'));
    const aboutDesc = localStorage.getItem(viewKey('about_desc'));
    const el1 = document.getElementById('view_about_title');
    const el2 = document.getElementById('view_about_desc');
    if (el1) el1.value = aboutTitle || '';
    if (el2) el2.value = aboutDesc || '';

    // about image
    const aboutImgRaw = localStorage.getItem(viewKey('about_images'));
    if (aboutImgRaw) {
        try {
            const imgs = JSON.parse(aboutImgRaw);
            if (imgs[0]) applyPreview('about_img0', imgs[0]);
        } catch (e) { }
    }

    // highlights
    const hlRaw = localStorage.getItem(viewKey('about_highlights'));
    let highlights = [];
    if (hlRaw) { try { highlights = JSON.parse(hlRaw); } catch (e) { } }
    if (!highlights.length) highlights = [''];
    renderHighlights(highlights);
}

function renderHighlights(highlights) {
    const wrap = document.getElementById('about_highlights_editor');
    if (!wrap) return;
    wrap.innerHTML = highlights.map((h, i) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <i class="fa-solid fa-check" style="color:var(--bookink2);font-size:12px;flex-shrink:0;"></i>
            <input class="s_input" id="hl_item_${i}" value="${esc(h)}" style="flex:1;">
            <button class="card_del_btn" onclick="removeHighlight(${i})"><i class="fa-solid fa-minus"></i></button>
        </div>`).join('');
}

function collectHighlights() {
    const wrap = document.getElementById('about_highlights_editor');
    if (!wrap) return [];
    const inputs = wrap.querySelectorAll('input[id^="hl_item_"]');
    return Array.from(inputs).map(inp => inp.value);
}

function addHighlight() {
    const items = collectHighlights();
    items.push('');
    renderHighlights(items);
    scrollToCardAddBtn(document.getElementById('about_highlights_editor')?.closest('.field_row'));
}

function removeHighlight(i) {
    const items = collectHighlights();
    items.splice(i, 1);
    renderHighlights(items);
}

/* ── Doctor 섹션 로드 ── */
/* -- Doctor 节负载 -- */
function loadDoctorSection() {
    const docLabel = localStorage.getItem(viewKey('doctor_label'));
    const docName = localStorage.getItem(viewKey('doctor_name'));
    const docBio = localStorage.getItem(viewKey('doctor_bio'));
    const docImg = localStorage.getItem(viewKey('doctor_img'));
    const el1 = document.getElementById('view_doctor_label');
    const el2 = document.getElementById('view_doctor_name');
    const el3 = document.getElementById('view_doctor_bio');
    if (el1) el1.value = docLabel || '';
    if (el2) el2.value = docName || '';
    if (el3) el3.value = docBio || '';
    if (docImg) applyPreview('doctor_img', docImg);
}

/* ── 프로모션 카드 (View 내) ── */
/* -- 促销卡( View内) -- */
function renderPromoCards() {
    const stored = JSON.parse(localStorage.getItem(viewKey('promo_cards')) || 'null') || DEFAULT_PROMO_CARDS;
    const promoTags = getAdminPromoTags();
    const grid = document.getElementById('promo_cards_editor');
    grid.innerHTML = stored.map((c, i) => {
        const tagOptions = promoTags.map(tag =>
            `<option value="${esc(tag.filter)}" ${tag.filter === c.tag ? 'selected' : ''}>${esc(tag.label)}</option>`
        ).join('');
        return `
        <div class="promo_card_editor" id="pc_block_${i}">
            <div class="promo_card_num_row">
                <div class="promo_card_num">PROMOTION ${i + 1}</div>
                <button class="card_del_btn" onclick="removePromoCard(${i})" title="카드 삭제">
                    <i class="fa-solid fa-minus"></i>
                </button>
            </div>
            <div class="field_row">
                <label class="field_label">${t('category_tag_lbl')}</label>
                <select class="s_input" id="pc_tag_${i}">
                    ${tagOptions}
                </select>
            </div>
            <div class="field_row">
                <label class="field_label">${t('title_lbl')}</label>
                <input class="s_input" id="pc_title_${i}" value="${esc(c.title)}">
            </div>
            <div class="field_row">
                <label class="field_label">${t('desc_lbl')}</label>
                <textarea class="s_textarea" id="pc_desc_${i}">${esc(c.desc)}</textarea>
            </div>
            <div class="field_row">
                <label class="field_label">${t('price_lbl_1')}</label>
                <div class="price_pair">
                    <input class="s_input" id="pc_orig_${i}" placeholder="${t('orig_price_ph')}" value="${esc(c.origPrice)}">
                    <input class="s_input" id="pc_sale_${i}" placeholder="${t('sale_price_ph')}" value="${esc(c.salePrice)}">
                </div>
            </div>
        </div>`;
    }).join('') + `
        <button class="card_add_btn" onclick="addPromoCard()">
            <i class="fa-solid fa-plus"></i> ${t('add_card')}
        </button>`;
    updatePromoCardLabel();
}

function collectPromoCards() {
    const grid = document.getElementById('promo_cards_editor');
    const cards = grid ? grid.querySelectorAll('.promo_card_editor') : [];
    return Array.from(cards).map((_, i) => ({
        tag: val(`pc_tag_${i}`),
        title: val(`pc_title_${i}`),
        desc: val(`pc_desc_${i}`),
        origPrice: val(`pc_orig_${i}`),
        salePrice: val(`pc_sale_${i}`),
    }));
}

function addPromoCard() {
    const cards = collectPromoCards();
    cards.push({
        tag: 'category', title: 'Promotion Title',
        desc: 'Promotion description goes here.',
        origPrice: '₩ 000,000', salePrice: '₩ 000,000'
    });
    localStorage.setItem(viewKey('promo_cards'), JSON.stringify(cards));
    renderPromoCards();
    scrollToCardAddBtn(document.getElementById('promo_cards_editor'));
}

function removePromoCard(i) {
    const cards = collectPromoCards();
    if (cards.length <= 1) return;
    cards.splice(i, 1);
    localStorage.setItem(viewKey('promo_cards'), JSON.stringify(cards));
    renderPromoCards();
}

function updatePromoCardLabel() {
    const grid = document.getElementById('promo_cards_editor');
    const count = grid ? grid.querySelectorAll('.promo_card_editor').length : 0;
    const sub = document.querySelector('#tab_view .group_label .group_sub');
    if (sub) sub.textContent = `(${count}개)`;
}

/* ── Before & After ── */
function renderBA() {
    const stored = JSON.parse(localStorage.getItem(viewKey('ba')) || 'null') || DEFAULT_BA;
    const wrap = document.getElementById('ba_editor');
    wrap.innerHTML = `<div class="ba_editor_list">${stored.map((c, i) => `
        <div class="ba_editor_item">
            <div class="promo_card_num_row">
                <div class="ba_item_num">B/A ${i + 1}</div>
                <button class="card_del_btn" onclick="removeBACard(${i})" title="항목 삭제">
                    <i class="fa-solid fa-minus"></i>
                </button>
            </div>
            <div class="ba_img_pair">
                <div class="ba_img_slot">
                    <div class="img_frame square" id="frame_ba${i}before">
                        <div class="slot_label">Before</div>
                        <img id="prev_ba${i}before" class="frame_img ${c.beforeImg ? 'has_img' : ''}" src="${c.beforeImg || ''}">
                        <div class="frame_empty ${c.beforeImg ? 'hidden' : ''}" id="ph_ba${i}before">
                            <i class="fa-regular fa-image"></i>
                        </div>
                    </div>
                    <div class="slot_actions">
                        <label class="site_btn">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('upload')}
                            <input type="file" accept="image/*" onchange="loadImage(this,'ba${i}before')">
                        </label>
                        <button class="ghost_btn" onclick="deleteImage('ba${i}before')"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                </div>
                <div class="ba_img_slot">
                    <div class="img_frame square" id="frame_ba${i}after">
                        <div class="slot_label">After</div>
                        <img id="prev_ba${i}after" class="frame_img ${c.afterImg ? 'has_img' : ''}" src="${c.afterImg || ''}">
                        <div class="frame_empty ${c.afterImg ? 'hidden' : ''}" id="ph_ba${i}after">
                            <i class="fa-regular fa-image"></i>
                        </div>
                    </div>
                    <div class="slot_actions">
                        <label class="site_btn">
                            <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('upload')}
                            <input type="file" accept="image/*" onchange="loadImage(this,'ba${i}after')">
                        </label>
                        <button class="ghost_btn" onclick="deleteImage('ba${i}after')"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                </div>
            </div>
            <div class="ba_text_row">
                <div class="field_row">
                    <label class="field_label">${t('tag_lbl')}</label>
                    <input class="s_input" id="ba_tag_${i}" placeholder="${esc(c.tag)}">
                </div>
                <div class="field_row">
                    <label class="field_label">${t('desc_lbl')}</label>
                    <input class="s_input" id="ba_desc_${i}" placeholder="${esc(c.desc)}">
                </div>
            </div>
        </div>`).join('')}</div>
    <button class="card_add_btn" onclick="addBACard()">
        <i class="fa-solid fa-plus"></i> ${t('add_item')}
    </button>`;
}

function collectBA() {
    const stored = JSON.parse(localStorage.getItem(viewKey('ba')) || 'null') || DEFAULT_BA;
    const wrap = document.getElementById('ba_editor');
    const count = wrap ? wrap.querySelectorAll('.ba_editor_item').length : 0;
    return Array.from({ length: count }, (_, i) => ({
        tag: val(`ba_tag_${i}`),
        desc: val(`ba_desc_${i}`),
        beforeImg: `ba${i}before` in pending ? pending[`ba${i}before`] : (stored[i]?.beforeImg || ''),
        afterImg: `ba${i}after` in pending ? pending[`ba${i}after`] : (stored[i]?.afterImg || ''),
    }));
}

function addBACard() {
    const cards = collectBA();
    cards.push({ tag: 'Treatment Name', desc: 'Short description of the procedure performed.', beforeImg: '', afterImg: '' });
    localStorage.setItem(viewKey('ba'), JSON.stringify(cards));
    renderBA();
    scrollToCardAddBtn(document.getElementById('ba_editor'));
}

function removeBACard(i) {
    const cards = collectBA();
    cards.splice(i, 1);
    localStorage.setItem(viewKey('ba'), JSON.stringify(cards));
    renderBA();
}

/* ── 가격표 ── */
/* - 价格表-*/
function renderPrices() {
    const stored = JSON.parse(localStorage.getItem(viewKey('prices')) || 'null') || DEFAULT_PRICES;
    const wrap = document.getElementById('price_editor');
    wrap.innerHTML = stored.map((cat, ci) => `
        <div class="price_cat_editor" id="pr_cat_block_${ci}">
            <div class="price_cat_title_row">
                <input class="s_input" id="pr_cat_${ci}" placeholder="${esc(cat.catTitle)}">
                <button class="card_del_btn" onclick="removePriceCategory(${ci})" title="카테고리 삭제">
                    <i class="fa-solid fa-minus"></i>
                </button>
            </div>
            <div id="pr_items_${ci}">
            ${cat.items.map((item, ii) => renderPriceItemRow(ci, ii, item)).join('')}
            </div>
            <button class="price_add_btn" onclick="addPriceItem(${ci})">
                <i class="fa-solid fa-plus"></i> ${t('add_item')}
            </button>
        </div>`).join('') + `
    <button class="card_add_btn" onclick="addPriceCategory()">
        <i class="fa-solid fa-plus"></i> ${t('add_category')}
    </button>`;
}

function renderPriceItemRow(ci, ii, item) {
    return `
    <div class="price_item_row" id="pr_row_${ci}_${ii}">
        <div>
            <input class="s_input" id="pr_name_${ci}_${ii}" placeholder="${esc(item.name)}">
        </div>
        <div>
            <input class="s_input" id="pr_price_${ci}_${ii}" placeholder="${esc(item.price)}" style="width:110px;text-align:right;">
        </div>
        <button class="price_del_btn" onclick="removePriceItem(${ci},${ii})" title="삭제">
            <i class="fa-solid fa-minus"></i>
        </button>
    </div>`;
}

function addPriceItem(ci) {
    const prices = collectPrices();
    prices[ci].items.push({ name: 'Name of treatment', price: '₩ 000,000' });
    savePricesTemp(prices);
    renderPrices();
}

function removePriceItem(ci, ii) {
    const prices = collectPrices();
    if (prices[ci].items.length <= 1) return;
    prices[ci].items.splice(ii, 1);
    savePricesTemp(prices);
    renderPrices();
}

function addPriceCategory() {
    const prices = collectPrices();
    prices.push({ catTitle: 'category', items: [{ name: 'Name of treatment', price: '₩ 000,000' }] });
    savePricesTemp(prices);
    renderPrices();
    scrollToCardAddBtn(document.getElementById('price_editor'));
}

function removePriceCategory(ci) {
    const prices = collectPrices();
    if (prices.length <= 1) return;
    prices.splice(ci, 1);
    savePricesTemp(prices);
    renderPrices();
}

function savePricesTemp(prices) {
    localStorage.setItem(viewKey('prices'), JSON.stringify(prices));
}

function collectPrices() {
    const wrap = document.getElementById('price_editor');
    const catBlocks = wrap ? wrap.querySelectorAll('.price_cat_editor') : [];
    return Array.from(catBlocks).map((block, ci) => {
        const itemRows = block.querySelectorAll('.price_item_row');
        return {
            catTitle: val(`pr_cat_${ci}`),
            items: Array.from(itemRows).map((_, ii) => ({
                name: val(`pr_name_${ci}_${ii}`),
                price: val(`pr_price_${ci}_${ii}`),
            })),
        };
    });
}

function saveView() {
    if (!viewHospital) { alert(t('alert_select_hospital')); return; }

    // 히어로 이미지 (동적 슬라이드 수)
    // 主视觉图片（动态幻灯片数量）
    const heroCount = getHeroCount();
    localStorage.setItem(viewKey('hero_count'), heroCount);
    const heroKeys = Array.from({ length: heroCount }, (_, i) => 'hero' + i);
    [...heroKeys, 'promoBanner', 'about_img0', 'doctor_img'].forEach(k => {
        if (!(k in pending)) return;
        pending[k] ? localStorage.setItem(viewKey(k), pending[k])
            : localStorage.removeItem(viewKey(k));
    });

    // 히어로 텍스트
    // 主视觉文字
    const heroName = val('view_hero_name');
    const heroSub = val('view_hero_sub');
    heroName ? localStorage.setItem(viewKey('hero_name'), heroName) : localStorage.removeItem(viewKey('hero_name'));
    heroSub ? localStorage.setItem(viewKey('hero_sub'), heroSub) : localStorage.removeItem(viewKey('hero_sub'));

    // About
    const aboutTitle = val('view_about_title');
    const aboutDesc = val('view_about_desc');
    aboutTitle ? localStorage.setItem(viewKey('about_title'), aboutTitle) : localStorage.removeItem(viewKey('about_title'));
    aboutDesc ? localStorage.setItem(viewKey('about_desc'), aboutDesc) : localStorage.removeItem(viewKey('about_desc'));

    // about images (about_img0)
    const aboutImg0 = ('about_img0' in pending) ? pending['about_img0'] : localStorage.getItem(viewKey('about_img0'));
    if (aboutImg0 !== null) {
        const existing = localStorage.getItem(viewKey('about_images'));
        let imgs = [];
        if (existing) { try { imgs = JSON.parse(existing); } catch (e) { } }
        imgs[0] = aboutImg0 || '';
        localStorage.setItem(viewKey('about_images'), JSON.stringify(imgs));
    }

    // highlights
    const highlights = collectHighlights();
    localStorage.setItem(viewKey('about_highlights'), JSON.stringify(highlights));

    // Doctor
    const doctorLabel = val('view_doctor_label');
    const doctorName = val('view_doctor_name');
    const doctorBio = val('view_doctor_bio');
    doctorLabel ? localStorage.setItem(viewKey('doctor_label'), doctorLabel) : localStorage.removeItem(viewKey('doctor_label'));
    doctorName ? localStorage.setItem(viewKey('doctor_name'), doctorName) : localStorage.removeItem(viewKey('doctor_name'));
    doctorBio ? localStorage.setItem(viewKey('doctor_bio'), doctorBio) : localStorage.removeItem(viewKey('doctor_bio'));

    // 기존 데이터
    // 原有数据
    localStorage.setItem(viewKey('promo_cards'), JSON.stringify(collectPromoCards()));
    localStorage.setItem(viewKey('ba'), JSON.stringify(collectBA()));
    localStorage.setItem(viewKey('prices'), JSON.stringify(collectPrices()));

    showMsg('view_msg', 'SAVED');
}

/* =====================================================
   탭5: 예약 관리
   标签5:预约管理
   ===================================================== */
function getDowLabels() {
    const lang = window._currentLang || 'kr';
    return (I18N[lang] && I18N[lang].dow_labels) || I18N.kr.dow_labels;
}

let adminCalYear, adminCalMonth, adminSelectedDate = null;
let waSelectedTime = '';      // WhatsApp 예약 시 선택된 시간 // WhatsApp预约时选择的时间
window._waMode = false;       // WhatsApp 접수 모드 여부 // 是否为WhatsApp接单模式

function getAdminHospitalName() {
    const id = getAdminHospitalIdx();
    if (id < 0) return '';
    const h = getHospitals().find(h => h.id === id);
    return h ? h.name : '';
}

function initReserveTab() {
    const sel = document.getElementById('hospitalSelect');
    const hospitals = getHospitals();
    hospitals.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.id; opt.textContent = h.name;
        sel.appendChild(opt);
    });

    const today = new Date();
    adminCalYear = today.getFullYear();
    adminCalMonth = today.getMonth();

    document.getElementById('adminPrevMonth').addEventListener('click', () => {
        const today = new Date();
        if (adminCalYear === today.getFullYear() && adminCalMonth === today.getMonth()) return;
        adminCalMonth--;
        if (adminCalMonth < 0) { adminCalMonth = 11; adminCalYear--; }
        renderAdminCal();
    });

    document.getElementById('adminNextMonth').addEventListener('click', () => {
        adminCalMonth++;
        if (adminCalMonth > 11) { adminCalMonth = 0; adminCalYear++; }
        renderAdminCal();
    });

    renderReceivedList();
    renderPendingList();
}

function getAdminHospitalIdx() {
    const val = document.getElementById('hospitalSelect').value;
    const id = parseInt(val);
    return isNaN(id) ? -1 : id;
}

function onHospitalChange() {
    const _hval = document.getElementById('hospitalSelect').value;
    adminSelectedDate = null;
    waSelectedTime = '';

    const idx = getAdminHospitalIdx();
    const calWrap = document.getElementById('calendarWrap');
    const dowBlockWrap = document.getElementById('dowBlockWrap');
    const area = document.getElementById('timeBlockArea');
    const receptionMethodWrap = document.getElementById('receptionMethodWrap');
    const whatsappFormWrap = document.getElementById('whatsappFormWrap');

    if (idx < 0) {
        calWrap.style.display = 'none';
        dowBlockWrap.style.display = 'none';
        area.innerHTML = `<p class="time_empty">${t('select_hospital_date')}</p>`;
        return;
    }

    dowBlockWrap.style.display = 'block';
    renderTimeRangeSetting(idx);
    renderDowButtons(idx);
    calWrap.style.display = 'block';
    renderAdminCal();
    area.innerHTML = `<p class="time_empty">${t('select_date')}</p>`;

    // WA 폼이 열려있으면 캘린더도 즉시 갱신
    if (whatsappFormWrap && whatsappFormWrap.style.display !== 'none') {
        waSelectedDate = '';
        document.getElementById('wa_date').value = '';
        renderWaCal();
        populateWaTimeSelect();
    }
}

/* ── 시간 범위 select 옵션 생성 (00:00 ~ 23:30, 30분 단위) ── */
function _buildTimeOptions(selectEl, selectedVal) {
    selectEl.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        for (let m of [0, 30]) {
            const val = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            if (val === selectedVal) opt.selected = true;
            selectEl.appendChild(opt);
        }
    }
}

/* ── 저장된 시간 범위를 select에 반영 ── */
function renderTimeRangeSetting(idx) {
    const startEl = document.getElementById('timeRangeStart');
    const endEl   = document.getElementById('timeRangeEnd');
    if (!startEl || !endEl) return;

    const config = getHospitalConfig(idx);
    const times  = config.times || [];

    // 저장된 times 배열에서 첫/마지막 값으로 시작·종료 유추
    const defaultStart = times.length ? times[0]                  : '09:00';
    const defaultEnd   = times.length ? times[times.length - 1]   : '20:30';

    _buildTimeOptions(startEl, defaultStart);
    _buildTimeOptions(endEl,   defaultEnd);

    const applyTimeRange = () => {
        const startTime = startEl.value;
        const endTime   = endEl.value;
        if (startTime >= endTime) return;
        const times = _generateTimes(startTime, endTime);
        const existing = getHospitalConfig(idx);
        const newConfig = Object.assign({}, existing, { times });
        localStorage.setItem('bgg_hconfig_' + idx, JSON.stringify(newConfig));
        renderTimeBlocking();
        populateWaTimeSelect();
    };

    startEl.onchange = applyTimeRange;
    endEl.onchange   = applyTimeRange;

    // ── 휴게시간 select 초기화 ──
    const breakStartEl = document.getElementById('breakStart');
    const breakEndEl   = document.getElementById('breakEnd');
    const breakChk     = document.getElementById('breakLockEnabled');
    if (!breakStartEl || !breakEndEl || !breakChk) return;

    const savedBreakStart   = config.breakStart   || '12:00';
    const savedBreakEnd     = config.breakEnd     || '13:00';
    const savedBreakEnabled = config.breakEnabled ?? false;

    _buildTimeOptions(breakStartEl, savedBreakStart);
    _buildTimeOptions(breakEndEl,   savedBreakEnd);
    breakChk.checked = savedBreakEnabled;

    const applyBreak = () => {
        const existing  = getHospitalConfig(idx);
        const newConfig = Object.assign({}, existing, {
            breakEnabled : breakChk.checked,
            breakStart   : breakStartEl.value,
            breakEnd     : breakEndEl.value,
        });
        localStorage.setItem('bgg_hconfig_' + idx, JSON.stringify(newConfig));
        renderTimeBlocking();
        populateWaTimeSelect();
    };

    breakStartEl.onchange = applyBreak;
    breakEndEl.onchange   = applyBreak;
    breakChk.onchange     = applyBreak;
}

/* ── startTime~endTime 사이 30분 단위 배열 생성 ── */
function _generateTimes(startTime, endTime) {
    const result = [];
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur <= end) {
        const hh = String(Math.floor(cur / 60)).padStart(2, '0');
        const mm = String(cur % 60).padStart(2, '0');
        result.push(hh + ':' + mm);
        cur += 30;
    }
    return result;
}

function renderDowButtons(idx) {
    const saved = JSON.parse(localStorage.getItem('bgg_closed_days_' + idx) || '[]');
    const wrap = document.getElementById('dowBtns');
    wrap.innerHTML = '';
    getDowLabels().forEach((label, i) => {
        const btn = document.createElement('button');
        btn.className = 'dow_btn' + (saved.includes(i) ? ' active' : '');
        btn.textContent = label;
        btn.dataset.dow = i;
        btn.addEventListener('click', () => btn.classList.toggle('active'));
        wrap.appendChild(btn);
    });
}


function renderAdminCal() {
    const idx = getAdminHospitalIdx();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const ADM_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    document.getElementById('adminCalTitle').textContent =
        `${adminCalYear} / ${adminCalMonth + 1}`;

    const grid = document.getElementById('adminCalGrid');
    grid.innerHTML = '';

    const blockedData = idx >= 0
        ? JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}')
        : {};
    const closedDates = idx >= 0
        ? JSON.parse(localStorage.getItem('bgg_closed_dates_' + idx) || '[]')
        : [];
    const closedDays = idx >= 0
        ? JSON.parse(localStorage.getItem('bgg_closed_days_' + idx) || '[]')
        : [];
    const totalTimes = idx >= 0 ? (getHospitalConfig(idx).times || []).length : 0;

    ADM_DAY_LABELS.forEach(d => {
        const el = document.createElement('div');
        el.className = 'day_label'; el.textContent = d;
        grid.appendChild(el);
    });

    const firstDay = new Date(adminCalYear, adminCalMonth, 1).getDay();
    const daysInMonth = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'day empty'; grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(adminCalYear, adminCalMonth, d);
        const dow = date.getDay();
        const isPast = date < today;
        const dateStr = `${adminCalYear}-${String(adminCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isDayOff = closedDates.includes(dateStr);
        const isDowOff = closedDays.includes(dow);
        const hasBlock = totalTimes > 0 && (blockedData[dateStr]?.length ?? 0) >= totalTimes;

        let cls = 'day';
        if (dow === 0) cls += ' sun';
        if (dow === 6) cls += ' sat';
        if (isPast) cls += ' past';
        if (dateStr === adminSelectedDate) cls += ' selected';
        if (isDayOff) cls += ' admin_dayoff';
        else if (isDowOff) cls += ' admin_dowoff';
        else if (hasBlock && !isPast) cls += ' has_block';

        const el = document.createElement('div');
        el.className = cls;
        el.textContent = d;
        el.addEventListener('click', () => selectAdminDate(dateStr, el));
        grid.appendChild(el);
    }
}

function selectAdminDate(dateStr, el) {
    adminSelectedDate = dateStr;
    waSelectedTime = '';
    document.querySelectorAll('#adminCalGrid .day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    renderTimeBlocking();
}

function renderTimeBlocking() {
    const idx = getAdminHospitalIdx();
    const area = document.getElementById('timeBlockArea');

    if (idx < 0 || !adminSelectedDate) {
        area.innerHTML = `<p class="time_empty">${t('select_date')}</p>`;
        return;
    }

    const config = getHospitalConfig(idx);
    const times = config.times || [];
    const blockedData = JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}');
    const closedDates = JSON.parse(localStorage.getItem('bgg_closed_dates_' + idx) || '[]');
    const blocked = blockedData[adminSelectedDate] || [];
    const isDayOff = closedDates.includes(adminSelectedDate);

    const hintMap = {
        kr: '클릭하면 <strong>차단</strong> / 해제 전환됩니다.',
        cn: '点击可切换 <strong>封锁</strong> / 解除。',
        en: 'Click to toggle <strong>block</strong> / unblock.',
    };
    const dayOffLabelMap = {
        kr: '이 날 하루 전체 휴무',
        cn: '当天全天休息',
        en: 'Day off (entire day)',
    };
    const lang = window._currentLang || 'kr';

    area.innerHTML = `
        <div class="time_block_header">
            <span class="time_block_date">${adminSelectedDate}</span>
            <span class="time_hint">${hintMap[lang]}</span>
        </div>
        <label class="dayoff_toggle_row">
            <input type="checkbox" id="dayOffCheck" ${isDayOff ? 'checked' : ''}
                   onchange="onDayOffToggle(this.checked)">
            <span class="dayoff_toggle_label">${dayOffLabelMap[lang]}</span>
        </label>
        <div class="time_grid_admin" id="timeGridAdmin"
             ${isDayOff ? 'style="opacity:0.35;pointer-events:none;"' : ''}></div>`;

    // 휴게시간 목록 생성
    const breakTimes = [];
    if (config.breakEnabled && config.breakStart && config.breakEnd) {
        let curMin = config.breakStart.split(':').map(Number).reduce((h, m) => h * 60 + m);
        const endTotal = config.breakEnd.split(':').map(Number).reduce((h, m) => h * 60 + m);
        while (curMin < endTotal) {
            const hh = String(Math.floor(curMin / 60)).padStart(2, '0');
            const mm = String(curMin % 60).padStart(2, '0');
            breakTimes.push(hh + ':' + mm);
            curMin += 30;
        }
    }

    const grid = document.getElementById('timeGridAdmin');
    times.forEach(tm => {
        const btn = document.createElement('button');
        const isBlocked = blocked.includes(tm);
        const isBreak = breakTimes.includes(tm);
        btn.className = 'time_btn_admin' + (isBlocked ? ' blocked' : '') + (isBreak ? ' break_locked' : '');
        btn.textContent = tm;
        if (isBreak) {
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => {
                btn.classList.toggle('blocked');
                saveBlockedTimes();
                populateWaTimeSelect();
            });
        }
        grid.appendChild(btn);
    });
}

function onDayOffToggle(checked) {
    const gridWrap = document.getElementById('timeGridAdmin');
    if (gridWrap) {
        gridWrap.style.opacity = checked ? '0.35' : '1';
        gridWrap.style.pointerEvents = checked ? 'none' : '';
    }
}

/* 시간 차단 상태만 즉시 저장 (버튼 토글 시 자동 호출) */
/* 立即保存时间阻断状态( 切换按钮时自动调用) */
function saveBlockedTimes() {
    const idx = getAdminHospitalIdx();
    if (idx < 0 || !adminSelectedDate) return;
    const blockedKey = 'bgg_blocked_' + idx;
    const blockedData = JSON.parse(localStorage.getItem(blockedKey) || '{}');
    const nowBlocked = [...document.querySelectorAll('#timeGridAdmin .time_btn_admin.blocked')]
        .map(b => b.textContent);
    blockedData[adminSelectedDate] = nowBlocked;
    if (nowBlocked.length === 0) delete blockedData[adminSelectedDate];
    localStorage.setItem(blockedKey, JSON.stringify(blockedData));
    renderAdminCal();
    document.querySelectorAll('#adminCalGrid .day').forEach(el => {
        if (el.textContent === String(parseInt(adminSelectedDate.split('-')[2]))) {
            el.classList.add('selected');
        }
    });
}

function saveBlocked() {
    const idx = getAdminHospitalIdx();
    if (idx < 0) { alert(t('alert_select_hospital')); return; }

    // 운영 시간 저장 → bgg_hconfig_{idx}
    const startEl = document.getElementById('timeRangeStart');
    const endEl   = document.getElementById('timeRangeEnd');
    if (startEl && endEl) {
        const startTime = startEl.value;
        const endTime   = endEl.value;
        if (startTime >= endTime) {
            alert('종료 시간은 시작 시간보다 커야 합니다.');
            return;
        }
        const times = _generateTimes(startTime, endTime);
        const existing = getHospitalConfig(idx);
        const newConfig = Object.assign({}, existing, { times });
        localStorage.setItem('bgg_hconfig_' + idx, JSON.stringify(newConfig));
    }

    // 휴게시간 저장
    const breakStartEl = document.getElementById('breakStart');
    const breakEndEl   = document.getElementById('breakEnd');
    const breakChk     = document.getElementById('breakLockEnabled');
    if (breakStartEl && breakEndEl && breakChk) {
        const existing = getHospitalConfig(idx);
        const newConfig = Object.assign({}, existing, {
            breakEnabled : breakChk.checked,
            breakStart   : breakStartEl.value,
            breakEnd     : breakEndEl.value,
        });
        localStorage.setItem('bgg_hconfig_' + idx, JSON.stringify(newConfig));
    }

    // 요일 휴무 저장 (기존 saveClosedDays 통합)
    const selected = [...document.querySelectorAll('#dowBtns .dow_btn.active')]
        .map(b => Number(b.dataset.dow));
    localStorage.setItem('bgg_closed_days_' + idx, JSON.stringify(selected));

    // 날짜 관련 저장 (날짜 선택 시에만)
    if (adminSelectedDate) {
        const isDayOff = document.getElementById('dayOffCheck')?.checked ?? false;

        const closedDatesKey = 'bgg_closed_dates_' + idx;
        let closedDates = JSON.parse(localStorage.getItem(closedDatesKey) || '[]');
        if (isDayOff) {
            if (!closedDates.includes(adminSelectedDate)) closedDates.push(adminSelectedDate);
        } else {
            closedDates = closedDates.filter(d => d !== adminSelectedDate);
        }
        localStorage.setItem(closedDatesKey, JSON.stringify(closedDates));

        const blockedKey = 'bgg_blocked_' + idx;
        const blockedData = JSON.parse(localStorage.getItem(blockedKey) || '{}');
        const nowBlocked = [...document.querySelectorAll('#timeGridAdmin .time_btn_admin.blocked')]
            .map(b => b.textContent);

        if (isDayOff) {
            delete blockedData[adminSelectedDate];
        } else {
            blockedData[adminSelectedDate] = nowBlocked;
        }
        localStorage.setItem(blockedKey, JSON.stringify(blockedData));

        document.querySelectorAll('#adminCalGrid .day').forEach(el => {
            if (el.textContent === String(parseInt(adminSelectedDate.split('-')[2]))) {
                el.classList.add('selected');
            }
        });
    }

    renderAdminCal();
    showMsg('reserve_msg', adminSelectedDate ? `${adminSelectedDate} SAVED` : 'SAVED');
}

/* =====================================================
   접수방법 (WhatsApp / Homepage)
   接收方法 (WhatsApp/ Homepage)
   ===================================================== */
function selectReceptionMethod(method) {
    const blockPanel = document.getElementById('blockPanel');
    const whatsappFormWrap = document.getElementById('whatsappFormWrap');
    const btnBlock = document.getElementById('btn_block');
    const btnWa = document.getElementById('btn_whatsapp');

    if (method === 'whatsapp') {
        blockPanel.style.display = 'none';
        whatsappFormWrap.style.display = 'block';
        btnBlock.classList.remove('active');
        btnWa.classList.add('active');
        window._waMode = true;
        initWaCal();
        populateWaTimeSelect();
    } else {
        whatsappFormWrap.style.display = 'none';
        blockPanel.style.display = 'grid';
        btnWa.classList.remove('active');
        btnBlock.classList.add('active');
        window._waMode = false;
        if (adminSelectedDate) renderTimeBlocking();
    }
}

/* =====================================================
   WA 폼 전용 캘린더
   WA表单专用日历
   ===================================================== */
let waCalYear = new Date().getFullYear();
let waCalMonth = new Date().getMonth();
let waSelectedDate = '';

function initWaCal() {
    const prevBtn = document.getElementById('waPrevMonth');
    const nextBtn = document.getElementById('waNextMonth');
    if (!prevBtn || !nextBtn) return;
    prevBtn.onclick = () => {
        const today = new Date();
        if (waCalYear === today.getFullYear() && waCalMonth === today.getMonth()) return;
        waCalMonth--;
        if (waCalMonth < 0) { waCalMonth = 11; waCalYear--; }
        renderWaCal();
    };
    nextBtn.onclick = () => {
        waCalMonth++;
        if (waCalMonth > 11) { waCalMonth = 0; waCalYear++; }
        renderWaCal();
    };
    renderWaCal();
}

function renderWaCal() {
    const grid = document.getElementById('waCalGrid');
    if (!grid) return;

    const mainSel = document.getElementById('hospitalSelect');
    const hospitalName = mainSel && mainSel.selectedIndex > 0 ? mainSel.options[mainSel.selectedIndex].text : '';
    const hospitals = getHospitals();
    const h = hospitals.find(h => h.name === hospitalName);
    const idx = h ? h.id : -1;

    const closedDays = idx >= 0 ? JSON.parse(localStorage.getItem('bgg_closed_days_' + idx) || '[]') : [];
    const closedDates = idx >= 0 ? JSON.parse(localStorage.getItem('bgg_closed_dates_' + idx) || '[]') : [];
    const blockedData = idx >= 0 ? JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}') : {};
    const totalTimes = idx >= 0 ? (getHospitalConfig(idx).times || []).length : 0;

    document.getElementById('waCalTitle').textContent = `${waCalYear} / ${waCalMonth + 1}`;
    grid.innerHTML = '';

    const ADM_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    ADM_DAY_LABELS.forEach(d => {
        const el = document.createElement('div');
        el.className = 'day_label'; el.textContent = d;
        grid.appendChild(el);
    });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstDay = new Date(waCalYear, waCalMonth, 1).getDay();
    const daysInMonth = new Date(waCalYear, waCalMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'day empty'; grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(waCalYear, waCalMonth, d);
        const dow = date.getDay();
        const isPast = date < today;
        const dateStr = `${waCalYear}-${String(waCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isDayOff = closedDates.includes(dateStr);
        const isDowOff = closedDays.includes(dow);
        const hasBlock = totalTimes > 0 && (blockedData[dateStr]?.length ?? 0) >= totalTimes;

        let cls = 'day';
        if (dow === 0) cls += ' sun';
        if (dow === 6) cls += ' sat';
        if (isPast) cls += ' past';
        if (dateStr === waSelectedDate) cls += ' selected';
        if (isDayOff) cls += ' admin_dayoff';
        else if (isDowOff) cls += ' admin_dowoff';
        else if (hasBlock && !isPast) cls += ' has_block';

        const el = document.createElement('div');
        el.className = cls;
        el.textContent = d;

        const isDisabled = isPast || isDayOff || isDowOff;
        if (!isDisabled) {
            el.addEventListener('click', () => selectWaDate(dateStr, el));
        }
        grid.appendChild(el);
    }
}

function selectWaDate(dateStr, el) {
    waSelectedDate = dateStr;
    document.getElementById('wa_date').value = dateStr;
    document.querySelectorAll('#waCalGrid .day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    const timeCol = document.getElementById('wa_time_col');
    if (timeCol) timeCol.style.display = '';
    populateWaTimeSelect();
}

/* WA 시간 select 채우기 (선택된 날짜의 차단 시간 제외) */
/* 填充 WA 时间 select (已选日期的屏蔽时间除外) */
function populateWaTimeSelect() {
    const grid = document.getElementById('wa_time_grid');
    const hiddenInput = document.getElementById('wa_time');
    if (!grid) return;

    const idx = getAdminHospitalIdx();
    const config = idx >= 0 ? getHospitalConfig(idx) : null;
    const times = config ? config.times : [];

    const dateVal = document.getElementById('wa_date')?.value;
    const blockedData = idx >= 0 ? JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}') : {};
    const blocked = dateVal ? (blockedData[dateVal] || []) : [];

    grid.innerHTML = '';
    if (hiddenInput) hiddenInput.value = '';
    waSelectedTime = '';
    if (!document.getElementById('wa_date')?.value) {
        const timeCol = document.getElementById('wa_time_col');
        if (timeCol) timeCol.style.display = 'none';
        return;
    }

    // 휴게시간 목록 생성
    const breakTimes = [];
    if (config?.breakEnabled && config.breakStart && config.breakEnd) {
        let curMin = config.breakStart.split(':').map(Number).reduce((h, m) => h * 60 + m);
        const endTotal = config.breakEnd.split(':').map(Number).reduce((h, m) => h * 60 + m);
        while (curMin < endTotal) {
            const hh = String(Math.floor(curMin / 60)).padStart(2, '0');
            const mm = String(curMin % 60).padStart(2, '0');
            breakTimes.push(hh + ':' + mm);
            curMin += 30;
        }
    }

    // 당일 예약 시 현재 시각 이전 시간대 차단 / 当天预约时屏蔽当前时间之前的时间段
    const waTodayStr = (function() {
        const n = new Date();
        return n.getFullYear() + '-' +
            String(n.getMonth() + 1).padStart(2, '0') + '-' +
            String(n.getDate()).padStart(2, '0');
    })();
    const waIsToday = (dateVal === waTodayStr);
    const waNowMinutes = waIsToday ? (function() {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
    })() : -1;

    times.forEach(tm => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isBlocked = blocked.includes(tm);
        const isBreak = breakTimes.includes(tm);
        // 당일 이미 지나간 시간 / 当天已过时间
        const isPastTime = waIsToday && (function() {
            const parts = tm.split(':').map(Number);
            return parts[0] * 60 + parts[1] <= waNowMinutes;
        })();
        const isDisabled = isBlocked || isBreak || isPastTime;
        btn.className = 'time_btn_admin' + (isBlocked ? ' blocked' : '') + (isBreak ? ' break_locked' : '') + (isPastTime && !isBlocked ? ' blocked' : '');
        btn.textContent = tm;
        btn.disabled = isDisabled;
        if (!isDisabled) {
            btn.addEventListener('click', () => {
                grid.querySelectorAll('.time_btn_admin').forEach(b => b.classList.remove('wa_active'));
                btn.classList.add('wa_active');
                waSelectedTime = tm;
                if (hiddenInput) hiddenInput.value = tm;
            });
        }
        grid.appendChild(btn);
    });
}


function submitWhatsappBooking() {
    const _hSel = document.getElementById('hospitalSelect');
    const hospital = (_hSel && _hSel.selectedIndex > 0) ? _hSel.options[_hSel.selectedIndex].text.trim() : '';
    const date = document.getElementById('wa_date')?.value?.trim();
    const time = document.getElementById('wa_time')?.value?.trim();
    const name = document.getElementById('wa_name')?.value?.trim();
    const phone = document.getElementById('wa_phone')?.value?.trim().replace(/-/g, '');
    const nationality = document.getElementById('wa_nationality')?.value?.trim();
    const email = document.getElementById('wa_email')?.value?.trim();
    const treatment = document.getElementById('wa_treatment')?.value?.trim() || '';
    const request = document.getElementById('wa_request')?.value?.trim();

    if (!hospital) { alert('병원을 선택하세요.'); return; }
    if (!date) { alert('예약 날짜를 선택하세요.'); return; }
    if (!time) { alert('예약 시간을 선택하세요.'); return; }
    if (!name) { alert('이름을 입력하세요.'); return; }
    if (!phone) { alert('전화번호를 입력하세요.'); return; }
    if (!nationality) { alert('국적을 입력하세요.'); return; }
    if (!email) { alert('이메일을 입력하세요.'); return; }

    // 차단된 시간 재검증
    const _idx = getAdminHospitalIdx();
    if (_idx >= 0) {
        const _blocked = JSON.parse(localStorage.getItem('bgg_blocked_' + _idx) || '{}');
        if ((_blocked[date] || []).includes(time)) {
            alert('선택한 시간은 차단된 시간입니다. 다른 시간을 선택하세요.');
            return;
        }
    }

    const reservations = getReservations();
    reservations.push({
        id: Date.now().toString(),
        hospital: hospital,
        date: date,
        time: time,
        name: name,
        phone: phone,
        nationality: nationality,
        email: email,
        treatment: treatment,
        request: request || '',
        status: 'waiting',
        source: 'whatsapp',
    });
    saveReservations(reservations);

    // 예약 시간 차단
    // 屏蔽预约时间
    const hospitals = getHospitals();
    const h = hospitals.find(function (h) { return h.name === hospital; });
    if (h && h.id !== undefined) {
        const blockKey = 'bgg_blocked_' + h.id;
        let blocked = {};
        try { blocked = JSON.parse(localStorage.getItem(blockKey) || '{}'); } catch (e) { }
        if (!blocked[date]) blocked[date] = [];
        if (!blocked[date].includes(time)) blocked[date].push(time);
        localStorage.setItem(blockKey, JSON.stringify(blocked));
    }

    // 폼 초기화
    // 初始化表单
    ['wa_name', 'wa_phone', 'wa_nationality', 'wa_email', 'wa_treatment', 'wa_request'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 폼 날짜/시간 초기화
    // 初始化表单日期/时间
    waSelectedDate = '';
    const waDateEl = document.getElementById('wa_date');
    if (waDateEl) waDateEl.value = '';
    renderWaCal();
    const waTimeEl = document.getElementById('wa_time');
    if (waTimeEl) { waTimeEl.innerHTML = '<option value="">-- 시간 선택 --</option>'; }

    showMsg('wa_msg', '예약이 등록되었습니다. 아래 명단을 확인하세요.');
    renderReceivedList();
    renderPendingList();

    // 접수 대기 탭 활성화 후 리스트로 스크롤
    // 激活待处理标签后滚动至列表
    const listTab = document.querySelector('.list_btn.received_btn');
    if (listTab) {
        showListTab('received', listTab);
    }
    const newRow = document.getElementById('res_row_' + reservations[reservations.length - 1].id);
    if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        newRow.classList.add('new_entry_highlight');
        setTimeout(() => newRow.classList.remove('new_entry_highlight'), 2500);
    } else {
        const listSection = document.getElementById('list_received');
        if (listSection) listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/* =====================================================
   드래그 정렬
   拖动排序
   ===================================================== */

/**
 * containerEl 내의 itemSelector 요소들을 드래그로 순서 변경 가능하게 만든다.
 * onReorder(): 드롭 완료 시 호출되는 콜백
 */
function makeSortable(containerEl, itemSelector, onReorder) {
    if (!containerEl) return;
    let dragSrc = null;
    let _scrollRaf = null;
    const SCROLL_ZONE = 200; // px from edge to trigger scroll
    const SCROLL_SPEED = 30; // px per frame

    function autoScroll(clientY) {
        cancelAnimationFrame(_scrollRaf);
        const vh = window.innerHeight;
        let speed = 0;
        if (clientY > vh - SCROLL_ZONE) {
            speed = SCROLL_SPEED * ((clientY - (vh - SCROLL_ZONE)) / SCROLL_ZONE);
        } else if (clientY < SCROLL_ZONE) {
            speed = -SCROLL_SPEED * ((SCROLL_ZONE - clientY) / SCROLL_ZONE);
        }
        if (speed !== 0) {
            _scrollRaf = requestAnimationFrame(function tick() {
                window.scrollBy(0, speed);
                _scrollRaf = requestAnimationFrame(tick);
            });
        }
    }

    function stopAutoScroll() {
        cancelAnimationFrame(_scrollRaf);
        _scrollRaf = null;
    }

    function attachItem(item) {
        // partner_hospital_block / promo_card_editor / edit_card: 테두리 영역에서만 드래그 활성화
        const isBorderDrag = item.classList.contains('partner_hospital_block') ||
            item.classList.contains('promo_card_editor') ||
            item.classList.contains('edit_card');
        const isHorizontalGrid = item.classList.contains('promo_card_editor') ||
            item.classList.contains('partner_hospital_block') ||
            item.classList.contains('edit_card');
        const BORDER_ZONE = 28; // px

        // 테두리용 플로팅 아이콘 추가
        let floatIcon = null;
        if (isBorderDrag) {
            if (!item.querySelector('.border_drag_icon')) {
                floatIcon = document.createElement('span');
                floatIcon.className = 'border_drag_icon';
                floatIcon.innerHTML = '<i class="fa-solid fa-up-down-left-right"></i>';
                item.appendChild(floatIcon);
            } else {
                floatIcon = item.querySelector('.border_drag_icon');
            }

            function isOnBorder(e) {
                const r = item.getBoundingClientRect();
                return (
                    e.clientX - r.left < BORDER_ZONE ||
                    r.right - e.clientX < BORDER_ZONE ||
                    e.clientY - r.top < BORDER_ZONE ||
                    r.bottom - e.clientY < BORDER_ZONE
                );
            }

            item.addEventListener('mousemove', e => {
                const onBorder = isOnBorder(e);
                item.classList.toggle('on_border', onBorder);
                if (onBorder) {
                    const r = item.getBoundingClientRect();
                    floatIcon.style.left = (e.clientX - r.left + 14) + 'px';
                    floatIcon.style.top = (e.clientY - r.top - 11) + 'px';
                    floatIcon.classList.add('visible');
                } else {
                    floatIcon.classList.remove('visible');
                }
            });

            item.addEventListener('mouseleave', () => {
                item.classList.remove('on_border');
                floatIcon.classList.remove('visible');
            });

            item.addEventListener('mousedown', e => {
                item.setAttribute('draggable', isOnBorder(e) ? 'true' : 'false');
            });
        } else {
            item.setAttribute('draggable', 'true');
        }

        // partner_hospital_block: 초기에 draggable 비활성화 (텍스트 선택 허용)
        if (isBorderDrag) item.setAttribute('draggable', 'false');

        item.addEventListener('dragstart', e => {
            if (isBorderDrag && item.getAttribute('draggable') !== 'true') {
                e.preventDefault();
                return;
            }
            dragSrc = item;
            item.classList.add('dragging');
            if (floatIcon) floatIcon.classList.remove('visible');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            if (isBorderDrag) item.setAttribute('draggable', 'false');
            item.classList.remove('dragging');
            containerEl.querySelectorAll(itemSelector)
                .forEach(i => i.classList.remove('drag_over', 'drop_before', 'drop_after'));
            dragSrc = null;
            stopAutoScroll();
        });

        item.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            autoScroll(e.clientY);
            if (item === dragSrc) return;

            // 라인 인디케이터 방식
            // promo_card_editor(가로 그리드): 좌/우 절반 기준
            containerEl.querySelectorAll(itemSelector)
                .forEach(i => { i.classList.remove('drop_before', 'drop_after', 'drag_over'); });
            const rect = item.getBoundingClientRect();
            const isBefore = isHorizontalGrid
                ? e.clientX < rect.left + rect.width / 2
                : e.clientY < rect.top + rect.height / 2;
            if (isBefore) {
                item.classList.add('drop_before');
            } else {
                item.classList.add('drop_after');
            }
        });

        item.addEventListener('dragleave', e => {
            if (item.contains(e.relatedTarget)) return;
            item.classList.remove('drop_before', 'drop_after', 'drag_over');
        });

        item.addEventListener('drop', e => {
            e.preventDefault();
            if (!dragSrc || dragSrc === item) return;
            const hasBefore = item.classList.contains('drop_before');
            item.classList.remove('drop_before', 'drop_after', 'drag_over');
            if (hasBefore) item.before(dragSrc);
            else item.after(dragSrc);
            onReorder();
        });
    }

    containerEl.querySelectorAll(itemSelector).forEach(attachItem);

    // 그리드 빈 공간(마지막 카드 이후)에 드롭 → 맨 마지막으로 이동
    containerEl.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    containerEl.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragSrc) return;
        // 드롭 타겟이 카드 위면 카드의 drop 이벤트가 처리하므로 여기선 빈 공간만
        const target = e.target.closest(itemSelector);
        if (target) return;
        // 빈 공간 드롭 → 맨 마지막으로
        containerEl.appendChild(dragSrc);
        onReorder();
    });
}

/* 파트너 병원 – DOM 순서 기반 collect */
/* 合作伙伴医院 – 基于 DOM 顺序的 collect */
function collectPartnerHospitalsDOMOrder() {
    const wrap = document.getElementById('partner_list_editor');
    const blocks = wrap ? wrap.querySelectorAll('.partner_hospital_block') : [];
    const stored = getHospitals();
    return Array.from(blocks).map(block => {
        const id = parseInt(block.id.replace('ph_block_', ''));
        const orig = stored.find(h => h.id === id) || {};
        const nameEl = document.getElementById('ph_name_' + id);
        const tagEl = document.getElementById('ph_tag_' + id);
        return {
            id,
            name: nameEl ? nameEl.value : (orig.name || ''),
            tag: tagEl ? tagEl.value : (orig.tag || ''),
            img: ('ph_img_' + id) in pending ? pending['ph_img_' + id] : (orig.img || ''),
        };
    });
}

/* 프로모션 카드 – DOM 순서 기반 collect (원래 인덱스 기준으로 값 읽기) */
/* 促销卡 – 基于 DOM 顺序的 collect (按原始索引读取值) */
function collectPromoPageCardsDOMOrder() {
    const wrap = document.getElementById('promo_page_cards_editor');
    const blocks = wrap ? wrap.querySelectorAll('.promo_card_editor') : [];
    const stored = getAdminPromoPageCards();
    return Array.from(blocks).map(block => {
        const origIdx = parseInt(block.id.replace('ppc_block_', ''));
        const orig = stored[origIdx] || {};
        return {
            img: ('ppc_img_' + origIdx) in pending
                ? pending['ppc_img_' + origIdx]
                : (orig.img || ''),
            hospitalId: parseInt(document.getElementById('ppc_hospital_' + origIdx)?.value) || 1,
            cardTag: document.getElementById('ppc_tag_' + origIdx)?.value || '',
            badge: document.getElementById('ppc_badge_' + origIdx)?.value || '',
            cardTitle: document.getElementById('ppc_title_' + origIdx)?.value || '',
            cardDesc: document.getElementById('ppc_desc_' + origIdx)?.value || '',
        };
    });
}

/* =====================================================
   유틸
   UTIL
   ===================================================== */
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function val(id) {
    return document.getElementById(id)?.value ?? '';
}

function showMsg(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3000);
}

/* =====================================================
   예약자 명단 탭 전환
   预约者名单转换
   ===================================================== */
function showListTab(tab, btn) {
    document.querySelectorAll('.list_btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('list_received').style.display = tab === 'received' ? '' : 'none';
    document.getElementById('list_pending').style.display = tab === 'pending' ? '' : 'none';
}

/* =====================================================
   예약자 데이터 로드 / 저장
   加载/ 保存订户数据
   ===================================================== */
function getReservations() {
    try { return JSON.parse(localStorage.getItem('bgg_reservations') || '[]'); } catch (e) { return []; }
}

function saveReservations(list) {
    localStorage.setItem('bgg_reservations', JSON.stringify(list));
}

/* =====================================================
   접수 대기 목록 렌더
   受理登记目录图
   ===================================================== */
function getSortedReservations(list) {
    const sel = document.getElementById('reserveSortSelect');
    const sort = sel ? sel.value : 'date_asc';
    if (sort === 'received') return list.slice();
    return list.slice().sort((a, b) => {
        const da = a.date || '', db = b.date || '';
        const ta = a.time || '', tb = b.time || '';
        if (sort === 'date_desc') return da > db ? -1 : da < db ? 1 : ta.localeCompare(tb);
        return da < db ? -1 : da > db ? 1 : ta.localeCompare(tb);
    });
}

function applyReserveSort() {
    renderReceivedList();
    renderPendingList();
}

function renderReceivedList() {
    const body = document.getElementById('received_body');
    if (!body) return;
    const query = (document.getElementById('reserveSearchInput')?.value || '').trim().toLowerCase();
    let list = getSortedReservations(getReservations().filter(r => r.status === 'waiting'));
    if (query) {
        list = list.filter(r =>
            (r.name || '').toLowerCase().includes(query) ||
            (r.phone || '').toLowerCase().includes(query) ||
            (r.email || '').toLowerCase().includes(query)
        );
    }
    if (list.length === 0) {
        body.innerHTML = `<p class="list_empty">${t('no_reservations')}</p>`;
        return;
    }
    body.innerHTML = list.map(r => `
        <div class="reserve_person" id="res_row_${r.id}">
            <div class="reserve_cell name res_name_link" onclick="openResDetailPopup('${r.id}')">${esc(r.name)}</div>
            <div class="reserve_cell hospital">${esc(r.hospital)}</div>
            <div class="reserve_cell date">${esc(r.date)}</div>
            <div class="reserve_cell time">${esc(r.time)}</div>
            <div class="reserve_cell source">
                ${r.source === 'whatsapp'
            ? '<span class="source_badge source_whatsapp">WhatsApp</span>'
            : '<span class="source_badge source_homepage">Homepage</span>'}
            </div>
            <div class="reserve_cell confirm">
                <button class="confirm_btn" onclick="handleReservation('${r.id}','confirmed')">${t('confirm_btn')}</button>
                <button class="cancel_btn" onclick="handleReservation('${r.id}','cancelled')">${t('cancel_btn')}</button>
            </div>
        </div>`).join('');
}

/* =====================================================
   접수 완료 목록 렌더
   接收完成列表渲染器
   ===================================================== */
function renderPendingList() {
    const body = document.getElementById('pending_body');
    if (!body) return;
    const query = (document.getElementById('reserveSearchInput')?.value || '').trim().toLowerCase();
    let list = getSortedReservations(getReservations().filter(r => r.status === 'confirmed' || r.status === 'cancelled'));
    if (query) {
        list = list.filter(r =>
            (r.name || '').toLowerCase().includes(query) ||
            (r.phone || '').toLowerCase().includes(query) ||
            (r.email || '').toLowerCase().includes(query)
        );
    }
    if (list.length === 0) {
        body.innerHTML = `<p class="list_empty">${t('no_reservations')}</p>`;
        return;
    }
    body.innerHTML = list.map(r => `
        <div class="reserve_person" id="res_row_done_${r.id}">
            <div class="reserve_cell name res_name_link" onclick="openResDetailPopup('${r.id}')">${esc(r.name)}</div>
            <div class="reserve_cell hospital">${esc(r.hospital)}</div>
            <div class="reserve_cell date">${esc(r.date)}</div>
            <div class="reserve_cell time">${esc(r.time)}</div>
            <div class="reserve_cell source">
                ${r.source === 'whatsapp'
            ? '<span class="source_badge source_whatsapp">WhatsApp</span>'
            : '<span class="source_badge source_homepage">Homepage</span>'}
            </div>
            <div class="reserve_cell confirm">
                <span class="status_badge ${r.status === 'confirmed' ? 'status_confirmed' : 'status_cancelled'}">
                    ${r.status === 'confirmed' ? t('status_confirmed_lbl') : t('status_cancelled_lbl')}
                </span>
                ${r.status === 'confirmed' ? `<button class="cancel_btn cancel_icon_btn" onclick="handleReservation('${r.id}','cancelled')" title="${t('cancel_btn')}"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            </div>
        </div>`).join('');
}


/* =====================================================
   병원 이름으로 병원 idx(id) 반환
   以医院名义返还医院idx（id）
   ===================================================== */
function getHospitalIdxByName(hospitalName) {
    const hospitals = getHospitals();
    const h = hospitals.find(function (h) { return h.name === hospitalName; });
    return h ? h.id : -1;
}

/* =====================================================
   예약 시간 차단 해제 (취소 시 호출)
   取消预约时间限制( 取消时呼叫)
   ===================================================== */
function unblockReservationTime(hospitalName, date, time) {
    const hIdx = getHospitalIdxByName(hospitalName);
    if (hIdx < 0) return;
    const blockKey = 'bgg_blocked_' + hIdx;
    let blocked = {};
    try { blocked = JSON.parse(localStorage.getItem(blockKey) || '{}'); } catch (e) { }
    if (!blocked[date]) return;
    blocked[date] = blocked[date].filter(function (t) { return t !== time; });
    if (blocked[date].length === 0) delete blocked[date];
    localStorage.setItem(blockKey, JSON.stringify(blocked));
}

/* =====================================================
   확정 / 취소 처리 → 접수 완료 탭으로 이동
   确定/取消处理 → 移动到接收完成标签
   ===================================================== */
function handleReservation(id, newStatus) {
    if (newStatus === 'cancelled') {
        if (!confirm(t('confirm_cancel_reservation'))) return;
    }
    const list = getReservations();
    const idx = list.findIndex(r => r.id === id);
    if (idx < 0) return;
    const r = list[idx];
    list[idx].status = newStatus;
    saveReservations(list);

    // 취소 처리 시: 같은 병원/날짜/시간에 confirmed 예약이 없으면 시간 차단 해제
    if (newStatus === 'cancelled') {
        const hasSameConfirmed = list.some(function (other) {
            return other.id !== id &&
                other.status === 'confirmed' &&
                other.hospital === r.hospital &&
                other.date === r.date &&
                other.time === r.time;
        });
        if (!hasSameConfirmed) {
            unblockReservationTime(r.hospital, r.date, r.time);
            renderAdminCal();
            if (adminSelectedDate) renderTimeBlocking();
        }
    }

    renderReceivedList();
    renderPendingList();
}

/* =====================================================
   탭 6: 문의 확인
   标签 6: 确认咨询
   ===================================================== */

let _inquiryFilter = 'all';
let _activeInquiryId = null;

function getInquiries() {
    try { return JSON.parse(localStorage.getItem('bgg_inquiries') || '[]'); }
    catch { return []; }
}

function saveInquiries(list) {
    localStorage.setItem('bgg_inquiries', JSON.stringify(list));
}

function initInquiryTab() {
    renderInquiryList();
}

function setInquiryFilter(filter, btn) {
    _inquiryFilter = filter;
    document.querySelectorAll('.inq_filter_btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderInquiryList();
}

function renderInquiryList() {
    const list = getInquiries();
    const query = (document.getElementById('inquirySearchInput')?.value || '').toLowerCase();
    const badge = document.getElementById('inquiry_badge');
    const unreadCount = list.filter(i => i.status === 'unread').length;
    if (badge) {
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
        badge.textContent = unreadCount;
    }

    let filtered = list.filter(inq => {
        if (_inquiryFilter === 'unread' && inq.status !== 'unread') return false;
        if (_inquiryFilter === 'read' && inq.status !== 'read') return false;
        if (query) {
            const hay = (inq.subject + inq.name + inq.email).toLowerCase();
            if (!hay.includes(query)) return false;
        }
        return true;
    });

    // 최신순 정렬
    // 按最新顺序排列
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const body = document.getElementById('inquiry_list_body');
    const empty = document.getElementById('inquiry_empty');
    if (!body) return;

    if (filtered.length === 0) {
        body.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    body.innerHTML = filtered.map(inq => {
        const dateStr = inq.date ? new Date(inq.date).toLocaleDateString() : '';
        const isActive = inq.id === _activeInquiryId ? ' active' : '';
        const isUnread = inq.status === 'unread';
        return `
        <div class="inq_list_item${isActive}${isUnread ? ' unread' : ''}" onclick="openInquiry('${inq.id}')">
            <div class="inq_item_top">
                <span class="inq_item_subject">${esc(inq.subject || t('inq_no_subject'))}</span>
                ${isUnread ? '<span class="inq_new_dot"></span>' : ''}
            </div>
            <div class="inq_item_bottom">
                <span class="inq_item_name">${esc(inq.name)}</span>
                <span class="inq_item_date">${dateStr}</span>
            </div>
        </div>`;
    }).join('');
}

function openInquiry(id) {
    const list = getInquiries();
    const inq = list.find(i => i.id === id);
    if (!inq) return;

    _activeInquiryId = id;

    // 미확인 → 확인 상태 변경
    // 未确认 → 更改为已确认状态
    if (inq.status === 'unread') {
        inq.status = 'read';
        saveInquiries(list);
        renderInquiryList();
    } else {
        // 목록 active 상태만 갱신
        // 仅更新列表的active状态
        document.querySelectorAll('.inq_list_item').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.inq_list_item[onclick="openInquiry('${id}')"]`);
        if (target) target.classList.add('active');
    }

    // 상세 패널 채우기
    // 填充详情面板
    const dateStr = inq.date ? new Date(inq.date).toLocaleString() : '';
    document.getElementById('inq_d_subject').textContent = inq.subject || t('inq_no_subject');
    document.getElementById('inq_d_name').textContent = inq.name || '-';
    document.getElementById('inq_d_phone').textContent = inq.phone || '-';
    document.getElementById('inq_d_email').textContent = inq.email || '-';
    document.getElementById('inq_d_date').textContent = dateStr;
    document.getElementById('inq_d_content').textContent = inq.content || '';
    document.getElementById('inq_d_badge').textContent = inq.status === 'unread' ? t('inq_status_unread') : t('inq_status_read');
    document.getElementById('inq_d_badge').className = 'inq_status_badge ' + (inq.status === 'unread' ? 'unread' : 'read');
    document.getElementById('inq_reply_body').value = '';
    document.getElementById('inq_reply_msg').textContent = '';

    document.getElementById('inquiry_detail_placeholder').style.display = 'none';
    document.getElementById('inquiry_detail_panel').style.display = 'block';
}

function sendInquiryReply() {
    const list = getInquiries();
    const inq = list.find(i => i.id === _activeInquiryId);
    if (!inq) return;

    const replyBody = document.getElementById('inq_reply_body').value.trim();
    if (!replyBody) {
        const msg = document.getElementById('inq_reply_msg');
        msg.textContent = t('inq_reply_empty');
        msg.style.color = '#c0392b';
        setTimeout(() => { msg.textContent = ''; }, 2500);
        return;
    }

    const subject = encodeURIComponent('[BGG Reply] ' + (inq.subject || '문의 답변'));
    const body = encodeURIComponent(replyBody);
    const mailLink = `mailto:${inq.email}?subject=${subject}&body=${body}`;
    window.open(mailLink, '_blank');

    const msg = document.getElementById('inq_reply_msg');
    msg.textContent = t('inq_reply_sent');
    msg.style.color = '#27ae60';
    setTimeout(() => { msg.textContent = ''; }, 3000);
}

function deleteInquiry() {
    if (!_activeInquiryId) return;
    if (!confirm(t('inq_confirm_delete'))) return;

    let list = getInquiries();
    list = list.filter(i => i.id !== _activeInquiryId);
    saveInquiries(list);
    _activeInquiryId = null;

    document.getElementById('inquiry_detail_placeholder').style.display = 'flex';
    document.getElementById('inquiry_detail_panel').style.display = 'none';
    renderInquiryList();
}

/* =====================================================
   Ctrl+S 단축키 – 현재 활성 탭의 저장 버튼 클릭
   ===================================================== */
(function () {
    function handleCtrlS(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var activeSection = document.querySelector('.tab_section.active');
            if (activeSection) {
                var saveBtn = activeSection.querySelector('.save_btn');
                if (saveBtn) saveBtn.click();
            }
            return false;
        }
    }
    document.addEventListener('keydown', handleCtrlS, true);
    window.addEventListener('keydown', handleCtrlS, true);
})();

/* =====================================================
   예약 상세 팝업
   ===================================================== */
function openResDetailPopup(id) {
    const r = getReservations().find(x => x.id === id);
    if (!r) return;
    const fields = [
        { label: '예약자', value: r.name },
        { label: '국적', value: r.nationality },
        { label: '예약 병원', value: r.hospital },
        { label: '예약 날짜', value: r.date },
        { label: '예약 시간', value: r.time },
        { label: '이메일', value: r.email },
        { label: '전화번호', value: r.phone },
        { label: '접수방법', value: r.source === 'whatsapp' ? 'WhatsApp' : 'Homepage' },
        { label: '시술 이름', value: r.treatment },
        { label: '요청사항', value: r.request },
    ];
    const grid = document.getElementById('resDetailGrid');
    grid.innerHTML = fields.map(f => `
        <div class="res_detail_label">${esc(f.label)}</div>
        <div class="res_detail_value">${esc(f.value || '—')}</div>
    `).join('');
    document.getElementById('resDetailOverlay').classList.add('active');
}

function closeResDetailPopup(e) {
    if (e && e.target !== document.getElementById('resDetailOverlay')) return;
    document.getElementById('resDetailOverlay').classList.remove('active');
}