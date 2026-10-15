import ReactGA from 'react-ga4';

import env from '@/config/env';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/*
  ONE SOURCE FOR THIS VALUE (2026-08-09).

  This read the env var directly while `config/env.ts` read it again with its own
  default — two sources of truth for one id, and they disagreed the moment a
  default was added. It now comes from the shared config, which carries the
  fallback and the reasoning for it.
*/
const MEASUREMENT_ID = env.gaId;

export const initializeAnalytics = () => {
  if (MEASUREMENT_ID) {
    // send_page_view is left at its default (true) deliberately.
    //
    // It used to be false, paired with a manual logPageView() — and when that
    // manual call was removed to stop duplicate page_views, the `false` stayed.
    // The result, verified on production 2026-08-02 by capturing beacons: a
    // visitor who lands on /explain and does not navigate produces **zero**
    // hits. Enhanced Measurement's "page changes based on browser history
    // events" fires on SPA navigation only; it cannot see the initial load.
    //
    // So bounced paid traffic was invisible to GA4 entirely — no page_view, no
    // session — which removes exactly the non-converters from the denominator
    // and overstates conversion *rate*. Conversion counts were unaffected.
    //
    // Do NOT re-add a manual page_view call alongside this. One source only:
    // this config sends the entry page_view, Enhanced Measurement sends the
    // SPA ones.
    ReactGA.initialize(MEASUREMENT_ID);
    // Google Ads is deliberately NOT configured here: every gtag('config') sends
    // its own collect request regardless of send_page_view.
    //
    // Which means this site sends Google Ads NO client-side conversion events at
    // all. Ads conversions are imported from GA4 events, which is why
    // logGA4Event below pins send_to to the GA4 measurement ID.
    //
    // Do NOT "restore" a gtag('event','conversion', { send_to: 'AW-...' }) call.
    // This was decided deliberately on 2026-08-01: importing from GA4 is the
    // intended setup. Adding a client-side Ads conversion would count the same
    // user action twice. It also would not work as written: with no
    // gtag('config','AW-...'), the Ads destination is never loaded, so send_to
    // has nothing to route to.
    //
    // (An earlier version of this comment claimed VerifyEmailPage and
    // AuthCallbackPage fired such events. They do not, and did not — the only
    // occurrence in the tree was this comment. Corrected 2026-08-01.)
  }
};

// logPageView() used to live here and had no callers left. Removed 2026-08-02
// rather than kept as dead code: while it existed, the obvious "fix" for a
// missing page_view was to call it again, which is how the duplicate-page_view
// bug it originally caused would come back. page_view now has exactly one
// source — see initializeAnalytics above.

export const logEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (MEASUREMENT_ID) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
};

// ─── GA4-style events (M1 Phase 1.2) ─────────────────────────────────────
// The 8 events specified in M1_SPRINT.md Step 4A. Sent via gtag('event', name,
// params) — flat params, GA4-idiomatic. Restricted to GA4 only via send_to so
// they don't double-fire to Google Ads (AW-) like page_view used to.

type GA4Event =
  // ── /explain: click-time events (D3 legacy — DO NOT REMOVE YET) ─────────
  // These fire when the user *asks* for an explanation, before the network
  // round-trip, so they count intent rather than delivery. Both are imported
  // Google Ads conversion actions; renaming or removing a GA4 event an Ads
  // action depends on silently zeroes that action, so they keep firing
  // alongside the delivery events below for a parallel period. See
  // docs/Features Development/EXPLAIN_LANDING_PAGE_ANALYSIS.md §0/§D3 for the
  // cutover, which is an Ads-account change, not a code change.
  | { name: 'explain_position_demo'; params: { demo_id: string; demo_slug?: string } }
  | { name: 'explain_position_custom'; params: { source: 'fen' | 'lichess_url' } }
  // ── /explain: delivery events (D3) ─────────────────────────────────────
  // Fired when an explanation actually rendered. This is the value moment and
  // the intended replacement conversion.
  //
  // `position_index` counts DISTINCT positions delivered in this page session,
  // so re-explaining the same FEN does not inflate it and `position_index >= 2`
  // is the "explained a second position" signal without a second event.
  //
  // `cached` separates the instant baked-demo path from a real engine round
  // trip; they are wildly different experiences and averaging them hides which
  // one converts.
  | {
      name: 'explain_delivered';
      params: { source: 'demo' | 'custom'; demo_id?: string; cached: boolean; position_index: number };
    }
  // The denominator the click-time events never had. A visitor whose engine
  // never became ready currently registers as a conversion; this makes the
  // failure visible instead.
  | { name: 'explain_failed'; params: { source: 'demo' | 'custom'; reason: string } }
  // ── Homepage chooser ────────────────────────────────────────────────────
  // The homepage is a six-card chooser and nothing else, where visitors
  // self-select. This event IS the deliverable of that redesign: `to` answers
  // "what did visitors choose".
  //
  // `position` is the 0-based grid index. Slot 1 wins partly by being slot 1,
  // and this is what lets that be separated from genuine preference.
  //
  // No `slot` param: the grid is the only clickable surface on the page besides
  // nav and footer, so it would be a constant. Do not add one back unless the
  // homepage grows a second clickable section.
  | { name: 'home_choice_click'; params: { to: string; position: number } }
  // `explain_onward_click` and `feature_strip_click` were removed on 2026-08-02
  // together with `FeatureStrip`, their only emitter. They measured whether that
  // strip routed mismatched intent or cannibalised each page's own CTA — a
  // question the site now answers on the homepage instead, via
  // `home_choice_click`, because the homepage is the only chooser.
  //
  // Their historical series remain queryable in GA4; deleting the union members
  // stops new hits, it does not delete data. Do not re-add them without
  // re-adding a strip — a union member with no emitter reads as "we measure
  // this" to the next person who opens this file.
  // Matchmaking-pool health. `/play-online` is a paid ad destination while its
  // player pool is still being bootstrapped, so an unmatched seek is the
  // expected early case (audit 2026-07-31, G1). This event is the instrument
  // that answers whether the pool is filling: `online_seek_unmatched` per
  // `champion_game_opened`-style session is the emptiness rate, and its decline
  // over time is the bootstrap working.
  // The visitor pressed the page's primary CTA. This is the denominator every
  // other online-play event was missing: before 2026-08-02 nothing recorded the
  // click, so "nobody presses Play" and "everybody presses Play and finds an
  // empty pool" produced identical telemetry — both just a ~30s visit and no
  // game. `online_seek_unmatched` only fires for those who then wait 20s, so it
  // cannot separate the two on its own.
  | { name: 'online_seek_started'; params: { time_control: string; rated: boolean; connection_state: string } }
  | { name: 'online_seek_unmatched'; params: { seconds: number; time_control: string; rated: boolean } }
  // The escape hatch actually being used — how many paid visitors would
  // otherwise have left with nothing.
  | { name: 'online_seek_fallback_taken'; params: { time_control: string; from_phase: string } }
  | { name: 'champion_game_opened'; params: { champion: string; game_index: number; from_best_games: boolean } }
  | { name: 'move_played_5plus'; params: { champion: string; game_index: number } }
  | { name: 'champion_challenge_started'; params: { champion: string; challenge_id?: string } }
  // Joined to `champion_challenge_started` on challenge_id — the Champion
  // Challenge success gate is defined on the started→completed rate.
  | { name: 'champion_challenge_completed'; params: { champion: string; challenge_id: string; positions: number; score: number } }
  // The explanation moved behind a click into a dialog (layout redesign D4a);
  // this is how often it is still read, per verdict quality.
  | { name: 'champion_challenge_explanation_opened'; params: { champion: string; quality: string } }
  | { name: 'analysis_enabled'; params: { source: 'gameviewer' | 'puzzle' | 'other' } }
  | { name: 'puzzle_completed'; params: { puzzle_id: string; first_try: boolean } }
  // ── /puzzles funnel (PUZZLES_PAGE_IMPLEMENTATION_PLAN A2 / PZ-023) ───────
  // `puzzle_completed` above fires ONLY on a solve, so before these three a
  // failed attempt emitted nothing at all and "did not load", "did not
  // understand" and "found it too hard" were indistinguishable. It keeps
  // firing unchanged — its historical series is worth more than the tidiness
  // of one event name.
  //
  // `puzzle_index` is per session: 1 for the first puzzle presented, 2 for the
  // next. It is what makes "continued to a second puzzle" answerable without
  // conflating it with "solved two puzzles", which a count of completions
  // would have measured instead.
  //
  // `ms_to_ready` is measured from the API response ONLY when
  // `ready_source === 'network'`. Manual mode fetches a batch of ten, so a
  // queued puzzle has no fresh response to measure from; for every other
  // source the clock starts at the load call. The field exists so that
  // exclusion is enforceable at read time rather than remembered.
  | { name: 'puzzle_board_ready'; params: { puzzle_id: string; is_daily: boolean; puzzle_index: number; ms_to_ready: number; ready_source: 'network' | 'queued' | 'daily' | 'restored' } }
  | { name: 'puzzle_first_move'; params: { puzzle_id: string; puzzle_index: number; ms_from_ready: number; correct: boolean } }
  // Fires where the rating decision is actually taken — the same instant the
  // outcome becomes irreversible — so it cannot drift from what the UI claims.
  /* `frozen_reason` is declared because both trainers send it and the type did
     not say so — the old page's literal slipped through only because it matched
     every required field, so the excess-property check never fired. A field the
     product genuinely reports belongs in the contract rather than surviving on a
     technicality. */
  | { name: 'puzzle_result_recorded'; params: { puzzle_id: string; puzzle_index: number; solved: boolean; frozen: boolean; frozen_reason?: string } }
  // ── Auth session loss (2026-08-12) ──────────────────────────────────────
  // THIS EVENT EXISTS BECAUSE THE BUG COULD NOT BE REPRODUCED. Signed-in
  // players intermittently had their solves filed under their guest identity —
  // measured on production, four accounts with a claimed guest id and zero
  // signed-in attempts — and every affected account is Google, but so is every
  // account whose attempts ARE attributed correctly. The provider does not
  // discriminate, so a one-shot reproduction can easily come up clean. This
  // catches the real occurrence instead.
  //
  // `reason` is the question: `definitive` means Cognito rejected the grant and
  // the sign-out is correct; `transient` means we chose to keep the session and
  // want to know how often that judgement is exercised.
  //
  // `source` separates the two call sites, which is what tells us WHICH trigger
  // fires — `token_refresh` implicates the hand-rolled token store written by
  // storeTokensForAmplify, `load_user` implicates a throw at page bootstrap.
  //
  // NO IDENTIFIERS. Not the sub, not the anonymous id, not the email. This
  // fires on an auth failure, which is exactly the moment not to put an account
  // identifier into a third-party analytics beacon.
  | {
      name: 'auth_session_lost';
      params: {
        reason: 'definitive' | 'transient';
        source: 'token_refresh' | 'load_user';
        tokens_cleared: boolean;
        error_name: string;
      };
    }
  // Fired when a request that BELIEVES it is signed in cannot produce a token.
  // The old behaviour sent `X-Anonymous-Id` anyway and the server dutifully
  // filed the result under the guest — silently, and permanently. This counts
  // how often that near-miss happens now that it is refused.
  | { name: 'auth_token_unavailable'; params: { recovered: boolean } }
  // ── The guest -> account offer (2026-08-13) ─────────────────────────────
  // THE OFFER HAD NO INSTRUMENTATION AT ALL, which made the only question that
  // matters unanswerable: many more guests clear the leaderboard's own
  // thresholds than accounts are on the board, and "they never see the offer"
  // and "they see it and decline" have opposite fixes. This project has already
  // paid for that ambiguity once -- `online_seek_started` exists because
  // "nobody presses Play" and "everybody presses Play into an empty pool"
  // produced identical telemetry.
  //
  // `surface` is the field that earns the set: the offer used to render in one
  // place only (the trainer), and the leaderboard -- where a guest is looking
  // at the very ranking they are absent from -- said nothing. Splitting by
  // surface is what will show whether intent beats exposure.
  //
  // `rank` is the guest's would-be place, which is the offer's whole content.
  // It is a position on a public board, not an identifier.
  | { name: 'puzzle_standing_shown'; params: { rank: number; total: number; surface: 'trainer' | 'leaderboard' } }
  | { name: 'puzzle_standing_opened'; params: { rank: number; surface: 'trainer' | 'leaderboard' } }
  | {
      name: 'puzzle_standing_cta';
      params: { action: 'signup' | 'login'; rank: number; surface: 'trainer' | 'leaderboard' };
    }
  // The softer line, for guests who do not clear the board's gate yet. Kept a
  // SEPARATE event rather than a flag on `puzzle_standing_shown`, because the
  // two describe different populations -- roughly 200 who qualify against 2158
  // who do not -- and merging them would bury the smaller, more valuable one in
  // a ratio dominated by the larger.
  | { name: 'puzzle_standing_prompt'; params: { surface: 'trainer' | 'leaderboard' } }
  /*
    The run boards' own sign-in prompt (2026-08-16).
    
    ITS OWN NAME, not another `surface` on `puzzle_standing_prompt`. That event
    measures an offer built on a RANK the server computed for this visitor; this
    one is shown to every signed-out reader of a run board and names no rank at
    all. Folding them together would inflate a number two other surfaces already
    report, which is the mistake `puzzle_full_analysis_opened` was created to
    avoid.
  */
  | { name: 'run_board_signin_prompt'; params: { length: number } }
  // Giving up and looking, counted properly for the first time (2026-08-13).
  //
  // The attempt log CANNOT answer this. `reportPuzzleResult` returns early once
  // a puzzle has been reported and the first wrong move reports it, so a reveal
  // that follows a failure -- the commonest kind -- never reaches the server
  // with `frozen_reason = 'solution'`. Any reveal rate read from the database
  // is therefore a floor, not a count, and the 8x fall measured after the
  // 2026-08-10 release is partly a measurement artefact of unknown size.
  //
  // `after_failure` is the field that matters: giving up mid-fight and never
  // engaging at all are different behaviours that the old number merged.
  | { name: 'puzzle_solution_revealed'; params: { after_failure: boolean; puzzle_rating: number } }
  // ── Board workspace controls (2026-08-13) ───────────────────────────────
  // THESE HAD NO EVENTS AT ALL, which is why focus mode "never triggered": it
  // was never instrumented, so no usage level could have produced a row. The
  // owner went looking for the number and found nothing, and nothing was the
  // literal truth. Reported as a tracking problem; it was a missing feature of
  // the tracking.
  //
  // `enabled` rather than a toggle count, because entering and leaving are
  // different acts: leaving immediately means the mode was not what they
  // wanted, and a single counter cannot tell that from a long session.
  //
  // Focus mode is DESKTOP ONLY by construction (`onToggleFocusMode` is
  // undefined below the lg breakpoint), so a zero here is a statement about
  // desktop visitors and must not be read as "nobody uses it" site-wide.
  | { name: 'focus_mode_toggled'; params: { enabled: boolean; surface: 'puzzles' | 'play_online' | 'play_computer' | 'analysis' | 'champion_challenge' | 'champion_game' | 'live_game' } }
  // The theme picker moved onto /puzzles on 2026-08-10 and has never reported
  // anything either. Worth knowing which themes are actually chosen before any
  // more are drawn, and whether the default is ever changed at all.
  | { name: 'site_theme_changed'; params: { theme: 'light' | 'dark'; surface: 'nav' | 'menu' } }
  | { name: 'board_theme_changed'; params: { theme_id: string; surface: 'puzzles' | 'play_online' | 'play_computer' | 'analysis' | 'champion_challenge' | 'champion_game' | 'live_game' } }
  | { name: 'online_full_analysis_opened'; params: { source: 'compact' } }
  | { name: 'computer_full_analysis_opened'; params: { source: 'compact' } }
  | { name: 'champion_full_analysis_opened'; params: { source: 'compact' } }
  | { name: 'live_full_analysis_opened'; params: { source: 'compact' } }
  | { name: 'review_full_analysis_opened'; params: { source: 'compact' } }
  // PZ-043. Its OWN name, deliberately: `analysis_enabled` means the visitor
  // turned the analysis product on, and reusing it here would inflate a number
  // that `/analysis` and the Champions viewers already report. `source` exists
  // because a second entry point to the same board is planned.
  | { name: 'puzzle_full_analysis_opened'; params: { source: 'compact' | 'resolved_action' } }
  // ── /puzzles: bounded runs (TRAINING_SYSTEM E8a) ────────────────────────
  // Phase D built sessions and emitted NOTHING, so "do runs get finished" —
  // the plan's headline count (§9) — had no data behind it at all. These are
  // the three events that answer it.
  //
  // `started` fires only for a run this page actually created. Adopting an
  // active run after a 409, or finding one on mount after a reload, is not a
  // start, and counting it as one would inflate the denominator with reloads.
  //
  // `completed` is NOT fired where the client decides a run looks done. It
  // fires when the SERVER's status flips to `completed`, which happens by
  // counting attempt rows — the same reason `endSession` now refuses the word
  // from a caller (E0/F10). Otherwise this measures the page's opinion of
  // itself.
  //
  // `area` is 'all' rather than absent for a whole-corpus run, so the
  // dimension is never empty in GA4 — an unset parameter and a run with no
  // scope are different things and read identically in a report.
  | { name: 'puzzle_session_started'; params: { selection: string; area: string; total: number; rated: boolean } }
  | { name: 'puzzle_session_completed'; params: { selection: string; area: string; total: number; solved: number; rated: boolean; ms_duration: number } }
  | { name: 'puzzle_session_abandoned'; params: { selection: string; area: string; total: number; completed: number; solved: number; rated: boolean } }
  // ── /puzzles: plans and baselines (TRAINING_SYSTEM E8b) ─────────────────
  // §9's counts: does anyone take the baseline, does anyone accept the one
  // offer, and does a plan that gets built get followed. `plan_shown` fires on
  // the PREVIEW — the plan a player read and did not take is the interesting
  // half of that ratio, and without it "plans created" has no denominator.
  | { name: 'plan_offer_shown'; params: { form: string; area: string } }
  | { name: 'plan_offer_answered'; params: { form: string; area: string; accepted: boolean } }
  /*
    `surface` SAYS WHERE IT HAPPENED, and it exists because the plan moved onto
    a page of its own on 2026-08-06 (A7).

    Setup, the preview and the schedule left the trainer's card for
    `/puzzles/plan`. Without this parameter the split would read as a conversion
    collapse when the behaviour merely moved — the same trap as the 08-02
    `send_page_view` fix, where denominators changed under a metric nobody
    re-based. With it, "did moving it off the card cost us plans" is one
    breakdown rather than an argument.
  */
  | { name: 'plan_shown'; params: { sessions: number; positions: number; weeks: number; mixed: boolean; emphasis: string; surface: PlanSurface } }
  | { name: 'plan_created'; params: { sessions: number; positions: number; weeks: number; mixed: boolean; emphasis: string; surface: PlanSurface } }
  | { name: 'plan_session_started'; params: { area: string; total: number; kind: string; surface: PlanSurface } }
  | { name: 'plan_calendar_exported'; params: { format: 'ics'; plan_items: number; has_times: boolean } }
  /*
    The DENOMINATOR for the move. `plan_setup_opened` counts intent to build one
    and `from` says what prompted it — the standing card, the one offer, or a
    link. `plan_details_opened` counts how often the page is wanted at all,
    which is the question "was a whole page the right call" in its most direct
    form.
  */
  | { name: 'plan_setup_opened'; params: { from: 'card' | 'offer' | 'page' } }
  | { name: 'plan_details_opened'; params: { from: 'card' } }
  /*
    The training record's success test (#107): of the players who open it, how
    many act on its next step. `viewed` is the denominator and carries the step
    that was shown, so a low click rate can be read per kind of advice rather
    than as one number. `primary` separates the recommendation from the smaller
    links under it. Whether a session follows is read from the puzzle events
    that come after the click in the same GA4 session.
  */
  | { name: 'training_record_viewed'; params: { next_step: TrainingRecordStep; other_steps: number; signed_in: boolean } }
  | { name: 'training_record_next_step'; params: { step: TrainingRecordStep; primary: boolean } }
  /* #109: a pattern row's Replay link. Its run's own events say whether it was played. */
  | { name: 'training_record_pattern_replay'; params: { motif: string; missed: number } }
  | { name: 'signed_in'; params: { provider: 'google' | 'cognito' } };

/** The kinds of advice the training record gives. Mirrors `NextStep['kind']`. */
export type TrainingRecordStep = 'replay' | 'plan' | 'untried' | 'stale' | 'weakness' | 'none';

/** Where a plan event happened. See the `surface` note on the plan events. */
export type PlanSurface = 'card' | 'plan_page';

export function logGA4Event<E extends GA4Event>(event: E): void {
  if (!MEASUREMENT_ID) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', event.name, {
    ...event.params,
    send_to: MEASUREMENT_ID,
  });
}
