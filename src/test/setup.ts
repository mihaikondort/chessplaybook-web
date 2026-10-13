import '@testing-library/jest-dom';

/*
  RESIZEOBSERVER, BECAUSE JSDOM HAS NONE AND THE PAGE NOW MEASURES ITSELF.

  The rebuilt layout measures rather than assumes — the nav bar sizes its menu
  against the row it has to fit in, the card boxes derive their type from their
  own height — and every one of those measurements runs through a
  `ResizeObserver` in a layout effect. jsdom does not implement it, so mounting
  any of them throws `ResizeObserver is not defined` and the test reports a
  crash rather than a verdict.

  That is what had happened to `PuzzleTrainer.smoke.test.tsx`: 3/3 failing with
  a ReferenceError from `Navigation.tsx`, which says nothing about the trainer
  it exists to mount. Same class as the guard that opened with a click on a
  deleted control and sat red for two days (2026-08-14) — a test that cannot
  run is worse than one that fails, because the failure describes the harness.

  A NO-OP, DELIBERATELY. It records the calls and never fires the callback, so a
  test can assert that a component subscribes without any measurement being
  invented for it — jsdom reports every box as 0x0, so a callback firing here
  would hand real code a size that cannot exist and let a layout assertion pass
  against a fiction. Anything that needs real geometry is a Playwright job, which
  is where every layout rule on this page is actually verified.
*/
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
}
