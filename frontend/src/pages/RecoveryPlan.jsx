
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";

export default function RecoveryPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const studentId = id ? decodeURIComponent(id) : "";

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/students/");
      const raw = response.data;

      const students = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.value)
          ? raw.value
          : [];

      const found = students.find(
        (item) =>
          String(item.student_id ?? item.id ?? "") === studentId
      );

      if (!found) {
        setStudent(null);
        setError("Student record not found in the backend.");
        return;
      }

      setStudent(found);
    } catch (err) {
      console.error("Failed to load student:", err);

      setError(
        err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : err.response?.status === 403
            ? "You do not have permission to view this student."
            : "Unable to load student information from the backend."
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const studentPath = studentId
    ? `/students/${encodeURIComponent(studentId)}`
    : "/students";

  const interventionPath = studentId
    ? `/students/${encodeURIComponent(studentId)}/interventions`
    : "/interventions";

  return (
    <div className="recovery-page">
      <div className="recovery-heading">
        <div>
          <p className="eyebrow">PERSONALIZED LEARNING</p>
          <h1>Recovery Plan</h1>
          <p className="page-description">
            {studentId
              ? `Student ID: ${studentId}`
              : "No student selected"}
            {" · "}Review learning support information.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate(studentPath)}
        >
          <ArrowLeft size={16} />
          Back to Student
        </button>
      </div>

      {loading ? (
        <section className="panel">
          <RefreshCw size={20} />
          <p>Loading student information...</p>
        </section>
      ) : error ? (
        <section className="panel" role="alert">
          <CircleAlert size={22} />
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={loadStudent}
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <section className="recovery-summary">
            <div className="recovery-summary-icon">
              <BookOpen size={24} />
            </div>

            <div className="recovery-summary-content">
              <h2>{student.name || `Student ${studentId}`}</h2>
              <p>
                Student ID: {student.student_id ?? student.id}
              </p>
              <p>
                Department: {student.department || "Not specified"}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="learning-evidence-heading">
              <CircleAlert size={20} />

              <div>
                <h3>Recovery plan data unavailable</h3>
                <p>
                  The current backend integration does not yet provide
                  a verified recovery-plan endpoint. No sample tasks or
                  completion percentages are being presented as real
                  student progress.
                </p>
              </div>
            </div>

            <p>
              A recovery plan can be displayed once actual support
              activities, learning recommendations, and completion
              statuses are available from the backend.
            </p>
          </section>

          <div className="recovery-footer">
            <p>
              Review assessment evidence with faculty before assigning
              learning activities.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate(interventionPath)}
            >
              View Interventions
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
