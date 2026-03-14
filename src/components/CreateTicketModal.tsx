import { INDIA_STATES } from "@/data/india";
import { supabase } from "@/libs/supabaseclient";
import { useState } from "react";

interface CreateTicketModalProps {
  userId: string;
  userEmail: string;
  defaultStateId?: string;
  defaultConstituency?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTicketModal({
  userId,
  userEmail,
  defaultStateId,
  defaultConstituency,
  onClose,
  onCreated,
}: CreateTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stateId, setStateId] = useState(defaultStateId || "");
  const [constituency, setConstituency] = useState(defaultConstituency || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const constituencies = stateId
    ? INDIA_STATES[stateId]?.constituencies || []
    : [];

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !stateId || !constituency) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.from("tickets").insert({
      title: title.trim(),
      description: description.trim(),
      state_id: stateId,
      state_name: INDIA_STATES[stateId].name,
      constituency,
      created_by: userId,
      user_email: userEmail,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-gray-900">Create New Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for the issue..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={stateId}
                onChange={(e) => {
                  setStateId(e.target.value);
                  setConstituency("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select state</option>
                {Object.entries(INDIA_STATES)
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .map(([id, { name }]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Constituency
              </label>
              <select
                value={constituency}
                onChange={(e) => setConstituency(e.target.value)}
                disabled={!stateId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Select constituency</option>
                {constituencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
