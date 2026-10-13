/**
 * Board Theme Selector Component
 *
 * Allows users to choose from different chess board color themes.
 * Displays color previews and applies selection immediately.
 */

import { boardThemes } from '@/config/boardThemes';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const BoardThemeSelector = () => {
  const { currentTheme, changeTheme } = useBoardTheme();

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Board Theme</CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose your preferred chess board colors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {boardThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => changeTheme(theme.id)}
              className={`
                group relative p-3 rounded-lg border-2 transition-all
                ${
                  currentTheme.id === theme.id
                    ? 'border-primary bg-card'
                    : 'border-border hover:border-border-strong bg-background'
                }
              `}
            >
              {/* Color Preview */}
              <div className="mb-2 aspect-square rounded overflow-hidden shadow-md">
                <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
                  {[...Array(16)].map((_, i) => {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const isLight = (row + col) % 2 === 0;
                    return (
                      <div
                        key={i}
                        style={{
                          backgroundColor: isLight
                            ? theme.colors.lightSquare
                            : theme.colors.darkSquare,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Theme Name */}
              <div className="text-left">
                <div className="text-sm font-semibold text-foreground mb-1">
                  {theme.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {theme.description}
                </div>
              </div>

              {/* Selected Indicator */}
              {currentTheme.id === theme.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
