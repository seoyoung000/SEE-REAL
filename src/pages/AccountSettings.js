import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
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

  const [allowNotification, setAllowNotification] = useState(false);
  const [allowEmail, setAllowEmail] = useState(false);
  const [allowSMS, setAllowSMS] = useState(false);
  const [favoriteZones, setFavoriteZones] = useState([]);

  // 로그인 안 되어 있으면 로그인으로 돌리기
  useEffect(() => {
    if (!initializing && !user) {
      navigate("/login", { replace: true, state: { from: "/account-settings" } });
    }
  }, [initializing, user, navigate]);

  // Firestore 사용자 문서 구독
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() || {};
        setAllowNotification(Boolean(data.allowNotification));
        setAllowEmail(Boolean(data.allowEmail));
        setAllowSMS(Boolean(data.allowSMS));
        setFavoriteZones(Array.isArray(data.favoriteZones) ? data.favoriteZones : []);
        setLoading(false);
      },
      (err) => {
        console.error("계정 정보를 불러오지 못했습니다.", err);
        setError("계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const favoriteZoneLabels = useMemo(
    () =>
      favoriteZones.map((zoneId) => ({
        id: zoneId,
        name: getZoneName(zoneId, zoneId),
      })),
    [favoriteZones]
  );

  // 설정 저장
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const userRef = doc(db, "users", user.uid);

      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "",
          // createdAt 은 최초 생성 시(회원가입/온보딩/기타)에서만 세팅한다고 가정
          allowNotification,
          allowEmail: allowNotification ? allowEmail : false,
          allowSMS: allowNotification ? allowSMS : false,
          favoriteZones,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("설정이 저장되었습니다.");
      if (onboarding) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("알림 설정 저장 실패", err);
      setError("설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // 테스트 알림 생성
  const handleTestNotification = async () => {
    if (!user) return;
    if (!allowNotification) {
      setError("알림 수신 동의를 먼저 켜주세요.");
      return;
    }

    setTesting(true);
    setMessage("");
    setError("");

    try {
      const result = await sendStageNotification({
        userId: user.uid,
        zoneId: favoriteZones[0] || DEFAULT_ZONE_SLUG,
        title: "단계 변경 알림 테스트",
        body: "설정한 채널로 단계 변경 알림이 도착합니다.",
      });

      if (!result.sent) {
        setError("알림을 생성하지 못했습니다. 설정을 다시 확인해주세요.");
      } else {
        setMessage("테스트 알림이 생성되었습니다. 마이페이지에서 확인할 수 있습니다.");
      }
    } catch (err) {
      console.error("테스트 알림 생성 실패", err);
      setError("테스트 알림 생성에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  };

  if (initializing || !user) {
    // 깜빡임 방지용
    return null;
  }

  return (
    <div className="account-settings">
      <header className="account-header">
        <div>
          <p className="account-label">계정 관리</p>
          <h1>알림 · 관심 구역 설정</h1>
          <p>
            {onboarding
              ? "알림 수신 방법을 선택하면 지도에서 관심 구역을 저장할 수 있습니다."
              : "단계 변경, 이메일·문자 수신 여부를 한 곳에서 관리하세요."}
          </p>
        </div>
        <button type="button" onClick={() => navigate("/mypage")}>
          마이페이지로 이동
        </button>
      </header>

      <section className="account-card">
        <form onSubmit={handleSubmit}>
          <div className="account-form-grid">
            <div className="account-form-section">
              <p className="section-label">알림 수신 동의</p>

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
                  disabled={loading || saving}
                />
                전체 알림 수신 동의
              </label>

              <div className="consent-depth">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={allowEmail}
                    disabled={!allowNotification || loading || saving}
                    onChange={() => setAllowEmail((prev) => !prev)}
                  />
                  이메일 알림
                </label>
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={allowSMS}
                    disabled={!allowNotification || loading || saving}
                    onChange={() => setAllowSMS((prev) => !prev)}
                  />
                  문자 알림
                </label>
              </div>
            </div>

            <div className="account-form-section muted">
              <p className="section-label">안내</p>
              <ul>
                <li>알림 동의는 언제든지 마이페이지 &gt; 계정 관리에서 수정할 수 있습니다.</li>
                <li>문자 알림은 향후 문자 발송 파트너 연동 시 적용됩니다.</li>
                <li>테스트 알림은 마이페이지 알림 섹션에서 바로 확인할 수 있습니다.</li>
              </ul>
            </div>
          </div>

          {error && <p className="account-error">{error}</p>}
          {message && <p className="account-success">{message}</p>}

          <div className="account-actions">
            <button type="submit" className="primary" disabled={saving || loading}>
              {saving ? "저장 중..." : "설정 저장"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={handleTestNotification}
              disabled={testing || loading}
            >
              {testing ? "테스트 생성 중..." : "테스트 알림 생성"}
            </button>
          </div>
        </form>
      </section>

      <section className="account-card">
        <div className="account-section-heading">
          <div>
            <p className="section-label">관심 구역</p>
            <h2>지도에서 선택한 구역</h2>
            <p>지도나 상세 패널에서 구역을 선택해 관심 구역으로 저장할 수 있습니다.</p>
          </div>
          <button type="button" onClick={() => navigate("/")}>
            지도에서 구역 선택
          </button>
        </div>

        {loading ? (
          <div className="favorite-placeholder">관심 구역을 불러오는 중입니다...</div>
        ) : favoriteZoneLabels.length === 0 ? (
          <div className="favorite-placeholder">
            아직 관심 구역이 없습니다. 지도에서 구역을 선택한 뒤 "관심 구역 등록"을 눌러주세요.
          </div>
        ) : (
          <ul className="favorite-zone-list">
            {favoriteZoneLabels.map((zone) => (
              <li key={zone.id}>
                <strong>{zone.name}</strong>
                <span>{zone.id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AccountSettings;
