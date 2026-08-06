import { Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function FAQPage() {
  // Ensure we start at the top of the page when navigating from the footer
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How should I care for my Unchanged garments to maximize their longevity?",
      answer: "We build our garments with structural integrity as the primary focus, utilizing heavy-weight cottons and durable construction methods. To maintain this integrity, we recommend washing in cold water with similar colors and hanging to dry. Avoid high-heat tumble drying, as it can compromise both the fabric structure and the precise fit of the garment over time."
    },
    {
      question: "Do you restock archival releases or limited pieces?",
      answer: "We reject the fast-fashion cycle of endless restocking. Once an archival release is complete, we rarely reproduce it in its exact form. We believe in creating pieces that stand the test of time—if you acquire a piece, it is meant to remain with you. We focus on our core structural pieces while occasionally introducing new, meticulously engineered silhouettes."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-24 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-3xl mx-auto">
        <div className="mb-20">
          <Link to="/" className="relative z-10 text-stone-500 hover:text-stone-900 text-sm font-medium uppercase tracking-wider mb-8 inline-block transition-colors">
            &larr; Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-serif font-medium uppercase tracking-tight text-stone-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-stone-600">
            Clarity and transparency regarding our philosophy, processes, and garments.
          </p>
        </div>

        <div className="flex flex-col border-t border-stone-200">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border-b border-stone-200">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full py-8 md:py-10 flex items-center justify-between text-left focus:outline-none group"
                >
                  <span className="text-xl font-medium pr-8 group-hover:text-stone-600 transition-colors">
                    {faq.question}
                  </span>
                  <span className="text-stone-400 flex-shrink-0">
                    {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 opacity-100 pb-10" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-lg text-stone-600 leading-relaxed pr-8 md:pr-12">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
