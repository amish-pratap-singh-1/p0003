import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";

import IndiaMap from "../../components/IndiaMap";
import TicketCard from "../../components/TicketCard";
import { Profile, supabase, Ticket } from "@/libs/supabaseclient";
import Navbar from "@/components/ Navbar";
import { INDIA_STATES } from "@/data/india";

interface StateCount {
  stateId: string;
  count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setTickets(data);
      const counts: Record<string, number> = {};
      data.forEach((t: Ticket) => {
        counts[t.state_id] = (counts[t.state_id] || 0) + 1;
      });
      setStateCounts(
        Object.entries(counts).map(([stateId, count]) => ({
          stateId,
          count,
        })),
      );
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!p || p.role !== "admin") {
        router.push("/admin/login");
        return;
      }
      setProfile(p);
      await fetchTickets();
      setLoading(false);
    };
    init();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const stateMatch = !selectedState || t.state_id === selectedState;
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    const searchMatch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.constituency.toLowerCase().includes(searchQuery.toLowerCase());
    return stateMatch && statusMatch && searchMatch;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 animate-pulse text-sm">
          Loading admin panel...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded">
                ADMIN
              </span>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <p className="text-sm text-gray-500">
              Manage and resolve constituency tickets
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total",
              count: tickets.length,
              filter: "all",
              color: "bg-gray-100 text-gray-700",
            },
            {
              label: "Open",
              count: tickets.filter((t) => t.status === "open").length,
              filter: "open",
              color: "bg-yellow-50 text-yellow-700",
            },
            {
              label: "In Progress",
              count: tickets.filter((t) => t.status === "in_progress").length,
              filter: "in_progress",
              color: "bg-blue-50 text-blue-700",
            },
            {
              label: "Resolved",
              count: tickets.filter((t) => t.status === "resolved").length,
              filter: "resolved",
              color: "bg-green-50 text-green-700",
            },
          ].map(({ label, count, filter, color }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl p-3 text-left transition-all ${color} ${statusFilter === filter ? "ring-2 ring-offset-1 ring-current" : "border border-transparent hover:border-current hover:border-opacity-30"}`}
            >
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs opacity-70">{label}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left: Map */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">
                Issue Heatmap
              </h2>
              <IndiaMap
                stateData={stateCounts}
                onStateClick={(id) =>
                  setSelectedState((prev) => (prev === id ? "" : id))
                }
              />
              {selectedState && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">
                      {INDIA_STATES[selectedState]?.name}
                    </span>
                    <button
                      onClick={() => setSelectedState("")}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/state/${selectedState}`)}
                    className="mt-2 w-full text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 rounded-lg"
                  >
                    View state page →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Tickets */}
          <div className="flex-1 min-w-0">
            {/* Search + Filter */}
            <div className="flex gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">All States</option>
                {Object.entries(INDIA_STATES)
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .map(([id, { name }]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                {filteredTickets.length} ticket
                {filteredTickets.length !== 1 ? "s" : ""}
                {selectedState && ` in ${INDIA_STATES[selectedState]?.name}`}
              </p>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500 text-sm">
                  No tickets match your filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    userUpvoted={false}
                    currentUserId={profile?.id}
                    isAdmin={true}
                    onUpdate={fetchTickets}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
