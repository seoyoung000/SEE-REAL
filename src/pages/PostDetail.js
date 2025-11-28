import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import "./PostDetail.css";

function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [viewsUpdated, setViewsUpdated] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------
  // 게시글 + 댓글 실시간 구독
  // -------------------------------
  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, "posts", postId);

    const unsubscribePost = onSnapshot(postRef, (snapshot) => {
      if (snapshot.exists()) {
        setPost({ id: snapshot.id, ...snapshot.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    const commentsQuery = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setComments(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );
    });

    return () => {
      unsubscribePost();
      unsubscribeComments();
    };
  }, [postId]);

  // -------------------------------
  // 조회수 증가 (1회만)
  // -------------------------------
  useEffect(() => {
    if (!postId || viewsUpdated) return;

    const incrementViews = async () => {
      try {
        await updateDoc(doc(db, "posts", postId), {
          views: increment(1),
        });
        setViewsUpdated(true);
      } catch (err) {
        console.warn("조회수 증가 실패", err);
      }
    };

    incrementViews();
  }, [postId, viewsUpdated]);

  const formattedDate = useMemo(() => {
    if (!post?.createdAt?.toDate) return "-";
    return post.createdAt.toDate().toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [post]);

  // -------------------------------
  // 댓글 작성
  // -------------------------------
  const addComment = async () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      return;
    }
    if (!text.trim()) {
      alert("댓글을 입력해주세요.");
      return;
    }
    if (addingComment) return;

    setAddingComment(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: text.trim(),
        author: user.displayName || user.email || "회원",
        authorId: user.uid,
        authorPhoto: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      setText("");
    } catch (error) {
      console.error("댓글 저장 실패:", error);
      alert("댓글 저장 중 오류가 발생했습니다.");
    } finally {
      setAddingComment(false);
    }
  };

  // -------------------------------
  // 글 삭제 (댓글 포함)
  // -------------------------------
  const canDelete = Boolean(user && post && user.uid === post.authorId);

  const deletePost = async () => {
    if (!canDelete || deleting) return;

    const confirmed = window.confirm(
      "작성하신 글을 삭제하시겠어요? (댓글도 함께 삭제됩니다)"
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const postRef = doc(db, "posts", postId);
      const commentsRef = collection(db, "posts", postId, "comments");

      // 1) 댓글 전체 삭제
      const commentsSnap = await getDocs(commentsRef);
      await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));

      // 2) 게시글 삭제
      await deleteDoc(postRef);

      navigate(`/community`, { replace: true });
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="detail-skeleton">
          <div className="skeleton-line title" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="detail-container">
        <p>게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-heading">
        <div>
          <span className="category-badge">{post.category}</span>
          <h1 className="detail-title">{post.title}</h1>
        </div>

        <div className="detail-actions">
          <div className="detail-stats">
            <span>조회수 {post.views || 0}</span>
            <span>댓글 {post.commentCount || comments.length}</span>
          </div>

          {canDelete && (
            <button
              type="button"
              className="detail-delete-btn"
              onClick={deletePost}
              disabled={deleting}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
      </div>

      {/* 작성자 정보 */}
      <div className="detail-meta">
        <div className="meta-author">
          <img
            src={
              post.authorPhoto ||
              "https://ui-avatars.com/api/?background=F4F5F9&color=111&name=" +
                encodeURIComponent(post.author || "회원")
            }
            alt="작성자 프로필"
          />
          <div>
            <p className="meta-author-name">{post.author || "회원"}</p>
            <p className="meta-date">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="detail-content">{post.content}</div>

      <hr className="divider" />

      {/* 댓글 */}
      <div className="comment-header">
        <h2 className="comment-title">댓글</h2>
        <span className="comment-count">{comments.length}</span>
      </div>

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="no-comment">가장 먼저 의견을 남겨보세요.</p>
        ) : (
          comments.map((c) => {
            const createdAt =
              c.createdAt?.toDate &&
              c.createdAt.toDate().toLocaleString("ko-KR", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

            return (
              <div key={c.id} className="comment-item">
                <img
                  src={
                    c.authorPhoto ||
                    "https://ui-avatars.com/api/?background=ECEFF4&color=111&name=" +
                      encodeURIComponent(c.author || "회원")
                  }
                  alt="댓글 작성자"
                  className="comment-avatar"
                />
                <div>
                  <div className="comment-author">
                    <strong>{c.author || "회원"}</strong>
                    <span>{createdAt || "-"}</span>
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 댓글 입력 */}
      {user ? (
        <div className="comment-write">
          <textarea
            placeholder="댓글을 입력해주세요"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="button" onClick={addComment} disabled={addingComment}>
            {addingComment ? "등록 중..." : "등록"}
          </button>
        </div>
      ) : (
        <div className="comment-locked">
          <p>회원만 댓글을 작성할 수 있어요.</p>
          <button type="button" onClick={() => navigate("/signup")}>
            회원가입하기
          </button>
        </div>
      )}
    </div>
  );
}

export default PostDetail;
