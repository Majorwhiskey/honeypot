import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import WelcomeGate from "./components/WelcomeGate";
import DashboardPage from "./pages/DashboardPage";
import LiveFeedPage from "./pages/LiveFeedPage";
import CredentialsPage from "./pages/CredentialsPage";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <>
      {!unlocked && <WelcomeGate onUnlock={() => setUnlocked(true)} />}
      <div className={!unlocked ? "blur-[5px] pointer-events-none select-none" : ""}>
        <Routes>
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/feed" element={<LiveFeedPage />} />
                  <Route path="/credentials" element={<CredentialsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </div>
    </>
  );
}
