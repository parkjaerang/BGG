document.addEventListener('DOMContentLoaded', () => {

    /* ================================================
       Intersection Observer — reveal
    ================================================ */
    const revealTargets = document.querySelectorAll(
        '.about_text, .about_img, .service_card, .service_box .img_box, .service_box .text_box, .why_item, .service_header, .why_header'
    );

    // 각 요소에 방향별 클래스 부여
    // 为各元素赋予方向类名
    revealTargets.forEach((el) => {
        if (el.classList.contains('about_img') || el.classList.contains('text_box')) {
            el.classList.add('reveal-right');
        } else if (el.classList.contains('about_text') || el.classList.contains('img_box')) {
            el.classList.add('reveal-left');
        } else {
            el.classList.add('reveal');
        }

        // service_box reverse는 좌우 반전
        // service_box reverse为左右翻转
        const parentBox = el.closest('.service_box.reverse');
        if (parentBox) {
            el.classList.remove('reveal-left', 'reveal-right');
            if (el.classList.contains('img_box')) el.classList.add('reveal-right');
            if (el.classList.contains('text_box')) el.classList.add('reveal-left');
        }
    });

    // card / why_item 은 stagger delay
    // card / why_item 应用stagger delay
    document.querySelectorAll('.service_card, .why_item').forEach((el, i) => {
        el.style.transitionDelay = `${(i % 4) * 0.1}s`;
    });

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 }
    );

    revealTargets.forEach((el) => revealObserver.observe(el));

});
