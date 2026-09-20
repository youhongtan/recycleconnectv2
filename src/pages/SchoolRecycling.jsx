import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import CentreCard from "@/components/finder/CentreCard";
import BulkMyRequests from "@/components/bulk/BulkMyRequests";
import { MATERIALS, MATERIAL_KEY } from "@/lib/recycleData";
import {
  findSuitableCentres,
} from "@/lib/schoolPickup";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { School, Send, CheckCircle2, Loader2, MapPin, Camera, X, Info } from "lucide-react";

export const SCHOOL_CONFIRMATION_MESSAGE =
  "Your response had been received. We will get back to you within 3 days.";

const MATERIAL_OPTIONS = [...MATERIALS, "Others"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const initialForm = {
  schoolName: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  schoolAddress: "",
  materials: [],
  othersSpecify: "",
  qtyValue: "",
  qtyUnit: "kg",
  weightUnknown: false,
  volumeDesc: "",
  pickupPreference: "",
  notes: "",
};

function validate(form, t) {
  const errors = {};
  if (!form.schoolName.trim()) errors.schoolName = t("eSchool");
  if (!form.contactPerson.trim()) errors.contactPerson = t("ePerson");
  if (!form.contactEmail.trim()) errors.contactEmail = t("eEmail");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()))
    errors.contactEmail = t("eEmailValid");
  if (!form.contactPhone.trim()) errors.contactPhone = t("ePhone");
  else if ((form.contactPhone.replace(/\D/g, "") || "").length < 7)
    errors.contactPhone = t("ePhoneValid");
  if (!form.schoolAddress.trim()) errors.schoolAddress = t("eAddress");
  if (form.materials.length === 0)
    errors.materials = t("eMaterials");
  if (form.materials.includes("Others") && !form.othersSpecify.trim())
    errors.othersSpecify = t("eOthers");
  if (form.weightUnknown) {
    if (!form.volumeDesc.trim()) errors.volumeDesc = t("eVolume");
  } else {
    if (!form.qtyValue.trim()) errors.qtyValue = t("eQtyVal");
    else if (!Number.isFinite(Number(form.qtyValue)) || Number(form.qtyValue) <= 0)
      errors.qtyValue = t("eQtyVal");
  }
  if (!form.pickupPreference) errors.pickupPreference = t("ePref");
  return errors;
}

async function uploadPhoto(file) {
  const safeName = (file.name || "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `school-pickup/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}

export default function SchoolRecycling() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [busyStep, setBusyStep] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [photoWarning, setPhotoWarning] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [matched, setMatched] = useState([]);
  const [noCentre, setNoCentre] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleMaterial = (m) => {
    setForm((f) => ({
      ...f,
      materials: f.materials.includes(m)
        ? f.materials.filter((x) => x !== m)
        : [...f.materials, m],
    }));
    setErrors((e) => ({ ...e, materials: undefined }));
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitError("");
    if (!file.type.startsWith("image/")) {
      setSubmitError(t("photoTypeErr"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setSubmitError(t("photoSizeErr"));
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  // Fold "Others: <free text>" into the materials list for storage/display.
  const finalMaterials = () =>
    form.materials.map((m) =>
      m === "Others" ? `Others: ${form.othersSpecify.trim()}` : m
    );

  const estWeightKg = () => {
    if (form.weightUnknown) return null;
    const v = Number(form.qtyValue);
    if (!Number.isFinite(v) || v <= 0) return null;
    return form.qtyUnit === "tonnes" ? v * 1000 : v;
  };

  const qtyText = () =>
    form.weightUnknown ? "Unknown" : `${form.qtyValue.trim()} ${form.qtyUnit}`;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setPhotoWarning("");
    const errs = validate(form, t);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const submitterId = session?.user?.id || user?.id || null;

      // 1. Upload photo (optional) to the shared `uploads` bucket.
      let photoUrl = null;
      if (photoFile) {
        setBusyStep("upload");
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (photoErr) {
          setPhotoWarning(
            `Photo could not be uploaded (${photoErr?.message || "storage error"}), but your request was still submitted.`
          );
        }
      }

      // 2. Load existing centres (same data source as Finder).
      setBusyStep("match");
      const { data: centres } = await supabase.from("recycling_centres").select("*");

      // 3. Match nearest REAL suitable centres (material + location tiers).
      const ranked = findSuitableCentres(
        {
          materials: finalMaterials(),
          schoolAddress: form.schoolAddress,
          estWeightKg: estWeightKg(),
        },
        centres || []
      );
      setMatched(ranked);
      setNoCentre(ranked.length === 0);

      const best = ranked[0] || null;

      // 4. Persist the request (columns from migration_school_pickup*.sql).
      //    If the table/columns are missing, keep a local copy — confirmation stands.
      const now = new Date().toISOString();
      const payload = {
        school_name: form.schoolName.trim(),
        contact_person: form.contactPerson.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        school_address: form.schoolAddress.trim(),
        materials: finalMaterials(),
        quantity: qtyText(),
        qty_unit: form.qtyUnit,
        est_weight_kg: estWeightKg(),
        weight_unknown: form.weightUnknown,
        volume_desc: form.weightUnknown ? form.volumeDesc.trim() : null,
        vehicle_size: null,
        pickup_date: null,
        pickup_preference: form.pickupPreference,
        photo_url: photoUrl,
        notes: form.notes.trim() || null,
        user_id: submitterId,
        matched_centre_id: best?.centre?.id || null,
        matched_centre_name: best?.centre?.name || null,
        centre_source: "auto",
        admin_note: null,
        rec_matched_materials: best?.matchedMaterials || [],
        rec_distance_km: null,
        rec_source: "auto",
        rec_at: now,
        rec_pickup_verified: best ? best.pickupVerified : false,
        rec_verified: false,
      };
      try {
        const { error: insertError } = await supabase
          .from("school_pickup_requests")
          .insert(payload);
        if (insertError) throw insertError;
      } catch (dbError) {
        const outbox = JSON.parse(localStorage.getItem("rc-school-requests") || "[]");
        outbox.push({ ...payload, created_at: now, pending_sync: true });
        localStorage.setItem("rc-school-requests", JSON.stringify(outbox));
        if (import.meta.env.DEV) console.warn("school_pickup_requests insert failed, queued locally:", dbError?.message);
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(t("submitFail"));
    }
    setBusy(false);
    setBusyStep("");
  };

  const field =
    "w-full h-12 px-4 rounded-2xl bg-background border border-border focus:border-primary";
  const errText = (key) =>
    errors[key] ? (
      <p role="alert" className="text-xs text-destructive mt-1.5">
        {errors[key]}
      </p>
    ) : null;

  const prefLabel =
    form.pickupPreference === "weekday"
      ? t("prefWeekday")
      : form.pickupPreference === "weekend"
        ? t("prefWeekend")
        : form.pickupPreference;

  if (submitted) {
    const best = matched[0] || null;
    return (
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <Reveal>
          <div className="glass orbital soft-shadow p-8 sm:p-10 text-center">
            <span className="h-16 w-16 rounded-full bg-primary/12 grid place-items-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight">{t("reqReceived")}</h1>
            <p
              role="status"
              className="mt-4 text-lg font-semibold text-primary bg-primary/8 rounded-2xl px-6 py-4"
            >
              {SCHOOL_CONFIRMATION_MESSAGE}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("reqSumA")} <strong>{form.schoolName}</strong> —{" "}
              <strong>{finalMaterials().join(", ")}</strong> ({qtyText()}) — {prefLabel}.{" "}
              {t("reqSumContact")} {form.contactPerson} ({form.contactEmail} / {form.contactPhone}).
            </p>
            {photoWarning && (
              <p className="mt-2 text-xs text-amber-600">{photoWarning}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setMatched([]);
                  setNoCentre(false);
                  setSubmitted(false);
                  clearPhoto();
                }}
                className="h-12 px-6 rounded-full glass font-semibold hover:bg-primary/10 transition"
              >
                {t("submitAnother")}
              </button>
              <Link
                to="/finder"
                className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center hover:brightness-110 transition"
              >
                {t("browseCentres")}
              </Link>
            </div>
          </div>
        </Reveal>

        {best ? (
          <Reveal delay={0.1}>
            <div className="mt-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> {t("suggestedT")}
              </h2>
              <div className="mt-4 panel-solid orbital soft-shadow p-6">
                <p className="font-bold text-lg">{best.centre.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  📍 {best.locationLabel || best.centre.address}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ♻️ {t("scanMaterial")}: {(best.matchedMaterials || []).join(" · ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {best.reasons.map((r, ri) => (
                    <span
                      key={ri}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/12 text-primary"
                    >
                      {r.k === "mat" && `${t("rsnAccepts")} ${(r.mats || []).join(", ")}`}
                      {(r.k === "city" || r.k === "state") && `${t("rsnIn")} ${r.place}`}
                      {r.k === "nearby" && `${t("rsnNearby")} (${r.place})`}
                      {r.k === "pickup" && t("rsnPickup")}
                      {r.k === "cash" && t("rsnCash")}
                      {r.k === "rating" && `${t("rsnRated")} (${r.rating})`}
                      {r.k === "custom" && t("rsnCustom")}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-amber-600">
                  {t("potentialNote")}
                </p>
                {!best.pickupVerified && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    {t("capacityNote")}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${best.centre.name} ${best.centre.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center hover:brightness-110 transition"
                >
                  {t("builtCta")}
                </a>
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
        ) : (
          noCentre && (
            <Reveal delay={0.1}>
              <div className="mt-8 panel-solid orbital soft-shadow p-6 text-center text-sm font-medium">
                {t("noCentreFallback")}
              </div>
            </Reveal>
          )
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("schEyebrow")}
        title={t("schTitle")}
        subtitle={t("schSub")}
      />

      {/* What bulk recycling means (sec 18.1 + 18.4) */}
      <Reveal delay={0.02}>
        <div className="mt-12 panel-solid orbital soft-shadow p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" /> {t("bulkWhatT")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("bulkWhatB")}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4">
              <p className="font-bold text-sm">{t("regT")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("regB")}</p>
            </div>
            <div className="rounded-2xl border border-primary/50 bg-primary/5 p-4">
              <p className="font-bold text-sm">{t("bulkT")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("bulkB")}</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <form onSubmit={submit} noValidate className="mt-6 glass orbital soft-shadow p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-10 w-10 rounded-2xl bg-primary/12 grid place-items-center shrink-0">
              <School className="w-5 h-5 text-primary" />
            </span>
            {t("schIntro")}
          </div>

          <div>
            <label htmlFor="s-school" className="block text-sm font-semibold mb-2">
              {t("fSchool")} *
            </label>
            <input
              id="s-school"
              className={field}
              placeholder="SMK Taman Melawati"
              value={form.schoolName}
              onChange={(e) => set("schoolName", e.target.value)}
            />
            {errText("schoolName")}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-person" className="block text-sm font-semibold mb-2">
                {t("fPerson")} *
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
                {t("fPhone")} *
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
              {t("fEmail")} *
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
              {t("fAddress")} *
            </label>
              <textarea
                id="s-address"
                rows={2}
                className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary"
                placeholder={t("phAddress")}
              value={form.schoolAddress}
              onChange={(e) => set("schoolAddress", e.target.value)}
            />
            {errText("schoolAddress")}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold mb-2">{t("fMaterials")} *</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MATERIAL_OPTIONS.map((m) => (
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
                    onChange={() => toggleMaterial(m)}
                    className="h-4 w-4 rounded accent-[#2E7D32]"
                  />
                  {m === "Others" ? t("othersOpt") : t(MATERIAL_KEY[m] || m)}
                </label>
              ))}
            </div>
            {errText("materials")}
            {form.materials.includes("Others") && (
              <div className="mt-3">
                <label htmlFor="s-others" className="block text-sm font-semibold mb-2">
                  {t("fOthers")} *
                </label>
                <input
                  id="s-others"
                  className={field}
                  placeholder={t("phOthers")}
                  value={form.othersSpecify}
                  onChange={(e) => set("othersSpecify", e.target.value)}
                />
                {errText("othersSpecify")}
              </div>
            )}
          </fieldset>

          {/* Estimated quantity + vehicle (sec 18.2 + 18.3) */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-qty" className="block text-sm font-semibold mb-2">
                {t("fQty")} *
              </label>
              <div className="flex gap-2">
                <input
                  id="s-qty"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  disabled={form.weightUnknown}
                  className={`${field} disabled:opacity-50`}
                  placeholder={t("phQty")}
                  value={form.qtyValue}
                  onChange={(e) => set("qtyValue", e.target.value)}
                />
                <select
                  aria-label={t("fQtyUnit")}
                  value={form.qtyUnit}
                  disabled={form.weightUnknown}
                  onChange={(e) => set("qtyUnit", e.target.value)}
                  className="h-12 px-3 rounded-2xl bg-background border border-border focus:border-primary text-sm font-semibold disabled:opacity-50"
                >
                  <option value="kg">{t("unitKg")}</option>
                  <option value="tonnes">{t("unitTonnes")}</option>
                </select>
              </div>
              {errText("qtyValue")}
              <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.weightUnknown}
                  onChange={(e) => set("weightUnknown", e.target.checked)}
                  className="h-4 w-4 rounded accent-[#2E7D32]"
                />
                {t("qtyUnknown")}
              </label>
              {form.weightUnknown && (
                <div className="mt-3">
                  <label htmlFor="s-volume" className="block text-sm font-semibold mb-2">
                    {t("fVolume")} *
                  </label>
                  <textarea
                    id="s-volume"
                    rows={2}
                    className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary"
                    placeholder={t("phVolume")}
                    value={form.volumeDesc}
                    onChange={(e) => set("volumeDesc", e.target.value)}
                  />
                  {errText("volumeDesc")}
                </div>
              )}
            </div>
            <fieldset>
              <legend className="text-sm font-semibold mb-2">{t("fPickup")} *</legend>
              <div className="space-y-2">
                {[
                  { value: "weekday", label: t("prefWeekday") },
                  { value: "weekend", label: t("prefWeekend") },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-sm cursor-pointer transition-colors ${
                      form.pickupPreference === value
                        ? "border-primary bg-primary/5 font-semibold"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickupPreference"
                      value={value}
                      checked={form.pickupPreference === value}
                      onChange={() => set("pickupPreference", value)}
                      className="h-4 w-4 accent-[#2E7D32]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errText("pickupPreference")}
            </fieldset>
          </div>

          {/* Vehicle selection removed — administrator reviews load suitability. */}

          <div>
            <span className="block text-sm font-semibold mb-2">
              {t("fPhoto")} <span className="font-normal text-muted-foreground">{t("fOptional")}</span>
            </span>
            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Bulk recyclables preview"
                  className="h-40 rounded-2xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="s-photo"
                className="flex items-center justify-center gap-2 h-14 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition"
              >
                <Camera className="w-5 h-5" /> {t("phTakePhoto")}
              </label>
            )}
            <input
              id="s-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onPhotoChange}
            />
          </div>

          <div>
            <label htmlFor="s-notes" className="block text-sm font-semibold mb-2">
              {t("fNotes")}
            </label>
            <textarea
              id="s-notes"
              rows={3}
              className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary"
              placeholder={t("phNotes")}
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
                <Loader2 className="w-5 h-5 animate-spin" />{" "}
                {busyStep === "upload" ? t("uploadingBtn") : busyStep === "match" ? t("matchingBtn") : t("submittingBtn")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {t("submitBtn")}
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            {t("noAutoBook")}
          </p>
        </form>
      </Reveal>

      {user && (
        <div className="mt-10">
          <BulkMyRequests />
        </div>
      )}
    </div>
  );
}
