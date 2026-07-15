import { useState, useEffect } from "react";
import {
  MapPin, Plus, Trash2, Star, Pencil, Check, Loader2, Home, Briefcase
} from "lucide-react";
import type {
  SavedAddress,
  AddressPayload,
} from "../../utils/api";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../utils/api";

// ─── Helper ──────────────────────────────────────────────────────────────────

function emptyForm(): AddressPayload {
  return {
    label: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  };
}

// ─── Small Field ─────────────────────────────────────────────────────────────

function Field({
  label, name, type = "text", value, onChange, required = true, placeholder, half = false,
}: {
  label: string; name: string; type?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; half?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${half ? "" : "col-span-2"}`}>
      <label className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? label}
        className="border border-stone-200 px-3 py-2 w-full focus:outline-none focus:border-black transition-colors text-sm bg-white rounded-sm"
      />
    </div>
  );
}

// ─── Address Form ────────────────────────────────────────────────────────────

function AddressForm({
  initial,
  onSave,
  onCancel,
  submitLabel = "Save Address",
}: {
  initial?: Partial<AddressPayload>;
  onSave: (data: AddressPayload) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<AddressPayload>({ ...emptyForm(), ...initial });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await onSave(form);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {err && (
        <div className="col-span-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
          {err}
        </div>
      )}

      {/* Label quick-picks */}
      <div className="col-span-2 flex gap-2">
        {["Home", "Work", "Other"].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setForm((p) => ({ ...p, label: l }))}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-full transition-colors ${form.label === l
              ? "border-black bg-black text-white"
              : "border-stone-300 text-stone-600 hover:border-stone-500"
              }`}
          >
            {l === "Home" ? <Home size={11} /> : l === "Work" ? <Briefcase size={11} /> : <MapPin size={11} />}
            {l}
          </button>
        ))}
        <input
          name="label"
          value={["Home", "Work", "Other"].includes(form.label ?? "") ? "" : form.label ?? ""}
          onChange={handle}
          placeholder="Custom label"
          className="flex-1 border border-stone-200 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-black"
        />
      </div>

      <Field label="Full Name" name="fullName" value={form.fullName} onChange={handle} />
      <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handle} placeholder="+91 00000 00000" />
      <Field label="Address Line 1" name="addressLine1" value={form.addressLine1} onChange={handle} placeholder="House / flat, building, street" />
      <Field label="Address Line 2" name="addressLine2" value={form.addressLine2 ?? ""} onChange={handle} placeholder="Area, sector, locality (optional)" required={false} />
      <Field label="Landmark" name="landmark" value={form.landmark ?? ""} onChange={handle} placeholder="Near landmark (optional)" required={false} />
      <Field label="City" name="city" value={form.city} onChange={handle} half />
      <Field label="State" name="state" value={form.state} onChange={handle} half />
      <Field label="PIN Code" name="pincode" value={form.pincode} onChange={handle} placeholder="560034" half />
      <Field label="Country" name="country" value={form.country ?? "India"} onChange={handle} required={false} half />

      <div className="col-span-2 flex gap-3 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-stone-300 text-xs uppercase tracking-widest text-stone-600 hover:border-stone-600 transition-colors rounded-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────

function AddressCard({
  address,
  selected,
  onSelect,
  onDelete,
  onSetDefault,
  onEdit,
}: {
  address: SavedAddress;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onEdit: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this address?")) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const handleSetDefault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingDefault(true);
    await onSetDefault();
    setSettingDefault(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`relative border rounded-sm p-4 cursor-pointer transition-all ${selected
        ? "border-black bg-stone-50 shadow-sm"
        : "border-stone-200 hover:border-stone-400 bg-white"
        }`}
    >
      {/* Radio */}
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? "border-black" : "border-stone-300"
            }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-black" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-stone-900">{address.fullName}</span>
            {address.label && (
              <span className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full text-stone-500 uppercase tracking-wider">
                {address.label}
              </span>
            )}
            {address.isDefault && (
              <span className="text-[10px] px-2 py-0.5 bg-black text-white rounded-full uppercase tracking-wider flex items-center gap-1">
                <Star size={8} fill="white" />
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            {address.addressLine1}
            {address.addressLine2 ? `, ${address.addressLine2}` : ""}
            {address.landmark ? ` (${address.landmark})` : ""}
            <br />
            {address.city}, {address.state} – {address.pincode}
          </p>
          <p className="text-xs text-stone-500 mt-1">{address.phone}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-3 pl-7">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-[11px] text-stone-500 hover:text-black flex items-center gap-1 transition-colors"
        >
          <Pencil size={11} /> Edit
        </button>
        {!address.isDefault && (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={settingDefault}
            className="text-[11px] text-stone-500 hover:text-black flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            {settingDefault ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Set as default
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors disabled:opacity-50 ml-auto"
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Main AddressManager ──────────────────────────────────────────────────────

export interface AddressManagerProps {
  /** Addresses loaded from backend */
  addresses: SavedAddress[];
  /** Currently selected address id */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Called whenever the list changes so parent can refresh */
  onListChange: (addresses: SavedAddress[]) => void;
}

export default function AddressManager({
  addresses = [],
  selectedId,
  onSelect,
  onListChange,
}: AddressManagerProps) {
  const [showAddForm, setShowAddForm] = useState((addresses?.length === 0) || false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // When addresses first load (e.g. after async fetch), auto-close the add form
  useEffect(() => {
    if (addresses?.length > 0) {
      setShowAddForm(false);
    }
  }, [addresses?.length]);

  // ── Add new ──────────────────────────────────────────────────────────────

  const handleAdd = async (data: AddressPayload) => {
    const res = await createAddress(data);
    const updated = [...addresses, res.address];
    onListChange(updated);
    if (!selectedId) onSelect(res.address.id);
    setShowAddForm(false);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────

  const handleEdit = async (id: string, data: AddressPayload) => {
    const res = await updateAddress(id, data);
    const updated = addresses.map((a) => (a.id === id ? res.address : a));
    onListChange(updated);
    setEditingId(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    await deleteAddress(id);
    const updated = addresses.filter((a) => a.id !== id);
    onListChange(updated);
    if (selectedId === id) {
      const next = updated.find((a) => a.isDefault) ?? updated[0];
      if (next) onSelect(next.id);
      else onSelect("");
    }
  };

  // ── Set default ──────────────────────────────────────────────────────────

  const handleSetDefault = async (id: string) => {
    const res = await setDefaultAddress(id);
    const updated = addresses.map((a) =>
      a.id === id ? res.address : { ...a, isDefault: false }
    );
    onListChange(updated);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Saved address cards */}
      {addresses.map((addr) =>
        editingId === addr.id ? (
          <div key={addr.id} className="border border-black rounded-sm p-4 bg-stone-50">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
              Edit Address
            </p>
            <AddressForm
              initial={{
                label: addr.label ?? "",
                fullName: addr.fullName,
                phone: addr.phone,
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2 ?? "",
                landmark: addr.landmark ?? "",
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
                country: addr.country,
              }}
              onSave={(data) => handleEdit(addr.id, data)}
              onCancel={() => setEditingId(null)}
              submitLabel="Update Address"
            />
          </div>
        ) : (
          <AddressCard
            key={addr.id}
            address={addr}
            selected={selectedId === addr.id}
            onSelect={() => onSelect(addr.id)}
            onDelete={() => handleDelete(addr.id)}
            onSetDefault={() => handleSetDefault(addr.id)}
            onEdit={() => { setEditingId(addr.id); setShowAddForm(false); }}
          />
        )
      )}

      {/* Add new form */}
      {showAddForm ? (
        <div className="border border-dashed border-stone-300 rounded-sm p-4 bg-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1.5">
            <MapPin size={12} /> New Address
          </p>
          <AddressForm
            onSave={handleAdd}
            onCancel={addresses?.length > 0 ? () => setShowAddForm(false) : undefined}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setEditingId(null); }}
          className="flex items-center gap-2 text-xs text-stone-500 hover:text-black border border-dashed border-stone-300 hover:border-stone-500 py-3 px-4 transition-colors rounded-sm"
        >
          <Plus size={14} />
          Add a new address
        </button>
      )}
    </div>
  );
}
