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
    csvContent += `Lớp: ${student.className} | Năm học: ${student.academicYear}\n\n`;
    
    // Student Info
    csvContent += "THÔNG TIN HỌC SINH\n";
    csvContent += `Mã HS,Họ tên,Ngày sinh,Giới tính,Kế quả học tập,Kết quả rèn luyện,Danh hiệu,Số ngày vắng\n`;
    csvContent += `"${student.studentCode}","${student.fullName}","${student.dob}","${student.gender}","${student.academicGrade}","${student.behaviorGrade}","${student.distinction}",${student.daysAbsent}\n\n`;
    
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="student-result-container">
      {/* Action Buttons Bar - Hidden during printing */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <button
          onClick={onBack}
          id="btn-back-query"
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Tra cứu mã khác
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            id="btn-export-excel"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer font-medium text-sm shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
          </button>
          <button
            onClick={handlePrint}
            id="btn-print-pdf"
            className="flex items-center gap-2 px-4 py-2 bg-[#E53935] hover:bg-[#C62828] text-white rounded-lg transition cursor-pointer font-medium text-sm shadow-sm"
          >
            <Printer className="w-4 h-4" /> In Bảng Điểm (PDF)
          </button>
        </div>
      </div>

      {/* Term Switcher for active report card view */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto mb-6 gap-1 no-print items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase px-3 tracking-wider hidden sm:inline-block">Báo cáo:</span>
        <button
          onClick={() => setTerm("hk1")}
          className={`flex-grow py-2 px-3 text-center text-xs font-bold rounded-lg transition duration-200 select-none cursor-pointer ${
            term === "hk1"
              ? "bg-[#0055A5] text-white shadow"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Học kỳ I
        </button>
        <button
          onClick={() => setTerm("hk2")}
          className={`flex-grow py-2 px-3 text-center text-xs font-bold rounded-lg transition duration-200 select-none cursor-pointer ${
            term === "hk2"
              ? "bg-[#0055A5] text-white shadow"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Học kỳ II
        </button>
        <button
          onClick={() => setTerm("canam")}
          className={`flex-grow py-2 px-3 text-center text-xs font-bold rounded-lg transition duration-200 select-none cursor-pointer ${
            term === "canam"
              ? "bg-[#0055A5] text-white shadow"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Cả Năm
        </button>
      </div>

      {/* Main Printable report card container */}
      <div
        ref={printAreaRef}
        id="print-card-area"
        className="bg-white border border-slate-300 rounded-xl shadow-sm p-6 md:p-8 text-slate-800"
      >
        {/* Verification Header */}
        <div className="text-center border-b border-slate-200 pb-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-center md:text-left">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-[#0055A5] mb-1">
              {headerTop}
            </h4>
            <h1 className="text-xl md:text-2xl font-black text-[#0055A5] uppercase tracking-tight">
              BẢNG GHI ĐIỂM VÀ KẾT QUẢ RÈN LUYỆN
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mt-0.5">HỌC BẠ ĐIỆN TỬ ĐĂNG KÝ HỌC TẬP - THEO THÔNG TƯ 22/2021/TT-BGDĐT</p>
          </div>
          
          {/* Top Verification badge */}
          <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-1.5 rounded-md text-xs font-black self-center md:self-auto uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Đã xác thực điện tử</span>
          </div>
        </div>

        {/* Student General Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-3 bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-6">
            <div className="w-24 h-32 bg-slate-50 rounded-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 self-center sm:self-auto">
               <div className="text-slate-300 flex flex-col items-center italic text-[10px]">
                 <svg className="w-8 h-8 mb-1 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                 Ảnh 3x4
               </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Họ và tên</span>
                <span className="font-black text-[#0055A5] text-lg uppercase truncate">{student.fullName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Trường THCS</span>
                <span className="font-bold text-slate-800">{student.school}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Lớp học</span>
                <span className="font-bold text-slate-800 text-base">{student.className}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Giới tính</span>
                <span className="font-semibold text-slate-700">{student.gender}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Năm học</span>
                <span className="font-semibold text-slate-700">{student.academicYear}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Ngày sinh</span>
                <span className="font-semibold text-slate-700">{student.dob}</span>
              </div>
              <div className="flex flex-col col-span-2 border-t pt-2 border-slate-100">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Mã số học sinh</span>
                <span className="font-mono font-bold text-xs text-[#0055A5]">{student.studentCode}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="bg-slate-50 p-2 rounded border border-slate-200/80 mb-2 shrink-0 self-center">
              <QRGenerator value={student.verificationToken} size={92} />
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Xác thực: {student.studentCode}</span>
            <span className="text-[8px] text-slate-400 font-mono mt-0.5">{student.id.substring(0, 18).toUpperCase()}</span>
          </div>
        </div>

        {/* Academic Grading Sheet Table */}
        <div className="overflow-x-auto mb-6 border border-slate-300 rounded-lg shadow-sm">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#0055A5] text-white text-xs uppercase divide-x divide-blue-400">
                <th className="px-4 py-3 font-black text-center w-48">Môn học</th>
                <th className={`px-4 py-3 font-black text-center w-32 transition-colors ${term === "hk1" ? "bg-amber-500 text-slate-950 font-black" : ""}`}>Cuối kì I</th>
                <th className={`px-4 py-3 font-black text-center w-32 transition-colors ${term === "hk2" ? "bg-amber-500 text-slate-950 font-black" : ""}`}>Cuối kì II</th>
                <th className={`px-4 py-3 font-black text-center w-28 transition-colors ${term === "canam" ? "bg-[#E53935]" : "bg-[#004282]"}`}>Cả năm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {student.subjects.map((sub, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr
                    key={sub.subjectId}
                    className={`hover:bg-blue-50/40 text-center transition ${isEven ? "bg-white" : "bg-slate-50/60"}`}
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-800 text-left border-r border-slate-300">
                      {sub.subjectName}
                    </td>
                    
                    {/* Semester 1 Details */}
                    {sub.isEvaluatedByScore ? (
                      <td className={`px-2 py-2.5 text-slate-700 border-r border-slate-300 font-semibold transition-colors ${term === "hk1" ? "bg-amber-100/40 text-slate-900 !font-black" : ""}`}>
                        {sub.end1 !== undefined ? sub.end1.toFixed(1) : "-"}
                      </td>
                    ) : (
                      <td className={`px-2 py-2.5 font-black border-r border-slate-300 uppercase text-center text-xs transition-colors ${term === "hk1" ? "bg-amber-50/30 text-emerald-800 font-bold" : "text-emerald-600"}`}>
                        {sub.semester1 || "Chưa đánh giá"}
                      </td>
                    )}

                    {/* Semester 2 Details */}
                    {sub.isEvaluatedByScore ? (
                      <td className={`px-2 py-2.5 text-slate-700 border-r border-slate-300 font-semibold transition-colors ${term === "hk2" ? "bg-amber-100/40 text-slate-900 !font-black" : ""}`}>
                        {sub.end2 !== undefined ? sub.end2.toFixed(1) : "-"}
                      </td>
                    ) : (
                      <td className={`px-2 py-2.5 font-black border-r border-slate-300 uppercase text-center text-xs transition-colors ${term === "hk2" ? "bg-amber-50/30 text-emerald-800 font-bold" : "text-emerald-600"}`}>
                        {sub.semester2 || "Chưa đánh giá"}
                      </td>
                    )}

                    {/* Year Average (Cả năm) */}
                    <td className={`px-2 py-2.5 font-black text-white text-[#ffffff] text-center w-28 border-none text-[13px] transition-all ${
                      term === "canam" ? "bg-[#E53935] font-extrabold text-[14px] ring-2 ring-red-300 ring-inset" : 
                      sub.yearAvg === "Chưa đạt" ? "bg-rose-600" : 
                      sub.yearAvg === "Đạt" ? "bg-emerald-600" :
                      typeof sub.yearAvg === "number" && sub.yearAvg >= 8.0 ? "bg-[#0055A5]" :
                      typeof sub.yearAvg === "number" && sub.yearAvg >= 6.5 ? "bg-[#0055A5]/80" :
                      typeof sub.yearAvg === "number" && sub.yearAvg >= 5.0 ? "bg-slate-700" :
                      sub.yearAvg ? "bg-rose-500" : "bg-slate-400"
                    }`}>
                      {typeof sub.yearAvg === "number" ? sub.yearAvg.toFixed(1) : sub.yearAvg || "-"}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overall Summary Box & QR Verification */}
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-250 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center justify-center p-2 border-r border-slate-200 last:border-0">
              <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                {term === "hk1" ? "HỌC LỰC HK I" : term === "hk2" ? "HỌC LỰC HK II" : "HỌC LỰC CẢ NĂM"}
              </span>
              <span className="font-black text-xl text-[#0055A5] mt-1 uppercase transition-all">{activeAcademicGrade}</span>
              {scoreCount > 0 && <span className="text-[9.5px] text-slate-500 font-bold mt-1">ĐTB: {activeGpa.toFixed(2)}</span>}
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 md:border-r border-slate-200 last:border-0">
              <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                {term === "canam" ? "RL CẢ NĂM" : "RL HỌC KỲ"}
              </span>
              <span className="font-black text-xl text-[#0055A5] mt-1 uppercase transition-all">{activeBehaviorGrade}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 border-r border-slate-200 last:border-0">
              <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider">DANH HIỆU THI ĐUA</span>
              <span className="font-black text-xs text-[#E53935] mt-1 py-1 px-1 h-10 flex items-center justify-center uppercase leading-tight text-center transition-all">
                {activeDistinction}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 last:border-0">
              <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider">SỐ BUỔI NGHỈ HỌC</span>
              <span className="font-black text-xl text-slate-700 mt-1 transition-all">
                {activeDaysAbsent} <span className="text-xs text-slate-400 font-bold">BUỔI</span>
              </span>
              {term !== "canam" && <span className="text-[8px] text-slate-400 mt-0.5 uppercase italic">(phân bổ ước tính)</span>}
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-sm">
            <h4 className="font-black text-[#0055A5] text-[11px] uppercase tracking-wider mb-1">Ý kiến và nhận xét của Giáo viên môn họ̣c và chủ nhiệm</h4>
            <p className="text-xs text-slate-700 italic leading-relaxed font-semibold">
              &ldquo;{student.notes || "Học sinh hoàn thành xuất sắc các nội dung rèn luyện của trường học."}&rdquo;
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
