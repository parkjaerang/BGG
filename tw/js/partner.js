document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.getElementById('hospital_list_wrap');
    // TODO: [BACKEND] getHospitals() → fetch('/api/hospitals') 로 교체 (common.js의 getHospitals 함수 참고)
    // TODO: [BACKEND] 将getHospitals()替换为fetch('/api/hospitals')（参考common.js的getHospitals函数）
    // 비동기 변경 시: async function init() { var hospitals = await fetchHospitals(); ... } 형태로 감싸기
    // 改为异步时：以async function init() { var hospitals = await fetchHospitals(); ... }形式包裹
    var hospitals = getHospitals();
    if (!hospitals || hospitals.length === 0) {
        wrap.innerHTML = '<p class="empty_msg">There are no registered hospitals.</p>';
        return;
    }
    wrap.innerHTML = hospitals.map(function (h) {
        var imgSrc = h.img || '../img/hospital_image_default.png';
        var name = h.name || '';
        var tag = h.tag || '';
        return '<article class="hospital_info">' +
            '<a href="./view.html?idx=' + h.id + '"><img src="' + imgSrc + '" alt="' + name + '"></a>' +
            '<span class="hospital_name">' + name + '</span>' +
            '<span class="hospital_tag">' + tag + '</span>' +
            '</article>';
    }).join('');
});
  