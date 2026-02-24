"use client";

import { CheckCircle, Loader2, AlertCircle, Clock } from "lucide-react";

type StatusStep = {
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "error";
    timestamp?: Date;
};

interface StatusTimelineProps {
    steps: StatusStep[];
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
    const getIcon = (status: StatusStep["status"]) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "active":
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case "error":
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: StatusStep["status"]) => {
        switch (status) {
            case "completed":
                return "border-green-500/30 bg-green-500/10";
            case "active":
                return "border-blue-500/30 bg-blue-500/10";
            case "error":
                return "border-red-500/30 bg-red-500/10";
            default:
                return "border-neutral-700 bg-neutral-800/50";
        }
    };

    const getTextColor = (status: StatusStep["status"]) => {
        switch (status) {
            case "completed":
                return "text-green-400";
            case "active":
                return "text-blue-400";
            case "error":
                return "text-red-400";
            default:
                return "text-zinc-300";
        }
    };

    const completedCount = steps.filter((s) => s.status === "completed").length;
    const progressPct = Math.round((completedCount / steps.length) * 100);

    return (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                Analysis Progress
            </h3>

            <div className="space-y-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${getStatusColor(step.status)}`}
                    >
                        <div className="flex-shrink-0">
                            {getIcon(step.status)}
                        </div>

                        <div className="flex-1">
                            <p className={`font-medium ${getTextColor(step.status)}`}>
                                {step.label}
                            </p>
                            {step.timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {step.timestamp.toLocaleTimeString()}
                                </p>
                            )}
                        </div>

                        {step.status === "active" && (
                            <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            </div>
                        )}

                        {step.status === "completed" && (
                            <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Progress</span>
                    <span>{progressPct}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
