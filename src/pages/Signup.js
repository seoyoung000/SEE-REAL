import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import "./AuthPages.css";

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || "/";

  const { signupWithEmail, loginWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [allowNotification, setAllowNotification] = useState(true);
  const [allowEmail, setAllowEmail] = useState(true);
  const [allowSMS, setAllowSMS] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /** 🔥 Firestore 사용자 문서 생성 (최초 1회) */
  const createUserDocument = async (user, overrides = {}) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    const existing = await getDoc(userRef);

    // 🔥 최초 생성일 경우만 createdAt 저장
    if (!existing.exists()) {
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "",
          createdAt: serverTimestamp(), // 최초 1회만
          allowNotification,
          allowEmail,
          allowSMS,
          favoriteZones: [], // 기본값
          lastNotification: null,
          ...overrides,
        },
        { merge: true }
      );
    } else {
      // 이미 문서가 있다면 기본값만 보존하며 업데이트
      await setDoc(
        userRef,
        {
          allowNotification,
          allowEmail,
          allowSMS,
          favoriteZones: [],
          ...overrides,
        },
        { merge: true }
      );
    }
  };

  /** 이메일 회원가입 */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Firebase Auth 계정 생성
      const user = await signupWithEmail({
        email: email.trim(),
        password,
        displayName: name.trim(),
      });

      // 🔥 Firestore 문서 생성
      await createUserDocument(user, {
        name: name.trim(),
      });

      navigate(redirectPath, { replace: true });
    } catch (signupError) {
      console.error("회원가입 오류:", signupError);
      setError("회원가입 중 오류가 발생했습니다. 이메일 중복이 아닐 수도 있습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  /** 구글 로그인으로 회원가입 */
  const handleGoogleSignup = async () => {
    setSubmitting(true);
    setError("");

    try {
      const user = await loginWithGoogle();
      if (!user) {
        setSubmitting(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // 🔥 최초 구글 가입 시 기본 정보 저장
        await createUserDocument(user, {
          allowNotification: false,
          allowEmail: false,
          allowSMS: false,
        });

        // 온보딩으로 이동
        navigate("/account-settings", {
          replace: true,
          state: { onboarding: true },
        });
        return;
      }

      const data = userDoc.data();

      // favoriteZones 보완
      if (!Array.isArray(data.favoriteZones)) {
        await setDoc(userRef, { favoriteZones: [] }, { merge: true });
      }

      // 알림 설정이 없으면 온보딩 필요
      if (
        typeof data.allowNotification === "undefined" ||
        typeof data.allowEmail === "undefined" ||
        typeof data.allowSMS === "undefined"
      ) {
        navigate("/account-settings", {
          replace: true,
          state: { onboarding: true },
        });
        return;
      }

      // 모두 정상 → 홈 이동
      navigate(redirectPath, { replace: true });
    } catch (googleError) {
      console.error("구글 로그인 오류:", googleError);
      setError("구글 계정 연동 중 문제가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-nav">
          <div className="auth-links">
            <Link to="/login">로그인</Link>
            <Link to="/signup" className="active">
              회원가입
            </Link>
          </div>
        </div>

        <section className="auth-card">
          <header className="auth-header">
            <p className="auth-subheading">Create Account</p>
            <h1>회원가입</h1>
          </header>
          <p className="auth-motivation">지금 가입하고 관심 구역 알림을 받아보세요.</p>

          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleSignup}
            disabled={submitting}
          >
            <span className="google-icon">G</span> Google 계정으로 시작하기
          </button>

          <div className="auth-divider">
            <span>또는 이메일로 가입</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
              이름 (선택)
              <input
                type="text"
                placeholder="커뮤니티에서 보일 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </label>

            <label className="auth-label">
              이메일
              <input
                type="email"
                placeholder="example@seereal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </label>

            <label className="auth-label">
              비밀번호
              <input
                type="password"
                placeholder="영문, 숫자 조합 8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </label>

            <label className="auth-label">
              비밀번호 확인
              <input
                type="password"
                placeholder="다시 한번 입력해주세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="consent-card">
              <p className="consent-title">알림 설정</p>
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={allowNotification}
                  onChange={() => {
                    const next = !allowNotification;
                    setAllowNotification(next);
                    if (!next) {
                      setAllowEmail(false);
                      setAllowSMS(false);
                    }
                  }}
                  disabled={submitting}
                />
                전체 알림 수신 동의
              </label>

              <div className="consent-options">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={allowEmail}
                    disabled={!allowNotification || submitting}
                    onChange={() => setAllowEmail((prev) => !prev)}
                  />
                  이메일 알림
                </label>
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={allowSMS}
                    disabled={!allowNotification || submitting}
                    onChange={() => setAllowSMS((prev) => !prev)}
                  />
                  문자 알림
                </label>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "가입 처리 중..." : "회원가입"}
            </button>
          </form>

          <div className="auth-footer-links">
            <span>이미 계정이 있으신가요?</span>
            <Link to="/login" state={{ from: redirectPath }}>
              로그인
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Signup;
