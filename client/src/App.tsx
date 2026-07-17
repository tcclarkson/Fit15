import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Today from "./pages/Today";
import CalendarPage from "./pages/CalendarPage";
import Friends from "./pages/Friends";
import Feed from "./pages/Feed";
import Notifications from "./pages/Notifications";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
