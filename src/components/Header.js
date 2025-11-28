import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

function Header() {
  const { user, logout } = useAuth();
  const displayName = user?.displayName || user?.email || "회원";
  const [hasAlerts, setHasAlerts] = useState(
    () => sessionStorage.getItem("seereal-has-notifications") === "1"
  );
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

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

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const current = window.scrollY;

      const updateState = () => {
        if (!collapsedRef.current && current > 40) {
          setCollapsed(true);
        } else if (collapsedRef.current && current < 10) {
          setCollapsed(false);
        }
        lastScrollY = current;
        ticking = false;
      };

      if (!ticking) {
        window.requestAnimationFrame(updateState);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`header-container${collapsed ? " collapsed" : ""}`}>
      <div className="header-top">
        <div className="header-left">
          <Link to="/" className="header-logo">
            SEE:REAL
          </Link>
          <p className="header-tagline">지역 기반 도시 정보 이해 플랫폼</p>
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
        <Link to="/process">지도 보기</Link>
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
