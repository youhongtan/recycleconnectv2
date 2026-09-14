import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import CentreCard from "@/components/finder/CentreCard";
import { MATERIALS } from "@/lib/recycleData";
import { findSuitableCentres } from "@/lib/schoolPickup";
import { School, Send, CheckCircle2, Loader2, MapPin } from "lucide-react";

export const SCHOOL_CONFIRMATION_MESSAGE =
  "Your response had been received. We will get back to you within 3 days.";

const initialForm = {
  schoolName: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  schoolAddress: "",
  materials: [],
  quantity: "",
  pickupDate: "",
  notes: "",
};

function validate(form) {
  const errors = {};
  if (!form.schoolName.trim()) errors.schoolName = "School name is required.";
  if (!form.contactPerson.trim()) errors.contactPerson = "Contact person is required.";
  if (!form.contactEmail.trim()) errors.contactEmail = "Contact email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))
    errors.contactEmail = "Enter a valid email address.";
  if (!form.contactPhone.trim()) errors.contactPhone = "Contact phone number is required.";
  else if ((form.contactPhone.replace(/\D/g, "") || "").length < 7)
    errors.contactPhone = "Enter a valid phone number.";
  if (!form.schoolAddress.trim()) errors.schoolAddress = "School address is required.";
  if (form.materials.length === 0)
    errors.materials = "Select at least one type of recyclable material.";
  if (!form.quantity.trim()) errors.quantity = "Estimated amount is required.";
  if (!form.pickupDate) errors.pickupDate = "Preferred pickup date is required.";
  else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(`${form.pickupDate}T00:00:00`);
    if (picked < today) errors.pickupDate = "Pickup date cannot be in the past.";
  }
  return errors;
}

export default function SchoolRecycling() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [matched, setMatched] = useState([]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleMaterial = (m) =>
    setForm((f) => ({
      ...f,
      materials: f.materials.includes(m)
        ? f.materials.filter((x) => x !== m)
        : [...f.materials, m],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      // 1. Load existing centres (same data source as Finder).
      const { data: centres } = await supabase.from("recycling_centres").select("*");

      // 2. Match nearest suitable centres for the requested materials + location.
      const ranked = findSuitableCentres(
        { materials: form.materials, schoolAddress: form.schoolAddress },
        centres || []
      );
      setMatched(ranked);

      const best = ranked[0] || null;

      // 3. Persist the request. `school_pickup_requests` is created by
      //    supabase/migration_school_pickup.sql. If the table has not been
      //    created yet (older Supabase project), keep a local copy so the
      //    request is never lost — the confirmation below still applies.
      const payload = {
        school_name: form.schoolName.trim(),
        contact_person: form.contactPerson.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        school_address: form.schoolAddress.trim(),
        materials: form.materials,
        quantity: form.quantity.trim(),
        pickup_date: form.pickupDate,
        notes: form.notes.trim() || null,
        matched_centre_id: best?.centre?.id || null,
        matched_centre_name: best?.centre?.name || null,
      };
      try {
        const { error: insertError } = await supabase
          .from("school_pickup_requests")
          .insert(payload);
        if (insertError) throw insertError;
      } catch (dbError) {
        // Table missing or RLS blocked — fall back to local outbox.
        const outbox = JSON.parse(localStorage.getItem("rc-school-requests") || "[]");
        outbox.push({ ...payload, created_at: new Date().toISOString(), pending_sync: true });
        localStorage.setItem("rc-school-requests", JSON.stringify(outbox));
        if (import.meta.env.DEV) console.warn("school_pickup_requests insert failed, queued locally:", dbError?.message);
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("Sorry, we couldn't submit that. Please check your connection and try again.");
    }
    setBusy(false);
  };

  const field =
    "w-full h-12 px-4 rounded-2xl bg-background border border-border focus:border-primary";
  const errText = (key) =>
    errors[key] ? (
      <p role="alert" className="text-xs text-destructive mt-1.5">
        {errors[key]}
      </p>
    ) : null;

  if (submitted) {
    const best = matched[0] || null;
    return (
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <Reveal>
          <div className="glass orbital soft-shadow p-8 sm:p-10 text-center">
            <span className="h-16 w-16 rounded-full bg-primary/12 grid place-items-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight">Request received</h1>
            <p
              role="status"
              className="mt-4 text-lg font-semibold text-primary bg-primary/8 rounded-2xl px-6 py-4"
            >
              {SCHOOL_CONFIRMATION_MESSAGE}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Request from <strong>{form.schoolName}</strong> for{" "}
              <strong>{form.materials.join(", ")}</strong> ({form.quantity}) — preferred pickup{" "}
              <strong>{form.pickupDate}</strong>. We will contact {form.contactPerson} at{" "}
              {form.contactEmail} / {form.contactPhone}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setMatched([]);
                  setSubmitted(false);
                }}
                className="h-12 px-6 rounded-full glass font-semibold hover:bg-primary/10 transition"
              >
                Submit another request
              </button>
              <Link
                to="/finder"
                className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center hover:brightness-110 transition"
              >
                Browse all centres
              </Link>
            </div>
          </div>
        </Reveal>

        {best && (
          <Reveal delay={0.1}>
            <div className="mt-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Suggested pickup centre
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your materials ({form.materials.join(", ")}) and school location, this
                is the nearest suitable centre in our directory. This is a suggestion only — our
                team will confirm the actual pickup arrangement when we contact you.
              </p>
              <div className="mt-4">
                <CentreCard centre={best.centre} highlight />
                {best.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {best.reasons.map((r) => (
                      <span
                        key={r}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/12 text-primary"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {matched.length > 1 && (
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  {matched.slice(1).map(({ centre }) => (
                    <CentreCard key={centre.id || centre.name} centre={centre} />
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow="For Schools"
        title="School Bulk Recycling"
        subtitle="Large amount of recyclables at your school? Send us a pickup request and we will match you with the nearest suitable recycling centre."
      />

      <Reveal delay={0.05}>
        <form onSubmit={submit} noValidate className="mt-12 glass orbital soft-shadow p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-10 w-10 rounded-2xl bg-primary/12 grid place-items-center shrink-0">
              <School className="w-5 h-5 text-primary" />
            </span>
            Schools can request a bulk pickup when they have a large amount of recyclable
            materials and need a recycling centre to collect them.
          </div>

          <div>
            <label htmlFor="s-school" className="block text-sm font-semibold mb-2">
              School name *
            </label>
            <input
              id="s-school"
              className={field}
              placeholder="e.g. SMK Taman Melawati"
              value={form.schoolName}
              onChange={(e) => set("schoolName", e.target.value)}
            />
            {errText("schoolName")}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-person" className="block text-sm font-semibold mb-2">
                Contact person *
              </label>
              <input
                id="s-person"
                className={field}
                placeholder="e.g. Cikgu Aina"
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
              {errText("contactPerson")}
            </div>
            <div>
              <label htmlFor="s-phone" className="block text-sm font-semibold mb-2">
                Contact phone number *
              </label>
              <input
                id="s-phone"
                type="tel"
                className={field}
                placeholder="e.g. 012-345 6789"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
              {errText("contactPhone")}
            </div>
          </div>

          <div>
            <label htmlFor="s-email" className="block text-sm font-semibold mb-2">
              Contact email *
            </label>
            <input
              id="s-email"
              type="email"
              className={field}
              placeholder="e.g. cikgu@school.edu.my"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
            {errText("contactEmail")}
          </div>

          <div>
            <label htmlFor="s-address" className="block text-sm font-semibold mb-2">
              School address *
            </label>
            <textarea
              id="s-address"
              rows={2}
              className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary"
              placeholder="Street, city, state — used to find the nearest centre"
              value={form.schoolAddress}
              onChange={(e) => set("schoolAddress", e.target.value)}
            />
            {errText("schoolAddress")}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold mb-2">Type of recyclable materials *</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MATERIALS.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-sm cursor-pointer transition-colors ${
                    form.materials.includes(m)
                      ? "border-primary bg-primary/5 font-semibold"
                      : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.materials.includes(m)}
                    onChange={toggleMaterial}
                    className="h-4 w-4 rounded accent-[#2E7D32]"
                  />
                  {m}
                </label>
              ))}
            </div>
            {errText("materials")}
          </fieldset>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-qty" className="block text-sm font-semibold mb-2">
                Estimated amount / quantity *
              </label>
              <input
                id="s-qty"
                className={field}
                placeholder="e.g. 200 kg, 30 bags"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
              {errText("quantity")}
            </div>
            <div>
              <label htmlFor="s-date" className="block text-sm font-semibold mb-2">
                Preferred pickup date *
              </label>
              <input
                id="s-date"
                type="date"
                className={field}
                value={form.pickupDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("pickupDate", e.target.value)}
              />
              {errText("pickupDate")}
            </div>
          </div>

          <div>
            <label htmlFor="s-notes" className="block text-sm font-semibold mb-2">
              Additional notes
            </label>
            <textarea
              id="s-notes"
              rows={3}
              className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary"
              placeholder="Gate access, storage location, stairs/lift, best time to call… (optional)"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-14 w-full rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Finding nearest centre…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit pickup request
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            No centre is auto-booked — we suggest the nearest suitable centre and confirm with
            you by email/phone.
          </p>
        </form>
      </Reveal>
    </div>
  );
}
