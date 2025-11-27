import pandas as pd
import requests
import json
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
CSV_PATH = BASE / "src/data/한남동 매매실거래가.csv"
OUT_PATH = BASE / "src/data/markers_with_stats.json"

# ----------------------------
# 1) VWorld API 키 불러오기
# ----------------------------
VWORLD_KEY = ""
env_path = BASE / ".env"

if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("VWORLD_API_KEY="):
                parts = line.split("=", 1)
                if len(parts) > 1:
                    VWORLD_KEY = parts[1].strip().replace('"', '').replace("'", "")

if not VWORLD_KEY:
    raise Exception("❌ VWorld API 키(.env)에서 값을 읽지 못했습니다.")

print(f"🔑 API Key 로드 완료: {VWORLD_KEY[:5]}... (길이: {len(VWORLD_KEY)})")


# ----------------------------
# 2) 정확한 도로명 주소 프리셋
# ----------------------------
# [수정] 검색이 잘 안되는 한성1, 태성1은 여기서 빼고 아래 name_mapping으로 처리합니다.
preset_addresses = {
    "한남더힐": "서울특별시 용산구 독서당로 111",
    "나인원한남": "서울특별시 용산구 한남대로 91",
    "한남동리첸시아": "서울특별시 용산구 한남대로 60",
    "한남아이파크애비뉴": "서울특별시 용산구 독서당로 85",
    "한남힐스테이트": "서울특별시 용산구 독서당로 39",
    "리버티하우스": "서울특별시 용산구 유엔빌리지길 80-38",
    "현대하이페리온": "서울특별시 용산구 장문로 13",
    "르가든더메인한남": "서울특별시 용산구 한남대로10길 16",
    "아일랜드캐슬": "서울특별시 용산구 유엔빌리지길 252",
    "리버탑": "서울특별시 용산구 독서당로 14",
    "한남시범": "서울특별시 용산구 독서당로 27",
    "한남동동원베네스트": "서울특별시 용산구 독서당로 67",
    "대림아르빌": "서울특별시 용산구 독서당로 108",
    "한남해피트리": "서울특별시 용산구 독서당로 20",
    "대성이태리하우스": "서울특별시 용산구 대사관로34길 72",
    "시범": "서울특별시 용산구 독서당로 27",
    "성아1": "서울특별시 용산구 대사관로34길 26", 
}

# ----------------------------
# [NEW] 검색용 이름 매핑 (데이터이름 -> 실제건물명)
# ----------------------------
# "1"이 붙은 데이터 이름을 실제 건물 이름으로 변환해줍니다.
name_mapping = {
    "한성1": "한성아파트",
    "태성1": "태성빌라",
    "성아1": "성아맨션" 
}

# ----------------------------
# 3) VWorld 주소/좌표 검색 함수
# ----------------------------
def vworld_geocode(query, search_type="address"):
    url = "https://api.vworld.kr/req/search"
    
    params = {
        "service": "search",
        "request": "search",
        "version": "2.0",
        "query": query,
        "type": search_type,
        "format": "json",
        "errorformat": "json",
        "key": VWORLD_KEY
    }

    if search_type == "address":
        params["category"] = "road"

    try:
        res = requests.get(url, params=params, timeout=5).json()
        
        if "response" not in res: return None
        response = res["response"]
        if response.get("status") != "OK": return None
        if not response.get("result") or not response["result"]["items"]: return None

        item = response["result"]["items"][0]
        
        # 주소 파싱 로직
        raw_addr = item.get("address")
        final_addr = ""

        if isinstance(raw_addr, str):
            final_addr = raw_addr
        elif isinstance(raw_addr, dict):
            road_obj = raw_addr.get("road")
            if isinstance(road_obj, str): final_addr = road_obj
            elif isinstance(road_obj, dict): final_addr = road_obj.get("text", "")
            
            if not final_addr:
                parcel_obj = raw_addr.get("parcel")
                if isinstance(parcel_obj, str): final_addr = parcel_obj
                elif isinstance(parcel_obj, dict): final_addr = parcel_obj.get("text", "")

        if not final_addr: final_addr = str(raw_addr)

        return {
            "address": final_addr,
            "lat": float(item["point"]["y"]),
            "lng": float(item["point"]["x"]),
        }

    except Exception as e:
        print(f"      ❌ 파이썬 로직 에러: {e}")
        return None


# ----------------------------
# 4) 메인 실행 함수
# ----------------------------
def main():
    df = pd.read_csv(CSV_PATH, encoding="utf-8")
    
    df["deal_date"] = pd.to_datetime(df["deal_date"]) 
    df["year"] = df["deal_date"].dt.year
    df["month"] = df["deal_date"].dt.month

    names = df["name"].unique()
    print(f"총 {len(names)}개 단지명 발견\n")

    result = {}

    for name in names:
        print(f"[단지 처리] {name}")

        areas = sorted(df[df["name"] == name]["area_m2"].unique())
        latest_avg = int(df[df["name"] == name]["deal_price"].mean())
        
        deals = df[df["name"] == name][["deal_date", "deal_price", "area_m2", "floor"]]
        deal_records = []
        for _, row in deals.sort_values("deal_date").iterrows():
            deal_records.append({
                "date": row["deal_date"].strftime("%Y-%m-%d"),
                "price": int(row["deal_price"]),
                "area_m2": row["area_m2"],
                "floor": row["floor"]
            })

        stats = (
            df[df["name"] == name]
            .groupby(["year", "month"])
            .agg(avg_price=("deal_price", "mean"))
            .reset_index()
        )
        stats_records = stats.to_dict(orient="records")

        # ---------------------------------------------------
        # [핵심] 검색 로직 개선
        # ---------------------------------------------------
        geo = None
        
        # 0. 검색용 이름 결정 ("한성1" -> "한성아파트")
        search_name = name_mapping.get(name, name)

        # 1순위: 프리셋 주소 (category='road')
        if name in preset_addresses:
            target_addr = preset_addresses[name]
            print(f"      → 프리셋 주소 사용: {target_addr}")
            geo = vworld_geocode(target_addr, search_type="address")
        
        # 2순위: "한남동" + 실제이름 (type=place)
        # 예: "한남동 한성아파트" -> 이러면 무조건 서울 한남동에서 찾습니다.
        if not geo:
            query = f"한남동 {search_name}"
            print(f"      → '{query}' 검색 시도 (type=place)")
            geo = vworld_geocode(query, search_type="place")

        # 3순위: 실제이름만 검색
        if not geo:
            print(f"      → '{search_name}' 검색 시도 (type=place)")
            geo = vworld_geocode(search_name, search_type="place")

        if geo:
            print(f"        ✔ 좌표 획득: {geo['lat']}, {geo['lng']}")
            result[name] = {
                "address": geo["address"],
                "lat": geo["lat"],
                "lng": geo["lng"],
                "areas": areas,
                "latest_avg": latest_avg,
                "stats": stats_records,
                "deals": deal_records
            }
        else:
            print(f"  ⚠️ 최종 실패 (API 키 확인 필요)")
        
        time.sleep(0.2) 

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ markers_with_stats.json 생성 완료! ({len(result)}/{len(names)} 성공)")
    print(f"📁 파일 위치: {OUT_PATH}")

if __name__ == "__main__":
    main()