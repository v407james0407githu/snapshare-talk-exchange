import { Link } from "react-router-dom";
import { Camera, Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  關於: [
    { label: "關於我們", href: "/about" },
    { label: "聯絡我們", href: "/contact" },
    { label: "使用條款", href: "/terms" },
    { label: "隱私政策", href: "/privacy" },
  ],
  社群: [
    { label: "討論區", href: "/forums" },
    { label: "作品分享", href: "/gallery" },
    { label: "二手交易", href: "/marketplace" },
    { label: "哈拉打屁", href: "/lounge" },
  ],
  器材: [
    { label: "手機攝影", href: "/equipment/mobile" },
    { label: "相機討論", href: "/equipment/camera" },
    { label: "鏡頭評測", href: "/equipment/lens" },
    { label: "配件週邊", href: "/equipment/accessories" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "Youtube" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Camera className="h-7 w-7 text-primary" />
              <span className="font-serif text-lg font-bold">
                光影<span className="text-gradient">論壇</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              攝影愛好者的交流平台，分享作品、討論器材、結交同好。
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
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
            © 2024 光影論壇. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with ❤️ for photographers
          </p>
        </div>
      </div>
    </footer>
  );
}
