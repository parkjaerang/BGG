document.addEventListener('DOMContentLoaded', () => {
     /* ── 어드민 데이터 적용 ── */
     /* ── 应用管理员数据 ── */
        (function applyAdminData() {
            var params = new URLSearchParams(location.search);
            var idxNum = parseInt(params.get('idx'));

            // TODO: [BACKEND] getHospitals() → GET /api/hospitals/:idx 로 교체 (단일 병원 상세 조회)
            // TODO: [BACKEND] 将getHospitals()替换为GET /api/hospitals/:idx（单个医院详情查询）
            // 동적 병원 목록에서 찾기, 없으면 기존 HOSPITALS 배열 fallback
            // 从动态医院列表中查找，找不到则回退到现有HOSPITALS数组
            var hospitals = (typeof getHospitals === 'function') ? getHospitals() : null;
            var hospital = hospitals ? hospitals.find(function(h) { return h.id === idxNum; }) : null;
            var HOSPITAL_ID = hospital ? hospital.id : (idxNum || params.get('idx'));
            if (!HOSPITAL_ID) return;
            function vKey(k) { return 'bgg_view_' + HOSPITAL_ID + '_' + k; }

            // TODO: [BACKEND] 아래 모든 localStorage.getItem(vKey('...')) 호출을 단일 API 응답으로 교체
            // TODO: [BACKEND] 将下方所有localStorage.getItem(vKey('...'))调用替换为单一API响应
            //   → GET /api/hospitals/:id/view-data 가 { heroCount, heroImages, heroName, heroSub,
            //   → GET /api/hospitals/:id/view-data 一次性返回 { heroCount, heroImages, heroName, heroSub,
            //        aboutTitle, aboutDesc, aboutImages, aboutHighlights,
            //        doctorImg, doctorLabel, doctorName, doctorBio,
            //        promoBanner, promoCards, ba, prices } 를 한번에 반환하도록 설계
            //        promoBanner, promoCards, ba, prices }
            // 히어로 슬라이더 동적 생성
            // 动态生成主视觉轮播
            var heroCount = parseInt(localStorage.getItem(vKey('hero_count'))) || 3;
            var defaultImgs = [
                './img/view_banner_default_1.png',
                './img/view_banner_default_2.png',
                './img/view_banner_default_3.png'
            ];
            var slider = document.querySelector('.hero_slider');
            var dotsWrap = document.querySelector('.hero_dots');
            if (slider) {
                slider.innerHTML = Array.from({ length: heroCount }, function(_, i) {
                    var defSrc = defaultImgs[i] || defaultImgs[0];
                    return '<div class="hero_slide' + (i === 0 ? ' active' : '') + '">' +
                        '<img src="' + defSrc + '" alt="Hospital exterior ' + (i + 1) + '" class="hero_img">' +
                        '</div>';
                }).join('');
            }
            if (dotsWrap) {
                if (heroCount <= 1) {
                    dotsWrap.style.display = 'none';
                } else {
                    dotsWrap.innerHTML = Array.from({ length: heroCount }, function(_, i) {
                        return '<span class="hero_dot' + (i === 0 ? ' active' : '') + '"></span>';
                    }).join('');
                }
            }

            // 히어로 이미지 적용
            // 应用主视觉图片
            Array.from({ length: heroCount }, function(_, i) { return 'hero' + i; }).forEach(function(key, i) {
                var src = localStorage.getItem(vKey(key));
                if (!src) return;
                var slides = document.querySelectorAll('.hero_slide img');
                if (slides[i]) slides[i].src = src;
            });

            // 히어로 텍스트
            // 主视觉文字
            var heroName = localStorage.getItem(vKey('hero_name'));
            if (heroName) {
                var heroNameEl = document.querySelector('.hero_name');
                if (heroNameEl) heroNameEl.textContent = heroName;
            }
            var heroSub = localStorage.getItem(vKey('hero_sub'));
            if (heroSub) {
                var heroSubEl = document.querySelector('.hero_sub');
                if (heroSubEl) heroSubEl.textContent = heroSub;
            }

            // hospital_about
            var aboutTitle = localStorage.getItem(vKey('about_title'));
            if (aboutTitle) {
                var aboutTitleEl = document.querySelector('.about_title');
                if (aboutTitleEl) aboutTitleEl.textContent = aboutTitle;
            }
            var aboutDesc = localStorage.getItem(vKey('about_desc'));
            if (aboutDesc) {
                var aboutDescEl = document.querySelector('.about_desc');
                if (aboutDescEl) aboutDescEl.textContent = aboutDesc;
            }
            var aboutImagesRaw = localStorage.getItem(vKey('about_images'));
            if (aboutImagesRaw) {
                try {
                    var aboutImages = JSON.parse(aboutImagesRaw);
                    var aboutMain = document.querySelector('.about_img_main img');
                    if (aboutMain && aboutImages[0]) aboutMain.src = aboutImages[0];
                } catch(e) {}
            }
            var aboutHighlightsRaw = localStorage.getItem(vKey('about_highlights'));
            if (aboutHighlightsRaw) {
                try {
                    var highlights = JSON.parse(aboutHighlightsRaw);
                    var hlList = document.querySelector('.about_highlights');
                    if (hlList) {
                        hlList.innerHTML = highlights.map(function(h) {
                            return '<li><i class="fa-solid fa-check"></i> ' + h + '</li>';
                        }).join('');
                    }
                } catch(e) {}
            }

            // doctor_profile
            var doctorImg = localStorage.getItem(vKey('doctor_img'));
            if (doctorImg) {
                var docImgEl = document.querySelector('#doctor_profile .doctor_img_wrap img');
                if (docImgEl) docImgEl.src = doctorImg;
            }
            var doctorLabel = localStorage.getItem(vKey('doctor_label'));
            if (doctorLabel) {
                var docLabelEl = document.querySelector('.doctor_label');
                if (docLabelEl) docLabelEl.textContent = doctorLabel;
            }
            var doctorName = localStorage.getItem(vKey('doctor_name'));
            if (doctorName) {
                var docNameEl = document.querySelector('.doctor_name');
                if (docNameEl) docNameEl.textContent = doctorName;
            }
            var doctorBio = localStorage.getItem(vKey('doctor_bio'));
            if (doctorBio) {
                var docBioEl = document.querySelector('.doctor_bio');
                if (docBioEl) docBioEl.textContent = doctorBio;
            }

            // 프로모션 배너
            // 促销横幅
            var bannerSrc = localStorage.getItem(vKey('promoBanner'));
            if (bannerSrc) {
                var bannerImg = document.querySelector('#promo_poster .promo_img');
                if (bannerImg) bannerImg.src = bannerSrc;
            }

            // 프로모션 카드
            // 促销卡片
            var promoCards = JSON.parse(localStorage.getItem(vKey('promo_cards')) || 'null');
            if (promoCards) {
                var posterGrid = document.querySelector('#promo_poster .poster_grid');
                if (posterGrid) {
                    posterGrid.innerHTML = promoCards.map(function(data) {
                        return '<article class="poster_card"><div class="poster_body">' +
                            '<span class="poster_tag">' + data.tag + '</span>' +
                            '<h3 class="poster_title">' + data.title + '</h3>' +
                            '<p class="poster_desc">' + data.desc + '</p>' +
                            '<div class="poster_price">' +
                            '<span class="original_price">' + data.origPrice + '</span>' +
                            '<span class="sale_price">' + data.salePrice + '</span>' +
                            '</div></div></article>';
                    }).join('');
                }
            }

            // Before & After
            var baData = JSON.parse(localStorage.getItem(vKey('ba')) || 'null');
            var baSection = document.getElementById('before_after');
            var baGrid    = document.getElementById('ba_grid');
            if (baData && baData.length > 0) {
                baGrid.innerHTML = baData.map(function(data) {
                    return '<article class="ba_card">' +
                        '<div class="ba_img_wrap">' +
                        '<div class="ba_side"><span class="ba_label">BEFORE</span>' +
                        '<img src="' + (data.beforeImg || './img/before.png') + '" alt="Before treatment"></div>' +
                        '<div class="ba_divider"></div>' +
                        '<div class="ba_side"><span class="ba_label">AFTER</span>' +
                        '<img src="' + (data.afterImg || './img/after.png') + '" alt="After treatment"></div>' +
                        '</div>' +
                        '<div class="ba_body">' +
                        '<span class="ba_tag">' + (data.tag || '') + '</span>' +
                        '<p class="ba_desc">' + (data.desc || '') + '</p>' +
                        '</div></article>';
                }).join('');
                baSection.style.display = '';
            } else {
                baSection.style.display = 'none';
            }

            // 가격표
            // 价格表
            var priceData = JSON.parse(localStorage.getItem(vKey('prices')) || 'null');
            if (priceData) {
                var tableWrap = document.querySelector('#price_list .price_table_wrap');
                if (tableWrap) {
                    tableWrap.innerHTML = priceData.map(function(cat) {
                        return '<div class="price_category">' +
                            '<h3 class="price_cat_title">' + cat.catTitle + '</h3>' +
                            '<ul class="price_items">' +
                            cat.items.map(function(item) {
                                return '<li class="price_row">' +
                                    '<span class="price_name">' + item.name + '</span>' +
                                    '<span class="price_dots"></span>' +
                                    '<span class="price_val">' + item.price + '</span>' +
                                    '</li>';
                            }).join('') +
                            '</ul></div>';
                    }).join('');
                }
            }
        })();
        /*
            엑셀 파일 따라서 카테고리 별로 
            시술명 가격
            시술명 가격
            
        */

        // Hero 이미지 롤링 배너
        // 主视觉图片滚动横幅
        (function () {
            const slides = document.querySelectorAll('.hero_slide');
            const dots   = document.querySelectorAll('.hero_dot');
            if (!slides.length) return;
            let current = 0;

            function goTo(index) {
                const prevIndex = current;
                current = (index + slides.length) % slides.length;
                if (prevIndex === current) return;

                // 새 슬라이드를 오른쪽 대기 위치로 순간 이동 (transition 없이)
                // 将新幻灯片瞬间移至右侧等待位置（无过渡动画）
                slides[current].style.transition = 'none';
                slides[current].style.transform  = 'translateX(100%)';
                void slides[current].offsetWidth; // reflow

                // 이전 슬라이드: 왼쪽으로 밀려나가기
                // 上一张幻灯片：向左滑出
                slides[prevIndex].style.transition = '';
                slides[prevIndex].style.transform  = 'translateX(-100%)';
                slides[prevIndex].classList.remove('active');

                // 새 슬라이드: 오른쪽에서 흘러들어오기
                // 新幻灯片：从右侧滑入
                slides[current].style.transition = '';
                slides[current].style.transform  = '';
                slides[current].classList.add('active');

                if (dots[prevIndex]) dots[prevIndex].classList.remove('active');
                if (dots[current])   dots[current].classList.add('active');

                // 전환 완료 후 이전 슬라이드 원위치
                // 过渡完成后将上一张幻灯片复位
                slides[current].addEventListener('transitionend', function cleanup() {
                    slides[prevIndex].style.transition = 'none';
                    slides[prevIndex].style.transform  = '';
                    void slides[prevIndex].offsetWidth;
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
