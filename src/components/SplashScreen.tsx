/**
 * First-load brand intro. Server-rendered so it's part of the very first
 * paint — no flash of real content before it appears. Hidden instantly on a
 * repeat view in the same tab via `:root[data-splash="skip"]`, set by the
 * inline script in <head> (same pattern as the theme anti-flash script).
 * `SplashController` drives the exit fade + records the session flag.
 */
export function SplashScreen() {
  return (
    <div id="app-splash" className="splash" aria-hidden>
      <div className="splash-marks">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark-light-theme.png" alt="" className="splash-ghost" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark-light-theme.png" alt="" className="splash-icon" />
      </div>
      <p className="splash-word">TAMBAYAN</p>
      <p className="splash-tag">PLAY. PRACTICE. PROGRESS. WIN. TOGETHER</p>
      <div className="splash-chevron">
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
        <p className="splash-footer">PANCIT HACKATHON</p>
      </div>
    </div>
  );
}
