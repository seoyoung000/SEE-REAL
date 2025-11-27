import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import hannamInfo from "../data/basic_info.json"; // 임시로 한남 데이터 사용
import "./ProjectDetailPage.css";

// 모든 진행 단계를 순서대로 정의 (사용자 요청에 '수립 - 착립' -> '수립' 및 '착공'으로 수정)
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

// 진행률 계산 (임시 로직)
const getProgress = (currentStage) => {
  const currentIndex = allStages.indexOf(currentStage);
  if (currentIndex === -1) return 0;
  return Math.round(((currentIndex + 1) / allStages.length) * 100);
};

// finance_sim.csv 데이터 (하드코딩)
const financeData = [
    { rate: 3.0, contrib: 180, profitRate: 5.2 },
    { rate: 3.5, contrib: 170, profitRate: 4.8 },
    { rate: 4.0, contrib: 160, profitRate: 4.5 },
    { rate: 4.5, contrib: 150, profitRate: 4.2 },
    { rate: 5.0, contrib: 140, profitRate: 4.0 }
];

function ProjectDetailPage() {
  const { regionId } = useParams();
  const currentStage = hannamInfo.stage === '관리처분인가' ? '관리처분계획 수립' : hannamInfo.stage;
  const progressPercentage = getProgress(currentStage);

  const [interestRate, setInterestRate] = useState(4.0);

  const simulatedData = useMemo(() => {
    // 가장 가까운 금리 데이터를 찾아 근사값 사용
    const baseData = financeData.find(d => d.rate === interestRate) ||
                     financeData.reduce((prev, curr) => (Math.abs(curr.rate - interestRate) < Math.abs(prev.rate - interestRate) ? curr : prev));
    return {
        simulatedContrib: baseData ? baseData.contrib * 100000000 : 0, // 억 단위
        simulatedProfitRate: baseData ? baseData.profitRate : 0
    };
  }, [interestRate]);


  return (
    <div className="detail-page-container">
      <h1>{hannamInfo.note || regionId.replace(/_/g, " ")}</h1>

      {/* --- 상단 섹션: 플로우차트 및 진행률 --- */}
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

      {/* --- 하단 섹션: 재무 분석 그래프 --- */}
      <div className="section">
        <h2>재무 분석 시뮬레이션</h2>
        <div className="simulation-controls">
          <label htmlFor="interestRate">기준 금리 조정: {interestRate.toFixed(1)}%</label>
          <input
            type="range"
            id="interestRate"
            min="3.0"
            max="5.0"
            step="0.5"
            value={interestRate}
            onChange={(e) => setInterestRate(parseFloat(e.target.value))}
          />
          <p style={{marginTop: '10px', fontSize: '14px', color: '#666'}}>
            금리를 조정하여 예상 분담금과 수익률 변화를 시뮬레이션 해보세요.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="graph-placeholder">
                <p style={{ position: 'absolute', top: '20px', left: '20px', margin: 0, fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
                    예상 분담금
                </p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2268a0' }}>
                    {simulatedData.simulatedContrib ? `~ ${(simulatedData.simulatedContrib / 100000000).toFixed(1)}억원` : '데이터 없음'}
                </p>
            </div>
            <div className="graph-placeholder">
                 <p style={{ position: 'absolute', top: '20px', left: '20px', margin: 0, fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
                    예상 수익률
                </p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#E53E3E' }}>
                    {simulatedData.simulatedProfitRate ? `약 ${simulatedData.simulatedProfitRate.toFixed(1)}%` : '데이터 없음'}
                </p>
            </div>
        </div>
        <p style={{textAlign: 'center', marginTop: '10px', color: '#888'}}>
            * 실제 차트 라이브러리 연동 시 그래프로 시각화 가능합니다.
        </p>
      </div>

      <Link to="/" style={{display: 'block', textAlign: 'center', marginTop: '40px', fontSize: '16px', color: '#2268a0'}}>
        ← 지도로 돌아가기
      </Link>
    </div>
  );
}

export default ProjectDetailPage;
