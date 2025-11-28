import React from "react";
import MapContainer from "../kakaomap/MapContainer";
import "./ProcessGuidePage.css";

function ProcessGuidePage() {
  return (
    <div className="process-map-only">
      <section className="process-hero">
        <p className="process-label">지도형 정보 찾기</p>
        <h1>지도에서 바로 확인하는 한남동 구역 현황</h1>
        <p className="process-desc">
          구역이나 단지를 클릭하면 왼쪽 패널에 최신 데이터가 열립니다. 검색창과 중앙 버튼으로 쉽게 이동할 수 있도록 구성했습니다.
        </p>
      </section>

      <section className="process-map-section">
        <MapContainer title="한남동 주요 구역 지도" height="90vh" />
      </section>

      <section className="process-help">
        <h2>지도 이용 안내</h2>
        <div className="process-help-grid">
          <article>
            <strong>핀이나 구역 선택</strong>
            <p>파란 핀 또는 붉은 구역을 클릭하면 상세 패널이 열립니다. 다시 눌러도 패널이 유지됩니다.</p>
          </article>
          <article>
            <strong>검색과 중앙 이동</strong>
            <p>상단 검색창에 단지·동 이름을 입력하거나 ‘한남 중심 보기’ 버튼을 눌러 기본 위치로 돌아갈 수 있습니다.</p>
          </article>
          <article>
            <strong>확대·축소</strong>
            <p>마우스 휠 또는 지도 우측 하단 버튼으로 크기를 조절하세요. 페이지 스크롤은 지도 밖에서 움직이면 편합니다.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default ProcessGuidePage;
