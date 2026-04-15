"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [image, setImage] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 1024;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setImage(dataUrl);
        setImgB64(dataUrl.split(",")[1]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const fetchNaverCandidates = async (query) => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      return await res.json(); // 배열 또는 null
    } catch {
      return null;
    }
  };

  const enrichWithProducts = async (data, setMsg) => {
    const genderPrefix = data.gender === "남성" || data.gender === "여성" ? `${data.gender} ` : "";

    // 1단계: 네이버 후보 수집 (actualProduct 포함)
    const itemsWithCandidates = await Promise.all(
      data.items.map(async (item) => {
        // actualProduct를 첫 번째 rec으로 추가
        const actualRec = item.actualProduct
          ? {
              tier: "착용 제품",
              brand: item.actualProduct.brand,
              product: item.actualProduct.product,
              priceRange: null,
              searchKeyword: item.actualProduct.searchKeyword,
              isActual: true,
            }
          : null;

        const allRecs = actualRec ? [actualRec, ...item.recommendations] : item.recommendations;

        const recommendations = await Promise.all(
          allRecs.map(async (rec) => {
            const base = rec.searchKeyword || item.name;
            // 착용 제품은 브랜드명 포함 키워드 그대로, 나머지는 성별 prefix
            const q = rec.isActual ? base : `${genderPrefix}${base}`;
            const candidates = await fetchNaverCandidates(q);
            return { ...rec, candidates, itemDesc: q };
          })
        );
        return { ...item, recommendations };
      })
    );

    // 2단계: 후보 2개 이상인 것만 Claude Haiku 배치 선별
    const tasks = [];
    itemsWithCandidates.forEach((item) => {
      item.recommendations.forEach((rec) => {
        if (Array.isArray(rec.candidates) && rec.candidates.length > 1) {
          tasks.push({ itemDesc: rec.itemDesc, candidates: rec.candidates });
        }
      });
    });

    let selectedIndices = tasks.map(() => 0);
    if (tasks.length > 0) {
      setMsg?.("최적 상품 선별 중");
      try {
        const res = await fetch("/api/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks }),
        });
        const sel = await res.json();
        if (sel.indices?.length === tasks.length) selectedIndices = sel.indices;
      } catch {}
    }

    // 3단계: 선별 결과 적용
    let taskIdx = 0;
    const items = itemsWithCandidates.map((item) => {
      const recommendations = item.recommendations.map((rec) => {
        if (!Array.isArray(rec.candidates) || rec.candidates.length === 0) {
          return { ...rec, naverProduct: null };
        }
        if (rec.candidates.length === 1) {
          return { ...rec, naverProduct: rec.candidates[0] };
        }
        const idx = Math.min(selectedIndices[taskIdx++] ?? 0, rec.candidates.length - 1);
        return { ...rec, naverProduct: rec.candidates[idx] };
      });
      return { ...item, recommendations };
    });

    return { ...data, items };
  };

  const analyze = async () => {
    if (!imgB64) return;
    setLoading(true);
    setLoadingMsg("스타일 분석 중");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgB64, mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");

      setLoadingMsg("유사 상품 검색 중");
      const enriched = await enrichWithProducts(data, setLoadingMsg);
      setResult(enriched);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fallbackSearchUrl = (searchKeyword, brand, product) => {
    const q = encodeURIComponent(searchKeyword || `${brand} ${product}`);
    return `https://search.shopping.naver.com/search/all?query=${q}`;
  };

  const reset = () => {
    setImage(null);
    setImgB64(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #f0ece4; font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; font-weight: 300; min-height: 100vh; }
        .app { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
        .label { font-size: 10px; letter-spacing: 0.16em; color: #555; text-transform: uppercase; margin-bottom: 12px; font-weight: 400; }
        .title { font-size: clamp(40px,6vw,68px); font-weight: 200; line-height: 1.05; color: #f0ece4; margin-bottom: 4px; letter-spacing: -0.02em; }
        .title em { font-style: normal; font-weight: 500; color: #c9a96e; }
        .sub { margin-top: 14px; font-size: 13px; color: #444; letter-spacing: 0.01em; line-height: 1.8; margin-bottom: 48px; font-weight: 300; }
        .zone { border: 1px solid #1e1e1e; background: #0e0e0e; padding: 56px; text-align: center; cursor: pointer; transition: border-color 0.2s; position: relative; overflow: hidden; }
        .zone:hover, .zone.drag { border-color: #c9a96e; background: #121210; }
        .zone.filled { padding: 0; cursor: default; border-color: #222; }
        .zone-icon { font-size: 24px; opacity: 0.2; margin-bottom: 14px; }
        .zone-text { font-size: 11px; letter-spacing: 0.08em; color: #3a3a3a; }
        .preview { width: 100%; max-height: 500px; object-fit: contain; display: block; }
        .overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; background: linear-gradient(transparent, rgba(0,0,0,0.85)); display: flex; justify-content: space-between; align-items: center; }
        .overlay-label { font-size: 11px; letter-spacing: 0.02em; color: #555; }
        .btn-sm { font-size: 11px; letter-spacing: 0.04em; color: #c9a96e; background: none; border: 1px solid #c9a96e; padding: 6px 14px; cursor: pointer; font-family: inherit; font-weight: 400; transition: all 0.2s; }
        .btn-sm:hover { background: #c9a96e; color: #000; }
        .btn-main { margin-top: 18px; width: 100%; padding: 18px; background: #c9a96e; color: #0a0a0a; border: none; font-family: inherit; font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .btn-main:hover:not(:disabled) { background: #dbb97e; }
        .btn-main:disabled { opacity: 0.35; cursor: not-allowed; }
        .err { margin-top: 18px; padding: 16px 20px; background: #130808; border: 1px solid #3a1212; font-size: 12px; color: #884444; line-height: 1.6; }
        .loading { margin-top: 56px; text-align: center; padding: 56px; }
        .bar { width: 80px; height: 1px; background: #1a1a1a; margin: 0 auto 22px; position: relative; overflow: hidden; }
        .bar::after { content:''; position: absolute; left:-40%; top:0; width:40%; height:100%; background:#c9a96e; animation: sl 1.1s ease-in-out infinite; }
        @keyframes sl { 0%{left:-40%} 100%{left:100%} }
        .load-txt { font-size: 11px; letter-spacing: 0.12em; color: #2e2e2e; text-transform: uppercase; font-weight: 400; }
        .results { margin-top: 56px; }
        .res-hd { display: flex; align-items: baseline; gap: 14px; margin-bottom: 36px; padding-bottom: 16px; border-bottom: 1px solid #161616; }
        .res-title { font-size: 24px; font-weight: 300; color: #f0ece4; letter-spacing: -0.01em; }
        .res-cnt { font-size: 11px; letter-spacing: 0.06em; color: #333; font-weight: 400; }
        .style-note { padding: 22px 26px; background: #0c0c0c; border-left: 2px solid #c9a96e; margin-bottom: 20px; }
        .sn-label { font-size: 10px; letter-spacing: 0.14em; color: #c9a96e; text-transform: uppercase; margin-bottom: 10px; font-weight: 500; }
        .sn-text { font-size: 14px; font-weight: 300; color: #666; line-height: 1.8; letter-spacing: 0.01em; }
        .card { background: #0e0e0e; border: 1px solid #181818; padding: 26px; margin-bottom: 2px; transition: border-color 0.2s; }
        .card:hover { border-color: #252525; }
        .card-hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .cat { font-size: 10px; letter-spacing: 0.14em; color: #c9a96e; text-transform: uppercase; margin-bottom: 6px; font-weight: 500; }
        .iname { font-size: 18px; font-weight: 400; color: #f0ece4; line-height: 1.3; letter-spacing: -0.01em; }
        .idesc { font-size: 12px; color: #3a3a3a; text-align: right; max-width: 180px; line-height: 1.6; font-weight: 300; }
        .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
        .tag { font-size: 11px; letter-spacing: 0.02em; color: #2e2e2e; border: 1px solid #1c1c1c; padding: 3px 10px; font-weight: 300; }
        .recs-lbl { font-size: 10px; letter-spacing: 0.1em; color: #252525; text-transform: uppercase; margin-bottom: 10px; font-weight: 500; }
        .rec { display: flex; align-items: center; background: #090909; border: 1px solid #131313; margin-bottom: 5px; gap: 0; overflow: hidden; transition: border-color 0.15s; text-decoration: none; }
        .rec:hover { border-color: #2a2a2a; }
        .rec.actual { border-color: #2a2010; background: #0c0b08; margin-bottom: 10px; }
        .rec.actual:hover { border-color: #c9a96e55; }
        .rec-thumb { width: 72px; height: 72px; object-fit: cover; flex-shrink: 0; background: #111; display: block; }
        .rec-thumb-empty { width: 72px; height: 72px; flex-shrink: 0; background: #0f0f0f; border-right: 1px solid #131313; }
        .rec-body { display: flex; align-items: center; flex: 1; min-width: 0; padding: 12px 14px; gap: 12px; }
        .tier { font-size: 10px; letter-spacing: 0.04em; color: #2a2a2a; width: 42px; flex-shrink: 0; font-weight: 400; }
        .tier.actual { color: #c9a96e; width: auto; margin-right: 4px; }
        .rec-info { flex: 1; min-width: 0; }
        .brand { font-size: 13px; color: #ccc; letter-spacing: -0.01em; font-weight: 400; }
        .prod { font-size: 11px; color: #333; letter-spacing: 0.01em; font-weight: 300; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rec-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding-right: 14px; }
        .price { font-size: 12px; color: #c9a96e; white-space: nowrap; font-weight: 400; }
        .shop-link { font-size: 11px; letter-spacing: 0.04em; color: #c9a96e; border: 1px solid #c9a96e; padding: 4px 12px; text-decoration: none; white-space: nowrap; font-family: inherit; font-weight: 400; transition: all 0.15s; }
        .shop-link:hover { background: #c9a96e; color: #000; }
        .reset-btn { margin-top: 40px; background: none; border: 1px solid #1a1a1a; color: #2e2e2e; font-family: inherit; font-size: 12px; letter-spacing: 0.06em; padding: 12px 22px; cursor: pointer; transition: all 0.2s; font-weight: 300; }
        .reset-btn:hover { border-color: #333; color: #555; }
        input[type=file] { display: none; }
      `}</style>

      <div className="app">
        <div className="label">AI Fashion Finder</div>
        <h1 className="title">Outfit<br /><em>Finder</em></h1>
        <p className="sub">
          영화 · 드라마 캡처를 올리면<br />
          비슷한 착장을 완성할 수 있는 아이템과 브랜드를 찾아드립니다
        </p>

        <div
          className={`zone ${drag ? "drag" : ""} ${image ? "filled" : ""}`}
          onClick={() => !image && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); processFile(e.dataTransfer.files[0]); }}
        >
          {image ? (
            <>
              <img src={image} className="preview" alt="업로드된 이미지" />
              <div className="overlay">
                <span className="overlay-label">업로드 완료</span>
                <button className="btn-sm" onClick={(e) => { e.stopPropagation(); fileRef.current.click(); }}>변경</button>
              </div>
            </>
          ) : (
            <>
              <div className="zone-icon">⊹</div>
              <div className="zone-text">드래그 또는 클릭하여 이미지 업로드</div>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => processFile(e.target.files[0])} />

        {image && !loading && !result && (
          <button className="btn-main" onClick={analyze} disabled={!imgB64}>착장 분석 시작</button>
        )}

        {error && <div className="err">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="bar" />
            <div className="load-txt">{loadingMsg}</div>
          </div>
        )}

        {result && (
          <div className="results">
            <div className="res-hd">
              <div className="res-title">착장 분석 결과</div>
              <div className="res-cnt">{result.items?.length}개 아이템 감지</div>
            </div>

            {result.styleNote && (
              <div className="style-note">
                <div className="sn-label">Style Note</div>
                <div className="sn-text">{result.styleNote}</div>
              </div>
            )}

            {result.items?.map((item, i) => (
              <div key={i} className="card">
                <div className="card-hd">
                  <div>
                    <div className="cat">{item.category}</div>
                    <div className="iname">{item.name}</div>
                  </div>
                  {item.description && <div className="idesc">{item.description}</div>}
                </div>
                {item.attributes?.length > 0 && (
                  <div className="tags">
                    {item.attributes.map((a, j) => <span key={j} className="tag">{a}</span>)}
                  </div>
                )}
                {item.recommendations?.length > 0 && (
                  <>
                    <div className="recs-lbl">추천 아이템</div>
                    {item.recommendations.map((r, j) => {
                      const href = r.naverProduct?.link || fallbackSearchUrl(r.searchKeyword, r.brand, r.product);
                      const price = r.naverProduct?.price;
                      const prodTitle = r.naverProduct?.title || r.product;
                      const isActual = r.tier === "착용 제품";
                      return (
                        <a key={j} className={`rec${isActual ? " actual" : ""}`} href={href} target="_blank" rel="noopener noreferrer">
                          {r.naverProduct?.image
                            ? <img className="rec-thumb" src={r.naverProduct.image} alt={r.brand} />
                            : <div className="rec-thumb-empty" />
                          }
                          <div className="rec-body">
                            <div className={`tier${isActual ? " actual" : ""}`}>{r.tier}</div>
                            <div className="rec-info">
                              <div className="brand">{r.brand}</div>
                              <div className="prod">{prodTitle}</div>
                            </div>
                            {price && (
                              <div className="rec-r">
                                <div className="price">{price}</div>
                              </div>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </>
                )}
              </div>
            ))}

            <button className="reset-btn" onClick={reset}>다른 이미지 분석하기</button>
          </div>
        )}
      </div>
    </>
  );
}
