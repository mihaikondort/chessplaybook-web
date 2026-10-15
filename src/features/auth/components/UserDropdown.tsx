import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown, LayoutDashboard, Target, CalendarDays, MessageSquare } from 'lucide-react';
import { contactHref } from '@/components/support/ReportProblemLink';
import { logGA4Event } from '@/services/analytics';
import { useAuth } from '../AuthContext';

export function UserDropdown() {
  const { user, isLoading, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    // Navigate first, then sign out — prevents blank page from auth state clearing
    // while still on a page that may depend on auth context
    navigate('/', { replace: true });
    await signOutUser();
  };

  if (!user) {
    return (
      <Link
        to="/login"
        className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-md"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      {/*
        THE NAME IS THE ACCESSIBLE NAME NOW THAT IT IS NOT ON SCREEN (#55). The
        trigger is an avatar and a chevron, so without `aria-label` a screen
        reader announces an unlabelled button where the username used to be read
        out loud.
      */}
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.username}`}
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-link" />
        </div>
        {/*
          NO USERNAME IN THE BAR (#55, 2026-08-23). The account control shares a
          fixed slot with `Sign in` so that signing in moves no other item, and a
          name does not fit that slot: with one the control is ~122px against
          ~35px without, which at the 10.5px floor overflows the row by 15.6px at
          800x600. The username is shown in the menu below, above the email.
        */}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50 py-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              My Profile
            </Link>

            {/*
              The training record, reachable from the account (owner,
              2026-08-05).

              It had exactly one door: a link inside the puzzle trainer. That is
              where a solver finds it mid-session, and it is the wrong and only
              place for the other question — "how am I doing" — which people ask
              from wherever they are, usually not mid-puzzle.

              It stays UNGATED (C6): most of the traffic with a record has no
              account, and they still reach it from the trainer. This is a
              second door, not a gate.
            */}
            <Link
              to="/puzzles/progress"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Target className="h-4 w-4" />
              Training record
            </Link>

            {/*
              THE PLAN, from wherever they are (owner, 2026-08-06: "the plan
              page is not accessible other than the puzzles page, it should be
              from either profile or account menu I think… or training record?
              not sure, we need to find a place").

              Beside the record on purpose: they are the two halves of one
              question. The record says how you are doing, the plan says what to
              do about it, and a player who opens this menu is asking about
              themselves rather than about the position in front of them.

              UNGATED for the same reason the record is (C6): plan routes take an
              anonymous UUID, and most traffic has no account. This menu is a
              second door for people who have one — the record page carries the
              same link for everyone else, and the trainer's own card is the
              first door for both.
            */}
            <Link
              to="/puzzles/plan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              Training plan
            </Link>

            {/* #44: a way to us from the account, where access questions land. */}
            <Link
              to={contactHref('account_menu', undefined, null)}
              onClick={() => { logGA4Event({ name: 'support_entry_clicked', params: { surface: 'account_menu' } }); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Contact us
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
