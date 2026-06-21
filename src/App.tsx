/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import StudentQuery from "./components/StudentQuery";
import StudentResult from "./components/StudentResult";
import AdminDashboard from "./components/AdminDashboard";
import Footer from "./components/Footer";
import { Student } from "./types";
import { dbService } from "./lib/supabase";

export default function App() {
  // Anti-inspect and anti-view-source code
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j" || e.key.toLowerCase() === "c")) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Synchronize configuration from server on mount to handle session/browser switching automatically
  useEffect(() => {
    const sync = async () => {
      try {
        await dbService.syncConfigFromServer();
        // Record visitor stat on load
        await dbService.recordVisit();
      } catch (e) {
        console.warn("Could not sync config from server on mount:", e);
      }
    };
    sync();
  }, []);

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
    <div className="min-h-screen decorative-page-bg text-slate-800 flex flex-col font-sans select-none relative selection:bg-[#0055A5]/20 selection:text-[#0055A5]" id="app-root">
      
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
        <div className="flex-1 w-full flex flex-col pt-2 pb-6">
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

      {view !== "admin" && <Footer />}

    </div>
  );
}
export type { Student };
