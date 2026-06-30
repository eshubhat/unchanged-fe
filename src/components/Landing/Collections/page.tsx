import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShoppingCart, Check } from "lucide-react";
import { addToCart } from "../../../utils/cart";
import { useSearchParams } from "react-router-dom";



// Define the type for our product for better TypeScript support
type Product = {
  id: number;
  title: string;
  price: string;
  imageFront: string;
  imageBack: string;
  isLimited: boolean;
};

function ProductCard({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frontImgRef = useRef<HTMLImageElement>(null);
  const backImgRef = useRef<HTMLImageElement>(null);

  const [added, setAdded] = useState(false);
  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleMouseEnter = contextSafe(() => {
    // Fade out front image and slightly scale up
    gsap.to(frontImgRef.current, { opacity: 0, scale: 1.1, duration: 0.5, ease: "power2.out" });
    // Fade in back image and scale down to normal
    gsap.to(backImgRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
  });

  const handleMouseLeave = contextSafe(() => {
    // Fade in front image and scale to normal
    gsap.to(frontImgRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
    // Fade out back image and scale up
    gsap.to(backImgRef.current, { opacity: 0, scale: 1.1, duration: 0.5, ease: "power2.out" });
  });

  return (
    <div
      className="flex flex-col gap-3 group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Product Image Box */}
      <div ref={containerRef} className="aspect-[3/4] bg-stone-200 overflow-hidden relative">
        {/* Badge */}
        {product.isLimited && (
          <div className="absolute top-2 left-2 bg-[#701c1c] text-white text-[10px] tracking-wider font-bold px-2 py-1 z-10">
            LIMITED
          </div>
        )}

        {product.imageFront ? (
          <>
            <img
              ref={frontImgRef}
              src={product.imageFront}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <img
              ref={backImgRef}
              src={product.imageBack}
              alt={`${product.title} Back`}
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-0 scale-110"
            />
          </>
        ) : (
          <div className="w-full h-full bg-stone-300"></div>
        )}
      </div>

      {/* Product Details */}
      <div>
        <div className="flex justify-between items-start gap-4">
          <h4 className="font-serif font-medium text-lg leading-tight">
            {product.title}
          </h4>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-bold">{product.price}</span>
            <button
              onClick={handleAddToCart}
              className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${added ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600 hover:bg-[#ef4444] hover:text-white'}`}
              title="Add to cart"
            >
              {added ? <Check size={16} /> : <ShoppingCart size={16} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-500 uppercase mt-1">White</p>
      </div>
    </div>
  );
}

export default function CollectionSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  useEffect(() => {
    // Fetch products from backend
    fetch('http://localhost:3000/api/v1/products')
      .then(res => res.json())
      .then(data => {
        // Handle nested response structures like {success: true, data: {data: [...]}}
        const items = Array.isArray(data) ? data :
          Array.isArray(data?.data) ? data.data :
            Array.isArray(data?.data?.data) ? data.data.data : [];
        const formattedProducts = items.map((item: any) => {
          const frontImg = item.images?.find((img: any) => img.isPrimary)?.url || "/src/assets/tshirt-designs/Vintage-front.jpg";
          const backImg = item.images?.find((img: any) => !img.isPrimary)?.url || frontImg;
          
          return {
            id: item.id,
            title: item.name,
            price: `₹${item.sellingPrice}`,
            imageFront: frontImg,
            imageBack: backImg,
            isLimited: item.isFeatured,
          };
        });
        setProducts(formattedProducts);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setProducts([]);
        setLoading(false);
      });
  }, []);

  return (
    <div id="collections" className="min-h-screen flex flex-col bg-[#fcf9f0] font-sans text-stone-900">
      {/* 2. Main Content Container */}
      {/* flex-col on mobile (stacking), flex-row on larger screens */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full flex flex-col md:flex-row px-6 md:px-12 py-8 gap-12 relative">

        {/* 3. Left Sidebar (Sticky) */}
        <aside className="w-full md:w-64 flex-shrink-0 hidden md:block">

          {/* The magic 'sticky' wrapper */}
          {/* top-28 pushes it down so it doesn't hide behind the header */}
          <div className="sticky top-28 flex flex-col gap-10 h-fit">

            {/* Collections Filter */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm ">
                Collections
              </h3>
              <div className="border-b-2 border-black" />
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="cursor-pointer text-black font-medium">View All</li>
                <li className="cursor-pointer hover:text-black transition-colors">Men's Collection</li>
                <li className="cursor-pointer hover:text-black transition-colors">Women's Collection</li>
              </ul>
            </div>

            {/* Size Filter */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm ">
                Size
              </h3>

              <div className="border-b-2 border-black" />

              <div className="grid grid-cols-3 gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <button
                    key={size}
                    className="border border-stone-300 py-2 text-sm hover:border-black transition-colors bg-white"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm">
                Sort By
              </h3>

              <div className="border-b-2 border-black" />

              <select className="w-full border border-stone-300 bg-white p-2 text-sm outline-none">
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest Arrivals</option>
              </select>
            </div>

          </div>
        </aside>

        {/* 4. Right Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">

            {loading ? (
              <div className="col-span-full py-20 text-center text-stone-500">Loading products...</div>
            ) : (() => {
              const displayedProducts = products.filter(product => 
                product.title.toLowerCase().includes(searchQuery)
              );
              if (displayedProducts.length === 0) {
                return <div className="col-span-full py-20 text-center text-stone-500">No products found.</div>;
              }
              return displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ));
            })()}

          </div>
        </div>

      </main>
    </div>
  );
}