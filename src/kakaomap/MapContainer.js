import React, { useState } from "react";
import { Map, Polygon } from "react-kakao-maps-sdk";
import hannamInfo from "../data/basic_info.json";
import InfoPanel from "./InfoPanel";
import "./InfoPanel.css";

const { kakao } = window;

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

function MapContainer({ title }) {
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(hannamCenter); // 초기 중심을 한남동으로 설정

  const handleSearch = () => {
    if (!keyword.trim()) {
      alert("키워드를 입력해주세요.");
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
      <div style={{ position: "relative", width: "100%", height: "70vh" }}>
        <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={5}>
          <Polygon
            path={hannamPath}
            {...polygonStyle}
            onClick={() => setIsOpen(true)}
          />
        </Map>
        {isOpen && <InfoPanel info={hannamInfo} onClose={() => setIsOpen(false)} />}
      </div>
    </div>
  );
}

export default MapContainer;
