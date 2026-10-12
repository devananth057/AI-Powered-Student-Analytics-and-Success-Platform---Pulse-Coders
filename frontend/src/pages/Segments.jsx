
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Users,
  Search,
  RefreshCw,
  GraduationCap,
  BriefcaseBusiness,
  AlertTriangle,
  ArrowUpRight,
  Layers3,
  X,
} from "lucide-react";

import api from "../services/api";



function getSegmentName(segment) {
  return (
    segment?.name ||
    segment?.title ||
    segment?.label ||
    segment?.segment ||
    "Unnamed segment"
  );
}

function getSegmentDescription(segment) {
  return (
    segment?.description ||
    segment?.summary ||
    "Review the available indicators for this student group."
  );
}

function getSegmentCategory(segment) {
  const name = getSegmentName(segment).toLowerCase();

  if (
    name.includes("placement") ||
    name.includes("career") ||
    name.includes("employ")
  ) {
    return "placement";
  }

  if (
    name.includes("academic") ||
    name.includes("support") ||
    name.includes("risk")
  ) {
    return "academic";
  }

  if (
    name.includes("strong") ||
    name.includes("high perform") ||
    name.includes("excellent")
  ) {
    return "success";
  }

  return "general";
}

function getCategoryLabel(category) {
  const labels = {
    academic: "Academic",
    placement: "Placement",
    success: "High performance",
    general: "Student group",
  };

  return labels[category] || labels.general;
}

function getCategoryIcon(category) {
  const icons = {
    academic: AlertTriangle,
    placement: BriefcaseBusiness,
    success: GraduationCap,
    general: Users,
  };

  return icons[category] || Users;
}



/*
 * Match students to a segment by its name.
 * Uploaded records are grouped separately and are not assigned
 * invented academic or placement classifications.
 */
function getMatchingStudents(segment, students) {
  const segmentName = getSegmentName(segment)
    .trim()
    .toLowerCase();

  return students.filter(
    (student) =>
      String(student.segment || "")
        .trim()
        .toLowerCase() === segmentName
  );
}

function SegmentCard({ segment, students, onView }) {
  const name = getSegmentName(segment);
  const category = getSegmentCategory(segment);
  const Icon = getCategoryIcon(category);
  const matchingStudents = getMatchingStudents(segment, students);

  return (
    <article className={`panel segment-card segment-${category}`}>
      <div className="segment-card-top">
        <div className={`segment-icon ${category}`}>
          <Icon size={23} />
        </div>

        <span className={`segment-tag ${category}`}>
          {getCategoryLabel(category)}
        </span>
      </div>

      <h2>{name}</h2>

      <p className="segment-description">
        {getSegmentDescription(segment)}
      </p>

      <div className="segment-student-count">
        <div>
          <span className="segment-count-label">
            Students in this group
          </span>

          <strong>{matchingStudents.length}</strong>
        </div>

        <Users size={21} />
      </div>

      <button
        type="button"
        className="segment-view-button"
        onClick={() => onView(segment)}
      >
        View segment details
        <ArrowUpRight size={17} />
      </button>
    </article>
  );
}

function SegmentDetailsModal({ segment, students, onClose }) {
  if (!segment) return null;

  const name = getSegmentName(segment);
  const category = getSegmentCategory(segment);
  const matchingStudents = getMatchingStudents(segment, students);
  const isUploadedSegment = name === "Uploaded CSV Records";

  return (
    <div
      className="segment-modal-backdrop"
      onClick={onClose}
    >
      <section
        className="panel segment-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="segment-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="segment-modal-header">
          <div>
            <p className="eyebrow">SEGMENT DETAILS</p>

            <h2 id="segment-detail-title">{name}</h2>

            <span className={`segment-tag ${category}`}>
              {getCategoryLabel(category)}
            </span>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close segment details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="segment-modal-description">
          <h3>About this group</h3>
          <p>{getSegmentDescription(segment)}</p>
        </div>

        <div className="segment-detail-stat">
          <Users size={23} />

          <div>
            <span>Students in this group</span>
            <strong>{matchingStudents.length}</strong>
          </div>
        </div>

        {segment.eligibilityCriteria && (
          <div className="segment-detail-section">
            <h3>Eligibility criteria</h3>
            <p>{segment.eligibilityCriteria}</p>
          </div>
        )}

        {segment.recommendedIntervention && (
          <div className="segment-detail-section">
            <h3>Suggested intervention</h3>
            <p>{segment.recommendedIntervention}</p>
          </div>
        )}

        <div className="segment-detail-section">
          <h3>Students in this segment</h3>

          {matchingStudents.length > 0 ? (
            <div className="segment-student-list">
              {matchingStudents.map((student) => (
                <div
                  className="segment-student-row"
                  key={student.id}
                >
                  <div className="segment-student-avatar">
                    {student.name?.charAt(0) || "S"}
                  </div>

                  <div>
                    <strong>
                      {student.name || "Unnamed student"}
                    </strong>
                    <span>{student.id}</span>
                  </div>

                  <span className="segment-score">
                    {typeof student.successScore === "number"
                      ? `${student.successScore}/100`
                      : "Score unavailable"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>
              No matching student records are available for this group.
            </p>
          )}
        </div>

        <p className="segment-detail-note">
  Segment membership is based on the latest available backend
  segmentation results. Missing scores and classifications are
  displayed as unavailable.
</p>

        <button
          type="button"
          className="primary-button segment-modal-close"
          onClick={onClose}
        >
          Close details
        </button>
      </section>
    </div>
  );
}

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedSegment, setSelectedSegment] = useState(null);

  
const loadSegments = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const [studentResponse, predictionResponse] = await Promise.all([
      api.get("/students/"),
      api.get("/predictions/history?limit=100&skip=0"),
    ]);

    const studentPayload = studentResponse.data;
    const predictionPayload = predictionResponse.data;

    const rawStudents = Array.isArray(studentPayload)
      ? studentPayload
      : Array.isArray(studentPayload?.value)
        ? studentPayload.value
        : [];

    const history = Array.isArray(predictionPayload?.history)
      ? predictionPayload.history
      : [];

    // Keep the latest segmentation result for each student.
    const latestByStudent = new Map();

    const sortedHistory = [...history].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    for (const record of sortedHistory) {
      const studentId = String(
        record.student_id ??
        record.input?.student_id ??
        ""
      ).trim();

      const result = record.result || {};
      const segmentation =
        result.student_segmentation ||
        result.segmentation ||
        {};

      const segmentName =
        typeof segmentation === "string"
          ? segmentation
          : segmentation.segment;

      if (
        studentId &&
        segmentName &&
        !latestByStudent.has(studentId)
      ) {
        latestByStudent.set(studentId, {
          segment: String(segmentName),
          successScore:
            result.success_score?.success_score ?? null,
          academicRisk:
            result.academic_early_warning?.result
              ?.predicted_outcome_risk ?? "unavailable",
          placementRisk:
            result.placement_assessment?.result
              ?.placement_risk ?? "unavailable",
        });
      }
    }

    const normalizedStudents = rawStudents.map((record) => {
      const id = String(
        record.student_id ?? record.id ?? record._id ?? ""
      ).trim();

      const prediction = latestByStudent.get(id);

      return {
        ...record,
        id,
        name: record.name || `Student ${id || "Unknown"}`,
        segment: prediction?.segment || null,
        successScore:
          typeof prediction?.successScore === "number"
            ? prediction.successScore
            : null,
        academicRisk:
          prediction?.academicRisk ?? "unavailable",
        placementRisk:
          prediction?.placementRisk ?? "unavailable",
      };
    });

    // Create groups only from segmentation labels returned by the API.
    const groupedStudents = new Map();

    for (const student of normalizedStudents) {
      if (!student.segment) continue;

      if (!groupedStudents.has(student.segment)) {
        groupedStudents.set(student.segment, []);
      }

      groupedStudents.get(student.segment).push(student);
    }

    const actualSegments = Array.from(
      groupedStudents.entries()
    ).map(([name, group]) => ({
      name,
      description:
        "Students grouped using the latest available backend segmentation results.",
      students: group,
    }));

    setStudents(normalizedStudents);
    setSegments(actualSegments);
  } catch (err) {
    console.error("Unable to load student segments:", err);

    setError(
      err.response?.status === 401
        ? "Your session has expired. Please log in again."
        : "Unable to load student segments from the backend. Please try again."
    );
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
  loadSegments();

  return () => {};
}, [loadSegments]);

  const filteredSegments = useMemo(() => {
    return segments.filter((segment) => {
      const name = getSegmentName(segment);
      const description = getSegmentDescription(segment);
      const category = getSegmentCategory(segment);

      const matchesSearch = `${name} ${description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [segments, search, categoryFilter]);

  const academicSegments = segments.filter(
    (segment) => getSegmentCategory(segment) === "academic"
  ).length;

  const placementSegments = segments.filter(
    (segment) => getSegmentCategory(segment) === "placement"
  ).length;

  // Count each represented student only once.
  const representedStudentIds = new Set(
    segments.flatMap((segment) =>
      getMatchingStudents(segment, students).map(
        (student) => String(student.id)
      )
    )
  );

  return (
    <div className="segments-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STUDENT ANALYTICS</p>
          <h1>Student Segments</h1>

          <p className="page-subtitle">
            Understand student groups and identify where support
            can make the biggest difference.
          </p>
        </div>

        <button
          type="button"
          className="template-button"
          onClick={loadSegments}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="segment-summary-grid">
        <div className="panel segment-summary-card">
          <div className="segment-summary-icon blue">
            <Layers3 size={22} />
          </div>

          <div>
            <span>Total segments</span>
            <strong>{loading ? "—" : segments.length}</strong>
          </div>
        </div>

        <div className="panel segment-summary-card">
          <div className="segment-summary-icon purple">
            <Users size={22} />
          </div>

          <div>
            <span>Students represented</span>
            <strong>
              {loading ? "—" : representedStudentIds.size}
            </strong>
          </div>
        </div>

        <div className="panel segment-summary-card">
          <div className="segment-summary-icon orange">
            <GraduationCap size={22} />
          </div>

          <div>
            <span>Academic-related groups</span>
            <strong>
              {loading ? "—" : academicSegments}
            </strong>
          </div>
        </div>

        <div className="panel segment-summary-card">
          <div className="segment-summary-icon green">
            <BriefcaseBusiness size={22} />
          </div>

          <div>
            <span>Placement-related groups</span>
            <strong>
              {loading ? "—" : placementSegments}
            </strong>
          </div>
        </div>
      </div>

      <section className="panel segment-filter-panel">
        <div className="segment-filter-heading">
          <div>
            <h2>Explore student groups</h2>
            <p>
              Search segments and filter them by their main focus.
            </p>
          </div>

          <span className="segment-results-count">
            {loading
              ? "Loading..."
              : `${filteredSegments.length} groups`}
          </span>
        </div>

        <div className="segment-filter-controls">
          <div className="segment-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search segments..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search student segments"
            />
          </div>

          <select
            className="segment-category-select"
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            aria-label="Filter segments by category"
          >
            <option value="all">All categories</option>
            <option value="academic">Academic</option>
            <option value="placement">Placement</option>
            <option value="success">High performance</option>
            <option value="general">Other groups</option>
          </select>
        </div>
      </section>

      {loading && (
        <div className="panel segment-state">
          <RefreshCw size={25} className="spin" />
          <h3>Loading student segments...</h3>
        </div>
      )}

      {!loading && error && (
        <div className="panel segment-state">
          <AlertTriangle size={27} />
          <h3>Unable to load segments</h3>
          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={loadSegments}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filteredSegments.length > 0 && (
        <div className="segment-cards-grid">
          {filteredSegments.map((segment, index) => (
            <SegmentCard
              key={`${getSegmentName(segment)}-${index}`}
              segment={segment}
              students={students}
              onView={setSelectedSegment}
            />
          ))}
        </div>
      )}

      {!loading && !error && filteredSegments.length === 0 && (
        <div className="panel segment-state">
          <Search size={27} />
          <h3>No matching segments found</h3>
          <p>
            Try another search term or select a different category.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      <SegmentDetailsModal
        segment={selectedSegment}
        students={students}
        onClose={() => setSelectedSegment(null)}
      />
    </div>
  );
}
