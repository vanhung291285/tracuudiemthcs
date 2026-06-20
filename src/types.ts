/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  isEvaluatedByScore: boolean; // True for Math, Lit, etc. False for Physical Ed, Art, etc.
  // Semester 1
  mid1?: number | string; // Giữa kì 1
  end1?: number | string; // Cuối kì 1
  semester1?: number | string; // ĐTBmhk1 hoặc "Đạt"/"Chưa đạt"
  // Semester 2
  mid2?: number | string; // Giữa kì 2
  end2?: number | string; // Cuối kì 2
  semester2?: number | string; // ĐTBmhk2 hoặc "Đạt"/"Chưa đạt"
  // Year
  yearAvg?: number | string; // ĐTBmcn hoặc "Đạt"/"Chưa đạt"
}

export interface Student {
  id: string;
  studentCode: string; // e.g. "HS202601"
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: "Nam" | "Nữ";
  school: string;
  className: string; // e.g. "9A1"
  gradeLevel: "6" | "7" | "8" | "9";
  academicYear: string; // e.g. "2025-2026"
  
  // Overall results
  academicGrade: "Tốt" | "Khá" | "Đạt" | "Chưa đạt"; // Kết quả học tập
  behaviorGrade: "Tốt" | "Khá" | "Đạt" | "Chưa đạt"; // Kết quả rèn luyện
  behaviorGradeSummer?: "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "Không"; // KQRL sau hè
  daysAbsent: number; // Buổi nghỉ
  daysAbsentUnexcused: number; // Trong đó không phép
  distinction: "Học sinh Xuất sắc" | "Học sinh Giỏi" | "Học sinh Tiêu biểu" | "Không"; // Danh hiệu
  notes: string; // Ghi chú
  
  // Verification details
  verificationToken: string;
  teacher?: string; // Giáo viên chủ nhiệm

  // Subject results
  subjects: SubjectResult[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  useLocalFallback: boolean;
}

export interface SchoolClass {
  id: string;
  className: string; // e.g. "9A1"
  gradeLevel: "6" | "7" | "8" | "9";
  advisorName?: string; // Giáo viên chủ nhiệm
  roomNumber?: string; // Phòng học
}
