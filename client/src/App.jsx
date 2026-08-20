import { NavLink, Route, Routes } from "react-router-dom";
import { CalendarDays, Sparkles, Layers, Video, Palette } from "lucide-react";
import Calendar from "./pages/Calendar.jsx";
import Inspo from "./pages/Inspo.jsx";
import Bank from "./pages/Bank.jsx";
import Sessions from "./pages/Sessions.jsx";
import Formats from "./pages/Formats.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Calendar", end: true, icon: CalendarDays },
  { to: "/inspo", label: "Inspo bank", icon: Sparkles },
  { to: "/bank", label: "Content bank", icon: Layers },
  { to: "/sessions", label: "Sessions", icon: Video },
  { to: "/formats", label: "Formats", icon: Palette },
];

export default function App() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="People Who Padel" className="brand-mark" />
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>
            <item.icon size={17} strokeWidth={2} className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/inspo" element={<Inspo />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/formats" element={<Formats />} />
        </Routes>
      </main>
    </div>
  );
}
