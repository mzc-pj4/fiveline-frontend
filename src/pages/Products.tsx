import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Product, ProductList, orderApi, productApi } from "../api";
import { isAuthenticated } from "../auth";

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const category = searchParams.get("category") ?? "";
  const collection = searchParams.get("collection") ?? "";

  const heroSlides = [
    {
      eyebrow: "Weekly pick",
      title: "이번 주 가장 빠르게 담기는 cloud deal",
      copy: "트렌디한 디지털과 리빙 아이템을 가볍게 둘러보고 바로 결제까지 이어지는 market cloud 메인 컬렉션입니다.",
      meta: ["Fast checkout", "Editor pick", "Cloud deal"],
      theme: "slide-fuchsia",
      image: "/images/banners/weekly-pick.png",
    },
    {
      eyebrow: "Fashion drop",
      title: "패션과 라이프스타일을 한 번에 보는 신상 배너",
      copy: "계절감 있는 패션, 주방, 생활 아이템을 넓은 배너 안에서 빠르게 훑고 장바구니로 넘길 수 있게 구성했습니다.",
      meta: ["New arrival", "Lifestyle", "Curated"],
      theme: "slide-sunrise",
      image: "/images/banners/fashion-drop.png",
    },
    {
      eyebrow: "Home refresh",
      title: "집 안 분위기를 바꾸는 리빙 셀렉션",
      copy: "주방과 홈 카테고리를 중심으로 묶은 리빙 특가 배너입니다. 배너에서 분위기를 보고 바로 원하는 카테고리로 이어집니다.",
      meta: ["Home update", "Kitchen", "Living"],
      theme: "slide-cyan",
      image: "/images/banners/home-refresh.png",
    },
  ];

  const currentSlide = heroSlides[activeSlide];

  async function load(nextKeyword: string, nextCategory: string) {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (nextKeyword) params.keyword = nextKeyword;
      if (nextCategory) params.category = nextCategory;
      const { data } = await productApi.get<ProductList>("/api/products", { params });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(keyword, category); }, [keyword, category]);

  useEffect(() => {
    function toggleCategoryMenu() {
      setCategoryOpen((open) => !open);
    }

    if (sessionStorage.getItem("market-cloud:open-category-menu") === "1") {
      sessionStorage.removeItem("market-cloud:open-category-menu");
      setCategoryOpen(true);
    }

    window.addEventListener("market-cloud:toggle-category-menu", toggleCategoryMenu);
    return () => window.removeEventListener("market-cloud:toggle-category-menu", toggleCategoryMenu);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  function selectCategory(nextCategory: string) {
    setCategoryOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) {
      nextParams.set("category", nextCategory);
    } else {
      nextParams.delete("category");
    }
    setSearchParams(nextParams);
  }

  function moveSlide(direction: number) {
    setActiveSlide((current) => (current + direction + heroSlides.length) % heroSlides.length);
  }

  async function handleAddToCart(productId: number) {
    if (!isAuthenticated()) {
      setToast("로그인 후 사용 가능합니다");
      return;
    }
    setAdding(productId);
    try {
      await orderApi.post("/api/cart/items", { product_id: productId, quantity: 1 });
      window.dispatchEvent(new Event("market-cloud:cart-changed"));
      setToast("장바구니에 담겼습니다");
    } catch (err: any) {
      setToast("장바구니 담기 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setAdding(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  const categories = [
    { value: "", label: "전체" },
    { value: "electronics", label: "디지털" },
    { value: "fashion", label: "패션" },
    { value: "kitchen", label: "주방" },
    { value: "home", label: "생활" },
  ];

  const categoryLabels: Record<string, string> = {
    electronics: "디지털",
    fashion: "패션",
    kitchen: "주방",
    home: "생활",
  };

  const saleProductIds = new Set([1, 3, 5, 8, 11]);

  function applyCollection(products: Product[]) {
    if (collection === "best") {
      return [...products].sort((a, b) => {
        const reviewDiff = (b.review_count ?? 0) - (a.review_count ?? 0);
        if (reviewDiff !== 0) return reviewDiff;
        const ratingDiff = (b.average_rating ?? 0) - (a.average_rating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return b.id - a.id;
      });
    }

    if (collection === "sale") {
      return products.filter((product) => saleProductIds.has(product.id));
    }

    if (collection === "new") {
      return [...products].sort((a, b) => b.id - a.id);
    }

    return products;
  }

  const displayItems = applyCollection(items);

  return (
    <div>
      <section
        className={`market-hero ${currentSlide.theme}`}
        style={{ "--hero-image": `url(${currentSlide.image})` } as CSSProperties}
      >
        <div className="hero-copy-area">
          <div className="hero-text-block">
            <p className="eyebrow">{currentSlide.eyebrow}</p>
            <h1 className="hero-title">{currentSlide.title}</h1>
            <p className="hero-copy">{currentSlide.copy}</p>
            <div className="hero-meta">
              <span>Products {displayItems.length}</span>
              {currentSlide.meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-controls">
          <button type="button" className="hero-arrow" aria-label="이전 배너" onClick={() => moveSlide(-1)}>
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <div className="hero-dots">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={`hero-dot${index === activeSlide ? " active" : ""}`}
                aria-label={`${index + 1}번 배너 보기`}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
          <button type="button" className="hero-arrow" aria-label="다음 배너" onClick={() => moveSlide(1)}>
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="catalog-shell">
        <section className="catalog-results">
          {toast && (
            <div className="toast">{toast}</div>
          )}

          {loading ? (
            <div className="loading-state surface">상품을 불러오는 중입니다.</div>
          ) : displayItems.length === 0 ? (
            <div className="empty-state surface">조건에 맞는 상품이 없습니다.</div>
          ) : (
            <div className="product-grid">
              {displayItems.map((p) => (
                <article key={p.id} className="product-card surface">
                  {p.image_url ? (
                    <Link to={`/products/${p.id}`} className="product-image-link">
                      <img src={p.image_url} alt={p.name} className="product-image" />
                      <span className="sale-badge">{saleProductIds.has(p.id) ? "SALE" : "NEW"}</span>
                    </Link>
                  ) : (
                    <Link to={`/products/${p.id}`} className={`product-media ${p.category}`}>
                      <span>{categoryLabels[p.category] ?? p.category}</span>
                    </Link>
                  )}
                  <div>
                    <div className="product-card-top">
                      <h2 className="product-name">
                        <Link to={`/products/${p.id}`}>
                        {p.name}
                        </Link>
                      </h2>
                    </div>
                    <p className="price">{Number(p.price).toLocaleString()}원</p>
                    {p.review_count !== undefined && p.review_count > 0 && (
                      <p className="small stars">
                        ★ {p.average_rating?.toFixed(1)} ({p.review_count})
                      </p>
                    )}
                  </div>
                  <div className="card-footer">
                    <button
                      onClick={() => handleAddToCart(p.id)}
                      disabled={adding === p.id}
                      className="btn btn-primary btn-full"
                    >
                      {adding === p.id ? (
                        "담는 중..."
                      ) : (
                        <>
                          <ShoppingCart size={18} strokeWidth={2.3} aria-hidden="true" />
                          담기
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {categoryOpen && (
        <div className="category-overlay" onClick={() => setCategoryOpen(false)}>
          <aside
            className="category-drawer surface"
            aria-label="상품 카테고리"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-drawer-head">
              <div>
                <p className="eyebrow">Category</p>
                <h2>카테고리</h2>
              </div>
              <button
                type="button"
                className="drawer-close"
                aria-label="카테고리 메뉴 닫기"
                onClick={() => setCategoryOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="category-menu-list">
              {categories.map((cat) => (
                <button
                  key={cat.value || "all"}
                  className={`category-menu-item${category === cat.value ? " active" : ""}`}
                  onClick={() => selectCategory(cat.value)}
                >
                  <span>{cat.label}</span>
                  <span>{cat.value ? "Shop" : "All"}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
