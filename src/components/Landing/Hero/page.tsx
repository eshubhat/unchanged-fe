import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image1 from "../../../assets/img-1.png";

// Register the ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const headingRef = useRef(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const word = "Unchanged";

  useEffect(() => {
    // Filter out any null references
    const letters = lettersRef.current.filter(Boolean);

    // GSAP Animation
    const animation = gsap.to(letters, {
      color: "#ef4444", 
      stagger: 0.1,
      scrollTrigger: {
        trigger: headingRef.current,
        start: "top 60%", 
        end: "top 30%", 
        scrub: true, 
      },
    });

    // Cleanup function to prevent memory leaks
    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section className="hero">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 ref={headingRef}>
            Made for the{" "}
            {/* Split the word into individual spans */}
            <span className="inline-block">
              {word.split("").map((letter, index) => (
                <span
                  key={index}
                  ref={(el) => { lettersRef.current[index] = el; }}
                  // Use text-current to inherit black/default color initially
                  className="text-current transition-none inline-block"
                >
                  {letter}
                </span>
              ))}
            </span>
          </h1>
          <h4>
            We exist for those who value the permanence of form over the
            volatility of trends. A celebration of items that earn their
            character through time.
          </h4>
        </div>

        <div className="flex justify-between items-center gap-20 hero-inner">
          <img
            src={Image1}
            alt="Hero Image"
            className="max-w-sm border-2 border-black"
          />
          <div className="flex flex-col gap-8 max-w-lg text-start">
            <h2>The Soul of Permanence</h2>
            <p>
              In an era of planned obsolescence, "The Unchanged" is a rebellion.
              We believe that an object's value is not found in its novelty, but
              in its ability to remain relevant across decades.
            </p>
            <p>
              Our design language is rooted in the industrial era—a time when
              things were built once and built right. We don't innovate for the
              sake of change; we refine for the sake of perfection.
            </p>
            <div className="flex justify-between gap-8 ">
              <div className="flex flex-col gap-2 text-start">
                <h4>01. Material</h4>
                <p className="text-sm">
                  Raw selvedge, heavy-gauge steel, and vegetable-tanned leathers.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-start">
                <h4>02. Method</h4>
                <p className="text-sm">
                  Traditional bench-craft combined with rigorous structural testing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}