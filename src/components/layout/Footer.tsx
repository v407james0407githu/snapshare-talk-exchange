import { Link } from "react-router-dom";
import { Camera, Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const aboutLinks = [
  { label: "關於我們", key: "footer_about_url", fallback: "/about" },
  { label: "聯絡我們", key: "footer_contact_url", fallback: "/contact" },
  { label: "使用條款", key: "footer_terms_url", fallback: "/terms" },
  { label: "隱私政策", key: "footer_privacy_url", fallback: "/privacy" },
];

const staticFooterGroups = {
  社群: [
    { label: "討論區", href: "/forums" },
    { label: "作品分享", href: "/gallery" },
    { label: "二手交易", href: "/marketplace" },
    { label: "哈拉打屁", href: "/lounge" },
  ],
  攝影: [
    { label: "手機攝影", href: "/equipment/mobile" },
    { label: "相機討論", href: "/equipment/camera" },
    { label: "鏡頭評測", href: "/equipment/lens" },
    { label: "配件週邊", href: "/equipment/accessories" },
  ],
};

export function Footer() {
  const { siteLogo, siteName, get } = useSystemSettings();

  const socialLinks = [
    { icon: Facebook, key: "social_facebook", label: "Facebook" },
    { icon: Instagram, key: "social_instagram", label: "Instagram" },
    { icon: Twitter, key: "social_twitter", label: "Twitter" },
    { icon: Youtube, key: "social_youtube", label: "YouTube" },
  ];

  const visibleSocials = socialLinks.filter((s) => get(s.key));

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              {siteLogo ? (
                <img src={siteLogo} alt="Logo" className="h-7 max-w-[140px] object-contain" />
              ) : (
                <>
                  <Camera className="h-7 w-7 text-primary" />
                  <span className="font-serif text-lg font-bold">
                    {siteName}
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {get("site_description", "攝影愛好者的交流平台，分享作品、交流心得、結交同好。")}
            </p>
            {visibleSocials.length > 0 && (
              <div className="flex items-center gap-3">
                {visibleSocials.map((social) => (
                  <a
                    key={social.key}
                    href={get(social.key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4 text-foreground">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with ❤️ for photographers
          </p>
        </div>
      </div>
    </footer>
  );
}
