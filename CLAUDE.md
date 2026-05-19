# Claude Code 인수인계

다음 세션이 시작될 때 자동으로 읽히는 파일. 매번 갱신해서 최신 상태 유지.

## 행동 가이드라인 (사용자가 강하게 요구)

1. **가정 금지**. 모르면 묻거나 추정임을 명시. 외부 한도/가격 숫자는 본인 대시보드에서 확인하라고 안내.
2. **단순함 우선**. 요청 외 기능 추가 금지, 단일 사용 추상화 금지, 불가능한 시나리오용 에러 처리 금지.
3. **수술적 변경**. 인접 코드 "개선"·리포맷 금지. 매 변경 라인이 요청에 직접 매핑돼야 함. 본인이 만든 orphan만 제거.
4. **목표 기반 실행**. 다단계 작업은 단계 + 검증 기준을 명시.

## 프로젝트 한 줄 요약

Wikipedia(한/영) + The Guardian(선택) 발췌 → Gemini가 한국어 JSON으로 정리 → 5탭 + 인용·추천·표지 UI. Upstash Redis로 IP당 일일 5회 한도, 캐시, 관리자 모드.

## 기술 스택

- Next.js 14 App Router · TypeScript · Tailwind CSS
- Vercel 배포. 로컬 빌드/테스트는 **하지 말 것** (사용자가 npm 명령 안 돌림). 검증은 Vercel 빌드로.
- 외부 API: Wikipedia REST · Open Library Covers · The Guardian Open Platform(선택) · Google Gemini
- Upstash Redis (REST)
- Gemini 모델: `gemini-3.1-flash-lite` (translate + summarize 동일 상수)

## 환경변수

| 키 | 필수 | 용도 |
| --- | --- | --- |
| `GEMINI_API_KEY` | 필수 | 번역·요약 |
| `UPSTASH_REDIS_REST_URL` | 필수 | 모든 Redis 기능 |
| `UPSTASH_REDIS_REST_TOKEN` | 필수 | 〃 |
| `GUARDIAN_API_KEY` | 선택 | 없으면 평론은 위키만으로 작성 |

## 비밀번호 (서버 라우트에만 박힘, 클라이언트 번들 노출 X)

`app/api/unlock/route.ts`
- 일반: `mjzzang` — Upstash daily limiter로 IP당 하루 1회만 충전(=일일 카운터 reset)
- 관리자: `grz` — Redis에 `classic-lit-helper:admin:{ip}` 키 7일 TTL 저장, 검색·쿼터 모두 한도 검사 스킵
- 시도당 brute-force 보호: 시간당 10회

## 디렉토리 구조

```
app/
  page.tsx                       # 홈, "use client" + Suspense. 검색·히스토리·모달 통합
  layout.tsx, globals.css
  api/
    search/route.ts              # 메인 검색 (캐시 → 한도 → translate → wiki/guardian/cover → gemini → 캐시 저장 → 한도 소비)
    quota/route.ts               # GET 잔여 횟수 (소비 X, 관리자 시 -1)
    unlock/route.ts              # POST 비밀번호 충전/관리자
  work/[slug]/
    page.tsx                     # 캐시 결과 공유 페이지 (서버 컴포넌트). 캐시 미스 시 ?q= prefill 안내
    opengraph-image.tsx          # 1200x630 OG. Google Fonts CSS API에서 Noto Serif KR 서브셋 동적 fetch
  compare/page.tsx               # /compare?a=&b= 좌우 비교. 캐시만 읽음(Gemini 호출 0)

lib/
  constants.ts                   # SEARCH_LIMIT = 5
  ratelimit.ts                   # Upstash Ratelimit 3개(search/unlock/unlock-daily) + admin set/check
  cache.ts                       # 결과 캐싱. query 정규화 키 + data.title 키 양쪽 저장
  wikipedia.ts                   # ko/en summary + 본문 HTML 발췌(헤더 보존, 평론 섹션 우선) + disambiguation 후보
  guardian.ts                    # Books 섹션 검색, 키 없으면 빈 배열 반환
  openlibrary.ts                 # 표지 cover_i → covers.openlibrary.org URL
  gemini.ts                      # MODEL 상수, translate + summarize, JSON 강제 스키마
  history.ts                     # localStorage 검색 히스토리(최근 10개)

components/
  SearchForm, ResultTabs, LoadingSpinner, HelpModal, UnlockModal

types/literature.ts              # LiteratureResult, SearchState, DisambiguationOption 등
```

## Redis 키 prefix

| Prefix | 의미 | 만료 |
| --- | --- | --- |
| `classic-lit-helper:cache:*` | 작품 결과 캐시 | 24h |
| `classic-lit-helper:rl:*` | 일일 5회 검색 카운터 | 1d (fixedWindow) |
| `classic-lit-helper:admin:*` | 관리자 모드 IP 플래그 | 7d |
| `classic-lit-helper:unlock:*` | 비밀번호 시도 (시간당 10회) | 1h |
| `classic-lit-helper:unlock-daily:*` | mjzzang 일일 1회 제한 | 1d |

## 작품 결과 JSON 스키마 (Gemini 출력)

`LiteratureResult` in `types/literature.ts`:
- title, author, cover_url
- background { era, genre, context[], sources[] }
- author_info { life, motivation, literary_position, sources[] }
- characters[] { name, role, description }
- symbols[] { symbol, meaning, example }
- quotes[] { text, context }     ← 작품 자체 인용. 원어 보존 허용
- criticism[] { critic, perspective, quote, source }  ← 한국어 번역 강제 (영어 그대로 두지 말 것)
- recommendations[] { title, why }
- reading_tips

## Git 워크플로 (중요 — 이전 세션이 헷갈렸음)

**브랜치:**
- 개발 브랜치: `claude/classical-literature-helper-CvVDX`
- 운영 브랜치: `main` (Vercel Production)

**원칙: 매 커밋 후 즉시 main에 fast-forward 머지.**

```bash
# 1. feature 브랜치에서 변경 → 커밋
git add -A
git commit -m "..."

# 2. feature 브랜치 푸시
git push origin claude/classical-literature-helper-CvVDX

# 3. main에 ff-only 머지
git checkout main
git merge --ff-only claude/classical-literature-helper-CvVDX
git push origin main

# 4. feature 브랜치로 복귀 (다음 작업 위해)
git checkout claude/classical-literature-helper-CvVDX
```

**현재 상태 (이 파일을 마지막으로 갱신한 시점):**
- 작업 브랜치 == origin/main == HEAD가 모두 같은 커밋을 가리킴
- "이미 머지됨" 정상 동작. `git rev-parse main HEAD` 확인하면 동일 해시
- 새 작업 시작 전에 위 명령으로 동기 확인하면 안전

**git 커미터:** `claude@anthropic.com` / `Claude` (per-command `-c` 옵션 사용)

## Vercel 배포

- main 푸시 시 자동 재배포 (1~2분)
- 환경변수 변경하면 **Deployments → Redeploy 필수** (그냥 둬도 새 배포는 안 잡힘)
- 비밀번호·모델 ID 변경 시 사용자에게 "1~2분 뒤 확인하라"고 안내

## 자주 묻는 작업

**캐시 비우기:** Upstash 콘솔 Data Browser → `classic-lit-helper:cache:*` 검색 → 개별/전체 삭제. 코드로 풀려면 `/api/cache/clear` 추가 가능(현재 없음).

**모델 교체:** `lib/gemini.ts`의 `MODEL` 상수 한 줄 + footer(`app/page.tsx`)와 `README.md`의 표기. Vercel 재배포 후 검증.

**일일 한도 도달:** `/api/search`의 `buildQuotaErrorResponse`가 Gemini 에러 메시지에서 `model:`, `limit:` 정규식으로 파싱해 사용자에게 노출. 모델 ID·한도값이 메시지에 보임.

## 알려진 한계 / 의도된 트레이드오프

- **시뮬레이션 로딩 단계** (`components/LoadingSpinner.tsx` STAGES): 실제 단계 추적 아님. 체감 진행감용. 정확하게 하려면 streaming response 필요.
- **UI 카피의 "5회" 문자열 하드코딩**: SEARCH_LIMIT 상수가 있지만 카피 문구는 가독성 위해 그대로 둠 (#2 위반 회피).
- **기존 캐시 항목의 누락 필드**: 스키마 확장 전(characters/quotes/recommendations/cover_url) 캐시는 24h 만료 시까지 fallback UI로 표시. 강제 갱신은 Redis 콘솔에서 키 삭제.
- **OG 이미지 첫 요청**: Google Fonts fetch로 ~500ms 추가. Vercel CDN이 이후 캐시.
- **Open Library 표지**: 영어권 작품에 강하고 한국 고전·현대 작품엔 부족할 수 있음.
- **Gemini 무료 티어 한도**: Google이 자주 바꿈. 본인 대시보드(https://ai.google.dev/rate-limit)에서 직접 확인 필수. 추정 수치 제공 금지.

## 작업할 때 하지 말 것

- `npm install` / `npm run build` / `npm run dev` 실행 (사용자가 명시적으로 금지)
- 가이드라인 위반 리팩터 (특히 #3 — 인접 코드 정리 금지)
- 새 npm 의존성 추가는 신중하게. 추가 시 사용자 확인
- 외부 API 한도 수치 단정적으로 말하기. 본인 대시보드 확인 안내가 원칙
- `git push --force` / `--no-verify` / `--amend` (사용자가 명시적으로 허가하지 않는 한)

## 사용자 톤 & 응답 스타일 (사용자가 선호하는)

- 한국어 응답 (영어 코드/명령은 그대로)
- 솔직함 > 정중함. 모르면 모른다고 함
- 코드 변경 시: 어떤 파일·어떤 줄·왜 그렇게 했는지 짧게 명시
- 긴 마크다운보다 표·코드블록 중심
