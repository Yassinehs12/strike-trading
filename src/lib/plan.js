import React from "react";

const proActive = (profile) =>
  profile?.plan === "pro" &&
  (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());

export const isProPlan = (profile) => proActive(profile) || profile?.role === "admin" || profile?.is_admin;

// Wraps a Pro-only feature. Shows a blurred/locked preview of the real
// content behind a short upsell instead of hiding the feature entirely —
// people convert better when they can see what they're missing.
