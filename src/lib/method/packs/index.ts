// AUTO-GENERATED from packs.source.json by scripts/genPacks.mjs. Do not edit by hand.

import type { ChannelId, MethodPack } from '../types';
import { coldEmailPack } from './coldEmail';
import { linkedinPack } from './linkedin';
import { upworkPack } from './upwork';

export const PACKS: Record<ChannelId, MethodPack> = {
  coldEmail: coldEmailPack,
  linkedin: linkedinPack,
  upwork: upworkPack,
};

export const getPack = (id: ChannelId): MethodPack => PACKS[id];

export const ALL_PACKS: MethodPack[] = Object.values(PACKS);
