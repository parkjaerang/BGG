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
        resultMsg.textContent  = '請填寫所有欄位。';
        resultDetail.textContent = '';
        return;
    }

    // TODO: [BACKEND] localStorage → GET /api/reservations?name=NAME&phone=PHONE
    let reservations = [];
    try {
        reservations = JSON.parse(localStorage.getItem('bgg_reservations') || '[]');
    } catch (e) {
        reservations = [];
    }

    const matches = reservations.filter(r =>
        r.name  && r.name.trim()  === name &&
        r.phone && r.phone.trim().replace(/-/g, '') === phone
    );

    if (matches.length === 0) {
        resultWrap.className = 'result_wrap show status_none';
        resultIcon.textContent = '🔍';
        resultMsg.textContent  = '找不到預約記錄。';
        resultDetail.textContent = '請確認姓名與電話號碼。';
        return;
    }

    resultWrap.className = 'result_wrap show status_multi';
    resultIcon.textContent = '';
    resultMsg.textContent = `找到 ${matches.length} 筆預約`;

    resultDetail.innerHTML = matches.map(r => {
        let icon, label, statusClass;
        if (r.status === 'confirmed') {
            icon = '✅'; label = '已確認'; statusClass = 'status_confirmed';
        } else if (r.status === 'cancelled') {
            icon = '❌'; label = '已取消'; statusClass = 'status_cancelled';
        } else {
            icon = '⏳'; label = '待確認'; statusClass = 'status_pending';
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
