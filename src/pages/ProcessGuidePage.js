import { useEffect } from "react";
import MapContainer from "../kakaomap/MapContainer";

function ProcessGuidePage() {
  useEffect(() => {
    const mainEl = document.querySelector(".app-main");
    if (mainEl) {
      mainEl.classList.add("app-main--full");
    }
    return () => {
      if (mainEl) {
        mainEl.classList.remove("app-main--full");
      }
    };
  }, []);

  return (
    <div className="process-map-page">
      <MapContainer title="재개발 구역 지도" />
    </div>
  );
}

export default ProcessGuidePage;
