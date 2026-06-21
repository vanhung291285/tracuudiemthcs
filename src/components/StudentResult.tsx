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
  const scoreSubjects = (student.subjects || []).filter(s => s.isEvaluatedByScore);
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
    const nonScorePassed = (student.subjects || [])
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
  const hasAnyScoreOverall = (student.subjects || []).some(s => 
    (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
    (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt") ||
    (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt") ||
    (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt")
  );

  const isExempt = !hasAnyScoreOverall && (student.notes?.toLowerCase().includes("khuyết tật") || student.notes?.toLowerCase().includes("miễn"));

  let activeDistinction = "KHÔNG";
  if (isExempt) {
    activeDistinction = "ĐỐI TƯỢNG MIỄN ĐÁNH GIÁ";
  } else if (term === "canam") {
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
    
    (student.subjects || []).forEach(sub => {
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

        {/* Term switcher moved to table summary for cleaner 'original image' look */}

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
        className="bg-white px-3 py-3 sm:px-5 sm:py-5 text-black font-serif w-full max-w-3xl mx-auto border sm:shadow-lg"
      >
        {/* Document Header */}
        <div className="mb-3 text-[#0055A5]">
          <div className="uppercase font-bold text-[10px] sm:text-xs leading-none whitespace-nowrap">ỦY BAN NHÂN DÂN XÃ XA DUNG</div>
          <div className="uppercase font-bold text-xs sm:text-sm leading-tight whitespace-nowrap border-b border-[#0055A5] inline-block">TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ</div>
        </div>

        {/* Title */}
        <div className="text-center mb-3 text-[#E53935]">
          <h1 className="font-black text-xl sm:text-2xl uppercase mb-0.5 tracking-wider italic">KẾT QUẢ HỌC TẬP</h1>
          <h2 className="font-bold text-xs sm:text-sm text-[#0055A5]">Năm học {schoolYear}</h2>
        </div>

        {/* Outer wrapping to handle responsive scrolling if needed on very small devices, but print avoids scroll */}
        <div className="w-full overflow-x-auto overflow-y-hidden text-[#003366] custom-scrollbar">
          <table className="w-full border-collapse border-2 border-slate-500 text-[11px] sm:text-[13px] mb-2">
            <colgroup>
              <col className="w-[30px] sm:w-[45px]" />
              <col className="w-auto" />
              <col className="w-[40px] sm:w-[60px]" />
              <col className="w-[40px] sm:w-[60px]" />
              <col className="w-[40px] sm:w-[60px]" />
              <col className="w-[55px] sm:w-[80px]" />
              <col className="w-[45px] sm:w-[80px]" />
            </colgroup>
            <tbody>
              {/* Info row 1 */}
              <tr>
                <td className="p-2 border border-slate-400 font-bold whitespace-nowrap text-right pr-6 sm:pr-12 bg-[#f0f9ff]" colSpan={2}>
                  Mã HS :
                </td>
                <td className="p-2 border border-slate-400 font-bold text-left px-4 text-[#0055A5]" colSpan={5}>
                  {student.studentCode}
                </td>
              </tr>
              {/* Info row 2 */}
              <tr>
                <td className="p-2 border border-slate-400 font-bold whitespace-nowrap text-right pr-6 sm:pr-12 bg-[#f8fafc]" colSpan={2}>
                  Họ và tên:
                </td>
                <td className="p-2 border border-slate-400 font-black text-left px-4 text-[#E53935] text-[12px] sm:text-[14px]" colSpan={3}>
                  {student.fullName}
                </td>
                <td className="p-2 border border-slate-400 font-bold text-center bg-[#f0f9ff]" colSpan={2}>
                  Lớp: <span className="text-[#0055A5]">{student.className}</span>
                </td>
              </tr>

              {/* Spacer Row if desired, but image does not have one, it goes straight to headers */}

              {/* Table Headers */}
              <tr className="font-bold text-center bg-[#0055A5] text-white">
                <td className="p-1.5 sm:p-2 border border-blue-900">TT</td>
                <td className="p-1.5 sm:p-2 border border-blue-900">Môn học</td>
                <td className="p-1.5 sm:p-2 border border-blue-900 whitespace-nowrap">Kỳ 1</td>
                <td className="p-1.5 sm:p-2 border border-blue-900 whitespace-nowrap">Kỳ 2</td>
                <td className="p-1.5 sm:p-2 border border-blue-900 whitespace-nowrap">Thi lại</td>
                <td className="p-1.5 sm:p-2 border border-blue-900 whitespace-nowrap">Cả năm</td>
                <td className="p-1.5 sm:p-2 border border-blue-900">Ghi chú</td>
              </tr>
              
              {/* Subjects */}
              {(student.subjects || []).map((sub, index) => {
                const valHk1 = sub.isEvaluatedByScore 
                  ? (typeof sub.semester1 === "number" ? sub.semester1.toFixed(1).replace(".", ",") : (typeof sub.end1 === "number" ? sub.end1.toFixed(1).replace(".", ",") : "")) 
                  : sub.semester1 || "";
                const valHk2 = sub.isEvaluatedByScore 
                  ? (typeof sub.semester2 === "number" ? sub.semester2.toFixed(1).replace(".", ",") : (typeof sub.end2 === "number" ? sub.end2.toFixed(1).replace(".", ",") : "")) 
                  : sub.semester2 || "";
                const valCaNam = sub.isEvaluatedByScore
                  ? (typeof sub.yearAvg === "number" ? sub.yearAvg.toFixed(1).replace(".", ",") : "")
                  : sub.yearAvg || "";

                return (
                 <tr key={index} className="text-center even:bg-sky-50 hover:bg-sky-100 transition-colors text-[11px] sm:text-[14px]">
                     <td className="p-1 sm:p-2 border border-slate-400 font-medium text-slate-500">{index + 1}</td>
                     <td className="p-1 sm:p-2 border border-slate-400 text-left px-1.5 sm:px-4 font-semibold tracking-tight text-[11px] sm:text-[14px]">{sub.subjectName}</td>
                     <td className="p-1 sm:p-2 border border-slate-400 font-bold whitespace-nowrap">{valHk1}</td>
                     <td className="p-1 sm:p-2 border border-slate-400 font-bold whitespace-nowrap">{valHk2}</td>
                     <td className="p-1 sm:p-2 border border-slate-400"></td>
                     <td className="p-1 sm:p-2 border border-slate-400 font-black text-[#E53935] whitespace-nowrap">{valCaNam}</td>
                     <td className="p-1 sm:p-2 border border-slate-400"></td>
                 </tr>
                );
              })}

              {/* Summary Rows */}
              <tr className="bg-[#f0f9ff] text-[11px] sm:text-[13px]">
                <td className="py-2 px-1 border-2 border-slate-500 font-black text-[#0055A5] whitespace-nowrap text-center text-[11px] sm:text-[15px] uppercase italic" colSpan={2} rowSpan={2}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="print-only">
                      {term === "hk1" ? "Kết quả HK I:" : term === "hk2" ? "Kết quả HK II:" : "Kết quả CN:"}
                    </span>
                    <div className="no-print flex flex-col gap-1 w-full px-1">
                      {(["hk1", "hk2", "canam"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTerm(t)}
                          className={`w-full py-1 rounded-md text-[9px] sm:text-[11px] font-black uppercase transition-all cursor-pointer border-2 ${
                            term === t
                              ? "bg-[#0055A5] text-white border-blue-900 shadow-md shadow-blue-200"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {t === "hk1" ? "Xem Kỳ I" : t === "hk2" ? "Xem Kỳ II" : "Hiện Cả Năm"}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="p-1.5 sm:p-2 border-2 border-slate-500 text-center whitespace-normal font-bold text-xs sm:text-base" colSpan={5}>
                  Vắng: <span className="text-[#E53935]">{activeDaysAbsent}</span> (p), <span className="text-[#E53935]">0</span> (k), <span className="text-[#E53935]">0</span>(bt)
                </td>
              </tr>
              <tr className="bg-[#f0f9ff] text-[11px] sm:text-[13px]">
                <td className="p-1.5 sm:p-3 border-2 border-slate-500 text-center whitespace-normal font-black text-[14px] sm:text-[18px]" colSpan={5}>
                  {isExempt ? (
                    <span className="text-[#E53935] uppercase">
                      Học sinh Khuyết tật không đánh giá thuộc đối tượng miễn
                    </span>
                  ) : (
                    <>
                      KQHT: <span className="text-[#E53935]">{activeAcademicGrade?.toUpperCase() || "KHÁ"}
                      </span> <span className="mx-2 sm:mx-3 text-slate-300">|</span> KQRL: <span className="text-[#0055A5]">{activeBehaviorGrade?.toUpperCase() || "TỐT"}
                      </span> <span className="mx-1 sm:mx-2 text-slate-300">|</span> <span className="whitespace-nowrap">Danh hiệu: <span className="text-[#E53935] underline decoration-double decoration-2 underline-offset-2">({activeDistinction})</span></span>
                    </>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="flex justify-between mt-4 sm:mt-8 text-[12px] sm:text-[14px] text-[#003366]">
          <div className="w-5/12 text-center font-bold pt-1">
            Ý kiến của phụ huynh học sinh
          </div>
          <div className="w-7/12 relative min-h-[140px] sm:min-h-[160px]">
            <div className="absolute top-1 left-6 sm:left-12 font-bold">
              Nhận xét của GVCN
            </div>
            
            <div className="absolute bottom-0 right-4 sm:right-12 flex flex-col items-center">
              <span className="italic mb-1">
                Ngày {new Date().getDate() < 10 ? `0${new Date().getDate()}` : new Date().getDate()} tháng {new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </span>
              <span className="font-medium">Giáo viên chủ nhiệm</span>
              <span className="mt-8 sm:mt-12 font-black uppercase text-[#0055A5] text-[14px] sm:text-[16px]">{advisorName}</span>
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
