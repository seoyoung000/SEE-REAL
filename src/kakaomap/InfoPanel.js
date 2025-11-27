import React, { useMemo } from "react";
import hannamStats from "../data/hannam_stats.json";
import "./InfoPanel.css";

function InfoPanel({ type = "zone", data, onClose }) {
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

  const latestZoneStat = hannamStats[hannamStats.length - 1];
  const recentZoneStats = useMemo(() => hannamStats.slice(-4), []);

  if (!data) {
    return null;
  }

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
      </>
    );
  };

  return (
    <div className="infoPanel">
      <button className="close-btn" onClick={onClose}>
        ×
      </button>
      <div className="infoPanel-content">
        {type === "complex" ? renderComplexInfo() : renderZoneInfo()}
      </div>
    </div>
  );
}

export default InfoPanel;
