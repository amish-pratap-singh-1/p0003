import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Profile, supabase } from "@/libs/supabaseclient";
import Navbar from "@/components/ Navbar";
import IndiaMap from "@/components/IndiaMap";

interface StateCount {
  stateId: string;
  count: number;
}

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [resolvedTickets, setResolvedTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const { data } = await supabase.from("tickets").select("state_id, status");
    if (!data) return;

    setTotalTickets(data.length);
    setResolvedTickets(data.filter((t) => t.status === "resolved").length);

    const counts: Record<string, number> = {};
    data.forEach((t) => {
      counts[t.state_id] = (counts[t.state_id] || 0) + 1;
    });
    setStateCounts(
      Object.entries(counts).map(([stateId, count]) => ({ stateId, count })),
    );
  };
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile(data);
          if (data.role === "admin") router.push("/admin/dashboard");
          else router.push("/dashboard");
          return;
        }
      }
      await fetchStats();
      setLoading(false);
    };
    init();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            🇮🇳 Constituency-Based Issue Tracker
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            JanConnect
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
            Report civic issues in your constituency. Click on any state to
            explore and upvote tickets.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <a
              href="/login"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-5 py-2.5 rounded-lg text-sm border border-gray-200 transition-colors"
            >
              Browse Tickets
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
          {[
            {
              label: "Total Tickets",
              value: totalTickets,
              color: "text-blue-600",
            },
            {
              label: "Resolved",
              value: resolvedTickets,
              color: "text-green-600",
            },
            {
              label: "States Active",
              value: stateCounts.length,
              color: "text-orange-600",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl border p-4 text-center"
            >
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Issue Heatmap</h2>
          <p className="text-xs text-gray-400 mb-6">
            Click on a state to see constituency-level data
          </p>
          <div className="flex justify-center">
            <IndiaMap stateData={stateCounts} />
          </div>
        </div>
      </main>
    </div>
  );
}
