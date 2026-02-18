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
    title: "Шелковый очищающий гель",
    price: 1490,
    volume: "150 мл",
    description: "Мягкое ежедневное очищение, которое сохраняет комфорт кожи.",
    tag: "Новинка",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "glow-serum",
    title: "Сияющая сыворотка",
    price: 1690,
    volume: "30 мл",
    description: "Ровный тон и естественное сияние без утяжеления.",
    tag: "Хит продаж",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "soft-cream",
    title: "Мягкий крем",
    price: 1490,
    volume: "50 мл",
    description: "Поддержка кожного барьера и ощущение уюта в течение дня.",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "body-oil",
    title: "Масло для тела",
    price: 1290,
    volume: "100 мл",
    description: "Питательное масло для тела — мягкость и сияние кожи.",
    image: "/images/placeholder-product.jpg",
  },
  {
    id: "scrub",
    title: "Скраб",
    price: 990,
    volume: "200 мл",
    description: "Скраб для гладкости: обновление и тонус.",
    tag: "Новинка",
    image: "/images/placeholder-product.jpg",
  },
];
