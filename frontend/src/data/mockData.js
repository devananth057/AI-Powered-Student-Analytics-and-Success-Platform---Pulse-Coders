/**
 * EduPulse AI mock data contract.
 *
 * IMPORTANT:
 * - These records are illustrative frontend fixtures, NOT real student data.
 * - Scores, risk levels, indicator contributions and recommendations below are
 *   placeholders for UI development only; do not present them as ML predictions.
 * - Replace these fixtures with the agreed FastAPI response shapes once the
 *   backend contract is confirmed.
 */

export const MOCK_DATA_NOTICE =
  "Illustrative sample data only — not real student records or ML predictions.";

export const mockStudents = [
  {
    id: "S104",
    name: "Student A",
    department: "Computer Science",
    course: "B.Sc. Computer Science",
    cohort: "2024",
    successScore: 58,
    academicRisk: "high",
    placementRisk: "medium",
    segment: "Needs academic support",
    indicators: {
      attendance: { value: 68, unit: "%", available: true },
      academicAverage: { value: 52, unit: "%", available: true },
      lmsEngagement: { value: 46, unit: "%", available: true },
      placementReadiness: { value: 61, unit: "%", available: true },
      skillsAssessment: { value: null, unit: "%", available: false },
      feedback: { value: 3.2, unit: "/5", available: true },
    },
    scoreContributions: [
      { indicator: "Academic performance", contribution: 16, direction: "positive" },
      { indicator: "Attendance", contribution: 12, direction: "positive" },
      { indicator: "LMS engagement", contribution: 10, direction: "positive" },
      { indicator: "Placement readiness", contribution: 13, direction: "positive" },
      { indicator: "Skills assessment", contribution: null, direction: "unavailable" },
      { indicator: "Feedback", contribution: 7, direction: "positive" },
    ],
    riskReasons: ["Low attendance indicator", "Low recent assessment average"],
    recommendations: [
      "Review attendance and agree on a support plan.",
      "Review recent assessment results with the student.",
    ],
    dataCoverage: 83,
  },
  {
    id: "S108",
    name: "Student B",
    department: "Computer Science",
    course: "B.Sc. Computer Science",
    cohort: "2024",
    successScore: 71,
    academicRisk: "medium",
    placementRisk: "high",
    segment: "Strong academics, low placement readiness",
    indicators: {
      attendance: { value: 84, unit: "%", available: true },
      academicAverage: { value: 78, unit: "%", available: true },
      lmsEngagement: { value: 73, unit: "%", available: true },
      placementReadiness: { value: 39, unit: "%", available: true },
      skillsAssessment: { value: 42, unit: "%", available: true },
      feedback: { value: null, unit: "/5", available: false },
    },
    scoreContributions: [
      { indicator: "Academic performance", contribution: 19, direction: "positive" },
      { indicator: "Attendance", contribution: 15, direction: "positive" },
      { indicator: "LMS engagement", contribution: 13, direction: "positive" },
      { indicator: "Placement readiness", contribution: 8, direction: "positive" },
      { indicator: "Skills assessment", contribution: 9, direction: "positive" },
      { indicator: "Feedback", contribution: null, direction: "unavailable" },
    ],
    riskReasons: ["Low mock interview readiness indicator", "Low skills assessment indicator"],
    recommendations: [
      "Practise mock interviews and review feedback.",
      "Create a focused plan for the available skills assessments.",
    ],
    dataCoverage: 83,
  },
  {
    id: "S115",
    name: "Student C",
    department: "Information Technology",
    course: "B.Sc. Information Technology",
    cohort: "2024",
    successScore: 64,
    academicRisk: "medium",
    placementRisk: "medium",
    segment: "Needs balanced support",
    indicators: {
      attendance: { value: 81, unit: "%", available: true },
      academicAverage: { value: 64, unit: "%", available: true },
      lmsEngagement: { value: 58, unit: "%", available: true },
      placementReadiness: { value: 57, unit: "%", available: true },
      skillsAssessment: { value: 61, unit: "%", available: true },
      feedback: { value: 3.6, unit: "/5", available: true },
    },
    scoreContributions: [],
    riskReasons: ["Moderate academic and engagement indicators"],
    recommendations: ["Review engagement and assessment progress at the next check-in."],
    dataCoverage: 100,
  },
  {
    id: "S121",
    name: "Student D",
    department: "Computer Science",
    course: "B.Sc. Computer Science",
    cohort: "2023",
    successScore: 88,
    academicRisk: "low",
    placementRisk: "low",
    segment: "Strong overall readiness",
    indicators: {
      attendance: { value: 95, unit: "%", available: true },
      academicAverage: { value: 89, unit: "%", available: true },
      lmsEngagement: { value: 91, unit: "%", available: true },
      placementReadiness: { value: 86, unit: "%", available: true },
      skillsAssessment: { value: 88, unit: "%", available: true },
      feedback: { value: 4.5, unit: "/5", available: true },
    },
    scoreContributions: [],
    riskReasons: [],
    recommendations: ["Continue current academic and placement preparation activities."],
    dataCoverage: 100,
  },
  {
    id: "S126",
    name: "Student E",
    department: "Information Technology",
    course: "B.Sc. Information Technology",
    cohort: "2023",
    successScore: 79,
    academicRisk: "low",
    placementRisk: "medium",
    segment: "Academically on track",
    indicators: {
      attendance: { value: 92, unit: "%", available: true },
      academicAverage: { value: 82, unit: "%", available: true },
      lmsEngagement: { value: 80, unit: "%", available: true },
      placementReadiness: { value: 59, unit: "%", available: true },
      skillsAssessment: { value: 65, unit: "%", available: true },
      feedback: { value: 4.1, unit: "/5", available: true },
    },
    scoreContributions: [],
    riskReasons: ["Placement readiness could be improved"],
    recommendations: ["Complete a mock interview and review skill gaps."],
    dataCoverage: 100,
  },
];

export const mockDashboardOverview = {
  isMock: true,
  notice: MOCK_DATA_NOTICE,
  totalStudents: mockStudents.length,
  averageSuccessScore: Math.round(
    mockStudents.reduce((total, student) => total + student.successScore, 0) /
      mockStudents.length,
  ),
  academicRiskDistribution: { low: 2, medium: 2, high: 1 },
  placementRiskDistribution: { low: 1, medium: 2, high: 1, unavailable: 1 },
  segmentDistribution: [
    { name: "Needs academic support", count: 1 },
    { name: "Strong academics, low placement readiness", count: 1 },
    { name: "Needs balanced support", count: 1 },
    { name: "Strong overall readiness", count: 1 },
    { name: "Academically on track", count: 1 },
  ],
  trends: {
    academicPerformance: [],
    attendance: [],
    lmsEngagement: [],
    placementReadiness: [],
    note: "No historical time-series data is included in this mock fixture.",
  },
};

export const mockSegments = [
  {
    name: "Strong academics, low placement readiness",
    description: "Students with stronger academic indicators and weaker available placement-readiness indicators.",
    eligibilityCriteria: "Must be supplied by the backend/model owner; placeholder description only.",
    recommendedIntervention: "Mock interviews and targeted skills practice.",
  },
  {
    name: "Needs academic support",
    description: "Students whose academic indicators may warrant review.",
    eligibilityCriteria: "Must be supplied by the backend/model owner; placeholder description only.",
    recommendedIntervention: "Faculty review of attendance and assessment progress.",
  },
];

export const mockInterventions = [
  {
    id: "INT-001",
    studentId: "S104",
    title: "Assessment progress review",
    status: "planned",
    assignedTo: "Faculty advisor",
    dueDate: null,
    progressNotes: [],
  },
  {
    id: "INT-002",
    studentId: "S108",
    title: "Mock interview practice",
    status: "in_progress",
    assignedTo: "Placement mentor",
    dueDate: null,
    progressNotes: [],
  },
];

// Endpoint-to-response mapping for coordinating with the FastAPI teammate.
// These are proposed contracts, not confirmed backend responses.
export const proposedApiContract = {
  dashboardOverview: "GET /api/analytics/overview",
  students: "GET /api/students",
  studentProfile: "GET /api/students/:id",
  studentAnalytics: "GET /api/students/:id/analytics",
  uploadStudents: "POST /api/students/upload",
  predictAcademicRisk: "POST /api/students/:id/predict",
  segments: "GET /api/segments",
  studentHistory: "GET /api/students/:id/history",
  createIntervention: "POST /api/students/:id/interventions",
  updateIntervention: "PATCH /api/interventions/:id",
};
