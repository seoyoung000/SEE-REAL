import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore"; // ⬅️ where 제거
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_ZONE_SLUG, getZoneName, ZONE_OPTIONS } from "../utils/zones";
import "./CommunityList.css";

const CATEGORY_TABS = ["전체", "공지", "정보공유", "질문", "후기"];
const ZONE_FILTER_TABS = [{ slug: "", name: "전체" }, ...ZONE_OPTIONS];

const PAGE_SIZE = 10;
const MAX_PAGE_BTNS = 5;

const getCacheKey = (filter) => `community-cache:${filter}`;

// 🔹 post 하나에서 구역 슬러그를 안전하게 가져오는 헬퍼
function getPostZoneSlug(post) {
  if (!post) return "";
  // 기본: zoneId
  if (post.zoneId) return post.zoneId;
  // 혹시 예전에 다른 이름으로 저장했을 수도 있으니 방어
  if (post.zoneSlug) return post.zoneSlug;
  if (post.zone) return post.zone;
  return "";
}

function CommunityList() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // URL → 내부 zoneFilter
  const resolvedZoneSlug = !zoneId || zoneId === "hannam" ? "" : zoneId;
  const [zoneFilter, setZoneFilter] = useState(resolvedZoneSlug);

  const zoneDisplayName = zoneFilter ? getZoneName(zoneFilter) : "한남동";
  const headingTitle = zoneFilter
    ? `${zoneDisplayName} 커뮤니티`
    : "한남동 커뮤니티";
  const mentionLabel = zoneFilter ? zoneDisplayName : "한남동";

  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [pendingMore, setPendingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAuthHint, setShowAuthHint] = useState(false);
  const [sortOrder, setSortOrder] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);

  const lastDocRef = useRef(null);

  // 🔹 Firestore에서 글 가져오기
  //   👉 구역 상관 없이 "한남동 전체 글"을 불러오고,
  //      구역 필터는 프론트에서 처리.
  const fetchPosts = useCallback(
    async (reset = false, skipSpinner = false) => {
      try {
        if (reset) {
          lastDocRef.current = null;
          setHasMore(true);
          if (!skipSpinner) setLoading(true);
        } else {
          setPendingMore(true);
        }

        const constraints = [];
        // ⬇️ 구역 where 절 제거: 모든 글을 가져오고 나중에 필터링
        constraints.push(orderBy("createdAt", "desc"));

        if (!reset && lastDocRef.current) {
          constraints.push(startAfter(lastDocRef.current));
        }

        constraints.push(limit(PAGE_SIZE));

        const postsQuery = query(collection(db, "posts"), ...constraints);
        const snapshot = await getDocs(postsQuery);

        if (snapshot.docs.length > 0) {
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        }

        const incoming = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPosts((prev) => {
          const next = reset ? incoming : [...prev, ...incoming];
          // 캐시는 zoneFilter와 무관하게 key만 다르게 유지
          sessionStorage.setItem(
            getCacheKey(zoneFilter || "ALL"),
            JSON.stringify({
              posts: next,
              cachedAt: Date.now(),
            })
          );
          return next;
        });

        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (error) {
        console.error("커뮤니티 글 불러오기에 실패했습니다.", error);
      } finally {
        setLoading(false);
        setPendingMore(false);
      }
    },
    [zoneFilter]
  );

  // 🔹 zoneFilter 변경 시: 캐시 + Firestore 로딩
  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    lastDocRef.current = null;

    const cacheKey = getCacheKey(zoneFilter || "ALL");
    const cached = sessionStorage.getItem(cacheKey);
    const hasCache = Boolean(cached);

    if (hasCache) {
      try {
        const parsed = JSON.parse(cached);
        setPosts(parsed.posts || []);
        setLoading(false);
      } catch (error) {
        sessionStorage.removeItem(cacheKey);
      }
    } else {
      setLoading(true);
    }

    fetchPosts(true, hasCache);
  }, [zoneFilter, fetchPosts]);

  // 🔹 URL → 내부 state 동기화
  useEffect(() => {
    setZoneFilter(resolvedZoneSlug);
    setCurrentPage(1);
  }, [resolvedZoneSlug]);

  // 🔹 작성 제한 안내 토스트
  useEffect(() => {
    if (!showAuthHint) return;
    const timer = setTimeout(() => setShowAuthHint(false), 3500);
    return () => clearTimeout(timer);
  }, [showAuthHint]);

  // 🔹 0단계: 동일 id 글 중복 제거 (같은 글이 2개씩 보이는 문제 방지)
  const uniquePosts = useMemo(() => {
    const map = new Map();
    posts.forEach((post) => {
      if (post && post.id) {
        map.set(post.id, post);
      }
    });
    return Array.from(map.values());
  }, [posts]);

  // 🔹 1단계: 카테고리 + 구역 필터
  const filteredPosts = useMemo(() => {
    return uniquePosts.filter((post) => {
      const postZoneSlug = getPostZoneSlug(post);

      const matchCategory =
        activeCategory === "전체" || post.category === activeCategory;
      const matchZone = !zoneFilter || postZoneSlug === zoneFilter;

      return matchCategory && matchZone;
    });
  }, [uniquePosts, activeCategory, zoneFilter]);

  // 🔹 2단계: 정렬 (최신 / 조회 / 댓글)
  const sortedPosts = useMemo(() => {
    const list = [...filteredPosts];
    list.sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate().getTime()
        : 0;
      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate().getTime()
        : 0;

      if (sortOrder === "views") {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortOrder === "comments") {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return dateB - dateA; // 기본: 최신순
    });
    return list;
  }, [filteredPosts, sortOrder]);

  // 🔹 3단계: 페이징
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));

  const groupIndex = Math.floor((currentPage - 1) / MAX_PAGE_BTNS);
  const groupStart = groupIndex * MAX_PAGE_BTNS + 1;
  const groupEnd = Math.min(groupStart + MAX_PAGE_BTNS - 1, totalPages);
  const hasPrevGroup = groupStart > 1;
  const hasNextGroup = groupEnd < totalPages;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visiblePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedPosts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedPosts, currentPage]);

  // 🔹 필요한 경우 다음 Firestore 페이지 자동 로딩
  useEffect(() => {
    const required = currentPage * PAGE_SIZE;
    if (
      hasMore &&
      !pendingMore &&
      !loading &&
      uniquePosts.length < required
    ) {
      fetchPosts(false);
    }
  }, [currentPage, hasMore, pendingMore, loading, uniquePosts.length, fetchPosts]);

  // 🔹 지표 계산 (uniquePosts 기준)
  const {
    todayPostsCount,
    todayZoneUpdates,
    recentMentionCount,
  } = useMemo(() => {
    const now = Date.now();
    const oneDay = 1000 * 60 * 60 * 24;
    const sevenDays = oneDay * 7;
    let todayCount = 0;
    const todayZones = new Set();
    let mentionCount = 0;

    uniquePosts.forEach((post) => {
      const createdAt =
        post.createdAt?.toDate && post.createdAt.toDate().getTime();
      if (!createdAt) return;

      const postZoneSlug = getPostZoneSlug(post);
      if (now - createdAt < oneDay) {
        todayCount += 1;
        todayZones.add(postZoneSlug || "기타");
      }

      if (now - createdAt < sevenDays) {
        if (!zoneFilter || postZoneSlug === zoneFilter) {
          mentionCount += 1;
        }
      }
    });

    return {
      todayPostsCount: todayCount,
      todayZoneUpdates: todayZones.size,
      recentMentionCount: mentionCount,
    };
  }, [uniquePosts, zoneFilter]);

  // 🔹 인기 구역 TOP3
  const topZones = useMemo(() => {
    if (!uniquePosts.length) return [];
    const frequencies = uniquePosts.reduce((acc, post) => {
      const slug = getPostZoneSlug(post) || "미지정";
      acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [uniquePosts]);

  // 🔹 작성 버튼 클릭 이벤트
  const handleWriteClick = () => {
    if (!user) {
      setShowAuthHint(true);
      alert("회원만 글 작성이 가능합니다.");
      const targetSlug = zoneFilter || DEFAULT_ZONE_SLUG;
      navigate("/login", {
        state: { from: `/community/${targetSlug}/write` },
      });
      return;
    }

    const targetSlug = zoneFilter || DEFAULT_ZONE_SLUG;
    navigate(`/community/${targetSlug}/write`);
  };

  return (
    <div className="list-container">
      {/* 상단 헤더 + 지표 */}
      <div className="list-heading">
        <div>
          <p className="zone-label">ZONE</p>
          <h1 className="list-title">{headingTitle}</h1>
          <p className="list-description">
            실시간으로 공유되는 지역 소식과 경험을 확인해 보세요.
          </p>
        </div>
        <div className="metrics-column">
          <div className="list-metrics">
            <span className="metric">
              <strong>{uniquePosts.length}</strong>
              <span>전체 글</span>
            </span>
            <span className="metric">
              <strong>{todayPostsCount}</strong>
              <span>오늘 등록</span>
            </span>
            <span className="metric">
              <strong>{todayZoneUpdates}</strong>
              <span>신규 갱신 구역</span>
            </span>
            <span className="metric">
              <strong>{recentMentionCount}</strong>
              <span>최근 7일 {mentionLabel} 언급</span>
            </span>
          </div>

          <div className="topzones-card">
            <div className="topzones-header">
              <p>인기 구역 TOP3</p>
              <span>최근 게시글 기준</span>
            </div>
            {topZones.length === 0 ? (
              <p className="topzones-empty">데이터를 불러오는 중입니다.</p>
            ) : (
              <ol>
                {topZones.map(([slug, count], index) => {
                  const zoneLabel = getZoneName(slug);
                  return (
                    <li key={slug}>
                      <span className="rank">{index + 1}</span>
                      <span className="zone-name">{zoneLabel}</span>
                      <span className="zone-count">{count}건</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* 필터 + 정렬 + 작성 버튼 */}
      <div className="list-controls">
        <div className="filters">
          <div className="list-tabs">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat}
                className={`tab-btn${activeCategory === cat ? " active" : ""}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="zone-tabs">
            {ZONE_FILTER_TABS.map((zone) => (
              <button
                key={zone.slug || "all"}
                className={`tab-btn${
                  zoneFilter === zone.slug ? " active" : ""
                }`}
                onClick={() => {
                  setCurrentPage(1);
                  if (zone.slug) {
                    navigate(`/community/${zone.slug}`);
                  } else {
                    navigate("/community");
                  }
                }}
              >
                {zone.name}
              </button>
            ))}
          </div>
        </div>
        <div className="list-actions">
          <div className="sort-wrapper">
            <span>정렬</span>
            <select
              className="sort-select"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="latest">최신순</option>
              <option value="views">조회순</option>
              <option value="comments">댓글순</option>
            </select>
          </div>
          <button
            type="button"
            className={`write-inline-btn ${!user ? "disabled" : ""}`}
            onClick={handleWriteClick}
          >
            작성
          </button>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="table-wrapper">
        <table className="list-table">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>번호</th>
              <th>제목</th>
              <th style={{ width: "15%" }}>작성자</th>
              <th style={{ width: "15%" }}>작성일</th>
              <th style={{ width: "10%" }}>조회수</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-row">
                    <td colSpan="5">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                    </td>
                  </tr>
                ))
              : sortedPosts.length === 0
              ? [
                  <tr key="empty">
                    <td colSpan="5" className="empty-text">
                      선택한 조건에 해당하는 글이 없습니다.
                    </td>
                  </tr>,
                ]
              : visiblePosts.map((post, index) => {
                  const createdAt =
                    post.createdAt?.toDate &&
                    post.createdAt.toDate().toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    });

                  const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
                  const rowNumber = globalIndex + 1;

                  const postZoneSlug = getPostZoneSlug(post);
                  const zoneLabel = getZoneName(postZoneSlug);

                  return (
                    <tr key={post.id}>
                      <td className="cell-number" data-label="번호">
                        {rowNumber}
                      </td>
                      <td className="title-cell" data-label="제목">
                        <Link to={`/post/${post.id}`}>
                          <span className="category-chip">
                            {post.category}
                          </span>
                          <span className="zone-chip">{zoneLabel}</span>
                          <span className="title-text">{post.title}</span>
                        </Link>
                      </td>
                      <td className="cell-author" data-label="작성자">
                        {post.author || "회원"}
                      </td>
                      <td className="cell-date" data-label="작성일">
                        {createdAt || "-"}
                      </td>
                      <td className="cell-views" data-label="조회수">
                        {post.views || 0}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {!loading && (
        <div className="pagination">
          <div className="page-numbers">
            <button
              type="button"
              className="page-arrow"
              disabled={!hasPrevGroup}
              onClick={() => {
                if (hasPrevGroup) {
                  setCurrentPage(groupStart - 1);
                }
              }}
            >
              &lt;
            </button>

            {Array.from(
              { length: groupEnd - groupStart + 1 },
              (_, index) => {
                const pageNumber = groupStart + index;
                return (
                  <button
                    type="button"
                    key={`page-${pageNumber}`}
                    className={currentPage === pageNumber ? "active" : ""}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              }
            )}

            <button
              type="button"
              className="page-arrow"
              disabled={!hasNextGroup}
              onClick={() => {
                if (hasNextGroup) {
                  setCurrentPage(groupEnd + 1);
                }
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      {showAuthHint && (
        <div className="auth-toast">
          로그인 또는 회원가입 후 이용할 수 있는 기능입니다.
        </div>
      )}
    </div>
  );
}

export default CommunityList;
