import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

export function CTASection() {
  const { get } = useSiteContent();

  const title = get("cta_title", "準備好分享您的攝影故事了嗎？");
  const subtitle = get("cta_subtitle", "加入我們的社群，與超過 12,000 位攝影愛好者一起交流、學習、成長。");
  const badge = get("cta_badge", "免費加入");
  const primaryText = get("cta_primary_text", "立即加入");
  const primaryLink = get("cta_primary_link", "/auth");
  const secondaryText = get("cta_secondary_text", "了解更多");
  const secondaryLink = get("cta_secondary_link", "/gallery");

  // Split title at "攝影故事" for gradient styling
  const titleParts = title.split(/(?=攝影)/);
  const hasGradientPart = titleParts.length > 1;

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
            <span className="text-sm font-medium text-primary">{badge}</span>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream mb-6">
            {hasGradientPart ? (
              <>
                {titleParts[0]}
                <span className="text-gradient">{titleParts[1]}</span>
              </>
            ) : (
              title
            )}
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryText && primaryLink && (
              <Link to={primaryLink}>
                <Button variant="hero" size="xl" className="group">
                  <Camera className="h-5 w-5 mr-2 transition-transform group-hover:scale-110" />
                  {primaryText}
                </Button>
              </Link>
            )}
            {secondaryText && secondaryLink && (
              <Link to={secondaryLink}>
                <Button variant="glass" size="xl" className="text-cream">
                  {secondaryText}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
