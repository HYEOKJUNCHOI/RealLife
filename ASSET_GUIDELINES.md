# 🎨 RealLife 에셋 생성 가이드라인 (ASSET_GUIDELINES.md)

이 문서는 외부 AI 이미지 생성 도구(Midjourney, DALL-E 등)를 사용하여 RealLife 프로젝트에 필요한 일러스트를 만들 때 **화면(액자)에 완벽하게 들어맞도록** 지켜야 할 규격을 정리한 문서입니다.

---

## 1. 이벤트 카드 일러스트 (감옥, 세금, 찬스 등)

카드는 세로로 긴 직사각형 비율(`180x250` 비율)로 렌더링됩니다.

*   **배경**: 무조건 **단색 초록색(Solid Green Background)**으로 생성해야 조너선아이브가 완벽하게 누끼를 딸 수 있습니다.
*   **비율**: 세로형 (Portrait, 3:4 또는 2:3 비율 추천).
*   **피사체 위치**: 캐릭터나 사물은 화면 **정중앙**에 위치해야 합니다.
*   **안전 여백 (Safe Zone)**: 상하좌우에 최소 20%의 여백을 두어야 합니다. 이미지가 너무 꽉 차면 카드의 검은 테두리에 잘려 나갑니다.
*   **프롬프트 예시**:
    > "A 3D toy-style cute police officer with sunglasses and arms crossed. Standing in the center. Plain solid green background. No text, no frame."

---

## 2. 플레이어 캐릭터 일러스트 (얼굴, 키, 무기 등)

캐릭터는 게임 내에서 정사각형 액자(`object-cover object-top`)에 담기게 됩니다. 기존처럼 마구잡이로 생성하면 머리가 잘리거나 무기가 화면 밖으로 튀어나갈 수 있습니다.

### 🎯 핵심 렌더링 규칙
*   **배경**: 단색 초록색 (크로마키용).
*   **얼굴 위치 (가장 중요)**: 캐릭터의 **얼굴이 캔버스의 상단 20~30% 위치**에 있어야 합니다. 게임 엔진이 사진의 윗부분(`object-top`)을 기준으로 자르기 때문에 얼굴이 너무 가운데나 아래에 있으면 이마가 잘립니다.
*   **무기 및 소품**: 칼, 지팡이, 총 등의 무기는 **몸통에 최대한 바짝 붙여서(Held close to the body)** 그려야 합니다. 팔을 넓게 벌리고 있으면 정사각형 액자에 들어갈 때 무기가 다 잘려 나갑니다.
*   **전신 비율**: 머리가 큰 3D 보드게임 말(토이 피규어, Chibi 비율) 스타일이어야 좁은 액자 안에서도 존재감이 삽니다.

### 🎯 캐릭터 프롬프트 템플릿
캐릭터를 뽑으실 때는 아래 템플릿의 `[캐릭터 설명]` 부분만 바꿔서 사용하세요.

> "A single full-body cute 3D board-game character token. **[캐릭터 설명 - 예: A brave knight in silver armor]**. 
> Soft rounded chibi proportions, toy-like polished render. **The character's face must be positioned in the upper half of the image.** 
> **Holding any weapons or items very close to the body.** Plain solid green background. Centered front view, clean full body."

---

위 가이드라인에 맞춰 이미지를 뽑아주시면, 조너선아이브가 알아서 찌꺼기를 날리고 게임판에 자로 잰 듯 끼워 넣겠습니다!
