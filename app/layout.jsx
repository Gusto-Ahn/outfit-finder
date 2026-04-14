export const metadata = {
  title: "Screen Look — 스크린 속 착장 찾기",
  description: "영화·드라마 캡처를 올리면 비슷한 아이템과 브랜드를 찾아드립니다",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Mono:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
