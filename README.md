# 고전문학 도우미 (Classic Literature Helper)

위키백과·The Guardian 발췌를 **Google Gemini 2.5 Flash Lite**가 정리해, 고전문학 작품 한 편의 **사전지식 · 작가 · 등장인물 · 상징 · 평론**을 한 페이지에 보여 주는 Next.js 14 웹앱입니다. 핵심 인용 배너, 함께 읽을 작품 추천, 검색 결과 캐싱(24h)·공유 URL·두 작품 비교 모드까지 포함합니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- 정보 수집: **Wikipedia REST API** (한/영) + (선택) **The Guardian Open Platform**
- 영어 표제어 변환·요약: **Google Gemini API** (`gemini-2.5-flash-lite`, 무료 티어 약 1,000 RPD)
- Rate limit: **Upstash Redis** (IP당 하루 5회)
- 배포: **Vercel**

## 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 값을 채우세요.

| 키 | 필수 | 설명 | 발급처 |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | ✅ | Google AI Studio 발급 키 | https://aistudio.google.com/apikey |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST URL | https://console.upstash.com/ |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | 같은 인스턴스의 REST 토큰 | https://console.upstash.com/ |
| `GUARDIAN_API_KEY` | ⭕ 선택 | 평론 탭 보강용 The Guardian 키 | https://open-platform.theguardian.com/access/ |

> Gemini·Upstash·Guardian 모두 무료 티어로 충분히 운영 가능합니다. Guardian 키가 없으면 평론은 위키백과 발췌로만 작성됩니다.

## Vercel 배포 절차

1. 이 저장소를 GitHub에 푸시합니다.
2. https://vercel.com/new 에서 저장소를 **Import**합니다. 프레임워크는 자동으로 **Next.js**로 감지됩니다.
3. **Environment Variables** 단계에서 위 3개 키(`GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)를 모두 등록합니다. Production / Preview / Development 모두 체크하는 걸 권장합니다.
4. **Deploy**를 누릅니다. 빌드 후 `https://<project>.vercel.app` 주소가 발급됩니다.
5. 메인 페이지에서 작품 한 편(예: 햄릿)을 검색해 정상 작동을 확인합니다.

환경변수를 빠뜨렸다면 Vercel 프로젝트 → **Settings → Environment Variables**에서 추가 후 **Deployments → Redeploy**로 재배포하세요.

## 동작 흐름

1. 사용자가 작품 제목을 입력 → `POST /api/search`
2. Redis 캐시 조회. 24h 이내 같은 작품이면 Gemini 호출 없이 즉시 반환 (사용자 한도 소비 X)
3. 캐시 미스면 IP별 일일 5회 한도 검사 (관리자 모드는 스킵)
4. 한글 제목이면 Gemini로 영어 표제어 변환
5. 영문 Wikipedia(주) + 한글 Wikipedia(보조)에서 summary·본문 HTML 발췌. 본문은 "Themes/Reception/Legacy" 등 평론 관련 섹션 우선 추출. disambiguation(동명 항목)이면 후보 목록 반환
6. Open Library Covers API로 작품 표지 이미지 병렬 fetch
7. `GUARDIAN_API_KEY`가 있으면 The Guardian Books 섹션에서 평론 기사 발췌 병렬 수집
8. Gemini 2.5 Flash Lite가 발췌를 근거로 한국어 JSON 한 개로 정리 (사전지식·작가·등장인물·상징·인용·평론·추천 작품·읽기 길잡이)
9. 결과를 Redis에 24h TTL로 캐싱 (원본 쿼리 키 + 정규화된 작품 제목 키, 양쪽으로 조회 가능)
10. 5탭 UI + 핵심 인용 배너 + 읽기 길잡이 + 추천 작품 카드로 렌더링

## 주요 페이지

- `/` — 검색 홈. 최근 본 작품 패널(localStorage 10개), 잔여 횟수 뱃지, 사용 안내 모달
- `/work/[slug]` — 캐시된 결과 공유 페이지. 동적 OG 이미지(`opengraph-image.tsx`)로 카톡/트위터 미리보기 카드 생성
- `/compare?a=&b=` — 두 작품 나란히 비교. 캐시된 결과만 사용 (검색 슬롯 추가 소비 없음)
- `POST /api/search` — 메인 검색 엔드포인트
- `GET /api/quota` — 잔여 횟수/관리자 여부 조회 (비소비)
- `POST /api/unlock` — 비밀번호 충전. 일반 패스워드는 하루 1회 5회 충전, 관리자 패스워드는 7일 무제한

## API

### `POST /api/search`

요청

```json
{ "title": "햄릿" }
```

성공 응답

```json
{ "data": { "title": "햄릿", "author": "...", "background": { ... }, ... } }
```

한도 초과 (`429`)

```json
{ "error": "오늘 검색 횟수(5회)를 모두 사용했어요.", "rate_limited": true, "resetIn": 12345 }
```

Wikipedia에 없음 (`404`)

```json
{ "error": "한국어/영어 위키백과 모두에서 해당 작품을 찾지 못했어요." }
```

## 라이선스

개인/학습용 데모.
