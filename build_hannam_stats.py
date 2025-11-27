# build_hannam_stats.py
import json
import pandas as pd
from pathlib import Path

# 1. 경로 설정
BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "src" / "data" / "한남동 매매실거래가.csv"
OUT_PATH = BASE_DIR / "src" / "data" / "hannam_stats.json"

def build_stats():
    df = pd.read_csv(CSV_PATH, encoding="utf-8")

    # deal_date를 날짜 타입으로 변환
    df["deal_date"] = pd.to_datetime(df["deal_date"])

    # year, month 컬럼 추가
    df["year"] = df["deal_date"].dt.year
    df["month"] = df["deal_date"].dt.month

    # 면적당 가격(원/㎡)
    df["price_per_m2"] = df["deal_price"] / df["area_m2"]

    # 연/월별로 묶어서 통계 계산
    grouped = (
        df.groupby(["year", "month"])
          .agg(
              avg_price=("deal_price", "mean"),
              median_price=("deal_price", "median"),
              avg_price_per_m2=("price_per_m2", "mean"),
              deal_count=("deal_price", "count"),
          )
          .reset_index()
          .sort_values(["year", "month"])
    )

    # 숫자 깔끔하게 반올림
    grouped["avg_price"] = grouped["avg_price"].round(0).astype(int)
    grouped["median_price"] = grouped["median_price"].round(0).astype(int)
    grouped["avg_price_per_m2"] = grouped["avg_price_per_m2"].round(0).astype(int)

    # JSON으로 저장
    records = grouped.to_dict(orient="records")
    OUT_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ 생성 완료: {OUT_PATH}")

if __name__ == "__main__":
    build_stats()
