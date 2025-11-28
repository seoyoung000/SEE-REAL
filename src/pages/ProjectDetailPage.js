import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import hannam3Data from "../data/hannam3_redevelopment_with_polygon.json";
import hannamStats from "../data/hannam_stats.json";

import { W, X_MEAN, X_STD, STAGE_COLS, A_TREND, B_TREND } from "../data/prediction_model_params.js";
import markersData from "../data/markers_with_stats.json";
import "./ProjectDetailPage.css";
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

/* ============================================================
   Trend-based Real Estate Investment Simulator
   (Converted from Python version)
   ============================================================ */
function simulateInvestmentTrend({ year_now, current_trade, invest_K, future_year }) {
  
  if (future_year <= year_now) {
    return { error: "미래 연도는 현재 연도보다 커야 합니다." };
  }

  // 1) 현재 연도와 미래 연도에서의 시장 평균 가격(추세선)
  const line_now = A_TREND + B_TREND * year_now;
  const line_future = A_TREND + B_TREND * future_year;

  if (line_now <= 0) {
    return { error: "현재 연도의 추세선 가격이 0 이하입니다. 성장률을 계산할 수 없습니다." };
  }
  const growth_ratio = line_future / line_now;

  const predicted_future_asset = current_trade * growth_ratio;

  const final_amount = invest_K * growth_ratio;
  const profit_amount = final_amount - invest_K;
  const profit_rate = (profit_amount / invest_K) * 100.0;

  return {
    year_now,
    future_year,
    line_now,
    line_future,
    growth_ratio,
    current_trade,
    predicted_future_asset,
    invest_K,
    final_amount,
    profit_amount,
    profit_rate
  };
}

// numpy.zeros(len(stage_cols), dtype=np.float64) 에 해당하는 JavaScript 배열 생성
const createZerosArray = (length) => new Array(length).fill(0.0);

// 정비단계 one-hot 인코딩 (Python encode_stage 함수 변환)
const encodeStage = (stageValue) => {
  const onehot = createZerosArray(STAGE_COLS.length);

  // stageValue가 숫자(index)인지, 혹은 stage name mapping값인지 확인
  // 기대: STAGE_COLS 예: ['stage_0.0','stage_1.0',...]
  const numeric = Number(stageValue);
  // format to one decimal like 'stage_1.0'
  if (!Number.isFinite(numeric)) return onehot;

  const label = `stage_${numeric.toFixed(1)}`;
  const stageIndex = STAGE_COLS.indexOf(label);
  if (stageIndex !== -1) onehot[stageIndex] = 1.0;
  return onehot;
};

// X 표준화 (Python X 표준화 로직 변환)
const normalizeX = (x_raw_array) => {
  const expected = X_MEAN.length;
  if (!Array.isArray(x_raw_array) || x_raw_array.length !== expected) {
    console.warn("normalizeX: 입력 feature 길이가 예상과 다릅니다.", x_raw_array.length, "expected:", expected);
    // 길이가 맞지 않으면 0으로 패딩하거나 자르기 — 여기선 0패딩
    const padded = [...x_raw_array];
    while (padded.length < expected) padded.push(0);
    return padded.slice(0, expected).map((val, i) => (val - X_MEAN[i]) / (X_STD[i] + 1e-8));
  }
  return x_raw_array.map((val, i) => (val - X_MEAN[i]) / (X_STD[i] + 1e-8));
};

// 특정 연도 가격 예측 (Python predict_price 함수 변환)
const predictPrice = (publicPrice, nearbyMarketPrice, redevelopmentStage, accessibility, year) => {
    const stageOnehot = encodeStage(redevelopmentStage);
    const xRaw = [publicPrice, nearbyMarketPrice, accessibility, year, ...stageOnehot];

    const xNorm = normalizeX(xRaw);
    
    // bias term (1.0) 추가
    const xb = [1.0, ...xNorm];

    let predictedValue = 0;
    for (let i = 0; i < W.length; i++) {
        predictedValue += xb[i] * W[i];
    }
    return predictedValue;
};

// 재개발/재건축 미래 가치 예측을 위한 새로운 함수
const REDEV_STAGE_MULTIPLIERS = {
  "추진위원회 구성": 1.0,
  "정비구역 지정": 1.1,
  "조합설립인가": 1.3,
  "사업시행인가": 1.5,
  "관리처분계획 수립": 1.7,
  "착공": 1.9,
  "준공": 2.2, // Significantly higher after completion
};

function predictRedevelopmentFutureValue({
  currentValue, // nearbyMarketPrice
  targetStageName,
  simulatedYear // New parameter
}) {
  if (!currentValue || currentValue <= 0) {
    return { error: "현재 가치는 0보다 커야 합니다." };
  }
  const stageNum = stageValueMap[targetStageName];
  if (stageNum === undefined) {
    return { error: "목표 단계가 유효하지 않습니다." };
  }

  // stageNum을 encodeStage가 기대하는 값으로 전달.
  // encodeStage는 stage_#.0 식 라벨을 찾아서 one-hot을 만듭니다.
  // (만약 STAGE_COLS가 0.0~6.0 등으로 구성되지 않았다면 STAGE_COLS를 조정하세요)
  const targetRedevelopmentStage = stageNum - 1; // 만약 STAGE_COLS가 0부터 시작이면 -1; 아니면 그대로 사용
  // -> **중요**: STAGE_COLS 정의(외부 파일)와 맞추세요.

  // 기본 파라미터들
  const publicPrice = Math.round(currentValue * 0.65);
  const accessibility = 500;
  const yearToUse = simulatedYear || new Date().getFullYear(); // Use simulatedYear if provided, otherwise default to current year

  const predictedValue = predictPrice(
    publicPrice,
    currentValue,
    targetRedevelopmentStage,
    accessibility,
    yearToUse // Use the new year parameter
  );

  if (!Number.isFinite(predictedValue)) {
    return { error: "예측 값 계산 중 오류가 발생했습니다." };
  }

  return { predictedValue };
}

// Function to generate data for Investment Simulation Chart
const generateInvestmentChartData = ({ year_now, current_trade, invest_K, start_future_year, num_years }) => {
  const labels = [];
  const profits = [];
  for (let i = 0; i < num_years; i++) {
    const future_year = start_future_year + i;
    labels.push(future_year.toString());
    const result = simulateInvestmentTrend({ year_now, current_trade, invest_K, future_year });
    profits.push(result.profit_amount || 0); // Use 0 if there's an error
  }
  return {
    labels,
    datasets: [
      {
        label: '예상 수익 금액',
        data: profits,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
    ],
  };
};

// Function to generate data for Redevelopment Future Value Prediction Chart
const generateRedevelopmentChartData = ({ currentValue, currentStageName, allStages, stageValueMap }) => {
  const labels = [];
  const predictedValues = [];
  let simulatedYear = new Date().getFullYear(); // Start year for simulation

  for (let i = 0; i < allStages.length; i++) {
    const targetStageName = allStages[i];
    labels.push(targetStageName);
    const result = predictRedevelopmentFutureValue({
      currentValue,
      targetStageName,
      simulatedYear: simulatedYear + i // Pass simulatedYear to the prediction function
    });
    predictedValues.push(result.predictedValue || 0); // Use 0 if there's an error
  }

  return {
    labels,
    datasets: [
      {
        label: '예상 미래 가치',
        data: predictedValues,
        borderColor: 'rgba(53, 162, 235, 1)', // Line color
        backgroundColor: 'rgba(53, 162, 235, 0.2)', // Area below the line color (optional)
        fill: false, // Don't fill the area below the line
        tension: 0.1, // Smoothness of the line
      },
    ],
  };
};







// Function to generate data for Asset Comparison Chart
const generateAssetComparisonChartData = (simulatorResult) => {
  if (!simulatorResult) {
    return { labels: [], datasets: [] };
  }

  const currentAssetValue = simulatorResult.current_trade; // 현재 자산 가치
  const currentTotalCapital = simulatorResult.current_trade + simulatorResult.invest_K; // 현재 총 투자 자본 (현재 자산 가치 + 투자금)
  const predictedTotalAssetValue = simulatorResult.predicted_future_asset + simulatorResult.final_amount; // 예상 총 자산 가치

  const assetIncrease = predictedTotalAssetValue - currentTotalCapital; // 자산 상승분
  const overallReturnRate = currentTotalCapital > 0 ? (assetIncrease / currentTotalCapital) * 100 : 0; // 수익률

  return {
    labels: ['자산 현황'], // 단일 라벨로 묶고 데이터셋으로 항목을 나눕니다.
    datasets: [
      {
        label: '현재 자산 가치',
        data: [currentAssetValue],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: '현재 총 투자 자본',
        data: [currentTotalCapital],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: '예상 총 자산 가치',
        data: [predictedTotalAssetValue],
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
    // 보조 수치도 함께 반환하여 컴포넌트에서 활용
    currentAssetValue,
    currentTotalCapital,
    predictedTotalAssetValue,
    assetIncrease,
    overallReturnRate
  };
};

const redevelopmentLineChartOptions = {
  responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: '시점별 예상 미래 가치',
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              const label = tooltipItem.dataset.label || '';
              const currentValue = tooltipItem.raw;
                          const data = tooltipItem.chart.data.datasets[tooltipItem.datasetIndex].data;
                          const index = tooltipItem.dataIndex;
              
                          let diffText = '';
                          if (index > 0) {
                            const previousValue = data[index - 1];
                            const difference = currentValue - previousValue;
                            const percentageChange = (difference / previousValue) * 100;
              
                            const sign = difference >= 0 ? '+' : '';
                            diffText = ` (${sign}${difference.toLocaleString()}원, ${sign}${percentageChange.toFixed(2)}%)`;
                          }
              
                          return `${label}: ${currentValue.toLocaleString()}원${diffText}`;            }
          }
        }
      },
  scales: {
    x: {
      title: {
        display: true,
        text: "진행 단계"
      }
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: "예상 가치 (원)"
      },
      ticks: {
        callback: function(value) {
          return value.toLocaleString() + "원";
        }
      }
    }
  }
};

const barChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: '총 자산 비교',
    },
  },
  scales: {
    x: {
      stacked: false, // 막대가 겹치지 않도록 설정
    },
    y: {
      stacked: false,
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          // Y축 레이블을 원화 단위로 표시
          return value.toLocaleString() + '원';
        }
      }
    }
  }
};

function ProjectDetailPage() {
  const { regionId } = useParams();
  console.log("ProjectDetailPage - regionId:", regionId); // Debugging line

  // 투자 시뮬레이터 상태
  const [simulatorYearNow, setSimulatorYearNow] = useState(new Date().getFullYear());
  const [simulatorCurrentTrade, setSimulatorCurrentTrade] = useState(100000000); // Default to 1억 원 for visibility
  const [simulatorInvestK, setSimulatorInvestK] = useState(100000000); // Default to 1억 원 for visibility
  const [simulatorFutureYear, setSimulatorFutureYear] = useState(new Date().getFullYear() + 5);
  const [simulatorResult, setSimulatorResult] = useState(null);
  const [simulatorError, setSimulatorError] = useState(null);

  const investmentChartData = useMemo(() => {
    if (!simulatorCurrentTrade || !simulatorInvestK) return { labels: [], datasets: [] };
    return generateInvestmentChartData({
      year_now: simulatorYearNow,
      current_trade: simulatorCurrentTrade,
      invest_K: simulatorInvestK,
      start_future_year: simulatorYearNow + 1,
      num_years: 10,
    });
  }, [simulatorYearNow, simulatorCurrentTrade, simulatorInvestK]);

  const assetComparisonChartData = useMemo(() => {
    if (!simulatorResult) return { labels: [], datasets: [] };
    return generateAssetComparisonChartData(simulatorResult);
  }, [simulatorResult]);

  // 재개발/재건축 사업 미래 가치 예측 상태
  const [redevCurrentValue, setRedevCurrentValue] = useState(500000000);
  const [redevTargetStage, setRedevTargetStage] = useState("준공"); // Default to completion

  const [redevPredictedValue, setRedevPredictedValue] = useState(null);
  const [redevError, setRedevError] = useState(null);





  const selectedRegion = useMemo(() => {
    if (!regionId) {
      return null;
    }
    
    // 한남 3구역은 별도 stats 파일(hannamStats)을 사용
    if (regionId === "11170-900000100") {
      const info = hannam3Data.features.find((zone) => zone["name"] === regionId);
      return info ? { info, stats: hannamStats, type: "redevelopment", id: info["name"] } : null;
    }

    // 다른 재개발 구역 검색 (별도 stats 없음)
    const redevelopmentZone = hannam3Data.features.find(
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

  const displayRegionName = selectedRegion
    ? selectedRegion.info.note || selectedRegion.info.name
    : "데이터 없음";

  const currentStage = selectedRegion?.info?.stage === "관리처분인가"
      ? "관리처분계획 수립"
      : selectedRegion?.info?.stage;

  const redevelopmentChartData = useMemo(() => {
    if (!redevCurrentValue || !currentStage) return { labels: [], datasets: [] };
    return generateRedevelopmentChartData({
      currentValue: redevCurrentValue,
      currentStageName: currentStage,
      allStages: allStages,
      stageValueMap: stageValueMap,
    });
  }, [redevCurrentValue, currentStage, allStages, stageValueMap]);
      
  const progressPercentage = getProgress(currentStage);

  const sortedStats = useMemo(() => {
    if (!selectedRegion?.stats) return [];
    return [...selectedRegion.stats].sort((a, b) => {
      // 우선 연도 비교, 그 다음 월 비교
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [selectedRegion]);





  // --- 주택담보대출 계산기 상태 ---
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(4.5);
  const [loanTerm, setLoanTerm] = useState(30);



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

  const handleSimulateInvestment = () => {
    const result = simulateInvestmentTrend({
      year_now: simulatorYearNow,
      current_trade: simulatorCurrentTrade,
      invest_K: simulatorInvestK,
      future_year: simulatorFutureYear,
    });
    if (result.error) {
      setSimulatorError(result.error);
      setSimulatorResult(null);
    } else {
      setSimulatorResult(result);
      setSimulatorError(null);
    }
  };

  useEffect(() => {
    handleSimulateInvestment();
  }, [simulatorYearNow, simulatorCurrentTrade, simulatorInvestK, simulatorFutureYear]);

  useEffect(() => {
    const result = predictRedevelopmentFutureValue({
      currentValue: redevCurrentValue,
      targetStageName: redevTargetStage,
    });

    if (result.error) {
      setRedevError(result.error);
      setRedevPredictedValue(null);
    } else {
      setRedevPredictedValue(result.predictedValue);
      setRedevError(null);
    }
  }, [redevCurrentValue, currentStage, redevTargetStage]);



  const formatCurrency = (value) =>
    value || value === 0 ? `${value.toLocaleString()}원` : "데이터 없음";

  if (!selectedRegion) {
    return (
      <div className="detail-page-container" style={{ textAlign: 'center', padding: '50px' }}>
        <h1>사업 분석</h1>
        <p>자세한 정보를 보려면 지도에서 관심 구역을 선택해 주세요.</p>
        <Link to="/process" style={{display: 'block', marginTop: '20px', fontSize: '16px', color: '#2268a0'}}>
            ← 절차 안내로
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
        <h2>분석 계산기</h2>
        <div className="calc-section">
            <div>
              <h3>투자 수익 시뮬레이션</h3>
              <p className="calc-desc">
                사용자 입력에 따라 미래 투자 수익을 예상해 봅니다.
              </p>
            </div>
            <div className="calc-grid">
              <label>
                현재 자산 가치 (₩)
                <input
                  type="number"
                  value={simulatorCurrentTrade}
                  min={0}
                  step={10000000}
                  onChange={(e) => setSimulatorCurrentTrade(Number(e.target.value))}
                />
              </label>
              <label>
                투자금 (₩)
                <input
                  type="number"
                  value={simulatorInvestK}
                  min={0}
                  step={10000000}
                  onChange={(e) => setSimulatorInvestK(Number(e.target.value))}
                />
              </label>
              <label>
                예측 희망 연도
                <input
                  type="number"
                  value={simulatorFutureYear}
                  min={new Date().getFullYear() + 1}
                  step={1}
                  onChange={(e) => setSimulatorFutureYear(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="calc-result">
              {simulatorError && <p className="error-message">{simulatorError}</p>}
              {simulatorResult && !simulatorError && (
                <>
                  <p>예상 수익 금액</p>
                  <strong>{formatCurrency(simulatorResult.profit_amount)}</strong>
                </>
              )}
            </div>



            {/* 새로운 자산 비교 막대 그래프 및 보조 수치 */}
            {simulatorResult && assetComparisonChartData.datasets.length > 0 && (
              <div className="additional-investment-analysis" style={{ marginTop: '20px' }}>
                <h3>총 자산 비교 및 분석</h3>
                <p>현재 자산 가치: <strong>{formatCurrency(assetComparisonChartData.currentAssetValue)}</strong></p>
                <p>현재 총 투자 자본: <strong>{formatCurrency(assetComparisonChartData.currentTotalCapital)}</strong></p>
                <p>예상 총 자산 가치: <strong>{formatCurrency(assetComparisonChartData.predictedTotalAssetValue)}</strong></p>
                <p>자산 상승분: <strong>{formatCurrency(assetComparisonChartData.assetIncrease)}</strong></p>
                <p>수익률: <strong>{assetComparisonChartData.overallReturnRate !== undefined ? `${assetComparisonChartData.overallReturnRate.toFixed(2)}%` : 'N/A'}</strong></p>
                <div className="chart-container" style={{ marginTop: '20px' }}>
                  <Bar data={assetComparisonChartData} options={barChartOptions} />
                </div>
              </div>
            )}
          </div>

        {/* 재개발/재건축 사업 미래 가치 예측 모델 */}
        {(selectedRegion.type === 'zone' || selectedRegion.type === 'redevelopment') && (
          <div className="calc-section">
            <div>
              <h3>재개발/재건축 사업 미래 가치 예측</h3>
              <p className="calc-desc">
                입력된 값을 바탕으로 학습된 예측 모델을 사용하여 목표 진행 단계에서의 미래 가치를 예측합니다.
              </p>
            </div>
            <div className="calc-grid">
              <label>
                현재 가치 (₩)
                <input
                  type="number"
                  value={redevCurrentValue}
                  min={0}
                  step={10000000}
                  onChange={(e) => setRedevCurrentValue(Number(e.target.value))}
                />
              </label>
              <label>
                목표 진행 단계
                <select
                  value={redevTargetStage}
                  onChange={(e) => setRedevTargetStage(e.target.value)}
                >
                  {allStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>

            </div>
            <div className="calc-result">
              {redevError && <p className="error-message">{redevError}</p>}
              {redevPredictedValue && !redevError && (
                <>
                  <p>예상 미래 가치</p>
                  <strong>{formatCurrency(redevPredictedValue)}</strong>
                  <span>(현재 "{currentStage}" 단계 기준)</span>
                </>
              )}
            </div>

            <div className="chart-container">
              {redevPredictedValue && <Line data={redevelopmentChartData} options={redevelopmentLineChartOptions} />}
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
        ← 지도로 돌아가기
      </Link>
    </div>
  );
}

export default ProjectDetailPage;