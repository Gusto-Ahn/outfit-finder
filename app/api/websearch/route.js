export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) return Response.json(null, { status: 400 });

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(q)}&display=5`,
      {
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
        },
      }
    );
    const data = await res.json();
    if (!data.items?.length) return Response.json([]);

    return Response.json(
      data.items.map((item) => ({
        title: item.title.replace(/<[^>]*>/g, ""),
        description: item.description.replace(/<[^>]*>/g, ""),
        link: item.link,
      }))
    );
  } catch {
    return Response.json([]);
  }
}
