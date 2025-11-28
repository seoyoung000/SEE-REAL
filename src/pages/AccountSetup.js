import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
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
import "./AccountSetup.css";

function AccountSetup() {
  const navigate = useNavigate();
  const { user, initializing } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isDisplayNameTaken = async (name, excludeUid = null) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
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

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", { replace: true, state: { from: "/account-setup" } });
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const bootstrap = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          navigate("/", { replace: true });
          return;
        }
        setDisplayName(user.displayName || "");
        setEmail(user.email || "");
        setPhoneNumber(user.phoneNumber || "");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [user, navigate]);

  if (initializing || loading || !user) {
    return null;
  }

  const handleSave = async (event) => {
    event.preventDefault();
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    if (!email.trim()) {
      setError("이메일을 입력해 주세요.");
      return;
    }
    if (notificationEnabled && notifySMS && !phoneNumber.trim()) {
      setError("문자 알림을 받으려면 휴대전화 번호를 입력해주세요.");
      return;
    }

    const duplicateNickname = await isDisplayNameTaken(trimmedName, user?.uid || null);
    if (duplicateNickname) {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }

    setSaving(true);
    setError("");

    const cleanedPhone = phoneNumber.trim();
    const notificationPayload = {
      enabled: notificationEnabled,
      channels: {
        email: notificationEnabled ? notifyEmail : false,
        sms: notificationEnabled ? (notifySMS && Boolean(cleanedPhone)) : false,
      },
    };

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          displayName: trimmedName,
          email: email.trim(),
          phoneNumber: cleanedPhone ? cleanedPhone : null,
          notification: notificationPayload,
          favoriteZones: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (user.displayName !== trimmedName) {
        await updateProfile(user, { displayName: trimmedName });
      }

      if (cleanedPhone && user.phoneNumber !== cleanedPhone) {
        try {
          await updateProfile(user, { phoneNumber: cleanedPhone });
        } catch (profileError) {
          console.info("Firebase Auth phone number 업데이트는 별도 인증이 필요합니다.", profileError);
        }
      }

      setError("");
      navigate("/", { replace: true });
    } catch (setupError) {
      console.error("계정 설정 저장 실패", setupError);
      setError("계정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-setup">
      <div className="account-setup__card">
        <header className="account-setup__header">
          <p>첫 설정</p>
          <h1>관심 구역 알림을 설정해 주세요</h1>
          <p>닉네임과 연락처, 알림 채널을 저장하면 지도에서 관심 구역을 등록할 수 있습니다.</p>
        </header>

        <form className="account-setup__form" onSubmit={handleSave}>
          <label className="account-setup__field">
            닉네임
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label className="account-setup__field">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
              readOnly
            />
            <span className="account-setup__hint">Google 계정 정보와 동일하게 설정됩니다.</span>
          </label>

          <label className="account-setup__field">
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
              disabled={saving}
            />
          </label>

          <div className="account-setup__consent">
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
                disabled={saving}
              />
              관심 구역 알림 받기
            </label>

            <div className="consent-options">
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  disabled={!notificationEnabled || saving}
                  onChange={() => setNotifyEmail(true)}
                />
                이메일로 받기
              </label>
              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={notifySMS}
                  disabled={!notificationEnabled || saving}
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

          {error && <p className="account-setup__error">{error}</p>}

          <button type="submit" disabled={saving} className="account-setup__submit">
            {saving ? "저장 중..." : "설정 완료"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AccountSetup;
