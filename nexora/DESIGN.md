---
version: alpha
name: Nexora Design System
description: Modern, clean, and focus-driven AI academic companion UI for students and scholars with secure Google OAuth.
colors:
  primary: "#6366F1"
  primary-hover: "#4F46E5"
  secondary: "#06B6D4"
  secondary-hover: "#0891B2"
  background-dark: "#0B0F17"
  surface-dark: "#131926"
  surface-dark-border: "rgba(255, 255, 255, 0.08)"
  background-light: "#F8FAFC"
  surface-light: "#FFFFFF"
  surface-light-border: "#E2E8F0"
  text-primary-dark: "#F1F5F9"
  text-secondary-dark: "#94A3B8"
  text-primary-light: "#0F172A"
  text-secondary-light: "#64748B"
  accent-sparkle: "linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)"
  danger: "#EF4444"
  success: "#10B981"
  google-auth-btn: "#FFFFFF"
  google-auth-text: "#1F2937"
typography:
  fontFamily-sans: "Plus Jakarta Sans, sans-serif"
  fontFamily-mono: "JetBrains Mono, monospace"
  h1:
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
  h2:
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontSize: "0.9375rem"
    lineHeight: 1.6
  caption:
    fontSize: "0.75rem"
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-google-auth:
    backgroundColor: "{colors.google-auth-btn}"
    textColor: "{colors.google-auth-text}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  chat-bubble-ai:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.lg}"
    padding: "16px"
  node-logic-tree:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.surface-dark-border}"
    rounded: "{rounded.md}"
    padding: "12px"
---

## Overview
Nexora features a modern, academic-grade theme with a deep dark baseline (Deep Space Slate) optimized for prolonged study sessions, paired with Aurora Cyan and Electric Indigo gradient accents. The interface is responsive and cohesive across all views, from the Google OAuth sign-in flow to the interactive study workspaces on desktop and mobile.

## Colors
- **Primary (`#6366F1`)**: Primary action buttons, active links, and focus outlines.
- **Secondary / Accent (`#06B6D4`)**: AI thinking state indicators, logic tree branch connectors, and solver highlights.
- **Dark Surface (`#131926`)**: Authentication card containers, AI chat bubbles, and logic tree canvas nodes.
- **Google Button (`#FFFFFF`)**: High-contrast surface designated specifically for the Google OAuth sign-in button.

## Typography
- Use **Plus Jakarta Sans** for all UI copy, login modals, headings, and conversation bodies.
- Use **JetBrains Mono** for tryout countdown digits, code snippets, and mathematical expressions.
- Establish visual hierarchy through font weight variations (Medium to Bold) rather than switching font families.

## Layout & Responsive Breakpoints
- **Mobile (< 640px)**:
  - Auth page renders as a single-column card scaled proportionally to the viewport.
  - Primary navigation relies on a Bottom Navigation Bar and a swipeable drawer menu.
- **Tablet (640px – 1023px)**:
  - Compact icon sidebar with a split-modal view for document previews.
- **Desktop (≥ 1024px)**:
  - Auth page split view (left: Nexora AI feature showcase, right: Google login form).
  - Multi-column flexible workspace (History Sidebar + Chat Stream + Interactive Logic Canvas).

## Elevation & Depth
- Minimize heavy drop shadows. Use subtle borders (`border-border/50`) paired with a soft ambient glow when buttons or inputs are active.
- Use frosted glass styling (`backdrop-blur-md`) on auth cards, floating bars, and modal dialogs.

## Shapes & Geometry
- `6px` radius for tags, timer badges, and status pills.
- `10px` radius for Google sign-in buttons, input bars, dropdowns, and logic tree node cards.
- `16px` radius for primary auth cards, chat dialog containers, and document viewers.

## Components (NameThatUI Mapping)
- **Auth Card & Social Sign-In**: Login card featuring an official *Sign in with Google* button, loading spinner states, and OAuth 2.0 security messaging.
- **User Avatar & Session Menu**: Top-right profile dropdown displaying the Google account photo, email address, theme toggle, and secure sign-out option.
- **Prompt Bar**: Auto-growing text input dock with file upload (PDF/DOCX) triggers and prompt submission controls.
- **Interactive Logic Tree**: React Flow-based canvas with expandable/collapsible nodes and touch gesture support.
- **HUD Timer**: Sticky tryout countdown widget fixed at the top of the screen during practice exams.
- **Step-by-Step Accordion**: Progressive step-by-step breakdown container for STEM/math solutions with KaTeX LaTeX formula rendering.

## Do's and Don'ts
- **Do**: Use a *Sign in with Google* button that adheres to official Google Identity guidelines (clear logo, high contrast).
- **Do**: Ensure the *Sign Out* action is readily accessible via the avatar dropdown on desktop and the navigation drawer on mobile.
- **Do**: Reference design tokens (`{colors.primary}`) and `cn()` utilities for consistent styling.
- **Don't**: Use overly bright neon tones that induce eye strain during night study sessions.
- **Don't**: Build separate manual email/password forms when the primary authentication mechanism is Google OAuth 2.0.