"use client";

import { useState } from "react";
import { createOrg } from "./actions";
import { SchoolCombobox } from "./SchoolCombobox";
import {
  KIND_LABEL,
  LINK_KEYS,
  LINK_LABEL,
  ORG_KINDS,
  isValidSlug,
  slugify,
  type LinkKey,
  type OrgKind,
  type SchoolLite,
} from "./types";
import styles from "./forms.module.css";

const EMPTY_LINKS: Record<LinkKey, string> = {
  website: "",
  discord: "",
  facebook: "",
  x: "",
  youtube: "",
};

export function NewOrgForm({ schools }: { schools: SchoolLite[] }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortName, setShortName] = useState("");
  const [kind, setKind] = useState<OrgKind>("varsity");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<Record<LinkKey, string>>(EMPTY_LINKS);

  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const nameError = touched && name.trim().length < 2;
  const slugError = touched && !isValidSlug(effectiveSlug);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    setFormError(null);
    if (name.trim().length < 2 || !isValidSlug(effectiveSlug)) return;

    setSubmitting(true);
    const res = await createOrg({
      name,
      slug: effectiveSlug,
      shortName,
      kind,
      schoolId,
      region,
      bio,
      links,
    });
    // On success the action redirects and this never runs.
    if (res && !res.ok) {
      setSubmitting(false);
      setFormError(res.error);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-name">
          Org name
        </label>
        <input
          id="org-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-invalid={nameError}
          aria-describedby={nameError ? "org-name-err" : undefined}
          disabled={submitting}
          required
        />
        {nameError && (
          <span id="org-name-err" className={styles.fieldError}>
            At least 2 characters.
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-slug">
          URL
        </label>
        <input
          id="org-slug"
          className={`${styles.input} ${styles.mono}`}
          type="text"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          aria-invalid={slugError}
          aria-describedby="org-slug-hint"
          disabled={submitting}
          required
        />
        <span
          id="org-slug-hint"
          className={slugError ? styles.fieldError : styles.hint}
        >
          {slugError
            ? "2–39 characters: lowercase letters, numbers, dashes."
            : `Your profile lives at /orgs/${effectiveSlug || "…"}`}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-short">
          Short name
        </label>
        <input
          id="org-short"
          className={styles.input}
          type="text"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          placeholder="Optional — e.g. UP Esports"
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-kind">
          Kind
        </label>
        <select
          id="org-kind"
          className={styles.input}
          value={kind}
          onChange={(e) => setKind(e.target.value as OrgKind)}
          disabled={submitting}
        >
          {ORG_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>School</span>
        <SchoolCombobox
          schools={schools}
          value={schoolId}
          onPick={(s) => {
            setSchoolId(s?.id ?? null);
            if (s?.region && !region) setRegion(s.region);
          }}
          disabled={submitting}
        />
        <span className={styles.hint}>Optional — link the org to a school.</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-region">
          Region
        </label>
        <input
          id="org-region"
          className={styles.input}
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. NCR"
          disabled={submitting}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="org-bio">
          Bio
        </label>
        <textarea
          id="org-bio"
          className={styles.textarea}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Optional — a line about the org."
          disabled={submitting}
        />
      </div>

      <fieldset className={styles.linksFieldset}>
        <legend className={styles.label}>Links</legend>
        <div className={styles.linksGrid}>
          {LINK_KEYS.map((k) => (
            <label key={k} className={styles.field}>
              <span className={styles.linkFieldLabel}>{LINK_LABEL[k]}</span>
              <input
                className={styles.input}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                value={links[k]}
                onChange={(e) =>
                  setLinks((prev) => ({ ...prev, [k]: e.target.value }))
                }
                placeholder="Optional"
                disabled={submitting}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className={styles.submit}
        data-loading={submitting}
        disabled={submitting}
      >
        Register org
      </button>
    </form>
  );
}
