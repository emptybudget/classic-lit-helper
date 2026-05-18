# 고전문학 도우미 (Classic Literature Helper)

위키백과에서 가져온 발췌를 **Google Gemini 2.5 Flash**가 정리해, 고전문학 작품 한 편의 **사전지식 · 작가 정보 · 상징 & 주제 · 평론**을 한 페이지에 보여 주는 Next.js 14 웹앱입니다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- 정보 수집: **Wikipedia REST API** (한국어 + 영어, API 키 불필요)
- 정보 정리: **Google Gemini API** (`gemini-2.5-flash`, 무료 티어)
- Rate limit: **Upstash Redis** (IP당 하루 5회)
- 배포: **Vercel**

## 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 다음 3개 값을 채우세요.

| 키 | 설명 | 발급처 |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 API 키 | https://aistudio.google.com/apikey |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis 인스턴스 REST URL | https://console.upstash.com/ |
| `UPSTASH_REDIS_REST_TOKEN` | 같은 인스턴스의 REST 토큰 | https://console.upstash.com/ |

> Gemini 무료 티어, Upstash 무료 플랜으로 충분히 운영 가능합니다.

## Vercel 배포 절차

1. 이 저장소를 GitHub에 푸시합니다.
2. https://vercel.com/new 에서 저장소를 **Import**합니다. 프레임워크는 자동으로 **Next.js**로 감지됩니다.
3. **Environment Variables** 단계에서 위 3개 키(`GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)를 모두 등록합니다. Production / Preview / Development 모두 체크하는 걸 권장합니다.
4. **Deploy**를 누릅니다. 빌드 후 `https://<project>.vercel.app` 주소가 발급됩니다.
5. 메인 페이지에서 작품 한 편(예: 햄릿)을 검색해 정상 작동을 확인합니다.

환경변수를 빠뜨렸다면 Vercel 프로젝트 → **Settings → Environment Variables**에서 추가 후 **Deployments → Redeploy**로 재배포하세요.

## 동작 흐름

1. 사용자가 작품 제목을 입력 → `POST /api/search`
2. Upstash Redis로 IP당 하루 5회 한도 검사 → 초과 시 `429`
3. 한국어/영어 Wikipedia REST API에서 summary + 본문 HTML 발췌 수집
4. Gemini 2.5 Flash가 발췌를 근거로 정해진 JSON 스키마로 정리
5. 4개 탭(사전지식 · 작가 · 상징 · 평론) + 읽기 길잡이 배너로 렌더링

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
