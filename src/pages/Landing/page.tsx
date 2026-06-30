// import React from "react";
import Hero from "../../components/Landing/Hero/page"

import CraftSection from "../../components/Landing/Craft/page"
import CollectionSection from "../../components/Landing/Collections/page";

export default function Landing() {
  return (
    <div className="landing-page">
      <Hero />
      <CraftSection />
      {/* <About /> */}
      <CollectionSection />
    </div>
  );
}