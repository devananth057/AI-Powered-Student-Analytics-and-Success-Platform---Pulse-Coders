
import { useEffect, useState, useCallback } from "react";
import {
  Users,
  GraduationCap,
  AlertTriangle,
  BriefcaseBusiness,
  ArrowRight,
  RefreshCw,
  CalendarClock,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

import StatCard from "../components/dashboard/StatCard";
import api from "../services/api";



const riskColors = {
  low: "#22A06B",
  medium: "#F59E0B",
  high: "#E5484D",
};

function formatRisk(risk) {
  if (!risk || risk === "unavailable") return "Unavailable";
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}



function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [interventions, setInterventions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
const loadDashboard = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const [studentsResponse, historyResponse, interventionsResponse] =
  await Promise.all([
    api.get("/students/"),
    api.get("/predictions/history", {
      params: { limit: 100, skip: 0 },
    }),
    api.get("/interventions/"),
  ]);

   const rawStudents = studentsResponse.data;

const backendStudents = Array.isArray(rawStudents)
  ? rawStudents
  : Array.isArray(rawStudents?.value)
    ? rawStudents.value
    : [];

const normalizedStudents = backendStudents.map((student) => ({
  ...student,
  id: String(student.student_id ?? student.id ?? ""),
  student_id: String(student.student_id ?? student.id ?? ""),
  name: student.name || `Student ${student.student_id ?? student.id ?? ""}`,
  department: student.department || "Not specified",
  successScore: null,
  academicRisk: "unavailable",
  placementRisk: "unavailable",
  segment: "Not yet classified",
})).filter((student) => student.id);
    const history = Array.isArray(historyResponse.data?.history)
      ? historyResponse.data.history
      : [];

    const latestByStudent = new Map();

for (const record of history) {
  if (
    record.prediction_type !== "student-analytics" ||
    !record.student_id
  ) {
    continue;
  }

  const key = String(record.student_id);
  const existing = latestByStudent.get(key);

  const recordTime = new Date(record.created_at || 0).getTime();
  const existingTime = existing
    ? new Date(existing.created_at || 0).getTime()
    : -Infinity;

  if (!existing || recordTime > existingTime) {
    latestByStudent.set(key, record);
  }
}

    
const studentsWithAnalytics = normalizedStudents.map((student) => {
  const analytics = latestByStudent.get(student.id)?.result;

  if (!analytics) return student;

  const successData = analytics.success_score;
  const academicData = analytics.academic_early_warning?.result;
  const placementData = analytics.placement_assessment?.result;
  const segmentationData = analytics.student_segmentation;

  const score =
    typeof successData === "number"
      ? successData
      : typeof successData?.success_score === "number"
      ? successData.success_score
      : typeof analytics.successScore === "number"
      ? analytics.successScore
      : null;

  return {
    ...student,
    successScore: score,
    academicRisk: (
      academicData?.predicted_outcome_risk ||
      analytics.academic_risk ||
      "unavailable"
    ).toLowerCase(),
    placementRisk: (
      placementData?.placement_risk ||
      analytics.placement_risk ||
      "unavailable"
    ).toLowerCase(),
    segment:
      segmentationData?.segment ||
      analytics.segment ||
      "Not yet classified",
  };
});


    const scoredStudents = studentsWithAnalytics.filter(
      (student) => typeof student.successScore === "number"
    );

    const averageSuccessScore = scoredStudents.length
      ? Math.round(
          scoredStudents.reduce(
            (total, student) => total + student.successScore,
            0
          ) / scoredStudents.length
        )
      : null;

    const riskCounts = (field) => ({
      low: studentsWithAnalytics.filter(
        (student) => student[field] === "low"
      ).length,
      medium: studentsWithAnalytics.filter(
        (student) => student[field] === "medium"
      ).length,
      high: studentsWithAnalytics.filter(
        (student) => student[field] === "high"
      ).length,
    });

    setStudents(studentsWithAnalytics);
    setInterventions(
  Array.isArray(interventionsResponse.data?.interventions)
    ? interventionsResponse.data.interventions
    : []
);

    setOverview({
      isMock: false,
      totalStudents: studentsWithAnalytics.length,
      averageSuccessScore,
      academicRiskDistribution: riskCounts("academicRisk"),
      placementRiskDistribution: riskCounts("placementRisk"),
      segmentDistribution: [],
      trends: {
        academicPerformance: [],
        attendance: [],
        lmsEngagement: [],
        placementReadiness: [],
        note: "Historical trend data is not available from the current backend.",
      },
    });
  } catch (err) {
    console.error("Dashboard loading failed:", err);

    setError(
      err.response?.status === 401
        ? "Your session has expired. Please log in again."
        : err.response?.status === 403
        ? "Your account does not have permission to load this dashboard."
        : "Unable to load dashboard data. Check the backend connection."
    );
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
  loadDashboard();

  const handleFocus = () => loadDashboard();

  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("focus", handleFocus);
  };
}, [loadDashboard]);

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Faculty Dashboard</h1>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="dashboard">
        <h1>Faculty Dashboard</h1>
        <p role="alert">
          {error || "Dashboard data is unavailable."}
        </p>
        <button
          type="button"
          className="subtle-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  // Charts and risk summaries remain based on the existing mock data.
  // Imported students have no risk classifications yet.
  
const academicDistribution = [
  {
    name: "Low Risk",
    value: overview.academicRiskDistribution.low,
    color: riskColors.low,
  },
  {
    name: "Medium Risk",
    value: overview.academicRiskDistribution.medium,
    color: riskColors.medium,
  },
  {
    name: "High Risk",
    value: overview.academicRiskDistribution.high,
    color: riskColors.high,
  },
];

const classifiedAcademicStudents = students.filter((student) =>
  ["low", "medium", "high"].includes(
    String(student.academicRisk).toLowerCase()
  )
).length;

const classifiedPlacementStudents = students.filter((student) =>
  ["low", "medium", "high"].includes(
    String(student.placementRisk).toLowerCase()
  )
).length;


  const placementDistribution = overview.placementRiskDistribution;

  const stats = [
    {
      title: "Total Students",
      value: students.length,
      description:"Student records retrieved from the backend",
      icon: Users,
      color: "blue",
    },
    {
      title: "Average Success Score",
      value:
        overview.averageSuccessScore == null
          ? "Unavailable"
          : `${overview.averageSuccessScore}/100`,
      description: "Based on available student analytics",
      icon: GraduationCap,
      color: "green",
    },
    {
      title: "High Academic Risk",
      value: overview.academicRiskDistribution.high,
      description: "Based on available predictions",
      icon: AlertTriangle,
      color: "amber",
    },
    {
      title: "High Placement Risk",
      value: placementDistribution.high,
      description: "Based on available predictions",
      icon: BriefcaseBusiness,
      color: "purple",
    },
  ];

 const pendingFollowUps = interventions.filter((item) => {
  const status = String(item.status || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  return ["pending", "planned", "in progress"].includes(status);
}).length;

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Faculty Dashboard</h1>
          <p className="page-subtitle">
            Monitor academic performance, student success and placement
            readiness.
          </p>
        </div>

        
      </div>

  

      <section className="stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel distribution-panel">
          <div className="panel-heading">
            <div>
              <h2>Academic Risk Distribution</h2>
              <p>Based on available prediction results</p>
            </div>
          </div>

          <div className="distribution-content">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={academicDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {academicDistribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="distribution-legend">
              {academicDistribution.map((item) => (
                <div className="legend-item" key={item.name}>
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p>{item.name}</p>
                    <strong>{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel followup-panel">
          <div className="panel-heading">
            <div>
              <h2>Intervention Follow-ups</h2>
              <p>Live intervention records from the backend</p>
            </div>
            <CalendarClock size={21} />
          </div>

          <div className="followup-number">
            {pendingFollowUps}
          </div>

          <p className="followup-description">
            Interventions not yet marked completed.
          </p>

          <div className="followup-note">
  <CalendarClock size={19} />
  <span>
    {interventions.length === 0
      ? "No interventions recorded yet."
      : `${interventions.length} persistent intervention record(s) loaded.`}
  </span>
</div>
        </article>
      </section>

      <section className="panel students-panel">
        <div className="panel-heading">
          <div>
            <h2>Student Overview</h2>
            <p>
  Student scores and risk classifications appear when
  prediction results are available.
</p>
          </div>

          <a href="/students" className="view-all-link">
            View all <ArrowRight size={16} />
          </a>
        </div>

        {students.length === 0 ? (
          <p>No student records are available.</p>
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Success Score</th>
                  <th>Academic Risk</th>
                  <th>Placement Risk</th>
                  <th>Segment</th>
                </tr>
              </thead>

              <tbody>
                {students.slice(0, 5).map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {student.name.slice(-1)}
                        </div>
                        <div>
                          <strong>{student.name}</strong>
                          <span>{student.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {student.successScore == null
                        ? "Unavailable"
                        : `${student.successScore}/100`}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          student.academicRisk === "high"
                            ? "status-warning"
                            : student.academicRisk === "low"
                              ? "status-success"
                              : "status-info"
                        }`}
                      >
                        {formatRisk(student.academicRisk)}
                      </span>
                    </td>

                    <td>{formatRisk(student.placementRisk)}</td>

                    <td>{student.segment || "Unavailable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Placement Risk Summary</h2>
            <p>Based on available prediction results</p>
          </div>
        </div>

        <div className="distribution-legend">
          {Object.entries(placementDistribution).map(([risk, count]) => (
            <div className="legend-item" key={risk}>
              <div>
                <p>{formatRisk(risk)} placement risk</p>
                <strong>{count}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <button
        type="button"
        className="dashboard-refresh-button"
        onClick={loadDashboard}
        disabled={loading}
        >
        <RefreshCw
          size={17}
          className={loading ? "refresh-spinning" : ""}
        />
        {loading ? "Refreshing..." : "Refresh Dashboard"}
      </button>

    </div>
  );
}

export default Dashboard;
