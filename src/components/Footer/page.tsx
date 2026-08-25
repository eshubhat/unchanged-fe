import { useState } from "react";
import CompanyLogo from "../../assets/company_logo-cropped.svg"
import { Link } from "react-router-dom";
import SizeGuideModal from "../SizeGuideModal";

export default function Footer() {
  const WhatsAppNo = import.meta.env.VITE_WHATSAPP_NUMBER
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  return (
    <footer className="relative bg-[#f7f4ea] text-stone-900 pt-16 pb-8 px-6 md:px-12 font-sans z-50 border-t border-black">
      <div className="flex flex-col gap-12 max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">


          <div className="flex flex-col gap-6 items-center justify-center">
            <div className="flex items-center gap-3">

              <img className="" src={CompanyLogo} alt="The Unchanged Logo" />
            </div>
          </div>


          <div className="flex flex-col gap-6 lg:ml-8">
            <h3 className="font-extrabold uppercase">Service</h3>
            <ul className="flex flex-col gap-4 text-sm text-stone-600">
              <li><a href="#" className="hover:text-black font-light transition-colors hover:underline!" title="Shipping Information">Shipping Information</a></li>
              <li><a href="#" className="hover:text-black font-light transition-colors hover:underline!" title="Returns & Exchanges">Returns & Exchanges</a></li>
              <li>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  id="footer-size-guide-btn"
                  className="hover:text-black font-light transition-colors hover:underline! cursor-pointer bg-transparent border-none p-0 text-sm text-stone-600"
                  title="Size Guide"
                >
                  Size Guide
                </button>
              </li>
              <li><Link to="/faq" className="hover:text-black font-light transition-colors hover:underline!" title="Frequently Asked Questions">FAQ</Link></li>
            </ul>
          </div>


          <div className="flex flex-col gap-6">
            <h3 className="font-extrabold uppercase">Connect</h3>
            <ul className="flex flex-col gap-4 text-sm text-stone-600">
              <li>
                <a href="https://www.instagram.com/theunchangedstudios/" className="md:hidden hover:text-black transition-colors hover:underline!" title="Visit our Instagram">Instagram</a>
                <a href="https://www.instagram.com/theunchangedstudios/" target="_blank" rel="noopener noreferrer" className="hidden md:inline hover:text-black transition-colors hover:underline!" title="Visit our Instagram">Instagram</a>
              </li>
              <li>
                <a href="mailto:contact@theunchangedstudios.com" className="md:hidden hover:text-black transition-colors hover:underline!" title="Email Support">Email Support</a>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@theunchangedstudios.com" target="_blank" rel="noopener noreferrer" className="hidden md:inline hover:text-black transition-colors hover:underline!" title="Email Support">Email Support</a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${WhatsAppNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-black transition-colors hover:underline!"
                  title="WhatsApp Support"
                >
                  WhatsApp Support
                </a>
              </li>

              <li><a href="#" className="hover:text-black transition-colors hover:underline!" title="Brand Philosophy">Brand Philosophy</a></li>
            </ul>
          </div>


          <div className="flex flex-col gap-6">
            <h3 className="font-extrabold uppercase">Newsletter</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Stay the same, always. Updates on rare archival releases.
            </p>
            <form className="flex items-center border border-stone-800 p-3 mt-2 bg-transparent hover:bg-white transition-colors">
              <input
                type="email"
                placeholder="YOUR@EMAIL.COM"
                className="w-full bg-transparent outline-none text-sm placeholder-stone-400 text-stone-900"
                required
              />
              <button type="submit" className="ml-2 hover:opacity-70 transition-opacity" title="Subscribe to Newsletter">

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="19" x2="19" y2="5"></line>
                  <polyline points="9 5 19 5 19 15"></polyline>
                </svg>
              </button>
            </form>
          </div>

        </div>


        <hr className="border-stone-300 mb-6" />


        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>© 2026 The Unchanged Studios. Stay the same, always.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-stone-900 transition-colors" title="Privacy Policy">Privacy Policy</Link>
            <p>Built for Longevity &amp; Structural Integrity.</p>
          </div>
        </div>

      </div>

      {/* Size Guide Modal */}
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}
    </footer>
  );
}