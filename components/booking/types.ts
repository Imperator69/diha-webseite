import type { MapZone } from "@/components/site-map/site-map";
import type { SlotTemplate } from "@/lib/rules/availability";
import type { Block, OtherBooking, RuleActivity, RuleZone } from "@/lib/rules/engine";
import type { Rate } from "@/lib/pricing";

export type WizardActivity = RuleActivity & { descDe: string; descEn: string };
export type WizardZone = MapZone & RuleZone;

export type WizardDoc = { id: string; kind: string; title: string; validUntil: string | null; status: string; scope: string };

export type WizardPerson = { role: string; name: string; email: string; phone: string; qualification: string };
export type WizardParticipant = { name: string; organization: string; isGuest: boolean };

export type WizardState = {
  id?: string;
  status?: string;
  projectId: string;
  title: string;
  activityCodes: string[];
  zoneIds: string[];
  periods: { startsAt: number; endsAt: number }[];
  details: Record<string, Record<string, unknown>>;
  persons: WizardPerson[];
  participants: WizardParticipant[];
  participantsCount: number;
  guestsCount: number;
  notesProject: string;
};

export type WizardData = {
  activities: WizardActivity[];
  zones: WizardZone[];
  slots: SlotTemplate[];
  rates: Rate[];
  others: OtherBooking[];
  blocks: Block[];
  projects: { id: string; name: string }[];
  docsByProject: Record<string, WizardDoc[]>;
  bookingDocs: WizardDoc[];
  nowMs: number;
  staff: boolean;
  leadTimeOverride: boolean;
  guestThreshold: number;
  baseImageUrl: string | null;
};
