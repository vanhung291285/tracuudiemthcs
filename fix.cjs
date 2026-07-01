const fs = require('fs');
let content = fs.readFileSync('src/components/StudentResult.tsx', 'utf8');
content = content.replace(/parseFloat\(\(\(s\.semester2 \* 2 \+ s\.semester1\) \/ 3\)\.toFixed\(1\)\)/g, 'roundScore((s.semester2 * 2 + s.semester1) / 3)');
content = content.replace(/import \{ evaluateTT22, evaluateDistinctionTT22 \} from "\.\.\/lib\/tt22";/g, 'import { evaluateTT22, evaluateDistinctionTT22, roundScore } from "../lib/tt22";');
fs.writeFileSync('src/components/StudentResult.tsx', content);

let adminContent = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
adminContent = adminContent.replace(/parseFloat\(\(\(s2 \* 2 \+ s1\) \/ 3\)\.toFixed\(1\)\)/g, 'roundScore((s2 * 2 + s1) / 3)');
adminContent = adminContent.replace(/parseFloat\(\(\(s\.semester2 \* 2 \+ s\.semester1\) \/ 3\)\.toFixed\(1\)\)/g, 'roundScore((s.semester2 * 2 + s.semester1) / 3)');
adminContent = adminContent.replace(/parseFloat\(\(\(curS1 \+ 2 \* curS2\) \/ 3\)\.toFixed\(1\)\)/g, 'roundScore((curS1 + 2 * curS2) / 3)');
adminContent = adminContent.replace(/parseFloat\(\(\(sumTx \+ \(mid1Val as number\) \* 2 \+ \(end1Val as number\) \* 3\) \/ \(txParts\.length \+ 5\)\)\.toFixed\(1\)\)/g, 'roundScore((sumTx + (mid1Val as number) * 2 + (end1Val as number) * 3) / (txParts.length + 5))');
adminContent = adminContent.replace(/parseFloat\(\(\(sumTx \+ \(mid2Val as number\) \* 2 \+ \(end2Val as number\) \* 3\) \/ \(txParts\.length \+ 5\)\)\.toFixed\(1\)\)/g, 'roundScore((sumTx + (mid2Val as number) * 2 + (end2Val as number) * 3) / (txParts.length + 5))');
adminContent = adminContent.replace(/parseFloat\(\(\(sumTx \+ \(midVal as number\) \* 2 \+ \(endVal as number\) \* 3\) \/ \(txParts\.length \+ 5\)\)\.toFixed\(1\)\)/g, 'roundScore((sumTx + (midVal as number) * 2 + (endVal as number) * 3) / (txParts.length + 5))');
adminContent = adminContent.replace(/parseFloat\(\(\(\(midVal as number\) \* 2 \+ \(endVal as number\) \* 3\) \/ 5\)\.toFixed\(1\)\)/g, 'roundScore(((midVal as number) * 2 + (endVal as number) * 3) / 5)');
adminContent = adminContent.replace(/parseFloat\(\(\(sub\.semester2 \* 2 \+ sub\.semester1\) \/ 3\)\.toFixed\(1\)\)/g, 'roundScore((sub.semester2 * 2 + sub.semester1) / 3)');

adminContent = adminContent.replace(/import \{ evaluateTT22, evaluateDistinctionTT22 \} from "\.\.\/lib\/tt22";/g, 'import { evaluateTT22, evaluateDistinctionTT22, roundScore } from "../lib/tt22";');
fs.writeFileSync('src/components/AdminDashboard.tsx', adminContent);
