import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import TicketCard from "../../components/TicketCard";
import { Profile, supabase, Ticket } from "@/libs/supabaseclient";
import Navbar from "@/components/ Navbar";
import { convertStateData, INDIA_STATES } from "@/data/india";
import IndiaStateMap from "@/components/IndiaStateMap";

interface StateCount {
  stateId: string;
  count: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminDashboard() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce — only sets debouncedSearch, fetch is triggered in the effect below
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // When debounced search settles, reset to page 1 and fetch with current filters
  useEffect(() => {
    if (loading) return;
    setCurrentPage(1);
    fetchTickets(1, selectedState, statusFilter, debouncedSearch);
  }, [debouncedSearch]);

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

  const fetchStatusTotals = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await supabase.from("tickets").select("status");
      if (data) {
        const totals = {
          all: data.length,
          open: 0,
          in_progress: 0,
          resolved: 0,
        };
        data.forEach((t: { status: string }) => {
          if (t.status in totals) totals[t.status as keyof typeof totals]++;
        });
        setStatusTotals(totals);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUpvotes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("upvotes")
      .select("ticket_id")
      .eq("user_id", userId);
    if (data) setUserUpvotes(new Set(data.map((u: any) => u.ticket_id)));
  }, []);

  const fetchTickets = useCallback(
    async (page: number, stateId: string, status: string, search: string) => {
      setTicketsLoading(true);
      try {
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("tickets")
          .select("*", { count: "exact" })
          .order("upvotes", { ascending: false })
          .range(from, to);

        if (stateId) query = query.eq("state_id", stateId);
        if (status !== "all") query = query.eq("status", status);
        if (search)
          query = query.or(
            `title.ilike.%${search}%,description.ilike.%${search}%,constituency.ilike.%${search}%`,
          );

        const { data, count } = await query;
        if (data) setTickets(data);
        if (count !== null) setTotalTickets(count);
      } finally {
        setTicketsLoading(false);
      }
    },
    [],
  );

  // Initial load only — no filter/page effects
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
      await Promise.all([
        fetchTickets(1, "", "all", ""),
        fetchStateCounts(),
        fetchStatusTotals(),
        fetchUpvotes(user.id),
      ]);
      setLoading(false);
    };
    init();
  }, []);

  // ── Explicit handlers — pass values directly, never read stale state ──

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTickets(newPage, selectedState, statusFilter, debouncedSearch);
  };

  const handleStatusFilter = (
    s: "all" | "open" | "in_progress" | "resolved",
  ) => {
    setStatusFilter(s);
    setCurrentPage(1);
    fetchTickets(1, selectedState, s, debouncedSearch);
    fetchStatusTotals();
  };

  const handleStateChange = (stateId: string) => {
    setSelectedState(stateId);
    setCurrentPage(1);
    fetchTickets(1, stateId, statusFilter, debouncedSearch);
    fetchStatusTotals();
  };

  const handleClearState = () => {
    setSelectedState("");
    setCurrentPage(1);
    fetchTickets(1, "", statusFilter, debouncedSearch);
    fetchStatusTotals();
  };

  const handleRefresh = () => {
    fetchTickets(currentPage, selectedState, statusFilter, debouncedSearch);
    fetchStateCounts();
    fetchStatusTotals();
    if (profile) fetchUpvotes(profile.id);
  };

  const totalPages = Math.ceil(totalTickets / ITEMS_PER_PAGE);
  const formattedData = convertStateData(stateCounts);

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
          {(
            [
              {
                label: "Total",
                key: "all",
                color: "bg-gray-100 text-gray-700",
              },
              {
                label: "Open",
                key: "open",
                color: "bg-yellow-50 text-yellow-700",
              },
              {
                label: "In Progress",
                key: "in_progress",
                color: "bg-blue-50 text-blue-700",
              },
              {
                label: "Resolved",
                key: "resolved",
                color: "bg-green-50 text-green-700",
              },
            ] as const
          ).map(({ label, key, color }) => (
            <button
              key={key}
              onClick={() => handleStatusFilter(key)}
              className={`rounded-xl p-3 text-left transition-all ${color} ${
                statusFilter === key
                  ? "ring-2 ring-offset-1 ring-current"
                  : "border border-transparent hover:border-current hover:border-opacity-30"
              }`}
            >
              {statsLoading ? (
                <div className="h-8 w-12 rounded bg-current opacity-10 animate-pulse mb-1" />
              ) : (
                <div className="text-2xl font-bold">{statusTotals[key]}</div>
              )}
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

          {/* Right: Tickets */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8"
                />
                {searchQuery && searchQuery !== debouncedSearch && (
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-purple-400 absolute right-2.5 top-2.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
              </div>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
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
              <p className="text-sm text-gray-600 flex items-center gap-2">
                {ticketsLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-purple-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-gray-400">Loading tickets...</span>
                  </>
                ) : (
                  <span>
                    {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                    {statusFilter !== "all" && (
                      <span className="text-gray-400">
                        {" "}
                        ·{" "}
                        {statusFilter === "in_progress"
                          ? "in progress"
                          : statusFilter}
                      </span>
                    )}
                    {selectedState && (
                      <span className="text-gray-400">
                        {" "}
                        in {INDIA_STATES[selectedState]?.name}
                      </span>
                    )}
                    {debouncedSearch && (
                      <span className="text-gray-400">
                        {" "}
                        matching "{debouncedSearch}"
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>

            {ticketsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border p-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full" />
                    </div>
                    <div className="mt-3 h-3 bg-gray-100 rounded w-full" />
                    <div className="mt-1.5 h-3 bg-gray-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500 text-sm">
                  No tickets match your filters.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {tickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      userUpvoted={userUpvotes.has(ticket.id)}
                      currentUserId={profile?.id}
                      isAdmin={true}
                      onUpdate={handleRefresh}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() =>
                        handlePageChange(Math.max(currentPage - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        handlePageChange(Math.min(currentPage + 1, totalPages))
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
    </div>
  );
}
