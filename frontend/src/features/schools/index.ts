export interface SchoolRecord {
  id: string;
  name: string;
  udiseCode: string;
  regionId: string;
  districtId: string;
  blockId: string;
  address: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  totalStudents: number;
  hasScienceLab: boolean;
  hasElectricity: boolean;
  hasInternet: boolean;
  priorityCategory?: string;
}

export interface SchoolRegistrationRequest {
  id: string;
  schoolId: string;
  preferredDate: string;
  expectedStudentCount: number;
  topicsRequested?: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD";
  remarks?: string;
}

export function calculateSchoolPriority(school: Partial<SchoolRecord>): "HIGH" | "MEDIUM" | "STANDARD" {
  if (!school.hasScienceLab && (school.totalStudents || 0) > 100) return "HIGH";
  if (!school.hasElectricity || !school.hasInternet) return "HIGH";
  if (!school.hasScienceLab) return "MEDIUM";
  return "STANDARD";
}
