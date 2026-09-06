"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addOrgMember,
  removeOrgMember,
  updateOrg,
  updateOrgMember,
} from "./actions";
import { SchoolCombobox } from "./SchoolCombobox";
import {
  KIND_LABEL,
  LINK_KEYS,
  LINK_LABEL,
  ORG_KINDS,
  ORG_ROLES,
  ORG_ROLE_LABEL,
  type LinkKey,
  type OrgKind,
  type OrgMemberView,
  type OrgProfile,
  type OrgRole,
  type SchoolLite,
} from "./types";
import styles from "./forms.module.css";

interface Props {
  org: OrgProfile;
  schools: SchoolLite[];
}

export function ManageOrgClient({ org, schools }: Props) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className={styles.manageWrap}>
      <OrgFields org={org} schools={schools} onDone={refresh} />
      <MemberEditor
        slug={org.slug}
        members={org.members}
        onDone={refresh}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function OrgFields({
  org,
  schools,
  onDone,
}: {
  org: OrgProfile;
  schools: SchoolLite[];
  onDone: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [shortName, setShortName] = useState(org.short_name ?? "");
  const [kind, setKind] = useState<OrgKind>(org.kind);
  const [schoolId, setSchoolId] = useState<string | null>(org.school?.id ?? null);
  const [region, setRegion] = useState(org.region ?? "");
  const [bio, setBio] = useState(org.bio ?? "");
  const [links, setLinks] = useState<Record<LinkKey, string>>(() => {
    const base = { website: "", discord: "", facebook: "", x: "", youtube: "" } as Record<
      LinkKey,
      string
    >;
    for (const k of LINK_KEYS) base[k] = org.links[k] ?? "";
    return base;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const res = await updateOrg({
      slug: org.slug,
      name,
      shortName,
      kind,
      schoolId,
      region,
      bio,
      links,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    onDone();
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Org details</h2>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && (
          <div className={styles.formError} role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className={styles.formOk} role="status">
            Saved.
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-org-name">
            Org name
          </label>
          <input
            id="mng-org-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-org-short">
            Short name
          </label>
          <input
            id="mng-org-short"
            className={styles.input}
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-org-kind">
            Kind
          </label>
          <select
            id="mng-org-kind"
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
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-org-region">
            Region
          </label>
          <input
            id="mng-org-region"
            className={styles.input}
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mng-org-bio">
            Bio
          </label>
          <textarea
            id="mng-org-bio"
            className={styles.textarea}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
          Save changes
        </button>
      </form>
    </section>
  );
}

/* --------------------------------------------------------------------------- */

function MemberEditor({
  slug,
  members,
  onDone,
}: {
  slug: string;
  members: OrgMemberView[];
  onDone: () => void;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Members</h2>

      {members.length === 0 ? (
        <p className={styles.hint}>No members yet. Add your first below.</p>
      ) : (
        <ul className={styles.rosterEdit}>
          {members.map((m) => (
            <MemberRow key={m.id} member={m} onDone={onDone} />
          ))}
        </ul>
      )}

      <AddMemberRow slug={slug} onDone={onDone} />
    </section>
  );
}

function MemberRow({
  member,
  onDone,
}: {
  member: OrgMemberView;
  onDone: () => void;
}) {
  const [role, setRole] = useState<OrgRole>(member.role);
  const [title, setTitle] = useState(member.title ?? "");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = role !== member.role || title !== (member.title ?? "");

  async function save() {
    setError(null);
    setBusy("save");
    const res = await updateOrgMember({ memberId: member.id, role, title });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    const res = await removeOrgMember({ memberId: member.id });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
  }

  return (
    <li className={styles.rosterEditRow}>
      <div className={styles.rosterEditWho}>
        <span className={styles.rosterEditName}>
          {member.displayName || "Unknown"}
        </span>
        {member.handle && (
          <span className={styles.rosterEditHandle}>@{member.handle}</span>
        )}
      </div>

      <label className={styles.rosterEditControl}>
        <span className={styles.srOnly}>Title</span>
        <input
          className={styles.input}
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy !== null}
        />
      </label>

      <label className={styles.rosterEditControl}>
        <span className={styles.srOnly}>Role</span>
        <select
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          disabled={busy !== null}
        >
          {ORG_ROLES.map((r) => (
            <option key={r} value={r}>
              {ORG_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.rosterEditActions}>
        <button
          type="button"
          className={styles.smallBtn}
          data-loading={busy === "save"}
          disabled={busy !== null || !dirty}
          onClick={save}
        >
          Save
        </button>
        <button
          type="button"
          className={styles.smallBtnDanger}
          data-loading={busy === "remove"}
          disabled={busy !== null}
          onClick={remove}
        >
          Remove
        </button>
      </div>

      {error && (
        <p className={styles.rosterEditError} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function AddMemberRow({
  slug,
  onDone,
}: {
  slug: string;
  onDone: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    if (!handle.trim()) {
      setError("Enter a handle.");
      return;
    }
    setBusy(true);
    const res = await addOrgMember({ slug, handle, role, title });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setHandle("");
    setTitle("");
    setRole("member");
    onDone();
  }

  return (
    <div className={styles.addRow}>
      <h3 className={styles.addTitle}>Add member</h3>
      <div className={styles.addGrid}>
        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Handle</span>
          <div className={styles.handleWrap} data-invalid={!!error}>
            <span className={styles.handlePrefix} aria-hidden>
              @
            </span>
            <input
              className={styles.handleInput}
              type="text"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={busy}
            />
          </div>
        </label>

        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Title</span>
          <input
            className={styles.input}
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
        </label>

        <label className={styles.rosterEditControl}>
          <span className={styles.srOnly}>Role</span>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            disabled={busy}
          >
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.smallBtn}
          data-loading={busy}
          disabled={busy}
          onClick={add}
        >
          Add
        </button>
      </div>
      {error && (
        <p className={styles.rosterEditError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export function ManageHeader({ org }: { org: OrgProfile }) {
  return (
    <div className={styles.manageHead}>
      <Link href={`/orgs/${org.slug}`} className={styles.backLink}>
        ← Back to org
      </Link>
      <h1 className={styles.manageTitle}>Manage {org.name}</h1>
    </div>
  );
}
