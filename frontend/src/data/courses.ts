import type { Course, GraphNode, GraphEdge } from '../types';

export const COURSES: Record<string, Course> = {
  algebra: {
    id: 'algebra', title: 'Algebra', emoji: '𝑥',
    tagline: 'Variables, equations, and the grammar of mathematics',
    color: '#a855f7', accent: '#d946ef',
    topics: [
      {
        id: 'alg_vars', courseId: 'algebra', title: 'Variables & Expressions',
        difficulty: 0.15, estimatedMinutes: 3,
        youtubeQuery: 'algebra variables expressions shorts math',
        formula: '3x + 5',
        lessonELI5: `## Variables Are Like Boxes 📦

Imagine you have a box with a label on it. You don't know what's inside yet — that's a **variable**!

If the box is labelled \\(x\\) and someone tells you \\(x = 4\\), then:
\\(3x + 5\\) means "3 times whatever is in the box, plus 5"
\\(= 3 \\times 4 + 5 = 17\\) 🎉

**Simple rules:**
- Same label = same box = can combine → \\(3x + 2x = 5x\\)
- Different labels = different boxes = leave them alone`,
        lesson: `## What Is a Variable?

A **variable** is a symbol — usually a letter — representing an unknown quantity.

**Expressions** combine variables with operations:
- \\(3x + 5\\) — linear in x
- \\(2a - b + c\\) — three variables

**Evaluating:** substitute a value in.
If \\(x = 4\\): \\(3x + 5 = 3(4) + 5 = 12 + 5 = 17\\)

**Like terms** share the same variable and power:
\\(3x + 2x = 5x\\) ✓ but \\(3x + 2x^2\\) — cannot combine

**Key insight:** Variables let us write one rule that works for infinitely many numbers.`,
        quiz: [
          { id: 'q1', question: 'If x = 3, what is 2x + 7?', options: ['10', '13', '11', '16'], correctIndex: 1, explanation: '2(3) + 7 = 6 + 7 = 13', difficulty: 'normal' },
          { id: 'q2', question: 'Which is a variable expression?', options: ['15 + 3', '4 × 2', 'y − 8', '100'], correctIndex: 2, explanation: 'y − 8 contains the variable y', difficulty: 'easy' },
          { id: 'q3', question: 'If a = 5 and b = 2, what is 3a − 2b?', options: ['11', '19', '13', '15'], correctIndex: 0, explanation: '3(5) − 2(2) = 15 − 4 = 11', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: 'Simplify: 4x + 3y − 2x + 5y', options: ['2x + 8y', '6x + 8y', '2x − 2y', '9xy'], correctIndex: 0, explanation: 'Combine like terms: (4x−2x) + (3y+5y) = 2x + 8y', difficulty: 'hard' },
          { id: 'qh2', question: 'If p = 2, q = −3, evaluate 2p² − q', options: ['11', '5', '8', '−4'], correctIndex: 0, explanation: '2(4) − (−3) = 8 + 3 = 11', difficulty: 'hard' },
        ]
      },
      {
        id: 'alg_linear', courseId: 'algebra', title: 'Linear Equations',
        difficulty: 0.30, estimatedMinutes: 4,
        youtubeQuery: 'solving linear equations step by step shorts',
        formula: 'x = \\dfrac{c - b}{a}',
        lessonELI5: `## Solving Equations = Balancing Scales ⚖️

Imagine an old-fashioned balance scale. Whatever is on both sides must weigh the same.

\\(2x + 6 = 14\\)

**Step 1:** Take 6 off BOTH sides → \\(2x = 8\\)
**Step 2:** Split BOTH sides by 2 → \\(x = 4\\)

Always do the **same thing to both sides** and the scale stays balanced. That's the whole secret!`,
        lesson: `## Isolating the Variable

**Golden Rule:** Whatever you do to one side, do identically to the other.

**Solve \\(2x + 6 = 14\\):**
$$2x = 8 \\Rightarrow x = 4$$

**Check:** \\(2(4) + 6 = 14\\) ✓

**General formula:**
$$ax + b = c \\Rightarrow x = \\frac{c - b}{a}$$`,
        quiz: [
          { id: 'q1', question: 'Solve: 3x + 9 = 24', options: ['x = 5', 'x = 11', 'x = 3', 'x = 7'], correctIndex: 0, explanation: '3x = 15 → x = 5', difficulty: 'normal' },
          { id: 'q2', question: 'Solve: 2x − 4 = 10', options: ['x = 3', 'x = 7', 'x = 5', 'x = 8'], correctIndex: 1, explanation: '2x = 14 → x = 7', difficulty: 'normal' },
          { id: 'q3', question: 'First step to solve 5x + 15 = 40?', options: ['Divide by 5', 'Subtract 15', 'Add 15', 'Multiply by 5'], correctIndex: 1, explanation: 'Subtract 15 first to isolate 5x', difficulty: 'easy' },
        ],
        quizHard: [
          { id: 'qh1', question: 'Solve: 3(x − 2) + 4 = 13', options: ['x = 4', 'x = 5', 'x = 3', 'x = 7'], correctIndex: 1, explanation: '3x−6+4=13 → 3x=15 → x=5', difficulty: 'hard' },
          { id: 'qh2', question: 'Solve: (2x+1)/3 = 5', options: ['x = 7', 'x = 8', 'x = 6', 'x = 9'], correctIndex: 0, explanation: '2x+1=15 → 2x=14 → x=7', difficulty: 'hard' },
        ]
      },
      {
        id: 'alg_quad', courseId: 'algebra', title: 'Quadratic Equations',
        difficulty: 0.60, estimatedMinutes: 5,
        youtubeQuery: 'quadratic formula explained easy shorts',
        formula: 'x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
        lessonELI5: `## Quadratics = Parabolas 🎯

When you throw a ball, its path draws a **parabola** — that's a quadratic!

The equation \\(ax^2 + bx + c = 0\\) asks: where does the ball land (hit y=0)?

**Magic formula that always works:**
$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

The \\(\\pm\\) means you get TWO answers — the ball could land in two spots on the way up AND down!`,
        lesson: `## The Parabola Equation

A **quadratic** has the form \\(ax^2 + bx + c = 0\\).

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Example:** \\(x^2 - 5x + 6 = 0\\) → \\(x=3\\) or \\(x=2\\)

**Discriminant** \\(\\Delta = b^2-4ac\\):
- \\(\\Delta > 0\\) → 2 real roots
- \\(\\Delta = 0\\) → 1 root
- \\(\\Delta < 0\\) → no real roots`,
        quiz: [
          { id: 'q1', question: 'Solve x² − 5x + 6 = 0', options: ['x=2,3', 'x=1,6', 'x=−2,−3', 'x=5,1'], correctIndex: 0, explanation: '(x−2)(x−3)=0', formula: '(x-2)(x-3)=0', difficulty: 'normal' },
          { id: 'q2', question: 'Negative discriminant means?', options: ['2 solutions', '1 solution', 'No real solutions', 'Infinite solutions'], correctIndex: 2, explanation: 'b²−4ac < 0 → imaginary roots', difficulty: 'normal' },
          { id: 'q3', question: 'In 3x²+2x−1=0, what is a?', options: ['2', '1', '−1', '3'], correctIndex: 3, explanation: 'a = coefficient of x² = 3', difficulty: 'easy' },
        ],
        quizHard: [
          { id: 'qh1', question: 'For x²−4x+4=0, how many real solutions?', options: ['0', '1', '2', '3'], correctIndex: 1, explanation: 'Δ=16−16=0, one repeated root x=2', difficulty: 'hard' },
          { id: 'qh2', question: 'Sum of roots of 2x²−6x+4=0?', options: ['2', '3', '4', '6'], correctIndex: 1, explanation: 'Sum = −b/a = 6/2 = 3', difficulty: 'hard' },
        ]
      },
      {
        id: 'alg_functions', courseId: 'algebra', title: 'Functions & Graphs',
        difficulty: 0.50, estimatedMinutes: 4,
        youtubeQuery: 'functions graphs slope intercept shorts math',
        formula: 'f(x) = mx + b',
        lessonELI5: `## Functions Are Machines 🏭

Drop a number in → exactly one number comes out. Every time, guaranteed.

**\\(f(x) = 2x + 1\\)** means: double the input, add 1.
- Drop in 3 → get 7
- Drop in 10 → get 21

**The line equation \\(f(x) = mx + b\\):**
- \\(m\\) = how steep the slope is
- \\(b\\) = where it crosses the y-axis`,
        lesson: `## Functions: Input → Output

A **function** maps every input to exactly **one** output.

**Linear:** \\(f(x) = mx + b\\)
- \\(m\\) = slope, \\(b\\) = y-intercept

$$m = \\frac{y_2 - y_1}{x_2 - x_1}$$

**Vertical Line Test:** crosses twice → not a function.`,
        quiz: [
          { id: 'q1', question: 'f(x) = 3x − 2, find f(4)', options: ['10', '14', '6', '9'], correctIndex: 0, explanation: '3(4) − 2 = 10', difficulty: 'normal' },
          { id: 'q2', question: 'In f(x) = 2x + 5, the y-intercept is:', options: ['2', 'x', '5', '0'], correctIndex: 2, explanation: 'b = 5 is the y-intercept', difficulty: 'easy' },
          { id: 'q3', question: 'Slope of f(x) = −3x + 7?', options: ['7', '3', '0', '−3'], correctIndex: 3, explanation: 'Coefficient of x = −3', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: 'Slope between (2,5) and (6,13)?', options: ['2', '3', '4', '8'], correctIndex: 0, explanation: 'm = (13−5)/(6−2) = 8/4 = 2', difficulty: 'hard' },
          { id: 'qh2', question: 'If f(x)=2x+3 and g(x)=x², find f(g(2))?', options: ['11', '10', '7', '16'], correctIndex: 0, explanation: 'g(2)=4, f(4)=2(4)+3=11', difficulty: 'hard' },
        ]
      },
    ]
  },

  calculus: {
    id: 'calculus', title: 'Calculus', emoji: '∫',
    tagline: 'The mathematics of change and accumulation',
    color: '#0ea5e9', accent: '#38bdf8',
    topics: [
      {
        id: 'calc_limits', courseId: 'calculus', title: 'Limits & Continuity',
        difficulty: 0.40, estimatedMinutes: 4,
        youtubeQuery: 'calculus limits explained simple shorts',
        formula: '\\lim_{x \\to a} f(x) = L',
        lessonELI5: `## Limits = Getting Close 🎯

Imagine walking toward a wall. You can get **infinitely close** but never actually touch it.

\\(\\lim_{x \\to 2}(3x+1) = 7\\) means: as x gets close to 2, the answer gets close to 7.

We don't care what happens exactly AT x=2 — just what's happening nearby!

**Continuity** = no gaps, holes, or jumps. You can draw it without lifting your pen ✏️`,
        lesson: `## What Is a Limit?

$$\\lim_{x \\to 2}(3x + 1) = 7$$

We care about values **near** \\(a\\), not at it.

Both one-sided limits must **agree** for the limit to exist.

**Continuity:** no gaps, holes, or jumps — draw without lifting your pencil.`,
        quiz: [
          { id: 'q1', question: 'lim(x→3) of 2x + 1?', options: ['5', '6', '7', '8'], correctIndex: 2, explanation: '2(3)+1=7', difficulty: 'easy' },
          { id: 'q2', question: 'Continuity means you can:', options: ['Only use integers', 'Draw without lifting pen', 'Never reach zero', 'Always differentiate'], correctIndex: 1, explanation: 'No gaps, holes, or jumps', difficulty: 'normal' },
          { id: 'q3', question: 'A two-sided limit exists when:', options: ['Function defined at point', 'Both one-sided limits equal', 'Function is linear', 'x approaches infinity'], correctIndex: 1, explanation: 'Left and right must agree', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: 'lim(x→0) of sin(x)/x = ?', options: ['0', '∞', '1', 'undefined'], correctIndex: 2, explanation: 'Famous limit: sin(x)/x → 1 as x→0', difficulty: 'hard' },
          { id: 'qh2', question: 'If f(x)=(x²−4)/(x−2), lim(x→2) = ?', options: ['0', '2', '4', 'undefined'], correctIndex: 2, explanation: 'Factor: (x+2)(x−2)/(x−2) = x+2 → 4', difficulty: 'hard' },
        ]
      },
      {
        id: 'calc_deriv', courseId: 'calculus', title: 'Derivatives',
        difficulty: 0.60, estimatedMinutes: 5,
        youtubeQuery: 'derivatives power rule calculus shorts',
        formula: "f'(x) = nx^{n-1}",
        lessonELI5: `## Derivatives = Speedometers 🏎️

A derivative tells you how fast something is changing **right now** — like your car's speedometer reading at one exact moment.

**Power Rule** (the shortcut everyone uses):
$$\\frac{d}{dx}[x^n] = nx^{n-1}$$

So \\(x^3\\) becomes \\(3x^2\\) — bring the power down, reduce it by 1. That's it!

- Positive → going uphill 📈
- Negative → going downhill 📉
- Zero → top or bottom of a hill 🏔️`,
        lesson: `## Rate of Change

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

**Power Rule:** \\(\\frac{d}{dx}[x^n] = nx^{n-1}\\)

- \\(f'(x) > 0\\) → increasing
- \\(f'(x) < 0\\) → decreasing
- \\(f'(x) = 0\\) → critical point`,
        quiz: [
          { id: 'q1', question: 'Derivative of x⁴?', options: ['4x³', 'x³', '4x⁵', '4x'], correctIndex: 0, explanation: 'Power rule: 4x³', formula: '4x^3', difficulty: 'easy' },
          { id: 'q2', question: 'If f\'(x) > 0, the function is:', options: ['Decreasing', 'At a max', 'Increasing', 'Constant'], correctIndex: 2, explanation: 'Positive derivative = increasing', difficulty: 'normal' },
          { id: 'q3', question: 'Derivative of 6x² + 2x?', options: ['12x + 2', '6x + 2', '12x²', '6x'], correctIndex: 0, explanation: '12x + 2', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: 'Derivative of x³·x² using power rule?', options: ['5x⁴', '6x⁵', '5x⁴', '6x⁴'], correctIndex: 0, explanation: 'x⁵ → 5x⁴', difficulty: 'hard' },
          { id: 'qh2', question: 'Find critical points of f(x)=x³−3x', options: ['x=0', 'x=±1', 'x=3', 'x=±3'], correctIndex: 1, explanation: "f'=3x²−3=0 → x²=1 → x=±1", difficulty: 'hard' },
        ]
      },
      {
        id: 'calc_integ', courseId: 'calculus', title: 'Integrals',
        difficulty: 0.70, estimatedMinutes: 5,
        youtubeQuery: 'integration antiderivative calculus shorts easy',
        formula: '\\int x^n \\, dx = \\dfrac{x^{n+1}}{n+1} + C',
        lessonELI5: `## Integrals = Counting Area 📐

If a derivative is a speedometer, an integral is the **odometer** — it adds up all the tiny distances.

**The rule:** Raise the power by 1, divide by the new power:
$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C$$

The mysterious \\(+C\\) is just saying "we don't know the starting position" — any constant disappears when you differentiate.`,
        lesson: `## Area Under a Curve

$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C$$

**Definite integral:**
$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$

Differentiation and integration are **inverse operations** — Fundamental Theorem of Calculus.`,
        quiz: [
          { id: 'q1', question: '∫2x dx = ?', options: ['2x²', 'x² + C', '2 + C', 'x'], correctIndex: 1, explanation: 'x² + C', difficulty: 'easy' },
          { id: 'q2', question: '+C represents:', options: ['Unknown constant', 'Always 0', 'The derivative', 'The slope'], correctIndex: 0, explanation: 'Arbitrary constant of integration', difficulty: 'normal' },
          { id: 'q3', question: '∫(a→b) f(x)dx gives:', options: ['Derivative at a', 'Signed area a to b', 'Slope at b', 'Limit as x→a'], correctIndex: 1, explanation: 'Net signed area under the curve', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: '∫(0→3) 2x dx = ?', options: ['6', '9', '3', '18'], correctIndex: 1, explanation: '[x²]₀³ = 9 − 0 = 9', difficulty: 'hard' },
          { id: 'qh2', question: '∫(3x² + 2x) dx = ?', options: ['x³+x²+C', '6x+2+C', 'x³+x+C', '3x+2+C'], correctIndex: 0, explanation: 'x³ + x² + C', difficulty: 'hard' },
        ]
      },
    ]
  },

  statistics: {
    id: 'statistics', title: 'Statistics', emoji: 'σ',
    tagline: 'Patterns in data, uncertainty, and the laws of chance',
    color: '#10b981', accent: '#34d399',
    topics: [
      {
        id: 'stat_desc', courseId: 'statistics', title: 'Descriptive Statistics',
        difficulty: 0.20, estimatedMinutes: 3,
        youtubeQuery: 'mean median mode standard deviation shorts statistics',
        formula: '\\bar{x} = \\dfrac{\\sum x_i}{n}',
        lessonELI5: `## Describing Data 📊

Imagine you got test scores: {60, 70, 70, 80, 100}

**Mean** = add them all, divide by count = 76 (the "average")
**Median** = middle value = 70 (less affected by the 100)
**Mode** = most common = 70

**Standard deviation** = how spread out are the scores? Small = everyone got similar scores. Big = scores all over the place.`,
        lesson: `## Summarising Data

$$\\bar{x} = \\frac{\\sum x_i}{n}$$

**Mean**, **Median**, **Mode** — measures of centre.

$$s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}$$

Large \\(s\\) = wide spread. Small \\(s\\) = tight clustering.`,
        quiz: [
          { id: 'q1', question: 'Mean of {3,7,5,9,1}?', options: ['4','5','6','7'], correctIndex: 1, explanation: '25/5 = 5', difficulty: 'easy' },
          { id: 'q2', question: 'Large σ means:', options: ['Tight clustering','Wide spread','Mean is large','Median=mean'], correctIndex: 1, explanation: 'High dispersion from mean', difficulty: 'normal' },
          { id: 'q3', question: 'Median of {1,3,5,7,9}?', options: ['3','7','5','4'], correctIndex: 2, explanation: 'Middle of 5 = 5', difficulty: 'easy' },
        ],
        quizHard: [
          { id: 'qh1', question: 'Data {2,4,4,6,8}: which equals 4?', options: ['Mean only','Median and mode','Mean and median','All three'], correctIndex: 1, explanation: 'Mean=4.8, Median=4, Mode=4', difficulty: 'hard' },
          { id: 'qh2', question: 'Adding constant k to every value changes:', options: ['Mean only','SD only','Both mean and SD','Mean only, SD unchanged'], correctIndex: 3, explanation: 'Mean shifts by k, SD unchanged (spread unchanged)', difficulty: 'hard' },
        ]
      },
      {
        id: 'stat_prob', courseId: 'statistics', title: 'Probability',
        difficulty: 0.35, estimatedMinutes: 4,
        youtubeQuery: 'probability basics explained shorts',
        formula: 'P(A) = \\dfrac{|A|}{|\\Omega|}',
        lessonELI5: `## Probability = Counting Chances 🎲

Roll a die. 6 possible outcomes. You want a 3 — that's 1 outcome.

$$P(\\text{rolling 3}) = \\frac{1}{6}$$

**The complement trick:** P(NOT happening) = 1 − P(happening)
If rain is 30% likely, sunshine is 70% likely. Simple!

**Two independent events:** multiply the probabilities.
Two heads in a row = ½ × ½ = ¼`,
        lesson: `## The Mathematics of Chance

$$P(A) = \\frac{\\text{favourable}}{\\text{total}}$$

**Complement:** \\(P(A^c) = 1 - P(A)\\)

**Independent events:**
$$P(A \\cap B) = P(A) \\cdot P(B)$$`,
        quiz: [
          { id: 'q1', question: 'P(even number on a die)?', options: ['1/6','1/3','1/2','2/3'], correctIndex: 2, explanation: '{2,4,6} = 3/6 = 1/2', difficulty: 'easy' },
          { id: 'q2', question: 'P(rain)=0.3, P(no rain)?', options: ['0.3','0.6','0.7','1.3'], correctIndex: 2, explanation: '1 − 0.3 = 0.7', difficulty: 'easy' },
          { id: 'q3', question: 'P(two heads in a row)?', options: ['1/2','1/4','1/3','1/8'], correctIndex: 1, explanation: '1/2 × 1/2 = 1/4', formula: '\\frac{1}{4}', difficulty: 'normal' },
        ],
        quizHard: [
          { id: 'qh1', question: 'P(at least one head in 3 flips)?', options: ['1/2','7/8','3/4','5/8'], correctIndex: 1, explanation: '1 − P(no heads) = 1 − 1/8 = 7/8', difficulty: 'hard' },
          { id: 'qh2', question: 'P(A)=0.4, P(B)=0.3, P(A∩B)=0.1. P(A∪B)?', options: ['0.7','0.6','0.5','0.12'], correctIndex: 1, explanation: 'P(A)+P(B)−P(A∩B)=0.4+0.3−0.1=0.6', difficulty: 'hard' },
        ]
      },
      {
        id: 'stat_normal', courseId: 'statistics', title: 'Normal Distribution',
        difficulty: 0.55, estimatedMinutes: 4,
        youtubeQuery: 'normal distribution bell curve explained shorts',
        formula: 'z = \\dfrac{x - \\mu}{\\sigma}',
        lessonELI5: `## The Bell Curve 🔔

Most things in nature cluster around the middle — heights, test scores, even pizza delivery times!

**68-95-99.7 Rule** (memorise this!):
- 68% of people are within 1 "step" of average
- 95% within 2 steps
- 99.7% within 3 steps

**Z-score** tells you HOW MANY steps away from average you are:
\\(z = \\frac{x-\\mu}{\\sigma}\\)`,
        lesson: `## The Bell Curve

**68–95–99.7 Rule:**
- 68% within \\(\\mu \\pm 1\\sigma\\)
- 95% within \\(\\mu \\pm 2\\sigma\\)

**Z-score:**
$$z = \\frac{x - \\mu}{\\sigma}$$`,
        quiz: [
          { id: 'q1', question: '95% of data falls within:', options: ['±1σ','±2σ','±3σ','±0.5σ'], correctIndex: 1, explanation: '68-95-99.7 rule', difficulty: 'normal' },
          { id: 'q2', question: 'Z-score measures:', options: ['The mean','SDs from mean','Total probability','Sample size'], correctIndex: 1, explanation: 'z = (x−μ)/σ', difficulty: 'normal' },
          { id: 'q3', question: 'z = 0 means:', options: ['Zero','At maximum','Equal to mean','1 SD above'], correctIndex: 2, explanation: 'z=0 → x=μ', difficulty: 'easy' },
        ],
        quizHard: [
          { id: 'qh1', question: 'μ=100, σ=15. What % score above 130?', options: ['5%','2.5%','16%','0.3%'], correctIndex: 1, explanation: '130 is 2σ above mean; 2.5% above z=2', difficulty: 'hard' },
          { id: 'qh2', question: 'IQ score of 85 in μ=100,σ=15 has z-score:', options: ['−1', '1', '−0.5', '1.5'], correctIndex: 0, explanation: 'z=(85−100)/15=−1', difficulty: 'hard' },
        ]
      },
      {
        id: 'stat_regression', courseId: 'statistics', title: 'Regression',
        difficulty: 0.65, estimatedMinutes: 5,
        youtubeQuery: 'linear regression correlation r squared shorts statistics',
        formula: '\\hat{y} = \\beta_0 + \\beta_1 x',
        lessonELI5: `## Finding the Best Fit Line 📈

You have scatter points on a graph. Regression finds the **straight line that comes closest to all of them**.

**r** tells you how well they line up:
- r = 1 → perfect straight line going up ↗
- r = −1 → perfect straight line going down ↘
- r = 0 → just a random cloud ☁️

**R²** = what % of the variation does the line explain?
R²=0.85 → the line explains 85% of what's happening!`,
        lesson: `## Relationships in Data

**Correlation r:** −1 to 1

**Regression line:** \\(\\hat{y} = \\beta_0 + \\beta_1 x\\)

**R²:** proportion of variance explained.

⚠️ Correlation ≠ Causation`,
        quiz: [
          { id: 'q1', question: 'r = −0.95 indicates:', options: ['Weak positive','Strong positive','Strong negative','No relationship'], correctIndex: 2, explanation: 'Close to −1 = strong negative', difficulty: 'normal' },
          { id: 'q2', question: 'R² = 0.72 means:', options: ['72% variance explained','72 data points','28% variance','Perfect fit'], correctIndex: 0, explanation: 'Proportion of variance explained', difficulty: 'normal' },
          { id: 'q3', question: '"Ice cream correlates with drowning" proves:', options: ['Causation','Confounding variable','Negative correlation','Nothing'], correctIndex: 1, explanation: 'Lurking variable: summer heat', difficulty: 'hard' },
        ],
        quizHard: [
          { id: 'qh1', question: 'β₁=2.5 in ŷ=β₀+β₁x means:', options: ['y increases 2.5 per unit x', 'x increases 2.5 per unit y', 'Correlation is 2.5', 'Intercept is 2.5'], correctIndex: 0, explanation: 'Slope = change in ŷ per 1 unit increase in x', difficulty: 'hard' },
          { id: 'qh2', question: 'If R²=0, the regression line:', options: ['Passes through origin','Explains nothing','Is perfectly vertical','Has β₁=1'], correctIndex: 1, explanation: 'R²=0 means the model explains none of the variance', difficulty: 'hard' },
        ]
      },
    ]
  }
};

export const GRAPH_NODES: GraphNode[] = [
  { id: 'alg_vars',        label: 'Variables',         courseId: 'algebra',    difficulty: 0.15, prerequisites: [] },
  { id: 'alg_linear',      label: 'Linear Equations',  courseId: 'algebra',    difficulty: 0.30, prerequisites: ['alg_vars'] },
  { id: 'alg_functions',   label: 'Functions',         courseId: 'algebra',    difficulty: 0.50, prerequisites: ['alg_linear'] },
  { id: 'alg_quad',        label: 'Quadratics',        courseId: 'algebra',    difficulty: 0.60, prerequisites: ['alg_linear'] },
  { id: 'calc_limits',     label: 'Limits',            courseId: 'calculus',   difficulty: 0.40, prerequisites: ['alg_functions'] },
  { id: 'calc_deriv',      label: 'Derivatives',       courseId: 'calculus',   difficulty: 0.60, prerequisites: ['calc_limits'] },
  { id: 'calc_integ',      label: 'Integrals',         courseId: 'calculus',   difficulty: 0.70, prerequisites: ['calc_deriv'] },
  { id: 'stat_desc',       label: 'Descriptive Stats', courseId: 'statistics', difficulty: 0.20, prerequisites: [] },
  { id: 'stat_prob',       label: 'Probability',       courseId: 'statistics', difficulty: 0.35, prerequisites: ['stat_desc'] },
  { id: 'stat_normal',     label: 'Normal Dist.',      courseId: 'statistics', difficulty: 0.55, prerequisites: ['stat_prob'] },
  { id: 'stat_regression', label: 'Regression',        courseId: 'statistics', difficulty: 0.65, prerequisites: ['stat_normal', 'alg_functions'] },
];

export const GRAPH_EDGES: GraphEdge[] = GRAPH_NODES.flatMap(n =>
  n.prerequisites.map(p => ({ source: p, target: n.id }))
);

export const ALL_TOPICS = Object.values(COURSES).flatMap(c => c.topics);
export const COURSE_COLORS: Record<string, string> = { algebra: '#a855f7', calculus: '#0ea5e9', statistics: '#10b981' };
