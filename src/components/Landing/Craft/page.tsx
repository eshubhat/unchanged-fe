import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const CraftSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const textOutlineRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    const textElement = textOutlineRef.current;
    if (!textElement) return;

    // A high number ensures the dash covers the entire outline of the text
    const pathLength = 1000;

    // Initial setup: make the "thread" invisible by offsetting it completely
    gsap.set(textElement, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
      fill: "transparent", // Keep text hollow initially
    });

    // Create the ScrollTrigger timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 30%", // Starts drawing when section is 60% down the screen
        end: "top 20%", // Finishes when it hits 20%
        scrub: 1, // Smooth scrubbing effect tied to scroll speed
      },
    });

    // Step 1: Draw the thread (outline)
    tl.to(textElement, {
      strokeDashoffset: 0,
      duration: 1,
      ease: "power1.inOut",
    })
      // Step 2: Fade in the solid text color at the end of the line draw
      .to(
        textElement,
        {
          fill: "#000000", // Change to match your exact text color
          duration: 1,
          ease: "power2.out",
        },
        "-=0.5",
      ); // Overlap the fill animation slightly with the end of the draw

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} className="craft z-20">
      <div className="flex flex-col items-center justify-between gap-8">
        <div className="flex flex-col items-center gap-4">
          {/* Replace standard <h1> with SVG */}
          <div className="w-full max-w-md h-24 relative flex justify-center items-center">
            <svg width="100%" height="100%" viewBox="0 0 400 100">
              <text
                x="32%"
                y="80%"
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="64"
                fontWeight="bold"
                // This stroke is your "thread"
                stroke="#000000"
                strokeWidth="1.5"
                // Ensure it picks up your global font family
                fontFamily="inherit"
              >
                The
              </text>
              <text
                ref={textOutlineRef}
                x="68%"
                y="80%"
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="64"
                fontWeight="bold"
                // This stroke is your "thread"
                stroke="#000000"
                strokeWidth="1.5"
                // Ensure it picks up your global font family
                fontFamily="inherit"
              >
                Craft
              </text>
            </svg>
          </div>

          <h4>Technical Schematics & Artistry</h4>
        </div>

        <div className="flex justify-center w-[80%] gap-4 mt-12 items-center text-start p-16 craft-cards-row">
          <div className="flex flex-col gap-4 p-8 justify-center font-medium border border-black text-start">
            <h3 className="text-lg">Precision Grid</h3>
            <p className="text-sm font-light">
              Every seam is calculated. We follow a strict geometric rhythm that
              ensures balance and durability in every piece we produce.
            </p>
          </div>
          <div className="flex flex-col justify-center font-medium gap-4 p-8 border border-black text-start">
            <h3 className="text-lg">The Archive</h3>
            <p className="text-sm font-light">
              Our inspiration comes from the 1920s–40s industrial functionalism.
              We study the past to build a future that doesn't expire.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 p-8 font-medium border border-black text-start">
            <h3 className="text-lg">Textile Logic</h3>
            <p className="text-sm font-light">
              Interaction is physical. The weight of a zipper, the texture of
              the canvas, the sound of a button—it all matters.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CraftSection;
