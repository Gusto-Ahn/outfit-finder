export const metadata = {
  title: "Outfit Finder — 스크린 속 착장 찾기",
  description: "영화·드라마 캡처를 올리면 비슷한 아이템과 브랜드를 찾아드립니다",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
