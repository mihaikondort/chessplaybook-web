import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ArrowRight } from 'lucide-react';
import SeoHead from '@/components/SeoHead';
import { newsArticles } from '@/config/newsArticles';

const articles = newsArticles;

const News = () => {
  return (
    <>
      <SeoHead routeKey="news">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "News & Articles",
          "description": "Latest chess news, tournament previews, game analysis, and training articles from Chess Playbook.",
          "url": "https://www.chessplaybook.com/news",
          "publisher": { "@type": "Organization", "name": "Chess Playbook", "url": "https://www.chessplaybook.com" }
        })}</script>
      </SeoHead>

      <div className="bg-background flex flex-col">

        <main className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <header className="mb-10">
              <h1 className="text-3xl sm:text-4xl font-playfair font-bold text-foreground mb-2">
                News & Articles
              </h1>
              <p className="text-muted-foreground">
                Tournament previews, game analysis, and chess insights.
              </p>
            </header>

            <div className="space-y-6">
              {articles.map((article) => (
                <Link key={article.href} to={article.href} className="group block">
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {article.image && (
                        <div className="w-full aspect-video sm:aspect-auto sm:w-48 flex-shrink-0 sm:self-stretch">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardContent className="p-6 flex-grow">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-link border border-primary/20">
                            {article.category}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {article.date}
                          </span>
                        </div>
                        <h2 className="text-lg font-playfair font-bold text-foreground mb-2 group-hover:text-link transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {article.excerpt}
                        </p>
                        <span className="text-sm text-link font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read article <ArrowRight className="w-4 h-4" />
                        </span>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {articles.length === 1 && (
              <p className="text-center text-muted-foreground mt-12 text-sm">
                More articles coming soon. Stay tuned for tournament coverage,
                game analysis, and training content.
              </p>
            )}
          </div>
        </main>

      </div>
    </>
  );
};

export default News;
