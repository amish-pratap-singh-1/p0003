import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { INDIA_STATES } from "../data/india";
import IndiaMap from "../components/IndiaMap";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";
import { Profile, supabase, Ticket } from "@/libs/supabaseclient";
import Navbar from "@/components/ Navbar";

interface StateCount {
  stateId: string;
  count: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"map" | "list">("map");

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("upvotes", { ascending: false });
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

  const fetchUpvotes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("upvotes")
      .select("ticket_id")
      .eq("user_id", userId);
    if (data) setUserUpvotes(new Set(data.map((u: any) => u.ticket_id)));
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!p) {
        router.push("/login");
        return;
      }
      if (p.role === "admin") {
        router.push("/admin/dashboard");
        return;
      }
      setProfile(p);
      await Promise.all([fetchTickets(), fetchUpvotes(user.id)]);
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = () => {
    if (profile) {
      fetchTickets();
      fetchUpvotes(profile.id);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const stateMatch = !selectedState || t.state_id === selectedState;
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    return stateMatch && statusMatch;
  });

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 animate-pulse text-sm">
          Loading your dashboard...
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
            <h1 className="text-xl font-bold text-gray-900">
              Welcome, {profile?.full_name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Browse tickets or report a new issue
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <span>+</span> New Ticket
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total",
              count: tickets.length,
              filter: "all",
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "Open",
              count: tickets.filter((t) => t.status === "open").length,
              filter: "open",
              color: "bg-yellow-50 text-yellow-700 border-yellow-100",
            },
            {
              label: "In Progress",
              count: tickets.filter((t) => t.status === "in_progress").length,
              filter: "in_progress",
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "Resolved",
              count: tickets.filter((t) => t.status === "resolved").length,
              filter: "resolved",
              color: "bg-green-50 text-green-700 border-green-100",
            },
          ].map(({ label, count, filter, color }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-xl border p-3 text-left transition-all ${color} ${statusFilter === filter ? "ring-2 ring-offset-1 ring-current" : ""}`}
            >
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs opacity-70">{label}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Left: Map or controls */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">
                Filter by State
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
                    <span className="text-sm font-medium text-blue-700">
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
                    className="mt-2 w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg transition-colors"
                  >
                    View state page →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Tickets */}
          <div className="flex-1 min-w-0">
            {/* Mobile state selector */}
            <div className="lg:hidden mb-4 flex gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">
                {filteredTickets.length} ticket
                {filteredTickets.length !== 1 ? "s" : ""}
                {selectedState && ` in ${INDIA_STATES[selectedState]?.name}`}
              </h2>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm">No tickets found.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-sm text-orange-600 hover:underline"
                >
                  Create the first one →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    userUpvoted={userUpvotes.has(ticket.id)}
                    currentUserId={profile?.id}
                    isAdmin={false}
                    onUpdate={handleRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && profile && (
        <CreateTicketModal
          userId={profile.id}
          userEmail={profile.email}
          defaultStateId={selectedState}
          onClose={() => setShowModal(false)}
          onCreated={handleRefresh}
        />
      )}
    </div>
  );
}
