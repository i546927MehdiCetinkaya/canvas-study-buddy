import { UrgencyLevel } from './types.js';

// Bereken urgentie niveau op basis van dagen tot deadline
export function getUrgency(daysUntilDue: number): { level: UrgencyLevel; emoji: string } {
  if (daysUntilDue < 0) return { level: 'kritiek', emoji: '\u{1F534}' };
  if (daysUntilDue < 1) return { level: 'kritiek', emoji: '\u{1F534}' };
  if (daysUntilDue < 3) return { level: 'urgent', emoji: '\u{1F7E0}' };
  if (daysUntilDue < 7) return { level: 'let_op', emoji: '\u{1F7E1}' };
  return { level: 'ok', emoji: '\u{1F7E2}' };
}

// Bereken dagen tot een datum
export function daysUntil(dateString: string): number {
  const now = new Date();
  const target = new Date(dateString);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Formatteer een datum naar leesbaar Nederlands formaat
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Geen datum';
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Formatteer een korte datum
export function formatShortDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Geen datum';
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Strip HTML tags voor leesbare tekst
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// Trunceer tekst tot een maximum lengte
export function truncate(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
