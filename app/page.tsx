"use client";

import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PasswordGate } from "@/components/shared/PasswordGate";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <PasswordGate />
      </main>
      <Footer />
    </>
  );
}
