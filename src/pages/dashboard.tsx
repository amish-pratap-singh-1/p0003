import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { convertStateData, INDIA_STATES } from "../data/india";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";
import { Profile, supabase, Ticket } from "@/libs/supabaseclient";
import Navbar from "@/components/ Navbar";
import IndiaStateMap from "@/components/IndiaStateMap";

interface StateCount {
  stateId: string;
  count: number;
}

const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [statusTotals, setStatusTotals] = useState({
    all: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [selectedState, setSelectedState] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch per-state ticket counts for the map (always global, no filters)
  const fetchStateCounts = useCallback(async () => {
    const { data } = await supabase.from("tickets").select("state_id");
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((t: { state_id: string }) => {
        counts[t.state_id] = (counts[t.state_id] || 0) + 1;
      });
      setStateCounts(
        Object.entries(counts).map(([stateId, count]) => ({ stateId, count })),
      );
    }
  }, []);

  // Fetch status summary counts (respects state filter but not status filter)
  const fetchStatusTotals = useCallback(async (stateId: string) => {
    let query = supabase.from("tickets").select("status");
    if (stateId) query = query.eq("state_id", stateId);
    const { data } = await query;
    if (data) {
      const totals = { all: data.length, open: 0, in_progress: 0, resolved: 0 };
      data.forEach((t: { status: string }) => {
        if (t.status in totals) totals[t.status as keyof typeof totals]++;
      });
      setStatusTotals(totals);
    }
  }, []);

  // Fetch paginated + filtered tickets from DB
  const fetchTickets = useCallback(
    async (page: number, stateId: string, status: string) => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("tickets")
        .select("*", { count: "exact" })
        .order("upvotes", { ascending: false })
        .range(from, to);

      if (stateId) query = query.eq("state_id", stateId);
      if (status !== "all") query = query.eq("status", status);

      const { data, count } = await query;
      if (data) setTickets(data);
      if (count !== null) setTotalTickets(count);
    },
    [],
  );

  const fetchUpvotes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("upvotes")
      .select("ticket_id")
      .eq("user_id", userId);
    if (data) setUserUpvotes(new Set(data.map((u: any) => u.ticket_id)));
  }, []);

  // Initial auth + data load
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
      await Promise.all([
        fetchTickets(1, "", "all"),
        fetchStateCounts(),
        fetchStatusTotals(""),
        fetchUpvotes(user.id),
      ]);
      setLoading(false);
    };
    init();
  }, []);

  // Re-fetch when filters or page change
  useEffect(() => {
    if (!loading) {
      fetchTickets(currentPage, selectedState, statusFilter);
    }
  }, [currentPage, selectedState, statusFilter]);

  // Reset to page 1 and refresh status totals when state/status filter changes
  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      fetchStatusTotals(selectedState);
    }
  }, [selectedState, statusFilter]);

  const handleRefresh = () => {
    if (profile) {
      fetchTickets(currentPage, selectedState, statusFilter);
      fetchStateCounts();
      fetchStatusTotals(selectedState);
      fetchUpvotes(profile.id);
    }
  };

  const totalPages = Math.ceil(totalTickets / ITEMS_PER_PAGE);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 animate-pulse text-sm">
          Loading your dashboard...
        </div>
      </div>
    );

  const formattedData = convertStateData(stateCounts);

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
          {(
            [
              {
                label: "Total",
                key: "all",
                color: "bg-blue-50 text-blue-700 border-blue-100",
              },
              {
                label: "Open",
                key: "open",
                color: "bg-yellow-50 text-yellow-700 border-yellow-100",
              },
              {
                label: "In Progress",
                key: "in_progress",
                color: "bg-blue-50 text-blue-700 border-blue-100",
              },
              {
                label: "Resolved",
                key: "resolved",
                color: "bg-green-50 text-green-700 border-green-100",
              },
            ] as const
          ).map(({ label, key, color }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-xl border p-3 text-left transition-all ${color} ${
                statusFilter === key ? "ring-2 ring-offset-1 ring-current" : ""
              }`}
            >
              <div className="text-xl font-bold">{statusTotals[key]}</div>
              <div className="text-xs opacity-70">{label}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-110 flex-shrink-0">
            <div className="bg-white rounded-2xl border p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">
                Click a state to see its tickets
              </h2>
              <div className="grid h-120">
                <IndiaStateMap data={formattedData} />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-4 flex gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="flex-1 border border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                {selectedState && ` in ${INDIA_STATES[selectedState]?.name}`}
              </h2>
            </div>

            {tickets.length === 0 ? (
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
              <>
                <div className="space-y-3">
                  {tickets.map((ticket) => (
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
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
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
