# RealLife AI 작업 하네스/수정능력 점검 - 2026-05-12

## 확인한 문서
- `CLAUDE.md`: Claude Code 작업 컨벤션, 프로젝트 진실의 원천, SPEC 우선, 스코프 크립 금지, 반응형 제약.
- `CODEX.md`: Codex 작업 규칙, 전역 UI 레이아웃 원칙, 작업 전 확인 문서.
- `PROJECT_SPEC.md`, `RULES.md`, `RULEBOOK.md`: 룰/UX/데이터 기준.
- `HANDOFF.md`: 의사결정 히스토리.
- `TASKS.md`, `TODO.md`: 작업 큐/운영 원칙.
- `RESULT.md`: Claude Opus 4.7 자율 작업 결과, 테스트/시뮬 하네스 기록.
- `RULE_AUDIT.md`: 룰별 기준/현재 구현/확정/테스트 상태 점검표.
- `REAL_LIFE_TEST_CONTEXT.md`, `REAL_LIFE_BUG_STACK.md`, `REAL_LIFE_FIX_SCOPE_2026-05-11.md`, `REAL_LIFE_SEASON2_SCOPE_2026-05-11.md`, `REAL_LIFE_SEASON3_SCOPE_2026-05-12.md`: 현재 QA/수정 스택.
- `IVE_RENEWAL.md`, `IVE_RENEWAL_VISION.md`: 디자인 방향.
- 캐릭터/프롬프트/게임설명서/브레인스토밍 문서: 배경 의사결정과 룰 설명.

## 발견한 하네스

### 1. 룰 엔진 테스트 하네스
- `package.json`의 `npm test`는 Node 24 내장 테스트 실행:
  - `node --test "src/engine/__tests__/*.test.js"`
- 현재 테스트 파일:
  - `cards.test.js`, `dice.test.js`, `inflation.test.js`, `loan.test.js`, `recovery.test.js`, `rent.test.js`, `rules.test.js`, `station.test.js`, `tax.test.js`, `trade.test.js`
- 2026-05-12 현재 직접 실행 결과:
  - `npm test` 성공: 54 tests pass / 0 fail.

### 2. 시뮬레이션 하네스
- `package.json` scripts:
  - `npm run sim`
  - `npm run sim:1y`
  - `npm run sim:3y`
  - `npm run sim:5y`
  - `npm run sim:loanshark`
- `RESULT.md`에 Claude Code가 시드 기반 1년/3년/5년 시뮬을 돌려 룰 밸런스를 검증한 기록이 있음.
- 이 부분이 Claude Code 작업 품질의 큰 기반이었음. 룰 수정은 테스트/시뮬로 바로 깨지는지 확인 가능했기 때문.

### 3. 빌드 검증 하네스
- `npm run build` 존재.
- 2026-05-12 현재 직접 실행 결과:
  - build 성공.
  - 산출물: `dist/assets/index-D74K8kT1.js`, `dist/assets/index-B-SH9pY1.css`.
  - 경고: JS chunk 619.80 kB로 500 kB 초과.

### 4. 브라우저/CDP 스크린샷 보조 하네스
- `tmp_cdp.mjs` 존재.
- Chrome DevTools Protocol에 붙어서:
  - 페이지 이동
  - 스크린샷 저장
  - 런타임 JS eval
  가능.
- 단, 정식 테스트 스크립트가 아니라 임시 수동 보조도구 수준.

### 5. 문서 하네스
- `CLAUDE.md`는 Claude Code가 반드시 따라야 할 작업 컨벤션 역할.
- `PROJECT_SPEC.md`는 원래 진실의 원천.
- `RULE_AUDIT.md`는 룰별 차이 표.
- `REAL_LIFE_BUG_STACK.md`는 사용자 QA 스택.
- `REAL_LIFE_TEST_CONTEXT.md`는 바로 고치지 말고 스택에 쌓는 플레이 테스트 규칙.

## 부족한 하네스

### 1. UI 시각 회귀 테스트가 없음
- Playwright/Cypress/Storybook/Chromatic 같은 정식 UI 캡처/비교 하네스 없음.
- `package.json`에도 e2e/visual/test:ui 계열 스크립트 없음.
- 그래서 UI 수정은 `build 성공`만으로는 품질 보장이 안 됨.
- 카드가 슬롯 밖으로 나가는지, 캡슐 경계가 흐린지, 투명 이미지가 비치는지는 자동 검증되지 않음.

### 2. 레이아웃 불변조건 테스트가 없음
- 예: `[data-deed-slot]` 내부 카드가 슬롯 rect 안에 들어오는지.
- 주사위가 컨테이너 bounds를 넘는지.
- 배지와 금색 외곽선이 겹치는지.
- 이런 것을 JS로 측정하는 하네스가 아직 없음.

### 3. 현재 문서가 많이 쌓여 충돌 가능성이 있음
- `CLAUDE.md`/`PROJECT_SPEC.md`의 초기 MVP 방향과 최근 `REAL_LIFE_*` 시즌 문서 방향이 다름.
- Claude Code 초기 작업은 룰 엔진 중심이라 명확했지만, 현재 작업은 시즌1~3 UI/연출/예외가 많아 우선순위가 복잡함.

### 4. 기존 UI는 와이어프레임에서 출발
- `RESULT.md`에 초기 UI는 “와이어프레임 수준 스켈레톤”이라고 명시되어 있음.
- 이후 시각적 완성도를 끌어올리는 작업은 자동 하네스 없이 수동 QA 의존.

## 왜 Claude Code보다 수정능력이 떨어져 보였는지

1. Claude Code가 잘했던 영역은 룰 엔진/순수 함수/테스트/시뮬 중심이었다.
   - 테스트 54개와 시뮬이 있어서 수정 후 검증이 쉬움.
2. 지금 내가 주로 만진 영역은 복잡한 UI 레이아웃/겹침/시각 밀도/터치 우선순위다.
   - 이 영역은 자동 테스트가 거의 없고 눈으로 확인해야 함.
3. 나는 일부 수정에서 `build 성공`을 완료 기준처럼 취급했다.
   - 실제로는 스크린샷 기준 레이아웃 검사가 필요했다.
4. 긴 텔레그램 대화에 시즌1/2/3 요청이 누적되어, 한 번에 너무 많은 요구를 들고 수정했다.
   - 작은 단위로 캡처→검사→수정→재캡처 루프를 덜 돌린 게 문제.
5. `CLAUDE.md`의 SPEC 우선/단계 우선 구조와 최근 RealLife 시즌 스택이 동시에 존재한다.
   - 최신 사용자 요구가 우선인데, 문서 소스가 많아서 작업 전 정렬이 필요함.

## 앞으로 필요한 보완책

1. UI 작업 전 체크리스트 고정
   - `CODEX.md` + `REAL_LIFE_BUG_STACK.md` + 현재 시즌 스코프 확인.
   - 사인 완료 항목 제외.

2. UI 수정 후 최소 검증 게이트
   - `npm run build`
   - 로컬 화면 캡처
   - 컨테이너 내부 맞춤/겹침/비침/경계/여백 직접 검사.

3. 간단한 레이아웃 검증 스크립트 추가 권장
   - CDP로 주요 요소 rect 측정.
   - 카드/주사위/배지/캡슐이 부모 bounds 안에 있는지 검사.

4. 가능하면 Playwright 도입
   - iPad 사이즈, iPhone 가로 사이즈 캡처.
   - 주요 상태 스크린샷 저장.
   - 수동 QA 전에 자동으로 큰 삐져나감 감지.

5. 작업 단위 축소
   - “사회자 캡슐 통일”처럼 한 주제씩 수정.
   - 캡처 확인 후 다음 주제로 이동.
