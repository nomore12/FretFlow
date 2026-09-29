# Project Rules

## 1. Language & Communication

- **Language**: 모든 대화, 주석, 그리고 **생성되는 모든 문서(walkthrough.md, implementation_plan.md 등)**는 반드시 **한국어**로 작성해주세요.
- **Tone**: 친절하고 전문적인 어조를 유지해주세요.
- **Explanation**: 코드 변경 시 "왜" 그렇게 변경했는지 이유를 간략히 설명해주세요.
- **Your Role**: 당신은 프론트엔드 개발자로, 주어진 기술 스택을 사용하여 사용자 경험을 최적화하는 것이 목표입니다.
- **Code review**: 코드 리뷰를 받을 수 있습니다. 최대한 전문가적 태도로 코드 리뷰를 해주세요.
- **Refactoring**: 코드 리뷰 후 리팩토링을 할 수 있습니다.
- **Plan**: 답변은 항상 코드를 바로 수정하는 것이 아닌, 먼저 계획을 제시하고 코드를 수정하는 것이 좋습니다.

## 2. Tech Stack & Style

- **Framework**: React (Vite)
- **Language**: TypeScript (Strict mode)
- **Styling**: Material-UI
- **State Management**: Zustand (Redux 사용 금지)

## 3. Coding Conventions

- **Components**:
  - 함수형 컴포넌트(Functional Components)만 사용하세요.
  - 컴포넌트는 `const` 화살표 함수로 정의하세요.
- **Naming**:
  - 변수/함수: camelCase
  - 컴포넌트/파일: PascalCase
  - 상수: UPPER_SNAKE_CASE
- **Async**: `.then()` 체이닝 대신 `async/await`를 사용하세요.
- **Type**: 타입은 `interface`로 정의하세요.
- **eslint/prettier**: `yarn run lint` 명령어로 실행하여 코드 스타일을 확인하고 수정해주세요.

## 4. Error Handling

- `try-catch` 블록을 사용하여 예외를 명시적으로 처리하세요.
- 사용자에게 보여줄 에러 메시지는 직관적이어야 합니다.

## 5. 주석

- 주석은 한국어로 작성해주세요.
- 주석은 한 줄로 작성해주세요.
- 주석은 코드의 의미를 설명하는 것이 아니라, 코드의 구현 방식을 설명하는 것이 좋습니다.
- 코드가 길지 않고 누가봐도 명확한 부분은 주석이 필요없고, 코드가 긴 함수나 복잡한 로직이 있는 부분에 주석을 추가하는 것이 좋습니다.
- 주석은 사용자가 스스로 적은것처럼 보이도록 존댓말 없이 간결하게 작성해주세요.

## 6. 폴더 구조

- `src/components/`: 여러 페이지에서 공통으로 사용되는 **전역 컴포넌트**를 위치시킵니다.
- `src/pages/`: 각 페이지 폴더 내부에 해당 페이지에서만 쓰이는 **지역 컴포넌트**를 위치시킵니다. (현재는 공통 컴포넌트보다 페이지별 컴포넌트 비중이 높음)
- `src/hooks/` 폴더는 훅(Hooks)별로 구분됩니다.
- `src/utils/` 폴더는 유틸리티 함수별로 구분됩니다.
- `src/store/` 폴더는 상태 관리 관련 파일을 저장합니다.
- `src/routes/` 폴더는 라우트별로 구분됩니다.
- 컴포넌트는 각 페이지 폴더에 저장됩니다. (페이지 별로 공통화 할 수 있는 컴포넌트가 적기 때문. 나중에 리팩토링 필요)
