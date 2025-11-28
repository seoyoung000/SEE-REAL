import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

// 1. 슬라이더 데이터 (좌표 수정됨)
// ... 기존 import 문 ...

const PREVIEW_ZONES = [
  {
    id: 1,
    name: "용산구 한남동 한남3구역",
    status: "관리처분 인가 완료",
    progress: 88,
    // top을 50%로 설정하여 정중앙 높이에 배치
    mapPosition: { top: '50%', left: '40%' } 
  },
  {
    id: 2,
    name: "이태원로 주변 지구단위계획구역",
    status: "지구단위계획 수립 심의 중",
    progress: 35,
    // top을 75%로 설정하여 하단부에 배치
    mapPosition: { top: '75%', left: '65%' } 
  },
  {
    id: 3,
    name: "한남5재정비촉진구역 지구단위계획구역",
    status: "건축심의 통과",
    progress: 62,
    // top을 60%로 설정하여 약간 아래쪽에 배치
    mapPosition: { top: '60%', left: '50%' } 
  }
];

// ... 이하 Home 컴포넌트 코드 동일 ...
// 하단 프로세스 데이터 (기존 유지)
const PROCESS_STEPS = [
  { step: 1, title: "정비구역 지정", desc: "주민 공람 및 구의회 의견 청취", sub: "• 법적 요건 검토 필요\n• 평균 6~12개월 소요" },
  { step: 2, title: "조합 설립", desc: "토지등소유자 75% 동의 확보", sub: "• 동의율 달성 핵심\n• 창립총회 개최" },
  { step: 3, title: "사업시행인가", desc: "건축심의 및 영향평가 완료", sub: "• 세부 건축계획 확정\n• 감정평가 준비" },
  { step: 4, title: "관리처분인가", desc: "분담금 확정 및 이주 시작", sub: "• 조합원 분양 신청 완료\n• 철거 및 착공 준비" }
];

function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  
  // 2. 현재 보여줄 구역의 인덱스 상태 관리
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // 다음 슬라이드
  const nextSlide = () => {
    setCurrentZoneIndex((prev) => (prev + 1) % PREVIEW_ZONES.length);
  };

  // 이전 슬라이드
  const prevSlide = () => {
    setCurrentZoneIndex((prev) => (prev - 1 + PREVIEW_ZONES.length) % PREVIEW_ZONES.length);
  };

  // 현재 선택된 데이터
  const currentZone = PREVIEW_ZONES[currentZoneIndex];

  return (
    <div className="home-container">
      {/* Hero Section (기존 동일) */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>주거 환경 정비 사업,<br />SEE:REAL을 통해 더 쉽게 참여하세요</h1>
          <form className="hero-search-bar" onSubmit={handleSearch}>
            <input type="text" placeholder="관심있는 지역을 말해주세요" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button type="submit" className="search-icon-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </form>
        </div>
        <div className="hero-illustration">
          <div className="map-circle-bg">
            <div className="map-dummy-visual">
              <div className="pin p1"></div><div className="pin p2"></div><div className="pin p3"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Preview Section (수정됨) */}
      <section className="feature-section map-preview">
        <div className="feature-container">
          <div className="text-group">
            <span className="sub-label">한남동 정비구역 안내 서비스</span>
            <h2>노후 주거 환경 정비사업을<br />지도 한 장으로<br />볼 수 있어요</h2>
            <p>더 이상 수많은 관련중개사와 온라인 사이트를<br />방문하지 않아도 사업 현황을 파악할 수 있어요</p>
            <div className="btn-group">
              <Link to="/process" className="btn-primary">
                지도 바로가기
              </Link>
               <Link to="/community" className="btn-secondary">커뮤니티 보기</Link>
            </div>
            <div className="stats-row">
              <div><strong>4개</strong><span>주요 구역</span></div>
              <div><strong>7,800세대</strong><span>예정 세대</span></div>
              <div><strong>2026년</strong><span>예정 완료</span></div>
            </div>
          </div>

          <div className="card-visual">
            <button className="slide-arrow left" onClick={prevSlide}>‹</button>
            
            <div className="phone-card">
              <div className="card-header">
                <span className="card-label">관심 구역 바로 보기</span>
              </div>

              {/* 동적 텍스트 영역 */}
              <h3>{currentZone.name}</h3>
              <p className="card-status">{currentZone.status}</p>
              
              <div className="progress-container">
                <div className="progress-bar" style={{width: `${currentZone.progress}%`}}></div>
              </div>
              <div className="progress-text">{currentZone.progress}%</div>

              {/* 미니맵 & 동적 핀 영역 */}
              <div className="mini-map-box">
                <div className="map-pins-container">
                  {/* 모든 구역의 핀을 렌더링하되, 현재 인덱스인 것만 active 클래스 부여 */}
                  {PREVIEW_ZONES.map((zone, idx) => (
                    <div
                      key={zone.id}
                      className={`map-pin-dot ${idx === currentZoneIndex ? 'active' : ''}`}
                      style={{ top: zone.mapPosition.top, left: zone.mapPosition.left }}
                    >
                      {/* 활성화된 핀 위에 툴팁처럼 이름 표시 (선택사항) */}
                      {idx === currentZoneIndex && <span className="pin-tooltip">{idx + 1}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button className="slide-arrow right" onClick={nextSlide}>›</button>
          </div>
        </div>
      </section>

      {/* Finance & Process Section (기존 동일) */}
      <section className="feature-section finance-info">
         {/* ... (이전 코드와 동일, 생략 가능하면 생략하거나 그대로 유지) ... */}
         <div className="feature-container vertical">
          <div className="section-header-center">
            <h2>중장년층의 눈높이에 맞춰<br />가장 중요한 정보만, 가장 알기 쉽게</h2>
            <p>내가 낼 분담금이 어떻게 이용되고, 우리 노후 주거 정비 사업이 어떻게 될지 예측해드려요</p>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <div className="card-top"><h4>한남3구역 예상 수치</h4><span>변동 가능</span></div>
              <div className="stat-list">
                <div className="stat-item"><strong>2.3억</strong><span>평균 분담금</span></div>
                <div className="stat-item"><strong>24%</strong><span>예상 수익률</span></div>
                <div className="stat-item"><strong>2028년</strong><span>정산 완료</span></div>
                <div className="stat-item"><strong>입주 후</strong><span>배당 예상</span></div>
              </div>
            </div>
            <div className="info-card">
              <div className="card-top"><h4>분담금 구성</h4><span>최근 기준</span></div>
              <div className="chart-list">
                <div className="chart-row"><div className="chart-labels"><span>분담금</span><strong>58%</strong></div><div className="bar-bg"><div className="bar-fill" style={{width: '58%'}}></div></div></div>
                <div className="chart-row"><div className="chart-labels"><span>공사비</span><strong>27%</strong></div><div className="bar-bg"><div className="bar-fill" style={{width: '27%'}}></div></div></div>
                <div className="chart-row"><div className="chart-labels"><span>기타</span><strong>15%</strong></div><div className="bar-bg"><div className="bar-fill" style={{width: '15%'}}></div></div></div>
              </div>
            </div>
            <div className="info-card">
              <div className="card-top"><h4>유의 사항</h4><span>공지 기반</span></div>
              <div className="alert-list">
                <div className="alert-item"><div className="dot"></div><div className="alert-content"><strong>분담금 변동</strong><p>공사비 상승으로 조정 가능성 있음</p></div></div>
                <div className="alert-item"><div className="dot"></div><div className="alert-content"><strong>교통대책</strong><p>한남대로 교통 분산안 요청 상태</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section process-flow">
        <div className="feature-container vertical">
          <div className="section-header-left">
            <h2>매번 바뀌고 복잡한 사업 진행 절차<br />알기 쉽게 설명하고 변경되면 알람을 보낼게요</h2>
            <p>놓치지 않도록 알려드릴게요</p>
          </div>
          <div className="process-grid">
            {PROCESS_STEPS.map((item, idx) => (
              <div className="process-card" key={idx}>
                <div className="step-badge">{item.step}</div>
                <h3>{item.title}</h3>
                <p className="desc">{item.desc}</p>
                <div className="divider"></div>
                <p className="sub-text">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
