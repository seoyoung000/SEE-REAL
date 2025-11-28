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
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProcessGuidePage from "./pages/ProcessGuidePage";
import AccountSettings from "./pages/AccountSettings";

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
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/account-settings" element={<AccountSettings />} />

          <Route path="/process" element={<ProcessGuidePage />} />
          <Route path="/calculator" element={<ProjectDetailPage />} />
          <Route path="/calculator/:regionId" element={<ProjectDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
