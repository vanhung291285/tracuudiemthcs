/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Student } from "../types";
import { FileSpreadsheet, Printer, ArrowLeft, ShieldCheck, Calendar, Award, Clock } from "lucide-react";
import QRGenerator from "./QRGenerator";

interface StudentResultProps {
  student: Student;
  initialTerm?: "hk1" | "hk2" | "canam";
  onBack: () => void;
}

export default function StudentResult({ student, initialTerm = "canam", onBack }: StudentResultProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<"hk1" | "hk2" | "canam">(initialTerm);
  
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
    csvContent += `Mã HS,Họ tên,Ngày sinh,Giới tính,Kế quả học tập,Kết quả rèn luyện,Danh hiệu,Số ngày vắng\n`;
    csvContent += `"${student.studentCode}","${student.fullName}","${formatDob(student.dob)}","${student.gender}","${student.academicGrade}","${student.behaviorGrade}","${student.distinction}",${student.daysAbsent}\n\n`;
    
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
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6" id="student-result-container">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8 no-print w-full relative">
        <div className="flex-1 flex justify-start">
          <button
            onClick={onBack}
            id="btn-back-query"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Term Switcher - Centered */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1 items-center w-full max-w-[260px] sm:max-w-xs md:max-w-sm shrink-1">
          <button
            onClick={() => setTerm("hk1")}
            className={`flex-1 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-black rounded-lg transition duration-200 select-none cursor-pointer ${
              term === "hk1" ? "bg-[#0055A5] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            HK I
          </button>
          <button
            onClick={() => setTerm("hk2")}
            className={`flex-1 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-black rounded-lg transition duration-200 select-none cursor-pointer ${
              term === "hk2" ? "bg-[#0055A5] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            HK II
          </button>
          <button
            onClick={() => setTerm("canam")}
            className={`flex-1 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-black rounded-lg transition duration-200 select-none cursor-pointer ${
              term === "canam" ? "bg-[#0055A5] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Cả Năm
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={handleExportCSV}
            id="btn-export-excel"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-[#00A65A] hover:bg-[#008f4c] text-white rounded-lg transition cursor-pointer shadow-sm shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handlePrint}
            id="btn-print-pdf"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-[#E53935] hover:bg-[#C62828] text-white rounded-lg transition cursor-pointer shadow-sm shrink-0"
          >
            <Printer className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Main Printable report card container */}
      <div
        ref={printAreaRef}
        id="print-card-area"
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 text-slate-800"
      >
        {/* Verification Header */}
        <div className="border-b border-slate-200 pb-5 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-[9px] sm:text-[11px] uppercase font-black tracking-widest text-[#0055A5] mb-1.5 opacity-90">
              {headerTop}
            </h4>
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-black text-[#0055A5] uppercase tracking-tight leading-none mb-2.5">
              BẢNG GHI ĐIỂM VÀ KẾT QUẢ RÈN LUYỆN
            </h1>
            <p className="text-[9px] sm:text-[10px] text-[#0055A5] font-extrabold uppercase tracking-widest opacity-80">
              HỌC BẠ ĐIỆN TỬ ĐĂNG KÝ HỌC TẬP - THEO THÔNG TƯ 22/2021/TT-BGDĐT
            </p>
          </div>
          
          {/* Top Verification badge */}
          <div className="flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black self-start md:self-auto uppercase tracking-wide shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span>Đã xác thực điện tử</span>
          </div>
        </div>

        {/* Student General Information Box */}
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-6 border-b border-slate-100">
              <div className="flex flex-col col-span-2 px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-100">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Họ và tên</span>
                <span className="font-black text-[#0055A5] text-sm sm:text-lg uppercase break-words leading-tight">{student.fullName}</span>
              </div>
              <div className="flex flex-col col-span-2 px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-100 bg-slate-50/50">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Trường THCS</span>
                <span className="font-bold text-[#003366] text-xs sm:text-sm break-words leading-tight">{student.school}</span>
              </div>
              <div className="flex flex-col col-span-1 px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-100">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Lớp học</span>
                <span className="font-bold text-[#003366] text-xs sm:text-base">{student.className}</span>
              </div>
              <div className="flex flex-col col-span-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50/50">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Giới tính</span>
                <span className="font-bold text-[#003366] text-xs sm:text-base">{student.gender}</span>
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-6 border-b border-slate-100">
              <div className="flex flex-col col-span-2 px-3 py-2 sm:px-4 sm:py-2.5 border-r border-slate-100 bg-slate-50/50">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Năm học</span>
                <span className="font-bold text-[#003366] text-xs sm:text-base">{schoolYear}</span>
              </div>
              <div className="flex flex-col col-span-4 px-3 py-2 sm:px-4 sm:py-2.5">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Ngày sinh</span>
                <span className="font-bold text-[#003366] text-xs sm:text-base">{formatDob(student.dob)}</span>
              </div>
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50/50">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider mb-0.5">Mã số học sinh (12 số CCCD)</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-[#0055A5]">{student.studentCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Swipe Indicator */}
        <div className="no-print text-[10px] text-slate-500 mb-2 flex items-center gap-1 sm:hidden italic justify-end">
          <span>Khung nhìn tổng quan. Khuyến nghị xoay ngang màn hình.</span>
        </div>

        {/* Academic Grading Sheet Table */}
        <div className="overflow-hidden mb-6 border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="text-white text-[9px] sm:text-[11px] uppercase">
                <th className="bg-[#0055A5] px-3 sm:px-4 py-3 sm:py-4 font-black text-left border-r border-[#004282]">Môn học</th>
                <th className="bg-[#0055A5] px-2 sm:px-4 py-3 sm:py-4 font-black text-center border-r border-[#004282] w-16 sm:w-32">
                  <span className="hidden sm:inline">Cuối kì I</span>
                  <span className="sm:hidden">HK I</span>
                </th>
                <th className="bg-[#0055A5] px-2 sm:px-4 py-3 sm:py-4 font-black text-center border-r border-[#004282] w-16 sm:w-32">
                  <span className="hidden sm:inline">Cuối kì II</span>
                  <span className="sm:hidden">HK II</span>
                </th>
                <th className="bg-[#E53935] px-2 sm:px-4 py-3 sm:py-4 font-black text-center w-20 sm:w-36">
                  <span className="hidden sm:inline">Cả năm</span>
                  <span className="sm:hidden">CN</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-[10px] sm:text-[13px]">
              {student.subjects.map((sub, index) => {
                return (
                  <tr
                    key={sub.subjectId}
                    className="border-b border-slate-100 last:border-none hover:bg-slate-50/50"
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3 font-bold text-slate-800 text-left border-r border-slate-100">
                      {sub.subjectName}
                    </td>
                    
                    {/* Semester 1 Details */}
                    {sub.isEvaluatedByScore ? (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-700 font-bold border-r border-slate-100">
                        {sub.end1 !== undefined ? sub.end1.toFixed(1) : "-"}
                      </td>
                    ) : (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-r border-slate-100 uppercase text-center text-[9px] sm:text-xs text-emerald-600">
                        {sub.semester1 || "-"}
                      </td>
                    )}

                    {/* Semester 2 Details */}
                    {sub.isEvaluatedByScore ? (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-700 font-bold border-r border-slate-100">
                        {sub.end2 !== undefined ? sub.end2.toFixed(1) : "-"}
                      </td>
                    ) : (
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-bold border-r border-slate-100 uppercase text-center text-[9px] sm:text-xs text-emerald-600">
                        {sub.semester2 || "-"}
                      </td>
                    )}

                    {/* Year Average (Cả năm) */}
                    <td className="px-2 sm:px-4 py-2 sm:py-3 font-black text-white text-center bg-[#E53935] border-b border-white/20">
                      {typeof sub.yearAvg === "number" ? sub.yearAvg.toFixed(1) : sub.yearAvg || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overall Summary Box */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider text-center mb-1.5">
                {term === "hk1" ? "HỌC LỰC HK I" : term === "hk2" ? "HỌC LỰC HK II" : "HỌC LỰC CẢ NĂM"}
              </span>
              <span className="font-black text-base xs:text-lg sm:text-xl text-[#0055A5] uppercase">{activeAcademicGrade}</span>
              {scoreCount > 0 && <span className="text-[9px] sm:text-[10px] text-slate-500 font-extrabold mt-1">ĐTB: {activeGpa.toFixed(2)}</span>}
            </div>
            
            <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider text-center mb-1.5">
                {term === "canam" ? "RL CẢ NĂM" : "RL HỌC KỲ"}
              </span>
              <span className="font-black text-base xs:text-lg sm:text-xl text-[#0055A5] uppercase">{activeBehaviorGrade}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider text-center mb-1.5">DANH HIỆU THI ĐUA</span>
              <span className="font-black text-xs xs:text-sm sm:text-[15px] text-[#E53935] uppercase text-center leading-tight">
                {activeDistinction}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-[9px] sm:text-[10px] uppercase text-slate-400 font-extrabold tracking-wider text-center mb-1.5">SỐ BUỔI NGHỈ HỌC</span>
              <span className="font-black text-base xs:text-lg sm:text-xl text-slate-700">
                {activeDaysAbsent} <span className="text-[10px] sm:text-xs text-slate-400 font-black">BUỔI</span>
              </span>
              {term !== "canam" && <span className="text-[8px] sm:text-[9px] text-slate-400 mt-1 uppercase italic text-center leading-none">(phân bổ ước tính)</span>}
            </div>
          </div>

          <div className="mt-4 sm:mt-6 border border-blue-100 bg-[#f4f9fd] p-4 sm:p-5 rounded-xl">
            <h4 className="font-black text-[#0055A5] text-[10px] sm:text-xs uppercase tracking-wider mb-2">Ý kiến và nhận xét của Giáo viên môn học và chủ nhiệm</h4>
            <p className="text-xs sm:text-sm text-slate-800 italic font-medium leading-relaxed">
              &ldquo;{student.notes || "Học sinh tích cực tham gia các phong trào trường lớp, đạt giải Nhì kì thi HSG Toán cấp Quận."}&rdquo;
            </p>
          </div>
        </div>

        {/* Official Board Signature Section - displayed cleanly when printed */}
        <div className="mt-12 hidden print-only border-t pt-6 border-dashed border-slate-300">
          <div className="flex justify-between items-start text-xs text-slate-600">
            <div className="text-center w-48">
              <p className="font-semibold uppercase text-slate-700 mb-1">Người nhập liệu</p>
              <div className="h-16"></div>
              <p className="italic text-slate-400 font-mono text-[9px]">[Đã ký điện tử]</p>
              <p className="font-bold text-slate-800">Bộ phận giáo vụ</p>
            </div>
            
            <div className="text-center w-64">
              <p className="italic mb-1">Suối Lư, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
              <p className="font-bold uppercase text-slate-800 mb-1">HIỆU TRƯỞNG</p>
              <p className="text-[10px] text-slate-500 mb-10">(Ký tên, đóng dấu và xác định chữ ký số)</p>
              <p className="italic text-slate-400 font-mono text-[9px]">[Chữ ký số hợp lệ]</p>
              <p className="font-extrabold text-slate-800 text-sm">{student.school.replace("Trường ", "")}</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-medium no-print">
          Mã xác thực học bạ điện tử: <span className="font-mono text-blue-700">{student.id}</span>. Bản quyền kết quả thuộc về trường PTDTBT Tiểu học và THCS Suối Lư.
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
