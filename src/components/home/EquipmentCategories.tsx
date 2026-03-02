import { Link } from "react-router-dom";
import { Smartphone, Camera, ChevronRight } from "lucide-react";

const mobilePhoneBrands = [
  { name: "Apple", icon: "🍎", count: 2834, models: ["iPhone 16 Pro", "iPhone 15", "iPhone 14"] },
  { name: "Samsung", icon: "📱", count: 1956, models: ["Galaxy S24 Ultra", "Galaxy Z Fold", "Galaxy A"] },
  { name: "Xiaomi", icon: "🔶", count: 1242, models: ["14 Ultra", "13T Pro", "Redmi Note"] },
  { name: "Vivo", icon: "📷", count: 876, models: ["X100 Pro", "V30", "Y Series"] },
];

const cameraBrands = [
  { name: "Sony", icon: "🎌", count: 3421, models: ["A7 IV", "A7R V", "ZV-E10"] },
  { name: "Fujifilm", icon: "🗻", count: 2876, models: ["X-T5", "X100VI", "GFX 100"] },
  { name: "Nikon", icon: "🟡", count: 2134, models: ["Z8", "Z6 III", "Z fc"] },
  { name: "Ricoh", icon: "⬜", count: 987, models: ["GR III", "GR IIIx", "Theta"] },
];

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  brands: typeof mobilePhoneBrands;
  linkPrefix: string;
}

function CategoryCard({ icon, title, brands, linkPrefix }: CategoryCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center text-charcoal">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {brands.reduce((acc, b) => acc + b.count, 0).toLocaleString()} 則討論
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            to={linkPrefix}
            className="group flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{brand.icon}</span>
              <div>
                <div className="font-medium group-hover:text-primary transition-colors">
                  {brand.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {brand.models.slice(0, 2).join(", ")}...
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {brand.count.toLocaleString()}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      <Link
        to={linkPrefix}
        className="block mt-4 text-center text-sm text-primary hover:underline"
      >
        查看全部 →
      </Link>
    </div>
  );
}

export function EquipmentCategories() {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            攝影<span className="text-gradient">討論區</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            依您使用的裝備選擇專區，與同樣愛好者交流心得
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <CategoryCard
            icon={<Smartphone className="h-6 w-6" />}
            title="手機攝影"
            brands={mobilePhoneBrands}
            linkPrefix="/forums?category=phone"
          />
          <CategoryCard
            icon={<Camera className="h-6 w-6" />}
            title="相機攝影"
            brands={cameraBrands}
            linkPrefix="/forums?category=camera"
          />
        </div>
      </div>
    </section>
  );
}
