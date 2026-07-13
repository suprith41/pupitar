"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export type ForkTarget = {
  id: string;
  name: string;
  description: string | null;
  forkedRepoId: string | null;
};

export function ForkModal({
  repo,
  loggedIn,
  busy,
  error,
  onClose,
  onConfirm
}: {
  repo: ForkTarget;
  loggedIn: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState(repo.name);
  const [description, setDescription] = useState(repo.description ?? "");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    await onConfirm(name.trim(), description.trim());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5 py-8 backdrop-blur-sm" role="presentation" onMouseDown={() => !busy && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="fork-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[460px] rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="fork-modal-title" className="text-[20px] font-bold text-[#F0F0F0]">
              {!loggedIn ? "Sign in to fork this repo" : repo.forkedRepoId ? "Already forked" : `Fork ${repo.name}`}
            </h2>
            {!loggedIn ? <p className="mt-2 text-[13px] text-[#A0A0A0]">Create an account or log in to add a private copy to your repos.</p> : null}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close fork dialog" className="text-[20px] leading-none text-[#606060] hover:text-[#F0F0F0] disabled:opacity-50">×</button>
        </div>

        {!loggedIn ? (
          <div className="mt-6 flex gap-3">
            <Link href="/login" className="rounded-md bg-[#2067FF] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2F6BFF]">Log in →</Link>
            <Link href="/signup" className="rounded-md border border-[#2A2A2A] bg-[#242424] px-4 py-2.5 text-[13px] font-semibold text-[#F0F0F0] hover:border-[#2067FF]">Sign up →</Link>
          </div>
        ) : repo.forkedRepoId ? (
          <div className="mt-6">
            <p className="text-[14px] leading-6 text-[#A0A0A0]">You already have a fork of this repo.</p>
            <Link href={`/dashboard/${repo.forkedRepoId}`} className="mt-4 inline-flex rounded-md bg-[#2067FF] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2F6BFF]">Open your fork →</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#A0A0A0]">Name</span>
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required className="h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-3 text-[14px] text-[#F0F0F0] outline-none focus:border-[#2067FF]" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#A0A0A0]">Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full resize-none rounded-md border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 text-[14px] text-[#F0F0F0] outline-none focus:border-[#2067FF]" />
            </label>
            {error ? <p role="alert" className="text-[12px] text-[#F87171]">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-[#2A2A2A] px-4 py-2.5 text-[13px] text-[#A0A0A0] hover:text-[#F0F0F0] disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={busy || !name.trim()} className="rounded-md bg-[#2067FF] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2F6BFF] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Forking…" : "Fork repo"}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function ForkSuccessToast() {
  return (
    <div role="status" className="fixed bottom-6 right-6 z-[110] rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-4 shadow-2xl">
      <p className="text-[14px] font-semibold text-[#F0F0F0]">Forked successfully!</p>
      <p className="mt-1 text-[12px] text-[#A0A0A0]">Now in your repos.</p>
    </div>
  );
}
