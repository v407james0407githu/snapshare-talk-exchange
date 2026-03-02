import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, MapPin } from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  condition: string;
  location: string;
  seller: string;
  isVerified: boolean;
  postedAt: string;
}

const featuredListings: ListingItem[] = [
  {
    id: "1",
    title: "Sony A7 III 公司貨 快門數 12000",
    price: 38000,
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
    condition: "極新",
    location: "台北市",
    seller: "專業賣家",
    isVerified: true,
    postedAt: "2 小時前",
  },
  {
    id: "2",
    title: "Fujifilm XF 35mm F1.4 定焦鏡",
    price: 12500,
    imageUrl: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400",
    condition: "良好",
    location: "新北市",
    seller: "攝影愛好者",
    isVerified: true,
    postedAt: "5 小時前",
  },
  {
    id: "3",
    title: "iPhone 14 Pro Max 256GB",
    price: 28000,
    imageUrl: "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400",
    condition: "二手",
    location: "台中市",
    seller: "個人賣家",
    isVerified: false,
    postedAt: "1 天前",
  },
  {
    id: "4",
    title: "Peak Design 相機背包 30L",
    price: 6500,
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    condition: "全新",
    location: "高雄市",
    seller: "攝影達人",
    isVerified: true,
    postedAt: "1 天前",
  },
];

const conditionColors: Record<string, string> = {
  全新: "bg-green-500/10 text-green-600 border-green-500/20",
  極新: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  良好: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  二手: "bg-muted text-muted-foreground border-border",
};

export function MarketplacePreview() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              二手<span className="text-gradient">交易區</span>
            </h2>
            <p className="text-muted-foreground">
              社群認證的安心買賣平台
            </p>
          </div>
          <Link to="/marketplace">
            <Button variant="outline" className="hidden sm:flex gap-2">
              瀏覽更多
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Verification Notice */}
        <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-primary/5 border border-primary/20">
          <ShieldCheck className="h-6 w-6 text-primary flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">防詐騙機制：</span>
            賣家需手寫型號紙條並與實機一同拍照，確保為實物交易
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredListings.map((item) => (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="group bg-card rounded-xl border border-border overflow-hidden hover-lift"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <Badge
                  variant="outline"
                  className={`absolute top-3 left-3 ${conditionColors[item.condition]}`}
                >
                  {item.condition}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                
                <div className="text-xl font-bold text-primary mb-3">
                  NT$ {item.price.toLocaleString()}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.location}
                  </div>
                  {item.isVerified && (
                    <div className="flex items-center gap-1 text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      已認證
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/marketplace">
            <Button variant="outline" className="gap-2">
              瀏覽更多商品
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
