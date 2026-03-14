import React from "react";

const MainSection = () => {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-white">

      {/* Scroll container */}
      <div className="flex-1 overflow-y-auto p-6">

        <section className="max-w-5xl mx-auto flex flex-col gap-10">

          {/* Header */}
          <div className="text-center flex flex-col gap-4">

            <h1 className="text-3xl font-semibold tracking-tight sm:text-[40px]">
              IDK IDK IDK
            </h1>

            <p className="text-gray-700 text-lg max-w-2xl mx-auto">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Magnam
              voluptas nostrum eius expedita pariatur qui laboriosam aperiam aut
              ipsam omnis libero unde quibusdam neque debitis enim.
            </p>

            <div>
              <a
                href="/create"
                className="inline-flex items-center justify-center bg-gray-950 text-gray-50 h-10 rounded-lg px-4 text-sm"
              >
                Test
              </a>
            </div>

          </div>

          {/* Scroll test content */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold mb-2">
                Scroll Test Section {i + 1}
              </h2>

              <p className="text-gray-700">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Consequuntur reiciendis doloremque dolore officiis vero
                repudiandae deserunt dicta. Quasi perspiciatis dolorum
                exercitationem perferendis aliquid.
              </p>
            </div>
          ))}

        </section>

      </div>

    </main>
  );
};

export default MainSection;