import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `당신은 패션 스타일리스트 AI입니다. 영화나 드라마의 스크린샷을 분석하여 등장인물의 착장을 파악하고, 한국 시장에서 구매 가능한 유사 아이템을 추천합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
착장 아이템을 식별할 수 없는 이미지라면 items를 빈 배열로 반환하세요.

{
  "styleNote": "전체 룩의 스타일 무드, 계절감, 포인트 아이템을 언급한 총평 (2-3문장, 감각적이고 구체적으로)",
  "items": [
    {
      "category": "카테고리 (상의/하의/아우터/신발/가방/액세서리 중 하나)",
      "name": "구체적인 아이템명 (예: 울 헤링본 오버핏 블레이저)",
      "attributes": ["색상", "소재추정", "핏/실루엣", "주요디테일"],
      "description": "이 아이템의 스타일 포인트 한 줄",
      "recommendations": [
        {
          "tier": "럭셔리",
          "brand": "브랜드명",
          "product": "구체적 상품명 또는 라인",
          "priceRange": "가격대 (예: 80-150만원)",
          "searchKeyword": "브랜드명 + 색상 + 소재 + 아이템 유형 순서로 (예: Theory 그레이 헤링본 울 오버핏 블레이저)"
        },
        {
          "tier": "중고가",
          "brand": "브랜드명",
          "product": "구체적 상품명 또는 라인",
          "priceRange": "가격대",
          "searchKeyword": "브랜드명 + 색상 + 소재 + 아이템 유형 순서로 (예: 아더에러 블랙 와이드 데님 팬츠)"
        },
        {
          "tier": "합리적",
          "brand": "브랜드명",
          "product": "구체적 상품명 또는 라인",
          "priceRange": "가격대",
          "searchKeyword": "브랜드명 + 색상 + 소재 + 아이템 유형 순서로 (예: 무신사스탠다드 베이지 코튼 오버핏 셔츠)"
        }
      ]
    }
  ]
}

주의사항:
- 티어별 브랜드 추천 기준:
  - 럭셔리 (30만원~): Toteme, Acne Studios, A.P.C., Ami Paris, Maison Margiela, Theory, Isabel Marant, Sandro, Maje
  - 중고가 (10-30만원): 마르디메크르디, 아더에러, 앤더슨벨, 스튜디오톰보이, 그라운드Y, 시스템, 포터리, 르917, 이스트로그
  - 합리적 (~10만원): 무신사스탠다드, 커버낫, 디스이즈네버댓, 에스피오나지, 노매뉴얼, 유니클로, 자라
- searchKeyword는 반드시 '브랜드명 + 색상 + 소재 + 아이템유형' 4가지를 포함한 구체적인 표현으로 작성. 추상적인 키워드 금지 (예: "블레이저" 대신 "그레이 헤링본 울 오버핏 블레이저")
- 이미지에서 명확히 보이는 아이템만 분석 (추측 최소화)
- 최소 2개, 최대 5개 아이템 추출
- 전신이 보이지 않는 경우 식별 가능한 아이템만 추출`;

export async function POST(request) {
  try {
    const { imageBase64, mediaType } = await request.json();

    if (!imageBase64) {
      return Response.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const text = message.content[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "분석 실패: " + text.slice(0, 100) }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
