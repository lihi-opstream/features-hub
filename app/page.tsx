'use client';

import { useState, useEffect } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Search, Settings, CheckCircle, Loader2,
  FileText, Mail, Layout, BookOpen, Linkedin, Globe, Wrench,
  ExternalLink, ChevronRight, ArrowLeft, Save, Edit3, X, Check,
  AlertCircle, RefreshCw, Copy, Download
} from 'lucide-react';
import type { ShortcutEpic, FigmaFile, ActionType, GuideChange } from '@/types';
import { buildContentPrompt, buildGuideUpdatePrompt } from '@/lib/prompts';

// Call Claude directly from the browser — bypasses the Amplify Lambda timeout
// that caps server-side requests at ~10-30s (too short for full HTML generation).
// Note: the API key is embedded in the client bundle; acceptable for an internal tool.
const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

// The real logo as a base64 <img> — injected after Claude responds so Claude
// never sees or can modify it. Using a data URI makes the HTML self-contained.
const LOGO_IMG = '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTc2IiBoZWlnaHQ9IjQ4IiB2aWV3Qm94PSIwIDAgMTc2IDQ4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfODk4OF8yMDA2NikiPgo8cmVjdCB4PSIxMi4yNzIyIiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSIxMi4yNzIyIiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl84OTg4XzIwMDY2KSIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTI1LjIxMTUgMjkuNDk3MUMyNC4zMTYxIDI5LjA2NjcgMjMuNTM0NiAyOC40MjQ5IDIyLjkzNTEgMjcuNjE2OUMyMS4zMTEzIDI3LjQ4ODUgMjAuNTk4IDI1LjQ0OTggMjEuODEyMSAyNC4zNjI0QzIzLjM2IDIyLjk3MzEgMjUuNjU5MiAyNC42NTY5IDI0LjgwOTMgMjYuNTQ0N0MyNS42NzQ0IDI3LjU3OTIgMjcuMDQ3OCAyOC4xMDc3IDI4LjM5ODQgMjcuOTI2NUMyOC41NTAyIDI3LjkyNjUgMjguNzI0NyAyNy44MjgzIDI4Ljg2MTMgMjcuOTI2NUMyOC45MDY4IDI3Ljk3MTggMjguOTM3MiAyOC4wMzIyIDI4LjkzNzIgMjguMTAwMlYyOS44MjE4QzI4LjkzNzIgMjkuODI2OCAyOC45MzcyIDI5LjgzNDQgMjguOTM3MiAyOS44NDQ0VjMzLjM0MDZDMzMuNDkgMzIuODg3NSAzNy4xOTI5IDI4LjkyMzIgMzcuMzA2NyAyNC4zN0MzNi4zMzU0IDIzLjcyMDYgMzYuMjE0IDIyLjI0MDYgMzcuMDc5MSAyMS40NjI5QzM3LjU1NzEgMjAuOTg3MiAzOC4zMjM1IDIwLjgxMzUgMzguOTYwOSAyMS4wMjQ5QzQwLjQ1NTcgMjEuNDc4IDQwLjc0NCAyMy41MjQzIDM5LjQ1NDEgMjQuMzc3NUMzOS4zNjMgMzAuMTQ2NSAzNC41Mjk1IDM1LjEzNzcgMjguNzYyNyAzNS41MDAxQzI4Ljc1MjUgMzUuNTA1MiAyOC43NDI0IDM1LjUwNzcgMjguNzMyMyAzNS41MDc3QzI4LjE2MzIgMzUuNTQ1NCAyNy41Nzg5IDM1LjU0NTQgMjYuOTk0NyAzNS41MDAxQzI2LjkxODggMzUuNTAwMSAyNi44NTgxIDM1LjQ1NDggMjYuODIwMSAzNS4zOTQ0QzI2LjgwNSAzNS4zNjQyIDI2Ljc5NzQgMzUuMzI5IDI2Ljc5NzQgMzUuMjg4N1YzMC4wMDNDMjYuMjQzNSAyOS45MDQ5IDI1LjcxMjMgMjkuNzMxMiAyNS4yMTE1IDI5LjQ5NzFaTTIxLjc0MzggMzMuNzkzNkMyMS43OTY5IDM0Ljc1MjYgMjIuNjYxOSAzNS41NjA1IDIzLjYzMzIgMzUuNTM3OUMyNC42NSAzNS41NjA1IDI1LjU1MyAzNC42Njk1IDI1LjUyMjYgMzMuNjU3N0MyNS41MzAyIDMzLjUxNDIgMjUuNTA3NCAzMy4zNjMyIDI1LjQ2OTUgMzMuMjEyMkMyNS40Njk1IDMzLjIwNzIgMjUuNDY5NSAzMy4xOTk2IDI1LjQ2OTUgMzMuMTg5NUMyNS4yMDM5IDMyLjA2NDQgMjMuODYwOCAzMS40Mzc3IDIyLjgyMTMgMzEuOTUxMkMxOC45MzYzIDI5LjYwMjggMTcuMzIgMjQuMzg1MSAxOS4yMDE4IDIwLjI1NDdDMjIuMjQ3MSAyMi4wMDE1IDIzLjc2OTggMjIuODc0OSAyMy43Njk4IDIyLjg3NDlDMjMuODgzNiAyMi45NTA0IDI0LjA0MyAyMi44OSAyNC4wODg1IDIyLjc1NDFDMjQuMjYzIDIyLjIzMzEgMjQuNTM2MiAyMS43NTc0IDI0LjkwOCAyMS4zNDk2QzI1LjQ5MjMgMjAuNzAwMiAyNi4zMTkzIDIwLjI0NzIgMjcuMTc2OCAyMC4wOTYxQzI4LjM4MzMgMjEuNzU3MyAzMS4wMDExIDIwLjY0NzQgMzAuNTgzOCAxOC42MjM3QzMwLjI1NzUgMTcuMDMwNCAyOC4xMDI1IDE2LjYgMjcuMTg0NCAxNy45MzY2QzI1LjYzNjQgMTguMTAyNyAyNC4xNzE5IDE4Ljg4OCAyMy4xNzc5IDIwLjA3MzVMMTguNTc5NiAxNy40MzA2QzE4LjUzNDEgMTcuNDA4IDE4LjQ3MzQgMTcuNDAwNCAxOC40MjAzIDE3LjQwOEMxOC4zNjcyIDE3LjQyMzEgMTguMzIxNiAxNy40NTMzIDE4LjI4MzcgMTcuNDk4NkMxOC4wNzg4IDE3LjgwODIgMTcuODczOSAxOC4xNDggMTcuNjQ2MyAxOC41Nzg0QzE3LjI4MjEgMTkuMjIwMiAxNy4wMDg5IDE5LjkwNzQgMTYuNzgxMyAyMC42MzIzQzE1LjIyNTcgMjUuNTAyNiAxNy4zMzUyIDMxLjE1ODMgMjEuNzQzOCAzMy43OTM2Wk0zOC4zMTU5IDE4Ljk5MzdDMzguMTk0NSAxOC43MzcgMzguMDU3OSAxOC40ODAyIDM3LjkxMzcgMTguMjMxQzM0Ljg3ODYgMTIuODg1IDI3LjgwNjYgMTAuODY4OCAyMi40MDQgMTMuODI4OEMyMS4wMzA1IDEzLjE0OTIgMTkuMzkxNSAxNC4zODc2IDE5LjcyNTQgMTUuODkwMkMxOS43NTU4IDE2LjA5NDEgMTkuODM5MiAxNi4yODI5IDE5LjkzNzkgMTYuNDY0MUMyMC4xODA3IDE2Ljg3OTQgMjAuNTgyOCAxNy4yMDQxIDIxLjA1MzMgMTcuMzI0OUMyMS4wNTg0IDE3LjMzIDIxLjA2NTkgMTcuMzMyNSAyMS4wNzYxIDE3LjMzMjVDMjIuMTc2MyAxNy42NzIzIDIzLjQwNTYgMTYuODE5IDIzLjQ3MzkgMTUuNjc4OEMyNy41MDMxIDEzLjUzNDMgMzIuNzYxNSAxNC43MTk4IDM1LjQ2MjggMTguNDA0N0MzMi40MTc1IDIwLjE1MTUgMzAuODk0OSAyMS4wMjQ5IDMwLjg5NDkgMjEuMDI0OUMzMC43NzM1IDIxLjA5MjkgMzAuNzUwNyAyMS4yNjY1IDMwLjg0MTggMjEuMzY0N0MzMS4wMTYzIDIxLjU2MSAzMS4xODMyIDIxLjc4NzYgMzEuMzEyMiAyMi4wMjE2QzMxLjkwNDEgMjMuMDEwOCAzMi4wMTAzIDI0LjI3MTggMzEuNjA4MSAyNS4zNjY3QzMwLjE1ODggMjUuNDY0OSAyOS4zNDY5IDI3LjIwOTIgMzAuMjQ5OSAyOC4zNjQ1QzMwLjQ4NTEgMjguNjgxNiAzMC44MDM4IDI4LjkwODEgMzEuMTgzMiAyOS4wMjg5QzMyLjczMTIgMjkuNTUgMzQuMTk1NiAyNy45MDM4IDMzLjQ3NDggMjYuNDM5QzM0LjEwNDYgMjUuMDI2OSAzNC4xNTc3IDIzLjM3MzMgMzMuNjI2NSAyMS45MjM1TDM4LjIyNDggMTkuMjgwNkMzOC4zMjM1IDE5LjIyNzggMzguMzY5IDE5LjA5OTQgMzguMzE1OSAxOC45OTM3WiIgZmlsbD0id2hpdGUiLz4KPC9nPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTYzLjgzNCAyMi45NDU4QzYzLjgzNCAyNi40MjAxIDYxLjQ1MzIgMjkuMjM2NCA1Ny41NDM0IDI5LjIzNjRDNTMuNjIzOSAyOS4yMzY0IDUxLjI3MjIgMjYuNDIwMSA1MS4yNzIyIDIyLjk0NThDNTEuMjcyMiAxOS41MDA1IDUzLjY3MjMgMTYuNjU1MyA1Ny41MTQ0IDE2LjY1NTNDNjEuMzU2NSAxNi42NTUzIDYzLjgzNCAxOS41MDA1IDYzLjgzNCAyMi45NDU4Wk01NC4yNjI2IDIyLjk0NThDNTQuMjYyNiAyNC43ODQ2IDU1LjM2NTkgMjYuNDk3NiA1Ny41NDM0IDI2LjQ5NzZDNTkuNzIwOSAyNi40OTc2IDYwLjgyNDIgMjQuNzg0NiA2MC44MjQyIDIyLjk0NThDNjAuODI0MiAyMS4xMzYxIDU5LjU0NjcgMTkuMzc0NyA1Ny41NDM0IDE5LjM3NDdDNTUuMzg1MyAxOS4zNzQ3IDU0LjI2MjYgMjEuMTM2MSA1NC4yNjI2IDIyLjk0NThaIiBmaWxsPSIjMTcxQzMzIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNjYuMzMxNCAzNC40OTk5VjE2Ljg5NjFINjkuMTE4Nkw2OS4zMTIyIDE4LjU2MDZDNzAuMjQxMiAxNy4yMTU0IDcxLjg1NzQgMTYuNjM0OCA3My4yMzE3IDE2LjYzNDhDNzYuOTQ3OSAxNi42MzQ4IDc5LjQyNTUgMTkuMzkyOSA3OS40MjU1IDIyLjk0NDdDNzkuNDI1NSAyNi40Njc0IDc3LjE4OTkgMjkuMjY0MyA3My4zMjg1IDI5LjI2NDNDNzIuMDUxIDI5LjI2NDMgNzAuMTczNSAyOC44Njc1IDY5LjMxMjIgMjcuNTUxM1YzNC40OTk5SDY2LjMzMTRaTTc2LjQ0NDcgMjIuOTQ0N0M3Ni40NDQ3IDIxLjA1NzUgNzUuMTY3MiAxOS41MTg3IDczLjAxODggMTkuNTE4N0M3MC44NjA2IDE5LjUxODcgNjkuNTgzMiAyMS4wNTc1IDY5LjU4MzIgMjIuOTQ0N0M2OS41ODMyIDI0LjgzMTggNzAuOTg2NCAyNi4zNzA2IDczLjAxODggMjYuMzcwNkM3NS4wNDE0IDI2LjM3MDYgNzYuNDQ0NyAyNC44MzE4IDc2LjQ0NDcgMjIuOTQ0N1oiIGZpbGw9IiMxNzFDMzMiLz4KPHBhdGggZD0iTTg5LjUwMDMgMjAuMTA5NkM4OC42NDg2IDE5LjI5NjcgODcuNjcxMiAxOS4wMjU3IDg2LjUxOTUgMTkuMDI1N0M4NS4wOTY5IDE5LjAyNTcgODQuMzEzIDE5LjQ3MDkgODQuMzEzIDIwLjIyNTdDODQuMzEzIDIxLjAwOTYgODUuMDI5MSAyMS40NTQ4IDg2LjU2NzkgMjEuNTUxNkM4OC44NDIyIDIxLjY5NjggOTEuNzM1OCAyMi4yMDk3IDkxLjczNTggMjUuNDIyN0M5MS43MzU4IDI3LjU1MTggODkuOTkzOCAyOS4zODA5IDg2LjUzODkgMjkuMzgwOUM4NC42MzIzIDI5LjM4MDkgODIuNzI1OCAyOS4wNjE1IDgwLjk2NDUgMjcuMjMyNEw4Mi40MzU1IDI1LjEwMzNDODMuNTc3NSAyNi4zMDM0IDg1LjI0MiAyNi43Njc5IDg2LjU4NzIgMjYuNzg3M0M4Ny43MTk1IDI2LjgxNjMgODguNzc0NCAyNi4zNTE4IDg4Ljc3NDQgMjUuNDcxMUM4OC43NzQ0IDI0LjYzODggODguMDg3MyAyNC4xNzQzIDg2LjM3NDMgMjQuMDY3OEM4NC4wOTA0IDIzLjkwMzMgODEuMzgwNiAyMy4wNzEgODEuMzgwNiAyMC4zMzIyQzgxLjM4MDYgMTcuNTM1MyA4NC4yNjQ2IDE2LjU1NzkgODYuNDcxMSAxNi41NTc5Qzg4LjM1ODMgMTYuNTU3OSA4OS43NzEyIDE2LjkyNTYgOTEuMTY0OCAxOC4xNDVMODkuNTAwMyAyMC4xMDk2WiIgZmlsbD0iIzE3MUMzMyIvPgo8cGF0aCBkPSJNOTguNDEyOCAxMy41VjE2LjkyNTlIMTAxLjc0MlYxOS41MDAySDk4LjM4MzhWMjQuNzA2OUM5OC4zODM4IDI1Ljg1ODUgOTkuMDIyNSAyNi40MTk4IDk5Ljk1MTYgMjYuNDE5OEMxMDAuNDE2IDI2LjQxOTggMTAwLjk1OCAyNi4yNzQ3IDEwMS4zOTQgMjYuMDUyMUwxMDIuMjI2IDI4LjU5NzNDMTAxLjM3NCAyOC45NDU3IDEwMC42NTggMjkuMDkwOSA5OS43NTggMjkuMTEwMkM5Ny4xMzUzIDI5LjIwNyA5NS40MjI0IDI3LjcxNjYgOTUuNDIyNCAyNC43MDY5VjE5LjUwMDJIOTMuMTc3MVYxNi45MjU5SDk1LjQyMjRWMTMuODE5NEw5OC40MTI4IDEzLjVaIiBmaWxsPSIjMTcxQzMzIi8+CjxwYXRoIGQ9Ik0xMDYuOTk2IDE2Ljg5NjZMMTA3LjIxOCAxOC4yOTk5QzEwOC4xNDcgMTYuNzk5OCAxMDkuMzk2IDE2LjU4NjkgMTEwLjYyNSAxNi41ODY5QzExMS44NzMgMTYuNTg2OSAxMTMuMDczIDE3LjA3MDggMTEzLjczMiAxNy43Mjg5TDExMi4zODYgMjAuMzMyMkMxMTEuNzc3IDE5LjgwOTYgMTExLjIwNiAxOS41NDgzIDExMC4yMjggMTkuNTQ4M0MxMDguNjYgMTkuNTQ4MyAxMDcuMjE4IDIwLjM4MDYgMTA3LjIxOCAyMi42MDY1VjI4Ljk2NDhIMTA0LjIzOFYxNi44OTY2SDEwNi45OTZaIiBmaWxsPSIjMTcxQzMzIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTE3LjM4MiAyNC4wMDA2QzExNy41NzUgMjUuNDkxIDExOC44NzIgMjYuNTY1MiAxMjAuOTcyIDI2LjU2NTJDMTIyLjA3NSAyNi41NjUyIDEyMy41MTcgMjYuMTQ5MSAxMjQuMjA1IDI1LjQ0MjZMMTI2LjExMSAyNy4zMjk4QzEyNC44NDMgMjguNjQ2IDEyMi43NjMgMjkuMjg0NyAxMjAuOTI0IDI5LjI4NDdDMTE2Ljc2MiAyOS4yODQ3IDExNC4yOTUgMjYuNzIwMSAxMTQuMjk1IDIyLjg0OUMxMTQuMjk1IDE5LjE4MTEgMTE2Ljc5MSAxNi41MzkxIDEyMC43MTEgMTYuNTM5MUMxMjQuNzQ3IDE2LjUzOTEgMTI3LjI2MyAxOS4wMjYyIDEyNi43OTggMjQuMDAwNkgxMTcuMzgyWk0xMjMuOTQzIDIxLjUyMzFDMTIzLjc1IDE5Ljk2NSAxMjIuNTIxIDE5LjE4MTEgMTIwLjgwOCAxOS4xODExQzExOS4xOTIgMTkuMTgxMSAxMTcuODc1IDE5Ljk2NSAxMTcuNDMgMjEuNTIzMUgxMjMuOTQzWiIgZmlsbD0iIzE3MUMzMyIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEzOC43NCAxNi44OTc5SDE0MS42MDRWMjguOTY2MUgxMzguNzg4TDEzOC42NDMgMjcuMjA0N0MxMzcuOTU2IDI4LjYyNzMgMTM2LjA3OCAyOS4zMTQ1IDEzNC43MzMgMjkuMzMzOEMxMzEuMTUyIDI5LjM2MjkgMTI4LjUxIDI3LjE1NjMgMTI4LjUxIDIyLjkyNzFDMTI4LjUxIDE4Ljc2NTcgMTMxLjI3OCAxNi41ODgyIDEzNC44MDEgMTYuNjA3NUMxMzYuNDE3IDE2LjYwNzUgMTM3Ljk1NiAxNy4zNzIxIDEzOC42NDMgMTguNTYyNUwxMzguNzQgMTYuODk3OVpNMTMxLjUwMSAyMi45MjcxQzEzMS41MDEgMjUuMjIwOCAxMzMuMDg4IDI2LjU5NSAxMzUuMDcyIDI2LjU5NUMxMzkuNzY2IDI2LjU5NSAxMzkuNzY2IDE5LjI3ODYgMTM1LjA3MiAxOS4yNzg2QzEzMy4wODggMTkuMjc4NiAxMzEuNTAxIDIwLjYyMzggMTMxLjUwMSAyMi45MjcxWiIgZmlsbD0iIzE3MUMzMyIvPgo8cGF0aCBkPSJNMTUyLjg2IDI4Ljk2NTRWMjIuNTEwM0MxNTIuODYgMjAuOTEzNSAxNTIuMDI3IDE5LjQ3MTUgMTUwLjM5MiAxOS40NzE1QzE0OC43NzYgMTkuNDcxNSAxNDcuODE4IDIwLjkxMzUgMTQ3LjgxOCAyMi41MTAzVjI4Ljk2NTRIMTQ0LjgzN1YxNi44Nzc5SDE0Ny42MDVMMTQ3LjgxOCAxOC4zNDg5QzE0OC40NTYgMTcuMTE5OCAxNDkuODUgMTYuNjg0MyAxNTEuMDAyIDE2LjY4NDNDMTUyLjQ0NCAxNi42ODQzIDE1My44OTUgMTcuMjY1IDE1NC41NzMgMTguOTI5NkMxNTUuNjU3IDE3LjIxNjYgMTU3LjA1IDE2LjczMjcgMTU4LjYxOCAxNi43MzI3QzE2Mi4wNDQgMTYuNzMyNyAxNjMuNzI4IDE4LjgzMjggMTYzLjcyOCAyMi40NjJWMjguOTY1NEgxNjAuNzQ3VjIyLjQ2MkMxNjAuNzQ3IDIwLjg2NTEgMTYwLjA3OSAxOS41MTk5IDE1OC40NjMgMTkuNTE5OUMxNTYuODU3IDE5LjUxOTkgMTU1Ljg1IDIwLjkxMzUgMTU1Ljg1IDIyLjUxMDNWMjguOTY1NEgxNTIuODZaIiBmaWxsPSIjMTcxQzMzIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfODk4OF8yMDA2NiIgeDE9IjI4LjI3MjIiIHkxPSI4IiB4Mj0iMjguMjcyMiIgeTI9IjQwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxQUE5REIiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMkZCQzg4Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxjbGlwUGF0aCBpZD0iY2xpcDBfODk4OF8yMDA2NiI+CjxyZWN0IHg9IjEyLjI3MjIiIHk9IjgiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgcng9IjgiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==" alt="Opstream" height="44" style="height:44px;width:auto;display:block">';

function injectLogo(html: string): string {
  return html.replaceAll('[[LOGO]]', LOGO_IMG);
}

// Use Claude Haiku to normalize feature names before searching.
// Handles abbreviations ("budget mng" → "budget management"),
// concatenated words ("askopstream" → "ask opstream"), and multi-feature inputs.
async function expandFeatureNames(input: string): Promise<string[]> {
  const rawParts = input.split(/[,+]/).map((s) => s.trim()).filter(Boolean);
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Normalize these ${rawParts.length} product feature name(s) for search. Output exactly ${rawParts.length} line(s) in the same order.
Rules: split concatenated words (askopstream → ask opstream), expand abbreviations (mng → management, notif → notifications, cfg → configuration, mgmt → management, bgt → budget). Keep lowercase.

Input:
${rawParts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Output (one per line, no numbering):`,
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    if (!text) return rawParts;
    const lines = text.split('\n')
      .map((s) => s.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    return lines.length === rawParts.length ? lines : rawParts;
  } catch {
    return rawParts;
  }
}

type Step = 'search' | 'results' | 'action' | 'generating' | 'preview' | 'guide-review' | 'saved';

const ACTIONS: { type: ActionType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'update-userguide', label: 'Update User Guide', description: 'Get AI suggestions to update the product user guide', icon: <BookOpen size={20} /> },
  { type: 'marketing-email', label: 'Marketing Email', description: 'Announce the feature to existing users', icon: <Mail size={20} /> },
  { type: 'onepager', label: 'One-Pager', description: 'Sales & marketing one-pager for the feature', icon: <FileText size={20} /> },
  { type: 'blog-post', label: 'Blog Post', description: 'Engaging blog post for the OpStream blog', icon: <Edit3 size={20} /> },
  { type: 'linkedin-post', label: 'LinkedIn Post', description: 'Social post to announce on LinkedIn', icon: <Linkedin size={20} /> },
  { type: 'landing-page', label: 'Landing Page', description: 'Full HTML landing page for the feature', icon: <Layout size={20} /> },
  { type: 'website-change', label: 'Website Update', description: 'Suggested changes for www.opstream.ai', icon: <Globe size={20} /> },
];

const STEPS = ['Search', 'Review', 'Choose Action', 'Generate'];

const HTML_TYPES: ActionType[] = ['marketing-email', 'onepager', 'blog-post', 'landing-page'];
const isHtmlType = (t: ActionType | null): boolean => HTML_TYPES.includes(t as ActionType);

function OpstreamLogo() {
  return (
    <img src="/opstream-logo.svg" alt="Opstream" height={44} style={{ height: '44px', width: 'auto' }} />
  );
}

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const times = [0, 0.15, 0.3];
    const freqs = [880, 1100, 1320];
    times.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.35);
    });
  } catch {
    // AudioContext not available
  }
}

function extractRelevant(text: string, query: string, maxLen: number): string {
  const lower = text.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      const start = Math.max(0, idx - 300);
      return text.slice(start, start + maxLen);
    }
  }
  return text.slice(0, maxLen);
}

export default function Home() {
  const [step, setStep] = useState<Step>('search');
  const [featureName, setFeatureName] = useState('');
  const [featureNames, setFeatureNames] = useState<string[]>([]);
  const [addFeatureQuery, setAddFeatureQuery] = useState('');
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [epics, setEpics] = useState<ShortcutEpic[]>([]);
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>([]);
  const [shortcutError, setShortcutError] = useState('');
  const [figmaError, setFigmaError] = useState('');

  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [guideChanges, setGuideChanges] = useState<GuideChange[]>([]);
  const [approvedChanges, setApprovedChanges] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const [savedPath, setSavedPath] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [guideExists, setGuideExists] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const [guideExcerpt, setGuideExcerpt] = useState('');
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [includeGuide, setIncludeGuide] = useState(true);
  const [excludedEpicIds, setExcludedEpicIds] = useState<Set<number>>(new Set());
  const [excludedFigmaKeys, setExcludedFigmaKeys] = useState<Set<string>>(new Set());
  const [resultsInstructions, setResultsInstructions] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetch('/api/userguide')
      .then((r) => r.json())
      .then((d) => setGuideExists(d.exists))
      .catch(() => {});
  }, []);

  const currentStepIndex = () => {
    if (step === 'search') return 0;
    if (step === 'results') return 1;
    if (step === 'action') return 2;
    return 3;
  };

  const handleSearch = async () => {
    if (!featureName.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setShortcutError('');
    setFigmaError('');
    setGuideExcerpt('');
    setIsLoadingGuide(true);
    setExcludedEpicIds(new Set());
    setExcludedFigmaKeys(new Set());

    // Expand/normalize feature names with AI (handles abbreviations, concatenated words, etc.)
    const names = await expandFeatureNames(featureName);
    setFeatureNames(names);

    // Start guide fetch non-blocking (search using all names joined)
    const combinedQuery = names.join(' ');
    fetch('/api/userguide')
      .then((r) => r.json())
      .then((d) => { if (d.content) setGuideExcerpt(extractRelevant(d.content, combinedQuery, 1800)); })
      .catch(() => {})
      .finally(() => setIsLoadingGuide(false));

    try {
      // Run a search per expanded name in parallel, then merge+deduplicate
      const results = await Promise.all(
        names.map((n) => Promise.all([
          fetch(`/api/shortcut?q=${encodeURIComponent(n)}`).then((r) => r.json()),
          fetch(`/api/figma?q=${encodeURIComponent(n)}`).then((r) => r.json()),
        ]))
      );
      const mergedEpics: ShortcutEpic[] = [];
      const mergedFigma: FigmaFile[] = [];
      for (const [scData, figmaData] of results) {
        for (const e of (scData.epics ?? [])) {
          if (!mergedEpics.some((x) => x.id === e.id)) mergedEpics.push(e);
        }
        for (const f of (figmaData.files ?? [])) {
          if (!mergedFigma.some((x) => x.key === f.key)) mergedFigma.push(f);
        }
        if (scData.error) setShortcutError(scData.error);
        if (figmaData.error) setFigmaError(figmaData.error);
      }
      setEpics(mergedEpics);
      setFigmaFiles(mergedFigma);
      setStep('results');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFeature = async () => {
    if (!addFeatureQuery.trim()) return;
    setIsAddingFeature(true);
    try {
      const expanded = await expandFeatureNames(addFeatureQuery);
      const results = await Promise.all(
        expanded.map((n) => Promise.all([
          fetch(`/api/shortcut?q=${encodeURIComponent(n)}`).then((r) => r.json()),
          fetch(`/api/figma?q=${encodeURIComponent(n)}`).then((r) => r.json()),
        ]))
      );
      setEpics((prev) => {
        const merged = [...prev];
        for (const [scData] of results)
          for (const e of (scData.epics ?? []))
            if (!merged.some((x) => x.id === e.id)) merged.push(e);
        return merged;
      });
      setFigmaFiles((prev) => {
        const merged = [...prev];
        for (const [, figmaData] of results)
          for (const f of (figmaData.files ?? []))
            if (!merged.some((x) => x.key === f.key)) merged.push(f);
        return merged;
      });
      setFeatureNames((prev) => {
        const next = [...prev];
        for (const n of expanded) if (!next.includes(n)) next.push(n);
        return next;
      });
      setAddFeatureQuery('');
    } finally {
      setIsAddingFeature(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAction) return;
    setIsGenerating(true);
    setGeneratedContent('');

    const epicsToSend = epics.filter((e) => !excludedEpicIds.has(e.id));
    const figmaToSend = figmaFiles.filter((f) => !excludedFigmaKeys.has(f.key));
    const guideToSend = includeGuide ? guideExcerpt : '';
    const combinedPrompt = [resultsInstructions, customPrompt].filter(Boolean).join('\n\n');
    const combinedFeatureName = featureNames.length > 0 ? featureNames.join(' and ') : featureName;

    setStep('generating');

    // Stream a prompt directly to Claude from the browser and return the full text.
    // Calls Anthropic's API directly — no Lambda, no server timeout.
    const streamClaude = async (prompt: string, maxTokens: number): Promise<string> => {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      let text = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          // Live-update for text types only (partial HTML is not useful in preview)
          if (!isHtmlType(selectedAction) && selectedAction !== 'update-userguide') {
            setGeneratedContent(text);
          }
        }
      }
      return text;
    };

    if (selectedAction === 'update-userguide') {
      try {
        // Fetch current guide content from server (avoids CORS with Google Docs)
        const guideRes = await fetch('/api/userguide');
        const guideData = await guideRes.json();
        const currentGuide: string = guideData.content ?? '(User guide unavailable)';

        const prompt = buildGuideUpdatePrompt(combinedFeatureName, epicsToSend, figmaToSend, currentGuide, combinedPrompt, guideToSend);
        const raw = await streamClaude(prompt, 8192);
        if (!raw.trim()) throw new Error('Claude returned empty content — please try again');
        const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
        const changes: GuideChange[] = JSON.parse(cleaned);
        setGuideChanges(changes);
        setApprovedChanges(new Set(changes.map((_: GuideChange, i: number) => i)));
        playDoneSound();
        setStep('guide-review');
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Generation failed');
        setStep('action');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    try {
      const prompt = buildContentPrompt(selectedAction, combinedFeatureName, epicsToSend, figmaToSend, combinedPrompt, guideToSend);
      const maxTokens = isHtmlType(selectedAction) ? 8000 : 4096;
      const raw = (await streamClaude(prompt, maxTokens)).trim();
      const content = isHtmlType(selectedAction) ? injectLogo(raw) : raw;

      if (!content) throw new Error('Generation returned empty content — check your API key and try again');
      setGeneratedContent(content);
      setEditContent(content);
      playDoneSound();
      setStep('preview');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Generation failed');
      setStep('action');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const content = isEditing ? editContent : generatedContent;
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, featureName, type: selectedAction }),
    });
    const data = await res.json();
    if (data.success) {
      setSavedPath(data.path);
      setStep('saved');
    }
  };

  const handleApplyGuideChanges = async () => {
    setIsApplying(true);
    try {
      const approved = guideChanges.filter((_, i) => approvedChanges.has(i));
      const text = approved.map((c) => {
        const header = c.type === 'add' ? `## [ADD] ${c.section}` : `## [MODIFY] ${c.section}`;
        return `${header}\n\n${c.suggested}`;
      }).join('\n\n---\n\n');
      await navigator.clipboard.writeText(text);
      setSavedPath('Copied to clipboard — paste into your Google Drive document');
      setStep('saved');
    } finally {
      setIsApplying(false);
    }
  };

  const resetFlow = () => {
    setStep('search');
    setFeatureName('');
    setFeatureNames([]);
    setAddFeatureQuery('');
    setEpics([]);
    setFigmaFiles([]);
    setSelectedAction(null);
    setGeneratedContent('');
    setEditContent('');
    setGuideChanges([]);
    setApprovedChanges(new Set());
    setSavedPath('');
    setSearchError('');
    setIsEditing(false);
    setCustomPrompt('');
    setShowPrompt(false);
    setGuideExcerpt('');
    setIsLoadingGuide(false);
    setIncludeGuide(true);
    setExcludedEpicIds(new Set());
    setExcludedFigmaKeys(new Set());
    setResultsInstructions('');
    setShowGuide(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-subtle">
      {/* Header */}
      <header className="bg-white border-b border-brand-border px-6 py-3.5 flex items-center justify-between">
        <OpstreamLogo />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-brand-subtle transition-colors text-brand-gray hover:text-brand-body"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Progress bar */}
      {step !== 'saved' && (
        <div className="bg-white border-b border-brand-border px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {STEPS.map((s, i) => {
              const cur = currentStepIndex();
              const done = i < cur;
              const active = i === cur;
              const stepKeys: Step[] = ['search', 'results', 'action', 'action'];
              const clickable = done;
              return (
                <div key={s} className="flex items-center">
                  <button
                    onClick={() => clickable && setStep(stepKeys[i])}
                    disabled={!clickable}
                    className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-brand-green' : done ? 'text-brand-gray hover:text-brand-body' : 'text-brand-border'} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${active ? 'border-brand-green bg-brand-green text-white' : done ? 'border-brand-gray bg-brand-gray text-white' : 'border-brand-border text-brand-border'}`}>
                      {done ? <Check size={12} /> : i + 1}
                    </div>
                    {s}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={14} className="mx-2 text-brand-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          {/* STEP: SEARCH */}
          {step === 'search' && (
            <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8">
              <h2 className="text-2xl font-bold text-brand-navy mb-2">What feature are you documenting?</h2>
              <p className="text-brand-gray mb-6">Enter the feature name to search Shortcut and Figma for relevant context.</p>

              {!guideExists && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3 items-start">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Could not load the user guide from Google Drive.</p>
                    <p className="mt-0.5">Make sure the document is shared with "Anyone with the link" and try again.</p>
                  </div>
                </div>
              )}

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{searchError}</div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Smart Notifications, Dashboard + Analytics (comma or + to combine)"
                  className="flex-1 border border-brand-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-brand-body placeholder:text-brand-gray"
                />
                <button
                  onClick={handleSearch}
                  disabled={!featureName.trim() || isSearching}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {/* STEP: RESULTS */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button onClick={() => setStep('search')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <h2 className="text-xl font-bold text-brand-navy">Results for</h2>
                {featureNames.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 bg-brand-green-light text-brand-green text-sm font-semibold px-3 py-1 rounded-full border border-brand-green/30">
                    {name}
                  </span>
                ))}
                {/* Add another feature inline */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="text"
                    value={addFeatureQuery}
                    onChange={(e) => setAddFeatureQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                    placeholder="Add another feature…"
                    className="border border-brand-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green text-brand-body placeholder:text-brand-gray w-48"
                  />
                  <button
                    onClick={handleAddFeature}
                    disabled={!addFeatureQuery.trim() || isAddingFeature}
                    className="flex items-center gap-1 bg-brand-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingFeature ? <Loader2 size={13} className="animate-spin" /> : <span>+</span>}
                    Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shortcut */}
                <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                  <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                    <Wrench size={16} className="text-brand-green" />
                    <span className="font-semibold text-sm text-brand-body">Shortcut</span>
                    <span className="text-xs text-brand-gray">
                      {epics.length - excludedEpicIds.size}/{epics.length} epic{epics.length !== 1 ? 's' : ''}
                    </span>
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      <button onClick={() => setExcludedEpicIds(new Set())} className="text-brand-green hover:underline font-medium">All</button>
                      <span className="text-brand-border">|</span>
                      <button onClick={() => setExcludedEpicIds(new Set(epics.map((e) => e.id)))} className="text-brand-gray hover:underline">None</button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {shortcutError && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{shortcutError}</div>}
                    {epics.length === 0 && !shortcutError && <p className="text-sm text-brand-gray text-center py-4">No epics found</p>}
                    {epics.map((epic) => {
                      const excluded = excludedEpicIds.has(epic.id);
                      return (
                        <div
                          key={epic.id}
                          className={`border rounded-lg p-3 transition-opacity ${excluded ? 'opacity-40 border-brand-border' : 'border-brand-border'}`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!excluded}
                              onChange={() => {
                                setExcludedEpicIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(epic.id)) next.delete(epic.id); else next.add(epic.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 flex-shrink-0 accent-[#59a985]"
                            />
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0">EPIC</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-brand-body truncate">{epic.name}</p>
                              {epic.description && <p className="text-xs text-brand-gray mt-0.5 line-clamp-2">{epic.description}</p>}
                            </div>
                            {epic.app_url && <a href={epic.app_url} target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-brand-green flex-shrink-0"><ExternalLink size={12} /></a>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Figma */}
                <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                  <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                    <Layout size={16} className="text-pink-500" />
                    <span className="font-semibold text-sm text-brand-body">Figma</span>
                    <span className="text-xs text-brand-gray">
                      {figmaFiles.length - excludedFigmaKeys.size}/{figmaFiles.length} file{figmaFiles.length !== 1 ? 's' : ''}
                    </span>
                    <div className="ml-auto flex items-center gap-2 text-xs">
                      <button onClick={() => setExcludedFigmaKeys(new Set())} className="text-brand-green hover:underline font-medium">All</button>
                      <span className="text-brand-border">|</span>
                      <button onClick={() => setExcludedFigmaKeys(new Set(figmaFiles.map((f) => f.key)))} className="text-brand-gray hover:underline">None</button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                    {figmaError && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{figmaError}</div>}
                    {figmaFiles.length === 0 && !figmaError && <p className="text-sm text-brand-gray text-center py-4">No matching files found</p>}
                    {figmaFiles.map((file) => {
                      const excluded = excludedFigmaKeys.has(file.key);
                      return (
                        <div
                          key={file.key}
                          className={`border rounded-lg p-3 flex items-start gap-3 transition-opacity ${excluded ? 'opacity-40 border-brand-border' : 'border-brand-border'}`}
                        >
                          <input
                            type="checkbox"
                            checked={!excluded}
                            onChange={() => {
                              setExcludedFigmaKeys((prev) => {
                                const next = new Set(prev);
                                if (next.has(file.key)) next.delete(file.key); else next.add(file.key);
                                return next;
                              });
                            }}
                            className="mt-1 flex-shrink-0 accent-[#59a985]"
                          />
                          {file.thumbnail_url ? (
                            <img src={file.thumbnail_url} alt={file.name} className="w-12 h-9 object-cover rounded flex-shrink-0 bg-brand-subtle" />
                          ) : (
                            <div className="w-12 h-9 bg-pink-50 rounded flex-shrink-0 flex items-center justify-center"><Layout size={16} className="text-pink-300" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-body truncate">{file.name}</p>
                            {file.project_name && <p className="text-xs text-brand-gray mt-0.5">{file.project_name}</p>}
                            <p className="text-xs text-brand-gray">{new Date(file.last_modified).toLocaleDateString()}</p>
                          </div>
                          <a href={`https://www.figma.com/file/${file.key}`} target="_blank" rel="noopener noreferrer" className="text-brand-gray hover:text-pink-500 flex-shrink-0"><ExternalLink size={12} /></a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* User Guide */}
              <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${includeGuide ? 'border-brand-border' : 'border-brand-border opacity-60'}`}>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2 text-left"
                >
                  <BookOpen size={16} className="text-brand-green flex-shrink-0" />
                  <span className="font-semibold text-sm text-brand-body">User Guide</span>
                  {isLoadingGuide && <Loader2 size={13} className="animate-spin text-brand-gray" />}
                  {!isLoadingGuide && guideExcerpt && <span className="text-xs text-brand-gray">relevant excerpt</span>}
                  {!isLoadingGuide && !guideExcerpt && <span className="text-xs text-brand-gray">not available</span>}
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-brand-gray cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={includeGuide} onChange={(e) => setIncludeGuide(e.target.checked)} className="rounded accent-[#59a985]" />
                    Include
                  </label>
                  <ChevronRight size={14} className={`text-brand-gray ml-1 transition-transform ${showGuide ? 'rotate-90' : ''}`} />
                </button>
                {showGuide && (
                  <div className="p-4">
                    {isLoadingGuide && <p className="text-sm text-brand-gray text-center py-4"><Loader2 size={16} className="animate-spin inline mr-2" />Loading user guide…</p>}
                    {!isLoadingGuide && guideExcerpt && (
                      <pre className="text-xs text-brand-body whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto bg-brand-subtle rounded-lg p-4">{guideExcerpt}</pre>
                    )}
                    {!isLoadingGuide && !guideExcerpt && <p className="text-sm text-brand-gray text-center py-4">User guide could not be loaded</p>}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                <div className="bg-brand-subtle border-b border-brand-border px-5 py-3 flex items-center gap-2">
                  <Edit3 size={15} className="text-brand-green" />
                  <span className="font-semibold text-sm text-brand-body">Specific Instructions</span>
                  <span className="text-xs text-brand-gray">(optional)</span>
                </div>
                <div className="p-4">
                  <textarea
                    value={resultsInstructions}
                    onChange={(e) => setResultsInstructions(e.target.value)}
                    placeholder="e.g. Focus on enterprise buyers, highlight ROI, keep it under 300 words, target CTO persona…"
                    className="w-full h-20 border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-body placeholder:text-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep('action')}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 flex items-center gap-2 transition-opacity"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: ACTION */}
          {step === 'action' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('results')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">What would you like to create?</h2>
                  <p className="text-brand-gray text-sm mt-0.5">Feature: <span className="font-medium text-brand-green">{featureNames.join(' + ') || featureName}</span></p>
                </div>
              </div>

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{searchError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {ACTIONS.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => setSelectedAction(action.type)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${selectedAction === action.type ? 'border-brand-green bg-brand-green-light' : 'border-brand-border bg-white hover:border-brand-green hover:bg-brand-subtle'}`}
                  >
                    <div className={`mb-2 ${selectedAction === action.type ? 'text-brand-green' : 'text-brand-gray'}`}>{action.icon}</div>
                    <p className="font-semibold text-brand-body text-sm">{action.label}</p>
                    <p className="text-xs text-brand-gray mt-1">{action.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedAction || isGenerating}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* STEP: GENERATING */}
          {step === 'generating' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-8">
              <div className="flex flex-col items-center gap-4 mb-8 text-center">
                <div className="w-14 h-14 bg-brand-green-light rounded-2xl flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-brand-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">
                    {isHtmlType(selectedAction) ? 'Building your branded HTML…' : 'Generating content…'}
                  </h2>
                  <p className="text-brand-gray text-sm mt-1">
                    Claude is working on your {ACTIONS.find(a => a.type === selectedAction)?.label}
                    {isHtmlType(selectedAction) && ' — this may take a minute or two'}
                  </p>
                </div>
              </div>
              {generatedContent && !isHtmlType(selectedAction) && (
                <div className="bg-brand-subtle rounded-xl p-4 max-h-72 overflow-y-auto prose-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                </div>
              )}
              {isHtmlType(selectedAction) && (
                <p className="text-xs text-brand-gray text-center py-2 opacity-60">You&apos;ll hear a chime when it&apos;s ready</p>
              )}
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
              <div className="border-b border-brand-border px-5 py-3 flex items-center gap-3">
                <button onClick={() => setStep('action')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div className="flex-1">
                  <h2 className="font-bold text-brand-navy">{ACTIONS.find(a => a.type === selectedAction)?.label}</h2>
                  <p className="text-xs text-brand-gray">Feature: {featureNames.join(' + ') || featureName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditContent(generatedContent); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-brand-subtle text-brand-body' : 'border border-brand-border text-brand-body hover:bg-brand-subtle'}`}
                  >
                    <Edit3 size={14} /> {isEditing ? 'Preview' : 'Edit'}
                  </button>
                  <button
                    onClick={async () => {
                      const content = isEditing ? editContent : generatedContent;
                      await navigator.clipboard.writeText(content);
                      setCopyDone(true);
                      setTimeout(() => setCopyDone(false), 2000);
                    }}
                    className="flex items-center gap-1.5 border border-brand-border text-brand-body px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-subtle transition-colors"
                  >
                    {copyDone ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                    {copyDone ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      const content = isEditing ? editContent : generatedContent;
                      const ext = isHtmlType(selectedAction) ? 'html' : 'md';
                      const slug = (featureNames.join('-') || featureName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      const filename = `${slug}-${selectedAction}.${ext}`;
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = filename; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 border border-brand-border text-brand-body px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-subtle transition-colors"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-brand-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Save size={14} /> Save
                  </button>
                </div>
              </div>

              <div className="p-5">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[500px] font-mono text-sm border border-brand-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-green resize-y"
                  />
                ) : isHtmlType(selectedAction) ? (
                  <iframe
                    srcDoc={generatedContent}
                    className="w-full border-0 rounded-xl"
                    style={{ height: '700px' }}
                    title="preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                ) : (
                  <div className="prose-content max-h-[600px] overflow-y-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Additional instructions / regenerate */}
              <div className="border-t border-brand-border p-5">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center gap-2 text-sm text-brand-gray hover:text-brand-body font-medium mb-3"
                >
                  <Edit3 size={14} />
                  {showPrompt ? 'Hide instructions' : 'Add instructions & regenerate'}
                  <ChevronRight size={14} className={`transition-transform ${showPrompt ? 'rotate-90' : ''}`} />
                </button>
                {showPrompt && (
                  <div className="space-y-3">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Make it shorter, focus on enterprise buyers, use a more formal tone, highlight the ROI..."
                      className="w-full h-24 border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-body placeholder:text-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      Regenerate with instructions
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP: GUIDE REVIEW */}
          {step === 'guide-review' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep('action')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-body font-medium"><ArrowLeft size={16} /> Back</button>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">Suggested User Guide Changes</h2>
                  <p className="text-brand-gray text-sm mt-0.5">{approvedChanges.size} of {guideChanges.length} changes approved — review and copy to Google Drive</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {guideChanges.map((change, i) => {
                  const approved = approvedChanges.has(i);
                  return (
                    <div key={i} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${approved ? 'border-brand-green' : 'border-brand-border'}`}>
                      <div className="px-5 py-3 border-b border-brand-border flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${change.type === 'add' ? 'bg-brand-green-light text-brand-green' : 'bg-blue-100 text-blue-700'}`}>
                          {change.type === 'add' ? '+ ADD' : '✎ MODIFY'}
                        </span>
                        <span className="font-medium text-brand-body text-sm flex-1">{change.section}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const next = new Set(approvedChanges);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              setApprovedChanges(next);
                            }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${approved ? 'bg-brand-green-light text-brand-green hover:bg-red-100 hover:text-red-700' : 'bg-brand-subtle text-brand-gray hover:bg-brand-green-light hover:text-brand-green'}`}
                          >
                            {approved ? <><Check size={14} /> Approved</> : <><X size={14} /> Skipped</>}
                          </button>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        {change.original && (
                          <div>
                            <p className="text-xs font-medium text-brand-gray mb-1 uppercase tracking-wide">Original</p>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-brand-body font-mono whitespace-pre-wrap line-through opacity-70">{change.original}</div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-brand-gray mb-1 uppercase tracking-wide">Suggested</p>
                          <div className="bg-brand-green-light border border-brand-green/20 rounded-lg p-3 text-sm text-brand-body prose-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{change.suggested}</ReactMarkdown>
                          </div>
                        </div>
                        <p className="text-xs text-brand-gray italic">{change.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    if (approvedChanges.size === guideChanges.length) {
                      setApprovedChanges(new Set());
                    } else {
                      setApprovedChanges(new Set(guideChanges.map((_, i) => i)));
                    }
                  }}
                  className="text-sm text-brand-gray hover:text-brand-body underline"
                >
                  {approvedChanges.size === guideChanges.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={handleApplyGuideChanges}
                  disabled={approvedChanges.size === 0 || isApplying}
                  className="bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {isApplying ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Copy {approvedChanges.size} Change{approvedChanges.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* STEP: SAVED */}
          {step === 'saved' && (
            <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-10 text-center">
              <div className="w-16 h-16 bg-brand-green-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-navy mb-2">
                {selectedAction === 'update-userguide' ? 'Changes Ready!' : 'Content Saved!'}
              </h2>
              <p className="text-brand-gray mb-2">
                {selectedAction === 'update-userguide'
                  ? 'Approved changes have been copied to your clipboard. Paste them into your Google Drive document.'
                  : `Your ${ACTIONS.find(a => a.type === selectedAction)?.label} has been saved.`}
              </p>
              {savedPath && (
                <p className="text-sm bg-brand-subtle text-brand-gray inline-block px-3 py-1.5 rounded-lg mb-6 border border-brand-border">{savedPath}</p>
              )}
              {selectedAction === 'update-userguide' && (
                <div className="mb-6">
                  <a
                    href="https://docs.google.com/document/d/1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-green hover:opacity-80 underline"
                  >
                    <ExternalLink size={14} /> Open User Guide in Google Drive
                  </a>
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetFlow}
                  className="flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <RefreshCw size={16} /> Start New Feature
                </button>
                <button
                  onClick={() => setStep(selectedAction === 'update-userguide' ? 'guide-review' : 'preview')}
                  className="flex items-center gap-2 border border-brand-border text-brand-body px-6 py-3 rounded-xl font-medium hover:bg-brand-subtle transition-colors"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep('action')}
                  className="flex items-center gap-2 border border-brand-border text-brand-body px-6 py-3 rounded-xl font-medium hover:bg-brand-subtle transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-brand-gray">
          <span>© {new Date().getFullYear()} Opstream. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="https://www.opstream.ai" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">www.opstream.ai</a>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
              <h3 className="text-lg font-bold text-brand-navy">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-brand-gray hover:text-brand-body">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Site */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-1">Site URL</label>
                <div className="bg-brand-subtle rounded-lg px-3 py-2 text-sm text-brand-gray font-mono border border-brand-border">www.opstream.ai</div>
              </div>

              {/* API Status */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-2">API Credentials</label>
                <p className="text-xs text-brand-gray mb-3">Configured via environment variables in AWS Amplify.</p>
                <div className="space-y-2">
                  {[
                    { label: 'Anthropic API Key', env: 'ANTHROPIC_API_KEY' },
                    { label: 'Shortcut API Token', env: 'SHORTCUT_API_TOKEN' },
                    { label: 'Figma API Token', env: 'FIGMA_API_TOKEN' },
                    { label: 'Figma Team / Project ID', env: 'FIGMA_TEAM_ID / FIGMA_PROJECT_ID' },
                  ].map((item) => (
                    <div key={item.env} className="flex items-center justify-between text-sm bg-brand-subtle rounded-lg px-3 py-2 border border-brand-border">
                      <span className="text-brand-body">{item.label}</span>
                      <span className="font-mono text-xs text-brand-gray">{item.env}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Guide */}
              <div>
                <label className="block text-sm font-semibold text-brand-body mb-1">
                  User Guide
                  {guideExists && <span className="ml-2 text-xs text-brand-green font-normal">✓ Connected</span>}
                </label>
                <p className="text-xs text-brand-gray mb-3">The user guide is loaded from Google Drive and used by AI to suggest updates.</p>
                <a
                  href="https://docs.google.com/document/d/1YM_4b6Yt3U1DfeZo5YQey-TW4Avn67fsVNEiJsAOuMc/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3 text-sm font-medium text-brand-body hover:bg-brand-subtle hover:border-brand-green transition-colors"
                >
                  <FileText size={18} className="text-brand-gray flex-shrink-0" />
                  <span className="flex-1">Open User Guide in Google Drive</span>
                  <ExternalLink size={14} className="text-brand-gray flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
