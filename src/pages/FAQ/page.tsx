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
      question: "What is your return and exchange policy?",
      answer: "At The Unchanged, we want you to love what you wear. If you're not completely satisfied with your purchase, you may request a return or exchange within 7 days of delivery.\n\nTo be eligible, the product must be unused, unworn, unwashed, and returned in its original condition with all tags and packaging intact."
    },
    {
      question: "What is The Unchanged?",
      answer: "The Unchanged is an apparel brand focused on bringing premium-quality, stylish and comfortable oversized T-shirts for men and women at affordable prices."
    },
    {
      question: "What material are your T-shirts made from?",
      answer: "Our T-shirts are crafted from 100% premium cotton, offering a super-soft feel, breathability and all-day comfort."
    },
    {
      question: "What is the GSM of your T-shirts?",
      answer: "Our oversized T-shirts are made from 230 GSM premium cotton, giving them a substantial feel while maintaining comfort."
    },
    {
      question: "How do I choose the right size?",
      answer: "We recommend referring to the size chart available on each product page before placing your order. Since our T-shirts have an oversized fit, please check the measurements to find your preferred fit."
    },
    {
      question: "How should I wash and care for my T-shirt?",
      answer: "For best results, wash your T-shirt inside out using cold water and mild detergent. Avoid bleach and ironing directly over the printed design."
    },
    {
      question: "Can I change my delivery address after placing an order?",
      answer: "Please contact our customer support team as soon as possible if you need to change your delivery address. Address changes may not be possible once your order has been dispatched."
    },
    {
      question: "Can I modify my order after placing it?",
      answer: "If you need to change your size, design or delivery details, please contact our customer support team as soon as possible. Modifications are subject to the status of your order."
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
                  <p className="text-lg text-stone-600 leading-relaxed pr-8 md:pr-12 whitespace-pre-line">
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
