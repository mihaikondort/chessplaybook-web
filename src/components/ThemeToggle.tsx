import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/design/theme/ThemeProvider';
import { logGA4Event } from '@/services/analytics';

/**
 * THE SITE THEME CONTROL (layout redesign F3, 2026-10-12; owner's placement at F0:
 * a sun/moon button in the nav row beside Sign in, the same choice inside the
 * hamburger menu on a phone; new visitors stay dark).
 *
 * Two states only, light and dark. The runtime also knows `system`, but a button
 * that cycles through three states makes a visitor guess which one comes next,
 * and nobody chooses "follow my system" for a chess site's colours by accident.
 * A visitor who never presses it keeps the default.
 *
 * The icon shows what a press GIVES (a sun on a dark page), and the label says it
 * in words, because an icon alone is a guess.
 */
function useSiteTheme() {
  const { resolved, setPreference, choiceEnabled, themeFixed } = useTheme();
  const next: 'light' | 'dark' = resolved === 'dark' ? 'light' : 'dark';
  const choose = (theme: 'light' | 'dark', surface: 'nav' | 'menu') => {
    if (theme === resolved) return;
    setPreference(theme);
    logGA4Event({ name: 'site_theme_changed', params: { theme, surface } });
  };
  return { resolved, next, choose, choiceEnabled, themeFixed };
}

/** The nav row's button: a direct child of `[data-nav-desktop]`, so the row's own rules size it. */
export function NavThemeButton() {
  const { next, choose, choiceEnabled, themeFixed } = useSiteTheme();
  if (!choiceEnabled) return null;
  const label = next === 'light' ? 'Switch to light theme' : 'Switch to dark theme';
  /*
    On a page whose theme is fixed (the v2 homepage, always dark: owner, 2026-11-13) the control would do nothing,
    so it is hidden there. Hidden IN PLACE: invisible, out of the tab order and the accessibility tree, but still
    holding its box, because the nav row must be the same on every page (#55); removing it would respace the row.
  */
  if (themeFixed) {
    return (
      <Button variant="ghost" size="sm" className="invisible" tabIndex={-1} aria-hidden="true" {...{ inert: '' }}>
        {next === 'light' ? <Sun aria-hidden /> : <Moon aria-hidden />}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="sm" aria-label={label} title={label} onClick={() => choose(next, 'nav')}>
      {next === 'light' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}

/** The hamburger menu's row: both choices named, the current one pressed. */
export function MenuThemeChoice() {
  const { resolved, choose, choiceEnabled, themeFixed } = useSiteTheme();
  // Not offered where the page's theme is fixed (the v2 homepage); the menu is not the fixed nav row.
  if (!choiceEnabled || themeFixed) return null;
  const option = (theme: 'dark' | 'light', Icon: typeof Sun, text: string) => (
    <button
      type="button"
      aria-pressed={resolved === theme}
      onClick={() => choose(theme, 'menu')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        resolved === theme ? 'bg-primary/10 text-link' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {text}
    </button>
  );
  return (
    <div className="flex items-center gap-3 px-4 py-2" role="group" aria-label="Theme">
      <span className="text-sm text-muted-foreground">Theme</span>
      <div className="flex flex-1 gap-1">
        {option('dark', Moon, 'Dark')}
        {option('light', Sun, 'Light')}
      </div>
    </div>
  );
}
