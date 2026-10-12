
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import api from "../services/api";

const UPLOADED_STUDENTS_KEY = "edupulse_uploaded_students";
const INTERVENTIONS_KEY = "edupulse_interventions";
const ASSESSMENT_HISTORY_KEY = "edupulse_student_assessment_history";

function readLocalArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return [];
  }
}

function getUploadedStudent(id) {
  return readLocalArray(UPLOADED_STUDENTS_KEY).find(
    (student) =>
      String(student?.student_id ?? "").toUpperCase() ===
      String(id ?? "").toUpperCase()
  ) || null;
}

function isAvailable(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !(typeof value === "number" && !Number.isFinite(value))
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeStatus(status) {
  return String(status || "Planned")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStudentIndicators(student, uploadedStudent) {
  if (uploadedStudent) {
    return [
      {
        label: "Attendance",
        value: uploadedStudent.attendance_percentage,
        unit: "%",
      },
      {
        label: "Previous marks",
        value: uploadedStudent.previous_marks,
        unit: "%",
      },
      {
        label: "Internal marks",
        value: uploadedStudent.internal_marks,
        unit: "%",
      },
      {
        label: "Assignment completion",
        value: uploadedStudent.assignment_completion,
        unit: "%",
      },
      {
        label: "Subject",
        value: uploadedStudent.subject,
        unit: "",
      },
    ];
  }

  const indicators = student?.indicators || {};

  return [
    {
      label: "Attendance",
      value: indicators.attendance?.available
        ? indicators.attendance.value
        : null,
      unit: indicators.attendance?.unit || "%",
    },
    {
      label: "Academic average",
      value: indicators.academicAverage?.available
        ? indicators.academicAverage.value
        : null,
      unit: indicators.academicAverage?.unit || "%",
    },
    {
      label: "LMS engagement",
      value: indicators.lmsEngagement?.available
        ? indicators.lmsEngagement.value
        : null,
      unit: indicators.lmsEngagement?.unit || "%",
    },
    {
      label: "Placement readiness",
      value: indicators.placementReadiness?.available
        ? indicators.placementReadiness.value
        : null,
      unit: indicators.placementReadiness?.unit || "%",
    },
    {
      label: "Skills assessment",
      value: indicators.skillsAssessment?.available
        ? indicators.skillsAssessment.value
        : null,
      unit: indicators.skillsAssessment?.unit || "%",
    },
  ];
}

function normalizeAssessment(item) {
  const marks = Number(item.marks ?? item.score);

  if (
    !Number.isFinite(marks) ||
    marks < 0 ||
    marks > 100
  ) {
    return null;
  }

  return {
    id: String(item.id || `${item.assessment}-${item.date}`),
    date: item.date || item.assessmentDate || "",
    assessment: item.assessment || item.title || "Assessment",
    marks,
    source: item.source || "Recorded history",
  };
}

function getInterventionDescription(item) {
  const notes =
    item.notes ||
    (Array.isArray(item.progressNotes)
      ? item.progressNotes.join(" ")
      : "");

  const owner = item.owner || item.assignedTo;

  return [
    item.type || "Faculty support activity",
    owner ? `Responsible person: ${owner}` : "",
    notes,
    `Status: ${normalizeStatus(item.status)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function StudentHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [uploadedStudent, setUploadedStudent] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
async function loadHistory() {
  setLoading(true);
  setError("");

  try {
    const normalizedId = String(id || "").trim().toUpperCase();

    // Fetch students, prediction history, and interventions.
    const [studentResponse, predictionResponse, interventionResponse] =
      await Promise.all([
        api.get("/students/"),
        api.get("/predictions/history?limit=100&skip=0"),
        api.get("/interventions/"),
      ]);

    const studentPayload = studentResponse.data;
    const students = Array.isArray(studentPayload)
      ? studentPayload
      : Array.isArray(studentPayload?.value)
        ? studentPayload.value
        : [];

    const selectedStudent = students.find((item) => {
      const studentId = String(
        item.student_id ?? item.id ?? item._id ?? ""
      ).trim().toUpperCase();

      return studentId === normalizedId;
    });

    if (!selectedStudent) {
      setStudent(null);
      setUploadedStudent(null);
      setAssessments([]);
      setEvents([]);
      setError("No student record was found for this ID.");
      return;
    }

    setStudent(selectedStudent);
    setUploadedStudent(null);
    // Load matching CSV record if one exists in browser storage.
const localUploadedStudent = getUploadedStudent(normalizedId);
setUploadedStudent(localUploadedStudent);

    // Keep only real assessment records if the API provides them.
    // Prediction scores are not treated as assessment marks.
    const savedAssessments = readLocalArray(
      ASSESSMENT_HISTORY_KEY
    )
      .filter(
        (item) =>
          String(item.studentId ?? item.student_id ?? "")
            .trim()
            .toUpperCase() === normalizedId
      )
      .map(normalizeAssessment)
      .filter(Boolean);

    setAssessments(savedAssessments);

    const predictionPayload = predictionResponse.data;
    const predictions = Array.isArray(predictionPayload?.history)
      ? predictionPayload.history
      : [];

    const matchingPredictions = predictions.filter((record) => {
      const recordStudentId = String(
        record.student_id ?? record.input?.student_id ?? ""
      ).trim().toUpperCase();

      return recordStudentId === normalizedId;
    });
    // Populate indicators from the latest prediction input when available.

const latestPrediction = [...matchingPredictions].sort(
  (a, b) =>
    new Date(b.created_at || 0).getTime() -
    new Date(a.created_at || 0).getTime()
)[0];

const predictionInput = latestPrediction?.input || {};
const predictionResult = latestPrediction?.result || {};

const successScore = predictionResult.success_score || {};
const placementAssessment = predictionResult.placement_assessment || {};
const placementResult = placementAssessment.result || {};

setStudent({
  ...selectedStudent,
  indicators: {
  ...(selectedStudent.indicators || {}),

  attendance: {
    available: isAvailable(selectedStudent.attendance_percentage),
    value: selectedStudent.attendance_percentage,
    unit: "%",
  },

  academicAverage: {
    available: isAvailable(predictionInput.early_average_score),
    value: predictionInput.early_average_score,
    unit: "%",
  },

  lmsEngagement: {
    available: isAvailable(predictionInput.early_total_clicks),
    value: predictionInput.early_total_clicks,
    unit: " clicks",
  },

  placementReadiness: {
    available: isAvailable(placementResult.placement_probability),
    value: isAvailable(placementResult.placement_probability)
      ? placementResult.placement_probability * 100
      : null,
    unit: "%",
  },

  skillsAssessment: {
    available: isAvailable(predictionInput.AptitudeTestScore),
    value: predictionInput.AptitudeTestScore,
    unit: "%",
  },
},
});


    const interventionPayload = interventionResponse.data;
    const interventions = Array.isArray(interventionPayload)
      ? interventionPayload
      : Array.isArray(interventionPayload?.interventions)
        ? interventionPayload.interventions
        : [];

    const matchingInterventions = interventions.filter((item) => {
      const interventionStudentId = String(
        item.student_id ?? item.student?.student_id ?? ""
      ).trim().toUpperCase();

      return interventionStudentId === normalizedId;
    });

    const interventionEvents = matchingInterventions.map((item) => ({
      id: `intervention-${item._id ?? item.id ?? `${item.title}-${item.created_at}`}`,
      date: item.created_at || item.updated_at || "",
      title: item.title || item.type || "Intervention",
      description: [
        item.description || item.notes || "",
        `Status: ${normalizeStatus(item.status)}`,
        item.assigned_to ? `Assigned to: ${item.assigned_to}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      type: "Intervention",
      source: "Backend",
    }));

    const predictionEvents = matchingPredictions
  .filter((record) => record.created_at)
  .map((record, index) => {
    const result = record.result || {};
    const success = result.success_score || {};
    const academic = result.academic_early_warning || {};
    const placement = result.placement_assessment || {};

    const details = [
      typeof success.success_score === "number"
        ? `Success score: ${success.success_score}/100`
        : "",
      academic.result?.predicted_outcome_risk
        ? `Academic risk: ${academic.result.predicted_outcome_risk}`
        : "",
      placement.result?.placement_risk
        ? `Placement risk: ${placement.result.placement_risk}`
        : "",
    ].filter(Boolean);

    return {
      id: `prediction-${record._id ?? record.id ?? `${record.created_at}-${index}`}`,
      date: record.created_at,
      title: "Student analytics prediction",
      description: details.length
        ? details.join(" · ")
        : "Prediction record stored by the backend.",
      type: "Analytics",
      source: "Backend",
    };
  });

    const assessmentEvents = savedAssessments.map((item) => ({
      id: `assessment-${item.id}`,
      date: item.date,
      title: item.assessment,
      description: `Recorded assessment result: ${item.marks}%.`,
      type: "Assessment",
      source: item.source,
    }));

    const combinedEvents = [
      ...interventionEvents,
      ...predictionEvents,
      ...assessmentEvents,
    ].sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    );

    setEvents(combinedEvents);
  } catch (loadError) {
    console.error("Unable to load student history:", loadError);
    setError(
      loadError.response?.status === 401
        ? "Your session has expired. Please log in again."
        : "Unable to load student history. Please check the backend connection."
    );
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadHistory();
    // The selected student ID controls which history is displayed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const indicators = useMemo(
    () => getStudentIndicators(student, uploadedStudent),
    [student, uploadedStudent]
  );

  const latestAssessment =
    assessments.length > 0
      ? assessments[assessments.length - 1]
      : null;

  const chartData = assessments.map((item) => ({
    date: item.date
      ? new Date(item.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : item.assessment,
    score: item.marks,
    assessment: item.assessment,
  }));

  const studentName =
    student?.name ||
    uploadedStudent?.name ||
    (id ? `Student ${id}` : "Student");

  return (
    <div className="student-history-page">
      <div className="student-history-heading">
        <div>
          <p className="eyebrow">STUDENT RECORDS</p>
          <h1>Student History</h1>
          <p className="page-description">
            {studentName} · Student ID: {id} · Academic records,
            assessment results and support activities.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate(`/students/${id}`)}
        >
          <ArrowLeft size={16} />
          Back to Student
        </button>
      </div>

      <div className="demo-notice">
        <strong>Data status:</strong>{" "}
        {uploadedStudent
          ? "This student was imported from CSV. The available fields represent the uploaded snapshot; historical trends are shown only when recorded history exists."
          : "This page loads student information, prediction records, and interventions from the backend. Historical assessment trends appear only when recorded assessment results are available."}
      </div>

      {loading && (
        <div className="panel history-state">
          <RefreshCw size={22} />
          <h3>Loading student history...</h3>
        </div>
      )}

      {!loading && error && (
        <div className="panel history-state">
          <AlertCircle size={25} />
          <h3>History unavailable</h3>
          <p>{error}</p>
          <button
            type="button"
            className="primary-button"
            onClick={loadHistory}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="history-summary-grid">
            <div className="history-summary-card">
              <div className="history-summary-icon">
                <ClipboardCheck size={21} />
              </div>
              <div>
                <span>Recorded assessments</span>
                <h2>{assessments.length}</h2>
              </div>
            </div>

            <div className="history-summary-card">
              <div className="history-summary-icon">
                <TrendingUp size={21} />
              </div>
              <div>
                <span>Latest assessment score</span>
                <h2>
                  {latestAssessment
                    ? `${latestAssessment.marks}%`
                    : "—"}
                </h2>
              </div>
            </div>

            <div className="history-summary-card">
              <div className="history-summary-icon">
                <BookOpen size={21} />
              </div>
              <div>
                <span>Recorded activities</span>
                <h2>{events.length}</h2>
              </div>
            </div>
          </div>

          <section className="history-chart-card">
            <div className="history-section-heading">
              <div>
                <h2>Assessment Score History</h2>
                <p>
                  {assessments.length >= 2
                    ? "Recorded assessment results over time."
                    : "A trend is shown when at least two assessment results are available."}
                </p>
              </div>
              <span className="history-demo-label">
                {uploadedStudent ? "Uploaded student" : "Backend-connected profile"}
              </span>
            </div>

            {assessments.length >= 2 ? (
              <div className="history-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${value}%`,
                        "Score",
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#4f46e5" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="history-no-data">
                <TrendingUp size={26} />
                <h3>Not enough historical results</h3>
                <p>
                  {assessments.length === 1
                    ? "One assessment result is available. More recorded assessments are needed to display a trend."
                    : "No historical assessment results are available for this student yet. Current marks are not treated as past assessments."}
                </p>
              </div>
            )}
          </section>

          <section className="history-chart-card">
            <div className="history-section-heading">
              <div>
                <h2>Available Academic Snapshot</h2>
                <p>
                  Current indicators from the student record. These
                  are not a historical timeline.
                </p>
              </div>
            </div>

            <div className="history-indicator-grid">
              {indicators.map((indicator) => (
                <div
                  className="history-indicator-card"
                  key={indicator.label}
                >
                  <span>{indicator.label}</span>
                  <strong>
                    {isAvailable(indicator.value)
                      ? `${indicator.value}${indicator.unit}`
                      : "Unavailable"}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="history-timeline-section">
            <div className="history-section-heading">
              <div>
                <h2>Academic Activity Timeline</h2>
                <p>
                  Recorded assessment results, interventions and
                  other available academic events.
                </p>
              </div>
            </div>

            {events.length > 0 ? (
              <div className="history-timeline">
                {events.map((event) => (
                  <article
                    className="history-event"
                    key={event.id}
                  >
                    <div className="history-event-marker">
                      {event.type === "Assessment" ? (
                        <ClipboardCheck size={18} />
                      ) : event.type === "Intervention" ? (
                        <CalendarDays size={18} />
                      ) : (
                        <BookOpen size={18} />
                      )}
                    </div>

                    <div className="history-event-content">
                      <div className="history-event-top">
                        <h3>{event.title}</h3>
                        <span>{event.type}</span>
                      </div>
                      <p>{event.description}</p>
                      <small>
                        {formatDate(event.date)}
                        {event.source
                          ? ` · ${event.source}`
                          : ""}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="history-no-data">
                <CalendarDays size={26} />
                <h3>No recorded activities yet</h3>
                <p>
                  Activities will appear here when assessment,
                  intervention or academic history records are
                  available for this student.
                </p>
              </div>
            )}
          </section>

          <section className="history-chart-card">
            <div className="history-section-heading">
              <div>
                <h2>History Data Availability</h2>
                <p>
                  Historical records are kept separate from the
                  student's current snapshot.
                </p>
              </div>
            </div>

            <div className="history-availability-list">
              <div>
                <span>Assessment history</span>
                <strong>
                  {assessments.length > 0
                    ? `${assessments.length} recorded`
                    : "Unavailable"}
                </strong>
              </div>
              <div>
                <span>Faculty interventions</span>
                <strong>
                  {events.filter(
                    (event) => event.type === "Intervention"
                  ).length}
                </strong>
              </div>
              <div>
                <span>Past assistance classifications</span>
                <strong>Unavailable</strong>
              </div>
              <div>
                <span>Previous recovery plans</span>
                <strong>Unavailable</strong>
              </div>
            </div>
          </section>

          <div className="history-footer">
            <div>
              <h3>Continue student review</h3>
              <p>
                Open the learning graph or review the student's
                recovery plan.
              </p>
            </div>
            <div className="history-footer-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(`/students/${id}/learning-gaps`)
                }
              >
                Learning Graph
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  navigate(`/students/${id}/recovery-plan`)
                }
              >
                Recovery Plan
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
