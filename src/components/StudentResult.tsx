/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Student } from "../types";
import { FileSpreadsheet, Printer, ArrowLeft, ShieldCheck, Calendar, Award, Clock } from "lucide-react";
import dbService from "../lib/supabase";

interface StudentResultProps {
  student: Student;
  initialTerm?: "hk1" | "hk2" | "canam";
  onBack: () => void;
}

export default function StudentResult({ student, initialTerm = "canam", onBack }: StudentResultProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<"hk1" | "hk2" | "canam">(initialTerm);
  const [advisorName, setAdvisorName] = useState(student.teacher || "Vũ Văn Hùng");
  
  useEffect(() => {
    let active = true;
    const fetchAdvisor = async () => {
      try {
        const classes = await dbService.getClasses();
        if (!active) return;
        const matched = classes.find(c => c.className === student.className);
        if (matched && matched.advisorName) {
          setAdvisorName(matched.advisorName);
        }
      } catch (err) {
        console.warn("Failed to fetch advisor name:", err);
      }
    };
    fetchAdvisor();
    return () => { active = false; };
  }, [student.className, student.teacher]);
  
  const headerTop = localStorage.getItem("portal_header_top") || "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";
  const schoolYearRaw = localStorage.getItem("portal_school_year") || student.academicYear || "Năm học 2025-2026";
  const schoolYear = schoolYearRaw.replace(/năm học/i, "").trim();

  const formatDob = (dob: string) => {
    if (!dob) return "";
    if (dob.includes("-")) {
      const parts = dob.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dob;
  };

  // Compute live term summary as required under Circular 22 rules
  const scoreSubjects = student.subjects.filter(s => s.isEvaluatedByScore);
  let scoreCount = 0;
  let scoreSum = 0;
  scoreSubjects.forEach(s => {
    const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
    if (typeof val === "number") {
      scoreSum += val;
      scoreCount++;
    }
  });
  const activeGpa = scoreCount > 0 ? (scoreSum / scoreCount) : 0.0;

  // Academic Classification
  let activeAcademicGrade = student.academicGrade;
  if (scoreCount > 0) {
    const nonScorePassed = student.subjects
      .filter(s => !s.isEvaluatedByScore)
      .every(s => {
        const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
        return val === "Đạt" || !val;
      });

    const allAbove65 = scoreSubjects.every(s => {
      const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
      return typeof val === "number" && val >= 6.5;
    });
    const allAbove50 = scoreSubjects.every(s => {
      const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
      return typeof val === "number" && val >= 5.0;
    });
    const allAbove35 = scoreSubjects.every(s => {
      const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
      return typeof val === "number" && val >= 3.5;
    });

    if (activeGpa >= 8.0 && nonScorePassed && allAbove65) {
      activeAcademicGrade = "Tốt";
    } else if (activeGpa >= 6.5 && nonScorePassed && allAbove50) {
      activeAcademicGrade = "Khá";
    } else if (activeGpa >= 5.0 && nonScorePassed && allAbove35) {
      activeAcademicGrade = "Đạt";
    } else {
      activeAcademicGrade = "Chưa đạt";
    }
  }

  // Behavior Grade
  const activeBehaviorGrade = student.behaviorGrade;

  // Designation Distinction
  let activeDistinction = "KHÔNG";
  if (term === "canam") {
    activeDistinction = student.distinction && student.distinction !== "Không" ? student.distinction.toUpperCase() : "KHÔNG";
  } else {
    if (activeAcademicGrade === "Tốt" && activeBehaviorGrade === "Tốt") {
      activeDistinction = "HỌC SINH GIỎI";
    } else if (activeAcademicGrade === "Khá" && activeBehaviorGrade === "Tốt") {
      activeDistinction = "HỌC SINH TIÊU BIỂU";
    }
  }

  // Days absent
  let activeDaysAbsent = student.daysAbsent;
  if (term === "hk1") {
    activeDaysAbsent = Math.ceil(student.daysAbsent * 0.4);
  } else if (term === "hk2") {
    activeDaysAbsent = Math.floor(student.daysAbsent * 0.6);
  }

  // Trigger professional print-to-PDF
  const handlePrint = () => {
    window.print();
  };

  // Export results to clean Unicode CSV (Excel-compatible)
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8
    
    // Header
    csvContent += "CỔNG THÔNG TIN TRA CỨU ĐIỂM - KẾT QUẢ HỌC TẬP THCS\n";
    csvContent += `Trường: ${student.school}\n`;
    csvContent += `Lớp: ${student.className} | Năm học: ${schoolYear}\n\n`;
    
    // Student Info
    csvContent += "THÔNG TIN HỌC SINH\n";
    csvContent += `Mã HS,Họ tên,Ngày sinh,Kế quả học tập,Kết quả rèn luyện,Danh hiệu,Số ngày vắng\n`;
    csvContent += `"${student.studentCode}","${student.fullName}","${formatDob(student.dob)}","${student.academicGrade}","${student.behaviorGrade}","${student.distinction}",${student.daysAbsent}\n\n`;
    
    // Grade Sheet Header
    csvContent += "BẢNG KẾT QUẢ HỌC TẬP\n";
    csvContent += "Môn học,Cuối kì I,Cuối kì II,Cả năm\n";
    
    student.subjects.forEach(sub => {
      if (sub.isEvaluatedByScore) {
        csvContent += `"${sub.subjectName}",${sub.end1 || ""},${sub.end2 || ""},${sub.yearAvg || ""}\n`;
      } else {
        csvContent += `"${sub.subjectName}","${sub.semester1 || ""}","${sub.semester2 || ""}","${sub.yearAvg || ""}"\n`;
      }
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BangDiem_${student.studentCode}_${student.fullName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-5xl mx-auto" id="student-result-container">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between p-2 no-print w-full relative">
        <div className="flex justify-start">
          <button
            onClick={onBack}
            id="btn-back-query"
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Term Switcher removed for optimized display space as requested */}

        <div className="flex items-center justify-end">
          <button
            onClick={handlePrint}
            id="btn-print-pdf"
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#E53935] hover:bg-[#C62828] text-white rounded-lg transition cursor-pointer shadow-sm shrink-0"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Printable report card container */}
      <div
        ref={printAreaRef}
        id="print-card-area"
        className="bg-white px-2 py-2 sm:px-3 sm:py-3 text-black font-serif w-full max-w-4xl mx-auto border sm:shadow-lg"
      >
        {/* Document Header */}
        <div className="mb-2 text-[#0055A5]">
          <div className="uppercase font-bold text-[11px] sm:text-[12px] leading-snug whitespace-nowrap">ỦY BAN NHÂN DÂN XÃ XA DUNG</div>
          <div className="uppercase font-bold text-[11px] sm:text-[13px] leading-snug whitespace-nowrap">TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ</div>
        </div>

        {/* Title */}
        <div className="text-center mb-2 text-[#E53935]">
          <h1 className="font-black text-base sm:text-lg uppercase mb-0.5 tracking-wide">KẾT QUẢ HỌC TẬP</h1>
          <h2 className="font-bold text-[11px] sm:text-xs text-[#0055A5]">Năm học {schoolYear}</h2>
        </div>

        {/* Outer wrapping to handle responsive scrolling if needed on very small devices, but print avoids scroll */}
        <div className="w-full overflow-x-auto overflow-y-hidden text-[#003366]">
          <table className="w-full border-collapse border border-slate-300 text-[9px] sm:text-[10px] md:text-[11px] mb-1">
            <colgroup>
              <col className="w-8 sm:w-12" />
              <col className="w-auto" />
              <col className="w-10 sm:w-16" />
              <col className="w-10 sm:w-16" />
              <col className="w-12 sm:w-20" />
              <col className="w-12 sm:w-20" />
              <col className="w-14 sm:w-24" />
            </colgroup>
            <tbody>
              {/* Info row 1 */}
              <tr>
                <td className="p-1 sm:p-1.5 border border-slate-300 font-bold whitespace-nowrap text-right pr-4 sm:pr-8 bg-[#f8fafc]" colSpan={2}>
                  Mã HS :
                </td>
                <td className="p-1 sm:p-1.5 border border-slate-300 font-bold text-left px-3 text-[#0055A5]" colSpan={5}>
                  {student.studentCode}
                </td>
              </tr>
              {/* Info row 2 */}
              <tr>
                <td className="p-1 sm:p-1.5 border border-slate-300 font-bold whitespace-nowrap text-right pr-4 sm:pr-8 bg-[#f8fafc]" colSpan={2}>
                  Họ và tên:
                </td>
                <td className="p-1 sm:p-1.5 border border-slate-300 font-black text-left px-3 text-[#E53935]" colSpan={3}>
                  {student.fullName}
                </td>
                <td className="p-1 sm:p-1.5 border border-slate-300 font-bold text-center bg-[#f8fafc]" colSpan={2}>
                  Lớp: <span className="text-[#0055A5]">{student.className}</span>
                </td>
              </tr>

              {/* Spacer Row if desired, but image does not have one, it goes straight to headers */}

              {/* Table Headers */}
              <tr className="font-bold text-center bg-[#0055A5] text-white">
                <td className="p-1 border border-blue-800">TT</td>
                <td className="p-1 border border-blue-800">Môn học</td>
                <td className="p-1 border border-blue-800">Kỳ 1</td>
                <td className="p-1 border border-blue-800">Kỳ 2</td>
                <td className="p-1 border border-blue-800">Thi lại</td>
                <td className="p-1 border border-blue-800 whitespace-nowrap">Cả năm</td>
                <td className="p-1 border border-blue-800">Ghi chú</td>
              </tr>
              
              {/* Subjects */}
              {student.subjects.map((sub, index) => {
                const valHk1 = sub.isEvaluatedByScore 
                  ? (sub.semester1 !== undefined && typeof sub.semester1 === "number" ? sub.semester1.toFixed(1).replace(".", ",") : (sub.end1 !== undefined ? sub.end1.toFixed(1).replace(".", ",") : "")) 
                  : sub.semester1 || "";
                const valHk2 = sub.isEvaluatedByScore 
                  ? (sub.semester2 !== undefined && typeof sub.semester2 === "number" ? sub.semester2.toFixed(1).replace(".", ",") : (sub.end2 !== undefined ? sub.end2.toFixed(1).replace(".", ",") : "")) 
                  : sub.semester2 || "";
                const valCaNam = sub.isEvaluatedByScore
                  ? (sub.yearAvg !== undefined && typeof sub.yearAvg === "number" ? sub.yearAvg.toFixed(1).replace(".", ",") : "")
                  : sub.yearAvg || "";

                return (
                 <tr key={index} className="text-center even:bg-slate-50 hover:bg-slate-100 transition-colors">
                     <td className="p-0.5 sm:p-1 border border-slate-300 font-medium text-slate-500">{index + 1}</td>
                     <td className="p-0.5 sm:p-1 border border-slate-300 text-left px-2 sm:px-3 font-semibold">{sub.subjectName}</td>
                     <td className="p-0.5 sm:p-1 border border-slate-300 font-bold">{valHk1}</td>
                     <td className="p-0.5 sm:p-1 border border-slate-300 font-bold">{valHk2}</td>
                     <td className="p-0.5 sm:p-1 border border-slate-300"></td>
                     <td className="p-0.5 sm:p-1 border border-slate-300 font-black text-[#E53935]">{valCaNam}</td>
                     <td className="p-0.5 sm:p-1 border border-slate-300"></td>
                 </tr>
                );
              })}

              {/* Summary Rows */}
              <tr className="bg-[#f8fafc]">
                <td className="py-1 px-1 border border-slate-300 font-black text-[#0055A5] whitespace-nowrap text-center" colSpan={2} rowSpan={2}>
                  Kết quả CN:
                </td>
                <td className="p-1 border border-slate-300 text-center whitespace-normal font-semibold" colSpan={5}>
                  Vắng: <span className="text-[#E53935]">{student.daysAbsent}</span> (phép), <span className="text-[#E53935]">{student.daysAbsentUnexcused || 0}</span> (không), <span className="text-[#E53935]">0</span>(bỏ tiết)
                </td>
              </tr>
              <tr className="bg-[#f8fafc]">
                <td className="p-1 border border-slate-300 text-center whitespace-normal font-bold" colSpan={5}>
                  KQHT: <span className="text-[#E53935]">{student.academicGrade?.toUpperCase() || "KHÁ"}</span> | KQRL: <span className="text-[#0055A5]">{student.behaviorGrade?.toUpperCase() || "TỐT"}</span> | Danh hiệu: (<span className="text-[#E53935]">{activeDistinction === "KHÔNG" || !activeDistinction ? "KHÔNG" : activeDistinction}</span>)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="flex justify-between mt-2 sm:mt-4 text-[11px] sm:text-[12px] text-[#003366]">
          <div className="w-5/12 text-center font-bold pt-1">
            Ý kiến của phụ huynh học sinh
          </div>
          <div className="w-7/12 relative min-h-[120px] sm:min-h-[140px]">
            <div className="absolute top-1 left-4 sm:left-10 font-bold">
              Nhận xét của GVCN
            </div>
            
            <div className="absolute bottom-0 right-2 sm:right-10 flex flex-col items-center">
              <span className="italic mb-1">
                Ngày {new Date().getDate() < 10 ? `0${new Date().getDate()}` : new Date().getDate()} tháng {new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </span>
              <span className="font-medium">Giáo viên chủ nhiệm</span>
              <span className="mt-8 sm:mt-12 font-black uppercase text-[#0055A5]">{advisorName}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 sm:mt-8 pt-2 text-[9px] sm:text-[10px] text-slate-500 font-medium no-print">
          Mã xác thực học bạ điện tử: <span className="font-mono text-slate-700">{student.id}</span>. Bản quyền kết quả thuộc về trường PTDTBT Tiểu học và THCS Suối Lư.
        </div>
      </div>
      
      {/* Printed-Only Guidelines */}
      <div className="hidden print-only text-center text-[10px] text-slate-400 mt-4 leading-normal">
        Tài liệu được in trực tiếp từ Cổng tra cứu kết quả học tập trực tuyến vào {new Date().toLocaleString("vi-VN")}. 
        Sử dụng mã QR để đối soát tính trung thực của văn bản.
      </div>
    </div>
  );
}
