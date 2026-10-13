import { Trophy, Gamepad2, Brain, Users } from "lucide-react";

const stats = [
  {
    icon: Trophy,
    value: "18",
    label: "World Champions",
  },
  {
    icon: Gamepad2,
    value: "2,000+",
    label: "Classic Games",
  },
  {
    icon: Brain,
    value: "AI",
    label: "Engine Analysis",
  },
  {
    icon: Users,
    value: "Live",
    label: "Tournaments",
  },
];

export const StatsBar = () => {
  return (
    <section className="py-16 px-4 relative">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="container max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="w-6 h-6 text-link" />
                </div>
              </div>
              <div className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
