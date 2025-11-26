import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import "./PostWrite.css";

function PostWrite() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user, initializing } = useAuth();

  const [category, setCategory] = useState("공지");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contentLength = useMemo(() => content.length, [content]);

  const handleSubmit = async () => {
    if (!user) {
      alert("로그인 후 이용해주세요.");
      return;
    }
    if (!title.trim()) return alert("제목을 입력해주세요.");
    if (!content.trim()) return alert("내용을 입력해주세요.");
    if (submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "posts"), {
        title: title.trim(),
        content: content.trim(),
        contentSummary: content.slice(0, 160),
        category,
        zoneId,
        authorId: user.uid,
        author: user.displayName || user.email || "회원",
        authorPhoto: user.photoURL || "",
        likes: 0,
        views: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate(`/community/${zoneId}`);
    } catch (error) {
      console.error("게시글 저장에 실패했습니다.", error);
      alert("글을 저장하는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", {
        replace: true,
        state: { from: `/community/${zoneId || ""}/write` },
      });
    }
  }, [user, initializing, navigate, zoneId]);

  if (initializing || !user) {
    return (
      <div className="write-container">
        <div className="write-locked">
          <h2>회원 전용 기능입니다</h2>
          <p>로그인 또는 회원가입 후 글쓰기를 이용할 수 있어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="write-container">
      <div className="write-title-row">
        <div>
          <p className="zone-label">ZONE</p>
          <h1 className="write-title">{zoneId} 커뮤니티 글쓰기</h1>
        </div>
        <div className="write-author-card">
          <img
            src={
              user.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.displayName || user.email || "회원"
              )}`
            }
            alt="작성자 프로필"
          />
          <div>
            <strong>{user.displayName || user.email}</strong>
          </div>
        </div>
      </div>

      <div className="write-section">
        <label>카테고리</label>
        <select
          className="write-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>공지</option>
          <option>정보공유</option>
          <option>질문</option>
          <option>후기</option>
        </select>
      </div>

      <div className="write-section">
        <label>제목</label>
        <input
          className="write-input"
          placeholder="제목을 입력해주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="write-section">
        <div className="write-label-row">
          <label>내용</label>
          <span className="write-counter">{contentLength}자</span>
        </div>
        <textarea
          className="write-textarea"
          placeholder="지역 소식, 질문, 후기를 자유롭게 남겨주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="write-buttons">
        <button className="cancel-btn" onClick={() => navigate(-1)}>
          취소
        </button>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "작성 중..." : "발행하기"}
        </button>
      </div>
    </div>
  );
}

export default PostWrite;
