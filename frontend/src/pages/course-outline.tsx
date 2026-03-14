import React from "react";

const CourseOutline = () => {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-10 py-10">

      {/* Page header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Course Outline
        </h1>

        <p className="text-gray-600 max-w-2xl">
          This is a sample outline showing how lessons might be structured.
          Scroll to test the layout and page behavior.
        </p>
      </div>

      {/* Course sections */}
      {[...Array(12)].map((_, section) => (
        <div
          key={section}
          className="border border-gray-200 rounded-xl p-6 shadow-sm bg-white"
        >
          <h2 className="text-xl font-semibold mb-4">
            Module {section + 1}: Sample Topic
          </h2>

          <ul className="flex flex-col gap-2">
            {[...Array(5)].map((_, lesson) => (
              <li
                key={lesson}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100"
              >
                <span>Lesson {lesson + 1}: Example Lesson Title</span>
                <span className="text-sm text-gray-500">10 min</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

    </div>
  );
};

export default CourseOutline;