# omok.space

실시간 멀티플레이어 오목 게임 플랫폼

## 📖 소개

**omok.space**는 깔끔하고 빠른 실시간 온라인 오목 게임을 제공하는 웹 애플리케이션입니다. 군더더기 없는 디자인과 끊김 없는 멀티플레이 경험을 통해 누구나 쉽게 오목을 즐길 수 있습니다.

### 주요 특징

- 🎮 **실시간 멀티플레이**: Socket.IO 기반의 실시간 게임 진행
- 📱 **모바일 최적화**: 반응형 디자인으로 모든 기기에서 완벽한 플레이 경험
- 🎨 **현대적인 UI**: Tailwind CSS v4와 Framer Motion을 활용한 세련된 인터페이스
- 🔒 **방 비밀번호 설정**: 친구들과만 플레이할 수 있는 비공개 방 생성
- 👥 **관전 모드**: 진행 중인 게임을 관전할 수 있는 기능
- ⚡ **빠른 입장**: 별도의 회원가입 없이 즉시 게임 시작
- 🎯 **두 단계 착수**: 모바일에서 실수를 방지하는 확인 단계

## 🛠 기술 스택

### Frontend

- **Next.js 16** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS v4** - 유틸리티 기반 스타일링
- **Framer Motion** - 애니메이션 및 인터랙션
- **Socket.IO Client** - 실시간 통신

### Backend

- **Node.js** - 런타임 환경
- **Socket.IO** - 실시간 양방향 통신
- **NextAuth.js** - 인증 시스템
- **Prisma** - ORM (데이터베이스 관리)
- **PostgreSQL** - 데이터베이스

### 개발 도구

- **ESLint** - 코드 품질 관리
- **ts-node** - TypeScript 실행 환경

## 🚀 시작하기

### 필수 요구사항

- Node.js 20 이상
- PostgreSQL 데이터베이스
- npm 또는 yarn

### 설치 및 실행

1. **저장소 클론**

   ```bash
   git clone https://github.com/b-mail/omok.space.git
   cd omok.space
   ```

2. **의존성 설치**

   ```bash
   npm install
   ```

3. **환경 변수 설정**

   `.env` 파일을 생성하고 다음 내용을 입력하세요:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/omok"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **데이터베이스 마이그레이션**

   ```bash
   npx prisma migrate dev
   ```

5. **개발 서버 실행**

   ```bash
   npm run dev
   ```

6. **브라우저에서 접속**

   `http://localhost:3000`으로 접속하여 게임을 시작하세요!

## 📦 프로덕션 빌드

```bash
npm run build
npm start
```

## 🎮 게임 방법

1. **입장하기**: 메인 페이지에서 "입장" 버튼 클릭
2. **방 만들기**: 대기실에서 "방 만들기" 버튼으로 새 게임 방 생성
3. **방 설정**: 방 제목, 비밀번호(선택), 관전 허용 여부 설정
4. **게임 시작**: 상대방이 입장하면 자동으로 게임 시작
5. **착수하기**:
   - **데스크톱**: 원하는 위치를 클릭하여 바로 착수
   - **모바일**: 위치를 탭하여 선택 후 "착수하기" 버튼으로 확정

## 🏗 프로젝트 구조

```
omok.space/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   ├── game/[id]/         # 게임 페이지
│   ├── lobby/             # 대기실 페이지
│   └── login/             # 로그인 페이지
├── components/            # React 컴포넌트
│   └── Board.tsx          # 오목판 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── auth.ts            # NextAuth 설정
│   ├── game/              # 게임 로직
│   └── prisma.ts          # Prisma 클라이언트
├── prisma/                # 데이터베이스 스키마 및 마이그레이션
├── public/                # 정적 파일
└── server.ts              # Socket.IO 서버
```

## 🎯 주요 기능

### 실시간 게임

- Socket.IO를 통한 실시간 게임 상태 동기화
- 즉각적인 착수 반영 및 승패 판정
- 자동 방 삭제 (플레이어가 모두 나갈 경우)

### 사용자 경험

- 임시 사용자 시스템 (회원가입 불필요)
- 모바일 환경에서의 두 단계 착수 시스템
- 마지막 착수 위치 표시
- 접을 수 있는 참가자 목록 (모바일)
- 나가기 확인 모달

### 방 관리

- 방 생성 및 설정 변경
- 비밀번호 보호 기능
- 관전 허용/차단 설정
- 방장 권한 (강퇴, 방 삭제)

## 🔧 최적화

- **React.memo**: Board 컴포넌트 메모이제이션으로 불필요한 리렌더링 방지
- **useCallback**: 이벤트 핸들러 메모이제이션으로 성능 향상
- **서버 안정성**: Prisma 에러 핸들링으로 서버 크래시 방지

## 📄 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 👨‍💻 개발자

- GitHub: [@b-mail](https://github.com/b-mail)

---

**omok.space**로 친구들과 함께 오목을 즐겨보세요! 🎮
