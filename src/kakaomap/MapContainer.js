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
import { dealsData } from "../data/deals_data.js";
import { rentDealsData } from "../data/rent_deals_data.js";

// 🔥 새 JSON 적용
import polygons from "../data/hannam3_redevelopment_with_polygon.json";
import hannamRedevelopmentGeo from "../data/hannam_itaewon_redevelopment.json";
import hannamDistrictGeo from "../data/hannam_district.json";
import itaewonDistrictGeo from "../data/itaewon_district.json";

console.log("hannamRedevelopmentGeo", hannamRedevelopmentGeo);

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

const geoJsonColors = {
  redevelopment: { stroke: "#FF6B6B", fill: "#FF6B6B" },
  hannam: { stroke: "#2268A0", fill: "#2268A0" },
  itaewon: { stroke: "#0E9F6E", fill: "#0E9F6E" },
};

const normalizeComplexKey = (value = "") =>
  value.toString().replace(/\s+/g, "").toLowerCase();

const FIXED_ZONE_KEYWORDS = [
  "한남 지구단위계획구역",
  "이태원로 주변 지구단위계획구역",
  "한남외인주택부지 지구단위계획구역",
  "한남4재정비촉진구역 지구단위계획구역",
  "한남5재정비촉진구역 지구단위계획구역",
  "한남3재정비촉진구역",
];

const AREA_KEYS = ["area", "AREA", "land_area", "plan_area", "DGM_AR", "SHAPE_AREA"];
const HOUSEHOLD_KEYS = [
  "households",
  "HOUSEHOLDS",
  "owner_cnt",
  "house_cnt",
  "HOUSE_CNT",
  "TOT_HSHD",
  "TOT_HOUSE",
];
const TYPE_KEYS = ["type", "TYPE", "category", "plan_type", "zone_category", "LCLAS_CL"];
const STAGE_KEYS = ["stage", "STAGE", "status", "STATUS", "progress", "zone_category", "LCLAS_CL"];
const NAME_KEYS = ["name", "NAME", "title", "TITLE", "zone_name", "DGM_NM"];

const getValueFromKeys = (source, keys) => {
  if (!source) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return undefined;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractGeoJsonPolygons = (geojson, { idPrefix, label, colors }) => {
  if (!geojson?.features) return [];

  const toPath = (coords) =>
    coords.map(([lng, lat]) => ({ lat, lng }));

  const convertGeometry = (geometry) => {
    if (!geometry) return [];

    // Polygon → [[coords]] 형태
    if (geometry.type === "Polygon") {
      return geometry.coordinates.map((ring) => toPath(ring));
    }

    // MultiPolygon → [[[coords]]] 형태 → 각각 별도의 Polygon으로 분리
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.flatMap((poly) =>
        poly.map((ring) => toPath(ring))
      );
    }

    return [];
  };

  return geojson.features.flatMap((feature, featureIndex) => {
    const paths = convertGeometry(feature.geometry);
    const props = feature.properties || {};

    const name =
      props.name ||
      props.NAME ||
      props.title ||
      props.zone_name ||
      label ||
      "정비구역";

    return paths.map((path, pathIndex) => ({
      id: `${idPrefix}-${feature.id || featureIndex}-${pathIndex}`,
      name,
      strokeColor: colors.stroke,
      fillColor: colors.fill,
      fillOpacity: 0.25,
      properties: props,
      path,
    }));
  });
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

  const saleDealsByComplex = useMemo(() => {
    return dealsData.reduce((acc, deal) => {
      const key = normalizeComplexKey(deal.name);
      if (!key) return acc;
      const date = deal.deal_date || deal.date || "";
      acc[key] = acc[key] || [];
      acc[key].push({
        type: "sale",
        price: deal.deal_price ?? deal.price ?? null,
        area_m2: deal.area_m2 ?? null,
        floor: deal.floor ?? null,
        date,
      });
      return acc;
    }, {});
  }, []);

  const rentDealsByComplex = useMemo(() => {
    return rentDealsData.reduce((acc, deal) => {
      const key = normalizeComplexKey(deal.name);
      if (!key) return acc;
      const date = deal.deal_date || deal.date || "";
      acc[key] = acc[key] || [];
      acc[key].push({
        type: deal.type || "jeonse",
        deposit: deal.deposit ?? null,
        monthly_rent: deal.monthly_rent ?? null,
        area_m2: deal.area_m2 ?? null,
        floor: deal.floor ?? null,
        date,
      });
      return acc;
    }, {});
  }, []);

  // ---------------------------
  // JSON 폴리곤 로드
  // ---------------------------
  const polygonList = useMemo(() => {
    return Array.isArray(polygons?.features) ? polygons.features : [];
  }, []);

  const geoJsonPolygons = useMemo(() => {
    return [
      ...extractGeoJsonPolygons(hannamRedevelopmentGeo, {
        idPrefix: "hannam-redev",
        label: "한남·이태원 재개발",
        colors: geoJsonColors.redevelopment,
      }),
      ...extractGeoJsonPolygons(hannamDistrictGeo, {
        idPrefix: "hannam-district",
        label: "한남동 지구단위",
        colors: geoJsonColors.hannam,
      }),
      ...extractGeoJsonPolygons(itaewonDistrictGeo, {
        idPrefix: "itaewon-district",
        label: "이태원 지구단위",
        colors: geoJsonColors.itaewon,
      }),
    ];
  }, []);

  // ---------------------------
  // 단지 markers
  // ---------------------------
  const complexMarkers = useMemo(() => {
    if (!zoneMarkersData) return [];
    return Object.entries(zoneMarkersData).map(([name, v]) => {
      const key = normalizeComplexKey(name);
      const baseDeals = Array.isArray(v.deals)
        ? v.deals.map((deal) => ({
            ...deal,
            type: deal.type || "sale",
            date: deal.date || deal.deal_date || "",
          }))
        : [];
      const mergedDeals = [
        ...baseDeals,
        ...(saleDealsByComplex[key] || []),
        ...(rentDealsByComplex[key] || []),
      ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      return {
        name,
        ...v,
        deals: mergedDeals,
      };
    });
  }, [saleDealsByComplex, rentDealsByComplex]);

  // ---------------------------
  // ⭐ NEW: 실제 dynamic zone names 수집 & 저장
  // ---------------------------

// 1) GeoJSON 기반 구역명만 저장
function collectAllZoneNames(geoJsonPolys) {
  const names = geoJsonPolys
    .map((g) => g.name)
    .filter(Boolean);

  const unique = [...new Set(names)];
  sessionStorage.setItem("dynamic-zone-names", JSON.stringify(unique));

  console.log("📌 저장된 동적 구역명 (GeoJSON 기반):", unique);
}

// 2) 호출
useEffect(() => {
  if (geoJsonPolygons.length === 0) return;
  collectAllZoneNames(geoJsonPolygons);
}, [geoJsonPolygons]);

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
    const aliasKeyword = FIXED_ZONE_KEYWORDS.find((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return (
        normalizedKeyword.includes(norm) ||
        norm.includes(normalizedKeyword)
      );
    });

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
    const basePoly = polygonList.find((p) => {
      const normalizedName = normalize(p.name || p.note);
      return (
        normalizedName.includes(norm) || norm.includes(normalizedName)
      );
    });

    const aliasPoly =
      !basePoly && aliasKeyword
        ? polygonList.find((p) =>
            normalize(p.name || p.note).includes(
              normalize(aliasKeyword)
            )
          )
        : null;

    const matchPoly = aliasPoly || basePoly;

    if (matchPoly && Array.isArray(matchPoly.polygons)) {
      const firstPoly = matchPoly.polygons[0];

      const path = firstPoly.map(([lng, lat]) => ({ lat, lng }));
      const centroid = {
        lat:
          firstPoly.reduce((sum, [, lat]) => sum + lat, 0) /
          firstPoly.length,
        lng:
          firstPoly.reduce((sum, [lng]) => sum + lng, 0) /
          firstPoly.length,
      };

      const resolvedArea = toNumberOrNull(getValueFromKeys(matchPoly, AREA_KEYS));
      const resolvedHouseholds = toNumberOrNull(getValueFromKeys(matchPoly, HOUSEHOLD_KEYS));
      const resolvedType = getValueFromKeys(matchPoly, TYPE_KEYS) || "정비구역";
      const resolvedStage = getValueFromKeys(matchPoly, STAGE_KEYS);
      const resolvedName = getValueFromKeys(matchPoly, NAME_KEYS) || matchPoly.name;
      const resolvedNote = matchPoly.note || resolvedName;

      setPanelData({
        id: matchPoly.id,
        name: resolvedName,
        area: resolvedArea,
        type: resolvedType,
        stage: resolvedStage,
        households: resolvedHouseholds,
        address: matchPoly.zone_address,
        note: resolvedNote,
        coords: path,
      });
      setPanelType("zone");
      setIsOpen(true);
      setMapCenter(centroid);
      setMapLevel(4);
      return;
    }

    const baseGeo = geoJsonPolygons.find((poly) => {
      const normalizedName = normalize(poly.name);
      return (
        normalizedName.includes(norm) || norm.includes(normalizedName)
      );
    });

    const aliasGeo =
      !baseGeo && aliasKeyword
        ? geoJsonPolygons.find((poly) =>
            normalize(poly.name).includes(normalize(aliasKeyword))
          )
        : null;

    const matchGeo = aliasGeo || baseGeo;

    if (matchGeo) {
      const props = matchGeo.properties || {};
      const resolvedArea = toNumberOrNull(getValueFromKeys(props, AREA_KEYS));
      const resolvedHouseholds = toNumberOrNull(
        getValueFromKeys(props, HOUSEHOLD_KEYS)
      );
      const resolvedType =
        getValueFromKeys(props, TYPE_KEYS) || "정비구역";
      const resolvedStage = getValueFromKeys(props, STAGE_KEYS);
      const resolvedName = getValueFromKeys(props, NAME_KEYS) || matchGeo.name;
      const resolvedNote = props?.description || resolvedName;

      setPanelType("zone");
      setPanelData({
        id: matchGeo.id,
        name: resolvedName,
        area: resolvedArea,
        type: resolvedType,
        stage: resolvedStage,
        households: resolvedHouseholds,
        note: resolvedNote,
        coords: matchGeo.path,
        rawProperties: props,
        typeLabel: "geojson",
      });
      setIsOpen(true);
      if (matchGeo.path && matchGeo.path.length > 0) {
        const centerPoint = matchGeo.path.reduce(
          (acc, point) => ({
            lat: acc.lat + point.lat / matchGeo.path.length,
            lng: acc.lng + point.lng / matchGeo.path.length,
          }),
          { lat: 0, lng: 0 }
        );
        setMapCenter(centerPoint);
      }
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
    <section className="map-fullscreen" style={{ height: height || "100vh" }}>
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
            const resolvedArea = toNumberOrNull(getValueFromKeys(poly, AREA_KEYS));
            const resolvedHouseholds = toNumberOrNull(getValueFromKeys(poly, HOUSEHOLD_KEYS));
            const resolvedType = getValueFromKeys(poly, TYPE_KEYS) || "정비구역";
            const resolvedStage = getValueFromKeys(poly, STAGE_KEYS) || poly.stage;
            const resolvedName = getValueFromKeys(poly, NAME_KEYS) || poly.zone_name || poly.name;
            const resolvedNote = poly.note || resolvedName;

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
                    name: resolvedName,
                    district: poly.district,
                    dong: poly.dong,
                    type: resolvedType,
                    op_type: poly.op_type,
                    note: resolvedNote,
                    address: poly.address,
                    stage: resolvedStage,
                    status: poly.status,
                    households: resolvedHouseholds,
                    zone_address: poly.zone_address,
                    area: resolvedArea,
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

          {/* 추가 GeoJSON 폴리곤 */}
          {geoJsonPolygons.map((poly) => (
            <Polygon
              key={poly.id}
              path={poly.path}
              strokeWeight={2}
              strokeColor={poly.strokeColor}
              strokeOpacity={0.9}
              fillColor={poly.fillColor}
              fillOpacity={poly.fillOpacity}
              onClick={() => {
                const props = poly.properties || {};
                const resolvedArea = toNumberOrNull(getValueFromKeys(props, AREA_KEYS));
                const resolvedHouseholds = toNumberOrNull(getValueFromKeys(props, HOUSEHOLD_KEYS));
                const resolvedType = getValueFromKeys(props, TYPE_KEYS) || "정비구역";
                const resolvedStage = getValueFromKeys(props, STAGE_KEYS);
                const resolvedName = getValueFromKeys(props, NAME_KEYS) || poly.name;
                const resolvedNote = props?.description || resolvedName;

                setPanelType("zone");
                setPanelData({
                  id: poly.id,
                  name: resolvedName,
                  area: resolvedArea,
                  type: resolvedType,
                  stage: resolvedStage,
                  households: resolvedHouseholds,
                  note: resolvedNote,
                  coords: poly.path,
                  rawProperties: props,
                  typeLabel: "geojson",
                });
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
