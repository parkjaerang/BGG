function submitReview() {
    const name    = document.getElementById('input_name').value.trim();
    const phone   = document.getElementById('input_phone').value.trim();
    const email   = document.getElementById('input_email').value.trim();
    const subject = document.getElementById('input_requesttitle').value.trim();
    const content = document.getElementById('input_request').value.trim();

    if (!name || !subject || !content) {
        alert('Please fill in your name, request title, and message.');
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

    // TODO: [BACKEND] localStorage 저장 전체를 POST /api/inquiries 로 교체
    // TODO: [BACKEND] 将localStorage存储整体替换为POST /api/inquiries
    //   요청 body: { name, phone, email, subject, content }
    //   请求body: { name, phone, email, subject, content }
    //   성공 응답(201): { id, status: 'unread', ... }
    //   成功响应(201): { id, status: 'unread', ... }
    //   비동기 변경 시: submitReview()를 async function으로 변경 후 await fetch('/api/inquiries', { method:'POST', body: JSON.stringify(inquiry) })
    //   改为异步时：将submitReview()改为async function后await fetch('/api/inquiries', { method:'POST', body: JSON.stringify(inquiry) })
    try {
        const list = JSON.parse(localStorage.getItem('bgg_inquiries') || '[]');
        list.push(inquiry);
        localStorage.setItem('bgg_inquiries', JSON.stringify(list));
    } catch (e) {
        alert('Submission failed. Please try again.');
        return;
    }

    document.getElementById('input_name').value = '';
    document.getElementById('input_phone').value = '';
    document.getElementById('input_email').value = '';
    document.getElementById('input_requesttitle').value = '';
    document.getElementById('input_request').value = '';

    alert('Your request has been submitted successfully!');
}
