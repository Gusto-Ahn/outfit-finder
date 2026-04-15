import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { tasks } = await request.json();
    // tasks: [{ itemDesc: string, candidates: [{title, price, mallName}] }]

    const taskLines = tasks
      .map((task, i) => {
        const candidateList = task.candidates
          .map((c, j) => `  ${j}. ${c.title} (${c.price}, ${c.mallName})`)
          .join("\n");
        return `[그룹 ${i}] 찾는 아이템: ${task.itemDesc}\n후보:\n${candidateList}`;
      })
      .join("\n\n");

    const prompt = `패션 아이템 설명과 후보 상품명을 비교해, 색상·소재·실루엣이 가장 잘 맞는 상품을 각 그룹에서 1개 선택하세요.

${taskLines}

반드시 JSON 배열로만 응답하세요. 각 그룹에서 선택한 후보 번호(0~4)를 순서대로 나열: 예) [0, 2, 1]`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.text || "";
    const match = text.match(/\[[\d,\s]+\]/);
    if (!match) return Response.json({ indices: tasks.map(() => 0) });

    const indices = JSON.parse(match[0]);
    return Response.json({ indices });
  } catch {
    return Response.json({ indices: [] });
  }
}
