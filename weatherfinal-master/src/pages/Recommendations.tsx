import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Wind,
  Waves,
  Cloud,
  Navigation,
  Clock,
  MapPin,
  Bell,
  Filter,
  CheckCircle,
  X,
  RefreshCw,
  Settings,
  Download,
  Eye,
  Search,
  FileJson,
  FileText,
  Users,
  Play,
  Pause,
  Speaker,
  BellOff,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * Recommendations.tsx
 *
 * Full-featured, self-contained Recommendations UI for maritime operations.
 * - Horizontal row layout (no cards grid) with color-coded severity band
 * - Details modal (same style as Alerts)
 * - Toast notifications
 * - Confirmation modals for bulk/dangerous actions
 * - Filters, search, sorting, pagination
 * - CSV / JSON export
 * - Preferences (mock save)
 *
 * This single file is intentionally verbose and includes helpful utilities,
 * comments and small helper components so it compiles in a typical React + Tailwind
 * + lucide-react environment where `Card`, `Button`, and `Badge` exist.
 *
 * NOTE: adapt imports if your component library API differs.
 */

/* ============================
   Types
   ============================ */

type Severity = "high" | "medium" | "low";

type Recommendation = {
  id: number;
  title: string;
  description: string;
  severity: Severity;
  location: string;
  coordinates?: { lat: number; lon: number };
  issuedAt: Date;
  duration?: string;
  source?: string;
  acknowledged?: boolean;
  priority?: number;
  affectedVessels?: number;
  recommendations?: string[];
  riskLevel?: string;
};

type ToastItem = {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
  duration?: number;
};

/* ============================
   Utility helpers
   ============================ */

/** Simple unique id generator */
const uid = (prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 10)}`;

/** clamp */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** formatting date/time */
const formatDateTime = (d?: Date) =>
  d
    ? d.toLocaleString("en-GB", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** deep clone (simple) */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/* ============================
   Mock data generator
   ============================ */

const baseNow = Date.now();

const seedRecommendations: Recommendation[] = [
  {
    id: 1,
    title: "Reduce Speed due to Heavy Seas",
    description:
      "Significant wave heights expected in sector south-east of port. Reduce speed to minimum safe speed and secure deck cargo. Watch for rogue waves during the next 12 hours.",
    severity: "high",
    location: "South-East Sector - 18.3°N, 73.8°E",
    coordinates: { lat: 18.3, lon: 73.8 },
    issuedAt: new Date(baseNow - 45 * 60 * 1000),
    duration: "12 hours",
    source: "Regional Meteorological Centre",
    acknowledged: false,
    priority: 1,
    affectedVessels: 7,
    recommendations: ["Reduce speed", "Secure deck cargo", "Post additional lookouts"],
    riskLevel: "EXTREME",
  },
  {
    id: 2,
    title: "Adjust Course - Avoid Shallow Banks",
    description:
      "Tidal changes and shifting sandbanks reported in the channel. Adjust course 3° north to maintain safe under-keel clearance for vessels deeper than 7m.",
    severity: "medium",
    location: "Eastern Channel - 12.9°N, 80.2°E",
    coordinates: { lat: 12.9, lon: 80.2 },
    issuedAt: new Date(baseNow - 120 * 60 * 1000),
    duration: "6 hours",
    source: "Navigation Authority",
    acknowledged: false,
    priority: 2,
    affectedVessels: 4,
    recommendations: ["Adjust course 3° N", "Check under-keel clearance", "Notify port authority"],
    riskLevel: "HIGH",
  },
  {
    id: 3,
    title: "Monitor Visibility - Fog Bank",
    description:
      "Dense fog reducing visibility to less than 1 nautical mile in lane approaches. Sound fog signals and use radar/AIS for navigation. Delay small craft departures.",
    severity: "medium",
    location: "Approach Lane - 50.6°N, 1.23°E",
    coordinates: { lat: 50.6, lon: 1.23 },
    issuedAt: new Date(baseNow - 30 * 60 * 1000),
    duration: "4 hours",
    source: "Port Control",
    acknowledged: true,
    priority: 3,
    affectedVessels: 12,
    recommendations: ["Reduce speed", "Sound fog signals", "Use radar and AIS"],
    riskLevel: "HIGH",
  },
  {
    id: 4,
    title: "Utilize Current Window for Departure",
    description:
      "Favorable current window predicted between 0600-0900 UTC. Adjust departure to utilize current assistance to conserve fuel and maintain schedule.",
    severity: "low",
    location: "Caribbean Transit - 18.9°N, 66.1°W",
    coordinates: { lat: 18.9, lon: -66.1 },
    issuedAt: new Date(baseNow - 10 * 60 * 1000),
    duration: "Next window 3 hours",
    source: "Oceanographic Institute",
    acknowledged: false,
    priority: 4,
    affectedVessels: 5,
    recommendations: ["Consider departing between 0600-0900 UTC", "Optimize ballast and trim"],
    riskLevel: "LOW",
  },
  {
    id: 5,
    title: "Secure Loose Equipment - High Gusts",
    description:
      "Gale force gusts expected with thunderstorms. Secure all loose equipment and restrict deck access during heavy gusts. Beware of shifting cargo on deck.",
    severity: "high",
    location: "North Atlantic - 35.2°N, -45.1°W",
    coordinates: { lat: 35.2, lon: -45.1 },
    issuedAt: new Date(baseNow - 150 * 60 * 1000),
    duration: "Next 24 hours",
    source: "National Weather Service",
    acknowledged: false,
    priority: 1,
    affectedVessels: 9,
    recommendations: ["Secure all loose equipment", "Reduce deck access", "Monitor watches closely"],
    riskLevel: "EXTREME",
  },
];

/**
 * Generate additional mock entries programmatically.
 * This keeps this file compact but populates plenty of data at runtime.
 */
const generatedRecommendations = Array.from({ length: 180 }, (_, idx) => {
  const id = seedRecommendations.length + 1 + idx;
  const severity: Severity = idx % 3 === 0 ? "low" : idx % 3 === 1 ? "medium" : "high";
  const title =
    severity === "high" ? `Critical Recommendation #${id}` : severity === "medium" ? `Advisory #${id}` : `Info Note #${id}`;
  const description =
    "This is an autogenerated recommendation used to test horizontal layout, clamped descriptions and responsive wrapping. Ensure nothing overflows and that UI remains readable across devices.";
  const issuedAt = new Date(baseNow - (idx + 1) * 60000);
  return {
    id,
    title,
    description,
    severity,
    location: idx % 2 === 0 ? "Test Sector A" : "Test Sector B",
    coordinates: { lat: 10 + idx * 0.01, lon: 70 + idx * 0.01 },
    issuedAt,
    duration: "Next 6 hours",
    source: "Automated System",
    acknowledged: idx % 7 === 0,
    priority: (idx % 5) + 1,
    affectedVessels: Math.floor(Math.random() * 12),
    recommendations: ["Check routing", "Adjust speed", "Report status"],
    riskLevel: severity === "high" ? "EXTREME" : severity === "medium" ? "HIGH" : "LOW",
  } as Recommendation;
});

const MOCK_RECOMMENDATIONS: Recommendation[] = [...seedRecommendations, ...generatedRecommendations];

/* ============================
   Styling helpers
   ============================ */

const severityColor = (s: Severity) => {
  switch (s) {
    case "high":
      return { band: "bg-red-600", text: "text-red-500", badge: "bg-red-600 text-white" };
    case "medium":
      return { band: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-500 text-white" };
    case "low":
      return { band: "bg-green-600", text: "text-green-400", badge: "bg-green-600 text-white" };
    default:
      return { band: "bg-gray-600", text: "text-gray-400", badge: "bg-gray-600 text-white" };
  }
};

/* ============================
   Small helper components
   ============================ */

/**
 * Toast - simple notification component used in the top-right stack.
 */
const Toast: React.FC<{ t: ToastItem; onClose: (id: string) => void }> = ({ t, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(t.id), t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t, onClose]);

  return (
    <div
      className={`max-w-md w-full rounded-lg shadow-md p-3 flex items-start gap-3 border ${
        t.type === "success"
          ? "bg-green-900 border-green-600 text-green-200"
          : t.type === "error"
          ? "bg-red-900 border-red-600 text-red-200"
          : "bg-blue-900 border-blue-600 text-blue-200"
      }`}
    >
      <div className="flex-0">
        {t.type === "success" && <CheckCircle className="h-6 w-6" />}
        {t.type === "error" && <X className="h-6 w-6" />}
        {t.type === "info" && <Info className="h-6 w-6" />}
      </div>
      <div className="flex-1">
        {t.title && <div className="font-semibold">{t.title}</div>}
        <div className="text-sm">{t.message}</div>
      </div>
      <div>
        <button onClick={() => onClose(t.id)} className="text-sm opacity-80 hover:opacity-100">
          Dismiss
        </button>
      </div>
    </div>
  );
};

/**
 * ConfirmationModal - generic confirm dialog overlay
 */
const ConfirmationModal: React.FC<{
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}> = ({ open, title = "Confirm", message = "", onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel" }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} className="bg-gray-800 text-white border-gray-600">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ============================
   Recommendation row (horizontal)
   ============================ */

const RecommendationRow: React.FC<{
  rec: Recommendation;
  onAcknowledge: (id: number) => void;
  onDismiss: (id: number) => void;
  onView: (rec: Recommendation) => void;
}> = ({ rec, onAcknowledge, onDismiss, onView }) => {
  const sc = severityColor(rec.severity);

  return (
    <article className="w-full flex items-stretch bg-gray-900 border border-gray-700 rounded-lg overflow-hidden" aria-labelledby={`rec-title-${rec.id}`}>
      <div className={`w-2 ${sc.band}`} />
      <div className="flex-1 p-4 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0 mt-0">
              {rec.severity === "high" ? <AlertTriangle className="h-6 w-6 text-red-400" /> : rec.severity === "medium" ? <Waves className="h-6 w-6 text-orange-400" /> : <Navigation className="h-6 w-6 text-green-400" />}
            </div>

            <div className="min-w-0">
              <div id={`rec-title-${rec.id}`} className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white truncate">{rec.title}</h3>
                <Badge className={`text-xs ${sc.badge}`}>{rec.severity.toUpperCase()}</Badge>
                {rec.priority !== undefined && <Badge className="text-xs bg-purple-700 text-white">PRIORITY {rec.priority}</Badge>}
              </div>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">{rec.description}</p>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end text-right">
            <div className="text-xs text-gray-400">{formatDateTime(rec.issuedAt)}</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate w-40">{rec.location}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {!rec.acknowledged ? (
                <Button size="sm" onClick={() => onAcknowledge(rec.id)} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="h-4 w-4 mr-1" /> Acknowledge
                </Button>
              ) : (
                <div className="text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded">Acknowledged</div>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDismiss(rec.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onView(rec)} className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ============================
   Main component
   ============================ */

const Recommendations: React.FC = () => {
  // core data
  const [recs, setRecs] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [loading, setLoading] = useState<boolean>(false);

  // UI state
  const [filterSeverity, setFilterSeverity] = useState<"all" | Severity | "unacknowledged">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"time_desc" | "time_asc" | "priority_desc" | "priority_asc">("time_desc");
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(8);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

  // toast + confirm
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => void }>({ open: false });

  // preferences
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState({ high: true, medium: true, low: true, autoRefresh: false, sounds: false });

  // audio ref for sound notifications (optional)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // derived stats
  const stats = useMemo(
    () => ({
      total: recs.length,
      unack: recs.filter((r) => !r.acknowledged).length,
      high: recs.filter((r) => r.severity === "high").length,
      med: recs.filter((r) => r.severity === "medium").length,
      low: recs.filter((r) => r.severity === "low").length,
      affected: recs.reduce((s, r) => s + (r.affectedVessels ?? 0), 0),
    }),
    [recs]
  );

  // toast helpers
  const addToast = (t: Omit<ToastItem, "id">) => {
    const itm: ToastItem = { id: uid("t_"), duration: 4000, ...t };
    setToasts((cur) => [...cur, itm]);
    if (t.type === "success" && preferences.sounds && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      } catch {
        // ignore play errors
      }
    }
  };

  const removeToast = (id: string) => setToasts((cur) => cur.filter((x) => x.id !== id));

  // simulate initial load and audio
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YQAAAAA=");
    setLoading(true);
    const t = setTimeout(() => {
      setRecs(MOCK_RECOMMENDATIONS);
      setLoading(false);
      addToast({ type: "info", message: "Recommendations loaded" });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtering + Sorting
  const filteredSorted = useMemo(() => {
    let list = recs.slice();

    if (filterSeverity === "unacknowledged") list = list.filter((r) => !r.acknowledged);
    else if (filterSeverity !== "all") list = list.filter((r) => r.severity === filterSeverity);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || (r.source ?? "").toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "time_desc":
        list.sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0));
        break;
      case "time_asc":
        list.sort((a, b) => (a.issuedAt?.getTime() ?? 0) - (b.issuedAt?.getTime() ?? 0));
        break;
      case "priority_desc":
        list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        break;
      case "priority_asc":
        list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
        break;
    }

    return list;
  }, [recs, filterSeverity, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / perPage));
  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const startIndex = (page - 1) * perPage;
  const paginated = filteredSorted.slice(startIndex, startIndex + perPage);

  /* ============================
     Actions
     ============================ */

  const acknowledgeOne = (id: number) => {
    setRecs((cur) => cur.map((r) => (r.id === id ? { ...r, acknowledged: true } : r)));
    addToast({ type: "success", message: `Recommendation ${id} acknowledged` });
  };

  const dismissOne = (id: number) => {
    const item = recs.find((r) => r.id === id);
    setConfirm({
      open: true,
      title: `Dismiss Recommendation #${id}`,
      message: `Are you sure you want to dismiss:\n\n"${item?.title}"\n\nThis will remove it from the active list.`,
      onConfirm: () => {
        setRecs((cur) => cur.filter((r) => r.id !== id));
        addToast({ type: "info", message: `Recommendation "${item?.title}" dismissed` });
        setConfirm({ open: false });
      },
    });
  };

  const viewDetails = (rec: Recommendation) => {
    setSelectedRec(rec);
  };

  const acknowledgeAll = () => {
    const unack = recs.filter((r) => !r.acknowledged).length;
    if (unack === 0) {
      addToast({ type: "info", message: "No unacknowledged recommendations" });
      return;
    }
    setConfirm({
      open: true,
      title: `Acknowledge All (${unack})`,
      message: `Acknowledge all ${unack} unacknowledged recommendations?`,
      onConfirm: () => {
        setRecs((cur) => cur.map((r) => ({ ...r, acknowledged: true })));
        addToast({ type: "success", message: `Acknowledged ${unack} recommendations` });
        setConfirm({ open: false });
      },
    });
  };

  const dismissAll = () => {
    if (recs.length === 0) {
      addToast({ type: "info", message: "No recommendations to dismiss" });
      return;
    }
    setConfirm({
      open: true,
      title: `Dismiss All (${recs.length})`,
      message: `Dismiss all ${recs.length} recommendations? This will clear the active list.`,
      onConfirm: () => {
        setRecs([]);
        addToast({ type: "info", message: "All recommendations dismissed" });
        setConfirm({ open: false });
      },
    });
  };

  // Export CSV
  const exportCSV = () => {
    const header = ["ID", "Title", "Severity", "Location", "IssuedAt", "Duration", "Source", "Acknowledged", "Priority", "AffectedVessels"];
    const rows = filteredSorted.map((r) =>
      [
        r.id,
        `"${(r.title || "").replaceAll('"', '""')}"`,
        r.severity,
        `"${(r.location || "").replaceAll('"', '""')}"`,
        r.issuedAt.toISOString(),
        `"${(r.duration || "").replaceAll('"', '""')}"`,
        `"${(r.source || "").replaceAll('"', '""')}"`,
        r.acknowledged ? "Yes" : "No",
        r.priority ?? "",
        r.affectedVessels ?? "",
      ].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recommendations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: "info", message: "Exported recommendations CSV" });
  };

  // Export JSON
  const exportJSON = () => {
    const data = JSON.stringify(filteredSorted, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recommendations-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: "info", message: "Exported recommendations JSON" });
  };

  // Save preferences (mock)
  const savePreferences = (p: typeof preferences) => {
    setPreferences(p);
    setPreferencesOpen(false);
    addToast({ type: "success", message: "Preferences saved" });
  };

  // refresh mock
  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast({ type: "info", message: "Recommendations refreshed" });
    }, 700);
  };

  // clear notifications
  const clearAllToasts = () => setToasts([]);

  /* ============================
     Render
     ============================ */

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <Toast key={t.id} t={t} onClose={removeToast} />
        ))}
      </div>

      {/* Confirm */}
      <ConfirmationModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={() => {
          try {
            confirm.onConfirm && confirm.onConfirm();
          } catch (err) {
            addToast({ type: "error", message: "Action failed" });
          }
        }}
        onCancel={() => setConfirm({ open: false })}
      />

      {/* Preferences modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Recommendation Preferences</h3>
              <div>
                <Button variant="ghost" onClick={() => setPreferencesOpen(false)} className="text-gray-300">
                  Close
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-2">Severity Preferences</h4>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={preferences.high} onChange={() => setPreferences((p) => ({ ...p, high: !p.high }))} />
                    Receive High severity recommendations
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={preferences.medium} onChange={() => setPreferences((p) => ({ ...p, medium: !p.medium }))} />
                    Receive Medium severity recommendations
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={preferences.low} onChange={() => setPreferences((p) => ({ ...p, low: !p.low }))} />
                    Receive Low severity recommendations
                  </label>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-2">Behavior</h4>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={preferences.autoRefresh} onChange={() => setPreferences((p) => ({ ...p, autoRefresh: !p.autoRefresh }))} />
                    Auto-refresh every 5 minutes
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={preferences.sounds} onChange={() => setPreferences((p) => ({ ...p, sounds: !p.sounds }))} />
                    Enable sound on important recommendations
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="bg-gray-800 text-white border-gray-600">
                Cancel
              </Button>
              <Button onClick={() => savePreferences(preferences)} className="bg-green-600 hover:bg-green-700 text-white">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Controls */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" /> Maritime Recommendations
            </h1>
            <p className="text-gray-300 mt-2">Operational recommendations and advisories (horizontal layout)</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg">
              <Speaker className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-300">Sound</span>
              <button
                onClick={() => {
                  setPreferences((p) => ({ ...p, sounds: !p.sounds }));
                  addToast({ type: "info", message: `Sound ${preferences.sounds ? "disabled" : "enabled"}` });
                }}
                className="ml-2 text-sm px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
              >
                {preferences.sounds ? <Bell className="h-4 w-4 inline" /> : <BellOff className="h-4 w-4 inline" />}
              </button>
            </div>

            <Button onClick={() => setPreferencesOpen(true)} variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
              <Settings className="h-4 w-4 mr-2" /> Preferences
            </Button>

            <Button onClick={refresh} variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Recs</div>
            </div>
          </Card>

          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.unack}</div>
              <div className="text-sm text-gray-400">Unacknowledged</div>
            </div>
          </Card>

          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.high}</div>
              <div className="text-sm text-gray-400">High</div>
            </div>
          </Card>

          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{stats.med}</div>
              <div className="text-sm text-gray-400">Medium</div>
            </div>
          </Card>

          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.low}</div>
              <div className="text-sm text-gray-400">Low</div>
            </div>
          </Card>

          <Card className="p-3 bg-gray-900 border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{stats.affected}</div>
              <div className="text-sm text-gray-400">Vessels Affected</div>
            </div>
          </Card>
        </div>

        {/* Control Bar */}
        <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as any)}
                className="px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white"
              >
                <option value="all">All ({recs.length})</option>
                <option value="high">High ({recs.filter((r) => r.severity === "high").length})</option>
                <option value="medium">Medium ({recs.filter((r) => r.severity === "medium").length})</option>
                <option value="low">Low ({recs.filter((r) => r.severity === "low").length})</option>
                <option value="unacknowledged">Unacknowledged ({recs.filter((r) => !r.acknowledged).length})</option>
              </select>

              <div className="relative flex items-center">
                <Search className="h-4 w-4 absolute left-2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, description, location..."
                  className="pl-8 pr-3 py-2 rounded-md bg-gray-800 text-white border border-gray-600 w-72"
                />
              </div>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white">
                <option value="time_desc">Newest</option>
                <option value="time_asc">Oldest</option>
                <option value="priority_desc">Priority (High → Low)</option>
                <option value="priority_asc">Priority (Low → High)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={acknowledgeAll} size="sm" variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Acknowledge All
              </Button>
              <Button onClick={dismissAll} size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                <X className="h-4 w-4" /> Dismiss All
              </Button>
              <Button onClick={exportCSV} size="sm" variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button onClick={exportJSON} size="sm" variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                <FileJson className="h-4 w-4 mr-2" /> Export JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal recommendations list */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-3 text-lg text-gray-300">Loading recommendations...</span>
            </div>
          ) : paginated.length === 0 ? (
            <Card className="p-6 bg-gray-900 border-gray-700 text-center">
              <div className="text-white font-semibold">No recommendations found</div>
              <div className="text-gray-400">Try adjusting filters or search</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {paginated.map((rec) => (
                <RecommendationRow key={rec.id} rec={rec} onAcknowledge={acknowledgeOne} onDismiss={dismissOne} onView={viewDetails} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-300">
              Showing <span className="text-white font-semibold">{filteredSorted.length === 0 ? 0 : startIndex + 1}</span> -{" "}
              <span className="text-white font-semibold">{Math.min(page * perPage, filteredSorted.length)}</span> of <span className="text-white font-semibold">{filteredSorted.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))} className="bg-gray-800 text-white border-gray-600">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-gray-300">
                Page <span className="text-white">{page}</span> / <span className="text-white">{totalPages}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))} className="bg-gray-800 text-white border-gray-600">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="bg-gray-800 text-white px-2 py-1 rounded">
                <option value={6}>6 / page</option>
                <option value={8}>8 / page</option>
                <option value={12}>12 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        {selectedRec && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                  <h2 className="text-2xl font-bold text-white">Recommendation Details</h2>
                </div>
                <Button onClick={() => setSelectedRec(null)} variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{selectedRec.title}</h3>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${severityColor(selectedRec.severity).badge}`}>{selectedRec.severity.toUpperCase()}</Badge>
                    {selectedRec.priority !== undefined && <Badge className="text-xs bg-purple-700 text-white">PRIORITY {selectedRec.priority}</Badge>}
                    <Badge className="text-xs bg-blue-800 text-white">RECOMMENDATION ID: {selectedRec.id}</Badge>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-300 leading-relaxed">{selectedRec.description}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-400" /> Location Info
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>
                        <span className="font-medium text-white">Position:</span> {selectedRec.location}
                      </div>
                      {selectedRec.coordinates && (
                        <div>
                          <span className="font-medium text-white">Coordinates:</span> {selectedRec.coordinates.lat}°N, {Math.abs(selectedRec.coordinates.lon)}°
                          {selectedRec.coordinates.lon < 0 ? "W" : "E"}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-white">Source:</span> {selectedRec.source}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-400" /> Timing Info
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>
                        <span className="font-medium text-white">Issued:</span> {formatDateTime(selectedRec.issuedAt)}
                      </div>
                      <div>
                        <span className="font-medium text-white">Duration:</span> {selectedRec.duration}
                      </div>
                      <div>
                        <span className="font-medium text-white">Status:</span>{" "}
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${selectedRec.acknowledged ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
                          {selectedRec.acknowledged ? "ACKNOWLEDGED" : "REQUIRES ATTENTION"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Actions & Recommendations</h4>
                  <div className="flex flex-col gap-2">
                    {(selectedRec.recommendations || []).map((r, idx) => (
                      <div key={idx} className="text-gray-300 flex items-start gap-2">
                        <span className="text-orange-400 font-semibold">{idx + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">Last Updated: {formatDateTime(new Date())}</div>
                  <div className="flex gap-3">
                    {!selectedRec.acknowledged && (
                      <Button
                        onClick={() => {
                          acknowledgeOne(selectedRec.id);
                          setSelectedRec(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    )}
                    <Button onClick={() => setSelectedRec(null)} variant="outline" className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-7xl mx-auto mt-6 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <div>Maritime Recommendations · Demo UI</div>
            <div>API: local/mock · Version: 1.0.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
