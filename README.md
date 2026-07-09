# BGG Frontend

**Beauty Glow Goddess (BGG)** — 서울 피부과 클리닉 예약·안내를 위한 다국어 프론트엔드 사이트입니다.  
해외 방문객이 신뢰할 수 있는 병원을 찾고, 온라인 예약·문의·리뷰를 이용할 수 있도록 구성되어 있습니다.

## 주요 기능

| 구분 | 설명 |
|------|------|
| **메인** | 히어로 슬라이더, 서비스 소개, 파트너 병원 미리보기 |
| **About** | 회사 소개 (`company.html`) |
| **Clinics** | 파트너 병원 목록, 지역별 필터 (강남·홍대·성수·명동) |
| **Booking** | 온라인 예약 안내, 예약 신청, 예약 확인 |
| **Review** | 후기 작성 |
| **Request** | 1:1 문의 |
| **View** | 병원 상세 페이지 (소개, 가격, 프로모션, 오시는 길, Google 리뷰) |
| **Admin** | 팝업·파트너·View·예약·문의 관리 (`admin.html`) |

## 지원 언어

| 언어 | 경로 | 비고 |
|------|------|------|
| English | `/` (루트) | 기본 사이트 |
| Русский | `/ru/` | 러시아어 |
| 繁體中文 | `/tw/` | 대만 번체 |

헤더의 국기 아이콘으로 언어를 전환합니다. 동일한 페이지 구조를 각 언어 폴더에서 유지합니다.

## 기술 스택

- HTML5 / CSS3 / Vanilla JavaScript
- [Font Awesome](https://fontawesome.com/) 아이콘
- Google Maps Places API (병원 상세 지도·리뷰)
- 데이터 저장: **localStorage** (백엔드 연동 전 임시 저장소)

> 별도 빌드 도구 없이 정적 파일로 동작합니다. 로컬 서버 또는 웹 호스팅에 그대로 배포할 수 있습니다.

## 프로젝트 구조

```
BGG/
├── index.html          # 메인 (EN)
├── company.html        # 회사 소개
├── partner.html        # 파트너 병원 목록
├── booking.html        # 예약 안내
├── reservation.html    # 예약 신청
├── check.html          # 예약 확인
├── review.html         # 후기
├── request.html        # 문의
├── view.html           # 병원 상세
├── admin.html          # 관리자 페이지
├── country_selection.html  # Admin 국가(언어) 선택
├── css/                # 페이지별 스타일
├── js/
│   ├── common.js       # 공통 헤더/푸터, 병원 데이터, 유틸
│   ├── i18n.js         # Admin 다국어 (KR/CN/EN)
│   └── *.js            # 페이지별 스크립트
├── img/                # 이미지 에셋
├── ru/                 # 러시아어 사이트
└── tw/                 # 대만 번체 사이트
```

## 로컬 실행

정적 파일이므로 아래 중 하나로 실행합니다.

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .
```

브라우저에서 `http://localhost:8080` 접속.

### Google Maps API

`view.html`, `ru/view.html`, `tw/view.html`에서 Google Maps API 키가 필요합니다.

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initViewGoogleMaps" async></script>
```

`YOUR_API_KEY`를 실제 키로 교체하세요.

## Admin

- **접속:** `admin.html`
- **기능:** 팝업 이미지, 파트너 병원, View 페이지 콘텐츠, 예약 관리, 문의 관리
- **언어:** Admin UI는 KR / CN / EN 지원 (`js/i18n.js`)
- **국가 선택:** `country_selection.html`에서 EN / RU / TW 사이트별 관리 대상 선택

## 데이터 저장 (localStorage)

현재 병원·예약·문의 등의 데이터는 브라우저 `localStorage`에 저장됩니다.  
코드 전반에 `TODO: [BACKEND]` 주석이 표시되어 있으며, 아래 **백엔드 전환 가이드**를 참고해 API로 교체합니다.

| 키 | 용도 |
|----|------|
| `bgg_hospitals` | 파트너 병원 목록 |
| `bgg_partner_regions` | 지역 필터 |
| `bgg_hconfig_{id}` | 병원별 예약 설정 (운영시간, 휴게시간) |
| `bgg_closed_days_{id}` | 병원별 정기 휴무 요일 |
| `bgg_closed_dates_{id}` | 병원별 임시 휴무일 |
| `bgg_blocked_{id}` | 병원별 예약 차단 시간 |
| `bgg_view_{id}_*` | 병원별 View 페이지 콘텐츠 |
| `bgg_reservations` | 예약 목록 |
| `bgg_inquiries` | 1:1 문의 |
| `bgg_popup*` | 메인 팝업 이미지·제목 |
| `bgg_admin_auth` | Admin 로그인 상태 (임시) |

---

## 백엔드 전환 가이드

### 1. 전환 개요

| 항목 | 현재 | 전환 후 |
|------|------|---------|
| 데이터 저장 | 브라우저 `localStorage` (기기·브라우저별 분리) | 서버 DB + 파일 스토리지 |
| Admin 인증 | `localStorage` 플래그 + 클라이언트 비밀번호 | 서버 세션 / JWT |
| 예약 중복 검증 | 클라이언트 `bgg_blocked` 재확인 | 서버 트랜잭션 + 409 Conflict |
| 실시간 동기화 | `storage` 이벤트 (같은 브라우저 탭 간) | WebSocket 또는 SSE |
| 이미지 | Base64 / Data URL을 localStorage에 저장 | S3·CDN 등 파일 업로드 API |

**다국어(EN / RU / TW)** 사이트는 동일 API를 공유하되, View 콘텐츠·팝업 등은 `locale` 파라미터(`en`, `ru`, `tw`)로 분리 저장하는 것을 권장합니다.

### 2. 백엔드 인프라 요소

| 구성 요소 | 필요 이유 |
|-----------|-----------|
| **REST API 서버** | 병원·예약·문의·콘텐츠 CRUD |
| **관계형 DB** (PostgreSQL, MySQL 등) | 병원, 예약, 문의, 설정 데이터 영구 저장 |
| **파일 스토리지** | 병원 이미지, 팝업, View 히어로·BA·가격표 등 (현재 Base64로 localStorage 저장) |
| **Admin 인증** | JWT 또는 세션 쿠키, 비밀번호 해시(bcrypt 등) |
| **이메일/알림** (선택) | 예약 접수·확정 시 운영자·고객 알림 |
| **Google Maps API 키** | 서버에서 Place ID 검증 또는 프록시 (클라이언트 키 노출 최소화) |
| **CORS 설정** | 프론트엔드 정적 호스팅 도메인 허용 |
| **환경 변수** | `API_BASE_URL`, `GOOGLE_MAPS_API_KEY`, `ADMIN_JWT_SECRET`, DB 연결 정보 |

### 3. API 엔드포인트 설계

#### Public API (사용자 사이트)

| Method | Endpoint | 용도 | 대체 대상 (localStorage) |
|--------|----------|------|--------------------------|
| `GET` | `/api/popups?locale=en` | 메인 팝업 목록 (이미지 URL + 제목) | `bgg_popup*`, `bgg_popup_count` |
| `GET` | `/api/hospitals` | 파트너 병원 전체 목록 | `bgg_hospitals` |
| `GET` | `/api/hospitals?limit=4` | 메인 파트너 미리보기 (상위 4개) | `index.js` |
| `GET` | `/api/hospitals/:id` | 단일 병원 기본 정보 | `getHospitals()` 필터 |
| `GET` | `/api/hospitals/:id/config` | 예약 설정 (운영시간, 휴게시간, times 배열) | `bgg_hconfig_{id}` |
| `GET` | `/api/hospitals/:id/closed-days` | 정기 휴무 요일 | `bgg_closed_days_{id}` |
| `GET` | `/api/hospitals/:id/closed-dates` | 임시 휴무일 | `bgg_closed_dates_{id}` |
| `GET` | `/api/hospitals/:id/blocked-times?date=YYYY-MM-DD` | 특정 날짜 예약 불가 시간 | `bgg_blocked_{id}` |
| `GET` | `/api/hospitals/:id/view-data?locale=en` | View 페이지 전체 콘텐츠 일괄 조회 | `bgg_view_{id}_*` |
| `GET` | `/api/reservations?name=&phone=` | 예약 확인 (이름+전화번호) | `bgg_reservations` 필터 |
| `POST` | `/api/reservations` | 예약 신청 | `bgg_reservations` + `bgg_blocked` |
| `POST` | `/api/inquiries` | 1:1 문의 제출 | `bgg_inquiries` |
| `GET` | `/api/partner-regions` | 지역 필터 목록 | `bgg_partner_regions` |

#### Admin API (인증 필요)

| Method | Endpoint | 용도 |
|--------|----------|------|
| `POST` | `/api/admin/login` | Admin 로그인 → 토큰 발급 |
| `POST` | `/api/admin/logout` | 로그아웃 |
| `GET/PUT` | `/api/admin/popups` | 팝업 CRUD + 순서 변경 |
| `GET/PUT` | `/api/admin/hospitals` | 파트너 병원 CRUD + 순서 변경 |
| `GET/PUT` | `/api/admin/partner-regions` | 지역 필터 관리 |
| `GET/PUT` | `/api/admin/hospitals/:id/view-data` | View 콘텐츠 편집 (locale별) |
| `GET/PUT` | `/api/admin/hospitals/:id/config` | 예약 설정 (운영시간, 휴게시간) |
| `GET/PUT` | `/api/admin/hospitals/:id/availability` | 휴무일·차단 시간 관리 |
| `GET` | `/api/admin/reservations` | 예약 목록 (필터·정렬) |
| `PATCH` | `/api/admin/reservations/:id` | 예약 상태 변경 (`waiting` → `confirmed` / `cancelled`) |
| `POST` | `/api/admin/reservations` | Admin 수동 예약 등록 (WhatsApp 등) |
| `GET/PATCH` | `/api/admin/inquiries` | 문의 목록·읽음 처리 |
| `POST` | `/api/admin/upload` | 이미지 업로드 → URL 반환 |

#### 실시간 (선택)

| Method | Endpoint | 용도 |
|--------|----------|------|
| `GET` (SSE) | `/api/availability-stream?hospitalId=` | 예약 차단 시간 실시간 갱신 |
| WebSocket | `/ws/availability` | Admin·예약 페이지 간 동기화 |

> 현재 `reservation.js`·`admin.js`는 `storage` 이벤트로 탭 간 동기화합니다. 백엔드 전환 시 SSE/WebSocket으로 대체해야 합니다.

### 4. 데이터 모델 (스키마 참고)

#### Hospital (파트너 병원)

```json
{
  "id": 1,
  "name": "강남 연세의원",
  "img": "https://cdn.../hospital.jpg",
  "logo": "https://cdn.../logo.png",
  "tag": "#피부과 #강남",
  "rating": 4.8,
  "region": 1,
  "sortOrder": 0
}
```

#### Hospital Config (예약 설정) — `bgg_hconfig_{id}`

```json
{
  "times": ["09:00", "09:30", "10:00"],
  "breakEnabled": true,
  "breakStart": "12:00",
  "breakEnd": "13:00"
}
```

#### Reservation — `bgg_reservations`

```json
{
  "id": "1709123456789",
  "hospitalId": 1,
  "hospital": "강남 연세의원",
  "date": "2026-07-15",
  "time": "14:00",
  "name": "John Doe",
  "phone": "01012345678",
  "nationality": "USA",
  "email": "john@example.com",
  "treatment": "Laser",
  "request": "First visit",
  "status": "waiting",
  "source": "homepage"
}
```

- **status 값:** `waiting` (접수 대기) → `confirmed` (확정) / `cancelled` (취소)
- **POST `/api/reservations`:** 서버에서 동일 `hospitalId + date + time` 중복 검증 후 `409 Conflict` 반환

#### Inquiry — `bgg_inquiries`

```json
{
  "id": "inq_1709123456789_abc12",
  "name": "Jane",
  "phone": "01098765432",
  "email": "jane@example.com",
  "subject": "Booking question",
  "content": "...",
  "date": "2026-07-09T05:00:00.000Z",
  "status": "unread"
}
```

#### View Data — `bgg_view_{hospitalId}_*` (단일 API로 통합 권장)

`GET /api/hospitals/:id/view-data` 응답 예시:

```json
{
  "heroCount": 3,
  "heroImages": ["url1", "url2", "url3"],
  "heroName": "Clinic Name",
  "heroSub": "Subtitle",
  "aboutTitle": "...",
  "aboutDesc": "...",
  "aboutImages": ["..."],
  "aboutHighlights": ["..."],
  "doctorImg": "url",
  "doctorLabel": "Chief Doctor",
  "doctorName": "Dr. Kim",
  "doctorBio": "...",
  "promoBanner": "url",
  "promoCards": [],
  "ba": [],
  "prices": [],
  "directionsAddress": "서울시 ...",
  "directionsMap": "embed_url",
  "directionsHours": [],
  "placeId": "ChIJ..."
}
```

#### Popup — `bgg_popup*`

```json
[
  { "id": "popup1", "img": "https://...", "header": "Welcome" },
  { "id": "popup2", "img": "https://...", "header": "Event" }
]
```

### 5. 프론트엔드 수정 사항

| 파일 | 변경 내용 |
|------|-----------|
| `js/common.js`, `ru/js/common.js`, `tw/js/common.js` | `getHospitals()`, `getHospitalConfig()` → `async` + `fetch` |
| `js/index.js`, `ru/js/index.js`, `tw/js/index.js` | 팝업·병원 미리보기 API 호출 |
| `js/partner.js`, `ru/js/partner.js`, `tw/js/partner.js` | `getHospitals()` 비동기 대응 |
| `js/view.js`, `ru/js/view.js`, `tw/js/view.js` | `GET /api/hospitals/:id/view-data` 단일 호출로 통합 |
| `js/reservation.js`, `ru/js/reservation.js`, `tw/js/reservation.js` | 예약 설정·차단시간 API, `POST /api/reservations`, SSE 연동 |
| `js/check.js`, `ru/js/check.js`, `tw/js/check.js` | `checkReservation()` → `async` + `GET /api/reservations` |
| `js/request.js`, `ru/js/request.js`, `tw/js/request.js` | `submitReview()` → `async` + `POST /api/inquiries` |
| `js/admin.js` | 전체 CRUD를 Admin API로 교체, `localStorage` 제거, JWT 헤더 첨부 |

**공통 변경 패턴:**

```javascript
// Before
const hospitals = getHospitals();

// After
const hospitals = await fetch('/api/hospitals').then(r => r.json());
```

- `DOMContentLoaded` 핸들러 및 호출 함수를 `async`로 변경
- API Base URL은 환경별 설정 (`window.API_BASE_URL` 또는 빌드 시 주입)
- 이미지 업로드: Base64 대신 `POST /api/admin/upload` → 반환 URL 저장

### 6. Admin 인증 전환

| 현재 | 전환 후 |
|------|---------|
| 클라이언트 비밀번호 비교 (`checkPw()`) | `POST /api/admin/login` → JWT/세션 |
| `localStorage.bgg_admin_auth = '1'` | `HttpOnly` 쿠키 또는 `Authorization: Bearer` 헤더 |
| 모든 Admin API 무방비 | 미들웨어로 토큰 검증 |

### 7. 외부 서비스

| 서비스 | 용도 | 비고 |
|--------|------|------|
| **Google Maps Places API** | View 지도, Review 페이지 Google 리뷰 | `placeId`는 DB에 저장, API 키는 서버 관리 권장 |
| **파일 CDN** | 병원·팝업·View 이미지 | localStorage Base64 → URL 전환 필수 |

### 8. 권장 전환 순서

1. **인프라** — API 서버, DB, 파일 스토리지, CORS
2. **병원·지역** — `GET /api/hospitals`, `GET /api/partner-regions` (읽기 전용부터)
3. **View 데이터** — `GET /api/hospitals/:id/view-data`
4. **예약** — config/closed/blocked 조회 → `POST /api/reservations` (중복 검증 포함)
5. **문의** — `POST /api/inquiries`
6. **Admin CRUD** — 팝업, 병원, View 편집, 예약·문의 관리
7. **실시간** — SSE/WebSocket (예약 차단 동기화)
8. **마이그레이션** — 기존 localStorage 데이터 → DB 이관 스크립트 (선택)

### 9. 보안 체크리스트

- [ ] Admin API 전 구간 인증·권한 검증
- [ ] 예약 API Rate Limiting (스팸 방지)
- [ ] `GET /api/reservations` — 이름+전화번호만으로 조회 시 개인정보 보호 (최소 정보 노출)
- [ ] 이미지 업로드 파일 타입·크기 제한
- [ ] Google Maps API 키 서버 측 관리 또는 도메인 제한
- [ ] HTTPS 적용
- [ ] CORS 허용 origin 화이트리스트

### 10. 코드 내 TODO 위치

`TODO: [BACKEND]` 주석이 있는 주요 파일:

```
js/common.js, js/index.js, js/view.js, js/reservation.js, js/check.js, js/request.js
ru/js/common.js, ru/js/index.js, ru/js/view.js, ru/js/reservation.js, ru/js/check.js, ru/js/request.js
tw/js/common.js, tw/js/index.js, tw/js/view.js, tw/js/reservation.js, tw/js/check.js, tw/js/request.js
js/admin.js (localStorage 기반 전체 — API 교체 필요)
```

## 원격 저장소

| Remote | URL |
|--------|-----|
| jaerang | `http://172.30.1.106:3000/jaerang/BGG.git` |
| jm | `http://172.30.1.106:3000/jm/BGG_frontend.git` |
| github | `https://github.com/parkjaerang/BGG.git` |

## 최근 변경 사항

- 프로모션 페이지 제거
- 러시아어(ru) · 대만 번체(tw) 번역 및 콘텐츠 업데이트
- 파트너 페이지 지역명 EN 표기 및 다국어 UI 개선
- Admin · booking · partner · view 페이지 UI 정비

## 라이선스

Private — Beauty Glow Goddess
