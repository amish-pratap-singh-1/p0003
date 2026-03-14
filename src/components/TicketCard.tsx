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
  resolved: "🟢 Resolved",
};

export default function TicketCard({
  ticket,
  userUpvoted,
  currentUserId,
  isAdmin,
  onUpdate,
}: TicketCardProps) {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

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
    setStatusLoading(true);
    await supabase
      .from("tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", ticket.id);
    setStatusLoading(false);
    onUpdate();
  };

  return (
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
            <span className="text-xs text-gray-400">{ticket.constituency}</span>
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
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
