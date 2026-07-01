export const roundScore = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 10) / 10;
};

export const evaluateTT22 = (scores: number[], comments: string[]): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" => {
  if (scores.length === 0 && comments.length === 0) return "";
  
  const countAbove = (arr: number[], val: number) => arr.filter(x => x >= val).length;
  
  const getRawGrade = (s: number[], c: string[]): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" => {
    const allCPost = c.every(x => x === "Đạt");
    
    // 1. Tốt: All comments are "Đạt", all scores >= 6.5, at least 6 scores >= 8.0
    const allS65 = s.every(x => x >= 6.5);
    const s80Count = countAbove(s, 8.0);
    if (allCPost && allS65 && s80Count >= 6) return "Tốt";
    
    // 2. Khá: All comments are "Đạt", all scores >= 5.0, at least 6 scores >= 6.5
    const allS50 = s.every(x => x >= 5.0);
    const s65Count = countAbove(s, 6.5);
    if (allCPost && allS50 && s65Count >= 6) return "Khá";
    
    // 3. Đạt: Max 1 "Chưa đạt" in comments, all scores >= 3.5, at least 6 scores >= 5.0
    const cFailCount = c.filter(x => x === "Chưa đạt").length;
    const allS35 = s.every(x => x >= 3.5);
    const s50Count = countAbove(s, 5.0);
    if (cFailCount <= 1 && allS35 && s50Count >= 6) return "Đạt";
    
    return "Chưa đạt";
  };

  const grade = getRawGrade(scores, comments);
  const levelVal: Record<string, number> = { "Tốt": 4, "Khá": 3, "Đạt": 2, "Chưa đạt": 1 };
  const valLevel: Record<number, "Tốt" | "Khá" | "Đạt" | "Chưa đạt"> = { 4: "Tốt", 3: "Khá", 2: "Đạt", 1: "Chưa đạt" };
  
  // Circular 22 adjustment rule: If one subject causes a drop of 2 or more levels, adjust up by 1 level.
  let bestPossible = grade;
  
  // Check if changing ONE subject can significantly improve the grade
  // Test scores
  for (let i = 0; i < scores.length; i++) {
    const temp = [...scores];
    temp[i] = 10.0; // Assume 10 for this subject to find theoretical max
    const g = getRawGrade(temp, comments);
    if (levelVal[g] > levelVal[bestPossible]) bestPossible = g;
  }
  // Test comments
  for (let i = 0; i < comments.length; i++) {
    const temp = [...comments];
    temp[i] = "Đạt";
    const g = getRawGrade(scores, temp);
    if (levelVal[g] > levelVal[bestPossible]) bestPossible = g;
  }
  
  // If potential was 2+ levels higher, but actual is low due to that one subject, move up one level
  if (levelVal[bestPossible] - levelVal[grade] >= 2) {
    return valLevel[levelVal[grade] + 1];
  }

  return grade;
};

export const evaluateDistinctionTT22 = (
  academicGrade: string, 
  behaviorGrade: string, 
  scores: number[]
): "Học sinh Xuất sắc" | "Học sinh Giỏi" | "Không" => {
  if (academicGrade !== "Tốt" || behaviorGrade !== "Tốt") {
    return "Không";
  }
  // Xuất sắc: Tốt (Acad) + Tốt (Behav) + at least 6 subjects >= 9.0
  const countAbove9 = scores.filter(v => v >= 9.0).length;
  if (countAbove9 >= 6) {
    return "Học sinh Xuất sắc";
  }
  // Giỏi: Tốt (Acad) + Tốt (Behav)
  return "Học sinh Giỏi";
};

