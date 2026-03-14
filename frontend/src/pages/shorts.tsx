import React from "react";

const videos = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
];

const Shorts = () => {
  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory">

      {videos.map((src, i) => (
        <div
          key={i}
          className="h-screen w-full snap-start flex items-center justify-center p-6 "
        >
          {/* 9:16 frame */}
          <div className="relative h-full max-h-screen aspect-[9/16]  overflow-hidden rounded-xl">

            <video
              src={src}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />

            {/* Caption */}
            <div className="absolute bottom-6 left-4 right-4 text-white">
              <h2 className="font-semibold">test??</h2>
              <p className="text-sm opacity-80">
                test??{i + 1}
              </p>
            </div>

          </div>
        </div>
      ))}

    </div>
  );
};

export default Shorts;