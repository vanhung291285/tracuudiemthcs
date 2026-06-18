/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import StudentQuery from "./components/StudentQuery";
import StudentResult from "./components/StudentResult";
import AdminDashboard from "./components/AdminDashboard";
import { Student } from "./types";

export default function App() {
  // Initialize view from URL path
  const [view, setView] = useState<"query" | "result" | "admin">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
      if (path === "/admin") {
        return "admin";
      }
    }
    return "query";
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<"hk1" | "hk2" | "canam">("canam");

  // Keep state and URL in sync
  const setViewWithUrl = (newView: "query" | "result" | "admin") => {
    setView(newView);
    if (typeof window !== "undefined") {
      const targetPath = newView === "admin" ? "/admin" : "/";
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  };

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
      if (path === "/admin") {
        setView("admin");
      } else {
        setView("query");
        setSelectedStudent(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Return to public search page
  const handleBackToQuery = () => {
    setSelectedStudent(null);
    setViewWithUrl("query");
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
            setViewWithUrl("result");
          }}
          onNavigateToAdmin={() => setViewWithUrl("admin")}
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
