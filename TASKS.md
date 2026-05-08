# 🔥 TASKS.md — 작업 스택 (실시간)

> 컨텍스트 날아가도 살아남는 작업 큐.
> AI 에이전트가 작업 시작 전 / 작업 끝 후 무조건 갱신.
>
> 상태 기호: `🔄 진행중` / `✅ 완료` / `⏳ 아직` / `🚫 폐기`

마지막 갱신: 2026-05-07

---

## 🔄 진행중

(없음)

---

## ⏳ 아직 (대기 큐)

### 외부 AI 분석 채택분 (2026-05-07 추가)
출처: 외부 GPT의 UI 디테일 업 제안 → 우리 의도와 안 충돌하는 것만 추림.

| 번호 | 작업 | 어떻게 박을지 | 예상 시간 |
|---|---|---|---|
| ⓡ | 배경 종이 노이즈 질감 | `body` 또는 양피지 카드에 SVG noise 패턴 + multiply blend (4~8% opacity) | 20분 |

### 거부/충돌 (안 박음)
- 캐릭터 금테 — 사용자 직전 "투명 액자만"과 충돌
- 세리프 서예체 폰트 — Black Han Sans/Oswald 이미 충분

---

## 🔄 진행중

(없음 — 사용자 명령 대기)

---

## ✅ 완료 (시간 역순)

### 2026-05-07 Codex 이어받기 확인/정리
- ⓜ **빈 부동산 슬롯 결 변경** — `EmptyDeed` 에 작은 🏠 ghost 아이콘 + 점선만 남아있는 구현 확인.
- ⓝ **컬러띠 광택** — `PropertyCard` 컬러띠 상단 미세 `linear-gradient` 구현 확인.
- ⓞ **현금 금색 아이콘 + 글로우** — `GameHeader` 현금 옆 💰 아이콘 + 골드/레드 글로우 구현 확인.
- ⓟ **턴종료 버튼 글로우** — `OtherPlayersStrip` 턴 종료 버튼 `turn-end-glow` 구현 확인.
- ⓠ **패시브 슬롯 훈장 결** — `PassiveChip` 을 둥근 메달리온 스타일로 변경. 활성은 금색 seal, 비활성은 회색 seal + 🔒 아이콘.
- 검증: ⚠️ `npm.cmd test` / `npm.cmd run build` 는 현재 Codex 샌드박스에서 Node child process spawn 이 `EPERM` 으로 막혀 실행 불가.

### 2026-05-07 (한 번에 6개 일괄 박음 — 자율 진행)
- ⓕ **시작 자금 numpad 모달** (`NumPadModal.jsx` 신규) — 검정 배경 + 4×4 키 (`7 8 9 ⌫ / 4 5 6 C / 1 2 3 00 / 0×2 확인×2`) + spring 애니메이션 + ESC/Enter/Backspace/숫자 키 인식. NumberRow에 `enableNumPad` prop. Setup 시작 자금만 numpad 모드
- ⓔ **사전 분배 숫자화** — `predistributeCount: number` (0~6, 기본 4). gameState.js 분배 로직 number 기반 + 옛 boolean predistribute 하위 호환 fallback. Setup BoolRow → NumberRow (프리셋 0/2/4/6)
- ⓓ **이벤트 ↔ 데스매치 분리** — rules.js:314 게이팅 `state.options.eventCards` 제거 (데스매치는 자체 트리거만). 데스매치 트리거가 `deathmatchStartMinutes > 0` 게이팅. Setup 프리셋 [0,15,20,30,45]에 0 = "없음" 라벨. NumberRow `presetLabels` prop 추가
- ⓒ **옵션 토글 우측 돌출** — 토글 크기 `h-6 w-11` + `mr-[-18px]` 음수 마진 + 그림자 강화 + Card `overflow-visible` 명시
- ⓑ **로고 Lucid 결 에너지 흐름** — `index.css .energy-text` 유틸 (linear-gradient sweep + background-clip text + 280% bg-size 3.6초 loop + drop-shadow 3겹 글로우). 옛 text-shadow 폐기 (background-clip 충돌)
- ⓐ **로고 표기**: `THE REALLIFE` → `The RealLife` (Setup.jsx h1)
- ⓛ **60분룰 안내 → STEP 1 hint 인라인** + 우측 패널 맨 아래 60분룰 배지 제거
- ⓚ **STEP 3 1p 옆 캐릭터 이름 라벨 제거** (input만 남김, 더 깔끔)
- ⓙ **이름 input placeholder = "이름을 입력해주세요"** (캐릭터 이름 채움 X)
- ⓘ **시작 버튼 재배치**: 우측 패널 맨 아래(`mt-auto`), `py-6 text-3xl 🎲 1개`, ready 시 `step-glow` 노란 펄스
- ⓗ **노란 글로우 STEP 강조** — `index.css @keyframes step-glow` + Setup `Card` 컴포넌트 `active` prop. `activeStep = picked < numPlayers ? 2 : null` 로직. 시작 버튼도 `startReady` 시 같은 클래스
- ⓖ **캐릭터 카드 재디자인** — 이름 폰트 18~20px (캐릭터 색 + 텍스트 글로우 + letter-spacing) / 이미지↔이름 사이 `gap-3` 확대 / Y축 회전 제거 / `scale: [1, 1.28, 1.05, 1]` 더 강조 / `drop-shadow` 골드 플래시 + `radial-gradient` 빛 폭발 (0.6s) `Setup.jsx CharacterPick`
- ④ **이벤트/데스매치 분리 결정** — B안+없음 키 (결정만, 코드 미반영)
- ③ **P0/P1/.. → 1p/2p/.. 일괄 교체 (12곳)** — 헤더/스테이지/푸터/모달/카드 title/객주 멘트/엔진 fallback
- ② **빙그르르 = Y축 플립 + scale pop** — Setup 캐릭터 카드 클릭 시 `rotateY: 360` + `scale: [1, 1.15, 1]`, 부모 `perspective: 600px`
- ① **캐릭터 이미지 키 통일** — `scripts/normalize_characters.py` 작성·실행. 4 PNG 모두 400×600 캔버스 + 캐릭터 510px + 하단 정렬

### 이전 완료 (이번 세션 전반)
- 메인 화면 4구역 재구성 (헤더/스테이지/덱/푸터)
- StatusBoard (패시브/매턴/상태)
- 보유 부동산 5×2 PropertyCard h-full
- AssetFrame `transparent` 모드
- TabletShell (PC에서 iPad mockup)
- 도심 배경 (CityBackground 차들 슬라이드) Setup에도 적용
- 모노폴리 양피지 결 디자인 토큰 (`tailwind.config.js`)
- 6 모달 (Property/Trade/Event/YearEnd/Deathmatch/Recovery)
- 갈색 카드 글로우 (`.deed-surface`)
- PropertyModal: 스카이라인 풀블리드, 컬러셋 tint, X z-50, 양반 소유+단계 표시
- 사또/원님 → 임금 (전 코드/문서)
- 관리자 페이지 #admin (자산 슬롯 49개 오버라이드)

---

## 📜 운영 원칙 (고정)

1. **사용자 메시지 = 즉시 스택에 박기**. 코드 손 안 대기 전 정리 먼저.
2. **작업 단위 끝나면 "박았음/안 박았음" 명시 보고**. 무음 X.
3. **TASKS.md 매 작업 후 갱신**. 컨텍스트 날아가도 다음 세션 이어가게.
4. **결정 사항은 본문에 "결정 박힘"으로 명시**. 코드 미반영이면 그렇게 표시.
5. **옛 작업은 ✅ 완료 섹션 시간 역순**. 한참 지난 건 묶어서 요약.

---

## 🗂 관련 문서
- `RULEBOOK.md` — 통합 룰북 (개발자 참조)
- `게임설명서.md` — 플레이어용 설명서
- `BRAINSTORM_LOG.md` — 의사결정 히스토리
- `TODO.md` — 룰엔진 구현 체크리스트 (레거시)
- `PROJECT_SPEC.md` — 전체 명세
- `CLAUDE.md` — AI 작업 컨벤션
