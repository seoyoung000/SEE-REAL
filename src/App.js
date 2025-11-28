// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import MyPage from "./pages/MyPage";
import "./App.css";

import CommunityList from "./pages/CommunityList";
import PostWrite from "./pages/PostWrite";
import PostDetail from "./pages/PostDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AccountSetup from "./pages/AccountSetup";
import AccountSettings from "./pages/AccountSettings";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProcessGuidePage from "./pages/ProcessGuidePage";

function FeaturePlaceholder({ title, description }) {
  return (
    <div className="basic-page">
      <div className="basic-card">
        <p className="basic-label">서비스 준비 중</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/community" element={<CommunityList />} />
          <Route path="/community/:zoneId" element={<CommunityList />} />
          <Route path="/community/:zoneId/write" element={<PostWrite />} />
          <Route path="/post/:postId" element={<PostDetail />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/account-setup" element={<AccountSetup />} />
          <Route path="/onboarding" element={<AccountSetup />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/mypage" element={<MyPage />} />

          <Route path="/process" element={<ProcessGuidePage />} />
          <Route path="/calculator" element={<ProjectDetailPage />} />
          <Route path="/calculator/:regionId" element={<ProjectDetailPage />} />
          <Route
            path="/dashboard"
            element={
              <FeaturePlaceholder
                title="노후도 대시보드"
                description="구역별 노후도와 위험 지수를 시각화해서 제공할 예정입니다."
              />
            }
          />
          <Route
            path="/help"
            element={
              <FeaturePlaceholder
                title="도움말"
                description="회원가입, 알림 설정, 커뮤니티 이용 방법을 정리한 안내서가 제공됩니다."
              />
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
