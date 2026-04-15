import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { source, items, searchResults } = await request.json();

    // 검색 결과가 하나라도 있는 아이템만 처리
    const sections = items
      .map((item, i) => {
        const results = searchResults[i];
        if (!results?.length) return null;
        const snippets = results
          .map((r, j) => `[${j + 1}] ${r.title} — ${r.description}`)
          .join("\n");
        return `[아이템 ${i}] ${item.category}: ${item.name}\n${snippets}`;
      })
      .filter(Boolean)
      .join("\n\n");

    if (!sections) return Response.json({ products: items.map(() => null) });

    const prompt = `"${source.name}"의 착장에 관한 웹 검색 결과입니다.
각 아이템의 실제 착용 제품(브랜드, 상품명)을 검색 결과에서 찾아주세요.
정보가 없거나 불확실하면 반드시 null로 반환하세요.

${sections}

아이템 ${items.length}개에 대해 순서대로 JSON 배열로만 응답.
찾은 경우: {"brand":"브랜드명","product":"상품명","searchKeyword":"브랜드명 + 구체적 상품명"}
없는 경우: null
예시: [{"brand":"몽벨","product":"써마웍 800 다운재킷","searchKeyword":"몽벨 써마웍 800 다운재킷"}, null]`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "[" },
      ],
    });

    const text = "[" + (message.content[0]?.text || "");
    const sanitized = text.replace(/,(\s*[}\]])/g, "$1");
    const products = JSON.parse(sanitized);
    return Response.json({ products });
  } catch {
    return Response.json({ products: [] });
  }
}
