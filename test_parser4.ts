const textToParse = `
Mã HS :		2307930338						Mã HS :		2514868804					Lớp: 6A1
Họ và tên:		Nguyễn Bảo An		Lớp: 6A1				Họ và tên:		Lò Thị Kỳ Anh		Lớp: 6A1
														
TT	Môn học	ĐĐGtx	ĐĐGgk	ĐĐGck	TB			TT	Môn học	ĐĐGtx	ĐĐGgk	ĐĐGck	TB
1	Toán học	9 8 7 9	8	8.0	8.1			1	Toán học	7 7 6 8	6.8	8.0	7.3
2	Lịch sử và Địa lí	10 9 9 8	9.5	8.3	8.9			2	Lịch sử và Địa lí	7 7 8 7	7	7.3	7.2
`;

  const lines = textToParse.split('
');
  const importTerm = 'hk1';
  const importClass = '6A1';
  const classes = [];
  const students = [];
  const parsedResults = [];
  
  const compareVietnameseNames = (a, b) => a.localeCompare(b);
  const setImportPreview = () => {};
  const setImportStatus = () => {};
  const setImportErrors = () => {};
        const isSchoolLayout = lines.some(line => line.includes("KẾT QUẢ HỌC TẬP") || line.includes("Họ và tên:") || line.includes("Mã HS :"));
      if (isSchoolLayout) {
        const rows = lines.map(line => line.split("\t"));
        const studentCardLocations: { r: number, c: number }[] = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < row.length; c++) {
            const val = (row[c] || "").trim().toLowerCase();
            if (val === "họ và tên:" || val === "họ và tên" || val === "ho va ten:" || val === "ho va ten") {
              studentCardLocations.push({ r, c });
            }
          }
        }

        if (studentCardLocations.length > 0) {
          studentCardLocations.forEach(({ r, c }) => {
             // 1. Get full name
             let fullName = "";
             for (let offset = 1; offset <= 4; offset++) {
               const val = (rows[r]?.[c + offset] || "").trim();
               if (val && !val.toLowerCase().includes("lớp") && !val.toLowerCase().includes("lop")) {
                 fullName = val;
                 break;
               }
             }
             if (!fullName) return;

             // 2. Get class name
             let className = importClass;
             for (let col = c + 4; col < Math.min(c + 10, rows[r]?.length || 0); col++) {
               const cellVal = (rows[r]?.[col] || "").trim();
               if (cellVal.toLowerCase().includes("lớp") || cellVal.toLowerCase().includes("lop")) {
                 const classMatch = cellVal.match(/Lớp:\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lớp\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lop:\s*([A-Za-z0-9_-]+)/i) || cellVal.match(/Lop\s*([A-Za-z0-9_-]+)/i);
                 if (classMatch) {
                   className = classMatch[1].trim();
                   break;
                 }
               }
             }

             // 3. Student Code (Mã HS)
             let studentCode = "";
             let codeCellRow = r - 1;
             if (codeCellRow >= 0) {
               for (let col = c; col < Math.min(c + 4, rows[codeCellRow]?.length || 0); col++) {
                 const val = (rows[codeCellRow]?.[col] || "").trim();
                 if (val.toLowerCase().includes("mã hs") || val.toLowerCase().includes("ma hs")) {
                   for (let offset = 1; offset <= 3; offset++) {
                     const codeVal = (rows[codeCellRow]?.[col + offset] || "").trim();
                     if (codeVal && !codeVal.toLowerCase().includes("môn") && !codeVal.toLowerCase().includes("mon")) {
                       studentCode = codeVal.replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
                       break;
                     }
                   }
                   break;
                 }
               }
             }

             const cleanString = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
             const rowNameClean = cleanString(fullName);
             const removeDiacritics = (str: string): string => {
               return str
                 .normalize("NFD")
                 .replace(/[\u0300-\u036f]/g, "")
                 .replace(/đ/g, "d")
                 .replace(/Đ/g, "D");
             };

             let existing = students.find(
               s => cleanString(s.fullName) === rowNameClean && 
                    s.className.trim().toUpperCase() === className.trim().toUpperCase()
             );

             if (existing) {
               studentCode = existing.studentCode;
             } else if (!studentCode) {
               const cleanNameNoSign = removeDiacritics(fullName).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
               studentCode = `HS-${className.toUpperCase()}-${cleanNameNoSign}`;
             }

             // 4. Find headers to detect column offsets dynamically
             let colTxStart = c + 2;
             let colMid = c + 3;
             let colEnd = c + 4;
             let colAvg = c + 5;
             
             for (let searchR = r; searchR <= Math.min(r + 8, rows.length - 1); searchR++) {
               const rowStr = rows[searchR]?.slice(c, c + 15).join(" ").toLowerCase() || "";
               if (rowStr.includes("môn") || rowStr.includes("mon") || rowStr.includes("đđgtx") || rowStr.includes("đđggk") || rowStr.includes("tx")) {
                 let foundTx = false, foundMid = false, foundEnd = false, foundAvg = false;
                 for (let col = c; col <= Math.min(c + 20, rows[searchR]?.length - 1 || 0); col++) {
                   const hVal = (rows[searchR]?.[col] || "").trim().toLowerCase();
                   if (hVal && (hVal.includes("tx") || hVal === "đđgtx") && !foundTx) { colTxStart = col; foundTx = true; }
                   else if (hVal && (hVal.includes("gk") || hVal === "đđggk") && !foundMid) { colMid = col; foundMid = true; }
                   else if (hVal && (hVal.includes("ck") || hVal === "đđgck") && !foundEnd) { colEnd = col; foundEnd = true; }
                   else if (hVal && (hVal.includes("tb") || hVal === "đtb" || hVal.includes("tbm")) && !foundAvg) { colAvg = col; foundAvg = true; }
                 }
                 break;
               }
             }

             // 4b. Parse bottom stats
             let parsedAcad = '';
             let parsedBehav = '';
             let parsedAbsent = 0;
             let parsedAbsentUnexcused = 0;

             for (let b = r + 14; b <= Math.min(r + 30, rows.length - 1); b++) {
               const rowText = (rows[b] || []).slice(c, c + 15).join(' ').toLowerCase();
               
               const acadMatch = rowText.match(/đánh giá kq học tập:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i) || rowText.match(/kqht:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i);
               if (acadMatch) {
                 const v = acadMatch[1].trim().toLowerCase();
                 if (v === 't' || v === 'tốt') parsedAcad = 'Tốt';
                 else if (v === 'k' || v === 'khá') parsedAcad = 'Khá';
                 else if (v === 'đ' || v === 'đạt') parsedAcad = 'Đạt';
                 else if (v === 'cd' || v === 'cđ' || v.includes('chưa')) parsedAcad = 'Chưa đạt';
               }

               const behavMatch = rowText.match(/đánh giá kq rèn luyện:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i) || rowText.match(/kqrl:\s*(tốt|khá|đạt|chưa đạt|t|k|đ|cd|cđ)/i);
               if (behavMatch) {
                 const v = behavMatch[1].trim().toLowerCase();
                 if (v === 't' || v === 'tốt') parsedBehav = 'Tốt';
                 else if (v === 'k' || v === 'khá') parsedBehav = 'Khá';
                 else if (v === 'đ' || v === 'đạt') parsedBehav = 'Đạt';
                 else if (v === 'cd' || v === 'cđ' || v.includes('chưa')) parsedBehav = 'Chưa đạt';
               }

               const absentMatch = rowText.match(/số ngày nghỉ học:\s*(\d+)/i) || rowText.match(/vắng:[^\d]*(\d+)\s*(phép)/i);
               if (absentMatch) parsedAbsent = parseInt(absentMatch[1], 10);

               const absentKpMatch = rowText.match(/số ngày nghỉ học k.?p.?:\s*(\d+)/i) || rowText.match(/vắng:[^\d]*\d+\s*(phép)[^\d]*(\d+)\s*(không)/i);
               if (absentKpMatch) parsedAbsentUnexcused = parseInt(absentKpMatch[1], 10);
             }

             // 5. Parse subjects
             const cardSubjects: SubjectResult[] = [
               { subjectId: "toan", subjectName: "Toán học", isEvaluatedByScore: true },
               { subjectId: "ly_dia", subjectName: "Lịch sử và Địa lí", isEvaluatedByScore: true },
               { subjectId: "khtn", subjectName: "Khoa học tự nhiên", isEvaluatedByScore: true },
               { subjectId: "tin", subjectName: "Tin học", isEvaluatedByScore: true },
               { subjectId: "van", subjectName: "Ngữ văn", isEvaluatedByScore: true },
               { subjectId: "anh", subjectName: "Ngoại ngữ", isEvaluatedByScore: true },
               { subjectId: "gdcd", subjectName: "GDCD", isEvaluatedByScore: true },
               { subjectId: "cong_nghe", subjectName: "Công nghệ", isEvaluatedByScore: true },
               { subjectId: "the_duc", subjectName: "Giáo dục thể chất", isEvaluatedByScore: false },
               { subjectId: "nghe_thuat", subjectName: "Nghệ thuật", isEvaluatedByScore: false },
               { subjectId: "gd_dia_phuong", subjectName: "Nội dung giáo dục của địa phương", isEvaluatedByScore: false },
               { subjectId: "trai_nghiem", subjectName: "Hoạt động trải nghiệm, hướng nghiệp", isEvaluatedByScore: false }
             ].map((def, idx) => {
               const existingSub = existing ? existing.subjects.find(s => s.subjectId === def.subjectId) : null;
               const targetSub = { ...def, ...existingSub };

               let rowIdx = r + 3 + idx;
               let excelSubjName = (rows[rowIdx]?.[c + 1] || "").trim();
               if (!excelSubjName.toLowerCase().includes(def.subjectName.toLowerCase().slice(0, 4))) {
                 let foundRow = -1;
                 const keywords = def.subjectId === "toan" ? ["toán"] :
                                  def.subjectId === "ly_dia" ? ["sử", "lịch sử", "địa"] :
                                  def.subjectId === "khtn" ? ["khtn", "khoa học"] :
                                  def.subjectId === "tin" ? ["tin "] : // include space so we match 'Tin ' correctly if they typo'd
                                  def.subjectId === "van" ? ["văn", "ngữ văn"] :
                                  def.subjectId === "anh" ? ["anh", "ngoại ngữ"] :
                                  def.subjectId === "gdcd" ? ["gdcd", "công dân"] :
                                  def.subjectId === "cong_nghe" ? ["công nghệ"] :
                                  def.subjectId === "the_duc" ? ["thể chất"] :
                                  def.subjectId === "nghe_thuat" ? ["nghệ thuật"] :
                                  def.subjectId === "gd_dia_phuong" ? ["địa phương"] :
                                  def.subjectId === "trai_nghiem" ? ["trải nghiệm"] :
                                  [def.subjectName.toLowerCase().slice(0, 4)];
                 for (let searchR = r + 1; searchR <= Math.min(r + 20, rows.length - 1); searchR++) {
                   const cellName = (rows[searchR]?.[c + 1] || "").trim().toLowerCase();
                   if (keywords.some(k => cellName.includes(k))) {
                     foundRow = searchR;
                     break;
                   }
                 }
                 if (foundRow !== -1) {
                   rowIdx = foundRow;
                 }
               }

               const txVals = [];
               for(let t = colTxStart; t < colMid; t++) {
                 const v = (rows[rowIdx]?.[t] || "").trim();
                 if (v) txVals.push(v);
               }
               
               const txVal = txVals.join(" ");
               const midVal = (rows[rowIdx]?.[colMid] || "").trim();
               const endVal = (rows[rowIdx]?.[colEnd] || "").trim();
               const avgVal = (rows[rowIdx]?.[colAvg] || "").trim();

               const parseScore = (val: string): number | "" => {
                 if (!val || val === "-" || val === "—" || val === "_" || val === "...") return "";
                 const cl = val.replace(",", ".");
                 const parsed = parseFloat(cl);
                 return isNaN(parsed) ? "" : parsed;
               };

               const parseComment = (val: string): "Đạt" | "Chưa đạt" | "" => {
                 if (!val || val === "-" || val === "—" || val === "_" || val === "...") return "";
                 const cl = val.trim().toLowerCase();
                 if (cl.includes(" ") || cl.includes(",") || cl.includes(";")) {
                   const parts = cl.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
                   if (parts.length > 0) {
                     const hasChuaDat = parts.some(p => p === "cd" || p === "cđ" || p === "chưa đạt" || p.includes("chưa") || p === "kđ" || p === "kd" || p === "không đạt" || p === "chua");
                     const hasDat = parts.some(p => p === "đ" || p === "d" || p === "đạt" || p === "dat" || p === "k" || p === "t" || p === "tb");
                     if (hasChuaDat) return "Chưa đạt";
                     if (hasDat) return "Đạt";
                   }
                 }
                 if (cl === "đ" || cl === "d" || cl === "đạt" || cl === "dat") return "Đạt";
                 if (cl === "cd" || cl === "cđ" || cl === "chưa đạt" || cl.includes("chưa") || cl === "kđ" || cl === "kd" || cl === "không đạt" || cl === "chua") return "Chưa đạt";
                 return "";
               };

               if (importTerm === "hk1") {
                 if (def.isEvaluatedByScore) {
                   if (txVal) targetSub.tx1 = cleanSpaceSeparatedScores(txVal);
                   const mVal = parseScore(midVal);
                   if (mVal !== "") targetSub.mid1 = mVal;
                   const eVal = parseScore(endVal);
                   if (eVal !== "") targetSub.end1 = eVal;
                   const aVal = parseScore(avgVal);
                   if (aVal !== "") targetSub.semester1 = aVal;
                 } else {
                   if (txVal) targetSub.tx1 = cleanSpaceSeparatedComments(txVal);
                   const comm = parseComment(avgVal) || parseComment(txVal);
                   if (comm) targetSub.semester1 = comm;
                 }
               } else if (importTerm === "hk2") {
                 if (def.isEvaluatedByScore) {
                   if (txVal) targetSub.tx2 = cleanSpaceSeparatedScores(txVal);
                   const mVal = parseScore(midVal);
                   if (mVal !== "") targetSub.mid2 = mVal;
                   const eVal = parseScore(endVal);
                   if (eVal !== "") targetSub.end2 = eVal;
                   const aVal = parseScore(avgVal);
                   if (aVal !== "") targetSub.semester2 = aVal;
                 } else {
                   if (txVal) targetSub.tx2 = cleanSpaceSeparatedComments(txVal);
                   const comm = parseComment(avgVal) || parseComment(txVal);
                   if (comm) targetSub.semester2 = comm;
                 }
               } else if (importTerm === "canam") {
                 if (def.isEvaluatedByScore) {
                   const h1Val = parseScore(txVal);
                   if (h1Val !== "") targetSub.semester1 = h1Val;
                   const h2Val = parseScore(midVal);
                   if (h2Val !== "") targetSub.semester2 = h2Val;
                   const yVal = parseScore(avgVal);
                   if (yVal !== "") targetSub.yearAvg = yVal;
                 } else {
                   const comm1 = parseComment(txVal) || txVal;
                   if (comm1) targetSub.semester1 = comm1;
                   const comm2 = parseComment(midVal) || midVal;
                   if (comm2) targetSub.semester2 = comm2;
                   const commY = parseComment(avgVal) || avgVal;
                   if (commY) targetSub.yearAvg = commY;
                 }
               }

               // Year Average formulation
               if (def.isEvaluatedByScore) {
                 const s1 = typeof targetSub.semester1 === "number" ? targetSub.semester1 : null;
                 const s2 = typeof targetSub.semester2 === "number" ? targetSub.semester2 : null;
                 if (importTerm !== "canam") {
                   if (s1 !== null && s2 !== null) {
                     targetSub.yearAvg = parseFloat(((s2 * 2 + s1) / 3).toFixed(1));
                   }
                 }
               } else {
                 const s1 = targetSub.semester1;
                 const s2 = targetSub.semester2;
                 if (importTerm !== "canam") {
                   if (s1 === "Chưa đạt" || s2 === "Chưa đạt") {
                     targetSub.yearAvg = "Chưa đạt";
                   } else if (s1 === "Đạt" && s2 === "Đạt") {
                     targetSub.yearAvg = "Đạt";
                   }
                 }
               }

               return targetSub;
             });

             // 5. Parse Academic / Behavior ratings & Attendance
             let academicGrade = existing?.academicGrade || "Tốt";
             let academicGradeHK1 = existing?.academicGradeHK1 || "";
             let academicGradeHK2 = existing?.academicGradeHK2 || "";
             
             let behaviorGrade = existing?.behaviorGrade || "Tốt";
             let behaviorGradeHK1 = existing?.behaviorGradeHK1 || "";
             let behaviorGradeHK2 = existing?.behaviorGradeHK2 || "";
             
             let behaviorGradeSummer = existing?.behaviorGradeSummer || "Không";
             let daysAbsent = existing?.daysAbsent || 0;
             let daysAbsentUnexcused = existing?.daysAbsentUnexcused || 0;
             let distinction = existing?.distinction || "Không";
             let notes = existing?.notes || "Nhập từ học bạ gốc";

             for (let searchR = r + 14; searchR <= Math.min(r + 19, rows.length - 1); searchR++) {
               const rowCells = rows[searchR] || [];
               for (let colIdx = c; colIdx < Math.min(c + 7, rowCells.length); colIdx++) {
                 const cellVal = (rowCells[colIdx] || "").trim();
                 if (!cellVal) continue;
                 
                 if (cellVal.toLowerCase().includes("vắng") || cellVal.toLowerCase().includes("vang")) {
                   const pMatch = cellVal.match(/(\d+)\s*\(phép\)/i) || cellVal.match(/(\d+)\s*phép/i);
                   const kMatch = cellVal.match(/(\d+)\s*\(không\)/i) || cellVal.match(/(\d+)\s*không/i);
                   if (pMatch) daysAbsent = parseInt(pMatch[1]) || 0;
                   if (kMatch) daysAbsentUnexcused = parseInt(kMatch[1]) || 0;
                 }
                 
                 if (cellVal.toUpperCase().includes("KQHT:") || cellVal.toUpperCase().includes("KQRL:")) {
                   const acadMatch = cellVal.match(/KQHT:\s*([A-Za-zĂăÂâĐđÊêÔôƠơƯưỨứỬửỰựỚớỔổỞởỢợẤấẦầẨẩẬậ\s]+)/i);
                   const behavMatch = cellVal.match(/KQRL:\s*([A-Za-zĂăÂâĐđÊêÔôƠơƯưỨứỬửỰựỚớỔổỞởỢợẤấẦầẨẩẬậ\s]+)/i);
                   
                   const parseSummaryRating = (val: string): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" => {
                     const clean = val?.trim()?.toLowerCase() || "";
                     if (clean.includes("tốt") || clean === "t") return "Tốt";
                     if (clean.includes("khá") || clean === "k") return "Khá";
                     if (clean.includes("đạt") || clean === "đ" || clean === "d") return "Đạt";
                     if (clean.includes("chưa") || clean === "cd" || clean === "cđ") return "Chưa đạt";
                     return "";
                   };
                   
                   if (acadMatch) {
                     const rating = parseSummaryRating(acadMatch[1]);
                     if (rating) {
                       if (importTerm === "hk1") {
                         academicGradeHK1 = rating;
                         academicGrade = rating;
                       } else if (importTerm === "hk2") {
                         academicGradeHK2 = rating;
                         academicGrade = rating;
                       } else {
                         academicGrade = rating;
                       }
                     }
                   }
                   
                   if (behavMatch) {
                     const rating = parseSummaryRating(behavMatch[1]);
                     if (rating) {
                       if (importTerm === "hk1") {
                         behaviorGradeHK1 = rating;
                         behaviorGrade = rating;
                       } else if (importTerm === "hk2") {
                         behaviorGradeHK2 = rating;
                         behaviorGrade = rating;
                       } else {
                         behaviorGrade = rating;
                       }
                     }
                   }
                 }
               }
             }

             // Academic Distinction Auto Evaluation
             const hasAnyScore = cardSubjects.some(s => 
               (typeof s.semester1 === "number") || (typeof s.semester2 === "number") || (typeof s.yearAvg === "number") ||
               (s.semester1 === "Đạt" || s.semester1 === "Chưa đạt")
             );

             if (hasAnyScore) {
               const validScores = cardSubjects.filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number");
               if (validScores.length > 0) {
                 const num9Plus = cardSubjects.filter(s => s.isEvaluatedByScore && typeof s.yearAvg === "number" && (s.yearAvg as number) >= 9.0).length;
                 if (academicGrade === "Tốt" && behaviorGrade === "Tốt") {
                   distinction = num9Plus >= 6 ? "Học sinh Xuất sắc" : "Học sinh Giỏi";
                 } else if (academicGrade === "Khá" && behaviorGrade === "Tốt") {
                   distinction = "Học sinh Tiêu biểu";
                 } else {
                   distinction = "Không";
                 }
               }
             }

             parsedResults.push({
               id: existing?.id || `student_${studentCode}`,
               studentCode: existing?.studentCode || studentCode,
               fullName,
               dob: existing?.dob || "01/01/2011",
               gender: existing?.gender || "Nam",
               school: existing?.school || "Trường PTDTBT Tiểu Học và THCS Suối Lư",
               className: className,
               gradeLevel: (targetClassObj?.gradeLevel || "9") as any,
               academicYear: existing?.academicYear || "2025-2026",
               academicGrade,
               academicGradeHK1,
               academicGradeHK2,
               behaviorGrade,
               behaviorGradeHK1,
               behaviorGradeHK2,
               behaviorGradeSummer,
               daysAbsent,
               daysAbsentUnexcused,
               distinction,
               notes,
               verificationToken: existing?.verificationToken || `VERIFY-CCCD-${studentCode}-${className}`,
               subjects: cardSubjects
             });
          });

          if (parsedResults.length > 0) {
            parsedResults.sort((a, b) => compareVietnameseNames(a.fullName, b.fullName));
            setImportPreview(parsedResults);
            setImportStatus(`Phân tích thành công ${parsedResults.length} phiếu học bạ cá nhân của lớp ${importClass} (${importTerm === "hk1" ? "Học kỳ I" : importTerm === "hk2" ? "Học kỳ II" : "Cả năm"}).`);
            setImportErrors([]);
            return;
          }
        }
      }

      // Default column indexes matching template structure
  console.log(JSON.stringify(parsedResults, null, 2));
  