function checkReservation() {
    const name  = document.getElementById('input_name').value.trim();
    const phone = document.getElementById('input_phone').value.trim().replace(/-/g, '');

    const resultWrap   = document.getElementById('resultWrap');
    const resultIcon   = document.getElementById('resultIcon');
    const resultMsg    = document.getElementById('resultMsg');
    const resultDetail = document.getElementById('resultDetail');

    if (!name || !phone) {
        resultWrap.className = 'result_wrap show status_none';
        resultIcon.textContent = '⚠️';
        resultMsg.textContent  = 'Please fill in all fields.';
        resultDetail.textContent = '';
        return;
    }

    // TODO: [BACKEND] localStorage → GET /api/reservations?name=NAME&phone=PHONE
    //   → 서버가 이름+전화번호로 필터링 후 해당 예약 목록 반환
    //   → 服务器按姓名+电话号码过滤后返回对应预约列表
    //   성공 시 matches 배열로 사용, 없으면 빈 배열 반환
    //   成功时使用matches数组，否则返回空数组
    //   비동기 변경 시: checkReservation()을 async function으로 변경 + await fetch(...)
    //   改为异步时：将checkReservation()改为async function + await fetch(...)
    let reservations = [];
    try {
        reservations = JSON.parse(localStorage.getItem('bgg_reservations') || '[]');
    } catch (e) {
        reservations = [];
    }

    // 이름 + 전화번호로 예약 검색 (가장 최근 예약 기준)
    // 按姓名+电话号码搜索预约（以最近预约为基准）
    const matches = reservations.filter(r =>
        r.name  && r.name.trim()  === name &&
        r.phone && r.phone.trim().replace(/-/g, '') === phone
    );

    if (matches.length === 0) {
        resultWrap.className = 'result_wrap show status_none';
        resultIcon.textContent = '🔍';
        resultMsg.textContent  = 'No reservation found.';
        resultDetail.textContent = 'Please check your name and phone number.';
        return;
    }

    // 여러 예약 모두 표시
    // 显示所有预约
    resultWrap.className = 'result_wrap show status_multi';
    resultIcon.textContent = '';
    resultMsg.textContent = `${matches.length} Reservation${matches.length > 1 ? 's' : ''} Found`;

    resultDetail.innerHTML = matches.map(r => {
        let icon, label, statusClass;
        if (r.status === 'confirmed') {
            icon = '✅'; label = 'Подтверждено'; statusClass = 'status_confirmed';
        } else if (r.status === 'cancelled') {
            icon = '❌'; label = 'Отменено'; statusClass = 'status_cancelled';
        } else {
            icon = '⏳'; label = 'Pending'; statusClass = 'status_pending';
        }
        return `
            <div class="reservation_card ${statusClass}" data-id="${r.id}">
                <span class="card_icon">${icon}</span>
                <div class="card_info">
                    <strong>${r.hospital}</strong>
                    <span>${r.date} &nbsp; ${r.time}</span>
                </div>
                <span class="card_label">${label}</span>
            </div>
        `;
    }).join('');
}
