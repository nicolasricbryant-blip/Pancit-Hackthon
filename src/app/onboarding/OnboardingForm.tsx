"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rolesFromChoice, type RoleChoice } from "@/features/auth/types";
import styles from "./onboarding.module.css";

interface SchoolLite {
  id: string;
  name: string;
  short_name: string | null;
  region: string | null;
  email_domains: string[];
}

interface Props {
  email: string;
  initialHandle: string;
  initialDisplayName: string;
  initialRole: RoleChoice;
  schools: SchoolLite[];
  matchedSchoolId: string | null;
}

const ROLE_OPTIONS: { value: RoleChoice; name: string; desc: string }[] = [
  { value: "player", name: "Player", desc: "Ranks, teams, browse and request scrims." },
  { value: "handler", name: "Team Handler", desc: "Run a roster, post listings, report results." },
  { value: "both", name: "Both — player-captain", desc: "Play and run your own team." },
];

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

type HandleState = "idle" | "checking" | "ok" | "taken" | "invalid";

export function OnboardingForm({
  email,
  initialHandle,
  initialDisplayName,
  initialRole,
  schools,
  matchedSchoolId,
}: Props) {
  const router = useRouter();

  const [handle, setHandle] = useState(sanitizeHandle(initialHandle));
  const [check, setCheck] = useState<{ value: string; taken: boolean } | null>(
    null,
  );
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [role, setRole] = useState<RoleChoice>(initialRole);

  const matchedSchool = useMemo(
    () => schools.find((s) => s.id === matchedSchoolId) ?? null,
    [schools, matchedSchoolId],
  );

  const [schoolId, setSchoolId] = useState<string | null>(matchedSchoolId);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [noSchool, setNoSchool] = useState(false);
  const [schoolOther, setSchoolOther] = useState("");
  const [region, setRegion] = useState(matchedSchool?.region ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === schoolId) ?? null,
    [schools, schoolId],
  );

  const emailDomain = useMemo(() => domainOf(email), [email]);
  const schoolVerified = useMemo(
    () =>
      !!selectedSchool &&
      !!emailDomain &&
      selectedSchool.email_domains
        .map((d) => d.toLowerCase())
        .includes(emailDomain),
    [selectedSchool, emailDomain],
  );

  const ownHandle = sanitizeHandle(initialHandle);
  const formatValid = HANDLE_RE.test(handle);
  const isOwnHandle = handle === ownHandle && ownHandle.length > 0;

  // Live handle availability check (debounced). setState only fires inside the
  // async callback — never synchronously in the effect body.
  useEffect(() => {
    if (!formatValid || isOwnHandle) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      if (cancelled) return;
      // On error, fail open (taken:false); the unique constraint still guards
      // the actual submit.
      setCheck({ value: handle, taken: error ? false : !!data });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle, formatValid, isOwnHandle]);

  const handleState: HandleState =
    handle.length === 0
      ? "idle"
      : !formatValid
        ? "invalid"
        : isOwnHandle
          ? "ok"
          : check && check.value === handle
            ? check.taken
              ? "taken"
              : "ok"
            : "checking";

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return schools.slice(0, 8);
    return schools
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.short_name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [schools, schoolQuery]);

  function pickSchool(s: SchoolLite) {
    setSchoolId(s.id);
    setSchoolOpen(false);
    setSchoolQuery("");
    if (s.region) setRegion(s.region);
  }

  function clearSchool() {
    setSchoolId(null);
    setRegion("");
  }

  const handleError = touched && (handleState === "invalid" || handleState === "taken");
  const nameError = touched && displayName.trim().length < 2;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);

    // Only handle + display name are required. School and region are optional so
    // a tester without an .edu.ph address (or whose school isn't seeded yet) can
    // still finish setup.
    if (
      !HANDLE_RE.test(handle) ||
      handleState === "taken" ||
      displayName.trim().length < 2
    ) {
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setFormError("Session expired. Sign in again.");
      return;
    }

    // `.update().eq()` returns `error: null` even when zero rows matched —
    // RLS filtering the row out, or (accounts predating the handle_new_user
    // trigger, or created outside that path) no `profiles` row existing at
    // all. Either way the caller can't tell success from a silent no-op, and
    // navigating away on a write that wrote nothing just re-traps the user in
    // the proxy's onboarding gate with no explanation. Upsert instead — it
    // creates the row if missing (RLS policy `profiles_insert_self` permits
    // `auth.uid() = id`) — and verify a row actually came back before leaving.
    const { data: savedProfile, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          handle,
          display_name: displayName.trim(),
          roles: rolesFromChoice(role),
          school_id: noSchool ? null : schoolId,
          school_other: noSchool ? schoolOther.trim() || null : null,
          region: region.trim() || null,
          school_verified: !noSchool && schoolVerified,
          onboarded: true,
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();

    if (error) {
      setSubmitting(false);
      if (error.code === "23505") {
        setCheck({ value: handle, taken: true });
        setFormError("That handle is already taken — pick another.");
      } else {
        setFormError(error.message);
      }
      return;
    }

    if (!savedProfile) {
      setSubmitting(false);
      setFormError(
        "Couldn't save your profile — sign out and back in, then try again.",
      );
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      {/* handle */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="onb-handle">
          Handle
        </label>
        <div className={styles.handleWrap} data-invalid={handleError}>
          <span className={styles.handlePrefix} aria-hidden>
            @
          </span>
          <input
            id="onb-handle"
            className={styles.handleInput}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={handle}
            onChange={(e) => setHandle(sanitizeHandle(e.target.value))}
            aria-invalid={handleError}
            aria-describedby="onb-handle-hint"
            disabled={submitting}
            required
          />
        </div>
        <span
          id="onb-handle-hint"
          className={`${styles.hint} ${
            handleState === "ok" ? styles.ok : ""
          } ${handleState === "taken" || handleState === "invalid" ? styles.warn : ""}`}
        >
          {handleState === "invalid"
            ? "3–20 characters, lowercase letters, numbers and underscore only."
            : handleState === "checking"
              ? "Checking availability…"
              : handleState === "taken"
                ? "That handle is taken."
                : handleState === "ok"
                  ? "Available."
                  : "Lowercase letters, numbers, underscore. This is your public @name."}
        </span>
      </div>

      {/* display name */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="onb-name">
          Display name
        </label>
        <input
          id="onb-name"
          className={styles.input}
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={nameError}
          aria-describedby={nameError ? "onb-name-err" : undefined}
          disabled={submitting}
          required
        />
        {nameError && (
          <span id="onb-name-err" className={styles.fieldError}>
            At least 2 characters.
          </span>
        )}
      </div>

      {/* role */}
      <div className={styles.field}>
        <span className={styles.label}>Role</span>
        <div className={styles.roleGroup} role="radiogroup" aria-label="Role">
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className={styles.roleCard}>
              <input
                type="radio"
                name="onb-role"
                value={opt.value}
                checked={role === opt.value}
                onChange={() => setRole(opt.value)}
                disabled={submitting}
              />
              <span className={styles.roleText}>
                <span className={styles.roleName}>{opt.name}</span>
                <span className={styles.roleDesc}>{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* school combobox */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="onb-school">
          School <span className={styles.optional}>· optional</span>
        </label>

        {noSchool ? (
          <>
            <input
              id="onb-school"
              className={styles.input}
              type="text"
              autoComplete="organization"
              placeholder="Type your school's name"
              value={schoolOther}
              onChange={(e) => setSchoolOther(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setNoSchool(false);
                setSchoolOther("");
              }}
              disabled={submitting}
            >
              Pick from the list instead
            </button>
          </>
        ) : selectedSchool ? (
          <div className={styles.selectedSchool}>
            <span>
              {selectedSchool.name}
              {selectedSchool.short_name ? ` (${selectedSchool.short_name})` : ""}
              {schoolVerified && (
                <span className={styles.verifyTag}> · will auto-verify</span>
              )}
            </span>
            <button
              type="button"
              className={styles.clearSchool}
              onClick={clearSchool}
              disabled={submitting}
            >
              Change
            </button>
          </div>
        ) : (
          <div className={styles.combo}>
            <input
              id="onb-school"
              className={styles.input}
              type="text"
              role="combobox"
              aria-expanded={schoolOpen}
              aria-controls="onb-school-list"
              aria-autocomplete="list"
              placeholder="Search by name or abbreviation…"
              value={schoolQuery}
              onChange={(e) => {
                setSchoolQuery(e.target.value);
                setSchoolOpen(true);
                setActiveIdx(0);
              }}
              onFocus={() => setSchoolOpen(true)}
              onBlur={() => setTimeout(() => setSchoolOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, filteredSchools.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const s = filteredSchools[activeIdx];
                  if (s) pickSchool(s);
                } else if (e.key === "Escape") {
                  setSchoolOpen(false);
                }
              }}
              disabled={submitting}
            />
            {schoolOpen && (
              <div className={styles.comboList} id="onb-school-list" role="listbox">
                {filteredSchools.length === 0 ? (
                  <span className={styles.comboEmpty}>No match.</span>
                ) : (
                  filteredSchools.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected={i === activeIdx}
                      data-active={i === activeIdx}
                      className={styles.comboOption}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSchool(s)}
                    >
                      <span>{s.name}</span>
                      <span className={styles.comboOptionSub}>
                        {[s.short_name, s.region].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {!noSchool && !selectedSchool && (
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => {
              setNoSchool(true);
              setSchoolId(null);
              setSchoolQuery("");
            }}
            disabled={submitting}
          >
            My school isn&apos;t listed
          </button>
        )}
      </div>

      {/* region */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="onb-region">
          Region <span className={styles.optional}>· optional</span>
        </label>
        <input
          id="onb-region"
          className={styles.input}
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. NCR"
          disabled={submitting}
        />
        <span className={styles.hint}>
          Prefilled from your school when we know it — edit if you compete elsewhere.
        </span>
      </div>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Finish setup
      </button>
    </form>
  );
}
