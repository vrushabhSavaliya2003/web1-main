import { seededRandom } from "./data";

// Mirrors the reference site's dummy review generator, but seeded per product
// so the numbers are stable between server and client (no hydration mismatch).

const FIRST = ["Chelsi", "Ali", "Isha", "Ajay", "Rohan", "Priya", "Sana", "Vikram", "Neha", "Arjun", "Pooja", "Karan", "Meena", "Deepak", "Anita"];
const LAST = ["kahrwa", "Patil", "Khan", "bhanushali", "arora", "Sharma", "Verma", "Gupta", "Reddy", "Nair", "Das", "Singh", "Jain", "Yadav"];
const COMMENTS = [
  "Same as shown, Mst hai, ❤️❤️",
  "The product is just okay, not great.",
  "Could be better, but overall satisfied.",
  "Amazing quality and fast shipping!",
  "Value for money, highly recommended.",
  "Nice packaging, delivered on time.",
  "Product quality is superb 👍",
  "Exactly what I expected. Thank you!",
  "Good product at this price range.",
  "Loved it, will order again.",
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface Review {
  name: string;
  rating: string;
  date: string;
  text: string;
  helpful: number;
  image: string;
}

export interface RatingSummary {
  average: string;
  ratingCount: number;
  reviewCount: number;
  buckets: { label: string; count: number; pct: number; color: string }[];
  reviews: Review[];
  // totalRatings: number;
}

export function buildRatings(seed: string, productImage: string): RatingSummary {
  // console.log("buildRatings called with seed:", seed, "and productImage:", productImage);
  const rnd = seededRandom(seed);
  const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

  const average = (rnd() * (5 - 4) + 4).toFixed(1);
  // const ratingCount = int(100, 1000);
  // const reviewCount = int(100, 500);

  const ratings = {
    poor: int(10, 50),
    average: int(10, 50),
    good: int(50, 100),
    veryGood: int(100, 150),
    excellent: int(150, 250),
  };
  // Displayed top-to-bottom Excellent → Poor, colored by level. Bar width is
  // the bucket's share of ALL ratings (the reference divides by the total, not
  // by the largest bucket) — so no bar ever fills the whole track.
  const rows = [
    { label: "Excellent", count: ratings.excellent, color: "#038d63" },
    { label: "Very Good", count: ratings.veryGood, color: "#5bbf8a" },
    { label: "Good", count: ratings.good, color: "#f5b000" },
    { label: "Average", count: ratings.average, color: "#f47e2c" },
    { label: "Poor", count: ratings.poor, color: "#e0402c" },
  ];
  const ratingCount = rows.reduce((a, r) => a + r.count, 0);
  const reviewCount = int(100, ratingCount);
  // console.log("Total Ratings:", totalRatings);
  const total = rows.reduce((a, r) => a + r.count, 0);
  const buckets = rows.map((b) => ({ ...b, pct: (b.count / total) * 100 }));

  const reviews: Review[] = Array.from({ length: 5 }).map(() => ({
    name: `${FIRST[int(0, FIRST.length - 1)]} ${LAST[int(0, LAST.length - 1)]}`,
    rating: (rnd() * (5 - 4) + 4).toFixed(1),
    date: `Posted on ${MONTHS[int(0, 11)]} ${int(1, 28)}, 2025`,
    text: COMMENTS[int(0, COMMENTS.length - 1)],
    helpful: int(50, 900),
    image: productImage,
  }));

  return { average, ratingCount, reviewCount, buckets, reviews };
}
// export function totalRatings () {
//   const rnd = seededRandom(seed);
//   const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
//   const ratings = {
//     poor: int(10, 50),
//     average: int(10, 50),
//     good: int(50, 100),
//     veryGood: int(100, 150),
//     excellent: int(150, 250),
//   };
//   const totalRatings = Object.values(ratings).reduce((a, b) => a + b, 0);
//   return totalRatings;
// }