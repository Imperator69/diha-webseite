import type { Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";

const sign = {
  de: "\n\nBeste Grüße\nDIHA – Drone Innovation Hub Austria\nTestzentrum Eibenstein",
  en: "\n\nBest regards\nDIHA – Drone Innovation Hub Austria\nEibenstein Test Centre",
};

export function inviteLink(locale: Locale, token: string) {
  return `${siteUrl()}/${locale}/portal/einladung/${token}`;
}

export function resetLink(locale: Locale, token: string) {
  return `${siteUrl()}/${locale}/portal/passwort-zuruecksetzen/${token}`;
}

export function inviteMail(locale: Locale, name: string, token: string) {
  const link = inviteLink(locale, token);
  return locale === "en"
    ? {
        subject: "Your access to the DIHA portal",
        text: `Hello ${name},\n\nan account has been created for you in the DIHA portal. Please set your password using this link (valid for 7 days):\n\n${link}${sign.en}`,
      }
    : {
        subject: "Ihr Zugang zum DIHA-Portal",
        text: `Hallo ${name},\n\nfür Sie wurde ein Zugang zum DIHA-Portal angelegt. Bitte legen Sie über diesen Link Ihr Passwort fest (7 Tage gültig):\n\n${link}${sign.de}`,
      };
}

export function resetMail(locale: Locale, name: string, token: string) {
  const link = resetLink(locale, token);
  return locale === "en"
    ? {
        subject: "Reset your DIHA portal password",
        text: `Hello ${name},\n\nyou can set a new password using this link (valid for 2 hours):\n\n${link}\n\nIf you did not request this, you can ignore this email.${sign.en}`,
      }
    : {
        subject: "Passwort für das DIHA-Portal zurücksetzen",
        text: `Hallo ${name},\n\nüber diesen Link können Sie ein neues Passwort festlegen (2 Stunden gültig):\n\n${link}\n\nFalls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.${sign.de}`,
      };
}

export function genericMail(locale: Locale, name: string, body: { de: string; en: string }, subject: { de: string; en: string }) {
  return {
    subject: subject[locale],
    text: `${locale === "en" ? "Hello" : "Hallo"} ${name},\n\n${body[locale]}${sign[locale]}`,
  };
}
