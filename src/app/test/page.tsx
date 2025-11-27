"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestPage() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">(
    "loading",
  );
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();

        // Test connection by querying companies table
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .limit(1);

        if (error) {
          throw error;
        }

        setStatus("connected");
        setTables(["companies", "users", "warehouses", "invites"]);
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Unknown error");
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-dvh bg-background-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Bale Frontend - Database Connection Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>

          {status === "loading" && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Testing connection...</span>
            </div>
          )}

          {status === "connected" && (
            <div className="text-green-600 font-medium">
              ✅ Successfully connected to Supabase!
            </div>
          )}

          {status === "error" && (
            <div className="text-red-600">❌ Connection failed: {error}</div>
          )}
        </div>

        {status === "connected" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Database Tables</h2>
            <ul className="space-y-2">
              {tables.map((table) => (
                <li key={table} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="text-gray-700">{table}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Supabase URL:</strong>{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_URL}
          </p>
        </div>
      </div>
    </div>
  );
}
