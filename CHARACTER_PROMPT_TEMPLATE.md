# The RealLife 캐릭터 생성 프롬프트 템플릿

아래 프롬프트에서 `[캐릭터명]`, `[시대/역할]`, `[외형 특징]`, `[의상]`, `[소품]`만 바꿔서 사용한다.

```text
Create a cute stylized 3D chibi collectible board-game token character for The RealLife, a Korean time-travel property board game.

Character name: [캐릭터명]
Character concept: [시대/역할]. Portray the character as a neutral family-friendly collectible board-game mascot. Do not make it photorealistic. Do not copy any actor or movie likeness. Do not glorify, mock, villainize, or politicize the character.

Appearance: [외형 특징]. Cute chibi proportions with an oversized head, small body, clear readable face, friendly but neutral expression.

Outfit: [의상]. Keep details simple and readable at small game-token size.

Prop: [소품]. The prop must be small, decorative, symbolic, and non-threatening.

Style: polished toy-like 3D material, Korean board game mascot style, full body, front view, standing pose, clean silhouette, soft studio lighting, subtle rim light, family-friendly.

Composition: transparent PNG game asset. Full body visible from head to toe, no cropping. Character centered on a vertical 2:3 canvas. Leave empty transparent margin around the character. The character should be tall and readable, similar to a mobile board-game avatar.

Final asset target after post-processing: 400x600 transparent PNG. Character alpha bbox must match The RealLife standard: left=82, top=90, right=317, bottom=600, actual character size 235x510.

Negative requirements: no text, no logo, no watermark, no card, no frame, no slogan, no scenery, no floor, no battle scene, no violence, no blood, no attacking pose, no realistic weapon.
```

## 투명 배경이 안 될 때 대체 프롬프트

이미지 생성기가 투명 배경을 지원하지 않으면 아래 문장을 추가한다.

```text
If transparent background is not supported, use a perfectly flat solid chroma green background (#00FF00) for later background removal. No shadows on the background, no gradients, no floor. Avoid green colors on the character.
```


