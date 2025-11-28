import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./InfoPanel.css";

function InfoPanel({ type = "zone", data, onClose }) {
  const navigate = useNavigate();

  const formatNumber = (num) => (num || num === 0 ? num.toLocaleString() : "N/A");

  const formatPeriod = (stat) =>
    stat ? `${stat.year}.${stat.month.toString().padStart(2, "0")}` : "";

  const formatAreaValue = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const hasDecimal = Math.abs(value - Math.round(value)) > 0.001;
    return `${value.toLocaleString("ko-KR", {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: 2,
    })}㎡`;
  };

  const formatDealDate = (dateString) =>
    dateString ? dateString.replace(/-/g, ".") : "-";

  const latestZoneStat = Array.isArray(data.stats) && data.stats.length > 0 ? data.stats[data.stats.length - 1] : null;
  const recentZoneStats = useMemo(() => Array.isArray(data.stats) ? data.stats.slice(-4) : [], [data.stats]);

  if (!data) {
    return null;
  }

  const handleViewDetails = () => {
    if (data.name) {
      console.log("Navigating to:", `/calculator/${data.name}`);
      console.log("Data name (regionId):", data.name);
      navigate(`/calculator/${data.name}`);
      onClose();
    } else {
      console.error("Project ID (data.name) is missing for navigation.");
      alert("프로젝트 ID를 찾을 수 없습니다.");
    }
  };

  const handleFavoriteToggle = (id, name) => {
    console.log(`Favorite button clicked for ID: ${id}, Name: ${name}`);
    alert(`'${name}'을(를) 관심 구역/단지로 등록합니다. (Firebase 연동 예정)`);
    // 여기에 Firebase 연동 로직 추가 예정
  };

  const renderZoneInfo = () => (
    <>
      <h2>{data.note}</h2>
      <div className="info-grid">
        <div className="info-item">
          <strong>진행 단계</strong>
          <span className="stage">{data.stage || "N/A"}</span>
        </div>
        <div className="info-item">
          <strong>구역 면적(㎡)</strong>
          <span>{formatNumber(data.area)}</span>
        </div>
        <div className="info-item">
          <strong>구분</strong>
          <span>{data.type || "N/A"}</span>
        </div>
        <div className="info-item">
          <strong>토지등 소유자 수</strong>
          <span>{formatNumber(data.households)}</span>
        </div>
      </div>
      {latestZoneStat && (
        <div className="info-price-section">
          <p className="info-price-title">최근 평균 실거래가</p>
          <p className="info-price-value">
            {formatNumber(latestZoneStat.avg_price)}원
          </p>
          <p className="info-price-period">
            {formatPeriod(latestZoneStat)}
          </p>
          <div className="info-price-trend">
            {recentZoneStats.map((stat) => (
              <div key={`${stat.year}-${stat.month}`}>
                <span>{formatPeriod(stat)}</span>
                <strong>{formatNumber(stat.avg_price)}원</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="infoPanel-actions">
        <button className="view-details-btn" onClick={handleViewDetails}>
          자세히 보기
        </button>
        <button
          className="favorite-btn"
          onClick={() => handleFavoriteToggle(data.name, data.note)}
        >
          ★ 관심 구역 등록
        </button>
      </div>
    </>
  );

  const renderComplexInfo = () => {
    const recentStats = Array.isArray(data.stats) ? data.stats.slice(-5) : [];
    const recentDeals = Array.isArray(data.deals)
      ? data.deals.slice(-5).reverse()
      : [];

    return (
      <>
        <h2>{data.name || "단지 상세"}</h2>
        <div className="info-grid">
          <div className="info-item">
            <strong>주소</strong>
            <span>{data.address || "주소 정보 없음"}</span>
          </div>
          {Array.isArray(data.areas) && data.areas.length > 0 && (
            <div className="info-item">
              <strong>전용 면적</strong>
              <div className="area-chip-row">
                {data.areas.map((area) => (
                  <span
                    className="area-chip"
                    key={`${data.name || "complex"}-${area}`}
                  >
                    {formatAreaValue(area)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="info-item">
            <strong>최신 평균 실거래가</strong>
            <span>{formatNumber(data.latest_avg)}원</span>
          </div>
        </div>
        {recentStats.length ? (
          <div className="info-price-section">
            <p className="info-price-title">월별 평균 실거래가</p>
            <div className="info-price-trend">
              {recentStats.map((stat) => (
                <div key={`${data.name || "complex"}-${stat.year}-${stat.month}`}>
                  <span>{formatPeriod(stat)}</span>
                  <strong>{formatNumber(stat.avg_price)}원</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="info-price-title">실거래 추이 데이터가 없습니다.</p>
        )}
        {recentDeals.length ? (
          <div className="info-deal-section">
            <p className="info-price-title">최근 거래 내역</p>
            <div className="deal-list">
              {recentDeals.map((deal) => (
                <div
                  className="deal-item"
                  key={`${deal.date}-${deal.area_m2}-${deal.floor}`}
                >
                  <div className="deal-headline">
                    <span className="deal-date">{formatDealDate(deal.date)}</span>
                    <strong>{formatNumber(deal.price)}원</strong>
                  </div>
                  <div className="deal-meta">
                    <span>{formatAreaValue(deal.area_m2)}</span>
                    <span>
                      {typeof deal.floor === "number" ? `${deal.floor}층` : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="info-price-title">최근 거래 내역이 없습니다.</p>
        )}
      <div className="infoPanel-actions">
        <button className="view-details-btn" onClick={handleViewDetails}>
          자세히 보기
        </button>
        <button
          className="favorite-btn"
          onClick={() => handleFavoriteToggle(data.name, data.name)}
        >
          ★ 관심 단지 등록
        </button>
      </div>
      </>
    );
  };

  return (
    <div className="infoPanel">
      <button className="close-btn" onClick={onClose}>
        ×
      </button>
      <div className="infoPanel-content">
        <div className="infoPanel-inner">
          {type === "complex" ? renderComplexInfo() : renderZoneInfo()}
        </div>
      </div>
    </div>
  );
}

export default InfoPanel;
