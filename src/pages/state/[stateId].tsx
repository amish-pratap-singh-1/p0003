import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, Ticket, Profile } from "@/libs/supabaseclient";
import { getStateNameFromId, INDIA_STATES } from "@/data/india";
import TicketCard from "../../components/TicketCard";
import CreateTicketModal from "../../components/CreateTicketModal";
import Navbar from "@/components/ Navbar";
import IndiaConstMap from "@/components/IndiaConstMap";

const ITEMS_PER_PAGE = 10;
interface ConstituencyData {
  pc_name: string;
  value: number;
}

export default function StatePage() {
  const router = useRouter();
  const { stateId } = router.query as { stateId: string };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  const [constituencyData, setConstituencyData] = useState<ConstituencyData[]>(
    [],
  );
  const [statusTotals, setStatusTotals] = useState({
    all: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const stateInfo = stateId ? INDIA_STATES[stateId] : null;

  // Fetch constituency counts for the map — always global within the state
  const fetchConstituencyCounts = useCallback(async () => {
    if (!stateId) return;
    const { data } = await supabase
      .from("tickets")
      .select("constituency")
      .eq("state_id", stateId);
    if (data && stateInfo) {
      const counts: Record<string, number> = {};
      data.forEach((t: { constituency: string }) => {
        counts[t.constituency] = (counts[t.constituency] || 0) + 1;
      });
      setConstituencyData(
        stateInfo.constituencies.map((name) => ({
          pc_name: name,
          value: counts[name] || 0,
        })),
      );
    }
  }, [stateId, stateInfo]);

  // Fetch status totals — always global within the state
  const fetchStatusTotals = useCallback(async () => {
    if (!stateId) return;
    const { data } = await supabase
      .from("tickets")
      .select("status")
      .eq("state_id", stateId);
    if (data) {
      const totals = { all: data.length, open: 0, in_progress: 0, resolved: 0 };
      data.forEach((t: { status: string }) => {
        if (t.status in totals) totals[t.status as keyof typeof totals]++;
      });
      setStatusTotals(totals);
    }
  }, [stateId]);

  // Fetch paginated + filtered tickets
  const fetchTickets = useCallback(
    async (page: number, constituency: string, status: string) => {
      if (!stateId) return;
      setTicketsLoading(true);
      try {
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("tickets")
          .select("*", { count: "exact" })
          .eq("state_id", stateId)
          .order("upvotes", { ascending: false })
          .range(from, to);

        if (constituency) query = query.eq("constituency", constituency);
        if (status !== "all") query = query.eq("status", status);

        const { data, count } = await query;
        if (data) setTickets(data);
        if (count !== null) setTotalTickets(count);
      } finally {
        setTicketsLoading(false);
      }
    },
    [stateId],
  );

  const fetchUpvotes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("upvotes")
      .select("ticket_id")
      .eq("user_id", userId);
    if (data) setUserUpvotes(new Set(data.map((u: any) => u.ticket_id)));
  }, []);

  // Initial load only — no filter/page effects
  useEffect(() => {
    if (!stateId) return;
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (p) {
          setProfile(p);
          await fetchUpvotes(user.id);
        }
      }
      await Promise.all([
        fetchTickets(1, "", "all"),
        fetchConstituencyCounts(),
        fetchStatusTotals(),
      ]);
      setLoading(false);
    };
    init();
  }, [stateId]);

  // ── Explicit handlers — pass values directly, never read stale state ──

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTickets(newPage, selectedConstituency, statusFilter);
  };

  const handleStatusFilter = (
    s: "all" | "open" | "in_progress" | "resolved",
  ) => {
    setStatusFilter(s);
    setCurrentPage(1);
    fetchTickets(1, selectedConstituency, s);
    fetchStatusTotals();
  };

  const handleConstituencySelect = (name: string) => {
    const next = selectedConstituency === name ? "" : name;
    setSelectedConstituency(next);
    setCurrentPage(1);
    fetchTickets(1, next, statusFilter);
    fetchStatusTotals();
  };

  const handleRefresh = () => {
    fetchTickets(currentPage, selectedConstituency, statusFilter);
    fetchConstituencyCounts();
    fetchStatusTotals();
    if (profile) fetchUpvotes(profile.id);
  };

  const totalPages = Math.ceil(totalTickets / ITEMS_PER_PAGE);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 animate-pulse text-sm">
          Loading state data...
        </div>
      </div>
    );

  if (!stateInfo)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">State not found</p>
          <Link href="/" className="text-blue-600 text-sm mt-2 block">
            ← Go home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link
            href={profile?.role === "admin" ? "/admin/dashboard" : "/dashboard"}
            className="hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{stateInfo.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {stateInfo.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {statusTotals.all} total ticket
              {statusTotals.all !== 1 ? "s" : ""} across{" "}
              {stateInfo.constituencies.length} constituencies
            </p>
          </div>
          {profile && profile.role !== "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg text-sm"
            >
              + New Ticket
            </button>
          )}
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl border p-5 mb-6 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">
            Click a constituency to filter tickets
          </p>
          <IndiaConstMap
            data={constituencyData}
            stateName={getStateNameFromId(stateId) || "MP"}
            selectedConstituency={selectedConstituency}
            onSelect={handleConstituencySelect}
          />
        </div>

        {/* Filters + Tickets */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                {ticketsLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-orange-500"
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
                    <span className="text-gray-400 font-normal text-sm">
                      Loading tickets...
                    </span>
                  </>
                ) : (
                  <span>
                    {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                    {statusFilter !== "all" && (
                      <span className="text-gray-400 font-normal">
                        {" "}
                        ·{" "}
                        {statusFilter === "in_progress"
                          ? "in progress"
                          : statusFilter}
                      </span>
                    )}
                    {selectedConstituency && (
                      <span className="text-gray-400 font-normal">
                        {" "}
                        in {selectedConstituency}
                      </span>
                    )}
                  </span>
                )}
              </h2>
              {selectedConstituency && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                  {selectedConstituency}
                  <button
                    onClick={() =>
                      handleConstituencySelect(selectedConstituency)
                    }
                    className="ml-1 hover:text-blue-900 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>

            {/* Status filter buttons */}
            <div className="flex gap-2">
              {(["all", "open", "in_progress", "resolved"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      statusFilter === s
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {s.replace("_", " ")}
                    <span
                      className={`ml-1.5 ${statusFilter === s ? "opacity-70" : "text-gray-400"}`}
                    >
                      {statusTotals[s]}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          {ticketsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-4 animate-pulse bg-gray-50"
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
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-gray-400 text-sm">No tickets here yet.</p>
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
                    isAdmin={profile?.role === "admin"}
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

      {showModal && profile && (
        <CreateTicketModal
          userId={profile.id}
          userEmail={profile.email}
          defaultStateId={stateId}
          onClose={() => setShowModal(false)}
          onCreated={handleRefresh}
        />
      )}
    </div>
  );
}
