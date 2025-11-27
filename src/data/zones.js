export const ZONES = [
  {
    slug: "hannam-3",
    name: "한남3구역",
    district: "용산구 한남동",
    stage: "관리처분인가",
    stageLabel: "관리처분 인가 완료",
    progress: 88,
    eta: "2026년 2월",
    summary:
      "한남뉴타운 핵심 구역으로, 한강 조망과 남산 접근성을 갖추고 있어 가장 관심이 집중되는 구역입니다.",
    households: 5816,
    owners: 2112,
    alerts: 2,
    interest: 930,
    position: { top: "22%", left: "62%" },
    finance: {
      contribution: "평균 2.3억",
      roi: "20~24%",
      dividend: "입주 후 6개월 예상",
      payback: "2028년 1분기",
    },
    financeBreakdown: [
      { label: "조합원 분담금", value: 48 },
      { label: "공사비", value: 37 },
      { label: "운영·기타", value: 15 },
    ],
    timeline: [
      { label: "정비구역 지정", date: "2017.09", status: "done" },
      { label: "조합 설립", date: "2018.12", status: "done" },
      { label: "사업시행인가", date: "2021.04", status: "done" },
      { label: "관리처분인가", date: "2024.01", status: "active" },
      { label: "이주·철거", date: "2025~2026", status: "next" },
    ],
    risks: [
      {
        label: "분담금 변동",
        detail: "시공단가 협의가 끝나지 않아 ±4% 조정 가능성이 공지되었습니다.",
      },
      {
        label: "교통대책",
        detail: "한남대로 교통 분산안이 서울시에 재검토 요청된 상태입니다.",
      },
    ],
  },
  {
    slug: "hannam-heights",
    name: "한남하이츠",
    district: "용산구 한남동",
    stage: "이주/철거",
    stageLabel: "순차 이주·철거 진행",
    progress: 72,
    eta: "2025년 4월",
    summary:
      "소규모 단지이지만 한남뉴타운 진입부를 차지하는 위치로, 현재 이주와 철거가 본격화되었습니다.",
    households: 535,
    owners: 228,
    alerts: 1,
    interest: 284,
    position: { top: "30%", left: "55%" },
    finance: {
      contribution: "평균 1.9억",
      roi: "17~21%",
      dividend: "입주 후 4개월 예상",
      payback: "2027년 3분기",
    },
    financeBreakdown: [
      { label: "조합원 분담금", value: 51 },
      { label: "공사비", value: 33 },
      { label: "운영·기타", value: 16 },
    ],
    timeline: [
      { label: "정비구역 지정", date: "2018.02", status: "done" },
      { label: "조합 설립", date: "2019.07", status: "done" },
      { label: "사업시행인가", date: "2021.12", status: "done" },
      { label: "관리처분인가", date: "2023.05", status: "done" },
      { label: "이주/철거", date: "진행중", status: "active" },
    ],
    risks: [
      {
        label: "이주 일정",
        detail: "고령 세대 대상 대체 거처 확보가 지연되어 순차 일정이 조정 중입니다.",
      },
    ],
  },
  {
    slug: "hannam-2",
    name: "한남2구역",
    district: "용산구 한남동",
    stage: "사업시행인가",
    stageLabel: "사업시행인가 심의",
    progress: 61,
    eta: "2026년 7월",
    summary:
      "한남초등학교를 중심으로 한 저층 주거지로, 용적률 상향 요구가 많아 설계 조정이 이어지고 있습니다.",
    households: 1870,
    owners: 742,
    alerts: 3,
    interest: 512,
    position: { top: "16%", left: "55%" },
    finance: {
      contribution: "평균 1.6억",
      roi: "16~20%",
      dividend: "입주 후 5개월 예상",
      payback: "2028년 4분기",
    },
    financeBreakdown: [
      { label: "조합원 분담금", value: 53 },
      { label: "공사비", value: 32 },
      { label: "운영·기타", value: 15 },
    ],
    timeline: [
      { label: "정비구역 지정", date: "2019.06", status: "done" },
      { label: "추진위 승인", date: "2020.10", status: "done" },
      { label: "조합 설립", date: "2022.05", status: "done" },
      { label: "사업시행인가", date: "2024.10 목표", status: "active" },
      { label: "관리처분인가", date: "2025.12 목표", status: "next" },
    ],
    risks: [
      {
        label: "용적률 심사",
        detail: "남산 경관 영향 검토로 인해 설계 일부가 재심의 중입니다.",
      },
      {
        label: "상가 협의",
        detail: "한남대로 가로수길 상가 보상 방식에 대한 이견이 남아 있습니다.",
      },
    ],
  },
  {
    slug: "hannam-hive",
    name: "한남하이브",
    district: "용산구 한남동",
    stage: "계획 수립",
    stageLabel: "정비구역 지정 준비",
    progress: 34,
    eta: "2028년 1월",
    summary:
      "유엔빌리지 인근 노후 다세대 밀집지를 묶어 공동개발을 추진 중인 협력 구역입니다.",
    households: 620,
    owners: 312,
    alerts: 0,
    interest: 198,
    position: { top: "28%", left: "70%" },
    finance: {
      contribution: "예상 1.2억",
      roi: "14~18%",
      dividend: "입주 후 6개월 예상",
      payback: "2029년 3분기",
    },
    financeBreakdown: [
      { label: "조합원 분담금", value: 50 },
      { label: "공사비", value: 35 },
      { label: "운영·기타", value: 15 },
    ],
    timeline: [
      { label: "사전 타당성", date: "2023.08", status: "done" },
      { label: "정비계획안 작성", date: "2024.12 진행", status: "active" },
      { label: "정비구역 지정", date: "2025.3분기 목표", status: "next" },
      { label: "조합 설립", date: "2026.상반기 목표", status: "next" },
      { label: "사업시행인가", date: "2027.하반기 목표", status: "next" },
    ],
    risks: [
      {
        label: "지구 지정",
        detail: "정비구역 지정 전 주민 동의율 확보가 필요합니다.",
      },
      {
        label: "경관 심의",
        detail: "유엔빌리지 인근 조망권 이슈로 층수 제한 가능성이 있습니다.",
      },
    ],
  },
];

export const ZONE_LOOKUP = ZONES.reduce((acc, zone) => {
  acc[zone.slug] = zone;
  return acc;
}, {});
