/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Student } from "../types";
import { ArrowLeft } from "lucide-react";
import dbService from "../lib/supabase";
import { evaluateTT22, evaluateDistinctionTT22 } from "../lib/tt22";

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
        // Reduced log severity for student result metadata
        console.log("Advisor metadata info:", (err as any).message);
      }
    };
    fetchAdvisor();
    return () => { active = false; };
  }, [student.className, student.teacher]);
  
  const headerTop = localStorage.getItem("portal_header_top") || "ỦY BAN NHÂN DÂN XÃ XA DUNG • TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ";
  const schoolYearRaw = localStorage.getItem("portal_school_year") || student.academicYear || "Năm học 2025-2026";
  const schoolYear = schoolYearRaw.replace(/năm học/i, "").trim();

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
  let activeAcademicGrade = term === "hk1" ? student.academicGradeHK1 : term === "hk2" ? student.academicGradeHK2 : student.academicGrade;
  
  if (!activeAcademicGrade && scoreCount > 0) {
    const currentScores = scoreSubjects.map(s => {
      if (term === "canam") {
        if (typeof s.semester1 === "number" && typeof s.semester2 === "number") {
          return parseFloat(((s.semester2 * 2 + s.semester1) / 3).toFixed(1));
        }
        return typeof s.yearAvg === "number" ? s.yearAvg : null;
      }
      const val = term === "hk1" ? s.semester1 : s.semester2;
      return typeof val === "number" ? val : null;
    }).filter(v => v !== null) as number[];

    const currentComments = (student.subjects || []).filter(s => !s.isEvaluatedByScore).map(s => {
        const val = term === "hk1" ? s.semester1 : term === "hk2" ? s.semester2 : s.yearAvg;
        return val === "Đạt" || val === "Chưa đạt" ? val : null;
    }).filter(v => v !== null) as string[];

    const calculatedGrade = evaluateTT22(currentScores, currentComments);
    if (calculatedGrade) activeAcademicGrade = calculatedGrade as any;
  }

  // Behavior Grade
  const activeBehaviorGrade = term === "hk1" ? student.behaviorGradeHK1 : term === "hk2" ? student.behaviorGradeHK2 : student.behaviorGrade;

  // Designation Distinction
  const scoredCount = (student.subjects || []).filter(s => {
    const hasS1 = (typeof s.semester1 === "number") || (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt");
    const hasS2 = (typeof s.semester2 === "number") || (s.semester2 === "Đạt" || s.semester2 === "Chưa đạt");
    const hasAvg = (typeof s.yearAvg === "number") || (s.yearAvg === "Đạt" || s.yearAvg === "Chưa đạt");
    return hasS1 || hasS2 || hasAvg;
  }).length;

  const hasAnyScoreOverall = scoredCount > 0;

  const isExempt = !hasAnyScoreOverall;

  let activeDistinction = "KHÔNG";
  if (isExempt && (student.notes?.toLowerCase().includes("khuyết tật") || student.notes?.toLowerCase().includes("miễn"))) {
    activeDistinction = "ĐỐI TƯỢNG MIỄN ĐÁNH GIÁ";
  } else if (isExempt) {
    activeDistinction = "KHÔNG";
  } else {
    let d = "Không";
    const currentScores = scoreSubjects.map(s => {
      if (term === "canam") {
        if (typeof s.semester1 === "number" && typeof s.semester2 === "number") {
          return parseFloat(((s.semester2 * 2 + s.semester1) / 3).toFixed(1));
        }
        return typeof s.yearAvg === "number" ? s.yearAvg : null;
      }
      const val = term === "hk1" ? s.semester1 : s.semester2;
      return typeof val === "number" ? val : null;
    }).filter(v => v !== null) as number[];

    if (term === "canam") {
      d = student.distinction && student.distinction !== "Không" ? student.distinction : "Không";
      // Auto recalculate if it's currently marked as something but we have valid data to recalculate
      if (activeAcademicGrade && activeBehaviorGrade) {
        d = evaluateDistinctionTT22(activeAcademicGrade as string, activeBehaviorGrade as string, currentScores);
      }
    } else {
      if (activeAcademicGrade && activeBehaviorGrade) {
        d = evaluateDistinctionTT22(activeAcademicGrade as string, activeBehaviorGrade as string, currentScores);
      }
    }
    
    activeDistinction = d.toUpperCase();
  }

  // Days absent
  let activeDaysAbsent = student.daysAbsent;
  if (term === "hk1") {
    activeDaysAbsent = Math.ceil(student.daysAbsent * 0.4);
  } else if (term === "hk2") {
    activeDaysAbsent = Math.floor(student.daysAbsent * 0.6);
  }

  return (
    <div className="w-full max-w-3xl mx-auto" id="student-result-container">
      {/* Main Printable report card container */}
      <div
        ref={printAreaRef}
        id="print-card-area"
        className="bg-white px-3 py-3 sm:px-5 sm:py-5 text-black font-serif w-full max-w-3xl mx-auto border sm:shadow-2xl print:shadow-none print:border-none relative"
      >
        {/* Integrated Back Button */}
        <button
          onClick={onBack}
          id="btn-back-query-integrated"
          className="absolute top-3 right-3 sm:top-5 sm:right-5 no-print flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border border-slate-200 rounded-md text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-[#003366] transition cursor-pointer shrink-0 z-10 shadow-sm"
          title="Quay lại"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Document Header */}
        <div className="mb-3 text-[#003366]">
          <div className="uppercase font-bold text-[10px] sm:text-xs leading-none whitespace-nowrap">ỦY BAN NHÂN DÂN XÃ XA DUNG</div>
          <div className="uppercase font-bold text-xs sm:text-sm leading-tight whitespace-nowrap border-b-2 border-[#003366] inline-block">TRƯỜNG PTDTBT TIỂU HỌC VÀ THCS SUỐI LƯ</div>
        </div>

        {/* Title */}
        <div className="text-center mb-3 text-[#B71C1C]">
          <h1 className="font-black text-xl sm:text-3xl uppercase mb-0.5 tracking-wider italic">KẾT QUẢ HỌC TẬP</h1>
          <h2 className="font-bold text-xs sm:text-base text-[#003366]">Năm học {schoolYear}</h2>
        </div>

        {/* Outer wrapping to handle responsive scrolling if needed on very small devices, but print avoids scroll */}
        <div className="w-full text-[#003366]">
          <table className="w-full border-collapse border-2 border-slate-700 text-[11px] sm:text-[13px] mb-2">
            <colgroup>
              <col className="w-[35px] sm:w-[40px]" />
              <col className="w-auto" />
              <col className="w-[50px] sm:w-[70px]" />
              <col className="w-[50px] sm:w-[70px]" />
              <col className="w-[55px] sm:w-[80px]" />
              <col className="w-[45px] sm:w-[80px]" />
            </colgroup>
            <tbody>
              {/* Info row 1 */}
              <tr>
                <td className="p-2 border border-slate-500 font-bold whitespace-nowrap text-right pr-6 sm:pr-12 bg-slate-50" colSpan={2}>
                  Mã HS :
                </td>
                <td className="p-2 border border-slate-500 font-bold text-left px-4 text-[#003366]" colSpan={4}>
                  {student.studentCode}
                </td>
              </tr>
              {/* Info row 2 */}
              <tr>
                <td className="p-2 border border-slate-500 font-bold whitespace-nowrap text-right pr-6 sm:pr-12 bg-white" colSpan={2}>
                  Họ và tên:
                </td>
                <td className="p-2 border border-slate-500 font-black text-left px-4 text-[#B71C1C] text-[13px] sm:text-[18px]" colSpan={3}>
                  {student.fullName}
                </td>
                <td className="p-2 border border-slate-500 font-black text-center bg-slate-50" colSpan={1}>
                  <div className="text-[9px] uppercase text-slate-400 font-bold leading-none mb-1">LỚP</div>
                  <div className="text-[#003366] text-sm sm:text-lg tracking-tighter">{student.className}</div>
                </td>
              </tr>

              {/* Spacer Row if desired, but image does not have one, it goes straight to headers */}

              {/* Dynamic Headers based on selected Term */}
              {term === "canam" ? (
                <tr className="font-bold text-center bg-[#003366] text-white">
                  <td className="p-1.5 sm:p-2 border border-slate-600">TT</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600">Môn học</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">Kỳ 1</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">Kỳ 2</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">Thi lại</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">Cả năm</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600">Ghi chú</td>
                </tr>
              ) : (
                <tr className="font-bold text-center bg-[#003366] text-white">
                  <td className="p-1.5 sm:p-2 border border-slate-600">TT</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600">Môn học</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">ĐĐGtx</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">ĐĐGgk</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">ĐĐGck</td>
                  <td className="p-1.5 sm:p-2 border border-slate-600 whitespace-nowrap text-[10px] sm:text-[14px]">TB</td>
                </tr>
              )}
              
              {/* Subjects */}
              {(student.subjects || []).map((sub, index) => {
                const mapComment = (v: string | number | undefined) => {
                  if (v === "Đạt") return "Đ";
                  if (v === "Chưa đạt") return "CĐ";
                  return v;
                };

                if (term === "canam") {
                  const valHk1 = sub.isEvaluatedByScore 
                    ? (typeof sub.semester1 === "number" ? sub.semester1.toFixed(1).replace(".", ",") : "") 
                    : mapComment(sub.semester1) || "";
                  const valHk2 = sub.isEvaluatedByScore 
                    ? (typeof sub.semester2 === "number" ? sub.semester2.toFixed(1).replace(".", ",") : "") 
                    : mapComment(sub.semester2) || "";
                  const valCaNam = sub.isEvaluatedByScore
                    ? (typeof sub.yearAvg === "number" ? sub.yearAvg.toFixed(1).replace(".", ",") : "")
                    : mapComment(sub.yearAvg) || "";

                  return (
                    <tr key={index} className="text-center even:bg-slate-50 hover:bg-sky-50 transition-colors text-[11px] sm:text-[14px]">
                      <td className="p-1 sm:p-2 border border-slate-500 font-medium text-slate-600">{index + 1}</td>
                      <td className="p-1 sm:p-2 border border-slate-500 text-left px-1.5 sm:px-4 font-semibold tracking-tight text-[11px] sm:text-[14px]">{sub.subjectName}</td>
                      <td className="p-1 sm:p-2 border border-slate-500 font-bold text-slate-800 whitespace-nowrap">{valHk1}</td>
                      <td className="p-1 sm:p-2 border border-slate-500 font-bold text-slate-800 whitespace-nowrap">{valHk2}</td>
                      <td className="p-1 sm:p-2 border border-slate-500"></td>
                      <td className="p-1 sm:p-2 border border-slate-500 font-black text-[#B71C1C] whitespace-nowrap">{valCaNam}</td>
                      <td className="p-1 sm:p-2 border border-slate-500"></td>
                    </tr>
                  );
                } else {
                  // HK I or HK II
                  const txVal = term === "hk1" ? sub.tx1 : sub.tx2;
                  const midVal = term === "hk1" ? sub.mid1 : sub.mid2;
                  const endVal = term === "hk1" ? sub.end1 : sub.end2;
                  const avgVal = term === "hk1" ? sub.semester1 : sub.semester2;

                  const formattedTx = txVal ? txVal.toString().replace(/\./g, ",") : "";
                  const mappedTx = !sub.isEvaluatedByScore && formattedTx ? formattedTx.replace(/Đạt/g, "Đ").replace(/Chưa đạt/g, "CĐ") : formattedTx;

                  const formattedMid = sub.isEvaluatedByScore 
                    ? (typeof midVal === "number" ? midVal.toFixed(1).replace(".", ",") : midVal || "")
                    : mapComment(midVal) || mapComment(avgVal) || "";
                  const formattedEnd = sub.isEvaluatedByScore 
                    ? (typeof endVal === "number" ? endVal.toFixed(1).replace(".", ",") : endVal || "")
                    : mapComment(endVal) || mapComment(avgVal) || "";
                  const formattedAvg = sub.isEvaluatedByScore
                    ? (typeof avgVal === "number" ? avgVal.toFixed(1).replace(".", ",") : avgVal || "")
                    : mapComment(avgVal) || "";

                  return (
                    <tr key={index} className="text-center even:bg-slate-50 hover:bg-sky-50 transition-colors text-[11px] sm:text-[14px]">
                      <td className="p-1 sm:p-2 border border-slate-500 font-medium text-slate-600">{index + 1}</td>
                      <td className="p-1 sm:p-2 border border-slate-500 text-left px-1.5 sm:px-4 font-semibold tracking-tight text-[11px] sm:text-[14px]">{sub.subjectName}</td>
                      {/* Regular Assessment (space separated scores) */}
                      <td className="p-1 sm:p-2 border border-slate-500 font-medium text-slate-700 tracking-wider text-xs whitespace-nowrap">{mappedTx || (sub.isEvaluatedByScore ? "" : mapComment(avgVal) || "")}</td>
                      {/* Midterm */}
                      <td className="p-1 sm:p-2 border border-slate-500 font-bold text-slate-800 whitespace-nowrap">{formattedMid}</td>
                      {/* Endterm */}
                      <td className="p-1 sm:p-2 border border-slate-500 font-bold text-slate-800 whitespace-nowrap">{formattedEnd}</td>
                      {/* Semester Average */}
                      <td className="p-1 sm:p-2 border border-slate-500 font-black text-[#B71C1C] whitespace-nowrap">{formattedAvg}</td>
                    </tr>
                  );
                }
              })}

              {/* Summary Rows */}
              <tr className="bg-white text-[11px] sm:text-[14px]">
                <td className="py-2.5 px-1 border border-slate-700 font-bold text-slate-900 whitespace-nowrap text-center text-[12px] sm:text-[15px]" colSpan={2} rowSpan={2}>
                  <div className="flex flex-col items-center gap-1">
                    <span>
                      {term === "canam" ? "Kết quả CN:" : term === "hk1" ? "Kết quả HK 1:" : "Kết quả HK 2:"}
                    </span>
                    <div className="no-print flex flex-col gap-1 w-full px-1 mt-1">
                      {(["hk1", "hk2", "canam"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTerm(t)}
                          className={`w-full py-1 rounded-md text-[9px] sm:text-[11px] font-black uppercase transition-all cursor-pointer border-2 ${
                            term === t
                              ? "bg-[#003366] text-white border-slate-800 shadow-md"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {t === "hk1" ? "Xem HK I" : t === "hk2" ? "Xem HK II" : "Xem Cả Năm"}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="p-1 sm:p-2 border border-slate-700 text-center whitespace-normal text-[12px] sm:text-[15px]" colSpan={term === "canam" ? 5 : 4}>
                  Vắng: {activeDaysAbsent} (phép), 0 (không), 0 (bỏ tiết)
                </td>
              </tr>
              <tr className="bg-white text-[11px] sm:text-[14px]">
                <td className="p-1 sm:p-2 border border-slate-700 text-center whitespace-normal text-[13px] sm:text-[16px]" colSpan={term === "canam" ? 5 : 4}>
                  {isExempt ? (
                    <span className="text-[#B71C1C] uppercase">
                      Học sinh Khuyết tật không đánh giá thuộc đối tượng miễn
                    </span>
                  ) : (
                    <div className="flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-4">
                      <span>KQHT: {activeAcademicGrade?.toUpperCase() || "KHÁ"}</span>
                      <span className="text-slate-500">|</span>
                      <span>KQRL: {activeBehaviorGrade?.toUpperCase() || "TỐT"}</span>
                      {term === "canam" && activeDistinction !== "KHÔNG" && (
                        <>
                          <span className="text-slate-500">|</span>
                          <span className="whitespace-nowrap">Danh hiệu: {activeDistinction.replace("HỌC SINH", "HS")}</span>
                        </>
                      )}
                    </div>
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
