export type Product = {
  id: string;
  title: string;
  price: number;
  description?: string;
  volume?: string;
  tag?: string;
  image?: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "silk-cleanser",
    title: "Silk Cleanser",
    price: 1490,
    volume: "150 ml",
    description: "Мягкое ежедневное очищение, которое сохраняет комфорт кожи.",
    tag: "New",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "glow-serum",
    title: "Glow Serum",
    price: 1690,
    volume: "30 ml",
    description: "Ровный тон и естественное сияние без утяжеления.",
    tag: "Bestseller",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "soft-cream",
    title: "Soft Cream",
    price: 1490,
    volume: "50 ml",
    description: "Поддержка кожного барьера и ощущение уюта в течение дня.",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "body-oil",
    title: "Body Oil",
    price: 1290,
    volume: "100 ml",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "scrub",
    title: "Scrub",
    price: 990,
    volume: "200 ml",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "New",
    image: "/images/placeholder-product.jpg",
  },
];
