import { Button } from "@/components/ui/button";
import { Camera, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero min-h-[80vh] flex items-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">攝影愛好者的專屬社群</span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-cream leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            用<span className="text-gradient">光影</span>說故事
            <br />
            與同好<span className="text-gradient">共鳴</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            在這裡分享您的攝影作品、交流器材心得、結識志同道合的朋友。
            無論是手機攝影還是專業相機，都歡迎加入我們的大家庭。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/register">
              <Button variant="hero" size="xl" className="group">
                <Camera className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
                開始創作之旅
              </Button>
            </Link>
            <Link to="/gallery">
              <Button variant="glass" size="xl" className="text-cream">
                <Users className="h-5 w-5 mr-2" />
                瀏覽精選作品
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            {[
              { value: "12,000+", label: "創作者" },
              { value: "50,000+", label: "作品" },
              { value: "200,000+", label: "互動討論" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gradient mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
