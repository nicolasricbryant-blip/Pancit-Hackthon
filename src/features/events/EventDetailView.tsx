import Link from "next/link";
import type { EventDetail } from "./queries";
import { kindLabel } from "./types";
import { fmtFullRange, relativeTime } from "./format";
import { RsvpControls } from "./RsvpControls";
import { HostCheckin } from "./HostCheckin";
import styles from "./events.module.css";

function attendeeName(handle: string | null, displayName: string | null): string {
  return handle ? `@${handle}` : displayName ?? "member";
}

export function EventDetailView({
  detail,
  canManage,
  isAuthed,
  justCheckedIn,
  checkinError,
}: {
  detail: EventDetail;
  canManage: boolean;
  isAuthed: boolean;
  justCheckedIn: boolean;
  checkinError: "err" | "notgoing" | null;
}) {
  const {
    event,
    hostHandle,
    school,
    goingCount,
    attendees,
    viewerStatus,
    viewerCheckedInAt,
  } = detail;

  const place = [event.venue, event.region].filter(Boolean).join(", ");
  const schoolLabel = school
    ? school.short_name ?? school.name
    : null;
  const capacity = event.capacity;
  const fillPct =
    capacity && capacity > 0
      ? Math.min(100, Math.round((goingCount / capacity) * 100))
      : null;
  const shownAttendees = attendees.slice(0, 8);
  const overflow = attendees.length - shownAttendees.length;

  return (
    <div className={styles.detailWrap}>
      <Link href="/events" className={styles.backLink}>
        ← All events
      </Link>

      <article className={styles.detailCard}>
        <div>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{kindLabel(event.kind)}</span>
            <span
              className={`${styles.tag} ${event.is_physical ? styles.tagPhysical : styles.tagOnline}`}
            >
              {event.is_physical ? "Physical" : "Online"}
            </span>
          </div>
          <h1 className={styles.detailTitle}>{event.title}</h1>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>When</span>
            <span className={styles.infoValue}>
              {fmtFullRange(event.starts_at, event.ends_at)}
            </span>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Host</span>
            <span className={styles.infoValue}>
              {event.host_org ?? "—"}
              {hostHandle ? ` · @${hostHandle}` : ""}
            </span>
          </div>

          {event.is_physical && (
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Where</span>
              <span className={styles.infoValue}>
                {place || "Venue TBD"}
                {schoolLabel ? ` · ${schoolLabel}` : ""}
              </span>
            </div>
          )}

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Capacity</span>
            <span className={styles.infoValue} data-num>
              {capacity ? `${goingCount} / ${capacity} going` : `${goingCount} going`}
            </span>
          </div>
        </div>

        {fillPct !== null && (
          <div className={styles.fill}>
            <div className={styles.fillTrack}>
              <div className={styles.fillBar} style={{ width: `${fillPct}%` }} />
            </div>
            <span className={styles.fillText}>{fillPct}% full</span>
          </div>
        )}

        {event.description && (
          <p className={styles.desc}>{event.description}</p>
        )}

        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}>Going ({goingCount})</span>
          {shownAttendees.length === 0 ? (
            <span className={styles.infoValue}>No RSVPs yet — be the first.</span>
          ) : (
            <div className={styles.attendees}>
              {shownAttendees.map((a) => (
                <span
                  key={a.profileId}
                  className={styles.attChip}
                  data-in={a.checkedInAt != null}
                >
                  {attendeeName(a.handle, a.displayName)}
                </span>
              ))}
              {overflow > 0 && (
                <span className={styles.attChip}>+{overflow} more</span>
              )}
            </div>
          )}
        </div>

        <div className={styles.infoBlock}>
          <span className={styles.infoLabel}>Your RSVP</span>
          <RsvpControls
            eventId={event.id}
            initialStatus={viewerStatus}
            isAuthed={isAuthed}
            goingCount={goingCount}
            capacity={capacity}
          />
        </div>

        {canManage && event.checkin_code && (
          <HostCheckin code={event.checkin_code} eventId={event.id} />
        )}

        {/* `checkinError` (a failed scan — see checkin/route.ts) can be true
            even when the viewer isn't currently RSVP'd "going" (that's exactly
            what the "notgoing" reason means), so it's rendered independently
            of the `viewerStatus === "going"` gate that controls the
            checked-in / pending indicator. */}
        {!canManage && (viewerStatus === "going" || checkinError) && (
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Check-in</span>
            {viewerStatus === "going" &&
              (viewerCheckedInAt || justCheckedIn ? (
                <span className={styles.checkedIn}>
                  Checked in ✓
                  {viewerCheckedInAt
                    ? ` · ${relativeTime(viewerCheckedInAt)}`
                    : ""}
                </span>
              ) : (
                <span className={styles.checkinPending}>
                  You check in on-site — scan the host&apos;s QR when you arrive.
                </span>
              ))}
            {checkinError && (
              <p className={styles.checkinError} role="alert">
                {checkinError === "notgoing"
                  ? 'You need to RSVP "Going" before checking in.'
                  : "That check-in code is invalid or expired."}
              </p>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
