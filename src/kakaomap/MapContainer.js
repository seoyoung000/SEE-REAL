import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Map, Polygon, MapMarker } from "react-kakao-maps-sdk";
import InfoPanel from "./InfoPanel";
import "./InfoPanel.css";
import "./MapContainer.css";

import allRedevelopmentZones from "../data/all_redevelopment_zones.json";
import zoneMarkersData from "../data/markers_with_stats.json";

// 🔥 새 JSON 적용
import polygons from "../data/hannam3_redevelopment_with_polygon.json";

// ---------------------------
// Kakao SDK Loader
// ---------------------------
let kakaoLoaderPromise = null;

function loadKakaoSdk(appKey) {
  if (!appKey) return Promise.reject();
  if (window.kakao && window.kakao.maps) return Promise.resolve(window.kakao);
  if (kakaoLoaderPromise) return kakaoLoaderPromise;

  kakaoLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${appKey}&libraries=services`;
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolve(window.kakao));
      } else {
        reject(new Error("Kakao SDK loaded but window.kakao is missing"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });

  return kakaoLoaderPromise;
}

const kakaoAppKey = process.env.REACT_APP_KAKAO_APP_KEY;

const defaultCenter = { lat: 37.531, lng: 127.0039 };

const getPolygonColor = (stage) => {
  switch (stage) {
    case "추진위원회 승인":
      return "#ADD8E6";
    case "사업시행인가":
      return "#FF8C00";
    case "관리처분인가":
      return "#FF0000";
    default:
      return "#A9A9A9";
  }
};

// ======================================================
//                 MAIN COMPONENT
// ======================================================
function MapContainer({ title, height }) {
  const [kakaoReady, setKakaoReady] = useState(false);
  const [zonesWithPolygons, setZonesWithPolygons] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [panelType, setPanelType] = useState("zone");
  const [panelData, setPanelData] = useState({});
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapLevel, setMapLevel] = useState(5);

  const mapRef = useRef(null);

  // ---------------------------
  // Load Kakao SDK
  // ---------------------------
  useEffect(() => {
    loadKakaoSdk(kakaoAppKey)
      .then(() => setKakaoReady(true))
      .catch((err) => console.error(err));
  }, []);

  // ---------------------------
  // JSON 폴리곤 로드
  // ---------------------------

  const polygonList = useMemo(() => {
    return Array.isArray(polygons?.features) ? polygons.features : [];
  }, []);

  // ---------------------------
  // 단지 markers
  // ---------------------------
  const complexMarkers = useMemo(() => {
    if (!zoneMarkersData) return [];
    return Object.entries(zoneMarkersData).map(([name, v]) => ({
      name,
      ...v,
    }));
  }, []);

  // ---------------------------
  // 검색 함수
  // ---------------------------
  const normalize = useCallback(
    (v) => v?.replace(/\s+/g, "").toLowerCase() || "",
    []
  );

  const handleSearch = () => {
    const term = keyword.trim();
    if (!term) return alert("이름을 입력하세요");
    const norm = normalize(term);

    // 1) 단지 검색
    const matchMarker = complexMarkers.find((m) =>
      normalize(m.name).includes(norm)
    );

    if (matchMarker) {
      setPanelData(matchMarker);
      setPanelType("complex");
      setIsOpen(true);
      setMapCenter({ lat: matchMarker.lat, lng: matchMarker.lng });
      setMapLevel(3);
      return;
    }

    // 2) JSON polygon 검색
    const matchPoly = polygonList.find((p) =>
      normalize(p.name || p.note).includes(norm)
    );

    if (matchPoly && Array.isArray(matchPoly.polygons)) {
      const firstPoly = matchPoly.polygons[0];

      const path = firstPoly.map(([lng, lat]) => ({ lat, lng }));
      const centroid = {
        lat: firstPoly.reduce((sum, [, lat]) => sum + lat, 0) / firstPoly.length,
        lng: firstPoly.reduce(([lngSum], [lng]) => lngSum + lng, 0) / firstPoly.length,
      };

      setPanelData({
        id: matchPoly.id,
        name: matchPoly.name,
        area: matchPoly.area,
        stage: matchPoly.stage,
        household: matchPoly.households,
        address: matchPoly.zone_address,
        coords: path,
      });
      setPanelType("zone");
      setIsOpen(true);
      setMapCenter(centroid);
      setMapLevel(4);
      return;
    }

    alert("검색 결과 없음");
  };

  // ---------------------------
  // Render
  // ---------------------------
  if (!kakaoAppKey) return <div>API KEY ERROR</div>;
  if (!kakaoReady) return <div>지도 로딩 중...</div>;

  return (
    <section className="map-fullscreen" style={{ height: height || "80vh" }}>
      <div className="map-fullscreen__canvas">
        <Map
          center={mapCenter}
          level={mapLevel}
          style={{ width: "100%", height: "100%" }}
          onCreate={(map) => (mapRef.current = map)}
        >
          {/* 🔥 JSON 폴리곤 렌더링 */}
          {polygonList.map((poly, idx) => {
            if (!Array.isArray(poly.polygons)) return null;
            const firstPath = poly.polygons[0].map(([lng, lat]) => ({
              lat,
              lng,
            }));

            return (
              <Polygon
                key={`json-poly-${idx}`}
                path={firstPath}
                strokeWeight={2}
                strokeColor="#FF3B30"
                fillColor="#FF3B30"
                fillOpacity={0.3}
                onClick={() => {
                  setPanelType("zone");
                  setPanelData({
                    id: poly.id,
                    name: poly.zone_name || poly.name,
                    district: poly.district,
                    dong: poly.dong,
                    type: poly.type,
                    op_type: poly.op_type,
                    note: poly.note,
                    address: poly.address,
                    stage: poly.stage,
                    status: poly.status,
                    households: poly.households,
                    zone_address: poly.zone_address,
                    area: poly.area,
                    coords: firstPath,
                    typeLabel: "polygon-json",
                  });
                  setIsOpen(true);
                }}
              />
            );
          })}

          {/* 🔥 단지 markers */}
          {complexMarkers.map((c, idx) => (
            <MapMarker
              key={`marker-${idx}`}
              position={{ lat: c.lat, lng: c.lng }}
              clickable
              onClick={() => {
                setPanelType("complex");
                setPanelData(c);
                setIsOpen(true);
              }}
            />
          ))}
        </Map>
      </div>

      {/* 상단 검색 UI */}
      <div className="map-overlay-stack">
        <div className="map-overlay-card">
          <p className="map-overlay-eyebrow">SEE:REAL</p>
          <h2>{title || "재개발 구역 통합 지도"}</h2>
          <div className="map-search-row">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="구역명 또는 아파트 검색"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch}>검색</button>
          </div>
        </div>

        {/* 정보 패널 */}
        <div className={`map-info-panel${isOpen ? " open" : ""}`}>
          <InfoPanel
            type={panelType}
            data={panelData}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    </section>
  );
}

export default MapContainer;
