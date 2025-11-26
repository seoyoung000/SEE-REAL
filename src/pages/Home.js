import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

const ZONES = [
  {
    id: "한남3구역",
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
    id: "한남하이츠",
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
    id: "한남2구역",
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
    id: "한남하이브",
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

const PROCESS_FLOW = [
  {
    label: "정비구역 지정",
    description: "주민 공람과 시의회 심의를 통과해야 지정이 확정됩니다.",
    duration: "6~12개월",
    tip: "법적 동의율 확보 여부 확인",
    status: "done",
  },
  {
    label: "조합 설립",
    description: "토지등소유자 75% 이상 동의 및 총회 의결이 필요합니다.",
    duration: "5~8개월",
    tip: "동의서 위조 여부 점검",
    status: "done",
  },
  {
    label: "사업시행인가",
    description: "건축 계획, 분양 계획 등을 담은 설계안 심사 단계입니다.",
    duration: "8~14개월",
    tip: "용적률·층수 제한 확인",
    status: "active",
  },
  {
    label: "관리처분인가",
    description: "평형 배정과 분담금이 확정되는 단계입니다.",
    duration: "4~6개월",
    tip: "평형 배정표 검토",
    status: "next",
  },
  {
    label: "이주/철거·준공",
    description: "이주, 착공, 준공, 입주까지의 전 과정입니다.",
    duration: "24~48개월",
    tip: "이주비 대출 일정 확인",
    status: "next",
  },
];

const SAMPLE_PREVIEW_POSTS = [
  {
    id: "sample-1",
    title: "한남3구역 이주 순번표와 대출 일정을 공유합니다",
    category: "정보공유",
    zoneId: "한남3구역",
    createdAtLabel: "예시",
    contentSummary:
      "관리처분 인가 이후 배포된 이주 순번표와 대출 실행 일정을 정리했습니다. 준비 서류도 함께 확인해 주세요.",
    author: "운영진",
    commentCount: 12,
    isSample: true,
  },
  {
    id: "sample-2",
    title: "한남2구역 사업시행인가 보완 의견서 요약",
    category: "공지",
    zoneId: "한남2구역",
    createdAtLabel: "예시",
    contentSummary:
      "서울시 심의 중 제기된 보완사항과 조합이 마련한 대응 방향을 요약했습니다. 의견 등록 전에 참고하세요.",
    author: "운영진",
    commentCount: 4,
    isSample: true,
  },
];

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const [latestPosts, setLatestPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const selectedZone = useMemo(
    () => ZONES.find((zone) => zone.id === selectedZoneId) || ZONES[0],
    [selectedZoneId]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      try {
        const postsQuery = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          limit(4)
        );
        const snapshot = await getDocs(postsQuery);
        if (cancelled) return;

        const parsed = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLatestPosts(parsed.length > 0 ? parsed : SAMPLE_PREVIEW_POSTS);
      } catch (error) {
        console.warn("홈 커뮤니티 미리보기를 불러오지 못했습니다.", error);
        if (!cancelled) {
          setLatestPosts(SAMPLE_PREVIEW_POSTS);
        }
      } finally {
        if (!cancelled) {
          setLoadingPosts(false);
        }
      }
    };

    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewZone = () => {
    navigate(`/community/${selectedZone.id}`);
  };

  const primaryCta = () => {
    if (user) {
      navigate(`/community/${selectedZone.id}`);
      return;
    }
    navigate("/signup");
  };

  return (
    <div className="home-shell">
      <section className="hero-section">
        <div>
          <p className="hero-label">한남동 정비구역 안내 서비스</p>
          <h1>
            한남동 구역별 정보를
            <br />
            한 곳에서 살펴보세요
          </h1>
          <p className="hero-description">
            한남1·2·3구역과 인근 소규모 정비 프로젝트의 단계, 분담금, 위험
            요소를 중장년층도 이해하기 쉽게 시각화했습니다. 커뮤니티에서
            이웃과 의견을 나누고, 실제 변화 소식을 빠르게 확인해 보세요.
          </p>
          <p className="demo-note">
            SEE:REAL은 모든 정비구역을 지원하며, 현재 데모에서는 한남동 사례를
            예시로 제공합니다.
          </p>

          <div className="hero-actions">
            <button type="button" className="primary-cta" onClick={primaryCta}>
              {user ? "내 구역 커뮤니티 바로가기" : "한 번에 가입하고 시작하기"}
            </button>
            <button
              type="button"
              className="secondary-cta"
              onClick={() => navigate("/help")}
            >
              서비스 설명서 보기
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>4개</strong>
              <span>한남동 주요 구역</span>
            </div>
            <div>
              <strong>7,800세대</strong>
              <span>예정 세대 수</span>
            </div>
            <div>
              <strong>312건</strong>
              <span>최근 한 달 커뮤니티 글</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-header">
            <span>관심 구역 바로 보기</span>
            <button type="button" onClick={handleViewZone}>
              커뮤니티 이동
            </button>
          </div>
          <div className="hero-panel-body">
            <div>
              <p className="panel-zone-name">
                {selectedZone.district} {selectedZone.id}
              </p>
              <p className="panel-zone-stage">{selectedZone.stageLabel}</p>
            </div>
            <div className="panel-progress">
              <div className="progress-track" aria-hidden="true">
                <span
                  className="progress-bar"
                  style={{ width: `${selectedZone.progress}%` }}
                />
              </div>
              <span className="progress-label">{selectedZone.progress}%</span>
            </div>
            <dl className="panel-metrics">
              <div>
                <dt>예상 완료</dt>
                <dd>{selectedZone.eta}</dd>
              </div>
              <div>
                <dt>관심 등록</dt>
                <dd>{selectedZone.interest.toLocaleString()}명</dd>
              </div>
              <div>
                <dt>주요 위험</dt>
                <dd>{selectedZone.risks.length}건</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="zone-section">
        <div className="section-heading">
          <div>
            <p className="section-label">지도 기반 구역 이해</p>
            <h2>관심 구역을 선택하고 단계와 이슈를 한눈에 확인하세요</h2>
          </div>
          <button type="button" onClick={handleViewZone}>
            {selectedZone.id} 커뮤니티 열기
          </button>
        </div>

        <div className="zone-layout">
          <div className="zone-map-card" aria-label="한남동 지도 요약">
            <div className="zone-map">
              {ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={`zone-pin${
                    selectedZone.id === zone.id ? " active" : ""
                  }`}
                  style={{ top: zone.position.top, left: zone.position.left }}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <span>{zone.id}</span>
                </button>
              ))}
            </div>
            <div className="zone-chip-list">
              {ZONES.map((zone) => (
                <button
                  key={`${zone.id}-chip`}
                  type="button"
                  className={`zone-chip${
                    selectedZone.id === zone.id ? " selected" : ""
                  }`}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <span>{zone.district}</span>
                  <strong>{zone.id}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="zone-detail-card">
            <div className="zone-detail-header">
              <div>
                <p className="zone-detail-label">ZONE</p>
                <h3>
                  {selectedZone.id}
                  <span>{selectedZone.district}</span>
                </h3>
              </div>
              <div className="zone-stage-pill">{selectedZone.stageLabel}</div>
            </div>

            <p className="zone-detail-summary">{selectedZone.summary}</p>

            <div className="zone-detail-metrics">
              <div>
                <strong>{selectedZone.households.toLocaleString()}세대</strong>
                <span>계획 세대 수</span>
              </div>
              <div>
                <strong>{selectedZone.owners.toLocaleString()}명</strong>
                <span>토지등소유자</span>
              </div>
              <div>
                <strong>{selectedZone.alerts}건</strong>
                <span>변경·위험 알림</span>
              </div>
            </div>

            <div className="zone-timeline">
              {selectedZone.timeline.map((item) => (
                <div
                  key={`${selectedZone.id}-${item.label}`}
                  className={`timeline-card ${item.status}`}
                >
                  <p className="timeline-label">{item.label}</p>
                  <p className="timeline-date">{item.date}</p>
                </div>
              ))}
            </div>

            <div className="zone-risk-list">
              {selectedZone.risks.map((risk) => (
                <div key={risk.label}>
                  <p>{risk.label}</p>
                  <strong>{risk.detail}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flow-section">
        <div className="section-heading">
          <div>
            <p className="section-label">절차 흐름</p>
            <h2>중장년층도 이해하기 쉽게 절차를 단계별로 안내합니다</h2>
          </div>
          <Link to="/process">전체 절차 보기</Link>
        </div>

        <div className="flow-grid">
          {PROCESS_FLOW.map((flow, index) => (
            <div
              key={flow.label}
              className={`flow-card flow-${flow.status}`}
              aria-label={`${flow.label} 단계`}
            >
              <span className="flow-index">{index + 1}</span>
              <h3>{flow.label}</h3>
              <p>{flow.description}</p>
              <div className="flow-meta">
                <span>평균 {flow.duration}</span>
                <span>{flow.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="finance-section">
        <div className="section-heading">
          <div>
            <p className="section-label">분담금 · 수익률 보기</p>
            <h2>예상 분담금과 수익률 정보를 투명하게 제공합니다</h2>
          </div>
          <Link to="/calculator">정비사업 계산기</Link>
        </div>

        <div className="finance-grid">
          <div className="finance-card">
            <header>
              <p>{selectedZone.id} 예상 수치</p>
              <span>실제 계약 시 변동될 수 있습니다</span>
            </header>
            <div className="finance-values">
              <div>
                <strong>{selectedZone.finance.contribution}</strong>
                <span>평균 조합원 분담금</span>
              </div>
              <div>
                <strong>{selectedZone.finance.roi}</strong>
                <span>예상 수익률</span>
              </div>
              <div>
                <strong>{selectedZone.finance.payback}</strong>
                <span>분담금 정산 완료</span>
              </div>
              <div>
                <strong>{selectedZone.finance.dividend}</strong>
                <span>배당/정산 예상</span>
              </div>
            </div>
          </div>

          <div className="finance-card">
            <header>
              <p>분담금 구성</p>
              <span>최근 공사비 기준</span>
            </header>
            <div className="finance-breakdown">
              {selectedZone.financeBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="breakdown-top">
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="breakdown-track">
                    <span
                      className="breakdown-bar"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="finance-card finance-alert">
            <header>
              <p>유의 사항</p>
              <span>조합 공지 기반</span>
            </header>
            <ul>
              {selectedZone.risks.map((risk) => (
                <li key={`risk-${risk.label}`}>
                  <strong>{risk.label}</strong>
                  <p>{risk.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="community-section">
        <div className="section-heading">
          <div>
            <p className="section-label">커뮤니티 미리보기</p>
            <h2>실시간으로 올라오는 주민 의견과 질문</h2>
          </div>
          <button type="button" onClick={handleViewZone}>
            {selectedZone.id} 게시판 보기
          </button>
        </div>

        <div className="community-grid">
          {loadingPosts ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`community-skeleton-${index}`} className="community-card">
                <div className="skeleton badge" />
                <div className="skeleton title" />
                <div className="skeleton text" />
                <div className="skeleton text short" />
              </div>
            ))
          ) : latestPosts.length === 0 ? (
            <div className="community-empty">
              아직 게시글이 없습니다. 첫 글을 작성해 주세요.
            </div>
          ) : (
            latestPosts.map((post) => {
              const timeLabel = post.createdAt?.toDate
                ? post.createdAt.toDate().toLocaleDateString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                  })
                : post.createdAtLabel || "최근";
              const snippet =
                post.contentSummary ||
                (typeof post.content === "string"
                  ? `${post.content.slice(0, 90)}${
                      post.content.length > 90 ? "..." : ""
                    }`
                  : "");

              const postBody = (
                <>
                  <span className="community-chip">
                    {post.category || "커뮤니티"}
                  </span>
                  <h3>{post.title}</h3>
                  <p className="community-snippet">{snippet}</p>
                  <div className="community-meta">
                    <span>
                      {post.zoneId || "전체"} · {timeLabel}
                    </span>
                    <span>댓글 {post.commentCount || 0}</span>
                  </div>
                </>
              );

              if (post.isSample) {
                return (
                  <div key={post.id} className="community-card sample">
                    {postBody}
                    <span className="sample-badge">예시 데이터</span>
                  </div>
                );
              }

              return (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="community-card"
                >
                  {postBody}
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="member-section">
        <div className="section-heading">
          <div>
            <p className="section-label">회원 기능</p>
            <h2>알림, 관심 구역, 마이페이지까지 한 번에</h2>
          </div>
          {user ? (
            <button type="button" onClick={() => navigate("/dashboard")}>
              맞춤 대시보드 이동
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/login")}>
              로그인하기
            </button>
          )}
        </div>

        <div className="member-grid">
          <article>
            <h3>관심 구역 등록</h3>
            <p>
              거주지와 연계된 구역을 등록하면 단계가 바뀔 때마다 알림 배지가
              표시됩니다.
            </p>
            <ul>
              <li>최대 5개 구역 저장</li>
              <li>단계 변경 문자 알림(옵션)</li>
              <li>예상 분담금 비교표 제공</li>
            </ul>
          </article>
          <article>
            <h3>커뮤니티 활동</h3>
            <p>
              구역별 게시판에서 질문·정보공유·후기를 나누고 필요한 자료를
              찾아보세요.
            </p>
            <ul>
              <li>글/댓글 작성 및 북마크</li>
              <li>카테고리별 필터와 검색</li>
              <li>운영진 실시간 공지</li>
            </ul>
          </article>
          <article>
            <h3>마이페이지</h3>
            <p>
              구역별 진행률, 알림 내역, 내가 남긴 의견을 한 화면에서 관리할 수
              있습니다.
            </p>
            <ul>
              <li>단계 변화 히스토리</li>
              <li>알림 읽음 처리</li>
              <li>문의/답변 현황</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

export default Home;
