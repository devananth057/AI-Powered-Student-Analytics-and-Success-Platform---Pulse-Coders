/**
 * Temporary mock data provider for frontend development before FastAPI is ready.
 * This service deliberately does not call the network or persist changes.
 * Replace calls with the confirmed API service when backend integration begins.
 */
import {
  mockDashboardOverview,
  mockInterventions,
  mockSegments,
  mockStudents,
} from "../data/mockData";

const copy = (value) => JSON.parse(JSON.stringify(value));

export async function getMockDashboardOverview() {
  return copy(mockDashboardOverview);
}

export async function getMockStudents() {
  return copy(mockStudents);
}

export async function getMockStudentById(id) {
  return copy(mockStudents.find((student) => student.id === id) ?? null);
}

export async function getMockStudentAnalytics(id) {
  const student = mockStudents.find((item) => item.id === id);
  if (!student) return null;

  return copy({
    studentId: student.id,
    successScore: student.successScore,
    academicRisk: student.academicRisk,
    placementRisk: student.placementRisk,
    segment: student.segment,
    indicators: student.indicators,
    scoreContributions: student.scoreContributions,
    riskReasons: student.riskReasons,
    recommendations: student.recommendations,
    dataCoverage: student.dataCoverage,
  });
}

export async function getMockSegments() {
  return copy(mockSegments);
}

export async function getMockInterventions() {
  return copy(mockInterventions);
}
