// =====================================================
// CommunityList.jsx  (지도와 분리된 안정 버전)
// =====================================================

import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
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

// ------------------------------------------------------
// 🔥 지도와 무관한 고정 구역 리스트
// ------------------------------------------------------
export const FIXED_ZONES = [
  { slug: "hannam-masterplan", name: "한남 지구단위계획구역" },
  { slug: "itaewon-masterplan", name: "이태원로 주변 지구단위계획구역" },
  { slug: "hannam-foreigner", name: "한남외인주택부지" },
  { slug: "hannam3-redev", name: "한남3재정비촉진구역" },
  { slug: "hannam4-redev", name: "한남4재정비촉진구역" },
  { slug: "hannam5-redev", name: "한남5재정비촉진구역" },
];

const CATEGORY_TABS = ["전체", "공지", "정보공유", "질문", "후기"];

const PAGE_SIZE = 10;
const MAX_PAGE_BTNS = 5;

// 게시글의 zone slug 가져오기
function getPostZoneSlug(post) {
  if (!post) return "";
  return post.zoneId || post.zoneSlug || post.zone || "";
}

// ======================================================
// CommunityList Component
// ======================================================
function CommunityList() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [zoneFilter, setZoneFilter] = useState(zoneId || "");
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [pendingMore, setPendingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortOrder, setSortOrder] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);

  const lastDocRef = useRef(null);

  // --------------------------------------------------------
  // Firestore에서 전체 글 불러오기
  // --------------------------------------------------------
  const fetchPosts = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          lastDocRef.current = null;
          setHasMore(true);
        } else {
          setPendingMore(true);
        }

        const constraints = [orderBy("createdAt", "desc")];
        if (!reset && lastDocRef.current) {
          constraints.push(startAfter(lastDocRef.current));
        }
        constraints.push(limit(PAGE_SIZE));

        const q = query(collection(db, "posts"), ...constraints);
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        }

        const incoming = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPosts((prev) => (reset ? incoming : [...prev, ...incoming]));
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setPendingMore(false);
      }
    },
    []
  );

  // zoneFilter 변경 시 글 새로 로딩
  useEffect(() => {
    setPosts([]);
    setCurrentPage(1);
    fetchPosts(true);
  }, [zoneFilter, fetchPosts]);

  // URL 동기화
  useEffect(() => {
    setZoneFilter(zoneId || "");
  }, [zoneId]);

  // 카테고리 중복선택 방지 (버튼 active 고정)
  const uniquePosts = useMemo(() => {
    const map = new Map();
    posts.forEach((p) => map.set(p.id, p));
    return [...map.values()];
  }, [posts]);

  // ---------------- 1단계 필터 ----------------
  const filteredPosts = useMemo(() => {
    return uniquePosts.filter((post) => {
      const postZoneSlug = getPostZoneSlug(post);

      const matchCategory =
        activeCategory === "전체" || activeCategory === post.category;

      const matchZone = !zoneFilter || postZoneSlug === zoneFilter;

      return matchCategory && matchZone;
    });
  }, [uniquePosts, activeCategory, zoneFilter]);

  // ---------------- 2단계 정렬 ----------------
  const sortedPosts = useMemo(() => {
    const list = [...filteredPosts];
    list.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || 0;
      const dateB = b.createdAt?.toDate?.() || 0;

      if (sortOrder === "views") return (b.views || 0) - (a.views || 0);
      if (sortOrder === "comments")
        return (b.commentCount || 0) - (a.commentCount || 0);

      return dateB - dateA;
    });
    return list;
  }, [filteredPosts, sortOrder]);

  // ---------------- 3단계 페이징 ----------------
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));
  const groupIndex = Math.floor((currentPage - 1) / MAX_PAGE_BTNS);
  const groupStart = groupIndex * MAX_PAGE_BTNS + 1;
  const groupEnd = Math.min(groupStart + MAX_PAGE_BTNS - 1, totalPages);

  const visiblePosts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedPosts.slice(start, start + PAGE_SIZE);
  }, [sortedPosts, currentPage]);

  return (
    <div className="list-container">
      {/* 상단 제목 */}
      <div className="list-heading">
        <div>
          <p className="zone-label">SEE:REAL</p>
          <h1 className="list-title">SEE:REAL 커뮤니티</h1>
          <p className="list-description">
            실시간으로 공유되는 지역 소식과 경험을 확인해 보세요.
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="list-controls">
        <div className="filters">
          {/* 카테고리 */}
          <div className="list-tabs">
            {CATEGORY_TABS.map((c) => (
              <button
                key={c}
                className={`tab-btn ${activeCategory === c ? "active" : ""}`}
                onClick={() => {
                  setActiveCategory(c);
                  setCurrentPage(1);
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* 구역 필터 */}
          <div className="zone-tabs">
            <button
              className={`tab-btn ${zoneFilter === "" ? "active" : ""}`}
              onClick={() => navigate("/community")}
            >
              전체
            </button>

            {FIXED_ZONES.map((z) => (
              <button
                key={z.slug}
                className={`tab-btn ${
                  zoneFilter === z.slug ? "active" : ""
                }`}
                onClick={() => navigate(`/community/${z.slug}`)}
              >
                {z.name}
              </button>
            ))}
          </div>
        </div>

        {/* 정렬 */}
        <div className="list-actions">
          <div className="sort-wrapper">
            <span>정렬</span>
            <select
              className="sort-select"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
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
            className="write-inline-btn"
            onClick={() => {
              const target = zoneFilter || "hannam-masterplan";
              navigate(`/community/${target}/write`);
            }}
          >
            작성
          </button>
        </div>
      </div>

      {/* 리스트 */}
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
            {loading ? (
              <tr>
                <td colSpan="5" className="empty-text">
                  불러오는 중입니다...
                </td>
              </tr>
            ) : visiblePosts.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-text">
                  선택한 조건에 해당하는 글이 없습니다.
                </td>
              </tr>
            ) : (
              visiblePosts.map((post, idx) => {
                const createdAt =
                  post.createdAt?.toDate?.().toLocaleDateString("ko-KR") || "-";

                return (
                  <tr key={post.id}>
                    <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="title-cell">
                      <Link to={`/post/${post.id}`}>
                        <span className="category-chip">{post.category}</span>
                        <span className="zone-chip">
                          {
                            FIXED_ZONES.find(
                              (z) => z.slug === getPostZoneSlug(post)
                            )?.name
                          }
                        </span>
                        <span className="title-text">{post.title}</span>
                      </Link>
                    </td>
                    <td>{post.author || "회원"}</td>
                    <td>{createdAt}</td>
                    <td>{post.views || 0}</td>
                  </tr>
                );
              })
            )}
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
              disabled={groupStart <= 1}
              onClick={() => setCurrentPage(groupStart - 1)}
            >
              &lt;
            </button>

            {Array.from(
              { length: groupEnd - groupStart + 1 },
              (_, i) => groupStart + i
            ).map((page) => (
              <button
                type="button"
                key={page}
                className={currentPage === page ? "active" : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="page-arrow"
              disabled={groupEnd >= totalPages}
              onClick={() => setCurrentPage(groupEnd + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityList;
