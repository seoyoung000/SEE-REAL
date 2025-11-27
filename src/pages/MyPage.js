// src/pages/MyPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { getZoneName } from "../utils/zones";
import "./MyPage.css";

const formatDateTime = (timestamp, withTime = false) => {
  if (!timestamp) return "-";
  try {
    const date =
      typeof timestamp === "string"
        ? new Date(timestamp)
        : timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);
    return date.toLocaleString(
      "ko-KR",
      withTime
        ? {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }
        : { year: "numeric", month: "2-digit", day: "2-digit" }
    );
  } catch (error) {
    return "-";
  }
};

function MyPage() {
  const navigate = useNavigate();
  const { user, initializing, logout } = useAuth();

  const [favorites, setFavorites] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingSections, setLoadingSections] = useState({
    favorites: true,
    posts: true,
    comments: true,
    notifications: true,
  });

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", { replace: true, state: { from: "/mypage" } });
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    setLoadingSections({
      favorites: true,
      posts: true,
      comments: true,
      notifications: true,
    });

    const markReady = (key) =>
      setLoadingSections((prev) => ({ ...prev, [key]: false }));

    const unsubscribeList = [];

    // 관심 구역
    const favoritesQuery = query(
      collection(db, "users", user.uid, "favorites"),
      orderBy("updatedAt", "desc")
    );
    unsubscribeList.push(
      onSnapshot(
        favoritesQuery,
        (snapshot) => {
          setFavorites(
            snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }))
          );
          markReady("favorites");
        },
        (error) => {
          console.warn("관심 구역 정보를 불러오지 못했습니다.", error);
          markReady("favorites");
        }
      )
    );

    // 내가 쓴 글
    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    unsubscribeList.push(
      onSnapshot(
        postsQuery,
        (snapshot) => {
          setUserPosts(
            snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }))
          );
          markReady("posts");
        },
        (error) => {
          console.warn("작성 글을 불러오지 못했습니다.", error);
          markReady("posts");
        }
      )
    );

    // 내가 쓴 댓글
    const commentsQuery = query(
      collectionGroup(db, "comments"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    unsubscribeList.push(
      onSnapshot(
        commentsQuery,
        (snapshot) => {
          setUserComments(
            snapshot.docs.map((docSnapshot) => {
              const parentPostId = docSnapshot.ref.parent.parent?.id || "";
              return {
                id: docSnapshot.id,
                postId: parentPostId,
                ...docSnapshot.data(),
              };
            })
          );
          markReady("comments");
        },
        (error) => {
          console.warn("댓글 이력 조회 실패", error);
          markReady("comments");
        }
      )
    );

    // 알림
    const notificationsQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(6)
    );
    unsubscribeList.push(
      onSnapshot(
        notificationsQuery,
        (snapshot) => {
          setNotifications(
            snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }))
          );
          markReady("notifications");
        },
        (error) => {
          console.warn("알림 정보를 조회하지 못했습니다.", error);
          markReady("notifications");
        }
      )
    );

    return () => {
      unsubscribeList.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem("seereal-has-notifications", "0");
      window.dispatchEvent(new Event("seereal-notification-update"));
      return;
    }
    const hasUnread = notifications.some(
      (notification) => notification.read !== true
    );
    sessionStorage.setItem(
      "seereal-has-notifications",
      hasUnread ? "1" : "0"
    );
    window.dispatchEvent(new Event("seereal-notification-update"));
  }, [notifications, user]);

  const allLoading =
    user &&
    Object.values(loadingSections).some((sectionLoading) => sectionLoading);

  const joinDate = useMemo(() => {
    if (!user?.metadata?.creationTime) return "-";
    return formatDateTime(user.metadata.creationTime);
  }, [user]);

  const profileAvatar = useMemo(() => {
    if (user?.photoURL) return user.photoURL;
    const name = user?.displayName || user?.email || "SEE REAL";
    return `https://ui-avatars.com/api/?background=2268a0&color=fff&name=${encodeURIComponent(
      name
    )}`;
  }, [user]);

  if (initializing || !user) {
    return (
      <div className="mypage-container">
        <section className="mypage-locked">
          <h2>회원 전용 페이지</h2>
          <p>로그인 이후 마이페이지에서 개인화 정보를 확인할 수 있습니다.</p>
          <button type="button" onClick={() => navigate("/login")}>
            로그인으로 이동
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mypage-container">
      <section className="profile-card">
        <div className="profile-info">
          <img src={profileAvatar} alt="회원 프로필" />
          <div>
            <p className="profile-label">SEE:REAL MEMBER</p>
            <h1>{user.displayName || "회원"}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-meta">
              <span>가입일 {joinDate}</span>
              <span>최근 접속 {formatDateTime(Date.now(), true)}</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <button type="button" onClick={() => navigate("/help")}>
            계정 관리
          </button>
          <button type="button" className="outline" onClick={logout}>
            로그아웃
          </button>
          <button type="button" className="danger">
            탈퇴하기
          </button>
        </div>
      </section>

      <section className="quick-stats">
        <div>
          <strong>{favorites.length}</strong>
          <span>관심 구역</span>
        </div>
        <div>
          <strong>{userPosts.length}</strong>
          <span>작성 글</span>
        </div>
        <div>
          <strong>{userComments.length}</strong>
          <span>작성 댓글</span>
        </div>
        <div>
          <strong>{notifications.length}</strong>
          <span>알림</span>
        </div>
      </section>

      <section className="mypage-section">
        <div className="section-heading">
          <div>
            <p className="section-label">관심 구역</p>
            <h2>내가 등록한 정비구역</h2>
          </div>
          <button type="button" onClick={() => navigate("/")}>
            구역 찾기
          </button>
        </div>

        {allLoading ? (
          <div className="section-skeleton">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`favorite-skeleton-${index}`} className="skeleton-card">
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="section-empty">
            아직 등록된 관심 구역이 없습니다. 지도 또는 상세 페이지에서
            북마크를 추가해 주세요.
          </div>
        ) : (
          <div className="favorite-grid">
            {favorites.map((fav) => {
              const zoneName = fav.zoneName || fav.zoneId || fav.id;
              const stage = fav.stage || "진행 단계 업데이트 예정";
              const next = fav.nextEvent || fav.nextStage || "일정 정보 없음";
              const updatedAt = formatDateTime(fav.updatedAt, true);
              return (
                <button
                  type="button"
                  key={fav.id}
                  className="favorite-card"
                  onClick={() =>
                    navigate(`/community/${fav.zoneId || fav.id || "전체"}`)
                  }
                >
                  <div className="favorite-card-header">
                    <p>{zoneName}</p>
                    <span>{fav.district || ""}</span>
                  </div>
                  <p className="favorite-stage">{stage}</p>
                  <div className="favorite-meta">
                    <div>
                      <span>다음 일정</span>
                      <strong>{next}</strong>
                    </div>
                    <div>
                      <span>업데이트</span>
                      <strong>{updatedAt}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mypage-section">
        <div className="section-heading">
          <div>
            <p className="section-label">커뮤니티 활동</p>
            <h2>내 게시글과 댓글 이력</h2>
          </div>
          <Link to="/community">커뮤니티 전체 보기</Link>
        </div>

        <div className="activity-grid">
          {/* 작성한 게시글 */}
          <div className="activity-column">
            <div className="activity-header">
              <h3>작성한 게시글</h3>
              {userPosts.length > 0 && (
                <button type="button" onClick={() => navigate("/community")}>
                  더보기
                </button>
              )}
            </div>
            {allLoading ? (
              <div className="activity-skeleton">
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
              </div>
            ) : userPosts.length === 0 ? (
              <p className="section-empty small">
                아직 작성한 글이 없습니다. 커뮤니티에서 질문을 남겨보세요.
              </p>
            ) : (
              userPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="activity-item"
                >
                  <div>
                    <p className="activity-title">{post.title}</p>
                    <span className="activity-meta">
                      {getZoneName(post.zoneId, "구역 미지정")} ·{" "}
                      {formatDateTime(post.createdAt)}
                    </span>
                  </div>
                  <span className="activity-badge">
                    조회 {post.views || 0} · 댓글 {post.commentCount || 0}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* 작성한 댓글 */}
          <div className="activity-column">
            <div className="activity-header">
              <h3>작성한 댓글</h3>
              {userComments.length > 0 && (
                <button type="button" onClick={() => navigate("/community")}>
                  더보기
                </button>
              )}
            </div>
            {allLoading ? (
              <div className="activity-skeleton">
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
              </div>
            ) : userComments.length === 0 ? (
              <p className="section-empty small">
                아직 댓글을 작성하지 않았습니다. 궁금한 점을 남겨보세요.
              </p>
            ) : (
              userComments.slice(0, 3).map((comment) => (
                <Link
                  key={comment.id}
                  to={`/post/${comment.postId}`}
                  className="activity-item"
                >
                  <div>
                    <p className="activity-title">{comment.text}</p>
                    <span className="activity-meta">
                      {formatDateTime(comment.createdAt, true)}
                    </span>
                  </div>
                  <span className="activity-badge subtle">댓글 보기</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mypage-section">
        <div className="section-heading">
          <div>
            <p className="section-label">알림 모음</p>
            <h2>단계 변화 · 댓글 알림</h2>
          </div>
          <button type="button" onClick={() => navigate("/community")}>
            알림 설정
          </button>
        </div>

        {allLoading ? (
          <div className="activity-skeleton">
            <div className="skeleton-line title" />
            <div className="skeleton-line" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="section-empty">
            아직 수신한 알림이 없습니다. 관심 구역을 등록하고 댓글 알림을
            설정해보세요.
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className="notification-item"
                onClick={() =>
                  notification.targetUrl
                    ? navigate(notification.targetUrl)
                    : navigate("/community")
                }
              >
                <div>
                  <p className="notification-title">
                    {notification.title || "알림"}
                  </p>
                  <p className="notification-body">
                    {notification.body || notification.message || ""}
                  </p>
                </div>
                <span className="notification-meta">
                  {formatDateTime(notification.createdAt, true)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyPage;
