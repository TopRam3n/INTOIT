import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { JAMAICA_HISTORY } from "../data/question-1";
import { Popover } from "@base-ui/react/popover";
import NumberFlow from "@number-flow/react";

type Question = {
  question: string;
  options: string[];
  answer: string;
};

const Quiz = () => {
  const questions: Question[] = JAMAICA_HISTORY.questions;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [previousAnswer, setPreviousAnswer] = useState<number | null>(null);
  const [isAlreadyAnswered, setIsAlreadyAnswered] = useState<boolean>(false);

  const [direction, setDirection] = useState<number>(1);

  const [goToPopoverOpen, setGoToPopoverOpen] = useState(false);
  const [showMobileProgress, setShowMobileProgress] = useState(true);

  const [showProgressRestored] = useState(false);
  const [showProgressDeleted] = useState(false);

  const [isPracticeMode] = useState(false);
  const [, setSummaryDrawerOpen] = useState(false);

  const currentQuestion = questions[currentIndex];

  const correctAnswerIndex = currentQuestion.options.findIndex(
    (opt) => opt === currentQuestion.answer
  );

  const isLastQuestion = currentIndex === questions.length - 1;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.075 },
    }),
  };

  const handleOptionClick = (index: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(index);
    setPreviousAnswer(index);
    setIsAlreadyAnswered(true);
  };

  const handleNext = () => {
    if (isLastQuestion) return;

    setDirection(1);
    setCurrentIndex((prev) => prev + 1);

    setSelectedAnswer(null);
    setIsAlreadyAnswered(false);
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;

    setDirection(-1);
    setCurrentIndex((prev) => prev - 1);

    setSelectedAnswer(null);
    setIsAlreadyAnswered(false);
  };

  const onOpenMobileSets = () => {
    setShowMobileProgress((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-6 p-6 h-full">

      <div className="w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >

            <h2 className="text-[0.92rem] md:text-xl font-medium leading-normal mb-6 md:mb-7">
              {currentQuestion.question}
            </h2>

            <div className="grid gap-2 md:gap-3">

              {currentQuestion.options.map((option, index) => {

                const isSelected = selectedAnswer === index;
                const isCorrect = index === correctAnswerIndex;

                const wasPreviouslySelected = previousAnswer === index;
                const previousWasCorrect =
                  previousAnswer === correctAnswerIndex;

                const showCorrect =
                  (selectedAnswer !== null && isCorrect) ||
                  (isAlreadyAnswered && isCorrect);

                const showIncorrect =
                  (selectedAnswer !== null && isSelected && !isCorrect) ||
                  (isAlreadyAnswered &&
                    wasPreviouslySelected &&
                    !previousWasCorrect);

                let buttonClass = "button-3";

                if (showCorrect) buttonClass = "button-correct";
                else if (showIncorrect) buttonClass = "button-incorrect";

                const isClickable =
                  !isAlreadyAnswered && selectedAnswer === null;

                return (
                  <div
                    key={index}
                    onClick={() => handleOptionClick(index)}
                    className={`flex items-center gap-3 px-3 py-2.5 font-medium ${buttonClass} rounded-lg transition-colors ${
                      isClickable ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="border-[2.5px] border-[#f3f3f3] text-gray-300 font-semibold flex items-center justify-center size-8 rounded-lg shrink-0">
                      {String.fromCharCode(65 + index)}
                    </div>

                    <p className="text-[0.9rem] md:text-base">{option}</p>
                  </div>
                );
              })}

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

     <div
        className="flex gap-4 pt-0 md:pt-4 mt-auto items-center"
        style={{ fontWeight: 700 }}
      >
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          style={{ padding: "0.6em 1.2em" }}
          className={`
            w-[7.2rem] md:w-36 focus:outline-none border-none outline-none active:outline-none focus-visible:outline-none button-3
            ${
              currentIndex === 0
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }
          `}
        >
          <p>Prev</p>
        </button>
        <button
          onClick={onOpenMobileSets}
          style={{ padding: "0.5em 1em" }}
          className="md:hidden button-3 opacity-65 cursor-pointer min-w-18"
        >
          <AnimatePresence mode="popLayout">
            {showMobileProgress ? (
              <motion.span
                key="progress"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.2 }}
                className="font-semibold tabular-nums text-sm"
              >
                {currentIndex + 1}
              </motion.span>
            ) : (
              <motion.span
                key="sets"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                transition={{ duration: 0.2 }}
                className="font-medium text-sm"
              >
                Sets
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="relative hidden md:flex flex-col items-center">
          <AnimatePresence>
            {showProgressRestored && (
              <motion.div
                initial={{
                  y: 6,
                  opacity: 0,
                  scale: 0.9,
                  filter: "blur(1.5px)",
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  y: 9,
                  opacity: 0,
                  scale: 0.85,
                  filter: "blur(2px)",
                }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="absolute -top-14 text-sm font-medium text-blue-600 whitespace-nowrap"
              >
                Progress Restored
              </motion.div>
            )}
            {showProgressDeleted && (
              <motion.div
                initial={{
                  y: 6,
                  opacity: 0,
                  scale: 0.9,
                  filter: "blur(1.5px)",
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  y: 9,
                  opacity: 0,
                  scale: 0.85,
                  filter: "blur(2px)",
                }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="absolute -top-14 text-sm font-medium text-red-600 whitespace-nowrap"
              >
                Progress Deleted
              </motion.div>
            )}
          </AnimatePresence>
          <Popover.Root open={goToPopoverOpen} onOpenChange={setGoToPopoverOpen}>
            <Popover.Trigger
              id="progress-container"
              className="font-semibold tabular-nums font-rounded opacity-70 w-20 hidden md:flex items-center justify-center cursor-pointer bg-white!"
            >
              <NumberFlow
                value={currentIndex + 1}
                transformTiming={{
                  duration: 260,
                  easing:
                    "linear(0, 0.0018, 0.0069 1.16%, 0.0262 2.32%, 0.0642, 0.1143 5.23%, 0.2244 7.84%, 0.5881 15.68%, 0.6933, 0.7839, 0.8591, 0.9191 26.13%, 0.9693, 1.0044 31.93%, 1.0234, 1.0358 36.58%, 1.0434 39.19%, 1.046 42.39%, 1.0446 44.71%, 1.0404 47.61%, 1.0118 61.84%, 1.0028 69.39%, 0.9981 80.42%, 0.9991 99.87%)",
                }}
              />{" "}
              <span className="ml-1 mr-2 opacity-30">/</span>
              {questions.length}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="top" sideOffset={14}>
                <Popover.Popup className="bg-white rounded-lg shadow-lg border border-gray-200 px-3.5 py-2 origin-bottom transition-all duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-[transform,opacity,filter] data-starting-style:opacity-0 data-starting-style:scale-90 data-starting-style:blur-[1.5px] data-ending-style:opacity-0 data-ending-style:scale-85 data-ending-style:blur-[2px]">
                  <Popover.Arrow className="data-[side=top]:bottom-[-10px] data-[side=bottom]:top-[-10px] data-[side=left]:right-[-10px] data-[side=right]:left-[-10px]">
                    <svg
                      width="20"
                      height="10"
                      viewBox="0 0 20 10"
                      fill="none"
                      className="rotate-180 -translate-y-[2.5px] will-change-transform"
                    >
                      <path
                        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
                        className="fill-white"
                      />
                      <path
                        d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
                        className="fill-gray-200"
                      />
                      <path
                        d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
                        className="fill-white"
                      />
                    </svg>
                  </Popover.Arrow>
                  <div className="font-rounded font-semibold text-sm bg-white!">
                    Go to <input 
                      autoFocus 
                      className="border-shadow ml-1 rounded-sm px-1 py-0.25 focus:outline-none min-w-4" 
                      min={1} 
                      max={questions.length}  
                      style={{fieldSizing: "content"}}
                      onBlur={() => setGoToPopoverOpen(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseInt((e.target as HTMLInputElement).value, 10);
                          if (!isNaN(value) && value >= 1 && value <= questions.length) {
                            setCurrentIndex(value - 1);
                            setGoToPopoverOpen(false);
                          }
                        }
                      }}
                    />
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <div
            id="progress-container-mobile"
            className="font-semibold tabular-nums font-rounded opacity-70 w-20 flex md:hidden items-center justify-center"
          >
            <NumberFlow
              value={currentIndex + 1}
              transformTiming={{
                duration: 260,
                easing:
                  "linear(0, 0.0018, 0.0069 1.16%, 0.0262 2.32%, 0.0642, 0.1143 5.23%, 0.2244 7.84%, 0.5881 15.68%, 0.6933, 0.7839, 0.8591, 0.9191 26.13%, 0.9693, 1.0044 31.93%, 1.0234, 1.0358 36.58%, 1.0434 39.19%, 1.046 42.39%, 1.0446 44.71%, 1.0404 47.61%, 1.0118 61.84%, 1.0028 69.39%, 0.9981 80.42%, 0.9991 99.87%)",
              }}
            />{" "}
            <span className="ml-1 mr-2 opacity-30">/</span>
            {questions.length}
          </div>
        </div>
        <button
          onClick={
            isLastQuestion && !isPracticeMode
              ? () => setSummaryDrawerOpen(true)
              : handleNext
          }
          disabled={isLastQuestion && isPracticeMode}
          style={{ padding: "0.6em 1.2em" }}
          className={`
            w-[7.2rem] md:w-36 focus:outline-none border-none outline-none active:outline-none focus-visible:outline-none
            ${
              isLastQuestion && isPracticeMode
                ? "cursor-not-allowed opacity-50 button-3"
                : isLastQuestion
                  ? "cursor-pointer button-summary"
                  : "cursor-pointer button-3"
            }
          `}
        >
          <p>{isLastQuestion && !isPracticeMode ? "Summary" : "Next"}</p>
        </button>
      </div>

    </div>
  );
};

export default Quiz;