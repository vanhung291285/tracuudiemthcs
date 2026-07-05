const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = `        let query = this.supabase.from("students").select("*");
        if (academicYear && this.hasAcademicYearColumn) {
          const yearField = this.isSnakeCaseSchema ? "academic_year" : "academicYear";
          query = query.eq(yearField, academicYear);
        }

        const result = await Promise.race([
          query,
          timeoutPromise
        ]);

        const data = result.data;
        const error = result.error;`;

const replacement = `        const fetchAllPages = async () => {
          let allData = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;
          
          while (hasMore) {
            let query = this.supabase.from("students").select("*").range(from, from + pageSize - 1);
            if (academicYear && this.hasAcademicYearColumn) {
              const yearField = this.isSnakeCaseSchema ? "academic_year" : "academicYear";
              query = query.eq(yearField, academicYear);
            }
            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              if (data.length < pageSize) hasMore = false;
              else from += pageSize;
            } else {
              hasMore = false;
            }
          }
          return { data: allData, error: null };
        };

        const result = await Promise.race([
          fetchAllPages(),
          timeoutPromise
        ]);

        const data = result.data;
        const error = result.error;`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', content);
    console.log("Patched getAllStudents in supabase.ts");
} else {
    console.log("Anchor not found in supabase.ts");
}
