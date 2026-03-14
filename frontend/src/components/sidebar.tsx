import React from "react";

const Sidebar = () => {
  return (
    <aside className="hidden md:flex h-full w-56 flex-col border-r border-gray-200">
      <nav className="flex flex-col gap-1 p-3">
        <a
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-gray-200"
          href="/quiz"
        >
          Quiz
        </a>

        <a
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200"
          href="/shorts"
        >
          Shorts
        </a>

        <a
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200"
          href="/course-outline"
        >
          Course outline
        </a>

        <a
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200"
          href="/analytics"
        >
          Analytics
        </a>
      </nav>

      <div className="mt-auto border-t border-gray-200 p-3">
        <a
          className="inline-flex items-center justify-center bg-gray-950 text-gray-50 h-8 rounded-lg px-3 text-sm w-full"
          href="/sign-in"
        >
          Sign in
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
