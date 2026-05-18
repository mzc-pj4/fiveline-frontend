# fiveline-frontend

team mzc-pj4 / fiveline 이커머스 운영 데모용 React + Vite + TypeScript 프론트엔드.

## 페이지

- `/login`, `/signup` — 인증
- `/products` — 상품 목록 + 검색 + 카테고리 필터
- `/products/:id` — 상품 상세 + 리뷰 작성/조회
- `/cart` — 장바구니 (수량 변경·삭제·주문)
- `/orders` — 내 주문 내역 (성공·실패·응답시간 표시)

## API 연결

`src/api.ts` 가 3개 백엔드(`localhost:8001/8002/8003`)에 직접 호출.
JWT는 localStorage(`fiveline_token`)에 저장, 모든 요청에 자동으로 `Authorization: Bearer ...` 부여.

전제: [fiveline-backend](https://github.com/mzc-pj4/fiveline-backend) 가 로컬에서 `docker compose up` 으로 떠 있어야 함.

## 실행 (Docker)

```bash
docker compose up
```

http://localhost:5173

## 실행 (로컬 Node)

```bash
npm install
npm run dev
```

## 스타일

Tailwind CSS CDN 방식 (`index.html` 의 `<script src="https://cdn.tailwindcss.com">` 한 줄). PostCSS 빌드 없음.

## 빌드

```bash
npm run build
```

생성 산출물은 `dist/`.
