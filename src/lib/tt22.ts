export const evaluateTT22 = (scores: number[], comments: string[]): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "" => {
  if (scores.length === 0 && comments.length === 0) return "";
  
  const countAbove = (arr: number[], val: number) => arr.filter(x => x >= val).length;
  
  const isTot = (s: number[], c: string[]) => 
    c.every(x => x === "Đạt") && s.every(x => x >= 6.5) && countAbove(s, 8.0) >= 6;
    
  const isKha = (s: number[], c: string[]) => 
    c.every(x => x === "Đạt") && s.every(x => x >= 5.0) && countAbove(s, 6.5) >= 6;
    
  const isDat = (s: number[], c: string[]) => 
    c.filter(x => x === "Chưa đạt").length <= 1 && s.every(x => x >= 3.5) && countAbove(s, 5.0) >= 6;

  const getRawGrade = (s: number[], c: string[]) => {
    if (isTot(s, c)) return "Tốt";
    if (isKha(s, c)) return "Khá";
    if (isDat(s, c)) return "Đạt";
    return "Chưa đạt";
  };

  let grade = getRawGrade(scores, comments);
  
  const levelVal: Record<string, number> = { "Tốt": 4, "Khá": 3, "Đạt": 2, "Chưa đạt": 1 };
  const valLevel: Record<number, "Tốt"| "Khá"| "Đạt"| "Chưa đạt"> = { 4: "Tốt", 3: "Khá", 2: "Đạt", 1: "Chưa đạt" };
  
  let maxPossibleGrade = grade;
  
  // Try ignoring 1 score subject
  for (let i = 0; i < scores.length; i++) {
    const tempScores = [...scores];
    tempScores[i] = 10.0;
    const tempGrade = getRawGrade(tempScores, comments);
    if (levelVal[tempGrade] > levelVal[maxPossibleGrade]) {
      maxPossibleGrade = tempGrade;
    }
  }
  
  // Try ignoring 1 comment subject
  for (let i = 0; i < comments.length; i++) {
    const tempComments = [...comments];
    tempComments[i] = "Đạt";
    const tempGrade = getRawGrade(scores, tempComments);
    if (levelVal[tempGrade] > levelVal[maxPossibleGrade]) {
      maxPossibleGrade = tempGrade;
    }
  }

  // Adjust if drop is 2 or more levels due to a single subject
  if (levelVal[maxPossibleGrade] >= 3) {
    if (levelVal[maxPossibleGrade] - levelVal[grade] >= 2) {
      grade = valLevel[levelVal[maxPossibleGrade] - 1];
    }
  }

  return grade as "Tốt" | "Khá" | "Đạt" | "Chưa đạt";
};

export const evaluateDistinctionTT22 = (
  academicGrade: string, 
  behaviorGrade: string, 
  scores: number[]
): "Học sinh Xuất sắc" | "Học sinh Giỏi" | "Không" => {
  if (academicGrade !== "Tốt" || behaviorGrade !== "Tốt") {
    return "Không";
  }
  const countAbove9 = scores.filter(v => v >= 9.0).length;
  if (countAbove9 >= 6) {
    return "Học sinh Xuất sắc";
  }
  return "Học sinh Giỏi";
};
