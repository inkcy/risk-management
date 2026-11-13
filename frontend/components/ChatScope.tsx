'use client';
import { createContext } from 'react';
// The scope separates users and their selected department in a shared browser tab.
export const ChatScopeContext = createContext<string | null>(null);
