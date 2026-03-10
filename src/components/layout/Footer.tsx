import { Link } from "react-router-dom";
import { Camera, Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const aboutLinks = [
  { label: "關於我們", key: "footer_about_url", fallback: "/about" },
  { label: "聯絡我們", key: "footer_contact_url", fallback: "/contact" },
  { label: "使用條款", key: "footer_terms_url", fallback: "/terms" },
  { label: "隱私政策", key: "footer_privacy_url", fallback: "/privacy" },
];

const footerSections = [
  {
    enabledKey: "footer_community_enabled",
    titleKey: "footer_community_title",
    defaultTitle: "社群",
    links: [
      { labelKey: "footer_community_label_1", urlKey: "footer_community_url_1", defaultLabel: "討論區", defaultUrl: "/forums" },
      { labelKey: "footer_community_label_2", urlKey: "footer_community_url_2", defaultLabel: "作品分享", defaultUrl: "/gallery" },
      { labelKey: "footer_community_label_3", urlKey: "footer_community_url_3", defaultLabel: "二手交易", defaultUrl: "/marketplace" },
      { labelKey: "footer_community_label_4", urlKey: "footer_community_url_4", defaultLabel: "哈拉打屁", defaultUrl: "/lounge" },
    ],
  },
  {
    enabledKey: "footer_photo_enabled",
    titleKey: "footer_photo_title",
    defaultTitle: "攝影",
    links: [
      { labelKey: "footer_photo_label_1", urlKey: "footer_photo_url_1", defaultLabel: "手機攝影", defaultUrl: "/equipment/mobile" },
      { labelKey: "footer_photo_label_2", urlKey: "footer_photo_url_2", defaultLabel: "相機討論", defaultUrl: "/equipment/camera" },
      { labelKey: "footer_photo_label_3", urlKey: "footer_photo_url_3", defaultLabel: "鏡頭評測", defaultUrl: "/equipment/lens" },
      { labelKey: "footer_photo_label_4", urlKey: "footer_photo_url_4", defaultLabel: "配件週邊", defaultUrl: "/equipment/accessories" },
    ],
  },
];

export function Footer() {
  const { siteLogo, siteName, get, getBool } = useSystemSettings();

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

          {/* About Links - dynamic */}
          {(() => {
            const visibleAbout = aboutLinks.filter((l) => get(l.key, l.fallback));
            return visibleAbout.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-4 text-foreground">關於</h4>
                <ul className="space-y-2.5">
                  {visibleAbout.map((link) => (
                    <li key={link.key}>
                      <Link
                        to={get(link.key, link.fallback)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })()}

          {/* Dynamic Nav Links */}
          {footerSections.map((section) => {
            const visibleLinks = section.links.filter((l) => get(l.urlKey, l.defaultUrl));
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.titleKey}>
                <h4 className="font-semibold mb-4 text-foreground">
                  {get(section.titleKey, section.defaultTitle)}
                </h4>
                <ul className="space-y-2.5">
                  {visibleLinks.map((link) => (
                    <li key={link.urlKey}>
                      <Link
                        to={get(link.urlKey, link.defaultUrl)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {get(link.labelKey, link.defaultLabel)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
