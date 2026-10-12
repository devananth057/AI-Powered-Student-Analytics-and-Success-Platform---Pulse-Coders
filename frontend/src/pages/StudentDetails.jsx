import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  CalendarCheck,
  BookOpen,
  ClipboardCheck,
  Network,
  CheckCircle2,
  Clock,
  ArrowRight,
  BriefcaseBusiness,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import api from "../services/api";

const tabs = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "gaps", label: "Learning Gaps", icon: Network },
  { id: "plan", label: "Recovery Plan", icon: BookOpen },
  {
    id: "history",
    label: "Intervention History",
    icon: ClipboardCheck,
  },
];

const riskColors = {
  low: "#22A06B",
  medium: "#F59E0B",
  high: "#E5484D",
  unavailable: "#94A3B8",
};

function formatRisk(value) {
  if (!value || value.toLowerCase() === "unavailable") {
    return "Unavailable";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function RiskBadge({ label, risk }) {
  const normalizedRisk = risk?.toLowerCase();
  const color = riskColors[normalizedRisk] || riskColors.unavailable;

  return (
    <div className="profile-risk-item">
      <span>{label}</span>
      <span
        className="classification-badge"
        style={{ borderColor: color, color }}
      >
        <span
          className="classification-dot"
          style={{ backgroundColor: color }}
        />
        {formatRisk(risk)}
      </span>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }) {
  return (
    <article className="profile-metric">
      <div className={`profile-metric-icon ${color}`}>
        <Icon size={21} />
      </div>
      <p>{title}</p>
      <h3>{value}</h3>
    </article>
  );
}

function IndicatorCard({ label, indicator }) {
  const available =
    indicator?.available === true &&
    indicator.value !== null &&
    indicator.value !== undefined &&
    indicator.value !== "";

  return (
    <article className="panel indicator-card">
      <span>{label}</span>
      <strong>
        {available
          ? `${indicator.value}${indicator.unit || ""}`
          : "Unavailable"}
      </strong>

      {!available && (
        <p className="indicator-note">
          This indicator has no available value.
        </p>
      )}
    </article>
  );
}

function getUploadedStudent(id) {
  try {
    const stored = localStorage.getItem("edupulse_uploaded_students");
    const records = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(records)) {
      return null;
    }

    return (
      records.find(
        (record) =>
          String(record?.student_id ?? "").toUpperCase() ===
          String(id ?? "").toUpperCase()
      ) || null
    );
  } catch (error) {
    console.error("Unable to read uploaded students:", error);
    return null;
  }
}

function createCsvIndicator(value, unit = "") {
  const available =
    value !== null &&
    value !== undefined &&
    value !== "" &&
    (typeof value === "number" ||
      (typeof value === "string" && value.trim() !== ""));

  return {
    available,
    value: available ? value : null,
    unit,
  };
}

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [student, setStudent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  let active = true;

  async function loadStudent() {
    setLoading(true);
    setError("");
    setStudent(null);
    setAnalytics(null);

    try {
      const normalizedId = String(id || "").trim().toUpperCase();

      // Fetch actual students from the backend.
      const studentResponse = await api.get("/students/");
      const studentPayload = studentResponse.data;

      const students = Array.isArray(studentPayload)
        ? studentPayload
        : Array.isArray(studentPayload?.value)
          ? studentPayload.value
          : [];

      const foundStudent = students.find((item) => {
        const studentId = String(
          item.student_id ?? item.id ?? item._id ?? ""
        )
          .trim()
          .toUpperCase();

        return studentId === normalizedId;
      });

      if (!active) return;

      if (!foundStudent) {
        setStudent(null);
        return;
      }

      setStudent({
        ...foundStudent,
        id: String(
          foundStudent.student_id ??
          foundStudent.id ??
          foundStudent._id
        ),
        name: foundStudent.name || "Name unavailable",
        department:
          foundStudent.department ||
          foundStudent.dept ||
          "Department unavailable",
        course:
          foundStudent.course ||
          foundStudent.program ||
          "Course unavailable",
        progress: [],
        gaps: [],
        interventions: [],
        isUploadedCsv: false,
      });

      // Fetch real prediction history for this student.
      try {
        const predictionResponse = await api.get(
          "/predictions/history?limit=100&skip=0"
        );

        const history = Array.isArray(predictionResponse.data?.history)
          ? predictionResponse.data.history
          : [];

        const matchingRecords = history
          .filter((record) => {
            const recordStudentId = String(
              record.student_id ??
              record.input?.student_id ??
              ""
            )
              .trim()
              .toUpperCase();

            return recordStudentId === normalizedId;
          })
          .sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          );

        const latest = matchingRecords.find(
          (record) =>
            record.result?.student_analytics ||
            record.result?.success_score ||
            record.result?.academic_early_warning ||
            record.result?.placement_assessment
        );

        if (!active) return;

        if (latest) {
          const result = latest.result || {};
         console.log(
  "STUDENT RECORD:",
  JSON.stringify(foundStudent, null, 2)
);

console.log(
  "LATEST PREDICTION INPUT:",
  JSON.stringify(latest.input, null, 2)
);

console.log(
  "LATEST PREDICTION RESULT:",
  JSON.stringify(latest.result, null, 2)
);
          const success = result.success_score || {};
          const academic = result.academic_early_warning || {};
          const academicResult = academic.result || {};
const modelExplanation = academicResult.model_explanation || {};

const topRiskContributors =
  modelExplanation.top_risk_contributors || [];

const topProtectiveContributors =
  modelExplanation.top_protective_contributors || [];

const reasonsForReview =
  academicResult.reasons_for_review || [];

const modelRecommendedActions =
  academicResult.recommended_actions || [];
          const placement = result.placement_assessment || {};

          
const academicRisk =
  academic.result?.predicted_outcome_risk || null;

const placementRisk =
  placement.result?.placement_risk || null;

const successScore =
  typeof success.success_score === "number"
    ? success.success_score
    : null;

const riskReasons = [];
const recommendations = [];

if (academicRisk?.toLowerCase() === "high") {
  riskReasons.push(
    "The academic-risk model classified this student as High risk."
  );
  recommendations.push(
    "Arrange an academic review and targeted faculty mentoring."
  );
} else if (academicRisk?.toLowerCase() === "medium") {
  riskReasons.push(
    "The academic-risk model classified this student as Medium risk."
  );
  recommendations.push(
    "Monitor academic progress and schedule regular faculty check-ins."
  );
} else if (academicRisk?.toLowerCase() === "low") {
  riskReasons.push(
    "The academic-risk model classified this student as Low risk."
  );
  recommendations.push(
    "Continue regular academic monitoring and review future assessments."
  );
}

if (placementRisk?.toLowerCase() === "high") {
  riskReasons.push(
    "The placement model classified this student as High risk."
  );
  recommendations.push(
    "Prioritize aptitude practice, technical preparation, and mock interviews."
  );
} else if (placementRisk?.toLowerCase() === "medium") {
  riskReasons.push(
    "The placement model classified this student as Medium risk."
  );
  recommendations.push(
    "Strengthen placement preparation and track progress through practice assessments."
  );
} else if (placementRisk?.toLowerCase() === "low") {
  riskReasons.push(
    "The placement model classified this student as Low risk."
  );
  recommendations.push(
    "Continue placement preparation and validate readiness through mock interviews."
  );
}

if (successScore !== null && successScore < 50) {
  recommendations.push(
    "Review the student's performance indicators and create measurable improvement goals."
  );
}

const studentData = foundStudent;

const getIndicator = (value, unit = "%") => {
  const available =
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value));

  return {
    available,
    value: available ? Number(value) : null,
    unit,
  };
};

const attendanceValue =
  studentData.attendance_percentage ??
  studentData.attendancePercentage;

const academicValue =
  studentData.academic_average ??
  studentData.academicAverage ??
  studentData.previous_marks ??
  studentData.previousMarks;

const assignmentValue =
  studentData.assignment_completion ??
  studentData.assignmentCompletion;

const internalMarksValue =
  studentData.internal_marks ??
  studentData.internalMarks;

const indicators = {
  attendance: getIndicator(
    studentData.attendance_percentage ??
    studentData.attendancePercentage
  ),

  academicAverage: getIndicator(
    latest.input?.early_average_score
  ),

  lmsEngagement: getIndicator(
    latest.input?.early_total_clicks,
    " clicks"
  ),

  placementReadiness: getIndicator(
    placement.result?.placement_probability != null
      ? Number(placement.result.placement_probability) * 100
      : null
  ),

  skillsAssessment: getIndicator(
    latest.input?.AptitudeTestScore
  ),

  feedback: getIndicator(
    latest.input?.SoftSkillsRating,
    " / 5"
  ),

  cgpa: getIndicator(
    latest.input?.CGPA,
    " / 10"
  ),

  assignmentCompletion: getIndicator(
    studentData.assignment_completion ??
    studentData.assignmentCompletion
  ),

  internalMarks: getIndicator(
    studentData.internal_marks ??
    studentData.internalMarks
  ),
};

const availableCount = Object.values(indicators).filter(
  (item) => item.available
).length;

setAnalytics({
  successScore,
  academicRisk,
  placementRisk,
  dataCoverage: Math.round(
    (availableCount / Object.keys(indicators).length) * 100
  ),
  indicators,
  scoreContributions: [],
  riskReasons,
  recommendations,
  topRiskContributors,
  topProtectiveContributors,
  reasonsForReview,
  modelRecommendedActions,
});

        }
      } catch (predictionError) {
        console.error(
          "Unable to load student predictions:",
          predictionError
        );
        // Keep the student profile visible if predictions are unavailable.
      }

      // Fetch actual intervention records for this student.
try {
  const interventionResponse = await api.get("/interventions/");
  const payload = interventionResponse.data;

  const interventions = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.interventions)
      ? payload.interventions
      : [];

  const studentInterventions = interventions.filter((item) => {
    const interventionStudentId = String(
      item.student_id ?? item.student?.student_id ?? ""
    )
      .trim()
      .toUpperCase();

    return interventionStudentId === normalizedId;
  });

  if (active) {
    setStudent((current) =>
      current
        ? {
            ...current,
            interventions: studentInterventions.map((item) => ({
              ...item,
              type: item.title || item.type || "Intervention",
              date: item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "Date unavailable",
              status: item.status || "Pending",
            })),
          }
        : current
    );
  }
} catch (interventionError) {
  console.error(
    "Unable to load intervention history:",
    interventionError
  );
}
    } catch (err) {
      console.error("Failed to load student profile:", err);

      if (active) {
        setError(
          err.response?.status === 401
            ? "Your session has expired. Please log in again."
            : "Unable to load the student profile. Check the backend connection."
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  loadStudent();

  return () => {
    active = false;
  };
}, [id]);

  if (loading) {
    return (
      <div className="profile-page">
        <h1>Student Profile</h1>
        <p>Loading student information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel profile-not-found">
        <AlertTriangle size={36} />
        <h2>Unable to load profile</h2>
        <p>{error}</p>

        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="panel profile-not-found">
        <UserRound size={36} />
        <h2>Student record not found</h2>
        <p>
          This ID does not exist in the current demo or uploaded
          student records.
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => navigate("/students")}
        >
          Back to Students
        </button>
      </div>
    );
  }

  const isUploadedCsv = student.isUploadedCsv === true;

  const indicators = analytics?.indicators || {};
  const contributions = analytics?.scoreContributions || [];
  const riskReasons = analytics?.riskReasons || [];
  const recommendations = analytics?.recommendations || [];

  const availableIndicators = Object.values(indicators).filter(
    (item) =>
      item?.available === true &&
      item.value !== null &&
      item.value !== undefined &&
      item.value !== ""
  ).length;

  const totalIndicators = Object.keys(indicators).length;

  const scoreChartData = contributions.filter(
    (item) => typeof item.contribution === "number"
  );

  const progress = student.progress || [];

  const score =
    typeof analytics?.successScore === "number"
      ? analytics.successScore
      : null;

  const uploadedIndicators = [
    {
      label: "Attendance",
      indicator: createCsvIndicator(
        student.attendance_percentage,
        "%"
      ),
    },
    {
      label: "Previous Marks",
      indicator: createCsvIndicator(
        student.previous_marks,
        "%"
      ),
    },
    {
      label: "Internal Marks",
      indicator: createCsvIndicator(
        student.internal_marks,
        "%"
      ),
    },
    {
      label: "Assignment Completion",
      indicator: createCsvIndicator(
        student.assignment_completion,
        "%"
      ),
    },
    {
      label: "Subject",
      indicator: createCsvIndicator(student.subject),
    },
  ];

  const attendance = isUploadedCsv
  ? createCsvIndicator(
      student.attendance_percentage,
      "%"
    )
  : indicators.attendance;

  const academicAverage = isUploadedCsv
    ? uploadedIndicators[1].indicator
    : indicators.academicAverage;

  return (
    <div className="profile-page">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/students")}
      >
        <ArrowLeft size={17} />
        Back to Students
      </button>

      {/* Student identity */}
      <div className="profile-banner">
        <div className="profile-identity">
          <div className="profile-avatar">
            <UserRound size={32} />
          </div>

          <div>
            <p className="eyebrow">STUDENT PROFILE</p>
            <h1>{student.name}</h1>

            <p className="profile-id">
              ID: {student.id}
              {" · "}
              {student.department || "Department unavailable"}
            </p>

            <p className="profile-id">
              {student.course || "Course unavailable"}
              {student.cohort ? ` · Cohort ${student.cohort}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Data status */}
      <div className="demo-notice">
        <Clock size={19} />
        <div>
          <strong>
            {isUploadedCsv ? "Imported CSV record" : "Backend-connected student profile"}
          </strong>

          <p>
            {isUploadedCsv
              ? "The details below come from your uploaded CSV file. Success Score and risk predictions are unavailable until calculated."
              : "Student information and available prediction results are loaded from the backend. Some indicators and recommendations may not be available."}
          </p>
        </div>
      </div>

      {/* Success score */}
      <section className="panel profile-score-panel">
        <div className="panel-heading">
          <div>
            <h2>Student Success Score</h2>
            <p>
              {isUploadedCsv
                ? "A score will be available after calculation."
                : "Illustrative score and indicator availability"}
            </p>
          </div>

          <GraduationCapFallback />
        </div>

        <div className="success-score-display">
          <strong>{score !== null ? score : "Unavailable"}</strong>
          <span>{score !== null ? "/ 100" : ""}</span>
        </div>

        {score !== null && (
          <div
            className="score-progress-track"
            role="progressbar"
            aria-label="Student Success Score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
          >
            <div
              className="score-progress-fill"
              style={{
                width: `${Math.max(0, Math.min(100, score))}%`,
              }}
            />
          </div>
        )}

        <div className="data-coverage">
          <div>
            <span>Data coverage</span>
            <strong>
              {typeof analytics?.dataCoverage === "number"
                ? `${analytics.dataCoverage}%`
                : "Unavailable"}
            </strong>
          </div>

          <p>
            {totalIndicators > 0
              ? `${availableIndicators} of ${totalIndicators} indicators available`
              : "Indicator availability has not been provided."}
          </p>
        </div>
      </section>

      {/* Separate risk assessments */}
      <section className="panel profile-risk-panel">
        <div className="panel-heading">
          <div>
            <h2>Risk Assessment</h2>
            <p>
              Academic risk and placement risk are separate outputs
            </p>
          </div>
          <AlertTriangle size={21} />
        </div>

        <div className="profile-risk-grid">
          <RiskBadge
            label="Academic Risk"
            risk={analytics?.academicRisk}
          />

          <RiskBadge
            label="Placement Risk"
            risk={analytics?.placementRisk}
          />
        </div>
      </section>

      {/* Profile tabs */}
      <nav
        className="profile-tabs"
        aria-label="Student profile sections"
      >
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            className={`profile-tab ${
              activeTab === tabId ? "selected" : ""
            }`}
            onClick={() => setActiveTab(tabId)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      {/* Overview */}
      {activeTab === "overview" && (
        <>
          <section className="profile-metrics">
            <MetricCard
              title="Attendance"
              value={
                attendance?.available
                  ? `${attendance.value}${attendance.unit || "%"}`
                  : "Unavailable"
              }
              icon={CalendarCheck}
              color="blue"
            />

            <MetricCard
              title="Academic Average"
              value={
                academicAverage?.available
                  ? `${academicAverage.value}${academicAverage.unit || "%"}`
                  : "Unavailable"
              }
              icon={BookOpen}
              color="purple"
            />

            <MetricCard
  title="LMS Activity"
  value={
    indicators.lmsEngagement?.available
      ? `${indicators.lmsEngagement.value} clicks`
      : "Unavailable"
  }
  icon={TrendingUp}
  color="amber"
/>

            <MetricCard
              title="Placement Readiness"
              value={
                indicators.placementReadiness?.available
                  ? `${indicators.placementReadiness.value}%`
                  : "Unavailable"
              }
              icon={BriefcaseBusiness}
              color="green"
            />
          </section>

          {isUploadedCsv && (
            <section className="panel profile-section-panel">
              <div className="panel-heading">
                <div>
                  <h2>Imported Student Data</h2>
                  <p>
                    Values read directly from the uploaded CSV file
                  </p>
                </div>
              </div>

              <div className="indicator-grid">
                {uploadedIndicators.map(({ label, indicator }) => (
                  <IndicatorCard
                    key={label}
                    label={label}
                    indicator={indicator}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="panel profile-section-panel">
            <div className="panel-heading">
              <div>
                <h2>Indicator Breakdown</h2>
                <p>
                  Available academic, learning-platform, placement and
skills indicators
                </p>
              </div>
            </div>

            <div className="indicator-grid">
              <IndicatorCard
                label="Attendance"
                indicator={indicators.attendance}
              />
              <IndicatorCard
                label="Academic Performance"
                indicator={indicators.academicAverage}
              />
              <IndicatorCard
                label="LMS Engagement"
                indicator={indicators.lmsEngagement}
              />
              <IndicatorCard
                label="Placement Readiness"
                indicator={indicators.placementReadiness}
              />
              <IndicatorCard
                label="Skills Assessment"
                indicator={indicators.skillsAssessment}
              />
              <IndicatorCard
                label="Soft Skills Rating"
                indicator={indicators.feedback}
              />
            </div>
          </section>

          <section className="panel profile-chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Success Score Contributions</h2>
                <p>
                  Indicator contributions supplied by the data provider
                </p>
              </div>
            </div>

            {scoreChartData.length > 0 ? (
              <div className="profile-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scoreChartData}
                    layout="vertical"
                    margin={{
                      top: 10,
                      right: 20,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf1f7"
                      strokeDasharray="4 4"
                    />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="indicator"
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="contribution"
                      name="Contribution"
                    >
                      {scoreChartData.map((item, index) => (
                        <Cell
                          key={`${item.indicator}-${index}`}
                          fill={
                            item.direction === "unavailable"
                              ? riskColors.unavailable
                              : riskColors.low
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="profile-empty">
                Score contribution details are unavailable. No
                contributions have been invented.
              </div>
            )}

            <p className="section-description">
              Contributions explain the score breakdown. They are
              distinct from the reasons used by the academic-risk model.
            </p>
          </section>

          <section className="panel profile-section-panel">
            
<section className="panel profile-section-panel">
  <h2>Academic Risk — Model Explanation</h2>

  <p className="section-description">
    SHAP contributors show which input features influenced the
    model's academic-risk prediction. They do not establish causation.
  </p>

  <h3>Factors increasing predicted risk</h3>

  {analytics?.topRiskContributors?.length > 0 ? (
    analytics.topRiskContributors.map((item, index) => (
      <div
        className="profile-list-item"
        key={`risk-${item.feature}-${index}`}
      >
        <div className="profile-list-content">
          <strong>
            {item.feature.replaceAll("_", " ")}
          </strong>
          <p>
            Contribution: {Number(item.contribution).toFixed(5)}
          </p>
        </div>
      </div>
    ))
  ) : (
    <p className="profile-empty">
      No SHAP risk-contributor data is available.
    </p>
  )}

  <h3>Factors reducing predicted risk</h3>

  {analytics?.topProtectiveContributors?.length > 0 ? (
    analytics.topProtectiveContributors.map((item, index) => (
      <div
        className="profile-list-item"
        key={`protective-${item.feature}-${index}`}
      >
        <div className="profile-list-content">
          <strong>
            {item.feature.replaceAll("_", " ")}
          </strong>
          <p>
            Contribution: {Number(item.contribution).toFixed(5)}
          </p>
        </div>
      </div>
    ))
  ) : (
    <p className="profile-empty">
      No protective-factor data is available.
    </p>
  )}

  <p className="section-description">
    These contributions explain model behavior, not causation.
    Faculty should review the underlying student evidence before
    deciding on support.
  </p>
</section>

            <h2>Risk Reasons</h2>
            <p className="section-description">
              Reasons supplied with the available analytics response.
            </p>

            {riskReasons.length > 0 ? (
              riskReasons.map((reason, index) => (
                <div
                  className="profile-list-item"
                  key={`${reason}-${index}`}
                >
                  <div className="profile-list-icon purple-list-icon">
                    <AlertTriangle size={19} />
                  </div>
                  <div className="profile-list-content">
                    <strong>{reason}</strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="profile-empty">
                {isUploadedCsv
                  ? "Risk reasons are unavailable until the backend calculates them."
                  : "No risk reasons are configured for this sample record."}
              </div>
            )}
          </section>

          <section className="panel profile-section-panel">
            <h2>Recommendations</h2>
            <p className="section-description">
              Suggested actions from the available analytics response.
            </p>

            {recommendations.length > 0 ? (
              recommendations.map((recommendation, index) => (
                <div
                  className="profile-list-item"
                  key={`${recommendation}-${index}`}
                >
                  <div className="profile-list-icon green-list-icon">
                    <CheckCircle2 size={19} />
                  </div>
                  <div className="profile-list-content">
                    <strong>{recommendation}</strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="profile-empty">
                {isUploadedCsv
                  ? "Recommendations are unavailable until the student data has been analysed."
                  : "No recommendations are configured for this sample student."}
              </div>
            )}
          </section>

          <section className="panel profile-chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Assessment Performance</h2>
                <p>
                  Assessment history from the available student data
                </p>
              </div>
            </div>

            {progress.length > 0 ? (
              <div className="profile-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progress}
                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf1f7"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="assessment"
                      tick={{ fill: "#8290a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#8290a6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="marks"
                      name="Marks"
                      stroke="#3478f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#3478f6" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="profile-empty">
                {isUploadedCsv
                  ? "No assessment history was included in the uploaded CSV."
                  : "No assessment history is available for this sample student."}
              </div>
            )}
          </section>
        </>
      )}

      {/* Learning gaps */}
      {activeTab === "gaps" && (
        <section className="panel profile-section-panel">
          <h2>Learning Gaps</h2>
          <p className="section-description">
            Topic-level gaps require supporting assessment or LMS
            evidence. They must not be inferred from aggregate risk
            predictions alone.
          </p>

          <div className="profile-empty">
            {isUploadedCsv
              ? "Verified learning-gap data is not available for this uploaded record."
              : student.gaps?.length
                ? "The existing topic examples are illustrative and are not verified model findings. Review the learning graph before interpreting them."
                : "No verified concept-level learning-gap data is available for this sample student."}
          </div>

          {!isUploadedCsv && (
            <button
              type="button"
              className="primary-button profile-action"
              onClick={() =>
                navigate(`/students/${student.id}/learning-gaps`)
              }
            >
              Open Learning Graph <ArrowRight size={17} />
            </button>
          )}
        </section>
      )}

      {/* Recovery plan */}
      {activeTab === "plan" && (
        <section className="panel profile-section-panel">
          <h2>Personalized Recovery Plan</h2>
          <p className="section-description">
            Recommendations based on the available student indicators.
          </p>

          {recommendations.length > 0 ? (
            recommendations.map((item, index) => (
              <div
                className="profile-list-item"
                key={`${item}-${index}`}
              >
                <div className="plan-number">{index + 1}</div>
                <div className="profile-list-content">
                  <strong>{item}</strong>
                  <p>Sample recommendation — not a persisted task.</p>
                </div>
              </div>
            ))
          ) : (
            <div className="profile-empty">
              {isUploadedCsv
                ? "A recovery plan will be available after student data has been analysed."
                : "No recovery recommendations are configured for this student."}
            </div>
          )}

          {!isUploadedCsv && (
            <button
              type="button"
              className="primary-button profile-action"
              onClick={() =>
                navigate(`/students/${student.id}/recovery-plan`)
              }
            >
              Open Recovery Plan <ArrowRight size={17} />
            </button>
          )}
        </section>
      )}

      {/* Intervention history */}
      {activeTab === "history" && (
        <section className="panel profile-section-panel">
          <h2>Intervention History</h2>
          <p className="section-description">
            Intervention records retrieved from the backend.
          </p>

          {student.interventions?.length > 0 ? (
            student.interventions.map((item, index) => (
              <div
                className="profile-list-item"
                key={`${item.type}-${index}`}
              >
                <div className="profile-list-icon green-list-icon">
                  <ClipboardCheck size={19} />
                </div>
                <div className="profile-list-content">
                  <strong>{item.type}</strong>
                  <p>{item.date}</p>
                </div>
                <span className="status-badge status-warning">
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="profile-empty">
              {isUploadedCsv
                ? "No intervention history is stored for this uploaded student."
                : "No intervention records were found for this student."}
            </div>
          )}

          {!isUploadedCsv && (
            <button
              type="button"
              className="primary-button profile-action"
              onClick={() =>
                navigate(`/students/${student.id}/interventions`)
              }
            >
              Open Intervention Tracking <ArrowRight size={17} />
            </button>
          )}
        </section>
      )}

      {/* Student history */}
      {!isUploadedCsv && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate(`/students/${student.id}/history`)}
        >
          View Student History
        </button>
      )}
    </div>
  );
}

function GraduationCapFallback() {
  return <BookOpen size={22} />;
}