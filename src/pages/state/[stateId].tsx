import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, Ticket, Profile } from "@/libs/supabaseclient";
import {
  convertConstituencyData,
  getStateNameFromId,
  INDIA_STATES,
} from "@/data/india";
import ConstituencyHeatmap from "../../components/ConstituencyHeatmap";
import TicketCard from "../../components/TicketCard";
import CreateTicketModal from "../../components/CreateTicketModal";
import Navbar from "@/components/ Navbar";
import IndiaConstMap from "@/components/IndiaConstMap";

export default function StatePage() {
  const router = useRouter();
  const { stateId } = router.query as { stateId: string };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const stateInfo = stateId ? INDIA_STATES[stateId] : null;

  const fetchTickets = useCallback(async () => {
    if (!stateId) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("state_id", stateId)
      .order("upvotes", { ascending: false });
    if (data) setTickets(data);
  }, [stateId]);

  const fetchUpvotes = async (userId: string) => {
    const { data } = await supabase
      .from("upvotes")
      .select("ticket_id")
      .eq("user_id", userId);
    if (data) setUserUpvotes(new Set(data.map((u: any) => u.ticket_id)));
  };

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
      await fetchTickets();
      setLoading(false);
    };
    init();
  }, [stateId]);

  const handleRefresh = () => {
    fetchTickets();
    if (profile) fetchUpvotes(profile.id);
  };

  // Build constituency data
  const constituencyData =
    stateInfo?.constituencies.map((name) => ({
      name,
      count: tickets.filter((t) => t.constituency === name).length,
    })) || [];
  console.log(constituencyData);
  const filteredTickets = tickets.filter((t) => {
    const cMatch =
      !selectedConstituency || t.constituency === selectedConstituency;
    const sMatch = statusFilter === "all" || t.status === statusFilter;
    return cMatch && sMatch;
  });
  console.log(constituencyData, "--hello");
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
              {tickets.length} total ticket{tickets.length !== 1 ? "s" : ""}{" "}
              across {stateInfo.constituencies.length} constituencies
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
        <div>
          <IndiaConstMap
            data={convertConstituencyData(constituencyData)}
            stateName={getStateNameFromId(stateId) || "MP"}
          />
        </div>

        {/* Constituency Heatmap */}
        <div className="bg-white rounded-2xl border p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">
            Constituency Heatmap
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Click a constituency to filter tickets
          </p>
          <ConstituencyHeatmap
            data={constituencyData}
            selectedConstituency={selectedConstituency}
            onSelect={(c) =>
              setSelectedConstituency((prev) => (prev === c ? "" : c))
            }
          />
        </div>

        {/* Filters + Tickets */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Tickets</h2>
              {selectedConstituency && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                  {selectedConstituency}
                  <button
                    onClick={() => setSelectedConstituency("")}
                    className="ml-1 hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {["all", "open", "in_progress", "resolved"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    statusFilter === s
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-gray-400 text-sm">No tickets here yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
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
