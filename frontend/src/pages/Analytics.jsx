
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  BookOpen,
  Target,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";

import api from "../services/api";



const COLORS = {
  onTrack: "#16a34a",
  support: "#d97706",
  atRisk: "#dc2626",
  unavailable: "#94a3b8",
};

const INDICATORS = [
  { key: "attendance", label: "Attendance" },
  { key: "academicAverage", label: "Academics" },
  { key: "lmsEngagement", label: "LMS" },
  { key: "placementReadiness", label: "Placement" },
  { key: "skillsAssessment", label: "Skills" },
];



function getAcademicClassification(student) {
  const risk = String(student.academicRisk || "").toLowerCase();

  if (risk === "high") return "At Risk";
  if (risk === "medium") return "Needs Support";
  if (risk === "low") return "On Track";

  return "Unavailable";
}

function getPlacementClassification(student) {
  const risk = String(student.placementRisk || "").toLowerCase();

  if (risk === "high") return "High Risk";
  if (risk === "medium") return "Medium Risk";
  if (risk === "low") return "Low Risk";

  return "Unavailable";
}



function getNumericValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}


function getIndicatorValue(student, key) {
  const indicator = student.indicators?.[key];

  if (!indicator || indicator.available === false) {
    return null;
  }

  return getNumericValue(indicator.value);
}

function AnalyticsCard({ icon: Icon, label, value, description }) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-icon">
        <Icon size={22} />
      </div>
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{description}</span>
      </div>
    </div>
  );
}

function DistributionChart({
  title,
  description,
  data,
  emptyMessage,
}) {
  const chartData = data.filter((item) => item.value > 0);

  return (
    <section className="analytics-chart-card">
      <div className="analytics-chart-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="analytics-pie-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={88}
                innerRadius={50}
                paddingAngle={3}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} student${value === 1 ? "" : "s"}`,
                  name,
                ]}
              />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="analytics-state analytics-trend-empty">
          <AlertCircle size={24} />
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export default function Analytics() {
  const [students, setStudents] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 
const loadAnalytics = useCallback(async () => {
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

    const history = Array.isArray(historyResponse.data?.history)
      ? historyResponse.data.history
      : [];

    const backendInterventions = Array.isArray(
      interventionsResponse.data?.interventions
    )
      ? interventionsResponse.data.interventions
      : [];

    // Keep the newest student-analytics prediction for each student.
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

      if (
        !existing ||
        new Date(record.created_at || 0).getTime() >
          new Date(existing.created_at || 0).getTime()
      ) {
        latestByStudent.set(key, record);
      }
    }

    const backendAnalyticsStudents = backendStudents.map((student) => {
      const studentId = String(student.student_id ?? student.id ?? "");
      const record = latestByStudent.get(studentId);
      const result = record?.result ?? {};
      const success = result.success_score;
      const academic = result.academic_early_warning?.result;
      const placement = result.placement_assessment?.result;
      const segmentation = result.student_segmentation;

      return {
        ...student,
        id: studentId,
        name: student.name || `Student ${studentId}`,
        successScore:
          typeof success?.success_score === "number"
            ? success.success_score
            : null,
        academicRisk: academic?.predicted_outcome_risk || "unavailable",
        placementRisk: placement?.placement_risk || "unavailable",
        segment: segmentation?.segment || "Not yet classified",
        indicators: {
          attendance: { available: false, value: null },
          academicAverage: {
            available: typeof record?.input?.early_average_score === "number",
            value: record?.input?.early_average_score ?? null,
          },
          lmsEngagement: {
  available: false,
  value: null,
},
          placementReadiness: {
            available:
              typeof placement?.placement_probability === "number",
            value:
              typeof placement?.placement_probability === "number"
                ? placement.placement_probability * 100
                : null,
          },
          skillsAssessment: {
            available:
              typeof record?.input?.AptitudeTestScore === "number",
            value: record?.input?.AptitudeTestScore ?? null,
          },
        },
      };
    });

    setStudents(backendAnalyticsStudents);

    setInterventions(
      backendInterventions.map((item) => ({
        ...item,
        studentId: item.student_id,
        owner: item.assigned_to,
        notes: item.description,
        status: String(item.status || "pending")
          .replaceAll("_", " ")
          .replace(/\b\w/g, (character) => character.toUpperCase()),
      }))
    );
  } catch (err) {
    console.error("Failed to load analytics:", err);

    setError(
      err.response?.status === 401
        ? "Your session has expired. Please log in again."
        : err.response?.status === 403
          ? "Your account does not have permission to view analytics."
          : "Unable to load learning analytics from the backend. Please try again."
    );
  } finally {
    setLoading(false);
  }
}, []);


  
useEffect(() => {
  loadAnalytics();

  const refreshOnFocus = () => {
    loadAnalytics();
  };

  window.addEventListener("focus", refreshOnFocus);

  return () => {
    window.removeEventListener("focus", refreshOnFocus);
  };
}, [loadAnalytics]);


  const analytics = useMemo(() => {
    const academic = [
      { name: "On Track", value: 0, color: COLORS.onTrack },
      { name: "Needs Support", value: 0, color: COLORS.support },
      { name: "At Risk", value: 0, color: COLORS.atRisk },
      { name: "Unavailable", value: 0, color: COLORS.unavailable },
    ];

    const placement = [
      { name: "Low Risk", value: 0, color: COLORS.onTrack },
      { name: "Medium Risk", value: 0, color: COLORS.support },
      { name: "High Risk", value: 0, color: COLORS.atRisk },
      { name: "Unavailable", value: 0, color: COLORS.unavailable },
    ];

    students.forEach((student) => {
      const academicLabel = getAcademicClassification(student);
      const academicItem = academic.find(
        (item) => item.name === academicLabel
      );
      if (academicItem) academicItem.value += 1;

      const placementLabel = getPlacementClassification(student);
      const placementItem = placement.find(
        (item) => item.name === placementLabel
      );
      if (placementItem) placementItem.value += 1;
    });

    const successScores = students
  .map((student) => getNumericValue(student.successScore))
  .filter((score) => score !== null);

    const averageScore =
      successScores.length > 0
        ? (
            successScores.reduce((sum, score) => sum + score, 0) /
            successScores.length
          ).toFixed(1)
        : null;

    const indicatorAverages = INDICATORS.map(({ key, label }) => {
      const values = students
        .map((student) => getIndicatorValue(student, key))
        .filter((value) => value !== null);

      return {
        subject: label,
        score:
          values.length > 0
            ? Math.round(
                values.reduce((sum, value) => sum + value, 0) /
                  values.length
              )
            : null,
        availableCount: values.length,
      };
    });

    const academicRiskCount = academic
      .filter((item) =>
        ["Needs Support", "At Risk"].includes(item.name)
      )
      .reduce((sum, item) => sum + item.value, 0);

    const pendingInterventions = interventions.filter((item) => {
      const status = String(item.status || "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .trim();

      return status === "planned" || status === "in progress";
    }).length;

    return {
      totalStudents: students.length,
      averageScore,
      scoreCount: successScores.length,
      academic,
      placement,
      indicatorAverages,
      academicRiskCount,
      pendingInterventions,
      interventionCount: interventions.length,
      indicatorsWithData: indicatorAverages.filter(
        (item) => item.score !== null
      ).length,
    };
  }, [students, interventions]);

  const hasStudents = students.length > 0;
  const hasScores = analytics.averageScore !== null;

  return (
    <div className="analytics-page">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">CLASS PERFORMANCE</p>
          <h1>Learning Analytics</h1>
          <p className="page-description">
            Review student classifications, available academic indicators,
            placement readiness and intervention workload.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      

      {error && (
        <div className="analytics-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadAnalytics}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="analytics-state">
          Loading learning analytics...
        </div>
      ) : !hasStudents ? (
        <div className="analytics-state">
          No student data is available to calculate analytics.
        </div>
      ) : (
        <>
          <div className="analytics-stats-grid">
            <AnalyticsCard
              icon={Users}
              label="Student Records"
              value={analytics.totalStudents}
              description="Students retrieved from the backend"
            />

            <AnalyticsCard
              icon={TrendingUp}
              label="Average Success Score"
              value={hasScores ? `${analytics.averageScore}/100` : "N/A"}
              description={`${analytics.scoreCount} records with available scores`}
            />

            <AnalyticsCard
              icon={BookOpen}
              label="Indicators Available"
              value={analytics.indicatorsWithData}
              description="Indicator categories with numeric data"
            />

            <AnalyticsCard
              icon={Target}
              label="Academic Risk"
              value={analytics.academicRiskCount}
              description="Students labelled medium or high risk"
            />
          </div>

          <div className="analytics-charts-grid">
            <DistributionChart
              title="Academic Risk Classification"
              description="Distribution of available academic risk labels"
              data={analytics.academic}
              emptyMessage="Academic risk classifications are unavailable."
            />

            <DistributionChart
              title="Placement Risk Classification"
              description="Distribution of available placement risk labels"
              data={analytics.placement}
              emptyMessage="Placement risk classifications are unavailable."
            />
          </div>

          <div className="analytics-charts-grid">
            <section className="analytics-chart-card">
              <div className="analytics-chart-heading">
                <div>
                  <h2>Student Indicator Averages</h2>
                  <p>
                    Mean of available values per indicator. Missing values
                    are excluded rather than treated as zero.
                  </p>
                </div>
              </div>

              <div className="analytics-bar-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.indicatorAverages}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, _name, item) =>
                        value === null || value === undefined
                          ? ["Unavailable", "Average"]
                          : [
                              `${value}% (${item.payload.availableCount} records)`,
                              "Average",
                            ]
                      }
                    />
                    <Bar
                      dataKey="score"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              
            </section>

            <section className="analytics-chart-card">
              <div className="analytics-chart-heading">
                <div>
                  <h2>Intervention Overview</h2>
                  <p>
                    Interventions retrieved from the backend.
                  </p>
                </div>
              </div>

              <div className="analytics-intervention-summary">
                <div>
                  <ClipboardCheck size={21} />
                  <span>Total recorded interventions</span>
                  <strong>{analytics.interventionCount}</strong>
                </div>
                <div>
                  <RefreshCw size={21} />
                  <span>Planned or in progress</span>
                  <strong>{analytics.pendingInterventions}</strong>
                </div>
              </div>

              <div className="analytics-state analytics-trend-empty">
                <p>
                  Intervention outcomes and before-and-after score changes
                  will appear when actual follow-up assessment results are
                  recorded.
                </p>
              </div>
            </section>
          </div>

          <section className="analytics-chart-card analytics-trend-card">
            <div className="analytics-chart-heading">
              <div>
                <h2>Assessment Trends</h2>
                <p>
                  A historical trend requires dated assessment records for
                  the same student or cohort.
                </p>
              </div>
            </div>

            <div className="analytics-state analytics-trend-empty">
              <TrendingUp size={24} />
              <p>
               Historical assessment time-series data is not yet available from the current backend.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
