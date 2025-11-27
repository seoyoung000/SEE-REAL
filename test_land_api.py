import requests
from pathlib import Path

BASE = Path(__file__).resolve().parent

# .env 파일에서 인증키 읽기
LAND_KEY = ""

env_path = BASE / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if "LAND_API_KEY" in line:    # 국토부 API 키라고 가정
                LAND_KEY = line.strip().split("=")[1]

if not LAND_KEY:
    print("❌ LAND_API_KEY를 .env에서 찾지 못함")
    print("➡ data.go.kr 국토부 실거래가 API 키가 설정되지 않았을 가능성 높음.")
    print("➡ 지금 키를 입력하면 테스트 가능: (엔터만 누르면 스킵)")
    LAND_KEY = input("국토부 API 인증키 입력: ").strip()

if not LAND_KEY:
    print("\n⚠️ 아무 키도 입력되지 않음 → 국토부 API 테스트 불가")
    print("➡ https://www.data.go.kr 에서 인증키를 발급해야 함.\n")
    exit()

print("\n🔎 국토부 API 키로 테스트 실행 중...\n")

# 테스트: 강남구 아파트 실거래조회
url = f"https://api.odcloud.kr/api/ApartmentTransactionService/v1/getAPTTTrade?serviceKey={LAND_KEY}&page=1&perPage=1"

try:
    res = requests.get(url).json()
    print("📡 API 응답:", res)

    if "error" in res or "result" in res and "error" in res["result"]:
        print("\n❌ API 호출 실패 → 키가 잘못되었거나 권한이 없음.")
    else:
        print("\n✅ 성공! → 이 키로 국토부 주소·좌표 자동 생성 가능함!")
except Exception as e:
    print("❌ 요청 중 오류:", e)
