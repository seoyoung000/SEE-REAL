import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import "./CommunityList.css";

const CATEGORY_TABS = ["전체", "공지", "정보공유", "질문", "후기"];
const PAGE_SIZE = 10;
const getCacheKey = (zone) => `community-cache:${zone}`;
const CATEGORY_CLASS = {
  전체: "tab-neutral",
  공지: "tab-sky",
  정보공유: "tab-teal",
  질문: "tab-orange",
  후기: "tab-purple",
};

function CommunityList() {
  const { zoneId } = useParams();
  const displayZoneName = zoneId || "한남동";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [pendingMore, setPendingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showAuthHint, setShowAuthHint] = useState(false);
  const [sortOrder, setSortOrder] = useState("latest");
  const lastDocRef = useRef(null);

  const fetchPosts = useCallback(
    async (reset = false, skipSpinner = false) => {
      try {
        if (reset) {
          lastDocRef.current = null;
          setHasMore(true);
          if (!skipSpinner) {
            setLoading(true);
          }
        } else {
          setPendingMore(true);
        }

        const constraints = [];

        const isAllZone = !zoneId;
        if (!isAllZone) {
          constraints.push(where("zoneId", "==", zoneId));
        }
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
          sessionStorage.setItem(
            getCacheKey(zoneId || "ALL"),
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
    [zoneId]
  );

  useEffect(() => {
    setActiveCategory("전체");
    setPosts([]);
    setHasMore(true);
    lastDocRef.current = null;

    const cacheKey = getCacheKey(zoneId || "ALL");
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
  }, [zoneId, fetchPosts]);

  useEffect(() => {
    if (!showAuthHint) return undefined;

    const timer = setTimeout(() => setShowAuthHint(false), 3500);
    return () => clearTimeout(timer);
  }, [showAuthHint]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === "전체") return posts;
    return posts.filter((post) => post.category === activeCategory);
  }, [posts, activeCategory]);

  const sortedPosts = useMemo(() => {
    const list = [...filteredPosts];
    list.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      if (sortOrder === "oldest") {
        return dateA - dateB;
      }
      if (sortOrder === "comments") {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return dateB - dateA;
    });
    return list;
  }, [filteredPosts, sortOrder]);

  const {
    todayPostsCount,
    todayZoneUpdates,
    recentMentionCount,
    zoneNameKeyword,
  } = useMemo(() => {
    const now = Date.now();
    const oneDay = 1000 * 60 * 60 * 24;
    const sevenDays = oneDay * 7;
    let todayCount = 0;
    const todayZones = new Set();
    let mentionCount = 0;
    const keyword = (displayZoneName || "").replace(" 커뮤니티", "");

    posts.forEach((post) => {
      const createdAt =
        post.createdAt?.toDate && post.createdAt.toDate().getTime();
      if (!createdAt) return;

      if (now - createdAt < oneDay) {
        todayCount += 1;
        todayZones.add(post.zoneId || "기타 구역");
      }

      if (now - createdAt < sevenDays) {
        const zoneLabel = post.zoneId || "";
        if (!zoneId || zoneLabel.includes(keyword) || zoneLabel.includes(displayZoneName)) {
          mentionCount += 1;
        }
      }
    });

    return {
      todayPostsCount: todayCount,
      todayZoneUpdates: todayZones.size,
      recentMentionCount: mentionCount,
      zoneNameKeyword: keyword,
    };
  }, [posts, displayZoneName, zoneId]);

  const topZones = useMemo(() => {
    if (!posts.length) return [];
    const frequencies = posts.reduce((acc, post) => {
      const zoneName = post.zoneId || "미지정";
      acc[zoneName] = (acc[zoneName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [posts]);

  const handleWriteClick = () => {
    if (!user) {
      setShowAuthHint(true);
      const target = zoneId || "한남동";
      navigate("/login", {
        state: { from: `/community/${target}/write` },
      });
      return;
    }

    const target = zoneId || "한남동";
    navigate(`/community/${target}/write`);
  };

  return (
    <div className="list-container">
      <div className="list-heading">
        <div>
          <p className="zone-label">ZONE</p>
          <h1 className="list-title">
            {displayZoneName === "한남동"
              ? "한남동 커뮤니티"
              : `${displayZoneName} 커뮤니티`}
          </h1>
          <p className="list-description">
            실시간으로 공유되는 지역 소식과 경험을 확인해 보세요.
          </p>
        </div>
        <div className="metrics-column">
          <div className="list-metrics">
            <span className="metric">
              <strong>{posts.length}</strong>
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
              <span>
                최근 7일 {zoneNameKeyword || displayZoneName || "구역"} 언급
              </span>
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
                {topZones.map(([zone, count], index) => (
                  <li key={zone}>
                    <span className="rank">{index + 1}</span>
                    <span className="zone-name">{zone}</span>
                    <span className="zone-count">{count}건</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="list-controls">
        <div className="list-tabs">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              className={`tab-btn ${CATEGORY_CLASS[cat] || ""}${
                activeCategory === cat ? " active" : ""
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="list-actions">
          <select
            className="sort-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된 순</option>
            <option value="comments">댓글순</option>
          </select>
          <button
            type="button"
            className={`write-inline-btn ${!user ? "disabled" : ""}`}
            onClick={handleWriteClick}
          >
            작성
          </button>
        </div>
      </div>

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
                      선택한 카테고리에 해당하는 글이 없습니다.
                    </td>
                  </tr>,
                ]
              : sortedPosts.map((post, index) => {
                  const createdAt =
                    post.createdAt?.toDate &&
                    post.createdAt.toDate().toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    });
                  const rowNumber = posts.length - index;
                  return (
                    <tr key={post.id}>
                      <td>{rowNumber > 0 ? rowNumber : index + 1}</td>
                      <td className="title-cell">
                        <Link to={`/post/${post.id}`}>
                          <span className="category-chip">{post.category}</span>
                          {post.title}
                        </Link>
                      </td>
                      <td>{post.author || "회원"}</td>
                      <td>{createdAt || "-"}</td>
                      <td>{post.views || 0}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="pagination">
          <div className="page-numbers">
            {Array.from(
              { length: Math.max(1, Math.ceil(posts.length / PAGE_SIZE)) },
              (_, index) => (
                <span
                  key={`page-${index + 1}`}
                  className={index === 0 ? "active" : ""}
                >
                  {index + 1}
                </span>
              )
            )}
            {hasMore && (
              <button
                type="button"
                className="page-next"
                onClick={() => fetchPosts(false)}
                disabled={pendingMore}
              >
                {pendingMore ? "읽는 중..." : `${Math.ceil(posts.length / PAGE_SIZE) + 1} 페이지`}
              </button>
            )}
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
