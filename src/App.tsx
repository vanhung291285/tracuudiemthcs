/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import StudentQuery from "./components/StudentQuery";
import StudentResult from "./components/StudentResult";
import AdminDashboard from "./components/AdminDashboard";
import { Student } from "./types";

export default function App() {
  const [view, setView] = useState<"query" | "result" | "admin">("query");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<"hk1" | "hk2" | "canam">("canam");

  // Return to public search page
  const handleBackToQuery = () => {
    setSelectedStudent(null);
    setView("query");
  };

  // Switch dynamically between pages
  return (
    <div className="min-h-screen bg-[#EEF2F5] text-slate-800 flex flex-col font-sans select-none relative selection:bg-[#0055A5]/20 selection:text-[#0055A5]" id="app-root">
      
      {/* Dynamic View rendering */}
      {view === "query" && (
        <StudentQuery
          onQueryResult={(student, term) => {
            setSelectedStudent(student);
            setSelectedTerm(term);
            setView("result");
          }}
          onNavigateToAdmin={() => setView("admin")}
        />
      )}

      {view === "result" && selectedStudent && (
        <div className="flex-1 py-10">
          <StudentResult
            student={selectedStudent}
            initialTerm={selectedTerm}
            onBack={handleBackToQuery}
          />
        </div>
      )}

      {view === "admin" && (
        <AdminDashboard
          onBackToPortal={handleBackToQuery}
        />
      )}

    </div>
  );
}
export type { Student };
