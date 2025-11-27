import React, { useEffect, useMemo, useState } from "react";
import { Map, Polygon, MapMarker } from "react-kakao-maps-sdk";
import hannamInfo from "../data/basic_info.json";
import hannamStats from "../data/hannam_stats.json";
import markersData from "../data/markers_with_stats.json";
import InfoPanel from "./InfoPanel";
import "./InfoPanel.css";
import "./MapContainer.css";

const kakaoAppKey = process.env.REACT_APP_KAKAO_APP_KEY;
const KAKAO_SDK_ID = "kakao-map-sdk";

// --- 고정된 한남동 폴리곤 정보 (상수로 정의) ---
const hannamCenter = { lat: 37.5385, lng: 127.0039 };
const hannamPath = [
  { lat: hannamCenter.lat - 0.001, lng: hannamCenter.lng - 0.0015 },
  { lat: hannamCenter.lat + 0.001, lng: hannamCenter.lng - 0.0015 },
  { lat: hannamCenter.lat + 0.001, lng: hannamCenter.lng + 0.0015 },
  { lat: hannamCenter.lat - 0.001, lng: hannamCenter.lng + 0.0015 },
];

// 진행 단계에 따른 폴리곤 색상 반환 함수
const getPolygonColor = (stage) => {
  switch (stage) {
    case "추진위원회 승인":
      return "#ADD8E6"; // 연한 파란색
    case "사업시행인가":
      return "#FF8C00"; // 진한 주황색
    case "관리처분인가": // 사용자 요청: 관리처분계획 -> 빨간색. 데이터는 '관리처분인가'
      return "#FF0000"; // 빨간색
    default:
      return "#A9A9A9"; // 기본 회색
  }
};

const dynamicPolygonColor = getPolygonColor(hannamInfo.stage);

const polygonStyle = {
  strokeWeight: 2,
  strokeColor: dynamicPolygonColor,
  strokeOpacity: 0.8,
  strokeStyle: "solid",
  fillColor: dynamicPolygonColor,
  fillOpacity: 0.3,
};
// ------------------------------------------------

function MapContainer({ title, height = "70vh" }) {
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(hannamCenter); // 초기 중심을 한남동으로 설정
  const [isMapReady, setIsMapReady] = useState(
    () => typeof window !== "undefined" && !!window.kakao
  );
  const [loadError, setLoadError] = useState(null);
  const [panelType, setPanelType] = useState("zone");
  const [panelData, setPanelData] = useState(hannamInfo);

  const kakao = typeof window !== "undefined" ? window.kakao : undefined;

  useEffect(() => {
    if (isMapReady || loadError || !kakaoAppKey) {
      if (!kakaoAppKey && !loadError) {
        setLoadError("missing-key");
      }
      return;
    }

    const existingScript = document.getElementById(KAKAO_SDK_ID);
    const handleLoad = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setIsMapReady(true));
      } else {
        setLoadError("failed");
      }
    };

    if (existingScript) {
      if (window.kakao && window.kakao.maps) {
        setIsMapReady(true);
      } else {
        existingScript.addEventListener("load", handleLoad);
      }
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${kakaoAppKey}&libraries=services`;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = () => setLoadError("failed");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [isMapReady, loadError, kakaoAppKey]);

  const isSearchReady = !!(kakao && kakao.maps && kakao.maps.services);
  const trendStats = useMemo(() => {
    const sorted = [...hannamStats].sort((a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    });
    return sorted.slice(-6);
  }, []);
  const complexMarkers = useMemo(
    () => Object.values(markersData || {}),
    []
  );
  const maxTrendPrice = useMemo(
    () =>
      trendStats.reduce(
        (max, stat) => Math.max(max, stat.avg_price || 0),
        0
      ) || 1,
    [trendStats]
  );
  const formatPrice = (value) =>
    value ? `${(value / 100000000).toFixed(1)}억` : "데이터 없음";

  const handleSearch = () => {
    if (!keyword.trim()) {
      alert("키워드를 입력해주세요.");
      return;
    }
    if (!isSearchReady) {
      alert("카카오 지도 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const firstItem = data[0];
        setMapCenter({
          lat: firstItem.y,
          lng: firstItem.x,
        });
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  if (loadError === "missing-key") {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "#555" }}>
          Kakao 지도 APP KEY가 설정되지 않아 지도를 불러올 수 없습니다.
        </p>
        <p style={{ color: "#777" }}>
          루트 경로에 .env 파일을 생성하고 REACT_APP_KAKAO_APP_KEY 값을 입력해 주세요.
        </p>
      </div>
    );
  }

  if (loadError === "failed") {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "#555" }}>
          지도를 불러오는 도중 오류가 발생했습니다.
        </p>
        <p style={{ color: "#777" }}>
          네트워크 상태를 확인하거나 페이지를 새로고침해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "20px", boxSizing: "border-box" }}>
      {title && <h1 style={{ textAlign: "center", marginBottom: "20px" }}>{title}</h1>}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <input
          placeholder="장소명 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ width: "50%", maxWidth: "600px", padding: "12px 20px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <button onClick={handleSearch} style={{ padding: "12px 24px", fontSize: "16px", marginLeft: "10px", borderRadius: "8px", border: "none", backgroundColor: "#2268a0", color: "white", cursor: "pointer" }}>
          검색
        </button>
      </div>
      <div className="map-trend-card">
        <div className="map-trend-card__header">
          <div>
            <p>최근 6개월 실거래 추이</p>
            <strong>{formatPrice(trendStats[trendStats.length - 1]?.avg_price)}</strong>
          </div>
          <span>한남동</span>
        </div>
        <div className="map-trend-bars">
          {trendStats.map((stat) => {
            const barHeight = (stat.avg_price / maxTrendPrice) * 100;
            const tooltip = `${stat.year}.${stat.month
              .toString()
              .padStart(2, "0")} 평균 ${stat.avg_price.toLocaleString()}원`;
            return (
              <div key={`${stat.year}-${stat.month}`} className="map-trend-bar">
                <div
                  className="map-trend-bar__fill"
                  style={{ height: `${barHeight}%` }}
                  title={tooltip}
                />
                <span>{`${stat.month}월`}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "relative", width: "100%", height: height }}>
        {isMapReady ? (
          <>
            <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={5}>
              <Polygon
                path={hannamPath}
                {...polygonStyle}
                onClick={() => {
                  setPanelType("zone");
                  setPanelData(hannamInfo);
                  setIsOpen(true);
                }}
              />
              {complexMarkers.map((complex) => (
                <MapMarker
                  key={complex.name}
                  position={{ lat: complex.lat, lng: complex.lng }}
                  title={complex.name}
                  clickable
                  onClick={() => {
                    setPanelType("complex");
                    setPanelData(complex);
                    setIsOpen(true);
                  }}
                />
              ))}
            </Map>
            {isOpen && (
              <InfoPanel
                type={panelType}
                data={panelData}
                onClose={() => setIsOpen(false)}
              />
            )}
          </>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f4f6f8",
              color: "#888",
            }}
          >
            지도를 불러오는 중입니다...
          </div>
        )}
      </div>
    </div>
  );
}

export default MapContainer;
