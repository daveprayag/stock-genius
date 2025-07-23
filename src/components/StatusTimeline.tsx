"use client";

import { motion } from "framer-motion";
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
                return (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                );
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

    return (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    <Loader2 className="w-5 h-5 text-blue-500" />
                </motion.div>
                Analysis Progress
            </h3>

            <div className="space-y-4">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${getStatusColor(
                            step.status
                        )}`}
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 10,
                                delay: index * 0.1,
                            }}
                            className="flex-shrink-0"
                        >
                            {getIcon(step.status)}
                        </motion.div>

                        <div className="flex-1">
                            <p
                                className={`font-medium ${getTextColor(
                                    step.status
                                )}`}
                            >
                                {step.label}
                            </p>
                            {step.timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {step.timestamp.toLocaleTimeString()}
                                </p>
                            )}
                        </div>

                        {step.status === "active" && (
                            <motion.div
                                className="flex-shrink-0"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            </motion.div>
                        )}

                        {step.status === "completed" && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 10,
                                    delay: 0.2,
                                }}
                                className="flex-shrink-0"
                            >
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Progress</span>
                    <span>
                        {Math.round(
                            (steps.filter((s) => s.status === "completed")
                                .length /
                                steps.length) *
                                100
                        )}
                        %
                    </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                            width: `${
                                (steps.filter((s) => s.status === "completed")
                                    .length /
                                    steps.length) *
                                100
                            }%`,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>
        </div>
    );
}
