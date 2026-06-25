/* ─────────────────────────────────────────────
   reservation.js  –  idx 기반 병원 예약 시스템

   localStorage 키 구조 (병원 이름 대신 idx 사용):
     bgg_closed_days_{idx}    → [0,6]           요일 휴무
     bgg_closed_dates_{idx}   → ["2026-05-20"]  특정 날짜 전체 휴무
     bgg_blocked_{idx}        → {"2026-05-20":["10:00",...]}  시간 차단
───────────────────────────────────────────── */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let currentYear, currentMonth, selectedDate = null, selectedTime = null;

/* ── 현재 선택된 병원의 idx 반환 (h.id 기준, -1 이면 미선택) ── */
/* ── 返回当前选中医院的idx（基于h.id，-1表示未选择） ── */
function getHospitalIdx() {
    const hospital = document.getElementById('hospitalSelect')?.value;
    if (!hospital) return -1;
    const h = getHospitals().find(function (h) { return h.name === hospital; });
    return h ? h.id : -1;
}

/* ── 현재 선택된 병원의 예약 config 반환 ── */
/* ── 返回当前选中医院的预约config ── */
// TODO: [BACKEND] localStorage → GET /api/hospitals/:idx/config
// TODO: [BACKEND] localStorage → 替换为GET /api/hospitals/:idx/config
// 현재: localStorage.getItem('bgg_hconfig_' + idx)
// 当前：localStorage.getItem('bgg_hconfig_' + idx)
function getHospitalConfig() {
    const idx = getHospitalIdx();
    if (idx < 0) return null;
    var stored = localStorage.getItem('bgg_hconfig_' + idx);
    if (stored) { try { return JSON.parse(stored); } catch (e) {} }
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

/* ── 현재 병원의 예약 가능 시간 배열 ── */
/* ── 当前医院的可预约时间数组 ── */
function getCurrentTimes() {
    const config = getHospitalConfig();
    return config ? config.times : [];
}

/* ── date 의 요일이 휴무인지 확인 ── */
/* ── 确认date的星期是否为休息日 ── */
// TODO: [BACKEND] localStorage → GET /api/hospitals/:idx/closed-days 로 교체
// TODO: [BACKEND] localStorage → 替换为GET /api/hospitals/:idx/closed-days
function isClosedDay(date) {
    const config = getHospitalConfig();
    if (!config) return false;
    const idx = getHospitalIdx();
    // TODO: [BACKEND] 아래 localStorage 제거 → 위 getHospitalConfig() API 응답에 closedDays 포함시키기
    // TODO: [BACKEND] 删除下方localStorage → 在上方getHospitalConfig() API响应中包含closedDays
    const savedDays = JSON.parse(localStorage.getItem('bgg_closed_days_' + idx) || '[]');
    const allClosed = [...(config.closedDays || []), ...savedDays];
    return allClosed.includes(date.getDay());
}

/* ── dateStr(YYYY-MM-DD)이 전체 휴무 날짜인지 확인 ── */
/* ── 确认dateStr(YYYY-MM-DD)是否为全天休息日 ── */
// TODO: [BACKEND] localStorage → GET /api/hospitals/:idx/closed-dates
// TODO: [BACKEND] localStorage → 替换为GET /api/hospitals/:idx/closed-dates
// 또는 getHospitalConfig() API 응답에 closedDates 배열 포함시키기
// 或在getHospitalConfig() API响应中包含closedDates数组
function isClosedDate(dateStr) {
    const idx = getHospitalIdx();
    if (idx < 0) return false;
    const closedDates = JSON.parse(localStorage.getItem('bgg_closed_dates_' + idx) || '[]');
    return closedDates.includes(dateStr);
}

/* ═══════════════════════════════
   초기화
═══════════════════════════════ */
function init() {
    const today = new Date();
    currentYear  = today.getFullYear();
    currentMonth = today.getMonth();

    renderHospitals();
    renderCalendar();
    renderTimes();

    document.getElementById('prevMonth').addEventListener('click', () => {
        const today = new Date();
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) return;
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });

    // TODO: [BACKEND] storage 이벤트 기반 동기화 → WebSocket 또는 SSE (Server-Sent Events) 로 교체
    // TODO: [BACKEND] 基于storage事件的同步 → 替换为WebSocket或SSE（Server-Sent Events）
    // 예: const evtSource = new EventSource('/api/availability-stream?hospitalId=X');
    //     evtSource.onmessage = () => { renderCalendar(); renderTimes(); };
    // admin에서 차단/요일/날짜 변경 시 예약 페이지 자동 갱신 (다른 탭/기기에서 변경된 경우)
    // admin中变更屏蔽/星期/日期时自动刷新预约页面（在其他标签页/设备上变更的情况）
    window.addEventListener('storage', function(e) {
        const syncKeys = ['bgg_blocked_', 'bgg_closed_days_', 'bgg_closed_dates_', 'bgg_hconfig_', 'bgg_hospitals'];
        if (syncKeys.some(prefix => e.key && e.key.startsWith(prefix))) {
            renderCalendar();
            renderTimes();
        }
    });

    // 탭을 다시 활성화할 때 최신 데이터로 갱신
    // 重新激活标签页时以最新数据刷新
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            renderCalendar();
            renderTimes();
        }
    });
}

/* ═══════════════════════════════
    step 전환
    (병원 선택 → 날짜/시간 선택 → 정보 입력)
═══════════════════════════════ */
var _currentStep = 1;

        function goToStep(n) {
            // 앞으로 이동 시 검증
            if (n > _currentStep) {
                if (_currentStep === 1) {
                    var hospital = document.getElementById('hospitalSelect') && document.getElementById('hospitalSelect').value;
                    if (!hospital) { alert('Please select a hospital first.'); return; }
                }
                if (_currentStep === 2) {
                    if (!selectedDate) { alert('Please select a date.'); return; }
                    if (!selectedTime) { alert('Please select a time.'); return; }
                }
            }

            // 패널 전환
            document.querySelectorAll('.step_panel').forEach(function (p) { p.classList.remove('active'); });
            document.getElementById('step_panel_' + n).classList.add('active');

            // 진행 표시바 업데이트
            for (var i = 1; i <= 3; i++) {
                var dot = document.getElementById('prog_' + i);
                dot.classList.remove('active', 'done');
                if (i < n) dot.classList.add('done');
                else if (i === n) dot.classList.add('active');
            }
            for (var j = 1; j <= 2; j++) {
                var line = document.getElementById('prog_line_' + j);
                line.classList.toggle('done', j < n);
            }

            _currentStep = n;

            // Step 3 요약 업데이트
            if (n === 3) {
                var h = document.getElementById('hospitalSelect') && document.getElementById('hospitalSelect').value;
                document.getElementById('summary_hospital').textContent = h || '—';
                document.getElementById('summary_date').textContent = selectedDate || '—';
                document.getElementById('summary_time').textContent = selectedTime || '—';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
/* ═══════════════════════════════
   병원 선택 드롭다운
═══════════════════════════════ */
function renderHospitals() {
    const items = [
        { value: '', label: 'Select a hospital' },
        ...getHospitals().map(h => ({ value: h.name, label: h.name })),
    ];
    createSearchableSelect('hospitalSelectWrap', 'hospitalSelect', items, {
        placeholder: 'Select a hospital',
        hiddenName: 'hospital',
        onChange: () => {
            selectedDate = null;
            selectedTime = null;
            renderCalendar();
            renderTimes();
        },
    });
}

/* ═══════════════════════════════
   캘린더
═══════════════════════════════ */
function renderCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    document.getElementById('calendarTitle').textContent =
        `${currentYear} / ${currentMonth + 1}`;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    DAY_LABELS.forEach(d => {
        const el = document.createElement('div');
        el.className = 'day_label';
        el.textContent = d;
        grid.appendChild(el);
    });

    const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'day empty';
        grid.appendChild(el);
    }

    // 오늘 날짜의 모든 시간이 지났는지 미리 계산
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const nowMinutesForCal = today.getHours() * 60 + today.getMinutes();
    const allTodayTimesPast = (function() {
        const times = getCurrentTimes();
        if (!times.length) return false;
        const idx = getHospitalIdx();
        const blockedData = idx >= 0 ? JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}') : {};
        const config = getHospitalConfig();
        const blocked = todayStr in blockedData ? blockedData[todayStr] : (config?.blockedTimes ?? []);
        const breakTimes = [];
        if (config?.breakEnabled && config.breakStart && config.breakEnd) {
            let cur = config.breakStart.split(':').map(Number);
            let curMin = cur[0] * 60 + cur[1];
            const endTotal = config.breakEnd.split(':').map(Number).reduce((h, m) => h * 60 + m);
            while (curMin < endTotal) {
                breakTimes.push(String(Math.floor(curMin / 60)).padStart(2, '0') + ':' + String(curMin % 60).padStart(2, '0'));
                curMin += 30;
            }
        }
        return times.every(t => {
            const parts = t.split(':').map(Number);
            const tMin = parts[0] * 60 + parts[1];
            return tMin <= nowMinutesForCal || blocked.includes(t) || breakTimes.includes(t);
        });
    })();

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const dow  = date.getDay();
        const dateStr =
            `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const closed      = isClosedDay(date);
        const dayOff      = isClosedDate(dateStr);
        const isTodayAllPast = (date.getTime() === today.getTime()) && allTodayTimesPast;
        const isUnavailable = closed || dayOff || isTodayAllPast;

        let cls = 'day';
        if (dow === 0) cls += ' sun';
        if (dow === 6) cls += ' sat';
        if (date < today || isUnavailable) cls += ' past';
        if (date.getTime() === today.getTime()) cls += ' today';
        if (isUnavailable && date >= today) cls += ' closed';
        if (selectedDate === dateStr) cls += ' selected';

        const el = document.createElement('div');
        el.className = cls;
        el.textContent = d;

        if (date >= today && !isUnavailable) {
            el.addEventListener('click', () => selectDate(dateStr, el));
        }

        grid.appendChild(el);
    }
}

function selectDate(dateStr, el) {
    selectedDate = dateStr;
    selectedTime = null;
    document.querySelectorAll('.calendar_grid .day').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
    renderTimes();
}

/* ═══════════════════════════════
   시간 슬롯
═══════════════════════════════ */
function renderTimes() {
    const grid = document.getElementById('timeGrid');
    grid.innerHTML = '';

    const times = getCurrentTimes();

    if (times.length === 0) {
        grid.innerHTML = '<p class="time_notice">Please select a hospital first.</p>';
        return;
    }

    // 하루 전체 휴무 → 모든 시간 비활성
    // 全天休息 → 所有时间禁用
    if (selectedDate && isClosedDate(selectedDate)) {
        times.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'time_btn disabled';
            btn.textContent = t;
            grid.appendChild(btn);
        });
        return;
    }

    const idx         = getHospitalIdx();
    const config      = getHospitalConfig();
    // TODO: [BACKEND] localStorage → GET /api/hospitals/:idx/blocked-times?date=YYYY-MM-DD
    // bgg_blocked_{idx}: { "YYYY-MM-DD": ["10:00", ...], ... }
    const blockedData = idx >= 0
        ? JSON.parse(localStorage.getItem('bgg_blocked_' + idx) || '{}')
        : {};
    const dateKey = selectedDate || '';
    // 해당 날짜가 명시 저장된 경우 그 값 사용, 없으면 config 기본값
    // 若该日期有明确保存的值则使用该值，否则使用config默认值
    const blocked = dateKey in blockedData
        ? blockedData[dateKey]
        : (config?.blockedTimes ?? []);

    // 당일 예약 시 현재 시각 이전 시간대 차단
    // 当天预约时屏蔽当前时间之前的时间段
    const todayStr = (function() {
        const n = new Date();
        return n.getFullYear() + '-' +
            String(n.getMonth() + 1).padStart(2, '0') + '-' +
            String(n.getDate()).padStart(2, '0');
    })();
    const isToday = (dateKey === todayStr);
    const nowMinutes = isToday ? (function() {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
    })() : -1;

    // 휴게시간 차단 목록 생성
    const breakTimes = [];
    if (config?.breakEnabled && config.breakStart && config.breakEnd) {
        let cur = config.breakStart.split(':').map(Number);
        let curMin = cur[0] * 60 + cur[1];
        const endMin = config.breakEnd.split(':').map(Number);
        const endTotal = endMin[0] * 60 + endMin[1];
        while (curMin < endTotal) {
            const hh = String(Math.floor(curMin / 60)).padStart(2, '0');
            const mm = String(curMin % 60).padStart(2, '0');
            breakTimes.push(hh + ':' + mm);
            curMin += 30;
        }
    }

    times.forEach(t => {
        const btn       = document.createElement('button');
        // 당일 이미 지나간 시간 차단 / 当天已过时间段屏蔽
        const isPastTime = isToday && (function() {
            const parts = t.split(':').map(Number);
            return parts[0] * 60 + parts[1] <= nowMinutes;
        })();
        const isBlocked = blocked.includes(t) || breakTimes.includes(t) || isPastTime;

        btn.className = 'time_btn' +
            (isBlocked ? ' disabled' : '') +
            (!isBlocked && selectedTime === t ? ' selected' : '');
        btn.textContent = t;

        if (!isBlocked) {
            btn.addEventListener('click', () => selectTime(t, btn));
        }

        grid.appendChild(btn);
    });
}

function selectTime(time, btn) {
    selectedTime = time;
    document.querySelectorAll('.time_btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

/* ═══════════════════════════════
   예약 제출
═══════════════════════════════ */
function submitBooking() {
    const hospital    = document.getElementById('hospitalSelect').value;
    const name        = document.getElementById('input_name').value.trim();
    const phone       = document.getElementById('input_phone').value.trim().replace(/-/g, '');
    const nationality = document.getElementById('input_nationality').value.trim();
    const email       = document.getElementById('input_email').value.trim();
    const treatment   = document.getElementById('input_treatment')?.value.trim() || '';
    const request     = document.getElementById('input_request').value.trim();
    const msg         = document.getElementById('confirmMsg');

    if (!hospital)    { alert('Please select a hospital.');        return; }
    if (!selectedDate){ alert('Please select a date.');            return; }
    if (!selectedTime){ alert('Please select a time.');            return; }
    if (!name)        { alert('Please enter your name.');          return; }
    if (!phone)       { alert('Please enter your phone number.');  return; }
    if (!nationality) { alert('Please enter your nationality.');   return; }
    if (!email)       { alert('Please enter your email address.'); return; }

    // 확인 모달 표시
    const rows = [
        ['Hospital',    hospital],
        ['Date',        selectedDate],
        ['Time',        selectedTime],
        ['Name',        name],
        ['Phone',       phone],
        ['Nationality', nationality],
        ['Email',       email],
    ];
    if (treatment) rows.push(['Treatment', treatment]);
    if (request)   rows.push(['Request',   request]);

    document.getElementById('resModalBody').innerHTML = rows.map(([label, val]) =>
        `<div class="modal_row"><span class="modal_label">${label}</span><span>${val}</span></div>`
    ).join('');
    document.getElementById('bookingConfirmModal').style.display = 'flex';

    // 모달에서 Confirm 버튼 누를 때까지 대기 (confirmBookingFinal 에서 처리)
    window._pendingBooking = { hospital, name, phone, nationality, email, treatment, request };
}

function closeBookingModal() {
    document.getElementById('bookingConfirmModal').style.display = 'none';
    window._pendingBooking = null;
}

function confirmBookingFinal() {
    const pending = window._pendingBooking;
    if (!pending) return;
    document.getElementById('bookingConfirmModal').style.display = 'none';

    const { hospital, name, phone, nationality, email, treatment, request } = pending;
    const msg = document.getElementById('confirmMsg');

    // 제출 직전 최신 차단 목록 재확인 (WhatsApp 등 다른 경로로 이미 예약된 경우 방지)
    // TODO: [BACKEND] 아래 localStorage 재확인 로직 전체를 서버에서 처리
    //   → POST /api/reservations 에서 서버가 직접 시간 중복 여부 검증 후 409 Conflict 응답 반환
    const hospitals = getHospitals();
    const hFound = hospitals.find(function(h) { return h.name === hospital; });
    if (hFound && hFound.id !== undefined) {
        let latestBlocked = {};
        try { latestBlocked = JSON.parse(localStorage.getItem('bgg_blocked_' + hFound.id) || '{}'); } catch(e) {}
        if ((latestBlocked[selectedDate] || []).includes(selectedTime)) {
            alert('Sorry, this time slot is no longer available.\nPlease select a different time.');
            selectedTime = null;
            renderTimes();
            return;
        }
    }

    // TODO: [BACKEND] 아래 localStorage 저장 전체를 POST /api/reservations 로 교체
    //   요청 body: { hospitalId, date, time, name, phone, nationality, email, request }
    //   성공 응답(201): { id, status: 'waiting', ... }
    //   → 서버에서 bgg_reservations 저장 + 시간 차단(bgg_blocked) 동시 처리
    const reservations = (function() {
        try { return JSON.parse(localStorage.getItem('bgg_reservations') || '[]'); } catch(e) { return []; }
    })();
    reservations.push({
        id:          Date.now().toString(),
        hospital:    hospital,
        date:        selectedDate,
        time:        selectedTime,
        name:        name,
        phone:       phone,
        nationality: nationality,
        email:       email,
        treatment:   treatment,
        request:     request,
        status:      'waiting',
        source:      'homepage',
    });
    localStorage.setItem('bgg_reservations', JSON.stringify(reservations));

    // TODO: [BACKEND] 아래 시간 차단 로직은 POST /api/reservations 서버 처리로 이전 (클라이언트에서 제거)
    // 예약된 시간 즉시 차단 (접수 대기 중에도 다른 사람이 같은 시간 예약 못 하도록)
    (function() {
        const hospitals = getHospitals();
        const h = hospitals.find(function(h) { return h.name === hospital; });
        if (!h || h.id === undefined) return;
        const blockKey = 'bgg_blocked_' + h.id;
        let blocked = {};
        try { blocked = JSON.parse(localStorage.getItem(blockKey) || '{}'); } catch(e) {}
        if (!blocked[selectedDate]) blocked[selectedDate] = [];
        if (!blocked[selectedDate].includes(selectedTime)) {
            blocked[selectedDate].push(selectedTime);
        }
        localStorage.setItem(blockKey, JSON.stringify(blocked));
    })();

    window._pendingBooking = null;

    // 예약 완료 알림 모달 표시
    var details = [
        ['Hospital', hospital],
        ['Date',     selectedDate],
        ['Time',     selectedTime],
        ['Name',     name],
        ['Phone',  phone],
        ['Nationality', nationality],
        ['Email',  email],
    ];
    if (treatment) details.push(['Treatment', treatment]);
    if (request)   details.push(['Request', request]);

    document.getElementById('successDetails').innerHTML =
        details.map(function(row) {
            return '<div class="success_row"><span class="success_label">' + row[0] + '</span><span class="success_val">' + row[1] + '</span></div>';
        }).join('') +
        '<p class="success_notice">We will notify you by email once confirmed.</p>';

    document.getElementById('bookingSuccessModal').style.display = 'flex';

    // 입력 필드 초기화
    ['input_name','input_phone','input_whatsapp','input_nationality',
     'input_email','input_treatment','input_request'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 선택 상태 초기화 후 캘린더·시간 재렌더
    selectedDate = null;
    selectedTime = null;
    renderCalendar();
    renderTimes();

    // 스텝 UI가 있으면 Step 1로 복귀
    if (typeof goToStep === 'function') goToStep(1);
}

function closeSuccessModal() {
    document.getElementById('bookingSuccessModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
