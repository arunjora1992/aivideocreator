import React from "react";
import { SceneKind } from "../scenes";
import { SceneProps } from "./types";
import { TitleScene } from "./TitleScene";
import { ProblemScene } from "./ProblemScene";
import { PlayersScene } from "./PlayersScene";
import { FreeIpaScene } from "./FreeIpaScene";
import { KeycloakScene } from "./KeycloakScene";
import { LdapScene } from "./LdapScene";
import { GoogleScene } from "./GoogleScene";
import { FlowScene } from "./FlowScene";
import { BenefitsScene } from "./BenefitsScene";
import { OutroScene } from "./OutroScene";

export const SCENE_COMPONENTS: Record<SceneKind, React.FC<SceneProps>> = {
  title: TitleScene,
  problem: ProblemScene,
  players: PlayersScene,
  freeipa: FreeIpaScene,
  keycloak: KeycloakScene,
  ldap: LdapScene,
  google: GoogleScene,
  flow: FlowScene,
  benefits: BenefitsScene,
  outro: OutroScene,
};
