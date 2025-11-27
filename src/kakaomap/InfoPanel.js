import React, { useMemo } from "react";
import hannamStats from "../data/hannam_stats.json";
import "./InfoPanel.css";

function InfoPanel({ type = "zone", data, onClose }) {
  const formatNumber = (num) => (num || num === 0 ? num.toLocaleString() : "N/A");

  const formatPeriod = (stat) =>
    stat ? `${stat.year}.${stat.month.toString().padStart(2, "0")}` : "";

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

  const renderComplexInfo = () => (
    <>
      <h2>{data.name}</h2>
      <div className="info-grid">
        <div className="info-item">
          <strong>주소</strong>
          <span>{data.address || "주소 정보 없음"}</span>
        </div>
        <div className="info-item">
          <strong>최신 평균 실거래가</strong>
          <span>{formatNumber(data.latest_avg)}원</span>
        </div>
      </div>
      {data.stats?.length ? (
        <div className="info-price-section">
          <p className="info-price-title">월별 평균 실거래가</p>
          <div className="info-price-trend">
            {data.stats.slice(-5).map((stat) => (
              <div key={`${data.name}-${stat.year}-${stat.month}`}>
                <span>{formatPeriod(stat)}</span>
                <strong>{formatNumber(stat.avg_price)}원</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="info-price-title">실거래 추이 데이터가 없습니다.</p>
      )}
    </>
  );

  return (
    <div className="infoPanel">
      <button className="close-btn" onClick={onClose}>
        ×
      </button>
      {type === "complex" ? renderComplexInfo() : renderZoneInfo()}
    </div>
  );
}

export default InfoPanel;
