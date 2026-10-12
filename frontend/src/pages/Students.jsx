
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  Eye,
  Filter,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const UPLOADED_STUDENTS_KEY = "edupulse_uploaded_students";
const REMOVED_STUDENTS_KEY = "edupulse_removed_students";

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getUploadedStudents() {
  return readStoredArray(UPLOADED_STUDENTS_KEY)
    .filter((student) => student?.student_id != null)
    .map((student) => ({
      ...student,
      id: String(student.student_id),
      name: student.name || `Student ${student.student_id}`,
      successScore: null,
      academicRisk: "unavailable",
      placementRisk: "unavailable",
      segment: "Uploaded CSV",
    }));
}

function RiskBadge({ risk }) {
  if (!risk || risk.toLowerCase() === "unavailable") {
    return (
      <span className="classification-badge">
        Unavailable
      </span>
    );
  }

  const normalizedRisk = risk.toLowerCase();

  return (
    <span
      className={`classification-badge ${
        normalizedRisk === "high"
          ? "needs-help"
          : normalizedRisk === "low"
          ? "no-current-flag"
          : ""
      }`}
    >
      <span className="classification-dot" />
      {normalizedRisk.charAt(0).toUpperCase() +
        normalizedRisk.slice(1)}
    </span>
  );
}

export default function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [academicRisk, setAcademicRisk] = useState("all");
  const [placementRisk, setPlacementRisk] = useState("all");
  const [segment, setSegment] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 6;

  // Load mock and uploaded records, excluding previously removed students.
  
  
useEffect(() => {
  let active = true;

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const [studentsResponse, historyResponse] = await Promise.all([
        api.get("/students/"),
        api.get("/predictions/history", {
          params: { limit: 100, skip: 0 },
        }),
      ]);

      const history = Array.isArray(historyResponse.data?.history)
        ? historyResponse.data.history
        : [];

      // Keep the newest student-analytics result for each student.
      const latestAnalytics = new Map();

      for (const record of history) {
        if (
          record.prediction_type !== "student-analytics" ||
          !record.student_id ||
          latestAnalytics.has(String(record.student_id))
        ) {
          continue;
        }

        latestAnalytics.set(String(record.student_id), record.result || {});
      }

      const studentPayload = studentsResponse.data;

const studentRecords = Array.isArray(studentPayload)
  ? studentPayload
  : Array.isArray(studentPayload?.value)
    ? studentPayload.value
    : [];

const backendStudents = studentRecords.map((student) => {
        const id = String(student.student_id);
        const analytics = latestAnalytics.get(id);

        const successData = analytics?.success_score;
        const academicData = analytics?.academic_early_warning?.result;
        const placementData = analytics?.placement_assessment?.result;
        const segmentationData = analytics?.student_segmentation;

        const score =
          typeof successData?.success_score === "number"
            ? successData.success_score
            : typeof successData === "number"
            ? successData
            : null;

        return {
          id,
          student_id: id,
          name: student.name || `Student ${id}`,
          email: student.email || "",
          department: student.department || "Not specified",
          successScore: score,
          academicRisk: (
            academicData?.predicted_outcome_risk || "unavailable"
          ).toLowerCase(),
          placementRisk: (
            placementData?.placement_risk || "unavailable"
          ).toLowerCase(),
          segment: segmentationData?.segment || "Not yet classified",
        };
      });

      if (active) {
        setStudents(backendStudents);
      }
    } catch (err) {
      console.error("Failed to load students:", err);

      if (active) {
        setError(
          err.response?.status === 401
            ? "Your session has expired. Please log in again."
            : err.response?.status === 403
            ? "Only faculty and admin accounts can view all students."
            : "Unable to load student records or prediction history."
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  loadStudents();

  return () => {
    active = false;
  };
}, []);



  // Sync uploaded records when returning to this page or
  // when another browser tab changes local storage.
  

  // Remove any student from the current frontend dataset.
  
  async function removeStudent(student) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${student.name} (${student.id})?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/students/${encodeURIComponent(student.student_id || student.id)}`
      );

      setStudents((currentStudents) =>
        currentStudents.filter(
          (item) => String(item.id) !== String(student.id)
        )
      );

      setPage(1);
    } catch (err) {
      console.error("Unable to delete student:", err);

      const message =
        err.response?.status === 403
          ? "Only administrators can delete student records."
          : err.response?.status === 404
          ? "This student record was not found in the database."
          : err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : "Unable to delete the student. Check the backend connection and try again.";

      window.alert(message);
    }
  }


  const segments = useMemo(
    () => [
      ...new Set(
        students
          .map((student) => student.segment)
          .filter(Boolean)
      ),
    ],
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = search.trim().toLowerCase();

      const studentId = String(student.id ?? "").toLowerCase();
      const studentName = String(
        student.name ?? ""
      ).toLowerCase();

      const matchesSearch =
        studentId.includes(query) ||
        studentName.includes(query);

      const matchesAcademicRisk =
        academicRisk === "all" ||
        String(student.academicRisk ?? "unavailable")
          .toLowerCase() === academicRisk;

      const matchesPlacementRisk =
        placementRisk === "all" ||
        String(student.placementRisk ?? "unavailable")
          .toLowerCase() === placementRisk;

      const matchesSegment =
        segment === "all" || student.segment === segment;

      const score = student.successScore;

      const matchesMin =
        minScore === "" ||
        (typeof score === "number" &&
          score >= Number(minScore));

      const matchesMax =
        maxScore === "" ||
        (typeof score === "number" &&
          score <= Number(maxScore));

      return (
        matchesSearch &&
        matchesAcademicRisk &&
        matchesPlacementRisk &&
        matchesSegment &&
        matchesMin &&
        matchesMax
      );
    });
  }, [
    students,
    search,
    academicRisk,
    placementRisk,
    segment,
    minScore,
    maxScore,
  ]);

  const invalidScoreRange =
    minScore !== "" &&
    maxScore !== "" &&
    Number(minScore) > Number(maxScore);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function resetFilters() {
    setSearch("");
    setAcademicRisk("all");
    setPlacementRisk("all");
    setSegment("all");
    setMinScore("");
    setMaxScore("");
    setPage(1);
  }

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  if (loading) {
    return (
      <div className="students-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">STUDENT MANAGEMENT</p>
            <h1>Student Overview</h1>
          </div>
        </div>
        <p>Loading student records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="students-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">STUDENT MANAGEMENT</p>
            <h1>Student Overview</h1>
          </div>
        </div>

        <p role="alert">{error}</p>

        <button
          type="button"
          className="reset-filters-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="students-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STUDENT MANAGEMENT</p>
          <h1>Student Overview</h1>
          <p className="page-subtitle">
            Review student success scores, academic risk and
            placement readiness.
          </p>
        </div>

        <div className="student-count">
          <Users size={19} />
          {filteredStudents.length} records
        </div>
      </div>

      <div className="demo-notice">
        <GraduationCap size={20} />
        <div>
          <strong>Demonstration mode</strong>
          <p>
            Demo records are illustrative. Imported CSV records
            are stored locally in your browser. Scores and risk
            predictions remain unavailable until calculated.
            Student removals are saved in this browser only.
          </p>
        </div>
      </div>

      <section className="student-summary-grid">
        <article className="student-summary-card">
          <span>Total student records</span>
          <strong>{students.length}</strong>
        </article>

        <article className="student-summary-card warning-summary">
          <span>High academic risk</span>
          <strong>
            {
              students.filter(
                (student) =>
                  String(student.academicRisk ?? "")
                    .toLowerCase() === "high"
              ).length
            }
          </strong>
        </article>

        <article className="student-summary-card positive-summary">
          <span>High placement risk</span>
          <strong>
            {
              students.filter(
                (student) =>
                  String(student.placementRisk ?? "")
                    .toLowerCase() === "high"
              ).length
            }
          </strong>
        </article>
      </section>

      <section className="panel student-list-panel">
        <div className="student-toolbar">
          <div>
            <h2>All Students</h2>
            <p>
              Search and filter by risk, Success Score and segment.
            </p>
          </div>
          <Filter size={19} color="#8290a6" />
        </div>

        <div className="student-filters">
          <div className="student-search">
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) =>
                updateFilter(setSearch, event.target.value)
              }
              placeholder="Search student ID or name..."
              aria-label="Search student records"
            />
          </div>

          <select
            value={academicRisk}
            onChange={(event) =>
              updateFilter(setAcademicRisk, event.target.value)
            }
            aria-label="Filter by academic risk"
          >
            <option value="all">All academic risks</option>
            <option value="low">Low academic risk</option>
            <option value="medium">Medium academic risk</option>
            <option value="high">High academic risk</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <select
            value={placementRisk}
            onChange={(event) =>
              updateFilter(setPlacementRisk, event.target.value)
            }
            aria-label="Filter by placement risk"
          >
            <option value="all">All placement risks</option>
            <option value="low">Low placement risk</option>
            <option value="medium">Medium placement risk</option>
            <option value="high">High placement risk</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <select
            value={segment}
            onChange={(event) =>
              updateFilter(setSegment, event.target.value)
            }
            aria-label="Filter by student segment"
          >
            <option value="all">All segments</option>
            {segments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            max="100"
            placeholder="Min score"
            aria-label="Minimum Success Score"
            value={minScore}
            onChange={(event) =>
              updateFilter(setMinScore, event.target.value)
            }
          />

          <input
            type="number"
            min="0"
            max="100"
            placeholder="Max score"
            aria-label="Maximum Success Score"
            value={maxScore}
            onChange={(event) =>
              updateFilter(setMaxScore, event.target.value)
            }
          />

          <button
            type="button"
            className="reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        {invalidScoreRange && (
          <p role="alert">
            Minimum score cannot exceed maximum score.
          </p>
        )}

        <div className="table-wrapper">
          <table className="student-table classification-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Success Score</th>
                <th>Academic Risk</th>
                <th>Placement Risk</th>
                <th>Segment</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {invalidScoreRange ? (
                <tr>
                  <td colSpan={6}>
                    <div className="students-empty">
                      <strong>Invalid score range</strong>
                      <p>
                        Set the minimum score to a value no greater
                        than the maximum score.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleStudents.length > 0 ? (
                visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {student.name?.slice(-1) || "?"}
                        </div>
                        <div>
                          <strong>
                            {student.name || "Unknown"}
                          </strong>
                          <span>{student.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {typeof student.successScore === "number"
                        ? `${student.successScore}/100`
                        : "Unavailable"}
                    </td>

                    <td>
                      <RiskBadge risk={student.academicRisk} />
                    </td>

                    <td>
                      <RiskBadge risk={student.placementRisk} />
                    </td>

                    <td>{student.segment || "Unavailable"}</td>

                    <td>
                      <div className="student-action-buttons">
                        <button
                          type="button"
                          className="view-profile-button"
                          onClick={() =>
                            navigate(
                              `/students/${encodeURIComponent(student.id)}`
                            )
                          }
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          type="button"
                          className="remove-student-button"
                          onClick={() => removeStudent(student)}
                          aria-label={`Remove student ${student.id}`}
                          title="Remove student"
                        >
                          <Trash2 size={15} />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="students-empty">
                      <Users size={30} />
                      <strong>No students found</strong>
                      <p>
                        Try changing your search or filters.
                      </p>
                      <button
                        type="button"
                        className="reset-filters-button"
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <span>
            Showing{" "}
            {filteredStudents.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}
            {"–"}
            {Math.min(
              currentPage * pageSize,
              filteredStudents.length
            )}{" "}
            of {filteredStudents.length} records
          </span>

          <div className="pagination-actions">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() =>
                setPage((value) => Math.max(1, value - 1))
              }
            >
              <ChevronLeft size={17} />
            </button>

            <span>
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((value) =>
                  Math.min(totalPages, value + 1)
                )
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
