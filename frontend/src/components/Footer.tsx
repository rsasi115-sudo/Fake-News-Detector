import Logo from "./Logo";
import { Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  const links = {
    Product: ["Features", "Pricing", "API", "Browser Extension"],
    Resources: ["Documentation", "Blog", "Research Papers", "Fact-Check Database"],
    Company: ["About Us", "Careers", "Press", "Contact"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 text-muted-foreground text-sm max-w-xs">
              Fighting misinformation with AI-powered fact-checking technology.
              Join millions who trust TruthLens for verified news.
            </p>
            <div className="flex gap-4 mt-6">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-secondary/10 transition-colors group"
                >
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-display font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 TruthLens. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ for truth seekers worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
