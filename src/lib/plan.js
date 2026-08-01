import React from "react";

export const isProPlan = (profile) => profile?.plan === "pro" || profile?.role === "admin" || profile?.is_admin;

// Wraps a Pro-only feature. Shows a blurred/locked preview of the real
// content behind a short upsell instead of hiding the feature entirely —
// people convert better when they can see what they're missing.
