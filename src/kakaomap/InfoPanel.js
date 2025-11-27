import React from "react";
import "./InfoPanel.css";

function InfoPanel({ info, onClose }) {
  if (!info) {
    return null;
  }

  // 숫자에 콤마 추가하는 헬퍼 함수
  const formatNumber = (num) => {
    return num ? num.toLocaleString() : 'N/A';
  }

  return (
    <div className="infoPanel">
      <button className="close-btn" onClick={onClose}>
        ×
      </button>
      <h2>{info.note}</h2>
      <div className="info-grid">
        <div className="info-item">
          <strong>진행 단계</strong>
          <span className="stage">{info.stage || 'N/A'}</span>
        </div>
        <div className="info-item">
          <strong>구역 면적(㎡)</strong>
          <span>{formatNumber(info.area)}</span>
        </div>
        <div className="info-item">
          <strong>구분</strong>
          <span>{info.type || 'N/A'}</span>
        </div>
        <div className="info-item">
          <strong>토지등 소유자 수</strong>
          <span>{formatNumber(info.households)}</span>
        </div>
      </div>
    </div>
  );
}

export default InfoPanel;
