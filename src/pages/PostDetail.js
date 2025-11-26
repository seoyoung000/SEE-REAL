import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  deleteDoc,
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
  const { user, login } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingComment, setAddingComment] = useState(false);
  const [viewsUpdated, setViewsUpdated] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!postId) return undefined;

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
      setComments(snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })));
    });

    return () => {
      unsubscribePost();
      unsubscribeComments();
    };
  }, [postId]);

  useEffect(() => {
    if (!postId || viewsUpdated) return;

    const incrementViews = async () => {
      try {
        await updateDoc(doc(db, "posts", postId), {
          views: increment(1),
        });
        setViewsUpdated(true);
      } catch (error) {
        console.warn("조회수를 업데이트하지 못했습니다.", error);
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
      alert("댓글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAddingComment(false);
    }
  };

  const canDelete = Boolean(user && post && user.uid === post.authorId);
  const handleEditClick = () => {
    alert("글 수정 기능은 준비 중입니다. 곧 업데이트될 예정입니다.");
  };

  const deletePost = async () => {
    if (!canDelete || deleting) return;
    const confirmed = window.confirm(
      "작성하신 글을 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", postId));
      navigate(`/community/${post.zoneId || "전체"}`, { replace: true });
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      alert("글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
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
            <div className="detail-owner-actions">
              <button
                type="button"
                className="detail-edit-btn"
                onClick={handleEditClick}
              >
                수정 (준비중)
              </button>
              <button
                type="button"
                className="detail-delete-btn"
                onClick={deletePost}
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          )}
        </div>
      </div>

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

      <div className="detail-content">{post.content}</div>

      <hr className="divider" />

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
          <button type="button" onClick={login}>
            로그인하기
          </button>
        </div>
      )}
    </div>
  );
}

export default PostDetail;
