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

function usePageState(fetcher: () => Promise<{ success: boolean; data?: { content: string } }>): {
  text: string | null;
  loading: boolean;
} {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((r) => {
        const content = r.success ? r.data?.content?.trim() : "";
        if (!cancelled && content) setText(content);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { text, loading };
}

function usePage(fetcher: () => Promise<{ success: boolean; data?: { content: string } }>): string | null {
  return usePageState(fetcher).text;
}

/** Same as the text hooks below, plus a flag that is true until the first answer arrives. */
export const useTermsPage = () => usePageState(getTermsAndConditions);
export const usePrivacyPage = () => usePageState(getPrivacyPolicy);
export const useAboutPage = () => usePageState(getAboutUs);

export const useTermsText = () => usePage(getTermsAndConditions);
export const usePrivacyText = () => usePage(getPrivacyPolicy);
export const useAboutText = () => usePage(getAboutUs);
export const useCompetitionRulesText = () => usePage(getCompetitionRules);

/** FAQs from the admin panel, or the bundled FAQ document when none are published. */
export function useFaqState(): { sections: LegalSection[]; loading: boolean } {
  const [sections, setSections] = useState<LegalSection[]>(FAQS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getFaqs().then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (!r.success || !r.data?.length) return;
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
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { sections, loading };
}

export function useFaqSections(): LegalSection[] {
  return useFaqState().sections;
}

export function useSupportContactState(): { contact: SupportContact; loading: boolean } {
  const [contact, setContact] = useState<SupportContact>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getSupportContact()
      .then((r) => {
        if (!cancelled && r.success && r.data) setContact(r.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { contact, loading };
}

export function useSupportContact(): SupportContact {
  return useSupportContactState().contact;
}
