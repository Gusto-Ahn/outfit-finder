"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [image, setImage] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const analyze = async () => {
    if (!imgB64) return;
    setLoading(true);
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
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getShopLinks = (tier, brand, product, searchKeyword) => {
    const q = encodeURIComponent(searchKeyword || `${brand} ${product}`);
    const naver = `https://search.shopping.naver.com/search/all?query=${q}`;
    const musinsa = `https://www.musinsa.com/search/musinsa/integration?type=integration&q=${q}`;
    const cm29 = `https://search.29cm.co.kr/products?q=${q}`;
    if (tier === "럭셔리") return [
      { label: "네이버쇼핑", url: naver },
      { label: "29CM", url: cm29 },
    ];
    if (tier === "중고가") return [
      { label: "무신사", url: musinsa },
      { label: "29CM", url: cm29 },
    ];
    return [
      { label: "무신사", url: musinsa },
      { label: "29CM", url: cm29 },
    ];
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
        body { background: #0a0a0a; color: #f0ece4; font-family: 'DM Mono', monospace; min-height: 100vh; }
        .app { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
        .label { font-size: 10px; letter-spacing: 0.32em; color: #555; text-transform: uppercase; margin-bottom: 12px; }
        .title { font-family: 'Cormorant Garamond', serif; font-size: clamp(44px,6vw,72px); font-weight: 300; line-height: 1; color: #f0ece4; margin-bottom: 4px; }
        .title em { font-style: italic; color: #c9a96e; }
        .sub { margin-top: 14px; font-size: 11px; color: #444; letter-spacing: 0.14em; line-height: 1.9; margin-bottom: 48px; }
        .zone { border: 1px solid #1e1e1e; background: #0e0e0e; padding: 56px; text-align: center; cursor: pointer; transition: border-color 0.2s; position: relative; overflow: hidden; }
        .zone:hover, .zone.drag { border-color: #c9a96e; background: #121210; }
        .zone.filled { padding: 0; cursor: default; border-color: #222; }
        .zone-icon { font-size: 24px; opacity: 0.2; margin-bottom: 14px; }
        .zone-text { font-size: 10px; letter-spacing: 0.22em; color: #3a3a3a; text-transform: uppercase; }
        .preview { width: 100%; max-height: 500px; object-fit: contain; display: block; }
        .overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; background: linear-gradient(transparent, rgba(0,0,0,0.85)); display: flex; justify-content: space-between; align-items: center; }
        .overlay-label { font-size: 9px; letter-spacing: 0.18em; color: #555; }
        .btn-sm { font-size: 9px; letter-spacing: 0.15em; color: #c9a96e; background: none; border: 1px solid #c9a96e; padding: 6px 14px; cursor: pointer; text-transform: uppercase; font-family: 'DM Mono',monospace; transition: all 0.2s; }
        .btn-sm:hover { background: #c9a96e; color: #000; }
        .btn-main { margin-top: 18px; width: 100%; padding: 18px; background: #c9a96e; color: #0a0a0a; border: none; font-family: 'DM Mono',monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
        .btn-main:hover:not(:disabled) { background: #dbb97e; }
        .btn-main:disabled { opacity: 0.35; cursor: not-allowed; }
        .err { margin-top: 18px; padding: 16px 20px; background: #130808; border: 1px solid #3a1212; font-size: 10px; color: #884444; line-height: 1.6; }
        .loading { margin-top: 56px; text-align: center; padding: 56px; }
        .bar { width: 80px; height: 1px; background: #1a1a1a; margin: 0 auto 22px; position: relative; overflow: hidden; }
        .bar::after { content:''; position: absolute; left:-40%; top:0; width:40%; height:100%; background:#c9a96e; animation: sl 1.1s ease-in-out infinite; }
        @keyframes sl { 0%{left:-40%} 100%{left:100%} }
        .load-txt { font-size: 9px; letter-spacing: 0.32em; color: #2e2e2e; text-transform: uppercase; }
        .results { margin-top: 56px; }
        .res-hd { display: flex; align-items: baseline; gap: 14px; margin-bottom: 36px; padding-bottom: 16px; border-bottom: 1px solid #161616; }
        .res-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; font-style: italic; color: #f0ece4; }
        .res-cnt { font-size: 9px; letter-spacing: 0.2em; color: #333; }
        .style-note { padding: 22px 26px; background: #0c0c0c; border-left: 2px solid #c9a96e; margin-bottom: 20px; }
        .sn-label { font-size: 9px; letter-spacing: 0.3em; color: #c9a96e; text-transform: uppercase; margin-bottom: 10px; }
        .sn-text { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 300; font-style: italic; color: #666; line-height: 1.8; }
        .card { background: #0e0e0e; border: 1px solid #181818; padding: 26px; margin-bottom: 2px; transition: border-color 0.2s; }
        .card:hover { border-color: #252525; }
        .card-hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .cat { font-size: 9px; letter-spacing: 0.34em; color: #c9a96e; text-transform: uppercase; margin-bottom: 4px; }
        .iname { font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 300; color: #f0ece4; line-height: 1.2; }
        .idesc { font-size: 10px; color: #3a3a3a; text-align: right; max-width: 180px; line-height: 1.6; }
        .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
        .tag { font-size: 9px; letter-spacing: 0.12em; color: #2e2e2e; border: 1px solid #1c1c1c; padding: 3px 9px; text-transform: uppercase; }
        .recs-lbl { font-size: 9px; letter-spacing: 0.26em; color: #252525; text-transform: uppercase; margin-bottom: 10px; }
        .rec { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; background: #090909; border: 1px solid #131313; margin-bottom: 5px; gap: 8px; }
        .rec-l { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .tier { font-size: 9px; letter-spacing: 0.12em; color: #252525; text-transform: uppercase; width: 36px; flex-shrink: 0; }
        .brand { font-size: 12px; color: #ccc; letter-spacing: 0.04em; }
        .prod { font-size: 10px; color: #333; letter-spacing: 0.04em; }
        .rec-r { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
        .price { font-size: 11px; color: #555; white-space: nowrap; }
        .shop-link { font-size: 9px; letter-spacing: 0.12em; color: #c9a96e; border: 1px solid #c9a96e; padding: 4px 10px; text-decoration: none; text-transform: uppercase; white-space: nowrap; font-family: 'DM Mono',monospace; transition: all 0.15s; }
        .shop-link:hover { background: #c9a96e; color: #000; }
        .reset-btn { margin-top: 40px; background: none; border: 1px solid #1a1a1a; color: #2e2e2e; font-family: 'DM Mono',monospace; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; padding: 12px 22px; cursor: pointer; transition: all 0.2s; }
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
            <div className="load-txt">스타일 분석 중</div>
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
                    {item.recommendations.map((r, j) => (
                      <div key={j} className="rec">
                        <div className="rec-l">
                          <div className="tier">{r.tier}</div>
                          <div>
                            <div className="brand">{r.brand}</div>
                            <div className="prod">{r.product}</div>
                          </div>
                        </div>
                        <div className="rec-r">
                          <div className="price">{r.priceRange}</div>
                          {getShopLinks(r.tier, r.brand, r.product, r.searchKeyword).map((link, k) => (
                            <a key={k} href={link.url} target="_blank" rel="noopener noreferrer" className="shop-link">
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
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
