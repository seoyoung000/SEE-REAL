// src/pages/AccountSettings.js
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { DEFAULT_ZONE_SLUG, getZoneName } from "../utils/zones";
import { sendStageNotification } from "../services/notificationService";
import "./AccountSettings.css";

function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = Boolean(location.state?.onboarding);

  const { user, initializing } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [channelWarning, setChannelWarning] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);

  const [favoriteZones, setFavoriteZones] = useState([]);

  const smsWarningMessage =
    "문자 알림을 받으려면 휴대전화 번호를 먼저 입력해주세요.";

  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", { replace: true });
    }
  }, [initializing, user, navigate]);

  // 닉네임 중복 검사
  const isDisplayNameTaken = async (name, excludeUid = null) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const nicknameQuery = query(
      collection(db, "users"),
      where("displayName", "==", trimmed)
    );
    const snapshot = await getDocs(nicknameQuery);

    if (snapshot.empty) return false;

    return snapshot.docs.some((docSnap) => docSnap.id !== excludeUid);
  };

  // 사용자 Firestore 정보 로드
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setDisplayName(user.displayName || "");
          setContactEmail(user.email || "");
          setPhoneNumber(user.phoneNumber || "");
          setFavoriteZones([]);
          setLoading(false);
          return;
        }

        const data = snap.data();
        const notification = data.notification || {
          enabled: true,
          channels: { email: true, sms: false },
        };

        setDisplayName(data.displayName || user.displayName || "");
        setContactEmail(data.email || user.email || "");
        setPhoneNumber(data.phoneNumber || user.phoneNumber || "");

        setNotificationEnabled(Boolean(notification.enabled));
        setNotifyEmail(Boolean(notification.channels?.email));
        setNotifySMS(
          Boolean(notification.channels?.sms && (data.phoneNumber || user.phoneNumber))
        );

        setFavoriteZones(data.favoriteZones || []);
        setLoading(false);
      },
      (err) => {
        console.error("계정 정보 불러오기 실패:", err);
        setError("계정 정보를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // 알림 전체 켜기/끄기 동작
  useEffect(() => {
    if (!notificationEnabled) {
      setNotifyEmail(false);
      setNotifySMS(false);
      setChannelWarning("");
      return;
    }

    if (!notifyEmail) setNotifyEmail(true);

    if (phoneNumber.trim()) {
      if (!notifySMS) setNotifySMS(true);
      setChannelWarning("");
    } else {
      setNotifySMS(false);
      setChannelWarning(smsWarningMessage);
    }
  }, [notificationEnabled, phoneNumber]);

  const handleToggleSMS = () => {
    if (!notificationEnabled) return;

    if (!phoneNumber.trim()) {
      setChannelWarning(smsWarningMessage);
      return;
    }

    setChannelWarning("");
    setNotifySMS((prev) => !prev);
  };

  const favoriteZoneLabels = useMemo(
    () =>
      favoriteZones.map((z) => ({
        id: z,
        name: getZoneName(z, z),
      })),
    [favoriteZones]
  );

  const buildNotificationPayload = (hasPhone) => ({
    enabled: notificationEnabled,
    channels: {
      email: notificationEnabled ? notifyEmail : false,
      sms: notificationEnabled ? (notifySMS && hasPhone) : false,
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setError("");
    setMessage("");
    setChannelWarning("");

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("닉네임을 입력해 주세요.");
      return;
    }

    if (notificationEnabled && notifySMS && !phoneNumber.trim()) {
      setError("문자 알림을 받으려면 휴대전화 번호를 입력해주세요.");
      return;
    }

    const duplicate = await isDisplayNameTaken(trimmedName, user.uid);
    if (duplicate) {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }

    setSaving(true);

    try {
      const userRef = doc(db, "users", user.uid);

      await setDoc(
        userRef,
        {
          displayName: trimmedName,
          email: contactEmail.trim(),
          phoneNumber: phoneNumber.trim() || null,
          notification: buildNotificationPayload(Boolean(phoneNumber.trim())),
          favoriteZones,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Auth displayName 업데이트
      if (user.displayName !== trimmedName) {
        await updateProfile(user, { displayName: trimmedName });
      }

      setMessage("설정이 저장되었습니다.");
    } catch (err) {
      console.error("저장 실패:", err);
      setError("설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 테스트 알림 보내기
  const handleTestNotification = async () => {
    if (!user) return;

    setError("");
    setMessage("");
    setChannelWarning("");

    setTesting(true);

    try {
      const result = await sendStageNotification({
        userId: user.uid,
        zoneId: favoriteZones[0] || DEFAULT_ZONE_SLUG,
        title: "단계 변경 알림 테스트",
        body: "설정한 채널로 단계 변경 알림이 도착합니다.",
        safeMode: true,
      });

      if (result.sent) {
        setMessage(
          "테스트 알림이 생성되었습니다!"
        );
      } else {
        setError("알림 생성에 실패했습니다.");
      }
    } catch (err) {
      console.error("실패:", err);
      setError("알림 생성에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  };

  if (initializing || !user) return null;

  return (
    <div className="account-settings">
      <header className="account-header">
        <div>
          <p className="account-label">계정 관리</p>
          <h1>프로필 · 알림 설정</h1>
          <p>
            {onboarding
              ? "알림 채널을 설정하면 관심 구역 변동을 빠르게 받아볼 수 있습니다."
              : "연락처와 알림 채널을 관리하고 테스트 알림을 확인할 수 있습니다."}
          </p>
        </div>
        <button onClick={() => navigate("/mypage")}>마이페이지로 이동</button>
      </header>

      <section className="account-card">
        <form onSubmit={handleSubmit}>
          <div className="account-form-grid">
            {/* ---- 기본 정보 ---- */}
            <div className="account-form-section">
              <p className="section-label">기본 정보</p>

              <label className="account-field">
                <span>닉네임</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={saving}
                />
              </label>

              <label className="account-field">
                <span>이메일</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled
                />
              </label>

              <label className="account-field">
                <span>휴대전화번호</span>
                <input
                  type="tel"
                  placeholder="'-' 없이 숫자만 입력"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setChannelWarning("");
                  }}
                />
              </label>

              {channelWarning && !error && !message && (
                <p className="field-hint warning">{channelWarning}</p>
              )}
            </div>

            {/* ---- 알림 설정 ---- */}
            <div className="account-form-section">
              <p className="section-label">알림 설정</p>

              <label className="consent-checkbox">
                <input
                  type="checkbox"
                  checked={notificationEnabled}
                  onChange={() => setNotificationEnabled((prev) => !prev)}
                />
                알림 전체 켜기
              </label>

              <div className="consent-depth">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    disabled={!notificationEnabled}
                    onChange={() => setNotifyEmail((prev) => !prev)}
                  />
                  이메일 알림
                </label>

                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={notifySMS}
                    disabled={!notificationEnabled}
                    onChange={handleToggleSMS}
                  />
                  문자 알림
                </label>
              </div>

              {/* 테스트 알림 */}
              <div className="account-test-card">
                <p>설정 확인</p>
                <button
                  type="button"
                  disabled={!notificationEnabled || testing}
                  onClick={handleTestNotification}
                >
                  {testing ? "테스트 중..." : "테스트 알림 보내기"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="account-error">{error}</div>}
          {message && <div className="account-success">{message}</div>}

          <div className="account-actions">
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "저장 중..." : "설정 저장"}
            </button>
            <button type="button" className="ghost" onClick={() => navigate("/mypage")}>
              마이페이지로 돌아가기
            </button>
          </div>
        </form>
      </section>

      {/* 관심 구역 */}
      <section className="account-card">
        <div className="account-section-heading">
          <div>
            <p className="account-label">관심 구역</p>
            <h2>저장된 구역</h2>
          </div>
          <button onClick={() => navigate("/")}>지도에서 찾기</button>
        </div>

        {favoriteZoneLabels.length === 0 ? (
          <div className="favorite-placeholder">
            아직 등록된 구역이 없습니다.
          </div>
        ) : (
          <ul className="favorite-zone-list">
            {favoriteZoneLabels.map((z) => (
              <li key={z.id}>
                <strong>{z.name}</strong>
                <span>{z.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AccountSettings;
