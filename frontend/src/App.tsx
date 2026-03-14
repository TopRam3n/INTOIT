import React from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import Quiz from "./pages/quiz";
import Shorts from "./pages/shorts";
import CourseOutline from "./pages/course-outline";
import Analytics from "./pages/analytics";
import Home from "./pages/home";

;

const App = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        <Sidebar />

        <main className="flex-1 overflow-y-auto ">
          <Routes>

            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/course-outline" element={<CourseOutline />} />
            <Route path="/analytics" element={<Analytics />} />

          </Routes>
        </main>

      </div>

    </div>
  );
};

export default App;