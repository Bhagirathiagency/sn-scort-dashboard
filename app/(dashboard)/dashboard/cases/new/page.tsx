"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateCaseInput } from "@/lib/cases/types";

const initialState: CreateCaseInput = {
  source: "manual_entry",
  country: "",
  receiptDate: new Date().toISOString().slice(0, 10),
  priority: "routine",
  isSerious: false,
  narrative: "",
  patient: { initials: "", age: "", ageGroup: "adult", sex: "unknown" },
  reporter: { reporterType: "consumer", isHealthcareProfessional: false, country: "" },
  product: { productName: "", activeSubstance: "", dose: "", route: "", indication: "" },
  event: { verbatimTerm: "", onsetDate: "", outcome: "unknown", severity: "moderate" },
};

export default function CaseIntakePage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateCaseInput>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to create case");
      return;
    }

    router.push(`/dashboard/cases/${body.data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-navy-900">Case Intake</h1>
      <p className="mb-6 text-sm text-navy-600">
        Enter the information available at receipt. A case number is assigned automatically.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="pv-card space-y-4 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Case
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Source</label>
              <select
                className="pv-input"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as CreateCaseInput["source"] })}
              >
                <option value="email">Email</option>
                <option value="web_form">Web form</option>
                <option value="manual_entry">Manual entry</option>
                <option value="literature">Literature</option>
                <option value="clinical_source">Clinical source</option>
                <option value="partner">Partner</option>
                <option value="affiliate">Affiliate</option>
                <option value="regulatory_authority">Regulatory authority</option>
                <option value="api">API</option>
                <option value="uploaded_document">Uploaded document</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Country</label>
              <input
                className="pv-input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Receipt date</label>
              <input
                type="date"
                required
                className="pv-input"
                value={form.receiptDate}
                onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select
                className="pv-input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as CreateCaseInput["priority"] })}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isSerious}
              onChange={(e) => setForm({ ...form, isSerious: e.target.checked })}
            />
            Serious case
          </label>
        </fieldset>

        <fieldset className="pv-card space-y-4 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Patient
          </legend>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Initials</label>
              <input
                className="pv-input"
                maxLength={5}
                value={form.patient.initials}
                onChange={(e) => setForm({ ...form, patient: { ...form.patient, initials: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Age</label>
              <input
                type="number"
                min={0}
                className="pv-input"
                value={form.patient.age}
                onChange={(e) => setForm({ ...form, patient: { ...form.patient, age: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sex</label>
              <select
                className="pv-input"
                value={form.patient.sex}
                onChange={(e) => setForm({ ...form, patient: { ...form.patient, sex: e.target.value } })}
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="not_reported">Not reported</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="pv-card space-y-4 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Reporter
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Reporter type</label>
              <select
                className="pv-input"
                value={form.reporter.reporterType}
                onChange={(e) =>
                  setForm({ ...form, reporter: { ...form.reporter, reporterType: e.target.value } })
                }
              >
                <option value="physician">Physician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="nurse">Nurse</option>
                <option value="other_hcp">Other HCP</option>
                <option value="consumer">Consumer</option>
                <option value="lawyer">Lawyer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Country</label>
              <input
                className="pv-input"
                value={form.reporter.country}
                onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, country: e.target.value } })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.reporter.isHealthcareProfessional}
              onChange={(e) =>
                setForm({
                  ...form,
                  reporter: { ...form.reporter, isHealthcareProfessional: e.target.checked },
                })
              }
            />
            Healthcare professional
          </label>
        </fieldset>

        <fieldset className="pv-card space-y-4 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Suspect product
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Product name *</label>
              <input
                required
                className="pv-input"
                value={form.product.productName}
                onChange={(e) => setForm({ ...form, product: { ...form.product, productName: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Active substance</label>
              <input
                className="pv-input"
                value={form.product.activeSubstance}
                onChange={(e) =>
                  setForm({ ...form, product: { ...form.product, activeSubstance: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Dose</label>
              <input
                className="pv-input"
                value={form.product.dose}
                onChange={(e) => setForm({ ...form, product: { ...form.product, dose: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Route</label>
              <input
                className="pv-input"
                value={form.product.route}
                onChange={(e) => setForm({ ...form, product: { ...form.product, route: e.target.value } })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Indication</label>
              <input
                className="pv-input"
                value={form.product.indication}
                onChange={(e) => setForm({ ...form, product: { ...form.product, indication: e.target.value } })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="pv-card space-y-4 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Adverse event
          </legend>
          <div>
            <label className="mb-1 block text-sm font-medium">Verbatim term *</label>
            <input
              required
              className="pv-input"
              value={form.event.verbatimTerm}
              onChange={(e) => setForm({ ...form, event: { ...form.event, verbatimTerm: e.target.value } })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Onset date</label>
              <input
                type="date"
                className="pv-input"
                value={form.event.onsetDate}
                onChange={(e) => setForm({ ...form, event: { ...form.event, onsetDate: e.target.value } })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Outcome</label>
              <select
                className="pv-input"
                value={form.event.outcome}
                onChange={(e) => setForm({ ...form, event: { ...form.event, outcome: e.target.value } })}
              >
                <option value="unknown">Unknown</option>
                <option value="recovered">Recovered</option>
                <option value="recovering">Recovering</option>
                <option value="not_recovered">Not recovered</option>
                <option value="recovered_with_sequelae">Recovered with sequelae</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Severity</label>
              <select
                className="pv-input"
                value={form.event.severity}
                onChange={(e) => setForm({ ...form, event: { ...form.event, severity: e.target.value } })}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="pv-card space-y-2 p-5">
          <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Narrative
          </legend>
          <textarea
            rows={5}
            className="pv-input"
            value={form.narrative}
            onChange={(e) => setForm({ ...form, narrative: e.target.value })}
          />
        </fieldset>

        {error && <p className="text-sm text-safe-red">{error}</p>}

        <button type="submit" disabled={submitting} className="pv-btn-primary">
          {submitting ? "Creating…" : "Create case"}
        </button>
      </form>
    </div>
  );
}
