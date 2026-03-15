import { supabase, Ticket } from "@/libs/supabaseclient";
import { useState } from "react";

interface TicketCardProps {
  ticket: Ticket;
  userUpvoted: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onUpdate: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_LABELS: Record<string, string> = {
  open: "🟡 Open",
  in_progress: "🔵 In Progress",
  resolved: "🟢 Resolve",
};

function ResolveModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Mark as Resolved</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Add a note explaining how this was resolved
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resolution Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Road repair completed by PWD on 12 March. Work order #4521."
            rows={4}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            This note will be visible to all.
          </p>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading || !note.trim()}
            className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Resolving..." : "Mark Resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketCard({
  ticket,
  userUpvoted,
  currentUserId,
  isAdmin,
  onUpdate,
}: TicketCardProps) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const handleUpvote = async () => {
    if (!currentUserId || loading) return;
    setLoading(true);
    try {
      if (userUpvoted) {
        await supabase
          .from("upvotes")
          .delete()
          .match({ ticket_id: ticket.id, user_id: currentUserId });
      } else {
        await supabase
          .from("upvotes")
          .insert({ ticket_id: ticket.id, user_id: currentUserId });
      }
      onUpdate();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    // Intercept "resolved" to show modal first
    if (newStatus === "resolved") {
      setShowResolveModal(true);
      return;
    }
    setStatusLoading(true);
    await supabase
      .from("tickets")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        resolve_note: null,
        resolved_at: null,
        resolved_by: null,
      })
      .eq("id", ticket.id);
    setStatusLoading(false);
    onUpdate();
  };

  const handleResolveConfirm = async (note: string) => {
    setStatusLoading(true);
    await supabase
      .from("tickets")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString(),
        resolve_note: note,
        resolved_at: new Date().toISOString(),
        resolved_by: currentUserId,
      })
      .eq("id", ticket.id);
    setStatusLoading(false);
    setShowResolveModal(false);
    onUpdate();
  };

  return (
    <>
      <div
        className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
          ticket.status === "resolved" ? "opacity-75" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[ticket.status]}`}
              >
                {STATUS_LABELS[ticket.status]}
              </span>
              <span className="text-xs text-gray-400">
                {ticket.constituency}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
              {ticket.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {ticket.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>by {ticket.user_email || "Anonymous"}</span>
              <span>
                {new Date(ticket.created_at).toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleUpvote}
              disabled={!currentUserId || loading}
              className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${
                userUpvoted
                  ? "bg-orange-50 border-orange-300 text-orange-600"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-base">{userUpvoted ? "▲" : "△"}</span>
              <span className="text-xs font-bold">{ticket.upvotes}</span>
            </button>
          </div>
        </div>

        {/* Resolution note — visible to everyone when resolved */}
        {ticket.status === "resolved" && ticket.resolve_note && (
          <div className="mt-3 pt-3 border-t">
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-green-700 mb-0.5">
                Resolution Note
              </p>
              <p className="text-xs text-green-800">{ticket.resolve_note}</p>
              {ticket.resolved_at && (
                <p className="text-xs text-green-500 mt-1">
                  Resolved on{" "}
                  {new Date(ticket.resolved_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Admin status controls */}
        {isAdmin && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">Mark as:</span>
            {["open", "in_progress", "resolved"].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={ticket.status === s || statusLoading}
                className={`text-xs px-2 py-1 rounded border transition-all ${
                  ticket.status === s
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
                    : s === "resolved"
                      ? "bg-white text-green-700 border-green-300 hover:bg-green-50 hover:border-green-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {s === "resolved" ? "resolve" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {showResolveModal && (
        <ResolveModal
          onConfirm={handleResolveConfirm}
          onCancel={() => setShowResolveModal(false)}
          loading={statusLoading}
        />
      )}
    </>
  );
}
