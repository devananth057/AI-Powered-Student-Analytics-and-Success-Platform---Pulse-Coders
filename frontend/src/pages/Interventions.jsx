import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  X,
} from "lucide-react";

import api from "../services/api";



const emptyForm = {
  title: "",
  type: "Mentoring",
  date: "",
  owner: "",
  status: "Planned",
  notes: "",
};

function formatStatus(status) {
  const normalized = String(status || "planned")
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  const labels = {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[normalized] || "Planned";
}

function getStatusClass(status) {
  return formatStatus(status).toLowerCase().replaceAll(" ", "-");
}


function formatDate(date) {
  if (!date) return "Date not set";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not set";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function normalizeIntervention(item) {
  return {
    ...item,
    id: String(item.id ?? item._id ?? ""),
    studentId: String(item.studentId ?? item.student_id ?? ""),
    title: item.title || "Untitled intervention",
    type: item.type || "Support Activity",
    date: item.date || item.dueDate || item.due_date || item.created_at || "",
    owner: item.owner || item.assignedTo || item.assigned_to || "Not assigned",
    status: formatStatus(item.status),
    notes:
      item.notes ||
      item.description ||
      (Array.isArray(item.progressNotes)
        ? item.progressNotes.join("\n")
        : "") ||
      "",
  };
}




export default function Interventions() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interventions, setInterventions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selectedStudentId, setSelectedStudentId] = useState(id || "");
  

  const currentStudent = students.find(
    (student) => String(student.id) === String(id)
  );

  
async function loadInterventions() {
  setLoading(true);
  setError("");

  try {
    const [interventionResponse, studentResponse] = await Promise.all([
      api.get("/interventions/"),
      api.get("/students/"),
    ]);

    const backendRecords = Array.isArray(
      interventionResponse.data?.interventions
    )
      ? interventionResponse.data.interventions
      : [];

    const rawStudents = studentResponse.data;

const backendStudents = Array.isArray(rawStudents)
  ? rawStudents
  : Array.isArray(rawStudents?.value)
    ? rawStudents.value
    : [];

    const normalizedRecords = backendRecords.map((item) =>
      normalizeIntervention({
        ...item,
        studentId: item.student_id,
        owner: item.assigned_to,
        notes: item.description,
        date: item.created_at,
        source: "backend",
      })
    );

    const visibleRecords = id
  ? normalizedRecords.filter(
      (item) => String(item.studentId) === String(id)
    )
  : normalizedRecords;

    setInterventions(visibleRecords);

    setStudents(
      backendStudents.map((student) => ({
        ...student,
        id: String(student.student_id),
      }))
    );
  } catch (err) {
    console.error("Unable to load interventions:", err);

    setError(
      err.response?.status === 401
        ? "Your session has expired. Please log in again."
        : err.response?.status === 403
        ? "Your account does not have permission to view interventions."
        : "Unable to load interventions from the backend. Check the server and try again."
    );
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadInterventions();
    // Reload when the selected student changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const completedCount = interventions.filter(
    (item) => item.status === "Completed"
  ).length;

  const inProgressCount = interventions.filter(
    (item) => item.status === "In Progress"
  ).length;

  const plannedCount = interventions.filter(
    (item) => item.status === "Planned"
  ).length;

  const filteredInterventions = useMemo(() => {
    return interventions.filter((item) => {
      const searchText = [
        item.title,
        item.type,
        item.owner,
        item.notes,
        item.studentId,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [interventions, search, statusFilter]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  
async function addIntervention(event) {
  event.preventDefault();
  setMessage("");
  setError("");

  try {
    const studentId = String(id || selectedStudentId || "").trim();

    if (!studentId) {
      setError("Select a student before creating an intervention.");
      return;
    }

    await api.post("/interventions/", {
      student_id: studentId,
      title: form.title.trim(),
      description: form.notes.trim(),
      assigned_to: form.owner.trim(),
      status: form.status === "Completed"
        ? "completed"
        : form.status === "In Progress"
        ? "in_progress"
        : "pending",
    });

    setForm({ ...emptyForm });
    setShowForm(false);
    setMessage("Intervention saved successfully to the backend.");

    await loadInterventions();
  } catch (err) {
    console.error("Unable to create intervention:", err);

    setError(
      err.response?.data?.detail ||
      "Unable to save intervention. Check your login and try again."
    );
  }
}

  
async function updateStatus(interventionId, status) {
  setMessage("");
  setError("");

  const backendStatus = {
  Planned: "pending",
  "In Progress": "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
}[status];

  if (!backendStatus) {
    setError("Invalid intervention status.");
    return;
  }

  try {
    await api.patch(`/interventions/${interventionId}`, {
      status: backendStatus,
    });

    setMessage("Intervention status updated successfully.");

    await loadInterventions();
  } catch (err) {
    console.error("Unable to update intervention:", err);

    setError(
      err.response?.data?.detail ||
      "Unable to update status. Please try again."
    );
  }
}

  return (
    <div className="interventions-page">
      <div className="interventions-heading">
        <div>
          <p className="eyebrow">STUDENT SUPPORT</p>
          <h1>Intervention Tracking</h1>

          <p className="page-description">
            {id
              ? `Student ID: ${id} · Record support activities and follow-ups.`
              : "Track support activities and follow-ups across students."}
          </p>

          {currentStudent && (
            <p className="page-description">
              Student: {currentStudent.name} ·{" "}
              {currentStudent.department}
            </p>
          )}
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate(id ? `/students/${id}` : "/students")
          }
        >
          <ArrowLeft size={16} />
          {id ? "Back to Student" : "Back to Students"}
        </button>
      </div>

      

      {message && (
        <div className="upload-message success" role="status">
          <CheckCircle2 size={19} />
          <span>{message}</span>

          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="intervention-stats">
        <div className="intervention-stat-card">
          <span>Total interventions</span>
          <strong>{loading ? "—" : interventions.length}</strong>
        </div>

        <div className="intervention-stat-card">
          <span>Planned</span>
          <strong>{loading ? "—" : plannedCount}</strong>
        </div>

        <div className="intervention-stat-card">
          <span>In progress</span>
          <strong>{loading ? "—" : inProgressCount}</strong>
        </div>

        <div className="intervention-stat-card">
          <span>Completed</span>
          <strong>{loading ? "—" : completedCount}</strong>
        </div>
      </div>

      <div className="interventions-toolbar">
        <div>
          <h2>Support History</h2>
          <p>
            Track mentoring, practice sessions and other support
            activities.
          </p>
        </div>

        <div className="intervention-toolbar-actions">
          <button
            type="button"
            className="template-button"
            onClick={loadInterventions}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm((visible) => !visible);
              setMessage("");
            }}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add Intervention"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          className="intervention-form"
          onSubmit={addIntervention}
        >
          <h3>New Intervention</h3>

          <div className="intervention-form-grid">
            
<label>
  Student *
  <select
    value={id || selectedStudentId}
    onChange={(event) => setSelectedStudentId(event.target.value)}
    required
    disabled={Boolean(id)}
  >
    <option value="">Select a student</option>
    {students.map((student) => (
      <option key={student.id} value={student.id}>
        {student.name} ({student.id})
      </option>
    ))}
  </select>
</label>

            <label>
              Activity title *
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. Extra mentoring session"
                required
              />
            </label>

            <label>
              Type
              <select
                name="type"
                value={form.type}
                onChange={updateField}
              >
                <option>Mentoring</option>
                <option>Practice Session</option>
                <option>Remedial Class</option>
                <option>Parent Meeting</option>
                <option>Placement Preparation</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Date *
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Responsible person *
              <input
                name="owner"
                value={form.owner}
                onChange={updateField}
                placeholder="Faculty or mentor name"
                required
              />
            </label>

            <label>
              Status
              <select
                name="status"
                value={form.status}
                onChange={updateField}
              >
                <option value="Planned">Planned</option>
<option value="In Progress">In Progress</option>
<option value="Completed">Completed</option>
              </select>
            </label>

            <label className="intervention-notes-field">
              Progress notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                placeholder="Describe the activity and follow-up..."
                rows={3}
              />
            </label>
          </div>

          <button className="primary-button" type="submit">
            <CheckCircle2 size={16} />
            Save Intervention
          </button>
        </form>
      )}

      <section className="intervention-filter-panel panel">
        <div className="intervention-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search title, student ID, owner or notes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search interventions"
          />
        </div>

        <select
          className="intervention-filter-select"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          aria-label="Filter interventions by status"
        >
          <option value="all">All statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </section>

      {loading && (
        <div className="panel intervention-empty">
          <RefreshCw size={25} />
          <h3>Loading interventions...</h3>
        </div>
      )}

      {!loading && error && (
        <div className="panel intervention-empty">
          <AlertCircle size={28} />
          <h3>Unable to load interventions</h3>
          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={loadInterventions}
          >
            Try again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        filteredInterventions.length > 0 && (
          <div className="intervention-list">
            {filteredInterventions.map((item) => (
              <article
                className="intervention-card"
                key={item.id}
              >
                <div className="intervention-icon">
                  <ClipboardCheck size={22} />
                </div>

                <div className="intervention-content">
                  <div className="intervention-title-row">
                    <h3>{item.title}</h3>

                    <span
                      className={`intervention-status status-${getStatusClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <span className="intervention-type">
                    {item.type}
                  </span>

                  <p>
                    {item.notes || "No additional notes provided."}
                  </p>

                  <div className="intervention-meta">
                    {item.studentId && (
                      <span>
                        <Users size={14} />
                        {item.studentId}
                      </span>
                    )}

                    <span>
                      <CalendarDays size={14} />
                      {formatDate(item.date)}
                    </span>

                    <span>
                      <Clock size={14} />
                      {item.owner || "Not assigned"}
                    </span>
                  </div>

                  <label className="intervention-status-control">
                    Update status
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updateStatus(item.id, event.target.value)
                      }
                    >
                      <option>Planned</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}

      {!loading &&
        !error &&
        filteredInterventions.length === 0 && (
          <div className="panel intervention-empty">
            <CheckCircle2 size={28} />
            <h3>No interventions found</h3>
            <p>
              Try changing the search or status filter, or add an
              intervention.
            </p>

            {(search || statusFilter !== "all") && (
              <button
                type="button"
                className="template-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
    </div>
  );
}