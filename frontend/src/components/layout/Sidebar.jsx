
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Users,
  ChartNoAxesCombined,
  GraduationCap,
  Network,
  Settings,
  Layers3,
} from "lucide-react";

const links = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Upload Students", path: "/upload", icon: Upload },
  { name: "Students", path: "/students", icon: Users },
  {
    name: "Learning Analytics",
    path: "/analytics",
    icon: ChartNoAxesCombined,
  },
  {
    name: "Student Segments",
    path: "/segments",
    icon: Layers3,
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <GraduationCap size={25} />
        </div>

        <div>
          <h2>EduPulse AI</h2>
          <p>Student Success Platform</p>
        </div>
      </div>

      <p className="nav-heading">WORKSPACE</p>

      <nav className="nav-links">
        {links.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <Network size={20} />

          <div>
            <strong>Student Success</strong>
            <p>Identify. Support. Improve.</p>
          </div>
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""}`
          }
        >
          <Settings size={19} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
