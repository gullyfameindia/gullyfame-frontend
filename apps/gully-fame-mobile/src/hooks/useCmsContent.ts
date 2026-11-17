import { useEffect, useState } from "react";
import type { LegalSection } from "@/content/legal/types";
import {
  getAboutUs,
  getCompetitionRules,
  getFaqs,
  getPrivacyPolicy,
  getSupportContact,
  getTermsAndConditions,
  type SupportContact,
} from "@/api/services/cmsService";
import { FAQS } from "@/content/legal/faq";

/**
 * Content managed from the admin panel. Every hook returns the admin's text once it loads and
 * `null` / the bundled document until then (or when the admin has not set anything), so the
 * screens always have something to show offline.
 */

function usePage(fetcher: () => Promise<{ success: boolean; data?: { content: string } }>): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetcher().then((r) => {
      const content = r.success ? r.data?.content?.trim() : "";
      if (!cancelled && content) setText(content);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return text;
}

export const useTermsText = () => usePage(getTermsAndConditions);
export const usePrivacyText = () => usePage(getPrivacyPolicy);
export const useAboutText = () => usePage(getAboutUs);
export const useCompetitionRulesText = () => usePage(getCompetitionRules);

/** FAQs from the admin panel, or the bundled FAQ document when none are published. */
export function useFaqSections(): LegalSection[] {
  const [sections, setSections] = useState<LegalSection[]>(FAQS);
  useEffect(() => {
    let cancelled = false;
    getFaqs().then((r) => {
      if (cancelled || !r.success || !r.data?.length) return;
      setSections(
        r.data.map((f, i) => ({
          number: String(i + 1),
          heading: f.question,
          body: f.answer
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => (/^[•\-*]\s+/.test(line) ? { t: "b" as const, x: line.replace(/^[•\-*]\s+/, "") } : { t: "p" as const, x: line })),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return sections;
}

export function useSupportContact(): SupportContact {
  const [contact, setContact] = useState<SupportContact>({});
  useEffect(() => {
    let cancelled = false;
    getSupportContact().then((r) => {
      if (!cancelled && r.success && r.data) setContact(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return contact;
}
