
import { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileUp,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Database,
  Eye,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const STORAGE_KEY = "edupulse_uploaded_students";

const REQUIRED_COLUMNS = [
  "student_id",
  "attendance_percentage",
  "previous_marks",
  "internal_marks",
  "assignment_completion",
  "subject",
];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  text = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;

      row.push(cell.trim());

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error("The CSV contains an unclosed quotation mark.");
  }

  row.push(cell.trim());

  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  return rows;
}

function validateRecords(text) {
  const rows = parseCSV(text);

  if (rows.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one student record."
    );
  }

  
const headers = rows[0].map((header) => header.trim());


  if (headers.some((header) => !header)) {
    throw new Error("The CSV contains an empty column name.");
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("The CSV contains duplicate column names.");
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
  (column) =>
    column !== "attendance_percentage" &&
    !headers.includes(column)
);

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}`
    );
  }

  

  const uploadedIds = new Set();

  return rows.slice(1).map((values, index) => {
    const student = {};

    headers.forEach((header, columnIndex) => {
      student[header] = (values[columnIndex] ?? "").trim();
    });

    const errors = [];
    const studentId = student.student_id.toLowerCase();

    if (!student.student_id) {
      errors.push("Student ID is required.");
    } else if (uploadedIds.has(studentId)) {
      errors.push("Duplicate student ID in this file.");
    } 

    if (studentId) uploadedIds.add(studentId);

    

const numericRules = {
  attendance_percentage: [0, 100],
  previous_marks: [0, 100],
  internal_marks: [0, 100],
  assignment_completion: [0, 100],

  early_assessment_count: [0, Infinity],
  early_average_score: [0, 100],
  early_lowest_score: [0, 100],
  early_latest_submission_day: [0, 28],
  early_total_clicks: [0, Infinity],
  early_active_days: [0, Infinity],
  early_active_sites: [0, Infinity],

  CGPA: [0, 10],
  Internships: [0, Infinity],
  Projects: [0, Infinity],
  "Workshops/Certifications": [0, Infinity],
  AptitudeTestScore: [0, 100],
  SoftSkillsRating: [0, 5],
  SSC_Marks: [0, 100],
  HSC_Marks: [0, 100],
};

for (const [column, [min, max]] of Object.entries(numericRules)) {
  const rawValue = student[column] ?? "";

  if (rawValue === "" && column === "attendance_percentage") {
    student[column] = null;
    continue;
  }

  if (rawValue === "") {
    errors.push(`${column} is required.`);
    continue;
  }

  const number = Number(rawValue);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max ||
    (Number.isInteger(min) && !Number.isInteger(number) &&
      [
        "early_assessment_count",
        "early_total_clicks",
        "early_active_days",
        "early_active_sites",
        "Internships",
        "Projects",
        "Workshops/Certifications",
      ].includes(column))
  ) {
    errors.push(
      `${column} must be a valid number between ${min} and ${
        max === Infinity ? "a non-negative value" : max
      }.`
    );
  } else {
    student[column] = number;
  }
}

for (const column of ["ExtracurricularActivities", "PlacementTraining"]) {
  const value = (student[column] ?? "").trim();

  if (!["Yes", "No"].includes(value)) {
    errors.push(`${column} must be either Yes or No.`);
  } else {
    student[column] = value;
  }


    if (!student.subject) {
      errors.push("Subject is required.");
    }

    return {
      rowNumber: index + 2,
      student,
      errors,
      valid: errors.length === 0,
    };
  }});
}

function loadImportedStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const students = saved ? JSON.parse(saved) : [];
    return Array.isArray(students) ? students : [];
  } catch {
    return [];
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://beauty-tsunami-truly-terminal.trycloudflare.com/api";

async function apiRequest(path, method, body) {
  const token = sessionStorage.getItem("edupulse_access_token");

  if (!token) {
    throw new Error("Please log in again before uploading students.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed: ${response.status}`
    );
  }

  return data;
}


function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

export default function UploadStudents() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [records, setRecords] = useState([]);
  const [importedCount, setImportedCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [storedCount, setStoredCount] = useState(
    () => loadImportedStudents().length
  );

  const validRecords = records.filter((record) => record.valid);
  const invalidRecords = records.filter((record) => !record.valid);
  const displayedRecords = showAll ? records : records.slice(0, 10);

  function clearResults() {
    setMessage(null);
    setRecords([]);
    setImportedCount(0);
    setShowAll(false);
  }

  function selectFile(selectedFile) {
    clearResults();

    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setMessage({
        type: "error",
        text: "Please select a CSV file.",
      });
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setMessage({
        type: "error",
        text: "The selected file is empty.",
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setMessage({
        type: "error",
        text: "The file must be smaller than 10 MB.",
      });
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) {
      setMessage({
        type: "error",
        text: "Please select a CSV file first.",
      });
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const text = await file.text();
      const validatedRecords = validateRecords(text);

      setRecords(validatedRecords);
      setMessage({
        type: validatedRecords.some((record) => !record.valid)
          ? "warning"
          : "success",
        text: `Validation complete. ${validatedRecords.filter((record) => record.valid).length} valid and ${validatedRecords.filter((record) => !record.valid).length} invalid records found.`,
      });
    } catch (error) {
      setRecords([]);
      setMessage({
        type: "error",
        text: error.message || "Unable to read this CSV file.",
      });
    } finally {
      setLoading(false);
    }
  }

  


async function importValidRecords() {
  if (validRecords.length === 0) return;

  setLoading(true);
  setMessage({
    type: "warning",
    text: "Saving students and running analytics...",
  });

  let savedCount = 0;
  let analyticsCount = 0;
  const failures = [];

  try {
    for (const record of validRecords) {
      const student = record.student;
      const id = String(student.student_id).trim();

      try {
        const studentBody = {
          student_id: id,
          name: student.name || id,
          department: student.department || student.subject || null,
          attendance_percentage:
            student.attendance_percentage ?? null,
        };

        // Create the student, or update the existing record.
       
        try {
          await apiRequest("/students/", "POST", studentBody);
        } catch (createError) {
          let existing;

          try {
            existing = await apiRequest(
              `/students/${encodeURIComponent(id)}`,
              "GET"
            );
          } catch {
            throw createError;
          }

          if (!existing || !existing.student_id) {
            throw createError;
          }

          await apiRequest(
            `/students/${encodeURIComponent(id)}`,
            "PUT",
            {
              name: studentBody.name,
              department: studentBody.department,
              attendance_percentage: studentBody.attendance_percentage,
            }
          );
        }

        savedCount++;


        // These are the seven features required by the
        // academic and segmentation models.
        const academicFields = [
          "early_assessment_count",
          "early_average_score",
          "early_lowest_score",
          "early_latest_submission_day",
          "early_total_clicks",
          "early_active_days",
          "early_active_sites",
        ];

        const placementFields = [
          "CGPA",
          "Internships",
          "Projects",
          "Workshops/Certifications",
          "AptitudeTestScore",
          "SoftSkillsRating",
          "ExtracurricularActivities",
          "PlacementTraining",
          "SSC_Marks",
          "HSC_Marks",
        ];

        const hasFields = (fields) =>
          fields.every(
            (field) =>
              student[field] !== undefined &&
              student[field] !== null &&
              String(student[field]).trim() !== ""
          );

        // Only send fields actually present in the CSV.
        const analyticsPayload = { student_id: id };

        for (const field of academicFields) {
          if (student[field] !== undefined &&
              String(student[field]).trim() !== "") {
            analyticsPayload[field] = Number(student[field]);
          }
        }

        for (const field of placementFields) {
          if (student[field] !== undefined &&
              String(student[field]).trim() !== "") {
            analyticsPayload[field] =
              ["ExtracurricularActivities", "PlacementTraining"].includes(field)
                ? student[field]
                : Number(student[field]);
          }
        }

        if (!hasFields(academicFields) && !hasFields(placementFields)) {
          failures.push(
            `${id}: Student saved, but model inputs are missing from the CSV.`
          );
          continue;
        }

        await apiRequest(
          "/predictions/student-analytics",
          "POST",
          analyticsPayload
        );

        analyticsCount++;
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
      }
    }

    setImportedCount(savedCount);
    setStoredCount(loadImportedStudents().length);

    
setRecords((current) =>
  current.map((record) => {
    if (!record.valid) return record;

    const studentId = String(record.student.student_id).trim();
    const hadError = failures.some((failure) =>
      failure.startsWith(`${studentId}:`)
    );

    return {
      ...record,
      imported: !hadError,
      errors: hadError
        ? [
            ...record.errors,
            "Student import or analytics failed. Check the import message for details.",
          ]
        : record.errors,
    };
  })
);


    setMessage({
      type: failures.length ? "warning" : "success",
      text:
        `${savedCount} students saved. ` +
        `${analyticsCount} analytics requests succeeded. ` +
        `${failures.length} issues occurred.` +
        (failures.length
          ? ` First issue: ${failures[0]}`
          : ""),
    });

    if (savedCount > 0) {
      window.location.assign("/dashboard");
    }
  } catch (error) {
    setMessage({
      type: "error",
      text: error.message || "Unable to import records.",
    });
  } finally {
    setLoading(false);
  }
}




  function downloadTemplate() {
    const rows = [
      REQUIRED_COLUMNS,
      ["S101", "85", "78", "82", "90", "DBMS"],
      ["S102", "70", "65", "68", "75", "Java"],
    ];

    downloadCSV(
      "student_upload_template.csv",
      rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n")
    );
  }

  function downloadInvalidRecords() {
    const rows = [
      ["row_number", ...REQUIRED_COLUMNS, "validation_errors"],
      ...invalidRecords.map((record) => [
        record.rowNumber,
        ...REQUIRED_COLUMNS.map((column) => record.student[column] ?? ""),
        record.errors.join("; "),
      ]),
    ];

    downloadCSV(
      "student_upload_errors.csv",
      rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n")
    );
  }

  function removeFile() {
    setFile(null);
    clearResults();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="upload-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STUDENT DATA</p>
          <h1>Upload Student Records</h1>
          <p className="page-subtitle">
            Import, validate and preview academic records for student
            performance analysis.
          </p>
        </div>

        <button
          type="button"
          className="template-button"
          onClick={downloadTemplate}
          disabled={loading}
        >
          <Download size={17} />
          Download CSV Template
        </button>
      </div>

      <section className="panel upload-panel">
        <div className="upload-intro">
          <div className="upload-icon">
            <FileSpreadsheet size={27} />
          </div>

          <div>
            <h2>Import student data</h2>
            <p>
              Select a CSV file containing the required student data
              columns.
            </p>
          </div>
        </div>

        <div
          className={`drop-zone ${dragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            selectFile(event.dataTransfer.files?.[0]);
          }}
        >
          <div className="drop-icon">
            <FileUp size={31} />
          </div>

          <h3>Drag and drop your CSV file here</h3>
          <p>or select a file from your computer</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <Upload size={17} />
            Choose CSV File
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <p className="file-hint">CSV format · Maximum size 10 MB</p>
        </div>

        {file && (
          <div className="selected-file">
            <div className="selected-file-icon">
              <FileSpreadsheet size={22} />
            </div>

            <div className="selected-file-info">
              <strong>{file.name}</strong>
              <span>
                {(file.size / 1024).toFixed(1)} KB · Ready to validate
              </span>
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Remove selected file"
              disabled={loading}
              onClick={removeFile}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {message && (
          <div
            className={`upload-message ${message.type}`}
            role="status"
            aria-live="polite"
          >
            {message.type === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <AlertCircle size={19} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="button"
          className="primary-button upload-submit"
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? (
            <>
              <RefreshCw size={17} className="spin" />
              Validating CSV...
            </>
          ) : (
            <>
              <Eye size={17} />
              Validate and Preview
            </>
          )}
        </button>

        <p className="upload-disclaimer">
          Records are validated and stored locally in this browser.
          Nothing is sent to the backend.
        </p>
      </section>

      {records.length > 0 && (
        <section className="panel requirements-panel">
          <h2>Validation Summary</h2>

          <div className="upload-summary-grid">
            <div className="upload-summary-card">
              <span>Total records</span>
              <strong>{records.length}</strong>
            </div>
            <div className="upload-summary-card valid">
              <span>Valid records</span>
              <strong>{validRecords.length}</strong>
            </div>
            <div className="upload-summary-card invalid">
              <span>Invalid records</span>
              <strong>{invalidRecords.length}</strong>
            </div>
            <div className="upload-summary-card">
              <span>Saved locally</span>
              <strong>{storedCount}</strong>
            </div>
          </div>

          <div className="upload-preview-heading">
            <div>
              <h2>Student Preview</h2>
              <p>Review the rows before importing valid records.</p>
            </div>

            {invalidRecords.length > 0 && (
              <button
                type="button"
                className="template-button"
                onClick={downloadInvalidRecords}
              >
                <Download size={16} />
                Download Errors
              </button>
            )}
          </div>

          <div className="upload-table-wrapper">
            <table className="upload-preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Student ID</th>
                  <th>Attendance</th>
                  <th>Previous Marks</th>
                  <th>Internal Marks</th>
                  <th>Assignments</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {displayedRecords.map((record) => (
                  <tr
                    key={record.rowNumber}
                    className={record.valid ? "" : "upload-invalid-row"}
                  >
                    <td>{record.rowNumber}</td>
                    <td>{record.student.student_id || "—"}</td>
                    <td>
  <input
    type="number"
    min="0"
    max="100"
    step="0.01"
    value={record.student.attendance_percentage ?? ""}
    placeholder="Enter %"
    disabled={record.imported}
    onChange={(event) => {
  const rawValue = event.target.value;
  const value = rawValue === "" ? null : Number(rawValue);

  setRecords((current) =>
    current.map((item) => {
      if (item.rowNumber !== record.rowNumber) {
        return item;
      }

      const otherErrors = item.errors.filter(
        (error) =>
          !error.startsWith("attendance_percentage")
      );

      const attendanceErrors = [];

      if (rawValue !== "" && (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100
      )) {
        attendanceErrors.push(
          "attendance_percentage must be a number between 0 and 100."
        );
      }

      const errors = [...otherErrors, ...attendanceErrors];

      return {
        ...item,
        student: {
          ...item.student,
          attendance_percentage: value,
        },
        errors,
        valid: errors.length === 0,
      };
    })
  );
}}
  />
  %
</td>
                    <td>{record.student.previous_marks ?? "—"}</td>
                    <td>{record.student.internal_marks ?? "—"}</td>
                    <td>
                      {record.student.assignment_completion ?? "—"}
                    </td>
                    <td>{record.student.subject || "—"}</td>
                    <td>
                      <span
                        className={`upload-row-status ${
                          record.valid ? "valid" : "invalid"
                        }`}
                      >
                        {record.imported
                          ? "Imported"
                          : record.valid
                            ? "Valid"
                            : "Invalid"}
                      </span>
                      {!record.valid && (
                        <p className="upload-row-errors">
                          {record.errors.join(" ")}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {records.length > 10 && (
            <button
              type="button"
              className="template-button upload-show-more"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Show first 10 rows" : `Show all ${records.length} rows`}
            </button>
          )}

          <div className="upload-import-actions">
            <p>
              {validRecords.length} valid record(s) available to import.
              {invalidRecords.length > 0 &&
                " Invalid rows will be skipped."}
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={importValidRecords}
              disabled={validRecords.length === 0 || importedCount > 0}
            >
              <Database size={17} />
              {importedCount > 0
                ? "Records Imported"
                : "Import Valid Records"}
            </button>
          </div>
        </section>
      )}

      <section className="panel requirements-panel">
        <h2>CSV File Requirements</h2>
        <p>
          Column names must match the template. Attendance, marks and
          assignment completion must be numeric values between 0 and 100.
        </p>

        <div className="requirements-list">
          {[
            ["student_id", "Unique student identifier"],
            ["attendance_percentage", "Attendance percentage (0–100)"],
            ["previous_marks", "Previous assessment marks (0–100)"],
            ["internal_marks", "Internal assessment marks (0–100)"],
            ["assignment_completion", "Assignment completion (0–100)"],
            ["subject", "Subject name"],
          ].map(([column, description]) => (
            <div className="requirement-item" key={column}>
              <code>{column}</code>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
