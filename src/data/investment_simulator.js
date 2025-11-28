/* ============================================================
   Trend-based Real Estate Investment Simulator
   (Converted from Python version)
   ============================================================ */

// === 1) Trend Line Parameters (from Python) ===
export const A_TREND = -8921466824.79265;     // a: trend intercept
export const B_TREND = 4428069.015434044;     // b: trend slope


// === 2) Trend-based Investment Simulator Function ===
/*
  Params:
    year_now: 현재 연도 (ex: 2024)
    current_trade: 현재 매매가 Y_now (KRW)
    invest_K: 투자금 K (KRW)
    future_year: 예측할 연도 (ex: 2030)
*/
export function simulateInvestmentTrend({ year_now, current_trade, invest_K, future_year }) {
  
  if (future_year <= year_now) {
    return { error: "Future year must be greater than current year." };
  }

  // 1) 현재 연도와 미래 연도에서의 시장 평균 가격(추세선)
  const line_now = A_TREND + B_TREND * year_now;
  const line_future = A_TREND + B_TREND * future_year;

  if (line_now <= 0) {
    return { error: "Trend line at current year is non-positive. Cannot compute growth ratio." };
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