"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./events.module.css";

/**
 * Host / admin view: the event's check-in code as a scannable QR plus the
 * raw code. Attendees scan on arrival (or hit the check-in URL with the code).
 */
export function HostCheckin({
  code,
  eventId,
}: {
  code: string;
  eventId: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const target = `${origin}/events/${eventId}/checkin?code=${encodeURIComponent(code)}`;
    QRCode.toDataURL(target, { width: 360, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [code, eventId]);

  return (
    <div className={styles.checkin}>
      <p className={styles.sectionLabel}>Check-in</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.qrImg} src={dataUrl} alt={`QR code for check-in code ${code}`} />
      ) : (
        <div className={`${styles.qrImg} ${styles.shimmer}`} aria-hidden />
      )}
      <span className={styles.qrCode} data-num>
        {code}
      </span>
      <p className={styles.checkinNote}>
        Attendees scan this on arrival to mark themselves checked in. You can also
        read the code aloud — anyone who RSVP&apos;d “Going” can enter it.
      </p>
    </div>
  );
}
