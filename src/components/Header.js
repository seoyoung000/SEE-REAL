import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

function Header() {
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email || "회원";
  const [keyword, setKeyword] = useState("");
  const [hasAlerts, setHasAlerts] = useState(
    () => sessionStorage.getItem("seereal-has-notifications") === "1"
  );
  const navigate = useNavigate();

  useEffect(() => {
    const handleBadgeUpdate = () => {
      setHasAlerts(sessionStorage.getItem("seereal-has-notifications") === "1");
    };
    window.addEventListener("seereal-notification-update", handleBadgeUpdate);
    return () => {
      window.removeEventListener(
        "seereal-notification-update",
        handleBadgeUpdate
      );
    };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed) {
      navigate(`/community/${trimmed}`);
    } else {
      navigate("/community");
    }
  };

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="header-left">
          <Link to="/" className="header-logo">
            SEE:REAL
          </Link>
          <p className="header-tagline">지역 기반 도시 정보 이해 플랫폼</p>
        </div>

        <div className="header-center">
          <form className="header-search" onSubmit={handleSearch}>
            <input
              placeholder="구역명 또는 키워드를 검색해 보세요"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button type="submit" aria-label="검색">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
            </button>
          </form>
        </div>

        <div className="header-right">
          {user ? (
            <div className="header-user-inline">
              <span className="user-name">{displayName}님</span>
              <span aria-hidden="true">|</span>
              <span className="mypage-link">
                <Link to="/mypage">마이페이지</Link>
                {hasAlerts && (
                  <span className="alert-dot" aria-label="알림 배지" />
                )}
              </span>
              <span aria-hidden="true">|</span>
              <button type="button" onClick={logout}>
                로그아웃
              </button>
            </div>
          ) : (
            <div className="header-guest">
              <div className="header-guest-links">
                <Link to="/login">로그인</Link>
                <span aria-hidden="true">|</span>
                <Link to="/signup">회원가입</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="nav-bar">
        <Link to="/process">절차 안내</Link>
        <Link to="/calculator">사업 분석</Link>
        <Link to="/dashboard">노후도 보기</Link>
        <Link to="/community">커뮤니티</Link>
        {user && <Link to="/mypage">마이페이지</Link>}
        <Link to="/help">도움말</Link>
      </nav>
    </header>
  );
}

export default Header;
