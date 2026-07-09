function submitReview() {
    const name    = document.getElementById('input_name').value.trim();
    const phone   = document.getElementById('input_phone').value.trim();
    const email   = document.getElementById('input_email').value.trim();
    const subject = document.getElementById('input_requesttitle').value.trim();
    const content = document.getElementById('input_request').value.trim();

    if (!name || !subject || !content) {
        alert('請填寫您的姓名、諮詢標題與訊息內容。');
        return;
    }

    const inquiry = {
        id:      'inq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name:    name,
        phone:   phone,
        email:   email,
        subject: subject,
        content: content,
        date:    new Date().toISOString(),
        status:  'unread'
    };

    try {
        const list = JSON.parse(localStorage.getItem('bgg_inquiries') || '[]');
        list.push(inquiry);
        localStorage.setItem('bgg_inquiries', JSON.stringify(list));
    } catch (e) {
        alert('送出失敗，請再試一次。');
        return;
    }

    document.getElementById('input_name').value = '';
    document.getElementById('input_phone').value = '';
    document.getElementById('input_email').value = '';
    document.getElementById('input_requesttitle').value = '';
    document.getElementById('input_request').value = '';

    alert('您的諮詢已成功送出！');
}
