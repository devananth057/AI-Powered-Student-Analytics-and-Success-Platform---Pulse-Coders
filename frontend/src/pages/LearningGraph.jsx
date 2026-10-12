
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleAlert,
  GitBranch,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";

export default function LearningGraph() {
  const { id } = useParams();
  const navigate = useNavigate();

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
          String(item.student_id ?? item.id ?? "") === String(id ?? "")
      );

      if (!found) {
        setStudent(null);
        setError("This student was not found in the backend.");
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
  }, [id]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const studentPath = id
    ? `/students/${encodeURIComponent(id)}`
    : "/students";

  const recoveryPath = id
    ? `/students/${encodeURIComponent(id)}/recovery-plan`
    : "/students";

  return (
    <div className="learning-graph-page">
      <div className="learning-graph-heading">
        <div>
          <p className="eyebrow">STUDENT LEARNING ANALYSIS</p>
          <h1>Root-Cause Learning Graph</h1>
          <p className="page-description">
            Explore concept dependencies when verified concept-level
            learning evidence is available.
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
        <div className="panel">
          <RefreshCw size={20} />
          <p>Loading student information...</p>
        </div>
      ) : error ? (
        <div className="panel" role="alert">
          <CircleAlert size={22} />
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={loadStudent}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section className="panel">
            <h2>{student.name || `Student ${id}`}</h2>
            <p>Student ID: {student.student_id ?? student.id}</p>
            <p>Department: {student.department || "Not specified"}</p>
          </section>

          <section className="panel learning-evidence-panel">
            <div className="learning-evidence-heading">
              <CircleAlert size={20} />
              <div>
                <h3>Concept-level evidence unavailable</h3>
                <p>
                  No verified concept dependency graph is connected to
                  the current backend. Mastery levels and learning gaps
                  cannot be determined from the student record alone.
                </p>
              </div>
            </div>

            <div className="learning-evidence-grid">
              <div>
                <GitBranch size={18} />
                <strong>Required data</strong>
                <p>
                  Concept prerequisites, assessment-to-concept mappings,
                  and validated concept-level results.
                </p>
              </div>

              <div>
                <BookOpen size={18} />
                <strong>Current status</strong>
                <p>
                  The student record was retrieved from the backend.
                  Concept-level evidence has not been verified.
                </p>
              </div>
            </div>
          </section>

          <div className="graph-actions">
            <div>
              <h3>Next step</h3>
              <p>
                Review the student's needs before assigning recovery
                activities.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate(recoveryPath)}
            >
              View Recovery Plan
              <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
