import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 right-20 w-64 h-64 bg-primary/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">免費加入</span>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream mb-6">
            準備好分享您的
            <span className="text-gradient">攝影故事</span>了嗎？
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            加入我們的社群，與超過 12,000 位攝影愛好者一起交流、學習、成長。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="hero" size="xl" className="group">
                <Camera className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
                立即加入
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="glass" size="xl" className="text-cream">
                了解更多
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
