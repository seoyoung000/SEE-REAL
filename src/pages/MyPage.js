import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { getZoneMeta, getZoneName } from "../utils/zones";
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

  const [favoriteZoneIds, setFavoriteZoneIds] = useState([]);
  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingSections, setLoadingSections] = useState({
    favorites: true,
    posts: true,
    comments: true,
    notifications: true,
  });
  const [accountError, setAccountError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [hideReadNotifications, setHideReadNotifications] = useState(false);

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

    // 관심 구역 (users/{uid}.favoriteZones 배열)
    const favoritesRef = doc(db, "users", user.uid);
    unsubscribeList.push(
      onSnapshot(
        favoritesRef,
        (snapshot) => {
          const data = snapshot.data();
          setFavoriteZoneIds(
            Array.isArray(data?.favoriteZones) ? data.favoriteZones : []
          );
          setNotificationPrefs(data?.notification || null);
          markReady("favorites");
        },
        (error) => {
          console.warn("관심 구역 정보를 불러오지 못했습니다.", error);
          setFavoriteZoneIds([]);
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
              read: docSnapshot.data().read === true,
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

  // 헤더 알림 뱃지용
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

  const favoriteCards = useMemo(
    () =>
      favoriteZoneIds.map((zoneId) => {
        const meta = getZoneMeta(zoneId);
        const nextStage =
          meta?.timeline?.find((item) => item.status === "next")?.label ||
          meta?.eta ||
          "예정 정보 없음";
        return {
          id: zoneId,
          zoneName: meta?.name || getZoneName(zoneId, zoneId),
          stage: meta?.stageLabel || meta?.stage || "단계 정보 준비 중",
          district: meta?.district || "관심 구역",
          next: nextStage,
        };
      }),
    [favoriteZoneIds]
  );

  const filteredNotifications = useMemo(
    () =>
      hideReadNotifications
        ? notifications.filter((notification) => notification.read !== true)
        : notifications,
    [notifications, hideReadNotifications]
  );

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmDelete = window.confirm(
      "정말 탈퇴하시겠습니까? 관심 구역과 게시글 기록이 모두 삭제됩니다."
    );
    if (!confirmDelete) {
      return;
    }

    setDeletingAccount(true);
    setAccountError("");
    const uid = user.uid;

    try {
      const userDocRef = doc(db, "users", uid);
      const notificationsRef = collection(db, "users", uid, "notifications");
      const favoritesRef = collection(db, "users", uid, "favorites");
      const postsRef = collection(db, "posts");

      const commentsAuthorQuery = query(
        collectionGroup(db, "comments"),
        where("authorId", "==", uid)
      );
      const commentsUserQuery = query(
        collectionGroup(db, "comments"),
        where("userId", "==", uid)
      );

      const [
        notificationsSnap,
        favoritesSnap,
        postsByAuthorSnap,
        postsByUserSnap,
        commentsByAuthorSnap,
        commentsByUserSnap,
      ] = await Promise.all([
        getDocs(notificationsRef),
        getDocs(favoritesRef),
        getDocs(query(postsRef, where("authorId", "==", uid))),
        getDocs(query(postsRef, where("userId", "==", uid))),
        getDocs(commentsAuthorQuery),
        getDocs(commentsUserQuery),
      ]);

      await Promise.all(
        notificationsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref))
      );

      const deletedPostIds = new Set();
      await Promise.all(
        postsByAuthorSnap.docs.map((docSnap) => {
          deletedPostIds.add(docSnap.id);
          return deleteDoc(docSnap.ref);
        })
      );
      await Promise.all(
        postsByUserSnap.docs.map((docSnap) => {
          if (deletedPostIds.has(docSnap.id)) {
            return Promise.resolve();
          }
          deletedPostIds.add(docSnap.id);
          return deleteDoc(docSnap.ref);
        })
      );

      const deletedCommentPaths = new Set();
      await Promise.all(
        commentsByAuthorSnap.docs.map((docSnap) => {
          deletedCommentPaths.add(docSnap.ref.path);
          return deleteDoc(docSnap.ref);
        })
      );
      await Promise.all(
        commentsByUserSnap.docs.map((docSnap) => {
          if (deletedCommentPaths.has(docSnap.ref.path)) {
            return Promise.resolve();
          }
          deletedCommentPaths.add(docSnap.ref.path);
          return deleteDoc(docSnap.ref);
        })
      );

      await Promise.all(
        favoritesSnap.docs.map((docSnap) => deleteDoc(docSnap.ref))
      );

      await user.delete();
      await deleteDoc(userDocRef);

      navigate("/", { replace: true });
    } catch (deleteError) {
      console.error("계정 삭제 실패", deleteError);
      if (deleteError?.code === "auth/requires-recent-login") {
        setAccountError("보안을 위해 다시 로그인한 뒤 탈퇴를 진행해 주세요.");
      } else {
        setAccountError("탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!user) return;
    const target = notification?.targetUrl || "/community";
    try {
      if (!notification.read) {
        const notifRef = doc(db, "users", user.uid, "notifications", notification.id);
        await updateDoc(notifRef, { read: true });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    }
  } catch (markError) {
    console.warn("알림 읽음 처리에 실패했습니다.", markError);
  } finally {
    navigate(target);
  }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!user) return;
    try {
      const notifRef = doc(db, "users", user.uid, "notifications", notificationId);
      await deleteDoc(notifRef);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (err) {
      console.error("알림을 삭제하지 못했습니다.", err);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!user) return;
    const confirmClear = window.confirm("모든 알림을 삭제하시겠습니까?");
    if (!confirmClear) return;
    try {
      const notifRef = collection(db, "users", user.uid, "notifications");
      const snap = await getDocs(notifRef);
      await Promise.all(snap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      setNotifications([]);
    } catch (err) {
      console.error("알림 전체 삭제 실패", err);
    }
  };



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
          <button type="button" onClick={() => navigate("/account-settings")}>
            계정 관리
          </button>
          <button type="button" className="outline" onClick={logout}>
            로그아웃
          </button>
          <button
            type="button"
            className="danger"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? "탈퇴 처리 중..." : "탈퇴하기"}
          </button>
        </div>
      </section>

      <section className="quick-stats">
        <div>
          <strong>{favoriteZoneIds.length}</strong>
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

      {notificationPrefs && notificationPrefs.enabled === false && (
        <div className="notification-banner">
          <p>
            관심 구역 알림이 꺼져 있습니다. 단계 변경 안내를 받으려면 알림 설정을 켜 주세요.
          </p>
          <button type="button" onClick={() => navigate("/account-settings")}>
            알림 설정으로 이동
          </button>
        </div>
      )}

      {accountError && <div className="mypage-alert-error">{accountError}</div>}

      <section className="mypage-section">
        <div className="section-heading">
          <div>
            <p className="section-label">관심 구역</p>
            <h2>내가 등록한 정비구역</h2>
          </div>
          <button type="button" onClick={() => navigate("/process")}>
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
        ) : favoriteCards.length === 0 ? (
          <div className="section-empty">
            아직 등록된 관심 구역이 없습니다. 지도 또는 상세 페이지에서
            북마크를 추가해 주세요.
          </div>
        ) : (
          <div className="favorite-grid">
            {favoriteCards.map((fav) => (
              <button
                type="button"
                key={fav.id}
                className="favorite-card"
                onClick={() => navigate(`/community/${fav.id}`)}
              >
                <div className="favorite-card-header">
                  <p>{fav.zoneName}</p>
                  <span>{fav.district}</span>
                </div>
                <p className="favorite-stage">{fav.stage}</p>
                <div className="favorite-meta">
                  <div>
                    <span>다음 일정</span>
                    <strong>{fav.next}</strong>
                  </div>
                  <div>
                    <span>업데이트</span>
                    <strong>지도에서 관리</strong>
                  </div>
                </div>
              </button>
            ))}
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
          <div className="notification-actions">
            <button type="button" onClick={() => navigate("/account-settings")}>
              알림 설정
            </button>
            {notifications.length > 0 && (
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={hideReadNotifications}
                  onChange={() => setHideReadNotifications((prev) => !prev)}
                />
                읽은 알림 숨기기
              </label>
            )}
            {notifications.length > 0 && (
              <button type="button" className="danger" onClick={handleDeleteAllNotifications}>
                전체 삭제
              </button>
            )}
          </div>
        </div>

        {allLoading ? (
          <div className="activity-skeleton">
            <div className="skeleton-line title" />
            <div className="skeleton-line" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="section-empty">
            {hideReadNotifications
              ? "읽지 않은 알림이 없습니다. 관심 구역 변화를 기다려 주세요."
              : "아직 수신한 알림이 없습니다. 관심 구역을 등록하고 댓글 알림을 설정해보세요."}
          </div>
        ) : (
          <div className="notification-list">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item${notification.read ? " read" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleNotificationClick(notification);
                  }
                }}
              >
                <div>
                  <p className="notification-title">
                    {notification.title || "알림"}
                  </p>
                  <p className="notification-body">
                    {notification.body || notification.message || ""}
                  </p>
                </div>
                <div className="notification-meta">
                  <span>{formatDateTime(notification.createdAt, true)}</span>
                  <button
                    type="button"
                    className="notification-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyPage;
