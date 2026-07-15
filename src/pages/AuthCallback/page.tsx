import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Landing page for Google OAuth redirect.
 * Backend redirects here as:
 *   /auth/callback?token=<jwt>&user=<json>&hasAddress=<0|1>
 *
 * Stores the token + user, then navigates to /checkout.
 * If hasAddress=0 the checkout page will show the address form immediately.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userRaw = params.get("user");
    const hasAddress = params.get("hasAddress") === "1";

    if (token) {
      localStorage.setItem("unchanged_token", token);
      localStorage.setItem("unchanged_has_address", hasAddress ? "1" : "0");

      if (userRaw) {
        try {
          const user = JSON.parse(decodeURIComponent(userRaw));
          localStorage.setItem("unchanged_user", JSON.stringify(user));
        } catch (_) {}
      }

      // Always go to checkout — the page reads has_address to decide what to show
      navigate("/checkout", { replace: true });
    } else {
      // No token — something went wrong, go back to cart
      navigate("/cart", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#fcf9f0] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-stone-700">
        <Loader2 size={36} className="animate-spin text-stone-500" />
        <p className="font-sans text-sm tracking-wide">Signing you in…</p>
      </div>
    </div>
  );
}
