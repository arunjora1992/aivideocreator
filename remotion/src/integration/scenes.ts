// Content model for the "Keycloak, Google SSO & FreeIPA integration" explainer.
//
// Each scene has:
//  - id:        stable slug, also the voiceover file name (public/voiceover/<COMPOSITION_ID>/<id>.mp3)
//  - narration: the full spoken line (also used as the on-screen caption/subtitle)
//  - kind:      which scene component renders it
//
// Durations are NOT hard-coded here. calculateMetadata() measures the real
// voiceover MP3 if it exists; otherwise it estimates from the narration word
// count so the video plays with captions before any audio is generated.

export const COMPOSITION_ID = "identity-integration";

export type SceneKind =
  | "title"
  | "problem"
  | "players"
  | "freeipa"
  | "keycloak"
  | "ldap"
  | "google"
  | "flow"
  | "benefits"
  | "outro";

export interface Scene {
  id: string;
  kind: SceneKind;
  narration: string;
}

export const SCENES: Scene[] = [
  {
    id: "01-title",
    kind: "title",
    narration:
      "Let's break down how Keycloak, Google single sign-on, and FreeIPA work together to give your whole organization one unified identity.",
  },
  {
    id: "02-problem",
    kind: "problem",
    narration:
      "Modern teams juggle dozens of applications. Without a central identity system, that means scattered passwords, inconsistent access rules, and a real security headache.",
  },
  {
    id: "03-players",
    kind: "players",
    narration:
      "The fix combines three pieces: FreeIPA as your internal identity store, Keycloak as the central single sign-on broker, and Google as an external login provider.",
  },
  {
    id: "04-freeipa",
    kind: "freeipa",
    narration:
      "FreeIPA is the source of truth for your internal users and machines. It pairs an LDAP directory with Kerberos authentication, plus host and policy management.",
  },
  {
    id: "05-keycloak",
    kind: "keycloak",
    narration:
      "Keycloak sits in the middle as your identity broker. Applications trust Keycloak, and it speaks open standards like OpenID Connect and SAML to handle every login.",
  },
  {
    id: "06-ldap",
    kind: "ldap",
    narration:
      "First, we connect Keycloak to FreeIPA using LDAP user federation. Now every corporate account already in FreeIPA can log in through Keycloak, with no duplicate user database.",
  },
  {
    id: "07-google",
    kind: "google",
    narration:
      "Next, we add Google as an identity provider. Keycloak brokers the OAuth flow, so employees and partners can also sign in with their Google accounts.",
  },
  {
    id: "08-flow",
    kind: "flow",
    narration:
      "Here is the magic. A user opens an app and is redirected to Keycloak. They choose their login, their FreeIPA corporate account or Google. Keycloak verifies them, issues a signed token, and the app grants access.",
  },
  {
    id: "09-benefits",
    kind: "benefits",
    narration:
      "The result is true single sign-on across every app, one place to enforce multi-factor authentication and access policy, and no more password sprawl.",
  },
  {
    id: "10-outro",
    kind: "outro",
    narration:
      "One identity, everywhere. That's the power of Keycloak with FreeIPA and Google single sign-on.",
  },
];
