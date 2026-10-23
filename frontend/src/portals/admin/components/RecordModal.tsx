import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../../services/api-client";
import type { FieldConfig, ResourceConfig } from "../../../shared/types/admin";

interface RecordModalProps {
  config: ResourceConfig;
  initial: Record<string, any> | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RecordModal({ config, initial, onClose, onSaved }: RecordModalProps) {
  const [form, setForm] = useState<Record<string, any>>(() =>
    Object.fromEntries(
      config.fields.map((f) => [
        f.key,
        initial?.[f.key] ?? (f.type === "boolean" ? true : "")
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (config.key === "users") {
      apiClient<{ rows: Array<{ id: string; name: string }> }>("/super-admin/resource/regions?limit=200")
        .then((r) => setRegions(r.rows || []))
        .catch(() => undefined);
    }
  }, [config.key]);

  function set(key: string, value: any) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = { ...form };
    for (const f of config.fields) {
      if (f.type === "number" && payload[f.key] !== "") {
        payload[f.key] = Number(payload[f.key]);
      }
      if (f.type === "boolean") {
        payload[f.key] = Boolean(payload[f.key]);
      }
      if (f.key === "topicsRequested" && typeof payload[f.key] === "string") {
        payload[f.key] = payload[f.key]
          .split(",")
          .map((x: string) => x.trim())
          .filter(Boolean);
      }
    }

    try {
      await apiClient(
        initial
          ? `/super-admin/resource/${config.key}/${initial.id}`
          : `/super-admin/resource/${config.key}`,
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <div className="section-kicker">{initial ? "EDIT RECORD" : "NEW RECORD"}</div>
            <h3>{config.title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="error banner">{error}</div>}
        <div className="form-grid">
          {config.fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              options={
                field.key === "regionId" && config.key === "users"
                  ? regions.map((r) => `${r.id}::${r.name}`)
                  : undefined
              }
              value={form[field.key]}
              onChange={(v) => set(field.key, v)}
            />
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create record"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  options
}: {
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  options?: string[];
}) {
  const common = {
    value: value ?? "",
    onChange: (e: any) => onChange(e.target.value),
    required: field.required
  };
  const dynamicOptions = options ?? field.options;
  const isDynamicSelect = Boolean(options?.length);

  return (
    <label className="form-field">
      <span>
        {field.label}
        {field.required && <b>*</b>}
      </span>
      {field.type === "textarea" ? (
        <textarea {...common} rows={3} />
      ) : field.type === "boolean" ? (
        <select
          value={String(Boolean(value))}
          onChange={(e) => onChange(e.target.value === "true")}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      ) : field.type === "select" || isDynamicSelect ? (
        <select {...common}>
          <option value="">Select…</option>
          {dynamicOptions?.map((o) => {
            const [id, label] = o.split("::");
            return (
              <option key={o} value={id}>
                {label || o}
              </option>
            );
          })}
        </select>
      ) : (
        <input {...common} type={field.type || "text"} />
      )}
    </label>
  );
}
