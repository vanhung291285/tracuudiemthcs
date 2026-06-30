import fs from 'fs';
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const searchBlock = `             // 4. Parse subjects
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
                 for (let searchR = r + 3; searchR <= Math.min(r + 18, rows.length - 1); searchR++) {
                   const cellName = (rows[searchR]?.[c + 1] || "").trim();
                   if (cellName.toLowerCase().includes(def.subjectName.toLowerCase().slice(0, 4))) {
                     rowIdx = searchR;
                     break;
                   }
                 }
               }

               const colTx = c + 2;
               const colMid = c + 3;
               const colEnd = c + 4;
               const colAvg = c + 5;

               const txVal = (rows[rowIdx]?.[colTx] || "").trim();
               const midVal = (rows[rowIdx]?.[colMid] || "").trim();
               const endVal = (rows[rowIdx]?.[colEnd] || "").trim();
               const avgVal = (rows[rowIdx]?.[colAvg] || "").trim();`;

const replaceBlock = `             // Find headers to detect column offsets dynamically
             let colTxStart = c + 2;
             let colMid = c + 3;
             let colEnd = c + 4;
             let colAvg = c + 5;
             
             for (let searchR = r; searchR <= Math.min(r + 4, rows.length - 1); searchR++) {
               const cellB = (rows[searchR]?.[c + 1] || "").trim().toLowerCase();
               if (cellB.includes("môn") || cellB.includes("mon")) {
                 let foundTx = false;
                 for (let col = c + 2; col <= Math.min(c + 15, rows[searchR]?.length || 0); col++) {
                   const hVal = (rows[searchR]?.[col] || "").trim().toLowerCase();
                   if (hVal && (hVal.includes("tx") || hVal === "đđgtx") && !foundTx) { colTxStart = col; foundTx = true; }
                   else if (hVal && (hVal.includes("gk") || hVal === "đđggk")) { colMid = col; }
                   else if (hVal && (hVal.includes("ck") || hVal === "đđgck")) { colEnd = col; }
                   else if (hVal && (hVal.includes("tb") || hVal === "đtb" || hVal.includes("tbm"))) { colAvg = col; }
                 }
                 break;
               }
             }

             // 4. Parse subjects
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
                 for (let searchR = r + 3; searchR <= Math.min(r + 18, rows.length - 1); searchR++) {
                   const cellName = (rows[searchR]?.[c + 1] || "").trim();
                   if (cellName.toLowerCase().includes(def.subjectName.toLowerCase().slice(0, 4))) {
                     rowIdx = searchR;
                     break;
                   }
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
               const avgVal = (rows[rowIdx]?.[colAvg] || "").trim();`;

if (content.includes(searchBlock)) {
    content = content.replace(searchBlock, replaceBlock);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content, 'utf8');
    console.log('Successfully updated parsing logic!');
} else {
    console.log('Failed to find parsing logic block!');
}
