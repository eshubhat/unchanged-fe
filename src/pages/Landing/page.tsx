// import React from "react";
import Hero from "../../components/Landing/Hero/page"

import CraftSection from "../../components/Landing/Craft/page"
import CollectionSection from "../../components/Landing/Collections/page";

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="hidden lg:block">
        <Hero />
        <CraftSection />
      </div>
      {/* <About /> */}
      <CollectionSection />
    </div>
  );
}