import pandas as pd
import requests
import json
from pathlib import Path
import time
from dotenv import load_dotenv
import os

# --------------------------------------------------------
# 0) 환경 변수(.env) 불러오기
# --------------------------------------------------------
BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")

VWORLD_KEY = os.getenv("VWORLD_API_KEY")

if not VWORLD_KEY:
    raise Exception("❌ .env 파일에서 VWORLD_API_KEY 값을 읽지 못했습니다.")

# --------------------------------------------------------
# 1) 파일 경로 설정
# --------------------------------------------------------
CSV_PATH = BASE / "src/data/한남동 매매실거래가.csv"
OUT_PATH = BASE / "src/data/markers_with_stats.json"

# --------------------------------------------------------
# 2) vWorld 주소 검색 → 좌표 변환 함수
# --------------------------------------------------------
def search_address(query):
    """ 브이월드 주소검색 API (도로명 / 지번 검색 가능) """

    url = (
        "https://api.vworld.kr/req/search?"
        "service=search&request=search&version=2.0"
        f"&key={VWORLD_KEY}"
        "&query={}&type=address&category=road"
    ).format(query)

    res = requests.get(url).json()

    try:
        items = res["response"]["result"]["items"]
        if not items:
            return None
        return items[0]["address"]["road"] or items[0]["address"]["parcel"]
    except:
        return None


def geocode_address(address):
    """브이월드 주소 → 좌표 변환 (도로명 → 실패 시 지번)"""

    base = (
        "https://api.vworld.kr/req/address?"
        "service=address&request=getcoord&version=2.0"
        "&crs=EPSG:4326&refine=true&simple=true&format=json"
        f"&key={VWORLD_KEY}"
    )

    # 1차: 도로명 주소 시도
    url_road = base + f"&type=road&address={address}"
    res = requests.get(url_road).json()

    try:
        if res["response"]["status"] == "OK":
            point = res["response"]["result"]["point"]
            return {"lng": float(point["x"]), "lat": float(point["y"])}
    except:
        pass

    # 2차: 지번 주소 시도
    url_parcel = base + f"&type=parcel&address={address}"
    res = requests.get(url_parcel).json()

    try:
        if res["response"]["status"] == "OK":
            point = res["response"]["result"]["point"]
            return {"lng": float(point["x"]), "lat": float(point["y"])}
    except:
        pass

    # 둘 다 실패
    return None



# --------------------------------------------------------
# 3) 메인 처리
# --------------------------------------------------------
def main():
    df = pd.read_csv(CSV_PATH, encoding="utf-8")

    df["deal_date"] = pd.to_datetime(df["deal_date"])
    df["year"] = df["deal_date"].dt.year
    df["month"] = df["deal_date"].dt.month

    # 단지명 목록
    names = df["name"].unique()
    print(f"총 {len(names)}개 단지명 발견\n")

    result = {}

    for name in names:
        print(f"[단지 검색] {name}")

        # 1차 주소 검색 (단지명으로)
        v_query = f"용산구 한남동 {name}"
        addr = search_address(v_query)
        time.sleep(0.35)

        if not addr:
            print(f"   ⚠️ 주소 검색 실패 → 스킵 ({name})")
            continue

        print(f"   → 주소: {addr}")

        # 2차 지오코딩
        coord = geocode_address(addr)
        time.sleep(0.35)

        if not coord:
            print(f"   ⚠️ 좌표 변환 실패 → 스킵 ({name})")
            continue

        print(f"   → 좌표: {coord['lat']}, {coord['lng']}")

        # 3) 단지 실거래 통계
        target = df[df["name"] == name]

        stats = (
            target.groupby(["year", "month"])
            .agg(avg_price=("deal_price", "mean"))
            .reset_index()
            .sort_values(["year", "month"])
        )

        latest_avg = int(target["deal_price"].mean())

        result[name] = {
            "name": name,
            "address": addr,
            "lat": coord["lat"],
            "lng": coord["lng"],
            "latest_avg": latest_avg,
            "stats": stats.to_dict(orient="records"),
        }

    # 최종 JSON 저장
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("\n\n✅ 모든 단지 좌표 + 통계 JSON 생성 완료!")
    print(f"파일 위치: {OUT_PATH}")


if __name__ == "__main__":
    main()
