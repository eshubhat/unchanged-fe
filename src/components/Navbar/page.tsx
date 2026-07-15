import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import companyLogo from "../../assets/company_logo-cropped.svg";
import { lenis } from "../../utils/lenis"
import { Search, ShoppingCart } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getCart } from "../../utils/cart";

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
    <div ref={containerRef}>
      <div className="navbar-backdrop">
        <div className="navbar-img" ref={navBarImgRef}>
          <img src="/navbar-img.jpg" alt="Navbar Background" />
        </div>
        <div className="navbar-background" ref={navbarBgRef}></div>
      </div>

      <div className="navbar-items" ref={navbarItemsRef}>
        {/* Desktop — left links */}
        <div className="navbar-links" ref={(el) => { navbarLinksRefs.current[0] = el; }}>
          <a href="#">Men</a>
          <a href="#">Women</a>
        </div>

        {/* Desktop — right links (search + cart) */}
        <div className="navbar-links" ref={(el) => { navbarLinksRefs.current[1] = el; }}>
          <div
            className={`navbar-search border p-4 mb-4 ${searchOpen ? "open" : ""}`}
            ref={searchRef}
            onClick={handleSearchClick}
          >
            <button className="navbar-search-btn" ref={searchBtnRef}>
              <Search size={24} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <Link to="/cart" className="relative flex items-center">
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Logo */}
        <div className="navbar-logo" ref={navbarLogoRef}>
          <a href="#"><img src={companyLogo} alt="Logo" /></a>
        </div>

        {/* Mobile — hamburger (absolute left) */}
        <button
          className={`navbar-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
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
          <button className="navbar-mobile-search-btn-inner" ref={mobileSearchBtnRef}>
            <Search size={16} />
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
      <div className={`navbar-mobile-drawer${menuOpen ? " open" : ""}`}>
        <button
          className="navbar-mobile-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>

        <nav className="navbar-mobile-nav">
          <a href="#" onClick={() => setMenuOpen(false)}>Men</a>
          <a href="#" onClick={() => setMenuOpen(false)}>Women</a>
        </nav>

        <div className="navbar-mobile-actions">
          <Link to="/cart" onClick={() => setMenuOpen(false)}>
            <ShoppingCart size={20} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="navbar-cart-badge">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
