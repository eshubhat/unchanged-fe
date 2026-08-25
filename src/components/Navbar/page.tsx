import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import companyLogo from "../../assets/company_logo-cropped.svg";
import { lenis } from "../../utils/lenis"
import { Search, ShoppingCart, Package, User, Ruler, MessageCircle, Mail, ChevronUp, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getCart } from "../../utils/cart";
import navbarImage from "../../assets/bg-hero.webp"
import SizeGuideModal from "../SizeGuideModal";

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navbarBgRef = useRef<HTMLDivElement>(null);
  const navbarItemsRef = useRef<HTMLDivElement>(null);
  const navbarLogoRef = useRef<HTMLDivElement>(null);
  const navbarLinksRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navbarDividerRef = useRef<HTMLDivElement>(null);
  const navBarImgRef = useRef<HTMLDivElement>(null);

  // Desktop search refs
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // Mobile-only standalone search pill refs
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchBtnRef = useRef<HTMLButtonElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [resizeKey, setResizeKey] = useState<number>(0);
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const whatsAppNo = import.meta.env.VITE_WHATSAPP_NUMBER;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  useEffect(() => {
    const updateCartCount = () => {
      const cart = getCart();
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      setCartCount(count);
    };
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const userStr = localStorage.getItem("unchanged_user");
      if (userStr) {
        try {
          setLoggedInUser(JSON.parse(userStr));
        } catch (_) { }
      } else {
        setLoggedInUser(null);
      }
    };

    syncUser(); // Run immediately on mount / route change
    window.addEventListener("authStateChanged", syncUser);
    return () => window.removeEventListener("authStateChanged", syncUser);
  }, [location.pathname]);

  // Debounced resize
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setResizeKey((prev) => prev + 1), 250);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ── Desktop search expand/collapse (skipped on mobile) ──────────────────
  useEffect(() => {
    if (window.innerWidth < 720) return;
    if (!searchRef.current || !inputRef.current || !searchBtnRef.current) return;

    if (searchOpen) {
      gsap.to(searchRef.current, { width: 260, duration: 0.6, ease: "power4.out" });
      gsap.to(searchBtnRef.current, { right: 224, duration: 0.6, ease: "power4.out" });
      gsap.fromTo(
        inputRef.current,
        { opacity: 0, x: 10, display: "none" },
        { opacity: 1, x: 0, display: "block", duration: 0.4, delay: 0.2, ease: "power2.out" }
      );
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      gsap.to(inputRef.current, { opacity: 0, x: 10, display: "none", duration: 0.2, ease: "power2.in" });
      gsap.to(searchRef.current, { width: 42, duration: 0.6, delay: 0.1, ease: "power4.out" });
      gsap.to(searchBtnRef.current, { right: 12, duration: 0.6, delay: 0.1, ease: "power4.out" });
    }
  }, [searchOpen]);

  // ── Mobile standalone search pill expand/collapse ────────────────────────
  useEffect(() => {
    if (window.innerWidth >= 720) return;
    if (!mobileSearchRef.current || !mobileSearchBtnRef.current || !mobileSearchInputRef.current) return;

    if (mobileSearchOpen) {
      gsap.to(mobileSearchRef.current, { width: 160, duration: 0.5, ease: "power4.out" });
      gsap.to(mobileSearchBtnRef.current, { right: 126, duration: 0.5, ease: "power4.out" });
      gsap.fromTo(
        mobileSearchInputRef.current,
        { opacity: 0, x: 8, display: "none" },
        { opacity: 1, x: 0, display: "block", duration: 0.4, delay: 0.15, ease: "power2.out" }
      );
      setTimeout(() => mobileSearchInputRef.current?.focus(), 250);
    } else {
      gsap.to(mobileSearchInputRef.current, { opacity: 0, x: 8, display: "none", duration: 0.2, ease: "power2.in" });
      gsap.to(mobileSearchRef.current, { width: 36, duration: 0.45, delay: 0.1, ease: "power4.out" });
      gsap.to(mobileSearchBtnRef.current, { right: 8, duration: 0.45, delay: 0.1, ease: "power4.out" });
    }
  }, [mobileSearchOpen]);

  // ── Click outside to close both search bars ──────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useGSAP(
    () => {
      const navbarBg = navbarBgRef.current;
      const navbarItems = navbarItemsRef.current;
      const navbarLogo = navbarLogoRef.current;
      const navbarImg = navBarImgRef.current;

      const navbarLinks = navbarLinksRefs.current.filter(
        (el): el is HTMLDivElement => el !== null,
      );

      if (!navbarBg || !navbarItems || !navbarLogo || navbarLinks.length === 0) return;

      // Kill any lingering ScrollTriggers from the previous route before clearing
      // inline styles — without this, the old scrub tween re-applies stale transforms
      // (large scale / y offset / width: 250) to the logo after clearProps runs.
      ScrollTrigger.getAll().forEach((st) => st.kill());

      gsap.set([navbarBg, navbarItems, navbarLogo, navbarImg, navbarDividerRef.current, ...navbarLinks], {
        clearProps: "all",
      });
      navbarLogo.classList.remove("navbar-logo-pinned");
      navbarItems.classList.remove("navbar-final");
      navbarBg.classList.remove("navbar-final");

      const isDesktop = window.innerWidth >= 720;

      // Mobile: apply compact topbar directly, skip all animation
      if (!isDesktop) {
        navbarItems.classList.add("navbar-final");
        navbarBg.classList.add("navbar-final");
        gsap.set(navbarImg, { opacity: 0, display: "none" });
        return;
      }

      if (!isLandingPage) {
        navbarLogo.classList.add("navbar-logo-pinned");
        navbarItems.classList.add("navbar-final");
        navbarBg.classList.add("navbar-final");
        gsap.set(navbarImg, { opacity: 0, display: "none" });
        gsap.set(navbarDividerRef.current, { scaleX: 1 });
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const initialWidth = navbarBg.offsetWidth;
      const initialHeight = navbarBg.offsetHeight;
      const initialLinksWidths = navbarLinks.map((link) => link.offsetWidth);

      // Capture bounding rect BEFORE class change (logo at bottom-center of centered box)
      const logoInitialRect = navbarLogo.getBoundingClientRect();

      // Apply the final pinned state
      navbarLogo.classList.add("navbar-logo-pinned");
      gsap.set(navbarLogo, { width: 250 });

      // Capture bounding rect AFTER class change (logo at top: -1.75rem, width: 250px)
      const logoPinnedRect = navbarLogo.getBoundingClientRect();

      // Calculate how far to offset the logo at progress=0 so it appears at its initial position
      const logoOffsetY = logoInitialRect.top - logoPinnedRect.top;
      const logoOffsetX =
        (logoInitialRect.left + logoInitialRect.width / 2) -
        (logoPinnedRect.left + logoPinnedRect.width / 2);
      const logoScaleFactor = logoInitialRect.width / logoPinnedRect.width;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".navbar-backdrop",
          start: "top top",
          end: `+=${viewportHeight}px`,
          scrub: 1,
          onRefresh(self) {
            const progress = self.progress;
            tl.progress(progress, true);
            if (progress > 0.95) {
              navbarItems.classList.add("navbar-final");
              navbarBg.classList.add("navbar-final");
            } else {
              navbarItems.classList.remove("navbar-final");
              navbarBg.classList.remove("navbar-final");
            }
          },
          onUpdate(self) {
            if (self.progress > 0.95) {
              navbarItems.classList.add("navbar-final");
              navbarBg.classList.add("navbar-final");
            } else {
              navbarItems.classList.remove("navbar-final");
              navbarBg.classList.remove("navbar-final");
            }
          },
        },
      });

      // Animate logo from initial bottom-center position → final pinned top position.
      // Using explicit fromTo (instead of Flip) so it renders correctly at progress=0
      // without relying on the scrubber settling first.
      tl.fromTo(
        navbarLogo,
        { x: logoOffsetX, y: logoOffsetY, scale: logoScaleFactor, transformOrigin: "center center" },
        { x: 0, y: 0, scale: 1, ease: "none" },
        0,
      );
      tl.fromTo(
        [navbarBg, navbarItems],
        { width: initialWidth, height: initialHeight },
        { width: viewportWidth, height: viewportHeight, ease: "none" },
        0,
      );
      navbarLinks.forEach((link, i) => {
        tl.fromTo(link, { width: "50%" }, { width: initialLinksWidths[i], ease: "none" }, 0);
      });
      tl.to(navbarImg, { opacity: 0, duration: 0.05 }, 0.85);
      tl.to(navbarBg, { backgroundColor: "#fcf9f0", duration: 0.25 }, 0.85);
      tl.to(navbarDividerRef.current, { scaleX: 1, duration: 0, ease: "power2.out" }, 0.85);

      // Force progress=0 BEFORE refresh so the logo is at its correct initial
      // visual position when ScrollTrigger calculates its starting state.
      tl.progress(0, true);
      ScrollTrigger.refresh();
    },
    { dependencies: [resizeKey, isLandingPage], scope: containerRef },
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const scrollToCollections = () => {
    const section = document.getElementById("collections");
    if (section) {
      if (typeof lenis !== "undefined" && lenis) {
        lenis.scrollTo(section, { duration: 1.2 });
      } else {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleSearchClick = () => {
    if (!searchOpen) setSearchOpen(true);
    scrollToCollections();
  };

  const handleMobileSearchPillClick = () => {
    if (!mobileSearchOpen) {
      setMobileSearchOpen(true);
      scrollToCollections();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (location.pathname !== "/") {
      navigate(`/?search=${encodeURIComponent(val)}`);
    } else {
      if (val) {
        setSearchParams({ search: val });
      } else {
        setSearchParams({});
      }
    }
  };

  return (
    <>
    <div ref={containerRef}>
      <div className="navbar-backdrop">
        <div className="navbar-img" ref={navBarImgRef}>
          <img src={navbarImage} alt="Navbar Background" />
        </div>
        <div className="navbar-background" ref={navbarBgRef}></div>
      </div>

      <div className="navbar-items" ref={navbarItemsRef}>
        {/* Desktop — left links */}
        <div className="navbar-links" ref={(el) => { navbarLinksRefs.current[0] = el; }}>
          <a href="#" className="has-tooltip relative" data-tooltip="Shop Men's Collection">Men</a>
          <a href="#" className="has-tooltip relative" data-tooltip="Shop Women's Collection">Women</a>
        </div>

        {/* Desktop — right links (search + cart) */}
        <div className="navbar-links" ref={(el) => { navbarLinksRefs.current[1] = el; }}>
          <div
            className={`navbar-search border p-4 mb-4 ${searchOpen ? "open" : ""}`}
            ref={searchRef}
            onClick={handleSearchClick}
          >
            <button className="navbar-search-btn has-tooltip" ref={searchBtnRef} data-tooltip="Search collections">
              <Search size={29} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="flex items-center space-x-16 gap-6">
            <Link to="/profile" className="relative flex items-center has-tooltip" data-tooltip="My Profile">
              {loggedInUser ? (
                loggedInUser.avatarUrl ? (
                  <img src={loggedInUser.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-stone-200" style={{ width: 20, height: 20 }} />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700" style={{ width: 20, height: 20 }}>
                    {loggedInUser.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )
              ) : (
                <User size={23} />
              )}
            </Link>

            <Link to="/orders" className="relative flex items-center has-tooltip" data-tooltip="My Orders">
              <Package size={23} />
            </Link>

            <Link to="/cart" className="relative flex items-center has-tooltip" data-tooltip="My Cart">
              <ShoppingCart size={23} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Logo */}
        <div className="navbar-logo" ref={navbarLogoRef}>
          <Link to="/" className="relative"><img src={companyLogo} alt="Logo" /></Link>
        </div>

        {/* Mobile — hamburger (absolute left) */}
        <button
          className={`navbar-hamburger${menuOpen ? " open" : ""} has-tooltip`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          data-tooltip="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile — standalone expanding search pill (absolute, independent from desktop) */}
        <div
          className="navbar-mobile-search"
          ref={mobileSearchRef}
          onClick={handleMobileSearchPillClick}
        >
          <button className="navbar-mobile-search-btn-inner has-tooltip" ref={mobileSearchBtnRef} data-tooltip="Search collections">
            <Search size={21} />
          </button>
          <input
            ref={mobileSearchInputRef}
            className="navbar-mobile-search-input-inner"
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="navbar-divider" ref={navbarDividerRef} />
      </div>

      {/* Mobile dim overlay */}
      <div
        className={`navbar-mobile-overlay${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile slide-in drawer */}
      <div className={`navbar-mobile-drawer${menuOpen ? " open" : ""}`} data-lenis-prevent="true">
        <button
          className="navbar-mobile-close has-tooltip relative"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          data-tooltip="Close menu"
        >
          ✕
        </button>

        <nav className="navbar-mobile-nav">
          <a href="#" onClick={() => setMenuOpen(false)} className="has-tooltip relative" data-tooltip="Shop Men's Collection">Men</a>
          <a href="#" onClick={() => setMenuOpen(false)} className="has-tooltip relative" data-tooltip="Shop Women's Collection">Women</a>
          <button
            onClick={() => { setMenuOpen(false); setSizeGuideOpen(true); }}
            id="mobile-nav-size-guide-btn"
            className="has-tooltip relative text-left bg-transparent border-none cursor-pointer"
            data-tooltip="View Size Guide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--base-200)", opacity: 0.85 }}
          >
            <Ruler size={22} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
            Size Guide
          </button>
        </nav>

        <div className="navbar-mobile-actions">
          <Link to="/profile" onClick={() => setMenuOpen(false)} className="has-tooltip relative" data-tooltip="My Profile">
            {loggedInUser ? (
              loggedInUser.avatarUrl ? (
                <img src={loggedInUser.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-stone-200" style={{ width: 20, height: 20 }} />
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700" style={{ width: 20, height: 20 }}>
                  {loggedInUser.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )
            ) : (
              <User size={25} />
            )}
            <span>Profile</span>
          </Link>
          <Link to="/orders" onClick={() => setMenuOpen(false)} className="has-tooltip relative" data-tooltip="My Orders">
            <Package size={25} />
            <span>My Orders</span>
          </Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)} className="has-tooltip relative" data-tooltip="My Cart">
            <ShoppingCart size={25} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="navbar-cart-badge">{cartCount}</span>
            )}
          </Link>
        </div>

        {/* Support — pinned to bottom */}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "1.25rem" }}>

          {/* Toggle button */}
          <button
            id="mobile-nav-support-btn"
            onClick={() => setSupportOpen(prev => !prev)}
            className="has-tooltip relative"
            data-tooltip="Help & Support"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Host Grotesk', sans-serif",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--base-200)",
              opacity: supportOpen ? 1 : 0.65,
              transition: "opacity 0.2s",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <MessageCircle size={18} />
              Support
            </span>
            {supportOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Expandable sub-links */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: supportOpen ? "200px" : "0px",
              transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", paddingTop: "1rem", paddingLeft: "0.25rem" }}>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/theunchangedstudios/"
                onClick={() => setMenuOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
                id="mobile-support-instagram"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  color: "var(--base-200)",
                  textDecoration: "none",
                  opacity: 0.7,
                  transition: "opacity 0.18s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
              >
                {/* Instagram icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
                </svg>
                Instagram
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${whatsAppNo}`}
                onClick={() => setMenuOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
                id="mobile-support-whatsapp"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  color: "var(--base-200)",
                  textDecoration: "none",
                  opacity: 0.7,
                  transition: "opacity 0.18s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
              >
                {/* WhatsApp icon (lucide doesn't have one — using a clean inline SVG) */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.523 5.847L0 24l6.338-1.491A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.359-.213-3.72.876.939-3.617-.234-.373A9.77 9.77 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                WhatsApp
              </a>

              {/* Email */}
              <a
                href="mailto:contact@theunchangedstudios.com"
                onClick={() => setMenuOpen(false)}
                id="mobile-support-email"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  fontFamily: "'Host Grotesk', sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 400,
                  color: "var(--base-200)",
                  textDecoration: "none",
                  opacity: 0.7,
                  transition: "opacity 0.18s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
              >
                <Mail size={16} />
                Email
              </a>

            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Size Guide Modal — triggered from mobile drawer */}
    {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}
    </>
  );
}
