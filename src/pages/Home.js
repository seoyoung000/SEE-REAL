import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_ZONE_SLUG, getZoneName } from "../utils/zones";
import { ZONES } from "../data/zones";
import "./Home.css";

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
    zoneId: "hannam-3",
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
    zoneId: "hannam-2",
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

  const [selectedZoneSlug, setSelectedZoneSlug] = useState(ZONES[0].slug);
  const [latestPosts, setLatestPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const selectedZone = useMemo(
    () => ZONES.find((zone) => zone.slug === selectedZoneSlug) || ZONES[0],
    [selectedZoneSlug]
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

        setLatestPosts(
          parsed.length > 0 ? parsed.slice(0, 4) : SAMPLE_PREVIEW_POSTS.slice(0, 4)
        );
      } catch (error) {
        console.warn("홈 커뮤니티 미리보기를 불러오지 못했습니다.", error);
        if (!cancelled) {
          setLatestPosts(SAMPLE_PREVIEW_POSTS.slice(0, 4));
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
    navigate(`/community/${selectedZone.slug}`);
  };

  const primaryCta = () => {
    if (user) {
      navigate(`/community/${selectedZone.slug}`);
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
                {selectedZone.district} {selectedZone.name}
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
            {selectedZone.name} 커뮤니티 열기
          </button>
        </div>

        <div className="zone-layout">
          <div className="zone-map-card" aria-label="한남동 지도 요약">
            <div className="zone-map">
              {ZONES.map((zone) => (
                <button
                  key={zone.slug}
                  type="button"
                className={`zone-pin${
                    selectedZone.slug === zone.slug ? " active" : ""
                }`}
                  style={{ top: zone.position.top, left: zone.position.left }}
                  onClick={() => setSelectedZoneSlug(zone.slug)}
                >
                  <span>{zone.name}</span>
                </button>
              ))}
            </div>
            <div className="zone-chip-list">
              {ZONES.map((zone) => (
                <button
                  key={`${zone.slug}-chip`}
                  type="button"
                  className={`zone-chip${
                    selectedZone.slug === zone.slug ? " selected" : ""
                  }`}
                  onClick={() => setSelectedZoneSlug(zone.slug)}
                >
                  <span>{zone.district}</span>
                  <strong>{zone.name}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="zone-detail-card">
            <div className="zone-detail-header">
              <div>
                <p className="zone-detail-label">ZONE</p>
                <h3>
                  {selectedZone.name}
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
                  key={`${selectedZone.slug}-${item.label}`}
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
              <p>{selectedZone.name} 예상 수치</p>
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
            {selectedZone.name} 게시판 보기
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
                      {getZoneName(post.zoneId, post.zoneName || "전체")} ·{" "}
                      {timeLabel}
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

