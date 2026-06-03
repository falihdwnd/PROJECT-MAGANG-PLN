"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function VendorActivatePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token aktivasi tidak ditemukan.");
      return;
    }

    const activate = async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/vendor-activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Gagal mengaktifkan akun vendor.");
          return;
        }

        setStatus("success");
        setMessage(data.message || "Akun vendor berhasil diaktifkan.");
      } catch (error) {
        console.error("Activation error:", error);
        setStatus("error");
        setMessage("Terjadi kesalahan saat aktivasi.");
      }
    };

    activate();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-sky-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">Aktivasi Akun Vendor</h1>
        <p className="text-sm text-gray-500 mt-2">
          {status === "loading" ? "Memproses aktivasi..." : ""}
        </p>

        {status !== "loading" && (
          <div
            className={`mt-6 rounded-lg border p-4 text-sm ${
              status === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Ke Halaman Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
