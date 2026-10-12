
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  SlidersHorizontal,
  Bell,
  Palette,
  ShieldCheck,
  Save,
  RotateCcw,
  LogOut,
  CheckCircle2,
  Moon,
  Sun,
  GraduationCap,
  Monitor,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  name: "EduPulse Admin",
  email: "admin@edupulse.ai",
  role: "Administrator",
  defaultPage: "/dashboard",
  studentsPerPage: "10",
  academicAlerts: true,
  placementAlerts: true,
  interventionAlerts: true,
  uploadAlerts: true,
  theme: "light",
};

const STORAGE_KEY = "edupulse_settings";

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const sections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "dashboard", label: "Dashboard Preferences", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
];

function Toggle({ checked, onChange, title, description }) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`settings-switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState(loadSettings);
  const [activeSection, setActiveSection] = useState("profile");
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
    setSaveError("");
  }

  function saveSettings(event) {
    event.preventDefault();

    if (!settings.name.trim() || !settings.email.trim()) {
      setSaveError("Please enter your name and email address.");
      setSavedMessage("");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedMessage("Your settings have been saved successfully.");
      setSaveError("");
    } catch {
      setSaveError("Unable to save settings in this browser.");
      setSavedMessage("");
    }
  }

  function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS });
    setSavedMessage("");
    setSaveError("");
  }

  
function logout() {
  sessionStorage.removeItem("edupulse_access_token");
  sessionStorage.removeItem("edupulse_user");
  sessionStorage.removeItem("edupulse_demo_logged_in");

  navigate("/login", { replace: true });
}


  const ActiveIcon =
    sections.find((section) => section.id === activeSection)?.icon ||
    SlidersHorizontal;

  return (
    <div
      className={`settings-page ${
        settings.theme === "dark" ? "settings-dark" : ""
      }`}
    >
      <header className="settings-heading">
        <div>
          <div className="settings-eyebrow">PREFERENCES & ACCOUNT</div>
          <h1>Settings</h1>
          <p>Manage your profile and customize your EduPulse AI experience.</p>
        </div>
        <div className="settings-heading-icon">
          <SlidersHorizontal size={25} />
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-nav-title">GENERAL SETTINGS</div>

          {sections.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`settings-nav-item ${
                activeSection === id ? "active" : ""
              }`}
              onClick={() => {
                setActiveSection(id);
                setSavedMessage("");
                setSaveError("");
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}

          <div className="settings-sidebar-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Demo environment</strong>
              <p>Preferences are stored locally in your browser.</p>
            </div>
          </div>
        </aside>

        <form className="settings-content" onSubmit={saveSettings}>
          <div className="settings-section-heading">
            <div className="settings-section-icon">
              <ActiveIcon size={22} />
            </div>
            <div>
              <h2>
                {sections.find((section) => section.id === activeSection)?.label}
              </h2>
              <p>
                {activeSection === "profile" &&
                  "Update the details displayed for your demo account."}
                {activeSection === "dashboard" &&
                  "Choose how student information is displayed."}
                {activeSection === "notifications" &&
                  "Choose which alerts you want to enable."}
                {activeSection === "appearance" &&
                  "Customize the appearance of this settings page."}
                {activeSection === "security" &&
                  "Manage your current demo session."}
              </p>
            </div>
          </div>

          {activeSection === "profile" && (
            <div className="settings-card">
              <div className="settings-card-heading">
                <h3>Personal information</h3>
                <p>Your demo account details</p>
              </div>

              <div className="settings-avatar-row">
                <div className="settings-avatar">
                  <GraduationCap size={30} />
                </div>
                <div>
                  <strong>{settings.name || "Your name"}</strong>
                  <p>{settings.role}</p>
                </div>
                <span className="settings-demo-badge">DEMO ACCOUNT</span>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label htmlFor="settings-name">Full name</label>
                  <input
                    id="settings-name"
                    value={settings.name}
                    onChange={(event) =>
                      updateSetting("name", event.target.value)
                    }
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="settings-email">Email address</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={settings.email}
                    onChange={(event) =>
                      updateSetting("email", event.target.value)
                    }
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="settings-field settings-full-width">
                  <label htmlFor="settings-role">Account role</label>
                  <input
                    id="settings-role"
                    value={settings.role}
                    readOnly
                  />
                  <small>
                    Demo role only. Role management requires backend
                    authentication.
                  </small>
                </div>
              </div>
            </div>
          )}

          {activeSection === "dashboard" && (
            <div className="settings-card">
              <div className="settings-card-heading">
                <h3>Dashboard preferences</h3>
                <p>Set your preferred starting page and table size.</p>
              </div>

              <div className="settings-field">
                <label htmlFor="settings-default-page">
                  Default page after login
                </label>
                <select
                  id="settings-default-page"
                  value={settings.defaultPage}
                  onChange={(event) =>
                    updateSetting("defaultPage", event.target.value)
                  }
                >
                  <option value="/dashboard">Dashboard overview</option>
                  <option value="/students">Students</option>
                  <option value="/analytics">Analytics</option>
                  <option value="/segments">Student segments</option>
                </select>
              </div>

              <div className="settings-field settings-spaced-field">
                <label htmlFor="settings-page-size">
                  Students displayed per page
                </label>
                <select
                  id="settings-page-size"
                  value={settings.studentsPerPage}
                  onChange={(event) =>
                    updateSetting("studentsPerPage", event.target.value)
                  }
                >
                  <option value="10">10 students</option>
                  <option value="25">25 students</option>
                  <option value="50">50 students</option>
                </select>
                <small>
                  This preference is saved here. The Students page must read
                  this setting for its pagination to change.
                </small>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="settings-card">
              <div className="settings-card-heading">
                <h3>Alert preferences</h3>
                <p>
                  Toggle the types of alerts you want enabled for your demo.
                </p>
              </div>

              <Toggle
                title="Academic risk alerts"
                description="Alerts for students who may need academic support."
                checked={settings.academicAlerts}
                onChange={(value) => updateSetting("academicAlerts", value)}
              />
              <Toggle
                title="Placement risk alerts"
                description="Alerts for students with low placement readiness."
                checked={settings.placementAlerts}
                onChange={(value) => updateSetting("placementAlerts", value)}
              />
              <Toggle
                title="Intervention reminders"
                description="Reminders about pending student interventions."
                checked={settings.interventionAlerts}
                onChange={(value) =>
                  updateSetting("interventionAlerts", value)
                }
              />
              <Toggle
                title="Upload notifications"
                description="Show preferences for student data upload results."
                checked={settings.uploadAlerts}
                onChange={(value) => updateSetting("uploadAlerts", value)}
              />

              <div className="settings-info-note">
                <Bell size={17} />
                <span>
                  These switches save your preferences only. Actual
                  notifications are not connected in this frontend demo.
                </span>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="settings-card">
              <div className="settings-card-heading">
                <h3>Appearance</h3>
                <p>Choose a theme for the Settings page.</p>
              </div>

              <div className="settings-theme-options">
                <button
                  type="button"
                  className={`settings-theme-option ${
                    settings.theme === "light" ? "selected" : ""
                  }`}
                  onClick={() => updateSetting("theme", "light")}
                >
                  <div className="settings-theme-preview theme-preview-light">
                    <Sun size={25} />
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>Light</strong>
                  <span>Clean and bright</span>
                </button>

                <button
                  type="button"
                  className={`settings-theme-option ${
                    settings.theme === "dark" ? "selected" : ""
                  }`}
                  onClick={() => updateSetting("theme", "dark")}
                >
                  <div className="settings-theme-preview theme-preview-dark">
                    <Moon size={25} />
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>Dark</strong>
                  <span>Low-light appearance</span>
                </button>
              </div>

              <div className="settings-info-note">
                <Monitor size={17} />
                <span>
                  This theme applies to the Settings page only. Your other
                  pages keep their existing appearance.
                </span>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="settings-card">
              <div className="settings-card-heading">
                <h3>Demo session</h3>
                <p>Information about your current frontend-only session.</p>
              </div>

              <div className="settings-security-row">
                <div className="settings-security-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <strong>Authenticated session</strong>
                  <p>
  Your access token and user information are stored in session storage.
</p>
                </div>
                <span className="settings-status-badge">DEMO</span>
              </div>

              <div className="settings-info-note">
                <ShieldCheck size={17} />
                <span>
                  Password changes and real account security are unavailable
                  until backend authentication is implemented.
                </span>
              </div>

              <button
                type="button"
                className="settings-logout-button"
                onClick={logout}
              >
                <LogOut size={18} />
                Log out of EduPulse AI
              </button>
            </div>
          )}

          {saveError && (
            <div className="settings-message error" role="alert">
              {saveError}
            </div>
          )}

          {savedMessage && (
            <div className="settings-message success" role="status">
              <CheckCircle2 size={18} />
              {savedMessage}
            </div>
          )}

          <div className="settings-actions">
            <button
              type="button"
              className="settings-reset-button"
              onClick={resetSettings}
            >
              <RotateCcw size={17} />
              Reset defaults
            </button>

            <button type="submit" className="settings-save-button">
              <Save size={18} />
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
