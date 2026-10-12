
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  UserRound,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <header className="top-header">
      <div className="header-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="notification-dot" />
        </button>

        <div className="faculty-menu-container">
          <button
            type="button"
            className="faculty-profile faculty-profile-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="avatar">
              <UserRound size={20} />
            </div>

            <div className="faculty-info">
              <strong>Faculty</strong>
              <span>Academic Mentor</span>
            </div>

            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="faculty-dropdown" role="menu">
              <div className="dropdown-user-info">
                <strong>Faculty</strong>
                <span>Academic Mentor</span>
              </div>

              <button
                type="button"
                className="logout-button"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
