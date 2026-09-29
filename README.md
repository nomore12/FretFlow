# 기타 연습 스튜디오

React 18, TypeScript, Vite로 만든 기타 연습 웹 애플리케이션입니다.
코드 트레이닝, 리듬 트레이닝, 크로매틱 연습, 지판 탐색과 로컬 오디오 재생을 제공합니다.

## 개발 환경

- Node.js 22.12 이상인 22.x 버전 (`nvm use`)
- Yarn Classic 1.22.22

```sh
yarn install --frozen-lockfile
yarn dev
```

개발 서버 기본 주소는 `http://localhost:5173`입니다. `yarn start`도 같은 서버를 실행합니다.
별도 백엔드나 API 키 없이 실행할 수 있습니다. `.env.example`은 개발 도구용 예시이며 앱 실행에 필요하지 않습니다.

## 명령어

| 명령                      | 설명                                         |
| ------------------------- | -------------------------------------------- |
| `yarn dev` / `yarn start` | 개발 서버 실행                               |
| `yarn typecheck`          | 앱과 Vite 설정의 TypeScript 검사             |
| `yarn test`               | 공통 메트로놈 회귀 테스트                    |
| `yarn test:watch`         | 테스트 변경 감지 실행                        |
| `yarn lint`               | ESLint 검사                                  |
| `yarn build`              | 타입 검사 후 `dist/`에 프로덕션 빌드 생성    |
| `yarn preview`            | 빌드 결과를 `http://localhost:4173`에서 확인 |

Vitest로 공통 메트로놈의 타이밍·카운트다운·정지·자원 해제를 검증합니다. `yarn test`는 한 번 실행한 뒤 종료합니다.
타입 검사는 앱 소스에 strict 모드를 적용합니다. Tone.js의 외부 선언 파일과 `isolatedModules`의 충돌을 피하기 위해 `skipLibCheck`를 사용합니다.
기존 미사용 변수 린트 경고와 큰 단일 JS 번들 경고는 남아 있으며, 기능 리팩터링·코드 분할은 별도 작업입니다.

## 프로젝트 구조

- `index.html`: Vite 진입 HTML
- `src/index.tsx`: React 진입점
- `src/routes/Routes.tsx`: 화면 경로
- `src/pages/`: 기능별 화면과 연습 로직
- `src/components/`, `src/hooks/`: 공통 UI와 오디오 훅
- `src/store/`: Zustand 상태 관리
- `src/data/`, `src/utils/`: 코드·스케일 데이터와 생성 로직
- `public/sounds/`: `/sounds/파일명`으로 제공하는 오디오 파일

## Vercel 배포

저장소의 `vercel.json`에서 다음 설정을 지정합니다.

- Framework Preset: Vite
- Install Command: `yarn install --frozen-lockfile`
- Build Command: `yarn build`
- Output Directory: `dist`
- SPA rewrite: 하위 경로의 직접 접근과 새로고침을 `index.html`로 연결

Vercel 프로젝트의 Node.js 버전은 22.x를 사용합니다. CRA 시절 설정이나 환경변수가 대시보드에 남아 있으면 확인합니다.
운영 배포 전 Preview에서 `/exercise-chords`, `/rhythm`, `/chromatic`, `/backingTracks`, `/fretboard`의 직접 접근·새로고침과 오디오 재생을 확인합니다.
빌드 산출물은 커밋하지 않고 Vercel에서 생성합니다.

클라이언트 환경변수가 필요하면 `VITE_` 접두사를 사용하고 `import.meta.env.VITE_변수명`으로 읽습니다.
이 변수는 브라우저에 공개되므로 비밀 API 키를 넣지 않습니다.

## 전환 후 수동 확인

1. 코드 트레이닝에서 랜덤 코드를 생성하고 메트로놈 시작·정지를 확인합니다.
2. 리듬 단계 변경, 패턴 재생과 현재 위치 표시를 확인합니다.
3. 크로매틱 패턴과 연습 모드를 변경하고 재생합니다.
4. 백킹 트랙에서 로컬 파일을 열어 속도·음량·구간 반복을 확인합니다.
5. 재생 중 다른 화면으로 이동한 뒤 오디오가 남지 않는지 확인합니다.

## 공통 메트로놈

네 연습 화면의 오디오 생성과 해제, 재생 시계, BPM·음량 변경, 카운트다운은 `src/audio/metronome/MetronomePlayer.ts`와 `src/hooks/useMetronome.ts`에서 관리합니다.

| 화면          | 화면에 남은 역할                                          |
| ------------- | --------------------------------------------------------- |
| 코드 트레이닝 | 드럼 패턴 선택, 완료된 마디에 따라 코드 이동, 16마디 종료 |
| 리듬 트레이닝 | 악보를 음표·쉼표 이벤트로 변환하고 현재 슬롯 표시         |
| 크로매틱 연습 | 강박 주기 설정, 박에 따라 운지·줄·프렛 이동               |
| 지판 탐색기   | 강·약박 선택, 현재 박 표시                                |

- `beatsPerMeasure`는 강박 주기, `subdivisions`는 4분음표 한 박을 나누는 수(1·2·4)입니다.
- 각 세션은 독립된 `Tone.Clock`을 사용하며 전역 `Transport.stop/cancel`을 호출하지 않습니다.
- BPM·음량·화면 콜백 변경은 현재 위치를 유지합니다. 비트 분할·강박 주기나 리듬 악보를 바꾸면 첫 위치부터 다시 재생합니다.
- 코드 연습은 5초, 크로매틱은 3초 준비 시간을 유지하며 중간 취소·화면 이탈 시 예약도 해제합니다.
- 코드 전환은 실제 마디 경계에서 일어나며 마지막 마디 이후 추가 소리를 내지 않습니다.
- `voices.ts`는 기존 화면별 음색 설정입니다. 오디오 자원 생성은 공통 엔진에서만 수행합니다.
- 기존 `/chords` 화면도 `useTonePlayer` 어댑터를 통해 같은 엔진을 사용합니다.
