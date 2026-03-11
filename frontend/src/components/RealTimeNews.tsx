import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Newspaper, Building2, Trophy, Film, TrendingUp, Heart, 
  ExternalLink 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Category = "all" | "politics" | "sports" | "entertainment" | "economy" | "health";

const categories = [
  { id: "all" as Category, label: "All News", icon: Newspaper },
  { id: "politics" as Category, label: "Politics", icon: Building2 },
  { id: "sports" as Category, label: "Sports", icon: Trophy },
  { id: "entertainment" as Category, label: "Entertainment", icon: Film },
  { id: "economy" as Category, label: "Economy", icon: TrendingUp },
  { id: "health" as Category, label: "Health", icon: Heart },
];

const newsItems = [
  {
    id: 1,
    title: "Government Announces New Digital Infrastructure Plan",
    category: "politics",
    source: "National Tribune",
    time: "2 hours ago",
    verified: null,
  },
  {
    id: 2,
    title: "Local Team Advances to Championship Finals",
    category: "sports",
    source: "Sports Daily",
    time: "3 hours ago",
    verified: true,
  },
  {
    id: 3,
    title: "Upcoming Film Festival Announces Star-Studded Lineup",
    category: "entertainment",
    source: "Entertainment Weekly",
    time: "4 hours ago",
    verified: null,
  },
  {
    id: 4,
    title: "Central Bank Reports Steady Economic Growth",
    category: "economy",
    source: "Financial Times",
    time: "5 hours ago",
    verified: true,
  },
  {
    id: 5,
    title: "New Research Shows Benefits of Mediterranean Diet",
    category: "health",
    source: "Health Journal",
    time: "6 hours ago",
    verified: null,
  },
  {
    id: 6,
    title: "Election Commission Prepares for Upcoming Polls",
    category: "politics",
    source: "Political Watch",
    time: "7 hours ago",
    verified: null,
  },
];

const RealTimeNews = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filteredNews = activeCategory === "all" 
    ? newsItems 
    : newsItems.filter(item => item.category === activeCategory);

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : Newspaper;
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-accent">Live Updates</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Real-Time News Feed
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Stay informed with the latest headlines and verify their credibility instantly
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "hero" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="gap-2"
            >
              <category.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item, index) => {
            const CategoryIcon = getCategoryIcon(item.category);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="h-full border-border/50 shadow-soft hover:shadow-glow transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CategoryIcon className="w-3 h-3" />
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-secondary transition-colors">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{item.source}</span>
                      <span>{item.time}</span>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Read More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RealTimeNews;
