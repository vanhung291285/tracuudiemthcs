const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

const anchor = `  const handleDeleteYear = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa năm học này? Dữ liệu học sinh liên quan sẽ không bị xóa nhưng sẽ không thể truy cập qua năm học này nữa.")) return;

    try {
      const success = await dbService.deleteAcademicYear(id);
      if (success) {
        const updated = academicYears.filter(y => y.id !== id);
        setAcademicYears(updated);
        localStorage.setItem("portal_academic_years", JSON.stringify(updated));
      }
    } catch (err) {
      alert("Lỗi khi xóa năm học");
    }
  };`;

const replacement = `  const handleDeleteYear = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa năm học này? ĐỒNG NGHĨA VỚI VIỆC SẼ XÓA TOÀN BỘ HỌC SINH VÀ LỚP HỌC CỦA NĂM HỌC NÀY.")) return;

    setAuthIsLoading(true);
    try {
      const yearObj = academicYears.find(y => y.id === id);
      const success = await dbService.deleteAcademicYear(id);
      
      if (success) {
        const updated = academicYears.filter(y => y.id !== id);
        setAcademicYears(updated);
        localStorage.setItem("portal_academic_years", JSON.stringify(updated));
        
        if (yearObj) {
          // Xóa tất cả học sinh của năm học này
          await dbService.deleteStudentsByYear(yearObj.yearName);
          const remainingStudents = students.filter(s => s.academicYear !== yearObj.yearName);
          setStudents(remainingStudents);
          
          // Xóa tất cả lớp học của năm học này
          const remainingClasses = classes.filter(c => c.academicYear !== yearObj.yearName);
          setClasses(remainingClasses);
          const classesToDelete = classes.filter(c => c.academicYear === yearObj.yearName).map(c => c.id);
          if (classesToDelete.length > 0) {
            await dbService.clearClassesByYear(yearObj.yearName, classesToDelete);
          }
        }
      }
    } catch (err) {
      alert("Lỗi khi xóa năm học");
    } finally {
      setAuthIsLoading(false);
    }
  };`;

if (content.includes('Bạn có chắc chắn muốn xóa năm học này? Dữ liệu học sinh liên quan sẽ không bị xóa')) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/AdminDashboard.tsx', content);
    console.log("Patched handleDeleteYear in AdminDashboard.tsx");
} else {
    console.log("Anchor not found in AdminDashboard.tsx");
}
