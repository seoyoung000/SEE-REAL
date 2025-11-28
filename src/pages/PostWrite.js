import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { autoSlug } from "../utils/zones";
import "./PostWrite.css";

/* --------------------------------------------------
   🔥 FIXED ZONES — 너가 사용하길 원하는 6개 구역만
-------------------------------------------------- */
const FIXED_ZONES = [
  { slug: autoSlug("한남 지구단위계획구역"), name: "한남 지구단위계획구역" },
  { slug: autoSlug("이태원로 주변 지구단위계획구역"), name: "이태원로 주변 지구단위계획구역" },
  { slug: autoSlug("한남외인주택부지"), name: "한남외인주택부지" },
  { slug: autoSlug("한남3재정비촉진구역"), name: "한남3재정비촉진구역" },
  { slug: autoSlug("한남4재정비촉진구역"), name: "한남4재정비촉진구역" },
  { slug: autoSlug("한남5재정비촉진구역"), name: "한남5재정비촉진구역" },
];

function PostWrite() {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user, initializing } = useAuth();

  const initialZone = zoneId || FIXED_ZONES[0].slug;

  const [category, setCategory] = useState("공지");
  const [zoneSlug, setZoneSlug] = useState(initialZone);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contentLength = useMemo(() => content.length, [content]);

  /* 로그인 체크 */
  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", {
        replace: true,
        state: { from: `/community/${zoneSlug}/write` },
      });
    }
  }, [user, initializing, navigate, zoneSlug]);

  if (initializing || !user) {
    return (
      <div className="write-container">
        <div className="write-locked">
          <h2>회원 전용 기능입니다</h2>
          <p>로그인 후 글쓰기를 이용할 수 있어요.</p>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     글 작성 처리
  -------------------------------------------------- */
  const handleSubmit = async () => {
    if (!user) return alert("로그인 후 이용해주세요.");
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
        zoneId: zoneSlug, // 🔥 구역 Slug 저장 (표준화)
        authorId: user.uid,
        author: user.displayName || user.email || "회원",
        authorPhoto: user.photoURL || "",
        likes: 0,
        views: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate(`/community/${zoneSlug}`);
    } catch (error) {
      console.error("게시글 저장 실패:", error);
      alert("글 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------
     렌더링
  -------------------------------------------------- */
  return (
    <div className="write-container">
      <div className="write-title-row">
        <div>
          <p className="zone-label">WRITE</p>

          {/* 🔥 항상 고정된 제목 */}
          <h1 className="write-title">SEE:REAL 커뮤니티 글쓰기</h1>
        </div>
      </div>

      {/* 구역 선택 */}
      <div className="write-section">
        <label>구역 선택</label>
        <select
          className="write-select"
          value={zoneSlug}
          onChange={(event) => setZoneSlug(event.target.value)}
        >
          {FIXED_ZONES.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {/* 카테고리 */}
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

      {/* 제목 */}
      <div className="write-section">
        <label>제목</label>
        <input
          className="write-input"
          placeholder="제목을 입력해주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 내용 */}
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

      {/* 버튼 */}
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
