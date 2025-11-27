import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export async function sendStageNotification({
  userId,
  zoneId,
  title,
  body,
}) {
  if (!userId) {
    return { sent: false, reason: "no-user" };
  }

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return { sent: false, reason: "no-profile" };
  }

  const prefs = snapshot.data();
  if (!prefs.allowNotification) {
    return { sent: false, reason: "disabled" };
  }

  const channels = [];
  if (prefs.allowEmail) channels.push("email");
  if (prefs.allowSMS) channels.push("sms");
  if (channels.length === 0) channels.push("in-app");

  await addDoc(collection(userRef, "notifications"), {
    title: title || "단계 변경 알림",
    body: body || "관심 구역 단계가 변경되었습니다.",
    zoneId: zoneId || null,
    channels,
    createdAt: serverTimestamp(),
    read: false,
    type: "stage-update",
  });

  return { sent: true, channels };
}
