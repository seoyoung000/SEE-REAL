import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import "./AuthPages.css";

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || "/";

  const { signupWithEmail, loginWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDisplayNameTaken = async (name, excludeUid = null) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }
    const nicknameQuery = query(
      collection(db, "users"),
      where("displayName", "==", trimmed)
    );
    const snapshot = await getDocs(nicknameQuery);
    if (snapshot.empty) {
      return false;
    }
    return snapshot.docs.some((docSnapshot) => docSnapshot.id !== excludeUid);
  };

  const buildNotificationPayload = (hasPhoneNumber) => ({
    enabled: notificationEnabled,
    channels: {
      email: notificationEnabled ? notifyEmail : false,
      sms: notificationEnabled ? (notifySMS && hasPhoneNumber) : false,
    },
  });

  const persistUserProfile = async (user) => {
    if (!user) return;
    const trimmedName = displayName.trim();
    const cleanedEmail = email.trim();
    const cleanedPhone = phoneNumber.trim();

    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    const payload = {
      displayName: trimmedName,
      email: cleanedEmail,
      phoneNumber: cleanedPhone ? cleanedPhone : null,
      notification: buildNotificationPayload(Boolean(cleanedPhone)),
      updatedAt: serverTimestamp(),
    };

    if (!snapshot.exists()) {
      payload.createdAt = serverTimestamp();
      payload.favoriteZones = [];
    }

    await setDoc(userRef, payload, { merge: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
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
    if (notificationEnabled && notifySMS && !phoneNumber.trim()) {
      setError("문자 알림을 받으려면 휴대전화 번호를 입력해주세요.");
      return;
    }

    const duplicateNickname = await isDisplayNameTaken(trimmedDisplayName);
    if (duplicateNickname) {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const user = await signupWithEmail({
        email: email.trim(),
        password,
        displayName: trimmedDisplayName,
      });

      await persistUserProfile(user);

      navigate(redirectPath, { replace: true });
    } catch (signupError) {
      console.error("회원가입 오류:", signupError);
      if (signupError?.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일입니다.");
      } else if (
        typeof signupError?.message === "string" &&
        signupError.message.toLowerCase().includes("displayname")
      ) {
        setError("닉네임 저장에 문제가 발생했습니다. 다시 시도해 주세요.");
      } else {
        setError("회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setSubmitting(true);
    setError("");

    try {
      const result = await loginWithGoogle();
      if (result && !result.needsSetup) {
        navigate(redirectPath, { replace: true });
      }
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
          <p className="auth-motivation">
            닉네임과 알림 방식을 설정하면 관심 구역 소식을 빠르게 받을 수 있어요.
          </p>

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
              닉네임
              <input
                type="text"
                placeholder="커뮤니티에서 보여질 이름"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                required
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
                required
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
                required
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
                required
              />
            </label>

            <label className="auth-label">
              휴대전화번호 (선택)
              <input
                type="tel"
                placeholder="'-' 없이 숫자만 입력"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (error?.startsWith("문자 알림")) {
                    setError("");
                  }
                }}
                disabled={submitting}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="consent-card">
              <p className="consent-title">알림 설정</p>
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={notificationEnabled}
                  onChange={() => {
                    const next = !notificationEnabled;
                    setNotificationEnabled(next);
                    if (next) {
                      setNotifyEmail(true);
                      if (phoneNumber.trim()) {
                        setNotifySMS(true);
                      } else {
                        setNotifySMS(false);
                      }
                    } else {
                      setNotifyEmail(false);
                      setNotifySMS(false);
                    }
                  }}
                  disabled={submitting}
                />
                관심 구역 알림 받기
              </label>

              <div className="consent-options">
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  disabled={!notificationEnabled || submitting}
                  onChange={() => setNotifyEmail(true)}
                />
                이메일로 받기
              </label>
              <label className="consent-checkbox">
                <input
                    type="checkbox"
                    checked={notifySMS}
                    disabled={!notificationEnabled || submitting}
                    onChange={() => {
                      if (!notificationEnabled) return;
                      if (!phoneNumber.trim()) {
                        setError("문자 알림을 받으려면 휴대전화 번호를 먼저 입력해주세요.");
                        return;
                      }
                      if (error?.startsWith("문자 알림")) {
                        setError("");
                      }
                      setNotifySMS((prev) => !prev);
                    }}
                  />
                  문자로 받기
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
