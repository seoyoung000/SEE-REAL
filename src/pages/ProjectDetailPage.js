import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import allRedevelopmentZones from "../data/all_redevelopment_zones.json";
import hannamStats from "../data/hannam_stats.json";
import markersData from "../data/markers_with_stats.json";
import "./ProjectDetailPage.css";

// 모든 진행 단계를 순서대로 정의
const allStages = [
  "추진위원회 구성",
  "정비구역 지정",
  "조합설립인가",
  "사업시행인가",
  "관리처분계획 수립",
  "착공",
  "준공",
];

// 각 단계에 대한 설명
const stageDescriptions = {
  "추진위원회 구성": "정비사업 추진을 위한 주민 동의를 얻어 추진위원회를 구성하는 단계입니다.",
  "정비구역 지정": "도시계획위원회의 심의를 거쳐 정비구역으로 지정됩니다.",
  "조합설립인가": "토지등소유자의 동의를 받아 조합을 설립하고 인가를 받습니다.",
  "사업시행인가": "사업계획서를 작성하여 인가받는 단계로, 건축 및 교통 심의가 포함됩니다.",
  "관리처분계획 수립": "분양 신청 후 조합원의 자산과 권리를 평가하고 분양 계획을 확정합니다.",
  "착공": "기존 건축물을 철거하고 본격적인 공사가 시작됩니다.",
  "준공": "공사가 완료되어 새로운 건물이 완성되고 입주를 준비합니다.",
};

const getProgress = (currentStage) => {
  const currentIndex = allStages.indexOf(currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / allStages.length) * 100);
};

const stageValueMap = {
  "추진위원회 구성": 1,
  "정비구역 지정": 2,
  "조합설립인가": 3,
  "사업시행인가": 4,
  "관리처분계획 수립": 5,
  착공: 6,
  준공: 7,
};

const formatPeriod = (stat) =>
  stat ? `${stat.year}년 ${stat.month.toString().padStart(2, "0")}월` : "";

function ProjectDetailPage() {
  const { regionId } = useParams();
  console.log("ProjectDetailPage - regionId:", regionId); // Debugging line

  const selectedRegion = useMemo(() => {
    if (!regionId) {
      return null;
    }
    
    // 한남 3구역은 별도 stats 파일(hannamStats)을 사용
    if (regionId === "11170-900000100") {
      const info = allRedevelopmentZones.find((zone) => zone["name"] === regionId);
      return info ? { info, stats: hannamStats, type: "redevelopment", id: info["name"] } : null;
    }

    // 다른 재개발 구역 검색 (별도 stats 없음)
    const redevelopmentZone = allRedevelopmentZones.find(
      (zone) => zone["name"] === regionId
    );
    if (redevelopmentZone) {
      return {
        info: redevelopmentZone,
        stats: [], // 이 구역들은 별도 월별 통계 데이터가 없음
        type: "redevelopment",
        id: redevelopmentZone["name"],
      };
    }

    // 아파트 단지 데이터 검색 (name 키는 영문으로 유지)
    const complexInfo = markersData[regionId];
    if (complexInfo) {
      return {
        info: { ...complexInfo, name: regionId }, // Add the name to the info object
        stats: complexInfo.stats || [],
        type: "complex",
        id: regionId,
      };
    }

    return null; // 모든 데이터에서 찾지 못한 경우
  }, [regionId]);

  console.log("ProjectDetailPage - selectedRegion:", selectedRegion); // Debugging line


  const displayRegionName = selectedRegion
    ? selectedRegion.info.note || selectedRegion.info.name
    : "데이터 없음";

  const currentStage = selectedRegion?.info?.stage === "관리처분인가"
      ? "관리처분계획 수립"
      : selectedRegion?.info?.stage;
      
  const progressPercentage = getProgress(currentStage);

  const sortedStats = useMemo(() => {
    if (!selectedRegion?.stats) return [];
    return [...selectedRegion.stats].sort((a, b) => {
      if (a.year === b.year) {
        return a.month - b.month;
      }
      return a.year - b.month;
    });
  }, [selectedRegion]);

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(
    sortedStats.length ? sortedStats.length - 1 : 0
  );

  useEffect(() => {
    setSelectedPeriodIndex(sortedStats.length ? sortedStats.length - 1 : 0);
  }, [regionId, sortedStats.length]);


  const selectedPeriod =
    sortedStats[selectedPeriodIndex] || sortedStats[sortedStats.length - 1];
  const prevPeriod =
    selectedPeriodIndex > 0 ? sortedStats[selectedPeriodIndex - 1] : null;

  const [officialPrice, setOfficialPrice] = useState(0);
  const [distance, setDistance] = useState(500);
  const [stageSelection, setStageSelection] = useState(
    stageValueMap[currentStage] || 3
  );

  useEffect(() => {
    if (selectedPeriod && selectedPeriod.avg_price) {
      setOfficialPrice(Math.round(selectedPeriod.avg_price * 0.65));
    } else {
      setOfficialPrice(0);
    }
  }, [selectedPeriod]);
  
  useEffect(() => {
    setStageSelection(stageValueMap[currentStage] || 3)
  }, [currentStage]);


  const trendStats = useMemo(() => {
    const start = Math.max(sortedStats.length - 8, 0);
    return sortedStats.slice(start);
  }, [sortedStats]);

  const maxTrendPrice = useMemo(() => {
    return trendStats.reduce(
      (max, stat) => Math.max(max, stat.avg_price || 0),
      0
    );
  }, [trendStats]);

  const priceChange =
    prevPeriod && selectedPeriod && prevPeriod.avg_price > 0
      ? ((selectedPeriod.avg_price - prevPeriod.avg_price) /
          prevPeriod.avg_price) *
        100
      : null;

  const predictedPrice = useMemo(() => {
    if (!selectedPeriod) return 0;
    const baseAvg = selectedPeriod.avg_price;
    const weights = { w1: 0.32, w2: 0.45, w3: 0.15, w4: 0.08, bias: 50000000 };
    const normalizedStage = Math.min(stageSelection, 7) / 7;
    const normalizedDistance =
      (2000 - Math.min(distance, 2000)) / 2000;
    const stageContribution = normalizedStage * baseAvg * weights.w3;
    const accessContribution = normalizedDistance * baseAvg * weights.w4;
    return Math.round(
      weights.w1 * officialPrice +
        weights.w2 * baseAvg +
        stageContribution +
        accessContribution +
        weights.bias
    );
  }, [selectedPeriod, officialPrice, stageSelection, distance]);

  // --- 주택담보대출 계산기 상태 ---
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(4.5);
  const [loanTerm, setLoanTerm] = useState(30);

  // 선택된 기간이 바뀌면 대출 원금 기본값 설정 (실거래가의 70%)
  useEffect(() => {
    if (selectedRegion?.type === 'complex' && selectedPeriod?.avg_price) {
      setLoanAmount(Math.round(selectedPeriod.avg_price * 0.7));
    }
  }, [selectedRegion, selectedPeriod]);

  // 월 상환액 계산 로직
  const { monthlyPayment, totalInterest } = useMemo(() => {
    if (loanAmount <= 0 || interestRate <= 0 || loanTerm <= 0) {
      return { monthlyPayment: 0, totalInterest: 0 };
    }
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    if (monthlyRate === 0) {
        return { monthlyPayment: Math.round(loanAmount / numberOfPayments), totalInterest: 0 };
    }

    const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
    
    if (denominator === 0) {
      return { monthlyPayment: 0, totalInterest: 0 };
    }
    
    const monthly = Math.round(loanAmount * (numerator / denominator));
    const totalPaid = monthly * numberOfPayments;
    const interest = totalPaid - loanAmount;

    return { monthlyPayment: monthly, totalInterest: interest };
  }, [loanAmount, interestRate, loanTerm]);

  const formatCurrency = (value) =>
    value || value === 0 ? `${value.toLocaleString()}원` : "데이터 없음";

  if (!selectedRegion) {
    return (
      <div className="detail-page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <h1>사업 분석</h1>
        <p>자세한 정보를 보려면 지도에서 관심 구역을 선택해 주세요.</p>
        <Link to="/process" style={{display: 'block', marginTop: '20px', fontSize: '16px', color: '#2268a0'}}>
            ← 지도 보기로
        </Link>
      </div>
    );
  }

  return (
    <div className="detail-page-container">
      <h1>{displayRegionName}</h1>

      {(selectedRegion.type === 'zone' || selectedRegion.type === 'redevelopment') && (
        <div className="section">
          <h2>정비사업 진행 단계</h2>
          <p style={{marginBottom: '10px', color: '#555'}}>현재 '{currentStage}' 단계 진행 중입니다.</p>
          <div className="progress-container">
            <div className="progress-bar" style={{width: `${progressPercentage}%`}}>
              {progressPercentage > 0 ? `${progressPercentage}%` : ''}
            </div>
          </div>
          <p style={{marginTop: '15px', color: '#333', fontWeight: 'bold'}}>
            {stageDescriptions[currentStage] || '현재 단계에 대한 설명이 없습니다.'}
          </p>
          <div className="flowchart" style={{marginTop: '30px'}}>
            {allStages.map((stage, index) => (
              <React.Fragment key={stage}>
                <div className={`step-node ${stage === currentStage ? "current" : ""}`}>
                  {stage}
                </div>
                {index < allStages.length - 1 && (
                  <div className="step-arrow">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>재무 분석 시뮬레이션</h2>
        <div className="simulation-controls">
          <div className="period-label">
            <span>실제 거래 데이터를 기간별로 확인해 보세요.</span>
            {selectedPeriod && (
              <strong>{formatPeriod(selectedPeriod)}</strong>
            )}
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(sortedStats.length - 1, 0)}
            value={selectedPeriodIndex}
            onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
            disabled={sortedStats.length === 0}
          />
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
            월평균 실거래가, 면적당 단가, 거래량을 실제 CSV 데이터에서
            불러와 반영했습니다.
          </p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <p>평균 실거래가</p>
            <strong>{formatCurrency(selectedPeriod?.avg_price)}</strong>
            {priceChange !== null && (
              <span className={priceChange >= 0 ? "pos" : "neg"}>
                {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange).toFixed(1)}
                %
              </span>
            )}
          </div>
          <div className="stat-card">
            <p>중위 실거래가</p>
            <strong>{formatCurrency(selectedPeriod?.median_price)}</strong>
            <span>거래 수 {selectedPeriod?.deal_count || 0}건</span>
          </div>
          <div className="stat-card">
            <p>평균 ㎡당 단가</p>
            <strong>
              {selectedPeriod?.avg_price_per_m2
                ? `${Math.round(selectedPeriod.avg_price_per_m2).toLocaleString()}원`
                : "데이터 없음"}
            </strong>
            <span>HS: {displayRegionName}</span>
          </div>
        </div>
        <div className="trend-chart">
          {trendStats.map((stat) => {
            const height = maxTrendPrice && stat.avg_price
              ? (stat.avg_price / maxTrendPrice) * 100
              : 0;
            return (
              <div
                key={`${stat.year}-${stat.month}`}
                className="trend-bar"
                title={`${formatPeriod(stat)} 평균 ${stat.avg_price?.toLocaleString() || 0}원`}
              >
                <div
                  className="trend-bar-fill"
                  style={{ height: `${height}%` }}
                />
                <span>{`${stat.month}월`}</span>
              </div>
            );
          })}
        </div>
        
        {/* 'zone' 또는 'redevelopment' 타입일 때만 예측 계산기 표시 */}
        {(selectedRegion.type === 'zone' || selectedRegion.type === 'redevelopment') && (
          <div className="calc-section">
            <div>
              <h3>Y_hat 예측 계산</h3>
              <p className="calc-desc">
                엑셀 모델 구조(W1~W4)에 맞춰 공시지가, 주변 시세(X2), 정비
                단계(X3), 접근성(X4)을 반영해 완공 후 예상 가격을 계산합니다.
              </p>
            </div>
            <div className="calc-grid">
              <label>
                X1 공시지가 (₩)
                <input
                  type="number"
                  value={officialPrice}
                  min={0}
                  step={50000000}
                  onChange={(e) => setOfficialPrice(Number(e.target.value))}
                />
              </label>
              <label>
                X4 지하철 거리 (m)
                <input
                  type="number"
                  value={distance}
                  min={50}
                  step={50}
                  onChange={(e) => setDistance(Number(e.target.value))}
                />
              </label>
              <label>
                X3 정비 단계
                <select
                  value={stageSelection}
                  onChange={(e) => setStageSelection(Number(e.target.value))}
                >
                  {allStages.map((stage) => (
                    <option key={stage} value={stageValueMap[stage]}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="calc-result">
              <p>예상 Y_hat(완공 후 실거래가)</p>
              <strong>{formatCurrency(predictedPrice)}</strong>
              <span>
                X2(주변 시세)는 {formatPeriod(selectedPeriod)} 평균값을 사용했습니다.
              </span>
            </div>
          </div>
        )}

        {/* 아파트 단지용 주택담보대출 계산기 */}
        {(selectedRegion.type === 'complex') && (
          <div className="calc-section">
            <div>
              <h3>주택담보대출 월 상환액 계산기</h3>
              <p className="calc-desc">
                대출 금리와 상환 기간에 따른 월 상환액을 계산하여 자금 계획을 세워보세요.
              </p>
            </div>
            <div className="calc-grid">
              <label>
                대출 원금 (원)
                <input
                  type="number"
                  value={loanAmount}
                  step={10000000}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                />
              </label>
              <label>
                대출 금리 (%) - {interestRate.toFixed(1)}%
                <input
                  type="range"
                  min="2.5"
                  max="7.0"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                />
              </label>
              <label>
                상환 기간 (년)
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                >
                  <option value={10}>10년</option>
                  <option value={15}>15년</option>
                  <option value={20}>20년</option>
                  <option value={30}>30년</option>
                  <option value={40}>40년</option>
                </select>
              </label>
            </div>
            <div className="calc-result">
              <p>예상 월 상환액</p>
              <strong>{formatCurrency(monthlyPayment)}</strong>
              <span>총 이자: {formatCurrency(totalInterest)}</span>
            </div>
          </div>
        )}
      </div>

      <Link to="/process" style={{display: 'block', textAlign: 'center', marginTop: '40px', fontSize: '16px', color: '#2268a0'}}>
        ← 지도 보기로
      </Link>
    </div>
  );
}

export default ProjectDetailPage;