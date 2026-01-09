# 2025 서울시립대 SEOUL:ution 해커톤 최우수상 & 유니콘상 작품
노후 주거환경 개선을 위한 중장년층 맞춤형 도시정비 정보 이해 플랫폼

---

## 서비스 소개

SEE:REAL은 서울 내 도시정비사업(재개발·재건축)의 **절차·단계·수익률·재무 변동**과 같은 복잡한 정보를  
누구나 쉽게 이해할 수 있도록 시각화한 **지도 기반 도시정비 정보 서비스**입니다.
 ![SEEREAL_page-0001](https://github.com/user-attachments/assets/881d4068-c20f-4f0d-9693-2493d9cd3718)

특히 중장년층(40~60대 이상)이

- 내가 사는 구역이 현재 어떤 단계인지  
- 앞으로 어떤 절차가 남았는지  
- 분담금·수익률이 어떻게 변화하는지  
- 변경 사항이 발생했는지  
- 어떤 의견 교류가 이루어지고 있는지  

한눈에 파악할 수 있도록 설계되었습니다.
![SEEREAL_page-0008](https://github.com/user-attachments/assets/0acb9074-7bde-4aa1-bdc6-d60ee806d18a)
![SEEREAL_page-0007](https://github.com/user-attachments/assets/a5fdd516-1c8c-46f0-b9b9-9aeee56a413c)
![SEEREAL_page-0006](https://github.com/user-attachments/assets/59544c0d-ee0a-4457-b09b-bee4095928a8)
![SEEREAL_page-0005](https://github.com/user-attachments/assets/da6ac7be-530c-4622-a9b3-a29c282ec2da)
![SEEREAL_page-0004](https://github.com/user-attachments/assets/07a5c56d-8a57-4957-ab58-aba7a6f4c297)

---

## 서비스 핵심 기능

### 1) **지도 기반 정비구역 탐색**
- 서울 전체 지도를 기반으로 정비구역 색상 표시
- 각 단계(추진위 승인 ~ 준공)를 색상으로 시각화
- 클릭 시 핵심 요약 정보 팝업
![SEEREAL_page-0010](https://github.com/user-attachments/assets/20303e55-0de6-430f-97cf-1c891ba7daee)

### 2) **정비사업 절차 시각화 (Flowchart)**
- 도시정비 절차를 플로우차트 형태로 단계별 안내
- 각 단계에 마우스 시 Hover 시 쉬운 설명 Tooltip 등장

### 3) **재무 분석 시계열 그래프**
- 분담금/수익률 등 주요 지표를 “슬라이더 기반”으로 실시간 변동 시각화
- 금리·평당가 등 변수를 조작해 결과를 즉시 확인
![SEEREAL_page-0011](https://github.com/user-attachments/assets/f6a52dd2-aeaf-4056-8b5d-51de66e1ba89)

### 4) **커뮤니티**
- 구역별 커뮤니티 공간 제공
- 질문, 정보공유, 후기 등 카테고리 운영
- 글쓰기/댓글은 로그인 회원만 가능
- Firestore에 조회수/작성일/댓글수 자동 저장
- ![SEEREAL_page-0012](https://github.com/user-attachments/assets/f97f9795-7a86-42be-8752-624308a2b13e)

### 5) **관심 구역 등록 + 변경 사항 알림**
- 사용자가 관심 등록한 구역의 단계 변경 시 알림 배지 표시
- 마이페이지에서 즐겨찾기 구역 목록 확인 가능

### 6) **회원 시스템 (Firebase Auth)**
- 이메일/비밀번호 회원가입
- 로그인한 사용자만 커뮤니티 참여 및 관심구역 관리 가능
- 추후 소셜 로그인(카카오/네이버) 확장 가능

---

## 팀원 및 역할 수행 내용

김소영(팀장/PM) : 전체 프로젝트의 목표 및 팀원 간의 조율. 시스템의 기술 스택, 인프라 구성, 데이터 흐름 등을 정의하는 기술 아키텍처 총괄
장서영(개발자) : 사업지구 위치 시각화(지도보기), 지도 기반 데이터(사업 분석) 등 담당 백엔드/프론트엔드 모듈 개발
서민경(개발자) : 사용자 접근 페이지(홈), 상호작용 기능(커뮤니티), 개인 맞춤형 설정/정보(개인 페이지), 푸시 알림 및 테스트 환경 설정 모듈 개발
손래진(DE) : 공공 데이터 포털, 부동산 실거래가, 사업 인허가 정보 등 정형/비정형 데이터를 크롤링하고 정제하여 데이터베이스에 통합하는 시스템 구축
우경탁(MLE) : 재개발/부동산 시장 변화, 투자 가치, 사업 성공률 등 예측하는 핵심 AI 모델 학습, 검증, 배포

## 기술 스택
- React.js (React Router)
- Firebase Authentication
- Firebase Firestore
- CSS Modules / Styled Components
- Python
- Kakao Map API

---
