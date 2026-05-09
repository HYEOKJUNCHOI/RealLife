# The RealLife 캐릭터 아바타 규격

## 최종 기준

캐릭터 기본 에셋은 **세종대왕(`magistrate.png`) 규격**을 기준으로 맞춘다.

- 캔버스: `400 x 600px`
- 배경: 투명 PNG
- 실제 캐릭터 bbox: `(82, 90, 317, 600)`
- 실제 캐릭터 크기: `235 x 510px`
- 머리/상단 시작: `y = 90`
- 발/하단 끝: `y = 600`

이 규격을 맞추면 기존 캐릭터들과 같은 로직으로 표시된다.

## 코드 연결 방식

새 캐릭터는 기존 캐릭터를 클론하듯 추가한다.

1. 이미지 저장

```text
public/characters/{character-id}.png
```

2. `src/data/characters.json`에 캐릭터 추가

```json
{
  "id": "characterId",
  "name": "캐릭터명",
  "role": "역할",
  "description": "설명",
  "emoji": "🎭",
  "slot": "character.characterId",
  "color": "#5F6F3A",
  "_promptHint": "생성 힌트"
}
```

3. `src/lib/assets.js`의 `CHARACTER_IMG`에 경로 추가

```js
characterId: '/characters/character-id.png',
```

4. `src/lib/assetSlots.js`에 슬롯 추가

```js
{ id: 'character.characterId', label: '캐릭터명', category: 'character', defaultPath: '/characters/character-id.png', ratio: 'aspect-square', fallback: '🎭' },
```

## 주의

- 캐릭터별 예외 CSS를 만들지 않는다.
- 이미지를 기존 규격에 맞춰서 해결한다.
- 전신/게임창/원형 아바타 모두 같은 기본 이미지 로직을 탄다.
- 작게 보였을 때 얼굴 식별이 되도록 머리와 얼굴을 크게, 몸 디테일은 단순하게 만든다.

## 규격 변환 스크립트

현재 전두환 에셋은 아래 스크립트로 세종대왕 규격에 맞췄다.

```text
scripts/fit_character_like_magistrate.py
```

사용 예:

```powershell
python .\scripts\fit_character_like_magistrate.py .\public\characters\source.png .\public\characters\target.png
```
