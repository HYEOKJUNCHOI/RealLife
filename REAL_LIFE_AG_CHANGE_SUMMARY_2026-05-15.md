# RealLife AG 작업 이후 정리본 - 2026-05-15

기준: 2026-05-13 수요일 17:00 이후 ~ 2026-05-15 현재

## 1. 전체 결론

AG 커밋 기간 동안 RealLife는 크게 두 방향으로 변경됨.

1. 블랙아웃/저장/정산 관련 긴급 오류 수술
2. 1인칭 시점 알림/이벤트 UX 리뉴얼

기능적으로는 안정화 작업이 많이 들어갔지만, 테스트용 크롬 프로필과 임시 스크립트가 git에 섞여 있어 정리 필요.

---

## 2. 완료된 주요 수정

### 시스템 안정화

- 찬스카드 블랙아웃 수정
- 턴종료 블랙아웃 및 정산 데이터 유실 수정
- 감옥 도착 블랙아웃 수정
- Framer Motion 키프레임 오류 수정
- 순환 참조로 인한 저장/화면 오류 방지
- localStorage quota 초과 방지
- 새로고침 후 이어하기 로직 추가
- 헤더 금액 스포일러 방지

주요 파일:

- `src/screens/GameMain.jsx`
- `src/stores/gameStore.js`
- `src/engine/rules.js`
- `src/screens/Setup.jsx`
- `src/components/GameHeader.jsx`

---

## 3. UX / 화면 흐름 변경

### 1인칭 시선 이동 UX

- 사회자 알림 → 실제 액션창 순서로 알림 흐름 정리
- 모든 이벤트 알림을 권리증/서류 스타일 템플릿으로 통일
- 이벤트별 색상/무지개 포인트 적용
- 초기 권리증 분배 오버레이를 1인칭 알림 디자인에 맞춰 개편
- 초기 권리증 분배 오버레이에 홀로그램/무지개 그라데이션 적용
- 불필요한 터치 안내 문구 제거
- 초기 권리증 카드 수량 문구 수정

확인 필요:

- 알림이 실제 게임 흐름에서 겹치지 않는지
- 사회자 멘트와 액션창 순서가 자연스러운지
- 카드 공개/매입/감옥/정산 흐름에서 스포일러가 없는지
- 홀로그램 톤이 과하거나 UI를 방해하지 않는지

---

## 4. 새로 생긴 문서/정리물

- `TASKS.md` — 현재 작업 현황판 및 프로토콜
- `REAL_LIFE_BUG_STACK.md` — 버그/개선 스택
- `REAL_LIFE_AUTOPILOT.md` — 오토파일럿 진행 규칙
- `REAL_LIFE_SEASON2_SCOPE_2026-05-11.md` — 시즌2 범위
- `REAL_LIFE_SEASON3_SCOPE_2026-05-12.md` — 시즌3 범위
- `REAL_LIFE_UI_MISTAKE_CHECKLIST.md` — UI 실수 체크리스트
- `ASSET_GUIDELINES.md` — 이미지/에셋 생성 규격
- `BALANCE_PATCH_IDEAS.md` — 밸런스 분석/패치 의견

---

## 5. 밸런스 분석 메모

`BALANCE_PATCH_IDEAS.md`에 시뮬레이터 기반 분석이 있음.

진단:

- 초반 자산 폭증
- 스노우볼 과속
- 통행료/건설 수익률 과다 가능성
- 데스매치가 너무 빨리 올 가능성

주의:

- 문서상으로는 실제 밸런스 코드는 아직 건드리지 않았다고 기록됨.
- 밸런스 패치는 사용자 승인 후 별도 진행하는 것이 안전.

---

## 6. 정리 필요한 찌꺼기

### 크롬 테스트 프로필

- `.chrome-*` 계열 파일 약 4,461개가 git tracked 상태.
- 게임 코드가 아니라 브라우저 테스트 찌꺼기.
- 새 커밋으로 제거하고 `.gitignore`에 추가 권장.

### 임시 스크립트

다음 `tmp_*` 파일들이 tracked 상태:

- `tmp_cdp.mjs`
- `tmp_find_long_korean.py`
- `tmp_loading_variants.py`
- `tmp_patch_lotto.py`
- `tmp_patch_turnstart.py`
- `tmp_remove_rent_stage_card.py`
- `tmp_remove_test_texts.py`
- `tmp_ui_flow_patch.py`
- `tmp_unify_host_capsule.py`

보존 목적이 없다면 제거 권장.

---

## 7. 최근 추가 처리

- 주사위 굴리기 버튼은 보라색 고정이 아니라 현재 플레이어/P 색상 기반으로 유지.
- 커밋: `[CD] style: 주사위 버튼을 플레이어 색상으로 유지`

---

## 8. 검증 상태

확인 완료:

- `npm run build` 성공
- `npm test` 성공 — 54개 통과

주의:

- build 시 JS chunk 671KB 경고 있음.
- 기능 실패는 아니지만 `GameMain.jsx`가 커져서 장기적으로 분리 필요.

---

## 9. 다음 추천 순서

1. `.chrome-*` 테스트 프로필 제거 + `.gitignore` 추가
2. `tmp_*` 임시 스크립트 제거 여부 결정
3. 실제 화면에서 1인칭 알림 흐름 검수
4. 초기 권리증 분배 오버레이 시각 검수
5. 시즌2/시즌3 스택 진행

---

## 10. 현재 판단

AG 작업은 기능 안정화와 UX 방향 전환에는 의미가 있음.
다만 커밋 위생이 좋지 않아, 다음 코드 작업 전에 테스트 찌꺼기 정리가 먼저 필요함.
