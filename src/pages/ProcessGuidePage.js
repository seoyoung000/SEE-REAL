import React from "react";
import MapContainer from "../kakaomap/MapContainer";
import "./ProcessGuidePage.css";

function ProcessGuidePage() {
  return (
    <div className="process-map-only">
      <MapContainer
        title="정비사업 절차 안내 · 구역 현황"
        height="calc(100vh - 140px)"
      />
    </div>
  );
}

export default ProcessGuidePage;
