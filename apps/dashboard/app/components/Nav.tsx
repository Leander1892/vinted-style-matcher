import Link from "next/link";

const links = [
  { href: "/", label: "Übersicht" },
  { href: "/review", label: "Review" },
  { href: "/deals", label: "Deals" },
  { href: "/manual-check", label: "Manueller Check" },
  { href: "/search-configs", label: "Suchkonfiguration" },
  { href: "/profile", label: "Profil" },
];

export function Nav() {
  return (
    <nav className="border-b border-border">
      <div className="mx-auto max-w-4xl flex items-center gap-6 px-6 py-4">
        <span className="font-medium">Style-Radar</span>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
