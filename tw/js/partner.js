document.addEventListener('DOMContentLoaded', function () {
    var allHospitals = getHospitals();
    var regions = getPartnerRegions();
    var activeRegion = 'all';
    var searchQuery = '';
    var toolbar = document.getElementById('partner_toolbar');
    var wrap = document.getElementById('hospital_list_wrap');
    if (!wrap) return;

    function getLabels() {
        var path = window.location.pathname.replace(/\\/g, '/');
        if (path.indexOf('/ru/') !== -1) {
            return {
                search: 'Поиск клиники',
                all: 'Все',
                empty: 'Клиники не найдены.',
                noHospitals: 'Нет зарегистрированных клиник.'
            };
        }
        if (path.indexOf('/tw/') !== -1) {
            return {
                search: '搜尋診所名稱',
                all: '全部',
                empty: '找不到結果。',
                noHospitals: '目前沒有已登錄的診所。'
            };
        }
        return {
            search: 'Search hospital name',
            all: 'All',
            empty: 'No results found.',
            noHospitals: 'No registered hospitals.'
        };
    }

    var labels = getLabels();
    var isLocale = window.location.pathname.replace(/\\/g, '/');
    var imgPrefix = isLocale.indexOf('/ru/') !== -1 || isLocale.indexOf('/tw/') !== -1 ? '../' : './';
    var viewPrefix = './';

    if (!allHospitals || allHospitals.length === 0) {
        if (toolbar) toolbar.innerHTML = '';
        wrap.innerHTML = '<p class="empty_msg">' + labels.noHospitals + '</p>';
        return;
    }

    if (toolbar) {
        toolbar.innerHTML =
            '<div class="partner_search_wrap">' +
            '<i class="fa-solid fa-magnifying-glass partner_search_icon" aria-hidden="true"></i>' +
            '<input type="search" class="partner_search_input" id="partner_search" placeholder="' + labels.search + '" autocomplete="off">' +
            '</div>' +
            '<div class="partner_region_filters" id="partner_region_filters">' +
            '<button type="button" class="region_filter_btn active" data-region="all">' + labels.all + '</button>' +
            regions.map(function (r) {
                return '<button type="button" class="region_filter_btn" data-region="' + r.id + '">' + getPartnerRegionLabel(r) + '</button>';
            }).join('') +
            '</div>';

        document.getElementById('partner_search').addEventListener('input', function (e) {
            searchQuery = e.target.value.trim().toLowerCase();
            renderList();
        });

        document.getElementById('partner_region_filters').addEventListener('click', function (e) {
            var btn = e.target.closest('.region_filter_btn');
            if (!btn) return;
            activeRegion = btn.dataset.region;
            document.querySelectorAll('.region_filter_btn').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            renderList();
        });
    }

    function renderList() {
        var filtered = allHospitals.filter(function (h) {
            var matchRegion = activeRegion === 'all' || String(h.region) === String(activeRegion);
            var q = searchQuery;
            var name = (h.name || '').toLowerCase();
            var tag = (h.tag || '').toLowerCase();
            var matchSearch = !q || name.indexOf(q) !== -1 || tag.indexOf(q) !== -1;
            return matchRegion && matchSearch;
        });

        if (filtered.length === 0) {
            wrap.innerHTML = '<p class="empty_msg">' + labels.empty + '</p>';
            return;
        }

        wrap.innerHTML = filtered.map(function (h) {
            return renderPartnerHospitalCard(h, { imgPrefix: imgPrefix, viewPrefix: viewPrefix });
        }).join('');
    }

    renderList();
});
