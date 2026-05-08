/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D32F2F',
        // ===== 정통 모노폴리 결 토큰 =====
        // 양피지/크림색 보드 배경
        parchment: {
          50: '#FBF6E9',   // 가장 밝은 카드 면 (deed card 본문)
          100: '#F4EAD0',  // 보드 베이스
          200: '#E8DCB6',  // 카드 그림자 받는 면
          300: '#D9C99B',  // 분할선/외곽
        },
        // 모노폴리 잉크 검정 (순흑보다 살짝 따뜻)
        ink: {
          DEFAULT: '#1A1612', // 본문 검정
          soft: '#2B2520',    // 보조 본문
          line: '#0F0C0A',    // 두꺼운 윤곽선
        },
        // 모노폴리 빨강 (브랜드)
        monopoly: {
          red: '#D32F2F',
          deep: '#9F1F1F',    // 빨강 그림자 / 헤드라인 강조
          gold: '#C9A24B',    // 권리증 골드 디테일
        },
        matrix: {
          green: '#00FF41',
          red: '#FF0040',
        },
        bg: {
          base: '#0a0a0a',
          elevated: '#141414',
        },
        card: {
          default: '#1a1a1a',
          hover: '#222',
        },
        // 컬러셋 8종 — 모노폴리 클래식 deed 색띠 결
        prop: {
          brown: '#955436',     // Mediterranean
          lightblue: '#AAE0FA', // Light Blue
          pink: '#D93A96',      // Pink (Magenta)
          orange: '#F7941D',    // Orange
          red: '#ED1B24',       // Red
          yellow: '#FEF200',    // Yellow
          green: '#1FB25A',     // Green
          darkblue: '#0072BB',  // Dark Blue
        },
        text: {
          primary: '#FAFAFA',
          muted: '#9A9A9A',
        },
      },
      fontFamily: {
        // 모노폴리 박스 결 — Oswald(굵은 압축 산세리프)를 우선, 폴백 다단계
        // index.html 에서 Google Fonts 로딩
        display: [
          'Oswald',
          '"Bebas Neue"',
          'Impact',
          '"Black Han Sans"',
          'sans-serif',
        ],
        // 본문 — 산세리프지만 살짝 두께감 있는 결
        body: [
          '"Black Han Sans"',
          'Oswald',
          '"Noto Sans KR"',
          'system-ui',
          'sans-serif',
        ],
        sans: [
          '"Noto Sans KR"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // deed card 결 — 두꺼운 검정 윤곽 + 살짝 들린 그림자
        deed: '0 5px 0 0 #0F0C0A, 0 12px 22px -4px rgba(0,0,0,0.5)',
        'deed-sm': '0 3px 0 0 #0F0C0A, 0 6px 14px -2px rgba(0,0,0,0.4)',
        'deed-flat': '0 4px 0 0 #0F0C0A, 0 8px 14px -3px rgba(0,0,0,0.35)',
        // 키보드 키캡 결 — 두꺼운 입체 + 발치 흐림
        chip: '0 5px 0 0 #0F0C0A, 0 10px 18px -4px rgba(0,0,0,0.45)',
        'chip-pressed': '0 1px 0 0 #0F0C0A, 0 2px 4px -1px rgba(0,0,0,0.25)',
      },
      screens: {
        sm: '480px',
        md: '768px',
        lg: '1180px',
      },
      keyframes: {
        'deed-drop': {
          '0%': { opacity: 0, transform: 'translateY(-12px) rotate(-2deg) scale(0.96)' },
          '60%': { opacity: 1, transform: 'translateY(2px) rotate(0.5deg) scale(1.01)' },
          '100%': { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
        },
        'turn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(211,47,47,0.55)' },
          '50%': { boxShadow: '0 0 0 8px rgba(211,47,47,0)' },
        },
      },
      animation: {
        'deed-drop': 'deed-drop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards',
        'turn-pulse': 'turn-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
