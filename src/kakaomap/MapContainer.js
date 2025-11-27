import React, { useEffect, useMemo, useRef, useState } from "react";
import { Map, Polygon, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import hannamInfo from "../data/basic_info.json";
import hannamStats from "../data/hannam_stats.json";
import markersData from "../data/markers_with_stats.json";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import InfoPanel from "./InfoPanel";
import "./InfoPanel.css";
import "./MapContainer.css";

const kakaoAppKey = process.env.REACT_APP_KAKAO_APP_KEY;

const hannamCenter = { lat: 37.5385, lng: 127.0039 };
const HANNAM_ZONE_SLUG = "hannam-3";

const hannamPath = [
  { lat: hannamCenter.lat - 0.001, lng: hannamCenter.lng - 0.0015 },
  { lat: hannamCenter.lat + 0.001, lng: hannamCenter.lng - 0.0015 },
  { lat: hannamCenter.lat + 0.001, lng: hannamCenter.lng + 0.0015 },
  { lat: hannamCenter.lat - 0.001, lng: hannamCenter.lng + 0.0015 },
];

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

const polygonStyle = {
  strokeWeight: 2,
  strokeColor: getPolygonColor(hannamInfo.stage),
  strokeOpacity: 0.8,
  strokeStyle: "solid",
  fillColor: getPolygonColor(hannamInfo.stage),
  fillOpacity: 0.3,
};

function MapContainer({ title, height = "70vh" }) {
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [panelType, setPanelType] = useState("zone");
  const [panelData, setPanelData] = useState(hannamInfo);
  const [panelMeta, setPanelMeta] = useState({
    favoriteId: HANNAM_ZONE_SLUG,
    favoriteLabel: hannamInfo.note || "한남 제3재정비촉진구역",
  });

  const [mapCenter, setMapCenter] = useState(hannamCenter);
  const [mapLevel, setMapLevel] = useState(5);
  const [mapReady, setMapReady] = useState(false);

  const [favoriteZoneIds, setFavoriteZoneIds] = useState([]);
  const [favoriteSaving, setFavoriteSaving] = useState(false);

  const mapRef = useRef(null);
  const initializedRef = useRef(false);

  const [kakaoLoading, loaderError] = useKakaoLoader({
    appkey: kakaoAppKey || "",
    libraries: ["services"],
  });

  const complexMarkers = useMemo(() => {
    if (!markersData) return [];
    return Object.entries(markersData).map(([name, payload]) => ({
      name,
      ...payload,
    }));
  }, []);

  const trendStats = useMemo(() => {
    const sorted = [...hannamStats].sort((a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    });
    return sorted.slice(-6);
  }, []);

  const overviewPoints = useMemo(
    () =>
      [
        ...hannamPath,
        ...complexMarkers.map((marker) => ({
          lat: Number(marker.lat),
          lng: Number(marker.lng),
        })),
      ].filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng)),
    [complexMarkers]
  );

  const overviewBounds = useMemo(() => {
    if (!overviewPoints.length) return null;
    return overviewPoints.reduce(
      (acc, point) => ({
        minLat: Math.min(acc.minLat, point.lat),
        maxLat: Math.max(acc.maxLat, point.lat),
        minLng: Math.min(acc.minLng, point.lng),
        maxLng: Math.max(acc.maxLng, point.lng),
      }),
      {
        minLat: Infinity,
        maxLat: -Infinity,
        minLng: Infinity,
        maxLng: -Infinity,
      }
    );
  }, [overviewPoints]);

  const overviewCenter = useMemo(() => {
    if (!overviewBounds) return hannamCenter;
    return {
      lat: (overviewBounds.minLat + overviewBounds.maxLat) / 2,
      lng: (overviewBounds.minLng + overviewBounds.maxLng) / 2,
    };
  }, [overviewBounds]);

  useEffect(() => {
    if (!initializedRef.current && overviewCenter) {
      setMapCenter(overviewCenter);
      initializedRef.current = true;
    }
  }, [overviewCenter]);

  // 관심 구역 실시간 구독
  useEffect(() => {
    if (!user) {
      setFavoriteZoneIds([]);
      return undefined;
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data();
        setFavoriteZoneIds(
          Array.isArray(data?.favoriteZones) ? data.favoriteZones : []
        );
      },
      (err) => {
        console.error("관심 구역 구독 실패", err);
        setFavoriteZoneIds([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const maxTrendPrice = useMemo(
    () =>
      trendStats.reduce((max, stat) => Math.max(max, stat.avg_price || 0), 0) ||
      1,
    [trendStats]
  );

  const formatPrice = (value) =>
    value ? `${(value / 100000000).toFixed(1)}억` : "데이터 없음";

  const totalComplexes = complexMarkers.length;
  const totalDeals = complexMarkers.reduce(
    (sum, complex) =>
      sum + (Array.isArray(complex.deals) ? complex.deals.length : 0),
    0
  );

  const handleSearch = () => {
    const searchTerm = keyword.trim().replace(/\s+/g, "");
    if (!searchTerm) {
      alert("검색할 아파트 이름을 입력해주세요.");
      return;
    }

    const target = complexMarkers.find((marker) =>
      marker.name.replace(/\s+/g, "").includes(searchTerm)
    );
    if (target) {
      setMapCenter({ lat: target.lat, lng: target.lng });
      setMapLevel(3);
      setPanelType("complex");
      setPanelData(target);
      setPanelMeta(null);
      setIsOpen(true);
    } else {
      alert("검색된 단지가 없습니다.");
    }
  };

  const handleResetCenter = () => {
    if (window.kakao && mapRef.current && overviewPoints.length) {
      const bounds = new window.kakao.maps.LatLngBounds();
      overviewPoints.forEach((point) =>
        bounds.extend(new window.kakao.maps.LatLng(point.lat, point.lng))
      );
      mapRef.current.setBounds(bounds, 60, 60, 60, 60);
    }
    setIsOpen(false);
  };

  const handleOpenZonePanel = () => {
    setPanelType("zone");
    setPanelData(hannamInfo);
    setPanelMeta({
      favoriteId: HANNAM_ZONE_SLUG,
      favoriteLabel: hannamInfo.note || "한남 제3재정비촉진구역",
    });
    setIsOpen(true);
  };

  const handleClickMarker = (complex) => {
    setPanelType("complex");
    setPanelData(complex);
    setPanelMeta(null); // 단지는 관심 구역 버튼 X
    setIsOpen(true);
    setMapCenter({ lat: complex.lat, lng: complex.lng });
  };

  const handleToggleFavoriteZone = async () => {
    if (!panelMeta?.favoriteId) return;

    if (!user) {
      alert("관심 구역 등록은 로그인 후 이용할 수 있습니다.");
      return;
    }

    setFavoriteSaving(true);
    const userRef = doc(db, "users", user.uid);

    try {
      const profile = await getDoc(userRef);

      if (!profile.exists()) {
        // 최소 기본 정보만 생성 (알림 설정은 건드리지 않음)
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email,
            name: user.displayName || "",
            createdAt: serverTimestamp(),
            favoriteZones: [],
          },
          { merge: true }
        );
      }

      const alreadyFavorite = favoriteZoneIds.includes(panelMeta.favoriteId);

      await updateDoc(userRef, {
        favoriteZones: alreadyFavorite
          ? arrayRemove(panelMeta.favoriteId)
          : arrayUnion(panelMeta.favoriteId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("관심 구역 저장 실패", err);
      alert("관심 구역을 업데이트하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setFavoriteSaving(false);
    }
  };

  if (!kakaoAppKey) return <div>API Key Error</div>;
  if (loaderError) return <div>Map Load Error</div>;

  return (
    <section className="map-shell">
      <div className="map-shell__inner">
        <header className="map-header">
          <div className="map-header__text">
            <p className="map-pill">한남동 실거래 데이터</p>
            <h1>{title || "구역·단지 정보를 한 화면에서"}</h1>
            <p>
              핀이나 폴리곤을 선택하면 구역 정보와 거래 기록을 왼쪽 패널로 확인할 수 있습니다.
              검색과 전체 보기 버튼으로 빠르게 위치를 이동하세요.
            </p>
          </div>
          <div className="map-header__stats">
            <article>
              <p className="stat-label">등록 단지</p>
              <strong className="stat-value">
                {totalComplexes.toLocaleString()}곳
              </strong>
            </article>
            <article>
              <p className="stat-label">최근 실거래</p>
              <strong className="stat-value">
                {formatPrice(trendStats.at(-1)?.avg_price)}
              </strong>
            </article>
            <article>
              <p className="stat-label">누적 거래</p>
              <strong className="stat-value">
                {totalDeals.toLocaleString()}건
              </strong>
            </article>
          </div>
        </header>

        <div className="map-toolbar">
          <div className="map-search-panel">
            <label htmlFor="map-search">단지 검색</label>
            <div className="map-search-panel__controls">
              <input
                id="map-search"
                className="map-search-input"
                placeholder="아파트 이름으로 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button type="button" className="map-search-btn" onClick={handleSearch}>
                검색
              </button>
              <button type="button" className="map-reset-btn" onClick={handleResetCenter}>
                전체 보기
              </button>
            </div>
          </div>
        </div>

        <div className={`map-stage${isOpen ? " has-panel" : ""}`}>
          {isOpen && (
            <div className="map-info-overlay">
              <InfoPanel
                type={panelType}
                data={panelData}
                onClose={() => setIsOpen(false)}
                favoriteId={panelMeta?.favoriteId}
                favoriteLabel={panelMeta?.favoriteLabel}
                isFavorite={
                  panelMeta?.favoriteId
                    ? favoriteZoneIds.includes(panelMeta.favoriteId)
                    : false
                }
                favoritePending={favoriteSaving}
                onToggleFavorite={handleToggleFavoriteZone}
              />
            </div>
          )}

          <div className="map-stage__canvas" style={{ height }}>
            {(kakaoLoading || !mapReady) && (
              <div className="map-viewer__loading">지도를 불러오는 중...</div>
            )}

            {!kakaoLoading && (
              <Map
                center={mapCenter}
                style={{ width: "100%", height: "100%" }}
                level={mapLevel}
                onCreate={(map) => {
                  mapRef.current = map;
                  setMapReady(true);
                }}
              >
                <Polygon path={hannamPath} {...polygonStyle} onClick={handleOpenZonePanel} />

                {complexMarkers.map((complex) => (
                  <MapMarker
                    key={complex.name}
                    position={{ lat: complex.lat, lng: complex.lng }}
                    clickable
                    onClick={() => handleClickMarker(complex)}
                  />
                ))}
              </Map>
            )}
          </div>
        </div>
      </div>

      <div className="map-shell__inner">
        <div className="map-trend-card">
          <div className="map-trend-card__header">
            <div>
              <p>한남동 실거래 추이</p>
              <strong>최근 6개월 데이터</strong>
            </div>
            <div className="map-trend-card__badge">
              <strong>{formatPrice(trendStats.at(-1)?.avg_price)}</strong>
              <span>한남동 전체 데이터 기준</span>
            </div>
          </div>
          <div className="map-trend-list">
            {trendStats.map((stat) => {
              const ratio = Math.max(0.08, stat.avg_price / maxTrendPrice);
              return (
                <div
                  key={`${stat.year}-${stat.month}`}
                  className="map-trend-row"
                >
                  <div className="map-trend-row__label">
                    <span>
                      {stat.year}.{String(stat.month).padStart(2, "0")}
                    </span>
                    <strong>{stat.avg_price.toLocaleString("ko-KR")}원</strong>
                  </div>
                  <div className="map-trend-row__bar">
                    <span style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MapContainer;
